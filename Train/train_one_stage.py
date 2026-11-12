"""One-stage: fine-tune yolo26n-pose on the dataset (gesture = box class). Meant for a Colab GPU.

  python Train/train_one_stage.py --data /content/dataset/data.yaml --epochs 100 --imgsz 640 --batch 16 --device 0

Flip augmentation is done offline (with class exclusions), so fliplr is forced to 0.
"""
import argparse
from pathlib import Path

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
    ap.add_argument("--epochs", type=int, default=100)
    ap.add_argument("--imgsz", type=int, default=640)
    ap.add_argument("--batch", type=int, default=16)
    ap.add_argument("--device", default="0")
    ap.add_argument("--project", default="runs/one_stage")
    ap.add_argument("--mlruns", default="mlruns")
    a = ap.parse_args()

    settings.update({"mlflow": False})  # we log ourselves; avoids two competing runs
    args = dict(data=a.data, epochs=a.epochs, imgsz=a.imgsz, batch=a.batch, device=a.device,
                project=a.project, name="train", fliplr=0.0, seed=42, exist_ok=True)
    model = YOLO(a.weights)
    res = model.train(**args)
    best = Path(model.trainer.best)

    if mlflow:
        mlflow.set_tracking_uri(Path(a.mlruns).resolve().as_uri())
        mlflow.set_experiment("referee-signal")
        with mlflow.start_run(run_name="one_stage_yolo26n_pose"):
            mlflow.log_params({**args, "weights": a.weights})
            # mlflow rejects "()" in metric names
            mlflow.log_metrics({k.replace("(", "_").replace(")", ""): float(v) for k, v in res.results_dict.items()})
            mlflow.log_artifact(str(best))
    print("best.pt:", best)


if __name__ == "__main__":
    main()
