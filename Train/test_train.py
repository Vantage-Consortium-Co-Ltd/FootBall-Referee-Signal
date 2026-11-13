"""Self-check: python Train/test_train.py (synthetic data, writes to a temp dir)."""
import json
import sys
import tempfile
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).parent))
from augment import augment
from features import KP_COLS, kp_features
from train_two_stage import train

NAMES = ["Referee", "Play_On", "Goal"]


def person(rng, c):
    base = rng.uniform(0.2, 0.8, (17, 2)) * 0 + np.linspace(0.3, 0.7, 17)[:, None] * [1, 1.5]
    base[:, 0] += c * 0.15            # class-dependent pose
    base[9:11, 1] -= c * 0.2          # wrists raised for higher classes
    kp = np.c_[base + rng.normal(0, 0.01, (17, 2)), np.full(17, 2.0)]
    kp[rng.integers(0, 17), 2] = 0    # one missing keypoint
    kp[kp[:, 2] == 0, :2] = 0
    return kp


def make_csv(path):
    rng = np.random.default_rng(0)
    rows = []
    for split, n in [("train", 20), ("val", 8), ("test", 8)]:
        for c, name in enumerate(NAMES):
            for i in range(n):
                rows.append([f"{split}_{c}_{i}.jpg", split, f"g{c}_{i}", c, name, False, *person(rng, c).ravel()])
    pd.DataFrame(rows, columns=["image", "split", "group", "class_id", "class_name", "is_flip", *KP_COLS]).to_csv(path, index=False)


def test_features_invariant():
    kp = person(np.random.default_rng(1), 1)
    kp[:, 2] = 2
    moved = kp.copy()
    moved[:, :2] = kp[:, :2] * 3.7 + [0.2, -0.1]
    assert np.allclose(kp_features(kp), kp_features(moved)), "not translation/scale invariant"
    assert kp_features(np.zeros((17, 3))).shape == (51,) and np.isfinite(kp_features(np.zeros((17, 3)))).all()


def test_augment():
    with tempfile.TemporaryDirectory() as d:
        make_csv(Path(d) / "k.csv")
        df = pd.read_csv(Path(d) / "k.csv").head(10)
    a = augment(df, 3, 10, [0.9, 1.1], 0.005, seed=1)
    assert len(a) == 30 and list(a.columns) == list(df.columns)
    k0, k1 = df[KP_COLS].to_numpy().reshape(-1, 17, 3), a[KP_COLS].to_numpy().reshape(-1, 17, 3)[:10]
    assert (k0[:, :, 2] == k1[:, :, 2]).all() and (k1[k0[:, :, 2] == 0][:, :2] == 0).all()  # v kept, missing stays 0
    assert not np.allclose(k0, k1) and np.abs(k0[:, :, :2] - k1[:, :, :2]).max() < 0.2     # perturbed but close
    assert len(augment(df, 0, 10, [0.9, 1.1], 0.005, 1)) == 0


def test_train():
    with tempfile.TemporaryDirectory() as d:
        csv, out = Path(d) / "keypoints.csv", Path(d) / "model"
        make_csv(csv)
        grids = {"logreg": {"C": [0.1, 1]}, "mlp": {"hidden_layer_sizes": [[16], [32]]}}
        cfg = {"two_stage": grids, "cv": {"folds": 3},
               "augment": {"copies": 2, "rotate_deg": 10, "scale": [0.9, 1.1], "jitter": 0.005}}
        train(csv, out, mlruns=Path(d) / "mlruns", cfg=cfg)
        assert (out / "model.joblib").exists()
        meta = json.loads((out / "meta.json").read_text())
        assert meta["class_names"] == NAMES and meta["cv_macro_f1"] > 0.5, meta
        assert meta["n_trials"] == 4 and meta["model"] in grids, meta


if __name__ == "__main__":
    test_features_invariant()
    test_augment()
    test_train()
    print("OK")
