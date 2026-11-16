# Referee Signal — Pipeline Design (2026-11-12)

Goal: classify 20 football referee gestures from photos, compare two approaches, serve the best via an API.
Deadline: ~2 weeks. Team builds the frontend. Target: test macro-F1 >= 0.80.

## Decisions (user)
- Source: Label Studio **project 7** via API (`LS_URL`, `LS_TOKEN`, `LS_PROJECT_IDS=7` in `.env`). Only tasks with a submitted (non-cancelled) annotation.
- Classes: the 20 in `GESTURES` (`Data_Preprocess/src/exportToLabelStudio.py`), id order fixed. Class 0 `Referee` = "no gesture", kept as a real class.
- Split: 70/15/15, stratified by class, **grouped by burst** (photos whose filename timestamps are within a few seconds), fixed seed.
- Augmentation: **offline horizontal flip, train split only**, mirror image + swap L/R keypoints (`FLIP_IDX` in `preLabel.py`). **Not flipped:** `Corner_Kick`, `Direct_Free_Kick`, `Indirect_Free_Kick`, `Offside_Location`. Ultralytics `fliplr=0`.
- Approaches (both, compared):
  - **Two-stage** (local CPU): keypoints -> normalize (center on mid-hip, scale by torso length) -> compare LogisticRegression, RandomForest, MLP (sklearn); pick best val macro-F1.
  - **One-stage** (Colab GPU): fine-tune `yolo26n-pose`, gesture = box class.
- Tracking: MLflow (local) for params/metrics/confusion matrix; best model pushed to Hugging Face Hub (private, builder's call).
- Evaluation (later phase): confusion matrix PNG, per-class P/R/F1, macro + weighted F1, accuracy on test.
- Inference (later phase): FastAPI `POST /predict` (one image -> `[{bbox, keypoints, gesture, confidence}]`), `GET /health`, CORS open, auto-loads the approach with higher test macro-F1.
- Env: existing anaconda3 Python (pip is broken; packages installed to a side folder).

## Interface contract between Data_Pipeline and Train
Data_Pipeline writes `Data_Pipeline/output/dataset/`:
- `images/{train,val,test}/`, `labels/{train,val,test}/` — YOLO-pose txt: `cls cx cy w h` + 17 x `(x y v)`, all normalized 0..1. Flipped copies in train only, suffix `_flip`.
- `data.yaml` — `path` (absolute), `train/val/test`, `kpt_shape: [17, 3]`, `flip_idx`, `names` (20).
- `keypoints.csv` — one row per labeled person: `image, split, group, class_id, class_name, is_flip, kp{0..16}_{x,y,v}` (normalized image coords, raw — Train does the normalization).
- `split_manifest.csv` — `image, group, split, class_id`.

## Phases
1. Data_Pipeline (now) 2. Train (now) 3. Evaluate 4. Inference API.
