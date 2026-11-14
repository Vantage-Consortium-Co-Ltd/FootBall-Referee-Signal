"""Evaluate the saved two-stage model on the TEST split and log it to the same MLflow experiment as training.

  python Evaluate/evaluate_two_stage.py [--model Train/models/two_stage] [--csv ...keypoints.csv] [--mlruns Train/mlruns]

Writes Evaluate/output/two_stage/{classification_report.csv,confusion_matrix.png,metrics.json}.
"""
import argparse
import json
import sys
import warnings
from pathlib import Path

import joblib
import mlflow
import pandas as pd
from sklearn.metrics import (ConfusionMatrixDisplay, accuracy_score, classification_report,
                             confusion_matrix, f1_score)

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "Train"))
from features import df_features  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default=str(ROOT / "Train/models/two_stage"))
    ap.add_argument("--csv", default=str(ROOT / "Data_Pipeline/output/dataset/keypoints.csv"))
    ap.add_argument("--mlruns", default=str(ROOT / "Train/mlruns"))
    ap.add_argument("--out", default=str(ROOT / "Evaluate/output/two_stage"))
    a = ap.parse_args()

    meta = json.loads((Path(a.model) / "meta.json").read_text(encoding="utf-8"))
    pipe = joblib.load(Path(a.model) / "model.joblib")
    df = pd.read_csv(a.csv)
    te = df[(df.split == "test") & (df.is_flip == 0)]  # real photos only
    if te.empty:
        raise SystemExit("no split=test rows in keypoints.csv")
    y, pred = te.class_id.to_numpy(), pipe.predict(df_features(te))
    names, labels = meta["class_names"], sorted(set(y) | set(pred))

    m = {"test_macro_f1": f1_score(y, pred, average="macro", zero_division=0),
         "test_weighted_f1": f1_score(y, pred, average="weighted", zero_division=0),
         "test_accuracy": accuracy_score(y, pred)}
    rep = pd.DataFrame(classification_report(y, pred, labels=labels, target_names=[names[i] for i in labels],
                                             output_dict=True, zero_division=0)).T
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    rep.round(3).to_csv(out / "classification_report.csv")
    (out / "metrics.json").write_text(json.dumps({**m, "n_test": len(te), "model": meta["model"]}, indent=2), encoding="utf-8")
    print(f"test n={len(te)}  " + "  ".join(f"{k}={v:.3f}" for k, v in m.items()))
    print(rep.round(2).iloc[:-3][["precision", "recall", "f1-score", "support"]].sort_values("f1-score").to_string())

    png = out / "confusion_matrix.png"
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        fig, ax = plt.subplots(figsize=(10, 10))
        ConfusionMatrixDisplay(confusion_matrix(y, pred, labels=labels), display_labels=[names[i] for i in labels]
                               ).plot(ax=ax, xticks_rotation=90, colorbar=False)
        ax.set_title(f"{meta['model']} (test)")
        fig.tight_layout()
        fig.savefig(png)
    except ImportError as e:  # broken matplotlib env
        png = None
        warnings.warn(f"matplotlib unusable ({e}): confusion-matrix PNG skipped")

    root = Path(a.mlruns).resolve()
    root.mkdir(parents=True, exist_ok=True)
    mlflow.set_tracking_uri(f"sqlite:///{(root / 'mlflow.db').as_posix()}")  # same store as training
    if mlflow.get_experiment_by_name("referee-signal") is None:
        mlflow.create_experiment("referee-signal", artifact_location=(root / "artifacts").as_uri())
    mlflow.set_experiment("referee-signal")
    with mlflow.start_run(run_name="test_eval_two_stage"):
        mlflow.log_params({"model": meta["model"], "n_test": len(te), "cv_macro_f1_train": meta["cv_macro_f1"],
                           **{f"p_{k}": v for k, v in meta["params"].items()}})
        mlflow.log_metrics(m)
        mlflow.log_artifact(str(out / "classification_report.csv"))
        if png:
            mlflow.log_artifact(str(png))
    print("logged to MLflow experiment 'referee-signal' run 'test_eval_two_stage'")


if __name__ == "__main__":
    main()
