# Football Referee Signal

Recognise football referee hand signals (20 gesture classes) from photos/video using pose keypoints.
Pipeline: **pre-label with YOLO26-pose → review/relabel in Label Studio → train → evaluate → infer**.

> Status: pre-labeling, Data_Pipeline, Train and Evaluate (test-split evaluation + MLflow logging) are built. `Inference/` is a FastAPI service.
> Only synthetic-data self-tests have been run so far; the Label Studio API path is untested against a live server.

## Layout

```
Data_Preprocess/src/     preLabel.py (YOLO26-pose pre-labeling) + exportToLabelStudio.py
Data_Pipeline/           main.py (entry) + Process/ (labelStudio, convert, split, build)
Train/                   trainTwoStage.py, trainOneStage.py, trainRefiner.py, features.py, augment.py
Evaluate/                evaluateOneStage.py, evaluateTwoStage.py (test split)
Log_Model/               logToMlflow.py (versioned MLflow logging + registry), logToHf.py (upload to Hugging Face)
Inference/               main.py (run), app/ (service.py FastAPI, predict.py YOLO), modalApp.py (Modal deploy), testService.py
Inference_Refine/        copy of Inference/ + hand refiner for Goal/Substitution (port 8001), to be reviewed, then merged into Inference/
config/config.yaml       the ONE config: data_pipeline | train | log_model | inference | modal | refine sections
.env.example             copy to .env (git-ignored) and fill in secrets
```

## Setup

```bash
pip install -r requirements.txt
```

`yolo26n-pose.pt` is not in the repo; Ultralytics downloads it on first use, or put it next to `preLabel.py`.

## 1. Pre-label

Accepts JPG/PNG/WebP, HEIC (phone photos) and video (every Nth frame).

```bash
cd Data_Preprocess/src
python preLabel.py --src Dataset/<folder> --out ../output/prelabel
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
- Offline horizontal flip on **train only**, only for classes in `flip_classes` (`data_pipeline.flip_classes` in `config.yaml`); an image is flipped only if every person in it has such a class. Left/right keypoints are swapped.
- Output in `Data_Pipeline/output/dataset/` (git-ignored): `images/`, `labels/`, `data.yaml`, `keypoints.csv`, `split_manifest.csv`.

## 4. Train

See `Train/README.md`. Two approaches are compared: a two-stage keypoint classifier (CPU, grouped CV, keypoint augmentation, MLflow) and a one-stage YOLO-pose fine-tune (Colab GPU). Target: test macro-F1 >= 0.80.

## Notes

- Raw photos, generated datasets, model weights, `.env` and MLflow runs are intentionally not committed (size, privacy, secrets).
- The raw Label Studio export cache can contain base64 photos; it lives under the git-ignored `Data_Pipeline/output/`.
- Do not reorder classes once labeling has started; class ids depend on the order.
- Inference: `python Inference/main.py` -> http://127.0.0.1:8000 (`/docs`; `POST /predict/image`, `POST /predict/video`, `WS /ws/webcam`). Model path and thresholds: `inference:` in `config.yaml`. Check: `python Inference/testService.py`. Auth: header `X-API-Key` when `FOOTBALL_API_KEY` is set (in `.env` locally, as a Modal Secret in the cloud).
- Deploy on Modal (free tier): `modal setup`; `modal secret create football-signal-api-key FOOTBALL_API_KEY=<key>`; `modal deploy Inference/modalApp.py` (settings: `modal:` in `config/config.yaml`).
- Results are logged per version with `python Log_Model/logToMlflow.py --version vN --data-note "..."` (paths in `log_model:` of `config/config.yaml`; `logToHf.py` uploads the weights to the Hub) (experiments `referee-one-stage` / `referee-two-stage`, models in the registry). Test numbers are only comparable within the same data split.
- Hand refiner (Goal vs Substitution): the body keypoints cannot tell an open hand from a fist, so `Inference_Refine/` adds a second step to the same service: when YOLO answers a class in `refine.groups`, the hands are cropped from the same image, MediaPipe reads them and a logistic regression picks the class among the group (response unchanged: `{label, confidence}`). Fit it per model version with `python Train/trainRefiner.py [--tag v3-notflip --dataset <dir>]` (train+val only, burst-grouped CV score in `meta.json`, logged to MLflow experiment `referee-refiner`); run it with `python Inference_Refine/main.py` (port 8001) and check it with `python Inference_Refine/testService.py`. Needs `pip install -r Inference_Refine/requirements.txt`. Test macro-F1, YOLO only -> with refiner: v1 0.720 -> 0.800, v3 notflip 0.783 -> 0.907, v3 cutbyclass 0.627 -> 0.627 (YOLO answers Tripping there, outside the group). Only 12-20 Goal/Substitution persons per test split, so treat these as early evidence. `refine.enabled: false` gives plain YOLO.
