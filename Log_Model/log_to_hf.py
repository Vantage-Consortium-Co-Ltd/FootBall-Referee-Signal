"""Create the HF model repo (if needed) and upload the files listed in config.yaml. Settings: log_model.huggingface in config.yaml, token: HF_TOKEN in .env.

  python Log_Model/log_to_hf.py [--config config/config.yaml]
"""
import argparse
import os
import time
from pathlib import Path

import yaml
from huggingface_hub import HfApi

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent


def load_env(path):
    """Minimal .env reader (KEY=VALUE lines); real environment variables win."""
    if path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            if "=" in line and not line.lstrip().startswith("#"):
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip("\"'"))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", default=str(ROOT / "config" / "config.yaml"))
    a = ap.parse_args()
    hf = yaml.safe_load(Path(a.config).read_text(encoding="utf-8"))["log_model"]["huggingface"]
    load_env(ROOT / ".env")
    token = os.getenv("HF_TOKEN")
    if not token:
        raise SystemExit("HF_TOKEN missing: set it in .env (see .env.example)")
    files = {(ROOT / k if not Path(k).is_absolute() else Path(k)): v for k, v in hf["files"].items()}
    missing = [str(p) for p in files if not p.exists()]
    if missing or "username/" in hf["repo_id"]:
        raise SystemExit(f"check config.yaml huggingface: missing files {missing}, repo_id={hf['repo_id']}")
    api = HfApi(token=token)
    print("token user:", api.whoami()["name"])
    api.create_repo(hf["repo_id"], repo_type=hf["repo_type"], private=hf.get("private", True), exist_ok=True)
    for src, dst in files.items():
        for attempt in range(5):  # the connection to the Hub drops now and then; uploads are idempotent
            try:
                api.upload_file(path_or_fileobj=str(src), path_in_repo=dst, repo_id=hf["repo_id"], repo_type=hf["repo_type"])
                break
            except Exception as e:
                if attempt == 4:
                    raise
                print(f"retry {src.name} ({type(e).__name__})")
                time.sleep(3)
        print(f"uploaded {src.name} -> {dst}")
    print(f"done: https://huggingface.co/{hf['repo_id']} (private={hf.get('private', True)})")


if __name__ == "__main__":
    main()
