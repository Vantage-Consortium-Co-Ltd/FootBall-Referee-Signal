#!/usr/bin/env python3
"""
Convert YOLO-Pose pre-labeled outputs into Label Studio Task JSON format with Pre-annotations.
Supports base64 embedding so users can directly drag-and-drop into Label Studio web UI.
"""
import argparse
import base64
import json
from pathlib import Path
import cv2

COCO_KEYPOINTS = [
    "Nose", "Left_Eye", "Right_Eye", "Left_Ear", "Right_Ear",
    "Left_Shoulder", "Right_Shoulder", "Left_Elbow", "Right_Elbow",
    "Left_Wrist", "Right_Wrist", "Left_Hip", "Right_Hip",
    "Left_Knee", "Right_Knee", "Left_Ankle", "Right_Ankle"
]

def imread_u(path):
    import numpy as np
    data = np.fromfile(str(path), dtype=np.uint8)
    return cv2.imdecode(data, cv2.IMREAD_COLOR) if data.size else None

# Referee signals; yellow + red card merged into "Card". Index = YOLO class id.
GESTURES = [
    "Referee", "Indirect_Free_Kick", "Direct_Free_Kick", "Card", "Play_On", "Penalty_Kick",
    "Offside", "Offside_Location", "Substitution", "Goal", "Disallowed_Goal", "Time_out",
    "Corner_Kick", "Jumping", "Obstruction", "Pushing", "Hand_Ball", "Elbowing", "Tripping", "Kicking",
]
HOTKEYS = "1234567890abcdefghij"  # one key per class: select a box, press the key to relabel it


def _box_label(box_names, cls_id):
    return box_names[cls_id] if box_names and cls_id < len(box_names) else GESTURES[0]


def write_label_config(path: Path, box_names=None):
    """Label Studio labeling interface matching the exported tasks (paste into Code tab)."""
    names = box_names or GESTURES
    box = "\n".join(f'    <Label value="{n}" hotkey="{HOTKEYS[i]}"/>' for i, n in enumerate(names[:len(HOTKEYS)]))
    kpt = "\n".join(f'    <Label value="{n}"/>' for n in COCO_KEYPOINTS)
    Path(path).write_text(
        '<View>\n  <Image name="image" value="$image"/>\n'
        f'  <RectangleLabels name="bbox" toName="image">\n{box}\n  </RectangleLabels>\n'
        f'  <KeypointLabels name="keypoints" toName="image">\n{kpt}\n  </KeypointLabels>\n'
        '</View>\n', encoding="utf-8")


def convert_to_label_studio(images_dir: Path, labels_dir: Path, output_file: Path,
                            embed_base64: bool = True, box_names=None, chunk: int = 0):
    tasks = []
    image_files = sorted([p for p in images_dir.glob("*") if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}])

    for img_path in image_files:
        img = imread_u(img_path)
        if img is None:
            continue
        h, w = img.shape[:2]

        label_path = labels_dir / f"{img_path.stem}.txt"
        predictions_result = []

        if label_path.exists():
            lines = label_path.read_text(encoding="utf-8").strip().splitlines()
            for pid, line in enumerate(lines):
                parts = line.strip().split()
                if len(parts) < 5:
                    continue
                cls_id = int(parts[0])
                xc, yc, bw, bh = map(float, parts[1:5])

                # 1. Bounding box prediction
                x_min = max(0.0, (xc - bw / 2.0) * 100.0)
                y_min = max(0.0, (yc - bh / 2.0) * 100.0)
                box_w = min(100.0 - x_min, bw * 100.0)
                box_h = min(100.0 - y_min, bh * 100.0)

                predictions_result.append({
                    "id": f"box_{pid}",
                    "original_width": w,
                    "original_height": h,
                    "image_rotation": 0,
                    "value": {
                        "x": round(x_min, 3),
                        "y": round(y_min, 3),
                        "width": round(box_w, 3),
                        "height": round(box_h, 3),
                        "rectanglelabels": [_box_label(box_names, cls_id)]
                    },
                    "from_name": "bbox",
                    "to_name": "image",
                    "type": "rectanglelabels"
                })

                # 2. Keypoints prediction
                kpt_parts = parts[5:]
                # Each keypoint has (x, y, v)
                for i in range(len(kpt_parts) // 3):
                    if i >= len(COCO_KEYPOINTS):
                        break
                    kx = float(kpt_parts[i * 3])
                    ky = float(kpt_parts[i * 3 + 1])
                    kv = float(kpt_parts[i * 3 + 2])

                    # kv > 0 means visible or labeled
                    if kv > 0 and (kx > 0 or ky > 0):
                        predictions_result.append({
                            "id": f"kpt_{pid}_{i}",
                            "original_width": w,
                            "original_height": h,
                            "image_rotation": 0,
                            "value": {
                                "x": round(kx * 100.0, 3),
                                "y": round(ky * 100.0, 3),
                                "width": 0.5,
                                "keypointlabels": [COCO_KEYPOINTS[i]]
                            },
                            "from_name": "keypoints",
                            "to_name": "image",
                            "type": "keypointlabels"
                        })

        if embed_base64:
            with open(img_path, "rb") as f:
                b64_data = base64.b64encode(f.read()).decode("utf-8")
            ext = img_path.suffix.lstrip(".").lower()
            if ext == "jpg": ext = "jpeg"
            img_uri = f"data:image/{ext};base64,{b64_data}"
        else:
            img_uri = img_path.name

        tasks.append({
            "data": {
                "image": img_uri,
                "file_name": img_path.name
            },
            "predictions": [
                {
                    "model_version": "yolo-pose",
                    "result": predictions_result
                }
            ] if predictions_result else []
        })

    # Label Studio rejects uploads over ~250MB, so base64 output is split into several files
    parts = [tasks[i:i + chunk] for i in range(0, len(tasks), chunk)] if chunk > 0 else [tasks]
    for n, part in enumerate(parts, 1):
        f_out = output_file if len(parts) == 1 else output_file.with_name(f"{output_file.stem}_{n:02d}{output_file.suffix}")
        with open(f_out, "w", encoding="utf-8") as f:
            json.dump(part, f, ensure_ascii=False)

    print(f"Successfully converted {len(tasks)} tasks into {len(parts)} file(s) at {output_file.parent}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--images", default="prelabel/images")
    parser.add_argument("--labels", default="prelabel/labels")
    parser.add_argument("--out", default="label_studio_tasks.json")
    parser.add_argument("--no-base64", action="store_true", help="Do not embed images as base64 (use filenames only)")
    parser.add_argument("--chunk", type=int, default=150, help="tasks per json file (0 = one file)")
    args = parser.parse_args()

    write_label_config(Path(args.out).with_name("label_config.xml"))
    convert_to_label_studio(
        Path(args.images),
        Path(args.labels),
        Path(args.out),
        embed_base64=not args.no_base64,
        chunk=args.chunk
    )
