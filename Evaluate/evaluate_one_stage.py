"""Evaluate the one-stage YOLO-pose model on the TEST split and log it to the same MLflow experiment as training.

  python Evaluate/evaluate_one_stage.py [--weights Train/results/runs/one_stage/best_overall.pt] [--data ...data.yaml]

Two views of the same test set:
  * Ultralytics val: box / pose mAP (detection quality, plots saved under <out>/val).
  * Per-person classification, the same metrics as evaluate_two_stage.py, so the two models are comparable:
    each ground-truth person takes the class of the best-confidence prediction with box IoU >= --iou;
    no matching prediction counts as "missed" (always wrong).

Writes Evaluate/output/one_stage/{classification_report.csv,confusion_matrix.png,metrics.json,val/}.
"""
import argparse
import json
from pathlib import Path

import mlflow
import numpy as np
import pandas as pd
import yaml
from sklearn.metrics import (ConfusionMatrixDisplay, accuracy_score, classification_report,
                             confusion_matrix, f1_score)
from ultralytics import YOLO
from ultralytics.utils.metrics import box_iou
import torch

ROOT = Path(__file__).resolve().parents[1]
MISSED = -1


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--weights", default=str(ROOT / "Train/results/runs/one_stage/best_overall.pt"))
    ap.add_argument("--data", default=str(ROOT / "Data_Pipeline/output/dataset/data.yaml"))
    ap.add_argument("--mlruns", default=str(ROOT / "Train/mlruns"))
    ap.add_argument("--out", default=str(ROOT / "Evaluate/output/one_stage"))
    ap.add_argument("--imgsz", type=int, default=640)
    ap.add_argument("--conf", type=float, default=0.25)
    ap.add_argument("--iou", type=float, default=0.5)
    ap.add_argument("--device", default="cpu")
    a = ap.parse_args()

    cfg = yaml.safe_load(Path(a.data).read_text(encoding="utf-8"))
    names = cfg["names"]
    out = Path(a.out)
    model = YOLO(a.weights)

    v = model.val(data=a.data, split="test", imgsz=a.imgsz, device=a.device, workers=0,
                  plots=True, project=str(out), name="val", exist_ok=True, verbose=False)
    det = {"box_map50": v.box.map50, "box_map50_95": v.box.map, "pose_map50": v.pose.map50,
           "pose_map50_95": v.pose.map, "box_precision": v.box.mp, "box_recall": v.box.mr}

    img_dir = Path(cfg["path"]) / cfg["test"]
    y, pred = [], []
    for p in sorted(img_dir.iterdir()):
        lbl = (img_dir.parent.parent / "labels" / img_dir.name / p.with_suffix(".txt").name)
        gt = np.loadtxt(lbl, ndmin=2)[:, :5] if lbl.exists() and lbl.stat().st_size else np.zeros((0, 5))
        if not len(gt):
            continue
        r = model.predict(str(p), imgsz=a.imgsz, conf=a.conf, device=a.device, verbose=False)[0]
        pb, pc, pk = r.boxes.xyxyn.cpu(), r.boxes.cls.cpu().numpy().astype(int), r.boxes.conf.cpu().numpy()
        g = torch.tensor(gt[:, 1:5], dtype=torch.float32)
        g = torch.cat([g[:, :2] - g[:, 2:] / 2, g[:, :2] + g[:, 2:] / 2], 1)  # xywh -> xyxy
        iou = box_iou(g, pb).numpy() if len(pb) else np.zeros((len(g), 0))
        for i, c in enumerate(gt[:, 0].astype(int)):
            ok = np.where(iou[i] >= a.iou)[0]
            y.append(c)
            pred.append(int(pc[ok[np.argmax(pk[ok])]]) if len(ok) else MISSED)
    y, pred = np.array(y), np.array(pred)

    labels = sorted(set(y) | (set(pred) - {MISSED}))
    label_names = [names[i] for i in labels]
    m = {"test_macro_f1": f1_score(y, pred, labels=labels, average="macro", zero_division=0),
         "test_weighted_f1": f1_score(y, pred, labels=labels, average="weighted", zero_division=0),
         "test_accuracy": accuracy_score(y, pred), "missed_rate": float((pred == MISSED).mean())}
    rep = pd.DataFrame(classification_report(y, pred, labels=labels, target_names=label_names,
                                             output_dict=True, zero_division=0)).T
    rep.round(3).to_csv(out / "classification_report.csv")
    (out / "metrics.json").write_text(json.dumps({**m, **det, "n_test": int(len(y)), "weights": a.weights,
                                                  "conf": a.conf, "iou": a.iou}, indent=2), encoding="utf-8")
    print(f"test persons n={len(y)}  " + "  ".join(f"{k}={x:.3f}" for k, x in {**m, **det}.items()))
    print(rep.round(2).iloc[:-3][["precision", "recall", "f1-score", "support"]].sort_values("f1-score").to_string())

    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    fig, ax = plt.subplots(figsize=(10, 10))
    ConfusionMatrixDisplay(confusion_matrix(y, pred, labels=labels), display_labels=label_names
                           ).plot(ax=ax, xticks_rotation=90, colorbar=False)
    ax.set_title("one_stage yolo26n-pose (test; missed = counted wrong, not shown)")
    fig.tight_layout()
    png = out / "confusion_matrix.png"
    fig.savefig(png)

    root = Path(a.mlruns).resolve()
    root.mkdir(parents=True, exist_ok=True)
    mlflow.set_tracking_uri(f"sqlite:///{(root / 'mlflow.db').as_posix()}")  # same store as training
    if mlflow.get_experiment_by_name("referee-signal") is None:
        mlflow.create_experiment("referee-signal", artifact_location=(root / "artifacts").as_uri())
    mlflow.set_experiment("referee-signal")
    with mlflow.start_run(run_name="test_eval_one_stage"):
        mlflow.log_params({"model": "one_stage_yolo26n-pose", "n_test": len(y), "conf": a.conf, "iou": a.iou})
        mlflow.log_metrics({**m, **det})
        mlflow.log_artifact(str(out / "classification_report.csv"))
        mlflow.log_artifact(str(png))
    print("logged to MLflow experiment 'referee-signal' run 'test_eval_one_stage'")


if __name__ == "__main__":
    main()
