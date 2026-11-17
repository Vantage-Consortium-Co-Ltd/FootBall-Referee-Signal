# Inference_Refine

Copy of `Inference/` (same endpoints, same `{label, confidence}` response) with one extra step: when YOLO answers a class in `refine.groups`
(default Goal, Substitution), the hands are cropped from the same image, MediaPipe reads 21 landmarks, and a logistic regression picks the class
among the group. No hand found or class outside the group = the YOLO answer is returned unchanged. Review here, then merge into `Inference/`.

All settings: `refine:` section of `config/config.yaml` (`enabled: false` gives plain YOLO).

```
pip install -r Inference_Refine/requirements.txt       # mediapipe, scikit-learn, joblib (on top of the main requirements)
python Train/trainRefiner.py [--tag v3-notflip --dataset <dir>]   # fit on train+val, grouped-CV score in meta.json, logged to MLflow (referee-refiner)
python Inference_Refine/testRefine.py                  # refine logic only
python Inference_Refine/testService.py                 # real model: schema, auth, websocket, refine on vs off
python Inference_Refine/main.py                        # http://127.0.0.1:8001/docs
modal deploy Inference_Refine/modalApp.py              # separate Modal app (refine.modal_app_name), needs the refiner file from the step above
```

Merging into `Inference/`: move `app/handFeatures.py`, `app/refine.py`, the `Detector` changes, and `loadUtils` refine overlay; drop this folder.
`refine.dataset` must be the dataset of `inference.model_path`; retrain the refiner when the YOLO weights change.
