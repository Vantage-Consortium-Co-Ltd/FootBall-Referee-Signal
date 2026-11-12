"""Self-test: python Data_Pipeline/test_pipeline.py  (synthetic export, no Label Studio needed)."""
import base64
import csv
import sys
import tempfile
from collections import defaultdict
from pathlib import Path

import cv2
import numpy as np
import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent))
import Process as m

CFG = {"seed": 42, "burst_seconds": 5, "split": {"train": 0.70, "val": 0.15, "test": 0.15},
       "flip_classes": ["Play_On", "Goal", "Card"]}
W, H = 40, 30


def data_uri(seed):
    img = np.random.RandomState(seed).randint(0, 255, (H, W, 3), np.uint8)
    img[:, : W // 2] = 0  # left half black so a flip is visible in pixels
    return "data:image/png;base64," + base64.b64encode(cv2.imencode(".png", img)[1].tobytes()).decode()


def box(label, x, y, w, h):
    return {"type": "rectanglelabels", "from_name": "bbox", "to_name": "image",
            "value": {"x": x, "y": y, "width": w, "height": h, "rectanglelabels": [label]}}


def kp(name, x, y):
    return {"type": "keypointlabels", "from_name": "keypoints", "to_name": "image",
            "value": {"x": x, "y": y, "width": 0.5, "keypointlabels": [name]}}


def task(tid, fname, result):
    return {"id": tid, "data": {"image": data_uri(tid), "file_name": fname},
            "annotations": [{"id": tid, "was_cancelled": False, "updated_at": "2026-11-12T10:00:00Z",
                             "result": result}],
            "predictions": [{"result": [box("Goal", 0, 0, 50, 50)]}]}  # must be ignored


def read_csv(p):
    return list(csv.DictReader(open(p, encoding="utf-8")))


# --- synthetic project: 4 classes x 10 bursts x 2 photos; 1 s apart inside a burst, 10 min between bursts ---
tasks, n = [], 0
for cls in ("Play_On", "Goal", "Corner_Kick", "Card"):
    for b in range(10):
        n += 1
        for k in range(2):
            sec = n * 600 + k
            ts = f"20261110_{sec // 3600:02d}{sec // 60 % 60:02d}{sec % 60:02d}"
            tasks.append(task(n * 10 + k, f"{ts}({k + 1}).jpg",
                              [box(cls, 10, 10, 40, 60), kp("Left_Wrist", 20, 30), kp("Nose", 30, 15)]))

# two people, one keypoint each, a stray keypoint outside every box, and a box with no gesture label
special = task(900, "special_nonts.jpg", [
    box("Play_On", 10, 20, 40, 60), box("Goal", 60, 20, 30, 60), box("Referee", 0, 0, 5, 5),
    kp("Left_Wrist", 20, 30), kp("Left_Eye", 70, 30), kp("Nose", 99, 99)])
special["annotations"][0]["result"][2]["value"]["rectanglelabels"] = []
tasks.append(special)

cancelled = task(901, "cancelled.jpg", [box("Goal", 0, 0, 50, 50)])
cancelled["annotations"][0]["was_cancelled"] = True
tasks.append(cancelled)
tasks.append({"id": 902, "data": {"image": data_uri(902)}, "annotations": [], "predictions": []})
two = task(903, "two_ann.jpg", [box("Goal", 0, 0, 50, 50)])
two["annotations"].append({"id": 904, "was_cancelled": False, "updated_at": "2026-11-13T10:00:00Z",
                           "result": [box("Card", 0, 0, 50, 50)]})  # newer annotation must win
tasks.append(two)

# --- conversion ---
persons, stray = m.result_to_persons(special["annotations"][0]["result"])
assert len(persons) == 2 and stray == 1, (len(persons), stray)  # unlabeled box skipped, outside kp counted
p0, p1 = persons
assert p0["cls"] == m.GESTURES.index("Play_On") and p1["cls"] == m.GESTURES.index("Goal")
assert np.allclose(p0["box"], (0.30, 0.50, 0.40, 0.60))
assert p0["kps"][9] == (0.20, 0.30, 2) and p0["kps"][1] == (0.0, 0.0, 0)  # Left_Wrist -> box 0
assert p1["kps"][1] == (0.70, 0.30, 2) and p1["kps"][9] == (0.0, 0.0, 0)  # Left_Eye -> box 1
line = m.label_line(p0).split()
assert len(line) == 5 + 17 * 3 and line[0] == "4"

# --- flip of one person ---
f = m.flip_person(p0)
assert np.allclose(f["box"], (0.70, 0.50, 0.40, 0.60))
assert f["kps"][10] == (0.80, 0.30, 2)  # Left_Wrist (9) -> Right_Wrist (10), x mirrored
assert f["kps"][9] == (0.0, 0.0, 0)     # left slot now empty (right wrist was missing)

# --- full run ---
with tempfile.TemporaryDirectory() as tmp:
    out = Path(tmp)
    res = m.build_dataset(tasks, CFG, out)
    ds = out / "dataset"
    assert res["stats"]["no_annotation"] == 2  # cancelled-only + empty annotation list

    man = read_csv(ds / "split_manifest.csv")
    two_row = next(r for r in man if r["image"] == "two_ann.jpg")
    assert int(two_row["class_id"]) == m.GESTURES.index("Card")  # latest annotation wins, prediction ignored
    assert not any(r["image"].startswith("cancelled") for r in man)

    # no group leakage; every split populated; flips only in train; bursts really grouped
    by_group = defaultdict(set)
    for r in man:
        by_group[r["group"]].add(r["split"])
    assert all(len(s) == 1 for s in by_group.values()), "group leaked across splits"
    assert {r["split"] for r in man} == {"train", "val", "test"}
    assert all(r["split"] == "train" for r in man if r["image"].endswith("_flip.jpg"))
    g_of = {r["image"]: r["group"] for r in man}
    real = [i for i in g_of if "_flip" not in i]
    assert len({g_of[i] for i in real if i[:8] == "20261110"}) == 40  # 40 bursts of 2 photos
    assert g_of["special_nonts.jpg"] not in {g for i, g in g_of.items() if not i.startswith("special_nonts")}  # own group
    for s in m.SPLITS:  # every label has an image; 5 + 17*3 columns per person
        for lab in (ds / "labels" / s).glob("*.txt"):
            assert (ds / "images" / s / f"{lab.stem}.jpg").exists()
            assert all(len(x.split()) == 56 for x in lab.read_text().splitlines())

    # classes outside flip_classes never flipped (but still present in train); listed ones flipped with mirrored pixels
    kpcsv = read_csv(ds / "keypoints.csv")
    assert not any(r["class_name"] == "Corner_Kick" and r["is_flip"] == "1" for r in kpcsv)
    assert any(r["class_name"] == "Corner_Kick" and r["split"] == "train" for r in kpcsv)
    assert any(r["class_name"] == "Play_On" and r["is_flip"] == "1" for r in kpcsv)
    fr = next(r for r in kpcsv if r["is_flip"] == "1" and r["class_name"] == "Play_On")
    orig = next(r for r in kpcsv if r["image"] == fr["image"].replace("_flip", ""))
    assert abs(float(fr["kp10_x"]) - (1 - float(orig["kp9_x"]))) < 1e-5 and fr["kp10_v"] == "2"
    assert abs(float(fr["kp0_x"]) - (1 - float(orig["kp0_x"]))) < 1e-5
    rd = lambda name: cv2.imdecode(np.fromfile(str(ds / "images" / "train" / name), np.uint8), 1)
    a, b = rd(orig["image"]), rd(fr["image"])
    assert a[:, : W // 2].mean() < a[:, W // 2:].mean() and b[:, : W // 2].mean() > b[:, W // 2:].mean()

    # data.yaml per contract
    y = yaml.safe_load((ds / "data.yaml").read_text(encoding="utf-8"))
    assert y["kpt_shape"] == [17, 3] and y["flip_idx"] == m.FLIP_IDX and len(y["names"]) == 20
    assert Path(y["path"]).is_absolute() and y["test"] == "images/test"

    # deterministic with fixed seed
    assert m.build_dataset(tasks, CFG, out)["split_of"] == res["split_of"]

print("ALL TESTS PASSED")
