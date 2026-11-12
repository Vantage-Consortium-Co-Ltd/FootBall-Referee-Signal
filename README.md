# Football Referee Signal

Recognise football referee hand signals (20 gesture classes) from photos/video using pose keypoints.
Pipeline: **pre-label with YOLO26-pose → review/relabel in Label Studio → train → evaluate → infer**.

> Status: data pre-labeling and Label Studio export are done. `Data_Pipeline/`, `Train/`, `Evaluate/`, `Inference/` are placeholders.

## Layout

```
Data_Preprocess/src/pre_Label.py            YOLO26-pose pre-labeling (+ Label Studio export in one run)
Data_Preprocess/src/export_to_label_studio.py   YOLO-pose labels -> Label Studio tasks, label config, class list
Data_Preprocess/output/                     generated output (git-ignored)
Data_Preprocess/src/Dataset/                raw photos (git-ignored)
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

## Notes

- Raw photos and generated labels are intentionally not committed (size, privacy).
- Split train/val by photo burst, not randomly per image, to avoid near-duplicate leakage.
- Converting the reviewed Label Studio export back to YOLO-pose labels for training is not written yet.
