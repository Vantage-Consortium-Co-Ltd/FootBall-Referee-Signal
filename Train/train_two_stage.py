"""Two-stage: keypoints.csv -> normalized features -> sklearn classifier. Picks best by val macro-F1.

  python Train/train_two_stage.py [--csv ...keypoints.csv] [--out Train/models/two_stage] [--mlruns Train/mlruns] [--config Train/config.yaml]

Every model's parameter lists in config.yaml are expanded to all combinations; the best one overall is saved.

Train+val rows are pooled and scored with grouped, stratified K-fold CV (folds/augmentation in config.yaml);
augmentation touches training folds only. The winner is refit on all train+val rows. Test split is never
touched here (Evaluate phase does that).
"""
import argparse
import json
import warnings
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import yaml
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import ConfusionMatrixDisplay, accuracy_score, confusion_matrix, f1_score
from sklearn.model_selection import ParameterGrid, StratifiedGroupKFold
from sklearn.neural_network import MLPClassifier
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

from augment import augment
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
MODELS = {  # fixed settings live here, tunable ones come from config.yaml; MLP has no class_weight option
    "logreg": lambda **p: LogisticRegression(max_iter=3000, class_weight="balanced", random_state=SEED, **p),
    "random_forest": lambda **p: RandomForestClassifier(class_weight="balanced", random_state=SEED, n_jobs=-1, **p),
    "mlp": lambda **p: MLPClassifier(max_iter=500, random_state=SEED, **p),
}


def trials(grids):
    """{model: {param: [values]}} -> [(model, params)] for every combination."""
    out = []
    for name, grid in grids.items():
        for p in ParameterGrid(grid):
            if "hidden_layer_sizes" in p:
                p["hidden_layer_sizes"] = tuple(p["hidden_layer_sizes"])  # yaml gives a list
            out.append((name, p))
    return out


def _fit_data(d, aug):
    """Features + labels of rows d plus their augmented copies (training use only)."""
    extra = augment(d, **aug)
    X = df_features(pd.concat([d, extra], ignore_index=True))
    return X, pd.concat([d.class_id, extra.class_id]).to_numpy()


def train(csv, out_dir, mlruns=None, cfg=None):
    cfg = cfg or yaml.safe_load(Path(__file__).with_name("config.yaml").read_text(encoding="utf-8"))
    grids, folds, aug = cfg["two_stage"], cfg["cv"]["folds"], {**cfg["augment"], "seed": SEED}
    unknown = set(grids) - set(MODELS)
    if unknown:
        raise SystemExit(f"unknown model(s) in config: {sorted(unknown)}")

    df = pd.read_csv(csv)
    df = df[df.split != "test"].reset_index(drop=True)  # train+val only; test stays untouched
    if df.group.nunique() < folds:
        raise SystemExit(f"need >= {folds} burst groups in train+val, found {df.group.nunique()}")
    y = df.class_id.to_numpy()
    names = df.drop_duplicates("class_id").set_index("class_id").class_name.to_dict()
    class_names = [names.get(i, str(i)) for i in range(int(y.max()) + 1)]
    labels = sorted(set(y))

    # Build every fold once: flipped / augmented rows are training-only; scoring uses real photos only.
    # Groups keep a photo, its flip and all its burst-mates in the same fold (no leakage).
    cv_data = []
    for tr, va in StratifiedGroupKFold(folds, shuffle=True, random_state=SEED).split(df, y, df.group):
        va = va[df.is_flip.to_numpy()[va] == 0]
        cv_data.append((*_fit_data(df.iloc[tr], aug), va, df_features(df.iloc[va])))
    print(f"{len(df)} rows ({df.group.nunique()} groups), {folds}-fold grouped CV, {aug['copies']} aug copies")

    if mlflow:
        mlruns = (Path(mlruns) if mlruns else ROOT / "Train" / "mlruns").resolve()
        mlruns.mkdir(parents=True, exist_ok=True)
        mlflow.set_tracking_uri(f"sqlite:///{(mlruns / 'mlflow.db').as_posix()}")  # file store is deprecated in MLflow 3
        if mlflow.get_experiment_by_name("referee-signal") is None:
            mlflow.create_experiment("referee-signal", artifact_location=(mlruns / "artifacts").as_uri())
        mlflow.set_experiment("referee-signal")

    best = None
    for k, (name, params) in enumerate(trials(grids)):
        oof, fold_f1 = np.full(len(df), -1), []
        for Xtr, ytr, va, Xva in cv_data:
            pred = make_pipeline(StandardScaler(), MODELS[name](**params)).fit(Xtr, ytr).predict(Xva)
            oof[va] = pred
            fold_f1.append(f1_score(y[va], pred, average="macro", zero_division=0))
        ok = oof >= 0
        m = {"cv_macro_f1": f1_score(y[ok], oof[ok], average="macro", zero_division=0),
             "cv_fold_f1_mean": float(np.mean(fold_f1)), "cv_fold_f1_std": float(np.std(fold_f1)),
             "cv_weighted_f1": f1_score(y[ok], oof[ok], average="weighted", zero_division=0),
             "cv_accuracy": accuracy_score(y[ok], oof[ok])}
        print(f"{name:14s} {params}  " + "  ".join(f"{a}={v:.3f}" for a, v in m.items()))

        fig = None
        if plt:
            fig, ax = plt.subplots(figsize=(10, 10))
            ConfusionMatrixDisplay(confusion_matrix(y[ok], oof[ok], labels=labels),
                                   display_labels=[class_names[i] for i in labels]).plot(ax=ax, xticks_rotation=90, colorbar=False)
            ax.set_title(f"{name} {params} (CV out-of-fold)", fontsize=8)
            fig.tight_layout()
        if mlflow:
            with mlflow.start_run(run_name=f"{name}_{k}"):
                mlflow.log_params({"model": name, "trial": k, "seed": SEED, "folds": folds, "n_rows": len(df),
                                   **{f"aug_{a}": v for a, v in aug.items()}, **{f"p_{a}": v for a, v in params.items()}})
                mlflow.log_metrics(m)
                if fig:
                    mlflow.log_figure(fig, "confusion_matrix_cv.png")
        if fig:
            plt.close(fig)
        if best is None or m["cv_macro_f1"] > best[1]["cv_macro_f1"]:
            best = (name, m, params)

    # refit the winner on all train+val rows (+ augmented copies)
    Xall, yall = _fit_data(df, aug)
    pipe = make_pipeline(StandardScaler(), MODELS[best[0]](**best[2])).fit(Xall, yall)
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipe, out / "model.joblib")
    meta = {"model": best[0], "params": {a: list(v) if isinstance(v, tuple) else v for a, v in best[2].items()},
            "n_trials": k + 1, "folds": folds, "augment": aug, **best[1], "class_names": class_names,
            "feature_recipe": FEATURE_RECIPE, "n_features": int(Xall.shape[1])}
    (out / "meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    if mlflow:
        with mlflow.start_run(run_name="final_refit"):
            mlflow.log_params({"model": best[0], **{f"p_{a}": v for a, v in best[2].items()}})
            mlflow.log_metrics(best[1])
            mlflow.sklearn.log_model(pipe, "model", serialization_format="cloudpickle")  # skops rejects MLP optimizer types
    print(f"best of {k + 1} trials: {best[0]} {best[2]} (CV macro-F1 {best[1]['cv_macro_f1']:.3f}) -> {out}")
    return meta


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", default=str(ROOT / "Data_Pipeline/output/dataset/keypoints.csv"))
    ap.add_argument("--out", default=str(ROOT / "Train/models/two_stage"))
    ap.add_argument("--mlruns", default=None)
    ap.add_argument("--config", default=str(Path(__file__).with_name("config.yaml")))
    a = ap.parse_args()
    train(a.csv, a.out, a.mlruns, yaml.safe_load(Path(a.config).read_text(encoding="utf-8")))
