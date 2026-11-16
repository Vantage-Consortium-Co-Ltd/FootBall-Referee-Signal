#!/usr/bin/env python3
"""
Data_Pipeline: Label Studio project export -> YOLO-pose dataset (train/val/test) for Train.

  python Data_Pipeline/main.py                         # export from Label Studio via API (needs .env)
  python Data_Pipeline/main.py --export-json raw.json  # use a saved export instead of the API

Output (see docs/superpowers/specs/2026-11-12-referee-signal-pipeline-design.md, "Interface contract"):
  <output_dir>/raw/project_<id>.json   cached raw export (contains base64 images - can be large)
  <output_dir>/dataset/images|labels/{train,val,test}, data.yaml, keypoints.csv, split_manifest.csv
"""
import argparse
import json
import os
import sys
from pathlib import Path

import yaml

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(HERE))
from Process import GESTURES, build_dataset, fetch_export, load_env, make_fetcher  # noqa: E402


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--config", default=str(ROOT / "config" / "config.yaml"))
    ap.add_argument("--export-json", nargs="+", help="saved Label Studio JSON export(s); skips the API")
    ap.add_argument("--project-ids", nargs="+", type=int, help="override LS_PROJECT_IDS / config")
    args = ap.parse_args()

    cfg = yaml.safe_load(Path(args.config).read_text(encoding="utf-8"))["data_pipeline"]
    assert abs(sum(cfg["split"].values()) - 1) < 1e-6, "split ratios must sum to 1"
    assert set(cfg["flip_classes"]) <= set(GESTURES), "unknown class in flip_classes"
    out = Path(cfg["output_dir"])
    out = out if out.is_absolute() else ROOT / out

    load_env(ROOT / ".env")
    ls_url, token = os.environ.get("LS_URL", "").rstrip("/"), os.environ.get("LS_TOKEN", "")

    tasks = []
    if args.export_json:
        for p in args.export_json:
            tasks += json.loads(Path(p).read_text(encoding="utf-8"))
    else:
        if not (ls_url and token):
            sys.exit("LS_URL / LS_TOKEN missing: copy .env.example to .env, or pass --export-json")
        env_ids = [int(x) for x in os.environ.get("LS_PROJECT_IDS", "").split(",") if x.strip()]
        ids = args.project_ids or env_ids or cfg["project_ids"]
        for pid in ids:
            print(f"exporting project {pid} from {ls_url} ...")
            tasks += fetch_export(ls_url, token, pid, out / "raw")
    print(f"{len(tasks)} tasks loaded")
    build_dataset(tasks, cfg, out, make_fetcher(ls_url, token))
    print(f"\ndataset written to {out / 'dataset'}")


if __name__ == "__main__":
    main()
