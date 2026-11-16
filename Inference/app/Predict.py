"""YOLO-pose inference: one frame in, detections out. Used by the FastAPI endpoints."""
import torch
from ultralytics import YOLO

from utils.load_utils import resolve


class Detector:
    def __init__(self, cfg):
        if str(cfg.device) != "cpu" and not torch.cuda.is_available():
            raise SystemExit(f"inference.device={cfg.device!r} but CUDA is not available (torch {torch.__version__}): "
                             "install a CUDA build of torch, or set inference.device: cpu in config/config.yaml")
        self.cfg, self.model = cfg, YOLO(str(resolve(cfg.model_path)))
        self.kw = dict(imgsz=cfg.imgsz, conf=cfg.conf, device=cfg.device, quantize="fp16" if cfg.fp16 and str(cfg.device) != "cpu" else None, verbose=False)

    def __call__(self, bgr):
        """BGR image -> [{label, confidence}] (one per person)."""
        r = self.model.predict(bgr, **self.kw)[0]
        return [{"label": r.names[int(b.cls)], "confidence": round(float(b.conf), 4)} for b in r.boxes]

    def plot(self, bgr):
        """Annotated copy of the image (boxes + skeleton + label)."""
        return self.model.predict(bgr, **self.kw)[0].plot()
