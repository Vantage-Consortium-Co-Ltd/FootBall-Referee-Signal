"""Config loading for Inference/: the inference: section of the root config/config.yaml. Nothing is hard-coded elsewhere."""
from pathlib import Path
from types import SimpleNamespace

import yaml

ROOT = Path(__file__).resolve().parents[2]


def resolve(p):
    p = Path(p)
    return p if p.is_absolute() else ROOT / p


def load_config(path=ROOT / "config" / "config.yaml"):
    """-> nested namespace (cfg.port, cfg.video.stride, ...)."""
    to_ns = lambda d: SimpleNamespace(**{k: to_ns(v) if isinstance(v, dict) else v for k, v in d.items()})
    return to_ns(yaml.safe_load(Path(path).read_text(encoding="utf-8"))["inference"])
