"""Refiner: YOLO names the class; if it is in a confusable group, hand features pick among the group."""
import numpy as np
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler


def fit_refiner_unfit():
    return make_pipeline(SimpleImputer(strategy="median"), StandardScaler(),
                         LogisticRegression(C=0.3, max_iter=3000, class_weight="balanced"))


def fit_refiner(X, y):
    return fit_refiner_unfit().fit(X, y)


def apply_refiner(label, conf, vec, model, group):
    """-> (label, confidence). Unchanged unless the label is in the group and a hand was seen; then the refiner's class and probability."""
    if label not in group or np.isnan(vec).all():
        return label, conf
    p = model.predict_proba(vec[None])[0]
    return str(model.classes_[p.argmax()]), round(float(p.max()), 4)


def cv_macro_f1(X, y, groups, folds=5):
    """Burst-grouped CV macro-F1 of the refiner (no burst is ever in both train and test)."""
    from sklearn.metrics import f1_score
    from sklearn.model_selection import GroupKFold, cross_val_predict

    pred = cross_val_predict(fit_refiner_unfit(), X, y, groups=groups, cv=GroupKFold(min(folds, len(set(groups)))))
    return float(f1_score(y, pred, average="macro"))
