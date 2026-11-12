"""Flip augmentation and writing the YOLO-pose dataset."""
import csv
import shutil
from collections import Counter
from pathlib import Path

import cv2

from Data_Preprocess.src.export_to_label_studio import GESTURES

from .convert import collect
from .labelstudio import make_fetcher
from .split import SPLITS, burst_groups, split_groups

# Same as Data_Preprocess/src/pre_Label.py FLIP_IDX; copied because pre_Label imports ultralytics at module level.
FLIP_IDX = [0, 2, 1, 4, 3, 6, 5, 8, 7, 10, 9, 12, 11, 14, 13, 16, 15]


def imwrite_u(path, img):
    """cv2.imwrite that survives Thai / non-ASCII Windows paths."""
    ok, buf = cv2.imencode(Path(path).suffix or ".jpg", img)
    if ok:
        buf.tofile(str(path))
    return ok


def flip_person(p):
    cx, cy, w, h = p["box"]
    kps = [(1 - x, y, v) if v else (0.0, 0.0, 0) for x, y, v in p["kps"]]
    return {"cls": p["cls"], "box": (1 - cx, cy, w, h), "kps": [kps[i] for i in FLIP_IDX]}


def label_line(p):
    return " ".join([str(p["cls"])] + [f"{v:.6f}" for v in p["box"]] +
                    [f"{x:.6f} {y:.6f} {int(v)}" for x, y, v in p["kps"]])


def build_dataset(tasks, cfg, out_dir: Path, fetch=None):
    """Full conversion. Returns summary dict (counts per split/class, stats)."""
    items, stats = collect(tasks, fetch or make_fetcher())
    if not items:
        raise SystemExit(f"no usable tasks: {dict(stats)}")
    flip = {GESTURES.index(n) for n in cfg["flip_classes"]}
    group = burst_groups([i["name"] for i in items], cfg["burst_seconds"])
    counts = {}
    for i in items:
        c = counts.setdefault(group[i["name"]], Counter())
        c["_img"] += 1
        c.update(p["cls"] for p in i["persons"])
    split_of = split_groups(counts, cfg["split"], cfg["seed"])
    cls_total = Counter(p["cls"] for i in items for p in i["persons"])

    ds = out_dir / "dataset"
    if ds.exists():
        assert ds.name == "dataset"
        shutil.rmtree(ds)  # generated folder: rebuild from scratch so stale files never leak across splits
    for kind in ("images", "labels"):
        for s in SPLITS:
            (ds / kind / s).mkdir(parents=True)

    kp_rows, man_rows = [], []
    per_split = {s: Counter() for s in SPLITS}
    n_flip = Counter()

    def emit(name, img, persons, split, grp, is_flip):
        imwrite_u(ds / "images" / split / f"{name}.jpg", img)
        (ds / "labels" / split / f"{name}.txt").write_text(
            "\n".join(label_line(p) for p in persons) + "\n", encoding="utf-8")
        img_cls = min((p["cls"] for p in persons), key=lambda c: cls_total[c])  # image class = its rarest class
        man_rows.append({"image": f"{name}.jpg", "group": grp, "split": split, "class_id": img_cls})
        for p in persons:
            row = {"image": f"{name}.jpg", "split": split, "group": grp, "class_id": p["cls"],
                   "class_name": GESTURES[p["cls"]], "is_flip": int(is_flip)}
            for j, (x, y, v) in enumerate(p["kps"]):
                row.update({f"kp{j}_x": round(x, 6), f"kp{j}_y": round(y, 6), f"kp{j}_v": int(v)})
            kp_rows.append(row)
            (n_flip if is_flip else per_split[split])[p["cls"]] += 1

    for i in items:
        g = group[i["name"]]
        s = split_of[g]
        emit(i["name"], i["img"], i["persons"], s, g, False)
        # flip train only; an image is flipped only if every person in it has a class listed in flip_classes
        if s == "train" and all(p["cls"] in flip for p in i["persons"]):
            emit(i["name"] + "_flip", cv2.flip(i["img"], 1), [flip_person(p) for p in i["persons"]], s, g, True)

    for fname, rows in (("keypoints.csv", kp_rows), ("split_manifest.csv", man_rows)):
        with open(ds / fname, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
            w.writeheader()
            w.writerows(rows)

    names = "\n".join(f"  {i}: {n}" for i, n in enumerate(GESTURES))
    (ds / "data.yaml").write_text(
        f"path: {ds.resolve().as_posix()}\ntrain: images/train\nval: images/val\ntest: images/test\n"
        f"kpt_shape: [17, 3]\nflip_idx: {FLIP_IDX}\n"
        "# Train with fliplr=0: horizontal flips are already baked into train (images ending _flip), only for\n"
        "# classes listed in flip_classes (see Data_Pipeline/config/config.yaml).\n"
        f"names:\n{names}\n", encoding="utf-8")

    print_summary(per_split, n_flip, stats, len(items))
    return {"per_split": per_split, "n_flip": n_flip, "stats": stats, "group": group, "split_of": split_of}


def print_summary(per_split, n_flip, stats, n_img):
    print(f"\n{n_img} images used; skipped/other: {dict(stats)}")
    print(f"{'class':<20}{'train':>7}{'val':>6}{'test':>6}{'+flip':>7}")
    for c, n in enumerate(GESTURES):
        if any(per_split[s][c] for s in SPLITS):
            print(f"{n:<20}{per_split['train'][c]:>7}{per_split['val'][c]:>6}{per_split['test'][c]:>6}{n_flip[c]:>7}")
            if not per_split["val"][c] or not per_split["test"][c]:
                print(f"  WARNING: {n} has no samples in val or test (too few bursts)")
    print(f"{'TOTAL':<20}" + "".join(f"{sum(per_split[s].values()):>{w}}" for s, w in zip(SPLITS, (7, 6, 6)))
          + f"{sum(n_flip.values()):>7}")
