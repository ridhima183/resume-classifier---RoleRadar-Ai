from __future__ import annotations

from typing import Dict, Tuple

import numpy as np

from .save_model import load_model


def predict_resume_with_probs(resume_text: str) -> Tuple[str, float, Dict[str, float]]:
    """
    Predict job role and return all class probabilities for charts.

    Returns:
        predicted_job_role, confidence_score, role_probabilities (role -> %)
    """
    if not isinstance(resume_text, str):
        raise TypeError("resume_text must be a string.")
    model = load_model()
    probs = model.predict_proba([resume_text])[0]
    classes = model.classes_
    idx = int(np.argmax(probs))
    role = classes[idx]
    conf = float(probs[idx] * 100.0)
    role_probs = {c: round(float(p * 100.0), 2) for c, p in zip(classes, probs)}
    return role, conf, role_probs


def predict_resume(resume_text: str) -> Tuple[str, float]:
    """
    Predict the most likely job role from raw resume text.

    Returns:
        predicted_job_role: str
        confidence_score: float (percentage, 0–100)
    """
    role, conf, _ = predict_resume_with_probs(resume_text)
    return role, conf


def confidence_label(confidence_score: float) -> str:
    """
    Human-readable label for a confidence percentage.
    """
    if confidence_score >= 85:
        return "Very High"
    if confidence_score >= 70:
        return "High"
    if confidence_score >= 50:
        return "Moderate"
    return "Low"

