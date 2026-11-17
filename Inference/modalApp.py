"""Modal deployment of the FastAPI service (settings: modal: and inference: in config/config.yaml).

  modal setup                                                  # once: log in (browser)
  modal secret create football-signal-api-key FOOTBALL_API_KEY=<key>
  modal deploy Inference/modalApp.py                          # -> https://<workspace>--football-signal-web.modal.run
"""
from pathlib import Path

import modal
import yaml

ROOT = Path("/app") if Path("/app/config").exists() else Path(__file__).resolve().parents[1]  # Modal runs this file from /root, our files live in /app
CFG = yaml.safe_load((ROOT / "config" / "config.yaml").read_text(encoding="utf-8"))
M, INF, REF = CFG["modal"], CFG["inference"], CFG["refine"]

image = (
    modal.Image.debian_slim(python_version=M["python_version"])
    .apt_install("libgl1", "libglib2.0-0")  # opencv
    .pip_install("torch", "torchvision", "ultralytics", "fastapi", "python-multipart", "pyyaml", "mediapipe", "scikit-learn", "joblib")
    .add_local_dir(str(ROOT / "Inference"), "/app/Inference", ignore=["**/__pycache__", "testService.py", "testRefine.py", "modalApp.py"])
    .add_local_dir(str(ROOT / "config"), "/app/config")
    .add_local_file(str(ROOT / INF["model_path"]), f"/app/{INF['model_path']}")  # weights baked into the image
    .add_local_file(str(ROOT / REF["refiner_path"]), f"/app/{REF['refiner_path']}")
)
app = modal.App(M["app_name"])


@app.function(image=image, gpu=M["gpu"], scaledown_window=M["scaledown_window"], max_containers=M["max_containers"],
              secrets=[modal.Secret.from_name(M["secret_name"])])
@modal.asgi_app(label="web")
def web():
    import sys

    sys.path.insert(0, "/app/Inference")
    from app.service import create_app
    from utils.loadUtils import load_config

    return create_app(load_config())
