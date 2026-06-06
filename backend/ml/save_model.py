from __future__ import annotations

from pathlib import Path
from typing import Any

import joblib

from .config import MODEL_PATH, MODELS_DIR


def _ensure_models_dir() -> None:
    MODELS_DIR.mkdir(parents=True, exist_ok=True)


def save_model(model: Any, filename: str | None = None) -> Path:
    """
    Persist a trained model (typically a sklearn Pipeline) to disk.

    If `filename` is not provided, the default from config.MODEL_PATH is used.
    """
    _ensure_models_dir()

    if filename is None:
        path = MODEL_PATH
    else:
        path = MODELS_DIR / filename

    joblib.dump(model, path)
    return path


def load_model(path: str | Path | None = None) -> Any:
    """
    Load a previously saved model from disk.
    """
    if path is None:
        path = MODEL_PATH

    model_path = Path(path)
    if not model_path.exists():
        raise FileNotFoundError(f"Model file not found at {model_path}")

    return joblib.load(model_path)

