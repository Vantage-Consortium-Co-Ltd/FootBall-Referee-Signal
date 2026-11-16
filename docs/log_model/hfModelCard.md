---
library_name: ultralytics
pipeline_tag: keypoint-detection
tags: [yolo, pose-estimation, football, referee, gesture-recognition]
base_model: Ultralytics/YOLO26
---

# Football-Acting-Detection-v1.0

Fine-tuned `yolo26n-pose` (2.9M parameters) that detects the referee and classifies one of **20 football referee signals**
per person, with 17 COCO keypoints.

Classes: Referee, Indirect_Free_Kick, Direct_Free_Kick, Card, Play_On, Penalty_Kick, Offside, Offside_Location,
Substitution, Goal, Disallowed_Goal, Time_out, Corner_Kick, Jumping, Obstruction, Pushing, Hand_Ball, Elbowing,
Tripping, Kicking.

```python
from ultralytics import YOLO
from huggingface_hub import hf_hub_download

model = YOLO(hf_hub_download("Kitkhachon/Football-Acting-Detection-v1.0", "best.pt"))
print(model.predict("photo.jpg")[0].summary())
```

## Training
`optimizer=auto`, `patience=100`, 100 epochs, imgsz 640, batch 16, seed 42 (`training/args.yaml`, `training/results.csv`).
Early stopping was not active; the saved checkpoint is the best epoch by validation fitness (epoch 37).

## Evaluation (held-out test split, 154 persons)
| macro F1 | weighted F1 | accuracy | pose mAP50-95 |
|---|---|---|---|
| 0.720 | 0.724 | 0.734 | 0.858 |

Details: `evaluation/`. Classes **Offside, Goal and Elbowing score F1 = 0** on this split.

## Limitations
- Small dataset (about 1,000 photos, roughly 3 photo bursts per class); per-class test sets have 4-15 samples, so scores are noisy.
- Splits were grouped by photo burst, not by person or scene; performance on new people/venues is likely lower than reported.
- Box mAP is inflated because ground-truth boxes came from YOLO pre-labeling.
- Not validated for any real match-officiating use.
