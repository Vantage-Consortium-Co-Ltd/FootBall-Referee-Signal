# Train

Consumes `Data_Pipeline/output/dataset/` only (`keypoints.csv`, `data.yaml`, `images/`, `labels/`). Test split is never used here.

**Two-stage** (CPU): keypoints -> normalized features (`features.py`) -> LogisticRegression / RandomForest / MLP; best by val macro-F1.
```
python Train/train_two_stage.py            # -> Train/models/two_stage/{model.joblib,meta.json}, Train/mlruns/
mlflow ui --backend-store-uri Train/mlruns  # compare runs (experiment "referee-signal")
python Train/test_train.py                 # synthetic self-check
```
MLflow and the confusion-matrix PNG are skipped with a warning if `mlflow` / `matplotlib` can't be imported.

**One-stage** (Colab GPU): zip `Data_Pipeline/output/dataset/` as `dataset.zip`, upload it and `train_one_stage.py`
to Drive `MyDrive/referee/`, then run `colab_one_stage.ipynb`. Or directly:
```
python Train/train_one_stage.py --data path/to/data.yaml --epochs 100 --imgsz 640 --batch 16 --device 0
```
`fliplr=0` is forced (flipping is done offline in Data_Pipeline, only for `flip_classes`). Outputs `best.pt` + MLflow run in `mlruns/`.
