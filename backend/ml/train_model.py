from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Tuple

import seaborn as sns  # noqa: F401  # kept for compatibility with original plots
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import RandomForestClassifier
from sklearn.naive_bayes import MultinomialNB
from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import label_binarize
from sklearn.svm import LinearSVC

from .config import MODELS_DIR, RANDOM_STATE, TEST_SIZE
from .evaluate_model import evaluate_classifier, plot_roc_comparison
from .feature_extraction import build_tfidf_vectorizer
from .preprocessing import prepare_training_data
from .save_model import save_model


def _build_models() -> Dict[str, CalibratedClassifierCV]:
    """
    Create the dictionary of core classifiers wrapped with probability calibration.

    Algorithms:
        - Naive Bayes (MultinomialNB)
        - Support Vector Machine (LinearSVC)
        - Random Forest
    """
    return {
        "Naive Bayes": CalibratedClassifierCV(
            MultinomialNB(),
            method="sigmoid",
        ),
        "Random Forest": CalibratedClassifierCV(
            RandomForestClassifier(n_estimators=20, random_state=RANDOM_STATE),
            method="sigmoid",
        ),
        "Linear SVM": CalibratedClassifierCV(
            LinearSVC(),
            method="sigmoid",
        ),
    }


def train_and_select_best_model(headless: bool = False) -> Tuple[object, str, Dict[str, Any]]:
    """
    Full training pipeline:

    - load and preprocess datasets
    - train / evaluate multiple models
    - plot ROC comparison
    - retrain the best model on the full dataset
    - persist the best model to disk

    Returns:
        best_model: trained sklearn Pipeline
        best_model_name: name of the best-performing model
    """
    X, y, categories = prepare_training_data()

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE,
        stratify=y,
    )

    y_test_bin = label_binarize(y_test, classes=categories)

    models = _build_models()

    results: Dict[str, Dict] = {}
    roc_curves: List[Tuple[str, object, object, float]] = []

    for name, model in models.items():
        vectorizer = build_tfidf_vectorizer()
        pipeline = make_pipeline(vectorizer, model)

        metrics, fpr, tpr, roc_auc = evaluate_classifier(
            name=name,
            pipeline=pipeline,
            X_train=X_train,
            X_test=X_test,
            y_train=y_train,
            y_test=y_test,
            categories=categories,
            y_test_bin=y_test_bin,
            headless=headless,
        )

        results[name] = {
            "pipeline": pipeline,
            **metrics,
        }
        roc_curves.append((name, fpr, tpr, roc_auc))

    # Combined ROC comparison
    plot_roc_comparison(roc_curves, headless=headless)

    # Accuracy-based model selection
    best_model_name = max(results, key=lambda m: results[m]["accuracy"])
    best_model = results[best_model_name]["pipeline"]

    print(f"\nBest Model Selected: {best_model_name}")

    # Retrain best model on the full dataset
    best_model.fit(X, y)

    # Persist model (pipeline with TF-IDF + classifier)
    model_path = save_model(best_model)
    if not headless:
        print(f"Best model saved to: {model_path}")

    # Build metrics summary (exclude non-serializable objects)
    metrics_summary = {
        "best_model": best_model_name,
        "models": {
            name: {
                "accuracy": float(r["accuracy"]),
                "macro_f1": float(r.get("macro_f1", 0)),
                "weighted_f1": float(r.get("weighted_f1", 0)),
                "roc_auc": float(r["roc_auc"]),
            }
            for name, r in results.items()
        },
    }

    return best_model, best_model_name, metrics_summary


def run_training_and_save_metrics() -> Dict[str, Any]:
    """
    Run training in headless mode and save metrics to models/metrics.json.
    Used by admin API for retraining. Returns metrics dict.
    """
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    _, _, metrics_summary = train_and_select_best_model(headless=True)
    metrics_summary["last_trained_at"] = datetime.utcnow().isoformat() + "Z"
    metrics_path = MODELS_DIR / "metrics.json"
    with open(metrics_path, "w") as f:
        json.dump(metrics_summary, f, indent=2)
    return metrics_summary


def main() -> None:
    """
    CLI entry point for training.
    """
    train_and_select_best_model(headless=False)


if __name__ == "__main__":
    main()

