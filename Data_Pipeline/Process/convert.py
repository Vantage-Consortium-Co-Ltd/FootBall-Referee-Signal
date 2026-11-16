"""Label Studio tasks -> persons (box + 17 keypoints) -> collected images."""
import re
from collections import Counter
from pathlib import Path

import cv2
import numpy as np

from Data_Preprocess.src.exportToLabelStudio import COCO_KEYPOINTS, GESTURES


def latest_annotation(task):
    """Newest non-cancelled annotation (predictions are ignored)."""
    anns = [a for a in task.get("annotations", []) if not a.get("was_cancelled")]
    return max(anns, key=lambda a: (a.get("updated_at") or a.get("created_at") or "", a.get("id", 0)), default=None)


def result_to_persons(result):
    """Rect + keypoint results (percent coords) -> [{cls, box(cx,cy,w,h), kps[17](x,y,v)}], n_stray_keypoints."""
    boxes, kpts = [], []
    for r in result:
        v = r.get("value", {})
        if r.get("type") == "rectanglelabels" and v.get("rectanglelabels"):
            if v["rectanglelabels"][0] in GESTURES:  # unlabeled / unknown label -> skipped
                boxes.append(v)
        elif r.get("type") == "keypointlabels" and v.get("keypointlabels"):
            if v["keypointlabels"][0] in COCO_KEYPOINTS:
                kpts.append(v)
    persons = [{"cls": GESTURES.index(b["rectanglelabels"][0]),
                "box": tuple(min(1.0, max(0.0, t / 100.0)) for t in
                             (b["x"] + b["width"] / 2, b["y"] + b["height"] / 2, b["width"], b["height"])),
                "kps": [(0.0, 0.0, 0)] * 17} for b in boxes]
    stray = 0
    for k in kpts:
        x, y = k["x"], k["y"]
        inside = [i for i, b in enumerate(boxes)
                  if b["x"] <= x <= b["x"] + b["width"] and b["y"] <= y <= b["y"] + b["height"]]
        if not inside:
            stray += 1
            continue
        i = min(inside, key=lambda i: boxes[i]["width"] * boxes[i]["height"])  # nested boxes: smallest wins
        persons[i]["kps"][COCO_KEYPOINTS.index(k["keypointlabels"][0])] = (x / 100.0, y / 100.0, 2)
    return persons, stray


def collect(tasks, fetch):
    """tasks -> [{name, img, persons}], stats Counter."""
    stats, used, items = Counter(), set(), []
    for t in tasks:
        ann = latest_annotation(t)
        if ann is None:
            stats["no_annotation"] += 1
            continue
        src = t.get("data", {}).get("image", "")
        raw = t["data"].get("file_name") or (Path(src.split("?")[0]).name if not src.startswith("data:") else "")
        name = re.sub(r"[^\w.-]", "_", Path(raw or f"task_{t.get('id')}").stem)
        if name in used:
            name += f"_t{t.get('id')}"
        persons, stray = result_to_persons(ann.get("result", []))
        stats["stray_keypoints"] += stray
        if not persons:
            stats["no_labeled_box"] += 1
            continue
        try:
            img = cv2.imdecode(np.frombuffer(fetch(src), np.uint8), cv2.IMREAD_COLOR)
        except Exception as e:  # network / bad source: skip the task, keep going
            print(f"  skip task {t.get('id')}: {e}")
            img = None
        if img is None:
            stats["image_failed"] += 1
            continue
        used.add(name)
        items.append({"name": name, "img": img, "persons": persons})
    return items, stats
