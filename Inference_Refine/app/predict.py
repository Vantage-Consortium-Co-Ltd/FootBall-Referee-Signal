"""YOLO-pose inference + optional hand refiner: one frame in, detections out. Used by the FastAPI endpoints."""
import cv2
import joblib
import numpy as np
import torch
from ultralytics import YOLO

from app.refine import apply_refiner
from utils.loadUtils import resolve


class Detector:
    def __init__(self, cfg):
        if str(cfg.device) != "cpu" and not torch.cuda.is_available():
            raise SystemExit(f"inference.device={cfg.device!r} but CUDA is not available (torch {torch.__version__}): "
                             "install a CUDA build of torch, or set inference.device: cpu in config/config.yaml")
        self.cfg, self.model = cfg, YOLO(str(resolve(cfg.model_path)))
        self.kw = dict(imgsz=cfg.imgsz, conf=cfg.conf, device=cfg.device, quantize="fp16" if cfg.fp16 and str(cfg.device) != "cpu" else None, verbose=False)
        self.refiner = self.hands = None
        if cfg.refine.enabled:
            from app.handFeatures import Hands  # mediapipe only when the refiner is on

            self.refiner = joblib.load(resolve(cfg.refine.refiner_path))
            self.hands = Hands(resolve(cfg.refine.hand_model_path))

    def _run(self, bgr):
        r = self.model.predict(bgr, **self.kw)[0]
        out = []
        for j, b in enumerate(r.boxes):
            label, conf = r.names[int(b.cls)], round(float(b.conf), 4)
            if self.refiner is not None and label in self.cfg.refine.groups:
                vec = self.hands.vector(bgr, r.keypoints.xy[j].cpu().numpy(), (r.keypoints.conf[j] > 0.5).cpu().numpy())
                label, conf = apply_refiner(label, conf, vec, self.refiner, self.cfg.refine.groups)
            out.append({"label": label, "confidence": conf})
        return r, out

    def __call__(self, bgr):
        """BGR image -> [{label, confidence}] (one per person)."""
        return self._run(bgr)[1]

    def plot(self, bgr):
        """Annotated copy of the image (boxes + skeleton + the final, refined label)."""
        r, dets = self._run(bgr)
        img = r.plot(labels=False)
        for b, d in zip(r.boxes.xyxy.cpu().numpy(), dets):
            cv2.putText(img, f"{d['label']} {d['confidence']:.2f}", (int(b[0]), max(int(b[1]) - 8, 16)), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        return img
