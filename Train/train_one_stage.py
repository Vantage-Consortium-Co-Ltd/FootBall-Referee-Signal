"""One-stage: fine-tune yolo26n-pose on the dataset (gesture = box class). Meant for a Colab GPU.

  python Train/train_one_stage.py --data /content/dataset/data.yaml --device 0 [--config Train/config.yaml]

epochs / imgsz / batch / lr0 are lists in config.yaml; every combination is trained and the best (fitness) is
kept as <project>/best_overall.pt.

Flip augmentation is done offline (with class exclusions), so fliplr is forced to 0.
"""
import argparse
import shutil
from pathlib import Path

import yaml
from sklearn.model_selection import ParameterGrid
from ultralytics import YOLO, settings

try:
    import mlflow
except ImportError:
    mlflow = None
    print("WARNING: mlflow not installed, skipping MLflow logging")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True)
    ap.add_argument("--weights", default="yolo26n-pose.pt")
    ap.add_argument("--device", default="0")
    ap.add_argument("--project", default="runs/one_stage")
    ap.add_argument("--mlruns", default="mlruns")
    ap.add_argument("--config", default=str(Path(__file__).with_name("config.yaml")))
    a = ap.parse_args()

    settings.update({"mlflow": False})  # we log ourselves; avoids two competing runs
    grid = yaml.safe_load(Path(a.config).read_text(encoding="utf-8"))["one_stage"]
    if mlflow:
        root = Path(a.mlruns).resolve()
        root.mkdir(parents=True, exist_ok=True)
        mlflow.set_tracking_uri(f"sqlite:///{(root / 'mlflow.db').as_posix()}")  # file store is deprecated in MLflow 3
        if mlflow.get_experiment_by_name("referee-signal") is None:
            mlflow.create_experiment("referee-signal", artifact_location=(root / "artifacts").as_uri())
        mlflow.set_experiment("referee-signal")

    best = None  # (fitness, params, best.pt path)
    for k, p in enumerate(ParameterGrid(grid)):
        args = dict(data=a.data, device=a.device, project=a.project, name=f"trial{k}",
                    fliplr=0.0, seed=42, exist_ok=True, **p)
        model = YOLO(a.weights)
        res = model.train(**args)
        pt, fitness = Path(model.trainer.best), float(res.results_dict["fitness"])
        tr = model.trainer
        best_epoch, epochs_run = tr.stopper.best_epoch, tr.epoch + 1  # best_epoch is 1-based
        print(f"trial {k} {p}: fitness={fitness:.4f} best_epoch={best_epoch} epochs_run={epochs_run} "
              f"optimizer={tr.args.optimizer} lr0={tr.args.lr0}")
        if mlflow:
            with mlflow.start_run(run_name=f"one_stage_trial{k}"):
                # optimizer/lr0 as actually used (optimizer='auto' rewrites them inside the trainer)
                mlflow.log_params({**args, "weights": a.weights, "optimizer_used": tr.args.optimizer,
                                   "lr0_used": tr.args.lr0, "best_epoch": best_epoch, "epochs_run": epochs_run})
                # mlflow rejects "()" in metric names
                mlflow.log_metrics({n.replace("(", "_").replace(")", ""): float(v) for n, v in res.results_dict.items()})
                mlflow.log_artifact(str(pt))
        if best is None or fitness > best[0]:
            best = (fitness, p, pt)

    final = Path(a.project) / "best_overall.pt"
    shutil.copy(best[2], final)
    print(f"best of {k + 1} trials: {best[1]} fitness={best[0]:.4f} -> {final}")


if __name__ == "__main__":
    main()
