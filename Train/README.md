# Train

Consumes `Data_Pipeline/output/dataset/` only (`keypoints.csv`, `data.yaml`, `images/`, `labels/`). The test split is never used here.

**Tuning:** every hyper-parameter in the `train:` section of the root `config.yaml` is a list; all combinations are tried and the best (cross-validated macro-F1 for two-stage, YOLO fitness for one-stage) is kept.

**Two-stage** (CPU): keypoints -> normalized features (`features.py`) -> LogisticRegression / RandomForest / MLP.
- Train+val are pooled and scored with grouped, stratified K-fold CV (`cv.folds`); a photo, its flip and its burst-mates always share a fold.
- `augment.py` adds rotated / stretched / jittered keypoint copies to the training part of each fold only (`augment:` in config).
- The winner is refit on all train+val rows and saved with its CV score in `meta.json`.
```
python Train/trainTwoStage.py            # -> best combination -> Train/models/two_stage/{model.joblib,meta.json}, Train/mlruns/
mlflow ui --backend-store-uri sqlite:///Train/mlruns/mlflow.db  # compare runs (experiment "referee-signal")
```
MLflow and the confusion-matrix PNG are skipped with a warning if `mlflow` / `matplotlib` can't be imported.

**One-stage** (Kaggle/Colab GPU): upload `Data_Pipeline/output/dataset/` as a dataset, copy `trainOneStage.py` and `config.yaml` (use `--grid one_stage_kaggle` for the Kaggle grid), then:
```
python Train/trainOneStage.py --data path/to/data.yaml --device 0
```
`fliplr=0` is forced (flipping is done offline in Data_Pipeline, only for `flip_classes`). Outputs `best.pt` + MLflow run in `mlruns/`.
Early stopping is on (`patience: 30` in `config.yaml`) and `optimizer` is set explicitly, because under the default `optimizer=auto` Ultralytics ignores `lr0`. Trials are named `trial{k}` with `exist_ok=True`, so pass a new `--project` for every round or you overwrite the previous one.

**Hand refiner** (CPU): `python Train/trainRefiner.py [--tag v3-notflip --dataset Data_Pipeline/output_notflip/dataset]` fits a logistic regression on MediaPipe hand features of the `refine.groups` classes (train+val only), scores it with burst-grouped CV, writes `Train/models/refiner/<tag>/{refiner.joblib,meta.json}` and logs it to MLflow experiment `referee-refiner`. Used by `Inference/`; fit one per YOLO weights/dataset.
