"""Two-stage: keypoints.csv -> normalized features -> sklearn classifier. Picks best by val macro-F1.

  python Train/train_two_stage.py [--csv ...keypoints.csv] [--out Train/models/two_stage] [--mlruns Train/mlruns]

Test split is never touched here (Evaluate phase does that).
"""
import argparse
import json
import warnings
from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import ConfusionMatrixDisplay, accuracy_score, confusion_matrix, f1_score
from sklearn.neural_network import MLPClassifier
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

from features import FEATURE_RECIPE, df_features

try:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
except ImportError as e:  # also hit when the env's pyexpat DLL is broken
    plt = None
    warnings.warn(f"matplotlib unusable ({e}): confusion-matrix PNG skipped")

try:
    import mlflow
    import mlflow.sklearn
except ImportError:
    mlflow = None
    warnings.warn("mlflow not installed: skipping MLflow logging")

ROOT = Path(__file__).resolve().parents[1]
SEED = 42
MODELS = {  # MLPClassifier has no class_weight option
    "logreg": lambda: LogisticRegression(max_iter=3000, class_weight="balanced", random_state=SEED),
    "random_forest": lambda: RandomForestClassifier(n_estimators=300, class_weight="balanced", random_state=SEED, n_jobs=-1),
    "mlp": lambda: MLPClassifier(hidden_layer_sizes=(128, 64), max_iter=500, random_state=SEED),
}


def train(csv, out_dir, mlruns=None):
    df = pd.read_csv(csv)
    tr, va = df[df.split == "train"], df[df.split == "val"]
    if tr.empty or va.empty:
        raise SystemExit("keypoints.csv needs both split=train and split=val rows")
    Xtr, ytr, Xva, yva = df_features(tr), tr.class_id.to_numpy(), df_features(va), va.class_id.to_numpy()
    names = df.drop_duplicates("class_id").set_index("class_id").class_name.to_dict()
    labels = sorted(set(ytr) | set(yva))
    class_names = [names.get(i, str(i)) for i in range(max(labels) + 1)]

    if mlflow:
        mlflow.set_tracking_uri((Path(mlruns) if mlruns else ROOT / "Train" / "mlruns").resolve().as_uri())
        mlflow.set_experiment("referee-signal")

    best = None
    for name, make in MODELS.items():
        pipe = make_pipeline(StandardScaler(), make()).fit(Xtr, ytr)
        pred = pipe.predict(Xva)
        m = {"val_macro_f1": f1_score(yva, pred, average="macro", zero_division=0),
             "val_weighted_f1": f1_score(yva, pred, average="weighted", zero_division=0),
             "val_accuracy": accuracy_score(yva, pred)}
        print(f"{name:14s} " + "  ".join(f"{k}={v:.3f}" for k, v in m.items()))

        fig = None
        if plt:
            fig, ax = plt.subplots(figsize=(10, 10))
            ConfusionMatrixDisplay(confusion_matrix(yva, pred, labels=labels),
                                   display_labels=[class_names[i] for i in labels]).plot(ax=ax, xticks_rotation=90, colorbar=False)
            ax.set_title(f"{name} (val)")
            fig.tight_layout()
        if mlflow:
            with mlflow.start_run(run_name=name):
                mlflow.log_params({"model": name, "seed": SEED, "n_train": len(tr), "n_val": len(va),
                                   **{k: v for k, v in pipe[-1].get_params().items() if isinstance(v, (int, float, str, bool, tuple))}})
                mlflow.log_metrics(m)
                if fig:
                    mlflow.log_figure(fig, "confusion_matrix_val.png")
                mlflow.sklearn.log_model(pipe, "model")
        if fig:
            plt.close(fig)
        if best is None or m["val_macro_f1"] > best[1]["val_macro_f1"]:
            best = (name, m, pipe)

    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    joblib.dump(best[2], out / "model.joblib")
    meta = {"model": best[0], "val_macro_f1": best[1]["val_macro_f1"], "class_names": class_names,
            "feature_recipe": FEATURE_RECIPE, "n_features": int(Xtr.shape[1])}
    (out / "meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print(f"best: {best[0]} (val macro-F1 {best[1]['val_macro_f1']:.3f}) -> {out}")
    return meta


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", default=str(ROOT / "Data_Pipeline/output/dataset/keypoints.csv"))
    ap.add_argument("--out", default=str(ROOT / "Train/models/two_stage"))
    ap.add_argument("--mlruns", default=None)
    a = ap.parse_args()
    train(a.csv, a.out, a.mlruns)
