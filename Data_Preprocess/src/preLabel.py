#!/usr/bin/env python3
"""
Pre-label images / videos with YOLO26-pose (Ultralytics).

Outputs (under --out):
  images/          frames or copied images
  labels/          YOLO-pose txt:  cls xc yc w h  x1 y1 v1 ... x17 y17 v17  (normalized)
  preview/         overlay images of items flagged "needs_review"
  keypoints.csv    one row per person: pixel keypoints + heuristic pre_label + needs_review
  data.yaml        dataset yaml for Ultralytics pose training
  label_studio_tasks.json + label_config.xml   ready to import into Label Studio (json is split into parts)

Usage (one command does pre-label AND the Label Studio export):
  pip install ultralytics pillow-heif
  python preLabel.py --src ./photos --out ./prelabel
  python preLabel.py --src ./photos --out ./prelabel --fall-heuristic --device 0

Label Studio: create project -> Labeling Interface -> Code -> paste label_config.xml
-> Import -> drop label_studio_tasks.json. Review/fix, and only after that split train/val.
"""
import argparse
import csv
import math
import random
from pathlib import Path

import cv2
import numpy as np
from ultralytics import YOLO

from Data_Preprocess.src.exportToLabelStudio import GESTURES, convert_to_label_studio, write_label_config

IMG_EXT = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
HEIC_EXT = {".heic", ".heif"}  # phone photos; cv2 cannot decode these
VID_EXT = {".mp4", ".avi", ".mov", ".mkv", ".webm"}

# COCO-17 indices
L_SH, R_SH, L_HIP, R_HIP = 5, 6, 11, 12
FLIP_IDX = [0, 2, 1, 4, 3, 6, 5, 8, 7, 10, 9, 12, 11, 14, 13, 16, 15]


def imread_u(path):
    """cv2.imread that works with Thai / non-ASCII paths on Windows, plus HEIC."""
    if Path(path).suffix.lower() in HEIC_EXT:
        import pillow_heif
        from PIL import Image, ImageOps
        pillow_heif.register_heif_opener()
        im = ImageOps.exif_transpose(Image.open(path)).convert("RGB")  # keep phone rotation
        return cv2.cvtColor(np.array(im), cv2.COLOR_RGB2BGR)
    data = np.fromfile(str(path), dtype=np.uint8)
    return cv2.imdecode(data, cv2.IMREAD_COLOR) if data.size else None


def imwrite_u(path, img):
    """cv2.imwrite that works with Thai / non-ASCII paths on Windows."""
    ok, buf = cv2.imencode(Path(path).suffix or ".jpg", img)
    if ok:
        buf.tofile(str(path))
    return ok


def iter_inputs(src: Path, step: int):
    """Yield (name, bgr_image)."""
    files = [src] if src.is_file() else sorted(p for p in src.rglob("*") if p.is_file())
    for p in files:
        ext = p.suffix.lower()
        if ext in IMG_EXT | HEIC_EXT:
            img = imread_u(p)
            if img is not None:
                yield p.stem, img
        elif ext in VID_EXT:
            cap = cv2.VideoCapture(str(p))
            i = 0
            while True:
                ok, frame = cap.read()
                if not ok:
                    break
                if i % step == 0:
                    yield f"{p.stem}_f{i:06d}", frame
                i += 1
            cap.release()


def fall_heuristic(kxy_px, kvis, box_wh_px):
    """Very rough rule-based pre-label: 0 = normal, 1 = fall_candidate, -1 = unknown.
    Only a starting point for human review - NOT ground truth."""
    w, h = box_wh_px
    aspect = w / max(h, 1e-6)
    need = [L_SH, R_SH, L_HIP, R_HIP]
    if not all(kvis[i] for i in need):
        # fall back to bbox shape only
        return (1 if aspect > 1.3 else 0), aspect, float("nan")
    sh = (kxy_px[L_SH] + kxy_px[R_SH]) / 2
    hip = (kxy_px[L_HIP] + kxy_px[R_HIP]) / 2
    dx, dy = abs(sh[0] - hip[0]), abs(sh[1] - hip[1])
    angle = math.degrees(math.atan2(dx, dy + 1e-6))  # 0 = upright, 90 = horizontal
    if angle > 60 or aspect > 1.3:
        return 1, aspect, angle
    if angle < 35 and aspect < 0.9:
        return 0, aspect, angle
    return -1, aspect, angle  # ambiguous -> review


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True, help="image/video file or folder")
    ap.add_argument("--out", default="prelabel")
    ap.add_argument("--model", default="yolo26n-pose.pt")  # try yolo26s/m-pose for better recall
    ap.add_argument("--imgsz", type=int, default=640)
    ap.add_argument("--conf", type=float, default=0.35, help="person box conf")
    ap.add_argument("--kpt-conf", type=float, default=0.5, help="keypoint visibility threshold")
    ap.add_argument("--review-conf", type=float, default=0.6, help="below this => needs_review")
    ap.add_argument("--min-vis", type=int, default=8, help="fewer visible kpts => needs_review")
    ap.add_argument("--max-persons", type=int, default=5)
    ap.add_argument("--step", type=int, default=5, help="take every N-th video frame")
    ap.add_argument("--device", default=None)
    ap.add_argument("--cls", type=int, default=0, help="initial class id (0=Referee) before you relabel in Label Studio")
    ap.add_argument("--fall-heuristic", action="store_true",
                    help="class 0=normal 1=fall (rule-based, ambiguous ones default to 0 & flagged)")
    ap.add_argument("--max-side", type=int, default=1280,
                    help="downscale saved images (keeps Label Studio file small); labels are normalized")
    ap.add_argument("--chunk", type=int, default=150, help="tasks per Label Studio json (upload limit ~250MB)")
    ap.add_argument("--no-base64", action="store_true",
                    help="Label Studio json refers to file names instead of embedding images")
    ap.add_argument("--keep-empty", action="store_true", help="also save frames with no person")
    ap.add_argument("--preview-all", action="store_true", help="save overlay for every frame")
    args = ap.parse_args()

    out = Path(args.out)
    for d in ("images", "labels", "preview"):
        (out / d).mkdir(parents=True, exist_ok=True)

    model = YOLO(args.model)
    rows, n_img, n_review = [], 0, 0

    for name, img in iter_inputs(Path(args.src), args.step):
        scale = args.max_side / max(img.shape[:2])
        if scale < 1:
            img = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
        H, W = img.shape[:2]
        r = model.predict(img, imgsz=args.imgsz, conf=args.conf,
                          device=args.device, verbose=False)[0]

        persons = []
        if r.boxes is not None and len(r.boxes) > 0:
            boxes = r.boxes.xywhn.cpu().numpy()          # (N,4) normalized
            bconf = r.boxes.conf.cpu().numpy()           # (N,)
            kxyn = r.keypoints.xyn.cpu().numpy()         # (N,17,2) normalized
            kcf = (r.keypoints.conf.cpu().numpy()
                   if r.keypoints.conf is not None else np.ones(kxyn.shape[:2]))
            order = np.argsort(-bconf)[: args.max_persons]
            for i in order:
                persons.append((boxes[i], float(bconf[i]), kxyn[i], kcf[i]))

        if not persons and not args.keep_empty:
            continue

        lines, frame_review = [], False
        for pid, (box, bc, kxyn, kcf) in enumerate(persons):
            vis = kcf >= args.kpt_conf
            # a keypoint at exact (0,0) means "not predicted"
            vis &= ~((kxyn[:, 0] == 0) & (kxyn[:, 1] == 0))
            kpx = kxyn * np.array([W, H])
            cls, aspect, angle, tag = args.cls, float("nan"), float("nan"), ""
            ambiguous = False
            if args.fall_heuristic:
                res, aspect, angle = fall_heuristic(kpx, vis, (box[2] * W, box[3] * H))
                ambiguous = res == -1
                cls = 1 if res == 1 else 0
                tag = {1: "fall_candidate", 0: "normal", -1: "ambiguous"}[res]

            review = bc < args.review_conf or int(vis.sum()) < args.min_vis or ambiguous
            frame_review |= review

            parts = [str(cls)] + [f"{v:.6f}" for v in box]
            for (x, y), v in zip(kxyn, vis):
                parts += [f"{x:.6f}", f"{y:.6f}", "2"] if v else ["0.000000", "0.000000", "0"]
            lines.append(" ".join(parts))

            rows.append({
                "image": f"{name}.jpg", "person": pid, "box_conf": round(bc, 3),
                "n_visible_kpts": int(vis.sum()), "class": cls, "pre_label": tag,
                "aspect_w_h": round(aspect, 3), "torso_angle": round(angle, 1),
                "needs_review": int(review),
                **{f"k{j}_{a}": round(float(kpx[j][b]), 1) if vis[j] else ""
                   for j in range(17) for a, b in (("x", 0), ("y", 1))},
                **{f"k{j}_c": round(float(kcf[j]), 3) for j in range(17)},
            })

        # save image + label (same stem)
        imwrite_u(out / "images" / f"{name}.jpg", img)
        (out / "labels" / f"{name}.txt").write_text(
            "\n".join(lines) + ("\n" if lines else ""), encoding="utf-8")

        if frame_review or args.preview_all:
            imwrite_u(out / "preview" / f"{name}.jpg", r.plot(boxes=False, labels=False))
        n_img += 1
        n_review += int(frame_review)

    if rows:
        # utf-8-sig: Windows default is cp1252 (fails on Thai names); BOM lets Excel read Thai
        with open(out / "keypoints.csv", "w", newline="", encoding="utf-8-sig") as f:
            w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
            w.writeheader()
            w.writerows(rows)

    names = "\n".join(f"  {i}: {n}" for i, n in enumerate(["normal", "fall"] if args.fall_heuristic else GESTURES))
    (out / "data.yaml").write_text(
        f"path: {out.resolve().as_posix()}\ntrain: images   # split train/val AFTER review\nval: images\n"
        f"kpt_shape: [17, 3]\nflip_idx: {FLIP_IDX}\nnames:\n{names}\n", encoding="utf-8")

    box_names = ["normal", "fall"] if args.fall_heuristic else GESTURES
    convert_to_label_studio(out / "images", out / "labels", out / "label_studio_tasks.json",
                            embed_base64=not args.no_base64, box_names=box_names, chunk=args.chunk)
    write_label_config(out / "label_config.xml", box_names=box_names)

    print(f"saved {n_img} images, {len(rows)} persons, {n_review} images flagged for review -> {out}")


if __name__ == "__main__":
    random.seed(0)
    main()