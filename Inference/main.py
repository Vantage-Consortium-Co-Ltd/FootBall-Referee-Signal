"""Run the FastAPI service (settings: inference: section of config.yaml).

  python Inference/main.py            # http://127.0.0.1:8000  (docs at /docs)
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))  # so `app` and `utils` import when run as a script

import uvicorn  # noqa: E402

from app.Service import create_app  # noqa: E402
from utils.load_utils import load_config  # noqa: E402

if __name__ == "__main__":
    cfg = load_config()
    uvicorn.run(create_app(cfg), host=cfg.host, port=cfg.port)
