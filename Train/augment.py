"""Keypoint-level augmentation for the two-stage classifier (no image files needed).

Per copy: random in-plane rotation, independent x/y stretch (mimics a lean / different viewpoint),
and small coordinate jitter. Missing keypoints (v=0) stay missing.
shortcut: rotation happens in normalized image coords, so it is slightly sheared for non-square photos;
fine for +-10 degrees, switch to pixel coords if larger angles are needed.
"""
import numpy as np
import pandas as pd

from features import KP_COLS


def augment(df, copies, rotate_deg, scale, jitter, seed):
    """Return `copies` perturbed duplicates of every row in df (df must hold KP_COLS)."""
    if copies <= 0 or df.empty:
        return df.iloc[0:0]
    rng = np.random.default_rng(seed)
    kp0 = df[KP_COLS].to_numpy(float).reshape(len(df), 17, 3)
    n, out = len(df), []
    vis = kp0[:, :, 2] > 0
    c = (kp0[:, :, :2] * vis[:, :, None]).sum(1) / np.maximum(vis.sum(1), 1)[:, None]  # centroid of visible pts
    for _ in range(copies):
        ang = np.deg2rad(rng.uniform(-rotate_deg, rotate_deg, n))[:, None]
        s = rng.uniform(scale[0], scale[1], (n, 1, 2))
        d = (kp0[:, :, :2] - c[:, None, :]) * s
        x, y = d[:, :, 0] * np.cos(ang) - d[:, :, 1] * np.sin(ang), d[:, :, 0] * np.sin(ang) + d[:, :, 1] * np.cos(ang)
        xy = np.stack([x, y], 2) + c[:, None, :] + rng.normal(0, jitter, (n, 17, 2))
        k = kp0.copy()
        k[:, :, :2] = np.where(vis[:, :, None], xy, 0.0)
        d2 = df.copy()
        d2[KP_COLS] = k.reshape(n, -1)
        out.append(d2)
    return pd.concat(out, ignore_index=True)
