"""Keypoint -> feature vector, shared by training, Evaluate and the API.

Input: COCO-17 keypoints as an array (17, 3) of (x, y, v), any coordinate units.
Output: 34 normalized coords + 17 visibility flags = 51 floats.
"""
import numpy as np

N_KPT = 17
KP_COLS = [f"kp{i}_{c}" for i in range(N_KPT) for c in "xyv"]
FEATURE_RECIPE = ("center on mid-hip (fallback mid-shoulder), divide by torso length "
                  "(mid-shoulder to mid-hip, 1.0 if degenerate), v=0 keypoints -> (0,0), "
                  "then 34 coords + 17 visibility flags (v>0)")


def _mid(kp, a, b):
    """Mean of the visible points among indices a, b; None if neither is visible."""
    pts = [kp[i, :2] for i in (a, b) if kp[i, 2] > 0]
    return np.mean(pts, axis=0) if pts else None


def kp_features(kp):
    kp = np.asarray(kp, dtype=float).reshape(N_KPT, 3)
    vis = kp[:, 2] > 0
    hip, sho = _mid(kp, 11, 12), _mid(kp, 5, 6)
    center = hip if hip is not None else sho if sho is not None else np.zeros(2)
    torso = np.linalg.norm(sho - hip) if hip is not None and sho is not None else 0.0
    scale = torso if torso > 1e-6 else 1.0  # shortcut: no shoulder-width fallback, upgrade if torso is often missing
    xy = np.where(vis[:, None], (kp[:, :2] - center) / scale, 0.0)
    return np.concatenate([xy.ravel(), vis.astype(float)])


def df_features(df):
    """DataFrame with keypoints.csv columns -> (n, 51) feature matrix."""
    arr = df[KP_COLS].to_numpy(dtype=float).reshape(len(df), N_KPT, 3)
    return np.stack([kp_features(k) for k in arr])
