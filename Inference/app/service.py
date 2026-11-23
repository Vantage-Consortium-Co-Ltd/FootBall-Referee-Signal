"""FastAPI service for the referee-signal model + hand refiner (refine: section of config.yaml; refine.enabled false = plain YOLO).

  GET  /health            model + settings
  POST /predict/image     multipart 'file' -> JSON [{label, confidence}]   (?annotated=true -> JPEG with boxes/skeleton)
  POST /predict/video     multipart 'file' -> JSON detections for every Nth frame (config: inference.video)
  WS   /ws/webcam         send JPEG frames as binary messages, receive JSON detections per frame

Auth: header X-API-Key (WebSocket: header or ?api_key=) when the env var named by inference.api_key_env is set; /health is open.
Limits (inference.rate_limit): per-IP requests/minute and WebSocket connections/frame rate, plus max_concurrent inferences service-wide; over the limit -> 429.
"""
import tempfile
import asyncio
import os
import secrets
import time
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from pathlib import Path

import cv2
import numpy as np
import torch
from fastapi import Depends, FastAPI, File, Header, HTTPException, Request, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import Response

from app.predict import Detector

def create_app(cfg):
    @asynccontextmanager
    async def lifespan(app):
        app.state.det = Detector(cfg)
        yield

    app = FastAPI(title="Football referee signal", lifespan=lifespan)
    key = os.getenv(cfg.api_key_env)  # no key in the environment = open (local use); on Modal it comes from a Secret

    def key_ok(given):
        return not key or secrets.compare_digest(given or "", key)

    def require_key(x_api_key: str = Header(None)):
        if not key_ok(x_api_key):
            raise HTTPException(401, "invalid or missing API key (header X-API-Key)")

    rl = cfg.rate_limit
    hits = defaultdict(deque)  # (bucket, ip) -> request times; shortcut: in memory per container and never pruned per IP, move to a shared store if modal.max_containers > 1
    ws_open = defaultdict(int)
    busy = 0

    def client_ip(conn):  # shortcut: X-Forwarded-For is client-settable, so a spoofer dodges the per-IP limit (max_concurrent still holds)
        fwd = conn.headers.get("x-forwarded-for", "").split(",")[0].strip()
        return fwd or (conn.client.host if conn.client else "?")

    def allow(bucket, ip, per_min):
        q, now = hits[(bucket, ip)], time.monotonic()
        while q and now - q[0] > 60:
            q.popleft()
        if len(q) >= per_min:
            return False
        q.append(now)
        return True

    def limit(bucket, per_min):
        def dep(request: Request):
            if not allow(bucket, client_ip(request), per_min):
                raise HTTPException(429, f"rate limit: {per_min} requests/minute", headers={"Retry-After": "60"})
        return dep

    async def infer(fn, *args):
        """Run fn on the model unless max_concurrent inferences are already running (then 429 at once instead of queueing)."""
        nonlocal busy
        if busy >= rl.max_concurrent:
            raise HTTPException(429, "server busy, retry shortly", headers={"Retry-After": "2"})
        busy += 1
        try:
            return await run_in_threadpool(fn, *args)
        finally:
            busy -= 1

    def decode(data):
        img = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
        if img is None:
            raise HTTPException(400, "not a readable image")
        return img

    async def read_upload(file):
        data = await file.read()
        if len(data) > cfg.max_upload_mb * 1024 * 1024:
            raise HTTPException(413, f"file larger than {cfg.max_upload_mb} MB")
        return data

    @app.get("/health")
    def health():
        return {"status": "ok", "model": cfg.model_path, "device": cfg.device, "fp16": app.state.det.kw["quantize"] == "fp16", "cuda": torch.cuda.is_available(), "conf": cfg.conf, "imgsz": cfg.imgsz, "refine": cfg.refine.enabled, "refine_groups": cfg.refine.groups}

    @app.post("/predict/image", dependencies=[Depends(require_key), Depends(limit("image", rl.image_per_min))])
    async def predict_image(file: UploadFile = File(...), annotated: bool = False):
        img = decode(await read_upload(file))
        if annotated:
            return Response(cv2.imencode(".jpg", await infer(app.state.det.plot, img))[1].tobytes(), media_type="image/jpeg")
        return {"detections": await infer(app.state.det, img)}

    @app.post("/predict/video", dependencies=[Depends(require_key), Depends(limit("video", rl.video_per_min))])
    async def predict_video(file: UploadFile = File(...)):
        data = await read_upload(file)

        def run():
            with tempfile.NamedTemporaryFile(suffix=Path(file.filename or "v.mp4").suffix) as t:
                t.write(data)
                t.flush()
                cap = cv2.VideoCapture(t.name)
                fps = cap.get(cv2.CAP_PROP_FPS) or 25
                out, i = [], 0
                while i < fps * cfg.video.max_seconds:
                    ok, frame = cap.read()
                    if not ok:
                        break
                    if i % cfg.video.stride == 0:
                        out.append({"frame": i, "time": round(i / fps, 2), "detections": app.state.det(frame)})
                    i += 1
                cap.release()
                return {"fps": fps, "frames_read": i, "results": out}

        res = await infer(run)
        if not res["frames_read"]:
            raise HTTPException(400, "not a readable video")
        return res

    @app.websocket("/ws/webcam")
    async def webcam(ws: WebSocket):
        if not key_ok(ws.headers.get("x-api-key") or ws.query_params.get("api_key")):  # browsers cannot set headers on a WebSocket
            return await ws.close(code=1008)
        ip = client_ip(ws)
        if ws_open[ip] >= rl.ws_connections_per_ip:
            return await ws.close(code=1013)  # try again later
        ws_open[ip] += 1
        last = 0.0
        try:
            await ws.accept()
            while True:
                data = await asyncio.wait_for(ws.receive_bytes(), cfg.ws_idle_seconds)  # drop idle clients (a forgotten camera keeps a GPU billed)
                now = time.monotonic()
                if now - last < 1 / rl.ws_fps:  # frame came too fast: answer, do not run the model
                    await ws.send_json({"detections": [], "error": "rate_limited"})
                    continue
                last = now
                img = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
                try:
                    await ws.send_json({"detections": await infer(app.state.det, img) if img is not None else []})
                except HTTPException:  # service busy
                    await ws.send_json({"detections": [], "error": "busy"})
        except asyncio.TimeoutError:
            await ws.close(code=1001)
        except WebSocketDisconnect:
            pass
        finally:
            ws_open[ip] -= 1

    return app
