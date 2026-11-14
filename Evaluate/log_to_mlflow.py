"""Log one-stage + two-stage results (hyperparameters, train/val, test, models) to an MLflow server as one VERSION.

  python Evaluate/log_to_mlflow.py --version v1 --data-note "burst-5s split, 885/182/153" [--uri http://127.0.0.1:5000]

Layout on the server (one experiment per approach, so versions compare side by side):
  experiment referee-one-stage / referee-two-stage
    parent run  = <version>                 tags version, data_note; summary metrics (best val, test)
      child runs  = trials (hyperparameters + per-epoch train/val curves for one-stage, CV/val scores for two-stage)
                    + test_eval (test metrics, classification report, confusion matrix)
  model registry referee-one-stage / referee-two-stage -> a new model version per run of this script

Sources: one-stage = Train/results/runs/one_stage + Evaluate/output/one_stage; two-stage = Train/mlruns (sqlite)
+ Train/models/two_stage. Refuses to log a version that already exists in an experiment: pick a new --version.
"""
import argparse
import json
import tempfile
from pathlib import Path

import mlflow
import mlflow.pyfunc
import mlflow.sklearn
import pandas as pd
import yaml
from mlflow.entities import Metric, Param, RunTag
from mlflow.tracking import MlflowClient

ROOT = Path(__file__).resolve().parents[1]
ONE_RUNS = ROOT / "Train/results/runs/one_stage"
ONE_EVAL = ROOT / "Evaluate/output/one_stage"
TWO_MODEL = ROOT / "Train/models/two_stage"
LOCAL_STORE = f"sqlite:///{(ROOT / 'Train/mlruns/mlflow.db').as_posix()}"
CURVES = ["results.csv", "args.yaml", "results.png", "confusion_matrix.png", "confusion_matrix_normalized.png",
          "BoxF1_curve.png", "PoseF1_curve.png", "weights/best.pt"]


def mname(k):
    return k.replace("(", "_").replace(")", "")  # mlflow rejects "()" in metric names


def log_all(c, run_id, params=(), metrics=(), tags=()):
    """log_batch caps: 100 params / 1000 metrics / 100 tags per call."""
    for i in range(0, len(params), 100):
        c.log_batch(run_id, params=params[i:i + 100])
    for i in range(0, len(metrics), 1000):
        c.log_batch(run_id, metrics=metrics[i:i + 1000])
    for i in range(0, len(tags), 100):
        c.log_batch(run_id, tags=tags[i:i + 100])


def new_run(c, exp_id, name, tags, parent=None, start_time=None):
    t = {"mlflow.runName": name, **tags}
    if parent:
        t["mlflow.parentRunId"] = parent
    return c.create_run(exp_id, start_time=start_time, tags=t).info.run_id


def experiment(c, name):
    e = c.get_experiment_by_name(name)
    return e.experiment_id if e else c.create_experiment(name)


def parent_run(c, exp_id, version, data_note, stage):
    if c.search_runs([exp_id], f"tags.version = '{version}' and tags.kind = 'version'"):
        raise SystemExit(f"{stage}: version '{version}' already exists - use a new --version")
    return new_run(c, exp_id, version, {"version": version, "kind": "version", "stage": stage, "data_note": data_note,
                                        "mlflow.note.content": f"{stage} {version}: {data_note}"})


class YoloPose(mlflow.pyfunc.PythonModel):
    """Wraps the one-stage .pt so it can live in the model registry. predict(DataFrame['path']) -> Ultralytics summaries."""

    def load_context(self, context):
        from ultralytics import YOLO
        self.m = YOLO(context.artifacts["weights"])

    def predict(self, context, model_input, params=None):
        return [r.summary() for r in self.m.predict(list(model_input["path"]), verbose=False)]


def register(c, name, model_uri, version, summary):
    mv = mlflow.register_model(model_uri, name)
    for k, v in {"version": version, **summary}.items():
        c.set_model_version_tag(name, mv.version, k, str(v))
    print(f"registered {name} v{mv.version}")


def log_one_stage(c, version, data_note):
    exp = experiment(c, "referee-one-stage")
    parent = parent_run(c, exp, version, data_note, "one_stage")
    best = None  # (fitness, run_id, best_epoch, row)
    for d in sorted(ONE_RUNS.glob("trial*")):
        args = yaml.safe_load((d / "args.yaml").read_text(encoding="utf-8"))
        df = pd.read_csv(d / "results.csv")
        df.columns = [x.strip() for x in df.columns]
        fit = df["metrics/mAP50-95(P)"] + df["metrics/mAP50-95(B)"]  # Ultralytics pose fitness
        i = int(fit.idxmax())
        rid = new_run(c, exp, d.name, {"version": version, "kind": "trial", "stage": "one_stage"}, parent)
        step_metrics = [Metric(mname(k), float(v), 0, int(e)) for _, row in df.iterrows()
                        for k, v in row.items() if k != "epoch" for e in [row["epoch"]]]
        summary = {"best_epoch": float(df.epoch[i]), "epochs_run": float(len(df)), "best_fitness": float(fit[i]),
                   **{f"best/{mname(k)}": float(v) for k, v in df.iloc[i].items() if k.startswith("metrics/")},
                   "last/val_cls_loss": float(df["val/cls_loss"].iloc[-1])}
        log_all(c, rid, [Param(k, str(v)[:500]) for k, v in args.items()], step_metrics + [Metric(k, v, 0, 0) for k, v in summary.items()])
        for a in CURVES:
            if (d / a).exists():
                c.log_artifact(rid, str(d / a), str(Path(a).parent) if "/" in a else None)
        c.set_terminated(rid)
        print(f"one-stage {d.name}: best_epoch={int(df.epoch[i])} fitness={fit[i]:.4f}")
        if best is None or fit[i] > best[0]:
            best = (float(fit[i]), rid, int(df.epoch[i]), d)

    # test evaluation (files written by Evaluate/evaluate_one_stage.py)
    test = json.loads((ONE_EVAL / "metrics.json").read_text(encoding="utf-8"))
    rid = new_run(c, exp, "test_eval", {"version": version, "kind": "test", "stage": "one_stage"}, parent)
    log_all(c, rid, [Param(k, str(test[k])) for k in ("weights", "conf", "iou", "n_test") if k in test],
            [Metric(k, float(v), 0, 0) for k, v in test.items() if isinstance(v, (int, float)) and k != "n_test"])
    for f in ("metrics.json", "classification_report.csv", "confusion_matrix.png"):
        c.log_artifact(rid, str(ONE_EVAL / f))
    if (ONE_EVAL / "val").exists():
        c.log_artifacts(rid, str(ONE_EVAL / "val"), "ultralytics_val")
    c.set_terminated(rid)

    # parent: best trial's val + test summary, and the model for the registry
    log_all(c, parent, [Param("best_trial", best[3].name), Param("best_epoch", str(best[2]))],
            [Metric("val_best_fitness", best[0], 0, 0)] + [Metric(f"test_{k}" if not k.startswith("test_") else k, float(v), 0, 0)
                                                           for k, v in test.items() if isinstance(v, (int, float)) and k != "n_test"])
    with mlflow.start_run(run_id=parent):
        info = mlflow.pyfunc.log_model(name="model", python_model=YoloPose(), pip_requirements=["ultralytics"],
                                       artifacts={"weights": str(ONE_RUNS / "best_overall.pt")})
    c.set_terminated(parent)
    register(c, "referee-one-stage", info.model_uri, version, {"val_best_fitness": round(best[0], 4),
                                                        "test_macro_f1": round(test["test_macro_f1"], 4), "data_note": data_note})


def copy_run(src, dst, r, exp, parent, tags):
    rid = new_run(dst, exp, r.info.run_name, {**{k: v for k, v in r.data.tags.items() if not k.startswith("mlflow.")},
                                              **tags}, parent, r.info.start_time)
    ms = [Metric(k, m.value, m.timestamp, m.step) for k in r.data.metrics for m in src.get_metric_history(r.info.run_id, k)]
    log_all(dst, rid, [Param(k, v) for k, v in r.data.params.items()], ms)
    if src.list_artifacts(r.info.run_id):
        with tempfile.TemporaryDirectory() as t:
            dst.log_artifacts(rid, src.download_artifacts(r.info.run_id, "", t))
    dst.set_terminated(rid)
    return rid


def log_two_stage(c, version, data_note):
    exp = experiment(c, "referee-two-stage")
    parent = parent_run(c, exp, version, data_note, "two_stage")
    src = MlflowClient(LOCAL_STORE)
    runs = [r for e in src.search_experiments() for r in src.search_runs([e.experiment_id], max_results=1000)]
    test = None
    for r in sorted(runs, key=lambda x: x.info.start_time):
        n, m = r.info.run_name, r.data.metrics
        if n == "test_eval_one_stage":
            continue  # logged from files in the one-stage experiment
        kind = ("test" if n == "test_eval_two_stage" else "final_refit" if n == "final_refit"
                else "trial_cv" if "cv_macro_f1" in m else "trial_val_holdout")
        copy_run(src, c, r, exp, parent, {"version": version, "kind": kind, "stage": "two_stage"})
        if kind == "test":
            test = m
    meta = json.loads((TWO_MODEL / "meta.json").read_text(encoding="utf-8"))
    log_all(c, parent, [Param("model", meta["model"]), *[Param(f"p_{k}", str(v)) for k, v in meta["params"].items()],
                        Param("folds", str(meta["folds"])), Param("n_trials", str(meta["n_trials"]))],
            [Metric(k, float(v), 0, 0) for k, v in meta.items() if k.startswith("cv_")] +
            [Metric(k, float(v), 0, 0) for k, v in (test or {}).items()])
    import joblib
    with mlflow.start_run(run_id=parent):
        info = mlflow.sklearn.log_model(joblib.load(TWO_MODEL / "model.joblib"), name="model",
                                        serialization_format="cloudpickle")
        mlflow.log_artifact(str(TWO_MODEL / "meta.json"))
    c.set_terminated(parent)
    register(c, "referee-two-stage", info.model_uri, version, {"cv_macro_f1": round(meta["cv_macro_f1"], 4),
                                                        "test_macro_f1": round((test or {}).get("test_macro_f1", float("nan")), 4),
                                                        "data_note": data_note})


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--version", required=True, help="e.g. v1; one per (data split + training config) generation")
    ap.add_argument("--data-note", required=True, help="what data / split this version used")
    ap.add_argument("--uri", default="http://127.0.0.1:5000")
    ap.add_argument("--stages", nargs="+", default=["one", "two"], choices=["one", "two"])
    a = ap.parse_args()
    mlflow.set_tracking_uri(a.uri)
    c = MlflowClient(a.uri)
    if "one" in a.stages:
        log_one_stage(c, a.version, a.data_note)
    if "two" in a.stages:
        log_two_stage(c, a.version, a.data_note)
    print(f"done -> {a.uri}  (experiments referee-one-stage / referee-two-stage, version {a.version})")


if __name__ == "__main__":
    main()
