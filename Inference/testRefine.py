"""Self-check of the refine step (no YOLO needed): python Inference/testRefine.py"""
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from app.refine import apply_refiner, cv_macro_f1, fit_refiner  # noqa: E402

rng = np.random.RandomState(0)
X = np.r_[rng.normal(0, .1, (20, 3)), rng.normal(3, .1, (20, 3))]
model = fit_refiner(X, np.array(["Goal"] * 20 + ["Substitution"] * 20))
group = ["Goal", "Substitution"]

lab, conf = apply_refiner("Goal", 0.9, np.full(3, 3.0), model, group)  # hand says Substitution -> overrides YOLO
assert lab == "Substitution" and 0.5 < conf <= 1, (lab, conf)
assert apply_refiner("Tripping", 0.8, np.full(3, 3.0), model, group) == ("Tripping", 0.8)  # outside the group
assert apply_refiner("Goal", 0.9, np.full(3, np.nan), model, group) == ("Goal", 0.9)  # no hand found
assert apply_refiner("Goal", 0.9, np.full(3, 0.0), model, group)[0] == "Goal"
print("testRefine ok")

groups = np.repeat(np.arange(10), 4)  # 10 bursts of 4 persons; classes alternate by burst
y = np.array(["Goal", "Substitution"] * 5).repeat(4)
Xs = np.where((y == "Goal")[:, None], 0.0, 3.0) + rng.normal(0, .1, (40, 3))
assert cv_macro_f1(Xs, y, groups) > 0.95  # separable: bursts held out still classified
assert cv_macro_f1(rng.normal(0, 1, (40, 3)), y, groups) < 0.8  # noise: no free lunch
print("cv ok")
