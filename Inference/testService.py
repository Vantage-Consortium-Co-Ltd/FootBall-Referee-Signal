"""Self-check of the refine API with the real model: python Inference/testService.py"""
import os
import sys
from pathlib import Path

import cv2
import numpy as np
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

sys.path.insert(0, str(Path(__file__).resolve().parent))
from app.service import create_app  # noqa: E402
from utils.loadUtils import ROOT, load_config  # noqa: E402

os.environ.pop(load_config().api_key_env, None)  # first part runs without auth
cfg = load_config()
DS = ROOT / cfg.refine.dataset
img_path = next((DS / "images/test").glob("*.jpg"))
img = cv2.imread(str(img_path))
jpg = cv2.imencode(".jpg", img)[1].tobytes()

with TestClient(create_app(cfg)) as c:
    assert c.get("/health").json()["status"] == "ok"
    d = c.post("/predict/image", files={"file": ("a.jpg", jpg)}).json()["detections"]
    assert d and set(d[0]) == {"label", "confidence"}, d
    r = c.post("/predict/image?annotated=true", files={"file": ("a.jpg", jpg)})
    assert r.headers["content-type"] == "image/jpeg" and cv2.imdecode(np.frombuffer(r.content, np.uint8), 1) is not None
    assert c.post("/predict/image", files={"file": ("a.jpg", b"not an image")}).status_code == 400
    tmp = ROOT / "Inference" / "_t.mp4"
    vw = cv2.VideoWriter(str(tmp), cv2.VideoWriter_fourcc(*"mp4v"), 10, (img.shape[1], img.shape[0]))
    for _ in range(12):
        vw.write(img)
    vw.release()
    v = c.post("/predict/video", files={"file": ("v.mp4", tmp.read_bytes())}).json()
    tmp.unlink()
    assert v["frames_read"] == 12 and len(v["results"]) == -(-12 // cfg.video.stride) and v["results"][0]["detections"], v["frames_read"]
    with c.websocket_connect("/ws/webcam") as ws:
        ws.send_bytes(jpg)
        assert ws.receive_json()["detections"]
# refine on vs off on test images with exactly one person of a group class: the refined answer must not be worse
import copy
import yaml
names = yaml.safe_load((DS / "data.yaml").read_text(encoding="utf-8"))["names"]
cases = []
for lbl in sorted((DS / "labels/test").glob("*.txt")):
    rows = np.loadtxt(lbl, ndmin=2)
    if len(rows) == 1 and names[int(rows[0, 0])] in cfg.refine.groups:
        cases.append((DS / "images/test" / (lbl.stem + ".jpg"), names[int(rows[0, 0])]))
assert cases, "no single-person Goal/Substitution test images"
off = copy.deepcopy(cfg)
off.refine.enabled = False
hits = {}
for name, c_ in (("yolo", off), ("refined", cfg)):
    with TestClient(create_app(c_)) as c:
        hits[name] = sum(max(c.post("/predict/image", files={"file": ("a.jpg", p_.read_bytes())}).json()["detections"] or [{"label": "", "confidence": 0}], key=lambda d: d["confidence"])["label"] == gt for p_, gt in cases)
print(f"single-person {cfg.refine.groups} test images: {len(cases)}  correct yolo={hits['yolo']} refined={hits['refined']}")
assert hits["refined"] >= hits["yolo"], hits

# auth + websocket idle timeout (key set via the environment, like a Modal Secret)
os.environ[cfg.api_key_env] = "k"
cfg.ws_idle_seconds = 1
with TestClient(create_app(cfg)) as c:
    assert c.get("/health").status_code == 200
    assert c.post("/predict/image", files={"file": ("a.jpg", jpg)}).status_code == 401
    assert c.post("/predict/image", files={"file": ("a.jpg", jpg)}, headers={"X-API-Key": "bad"}).status_code == 401
    assert c.post("/predict/image", files={"file": ("a.jpg", jpg)}, headers={"X-API-Key": "k"}).status_code == 200
    try:
        with c.websocket_connect("/ws/webcam"):
            raise AssertionError("websocket without key must be refused")
    except WebSocketDisconnect:
        pass
    with c.websocket_connect("/ws/webcam?api_key=k") as ws:
        ws.send_bytes(jpg)
        assert ws.receive_json()["detections"]
        try:
            ws.receive_json()  # idle > 1 s: server closes
            raise AssertionError("idle websocket must be closed")
        except WebSocketDisconnect:
            pass
print("ALL TESTS PASSED:", d[0]["label"], d[0]["confidence"])
