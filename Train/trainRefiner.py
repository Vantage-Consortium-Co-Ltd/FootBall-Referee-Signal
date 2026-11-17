"""Fit the hand refiner on train+val persons of a dataset (never test), score it with burst-grouped CV, save it and log it to MLflow.

  python Train/trainRefiner.py                                   # version v1 = refine.dataset (the dataset of inference.model_path)
  python Train/trainRefiner.py --tag v3-notflip --dataset Data_Pipeline/output_notflip/dataset
  python Train/trainRefiner.py --tag v3-cutbyclass --dataset Data_Pipeline/output_classcut/dataset

Writes Train/models/refiner/<tag>/{refiner.joblib,meta.json}. MLflow (server log_model.mlflow.uri, experiment refine.experiment) is
skipped with a warning when the server is unreachable. Needs mediapipe (pip install -r requirements.txt).
"""
import argparse
import json
import sys
from pathlib import Path

import cv2
import joblib
import numpy as np
import pandas as pd
import yaml

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "Inference"))
from app.handFeatures import Hands  # noqa: E402
from app.refine import cv_macro_f1, fit_refiner  # noqa: E402
from utils.loadUtils import load_config, resolve  # noqa: E402


def features(ds, groups, hands):
    k = pd.read_csv(ds / "keypoints.csv")
    k = k[k.split.isin(["train", "val"]) & k.class_name.isin(groups)]
    X, y, g = [], [], []
    for _, r in k.iterrows():
        img = cv2.imread(str(ds / "images" / r.split / r.image))
        if img is None:
            continue
        h, w = img.shape[:2]
        xy = np.array([[r[f"kp{i}_x"] * w, r[f"kp{i}_y"] * h] for i in range(17)])
        v = hands.vector(img, xy, np.array([r[f"kp{i}_v"] > 0 for i in range(17)]))
        if not np.isnan(v).all():
            X.append(v)
            y.append(r.class_name)
            g.append(r.group)
    return np.array(X), np.array(y), np.array(g)


def log_mlflow(uri, experiment, tag, meta, out):
    import mlflow

    try:
        mlflow.set_tracking_uri(uri)
        mlflow.set_experiment(experiment)
        with mlflow.start_run(run_name=tag):
            mlflow.set_tags({"version": tag})
            mlflow.log_params({k: str(v) for k, v in meta.items() if k not in ("cv_macro_f1", "samples")})
            mlflow.log_metric("cv_macro_f1", meta["cv_macro_f1"])
            mlflow.log_metrics({f"n_{c}": n for c, n in meta["samples"].items()})
            mlflow.log_artifact(str(out / "refiner.joblib"))
            mlflow.log_artifact(str(out / "meta.json"))
        print(f"logged to MLflow {uri} experiment {experiment} run {tag}")
    except Exception as e:  # server down must not lose the trained model
        print(f"WARNING: MLflow logging skipped ({type(e).__name__}: {str(e)[:120]})")


def main():
    cfg = load_config().refine
    ap = argparse.ArgumentParser()
    ap.add_argument("--tag", default="v1", help="version name; output folder and MLflow run name")
    ap.add_argument("--dataset", default=cfg.dataset)
    a = ap.parse_args()
    ds, out = resolve(a.dataset), resolve(cfg.refiner_dir) / a.tag
    X, y, g = features(ds, cfg.groups, Hands(resolve(cfg.hand_model_path)))
    assert len(set(y)) == len(cfg.groups), f"every group class needs hand samples, got {pd.Series(y).value_counts().to_dict()}"
    meta = {"tag": a.tag, "dataset": a.dataset, "groups": list(cfg.groups), "samples": {c: int(n) for c, n in pd.Series(y).value_counts().items()},
            "n_bursts": int(len(set(g))), "cv_folds": 5, "cv_macro_f1": round(cv_macro_f1(X, y, g), 4)}
    out.mkdir(parents=True, exist_ok=True)
    joblib.dump(fit_refiner(X, y), out / "refiner.joblib")
    (out / "meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print(f"saved {out}\n{json.dumps(meta)}")
    uri = yaml.safe_load((ROOT / "config/config.yaml").read_text(encoding="utf-8"))["log_model"]["mlflow"]["uri"]
    log_mlflow(uri, cfg.experiment, a.tag, meta, out)


if __name__ == "__main__":
    main()
