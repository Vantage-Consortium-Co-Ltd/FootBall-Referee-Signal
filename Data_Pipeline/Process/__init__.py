"""Pipeline stages. Importing the package puts the repo root on sys.path (for Data_Preprocess)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from .build import FLIP_IDX, build_dataset, flip_person, label_line  # noqa: E402,F401
from .convert import GESTURES, result_to_persons  # noqa: E402,F401
from .labelstudio import fetch_export, load_env, make_fetcher  # noqa: E402,F401
from .split import SPLITS  # noqa: E402,F401
