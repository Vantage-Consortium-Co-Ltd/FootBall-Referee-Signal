"""Hand crop around a wrist + a rotation/scale-invariant descriptor of 21 hand landmarks (MediaPipe order)."""
import cv2
import numpy as np

FINGERS = {"index": 5, "middle": 9, "ring": 13, "pinky": 17}  # MCP index; pip = +1, dip = +2, tip = +3
FEATURE_NAMES = (["tip_to_wrist_" + f for f in ("thumb", *FINGERS)] + ["curl_" + f for f in FINGERS] +
                 ["pip_angle_" + f for f in FINGERS] + ["thumb_index_gap", "finger_spread", "mean_tip_to_wrist",
                                                         "mean_curl", "mean_pip_angle"])


def hand_crop(img, elbow, wrist, out_size=256, side_factor=1.1, shift=0.4):
    """Square crop centred a bit past the wrist along the forearm, clamped to the image. -> (crop, (x1, y1, x2, y2))."""
    e, w = np.asarray(elbow, float), np.asarray(wrist, float)
    fore = w - e
    centre = w + shift * fore
    side = max(side_factor * np.linalg.norm(fore), 24.0)
    h, wd = img.shape[:2]
    x1 = float(np.clip(centre[0] - side / 2, 0, max(wd - side, 0)))
    y1 = float(np.clip(centre[1] - side / 2, 0, max(h - side, 0)))
    box = (x1, y1, min(x1 + side, wd), min(y1 + side, h))
    c = img[int(box[1]):int(np.ceil(box[3])), int(box[0]):int(np.ceil(box[2]))]
    return cv2.resize(c, (out_size, out_size), interpolation=cv2.INTER_CUBIC), box


def _angle(a, b, c):
    """Angle at b between segments b->a and b->c (0 = folded back, pi = straight)."""
    u, v = a - b, c - b
    return float(np.arctan2(abs(u[0] * v[1] - u[1] * v[0]), u @ v))  # atan2: exact and scale-free (arccos is not)


def hand_descriptor(p):
    """(21, 2+) landmarks -> feature vector (see FEATURE_NAMES). Distances are in palm units (wrist -> middle MCP)."""
    p = np.asarray(p, float)[:, :2]
    palm = np.linalg.norm(p[9] - p[0]) + 1e-9
    tips = [4] + [m + 3 for m in FINGERS.values()]
    tip_wrist = [np.linalg.norm(p[t] - p[0]) / palm for t in tips]
    curl = [np.linalg.norm(p[m + 3] - p[m]) / (np.linalg.norm(p[m] - p[0]) + 1e-9) for m in FINGERS.values()]
    pip = [_angle(p[m], p[m + 1], p[m + 2]) for m in FINGERS.values()]
    gap = np.linalg.norm(p[4] - p[8]) / palm
    dirs = [(p[m + 3] - p[0]) / (np.linalg.norm(p[m + 3] - p[0]) + 1e-9) for m in FINGERS.values()]
    spread = float(np.arccos(np.clip(dirs[0] @ dirs[3], -1, 1)))  # index vs pinky direction
    return np.array(tip_wrist + curl + pip + [gap, spread, np.mean(tip_wrist[1:]), np.mean(curl), np.mean(pip)])


SIDES = [(7, 9), (8, 10)]  # COCO (elbow, wrist): left, right
N = 1 + len(FEATURE_NAMES)  # detected flag + descriptor, per hand


class Hands:
    """MediaPipe HandLandmarker on a wrist-forward crop. Imported lazily so the plain service never needs mediapipe."""

    def __init__(self, task_path):
        import mediapipe as mp
        from mediapipe.tasks import python as mpp
        from mediapipe.tasks.python import vision

        self.mp = mp
        self.det = vision.HandLandmarker.create_from_options(vision.HandLandmarkerOptions(
            base_options=mpp.BaseOptions(model_asset_path=str(task_path)), num_hands=1, min_hand_detection_confidence=0.15,
            min_hand_presence_confidence=0.15, running_mode=vision.RunningMode.IMAGE))

    def vector(self, bgr, kp_px, vis):
        """kp_px (17, 2) pixels, vis (17,) bool -> (2N,) = [detected, descriptor] for the left then right hand (NaN = unseen)."""
        v = np.full(2 * N, np.nan)
        for j, (e, w) in enumerate(SIDES):
            v[j * N] = 0
            if vis[e] and vis[w]:
                crop, _ = hand_crop(bgr, kp_px[e], kp_px[w])
                res = self.det.detect(self.mp.Image(image_format=self.mp.ImageFormat.SRGB, data=cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)))
                if res.hand_landmarks:
                    v[j * N:(j + 1) * N] = [1, *hand_descriptor([(p.x, p.y) for p in res.hand_landmarks[0]])]
        if not (v[0] == 1 or v[N] == 1):
            v[:] = np.nan  # no hand found at all: callers keep the YOLO answer
        return v
