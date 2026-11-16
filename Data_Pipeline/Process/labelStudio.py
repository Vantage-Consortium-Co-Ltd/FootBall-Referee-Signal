"""Label Studio access: .env, project export, image download."""
import base64
import os
from pathlib import Path


def load_env(path: Path):
    try:
        from dotenv import load_dotenv
        load_dotenv(path)
        return
    except ImportError:
        pass
    if path.exists():  # tiny fallback parser: KEY=VALUE lines
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip("'\""))


def fetch_export(ls_url, token, pid, raw_dir: Path):
    import requests
    r = requests.get(f"{ls_url}/api/projects/{pid}/export", params={"exportType": "JSON"},
                     headers={"Authorization": f"Token {token}"}, timeout=600)
    r.raise_for_status()
    raw_dir.mkdir(parents=True, exist_ok=True)
    (raw_dir / f"project_{pid}.json").write_bytes(r.content)
    return r.json()


def make_fetcher(ls_url="", token=""):
    """Return src -> image bytes. Handles base64 data URIs, /data/upload/... and http(s) URLs."""
    def fetch(src):
        if src.startswith("data:"):
            return base64.b64decode(src.split(",", 1)[1])
        if src.startswith("/"):
            src = ls_url + src
        if src.startswith("http"):
            import requests
            hdr = {"Authorization": f"Token {token}"} if ls_url and src.startswith(ls_url) else {}
            r = requests.get(src, headers=hdr, timeout=120)
            r.raise_for_status()
            return r.content
        raise ValueError(f"unsupported image source: {src[:60]}")
    return fetch
