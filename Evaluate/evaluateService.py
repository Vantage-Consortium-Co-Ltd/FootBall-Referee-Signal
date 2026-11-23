"""Evaluate exactly what the API serves (YOLO + hand refiner, settings from config/config.yaml) on the TEST split of the dataset.

  python Evaluate/evaluateService.py [--name v3_notflip] [--dataset Data_Pipeline/output_notflip/dataset]

Each ground-truth person takes the label of the best-confidence prediction with box IoU >= --iou; no matching prediction = "missed" (always wrong).
Extra predictions that match no ground-truth person are not counted (same rule as evaluateOneStage.py).
Writes Evaluate/results/<name>/{metrics.json, confusion_matrix.png, confusion_matrix_normalized.png, per_class_metrics.png}; the folder is committed to git.
"""
import argparse
import json
import sys
from pathlib import Path

import cv2
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import torch
import yaml
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, precision_recall_fscore_support
from ultralytics.utils.metrics import box_iou

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "Inference"))
from app.predict import Detector  # noqa: E402
from utils.loadUtils import load_config, resolve  # noqa: E402

MISSED = "missed"


def gt_boxes(rows, w, h):
    g = torch.tensor(rows[:, 1:5], dtype=torch.float32)
    return torch.stack([(g[:, 0] - g[:, 2] / 2) * w, (g[:, 1] - g[:, 3] / 2) * h, (g[:, 0] + g[:, 2] / 2) * w, (g[:, 1] + g[:, 3] / 2) * h], 1)


def predict_persons(det, ds, names, iou_thr):
    y, pred = [], []
    for img_p in sorted((ds / "images/test").glob("*.jpg")):
        lbl = ds / "labels/test" / (img_p.stem + ".txt")
        rows = np.loadtxt(lbl, ndmin=2)[:, :5] if lbl.exists() and lbl.stat().st_size else np.zeros((0, 5))
        if not len(rows):
            continue
        img = cv2.imread(str(img_p))
        r, dets = det._run(img)
        pb = r.boxes.xyxy.cpu()
        gb = gt_boxes(rows, img.shape[1], img.shape[0])
        for i, row in enumerate(rows):
            y.append(names[int(row[0])])
            best, bc = MISSED, -1.0
            if len(pb):
                iou = box_iou(gb[i:i + 1], pb)[0]
                for j in range(len(pb)):
                    if iou[j] >= iou_thr and dets[j]["confidence"] > bc:
                        best, bc = dets[j]["label"], dets[j]["confidence"]
            pred.append(best)
    return y, pred


def plot_confusion(cm, rows, cols, title, path, fmt):
    fig, ax = plt.subplots(figsize=(max(9, len(cols) * 0.7), max(8, len(rows) * 0.6)))
    im = ax.imshow(cm, cmap="Blues")
    ax.set_xticks(range(len(cols)), cols, rotation=60, ha="right")
    ax.set_yticks(range(len(rows)), rows)
    ax.set_xlabel("Predicted")
    ax.set_ylabel("True")
    ax.set_title(title)
    top = cm.max() / 2 if cm.size else 0
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            if cm[i, j]:
                ax.text(j, i, format(cm[i, j], fmt), ha="center", va="center", fontsize=8, color="white" if cm[i, j] > top else "black")
    fig.colorbar(im, ax=ax, fraction=0.046)
    fig.tight_layout()
    fig.savefig(path, dpi=150)
    plt.close(fig)


def main():
    pipe = yaml.safe_load((ROOT / "config/config.yaml").read_text(encoding="utf-8"))["data_pipeline"]
    ap = argparse.ArgumentParser()
    ap.add_argument("--name", default="v3_notflip", help="output folder name under Evaluate/results/")
    ap.add_argument("--dataset", default=f"{pipe['output_dir']}/dataset")
    ap.add_argument("--iou", type=float, default=0.5)
    a = ap.parse_args()

    cfg = load_config()
    ds, out = resolve(a.dataset), ROOT / "Evaluate/results" / a.name
    names = yaml.safe_load((ds / "data.yaml").read_text(encoding="utf-8"))["names"]
    names = [names[k] for k in sorted(names)] if isinstance(names, dict) else list(names)
    out.mkdir(parents=True, exist_ok=True)

    y, pred = predict_persons(Detector(cfg), ds, names, a.iou)
    present = [c for c in names if c in set(y)]  # classes that exist in the test split
    p, r, f, s = precision_recall_fscore_support(y, pred, labels=present, zero_division=0)
    cols = present + [MISSED] + [c for c in sorted(set(pred)) if c not in present and c != MISSED]
    cm = confusion_matrix(y, pred, labels=cols)[: len(present)]
    cmn = cm / np.maximum(cm.sum(1, keepdims=True), 1)

    avg = lambda k: dict(zip(("precision", "recall", "f1"), (round(float(v), 4) for v in precision_recall_fscore_support(y, pred, labels=present, average=k, zero_division=0)[:3])))
    metrics = {
        "model": cfg.model_path, "refiner": cfg.refine.refiner_path if cfg.refine.enabled else None, "dataset": a.dataset, "split": "test",
        "settings": {"imgsz": cfg.imgsz, "conf": cfg.conf, "iou_match": a.iou, "refine_groups": list(cfg.refine.groups)},
        "n_persons": len(y), "n_missed": int(sum(p_ == MISSED for p_ in pred)),
        "accuracy": round(float(accuracy_score(y, pred)), 4),
        "macro_f1": round(float(f1_score(y, pred, labels=present, average="macro", zero_division=0)), 4),
        "macro_avg": avg("macro"), "weighted_avg": avg("weighted"),
        "per_class": {c: {"precision": round(float(p[i]), 4), "recall": round(float(r[i]), 4), "f1": round(float(f[i]), 4), "support": int(s[i])} for i, c in enumerate(present)},
        "confusion_matrix": {"rows_true": present, "cols_pred": cols, "counts": cm.astype(int).tolist()},
    }
    (out / "metrics.json").write_text(json.dumps(metrics, indent=2, ensure_ascii=False), encoding="utf-8")

    plot_confusion(cm, present, cols, f"Confusion matrix ({a.name}, test, counts)", out / "confusion_matrix.png", "d")
    plot_confusion(cmn, present, cols, f"Confusion matrix ({a.name}, test, row-normalized)", out / "confusion_matrix_normalized.png", ".2f")
    fig, ax = plt.subplots(figsize=(max(9, len(present) * 0.8), 5))
    x = np.arange(len(present))
    for k, (lab, vals) in enumerate((("Precision", p), ("Recall", r), ("F1", f))):
        ax.bar(x + (k - 1) * 0.27, vals, 0.27, label=lab)
    ax.set_xticks(x, [f"{c}\n(n={n})" for c, n in zip(present, s)], rotation=60, ha="right", fontsize=8)
    ax.set_ylim(0, 1.05)
    ax.set_title(f"Per-class metrics ({a.name}) - accuracy {metrics['accuracy']}, macro-F1 {metrics['macro_f1']}")
    ax.legend()
    fig.tight_layout()
    fig.savefig(out / "per_class_metrics.png", dpi=150)
    plt.close(fig)
    print(f"saved {out}\nn={len(y)} missed={metrics['n_missed']} accuracy={metrics['accuracy']} macro_f1={metrics['macro_f1']} "
          f"macro P/R={metrics['macro_avg']['precision']}/{metrics['macro_avg']['recall']}")


if __name__ == "__main__":
    main()
