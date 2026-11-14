# Football Referee Signal

Recognise football referee hand signals (20 gesture classes) from photos/video using pose keypoints.
Pipeline: **pre-label with YOLO26-pose → review/relabel in Label Studio → train → evaluate → infer**.

> Status: pre-labeling, Data_Pipeline, Train and Evaluate (test-split evaluation + MLflow logging) are built. `Inference/` is a placeholder.
> Only synthetic-data self-tests have been run so far; the Label Studio API path is untested against a live server.

## Layout

```
Data_Preprocess/src/     pre_Label.py (YOLO26-pose pre-labeling) + export_to_label_studio.py
Data_Pipeline/           main.py (entry) + Process/ (labelstudio, convert, split, build) + config/config.yaml
Train/                   train_two_stage.py, train_one_stage.py, features.py, augment.py, config.yaml
Evaluate/                evaluate_one_stage.py, evaluate_two_stage.py (test split), log_to_mlflow.py (versioned MLflow logging)
Inference/               placeholder (FastAPI)
.env.example             copy to .env (git-ignored) and fill in
```

## Setup

```bash
pip install -r requirements.txt
```

`yolo26n-pose.pt` is not in the repo; Ultralytics downloads it on first use, or put it next to `pre_Label.py`.

## 1. Pre-label

Accepts JPG/PNG/WebP, HEIC (phone photos) and video (every Nth frame).

```bash
cd Data_Preprocess/src
python pre_Label.py --src Dataset/<folder> --out ../output/prelabel
```

Output in `--out`: `images/`, `labels/` (YOLO-pose txt), `preview/` (frames flagged for review),
`keypoints.csv`, `data.yaml`, `label_config.xml`, and `label_studio_tasks_NN.json`
(images embedded as base64, 150 tasks per file; change with `--chunk`).

Every box starts as class `Referee` — the gesture is assigned during review. Keypoints are the 17 COCO points.

## 2. Review in Label Studio

1. Create a project and paste `label_config.xml` under *Labeling Interface → Code*.
2. *Import* every `label_studio_tasks_NN.json` (predictions arrive attached to each task).
3. Select a box and press its hotkey to set the gesture; fix keypoints; delete extra people.
4. Do not reorder classes once labeling has started — class ids in the YOLO labels depend on the order.

## Gesture classes (id: hotkey)

| id | class | key | id | class | key |
|---|---|---|---|---|---|
| 0 | Referee | 1 | 10 | Disallowed_Goal | a |
| 1 | Indirect_Free_Kick | 2 | 11 | Time_out | b |
| 2 | Direct_Free_Kick | 3 | 12 | Corner_Kick | c |
| 3 | Card (yellow/red merged) | 4 | 13 | Jumping | d |
| 4 | Play_On | 5 | 14 | Obstruction | e |
| 5 | Penalty_Kick | 6 | 15 | Pushing | f |
| 6 | Offside | 7 | 16 | Hand_Ball | g |
| 7 | Offside_Location | 8 | 17 | Elbowing | h |
| 8 | Substitution | 9 | 18 | Tripping | i |
| 9 | Goal | 0 | 19 | Kicking | j |

## 3. Data_Pipeline: Label Studio -> train/val/test

```bash
cp .env.example .env          # set LS_URL, LS_TOKEN, LS_PROJECT_IDS (never commit .env)
python Data_Pipeline/main.py                          # export via API
python Data_Pipeline/main.py --export-json raw.json   # or use a saved export
```

- Uses the latest non-cancelled annotation per task; predictions are ignored.
- Split 70/15/15, stratified by class and grouped by photo burst (filename timestamps within `burst_seconds`, cut where the gesture class changes), fixed seed.
- Offline horizontal flip on **train only**, only for classes in `flip_classes` (`config/config.yaml`); an image is flipped only if every person in it has such a class. Left/right keypoints are swapped.
- Output in `Data_Pipeline/output/dataset/` (git-ignored): `images/`, `labels/`, `data.yaml`, `keypoints.csv`, `split_manifest.csv`.

## 4. Train

See `Train/README.md`. Two approaches are compared: a two-stage keypoint classifier (CPU, grouped CV, keypoint augmentation, MLflow) and a one-stage YOLO-pose fine-tune (Colab GPU). Target: test macro-F1 >= 0.80.

## Notes

- Raw photos, generated datasets, model weights, `.env` and MLflow runs are intentionally not committed (size, privacy, secrets).
- The raw Label Studio export cache can contain base64 photos; it lives under the git-ignored `Data_Pipeline/output/`.
- Do not reorder classes once labeling has started; class ids depend on the order.
- The FastAPI inference service is not written yet.
- Results are logged per version with `python Evaluate/log_to_mlflow.py --version vN --data-note "..."` (experiments `referee-one-stage` / `referee-two-stage`, models in the registry). Test numbers are only comparable within the same data split.
