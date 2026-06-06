from __future__ import annotations

from typing import Dict, List, Tuple

import matplotlib.pyplot as plt
import numpy as np
import seaborn as sns
from sklearn.metrics import (
    accuracy_score,
    auc,
    classification_report,
    confusion_matrix,
    roc_curve,
)


def evaluate_classifier(
    name: str,
    pipeline,
    X_train,
    X_test,
    y_train,
    y_test,
    categories: List[str],
    y_test_bin,
    headless: bool = False,
) -> Tuple[Dict, np.ndarray, np.ndarray, float]:
    """
    Fit a pipeline, compute metrics and generate plots for a single model.

    Returns:
        metrics dict, fpr array, tpr array, roc_auc value
    """
    print("\n" + "=" * 70)
    print(f"Training & Evaluating: {name}")
    print("=" * 70)

    pipeline.fit(X_train, y_train)

    # Predictions
    y_pred = pipeline.predict(X_test)

    # Accuracy
    acc = accuracy_score(y_test, y_pred)
    if not headless:
        print(f"\nAccuracy: {acc:.4f}")

    # Classification report (dict for metrics, string for display)
    report_dict = classification_report(
        y_test, y_pred, target_names=categories, output_dict=True
    )
    report_str = classification_report(
        y_test, y_pred, target_names=categories, output_dict=False
    )
    if not headless:
        print("\nClassification Report:")
        print(report_str)

    # Confusion matrix (heatmap)
    cm = confusion_matrix(y_test, y_pred, labels=categories)

    plt.figure(figsize=(14, 12))
    sns.heatmap(
        cm,
        annot=True,
        fmt="d",
        cmap="viridis",
        linewidths=0.5,
        linecolor="white",
        xticklabels=categories,
        yticklabels=categories,
    )
    plt.title(f"{name} – Confusion Matrix", fontsize=16, fontweight="bold")
    plt.xlabel("Predicted Label", fontsize=12)
    plt.ylabel("True Label", fontsize=12)
    plt.xticks(rotation=90)
    plt.yticks(rotation=0)
    plt.tight_layout()
    if not headless:
        plt.show()
    plt.close()

    # ROC curve (micro-average)
    final_step_name = list(pipeline.named_steps.keys())[-1]
    final_model = pipeline.named_steps[final_step_name]

    if hasattr(final_model, "predict_proba"):
        y_score = pipeline.predict_proba(X_test)
    else:
        y_score = pipeline.decision_function(X_test)

    fpr, tpr, _ = roc_curve(y_test_bin.ravel(), y_score.ravel())
    roc_auc = auc(fpr, tpr)

    # Extract macro/weighted F1 from report dict
    macro_f1 = report_dict.get("macro avg", {}).get("f1-score", 0.0)
    weighted_f1 = report_dict.get("weighted avg", {}).get("f1-score", 0.0)

    metrics = {
        "accuracy": acc,
        "macro_f1": float(macro_f1),
        "weighted_f1": float(weighted_f1),
        "classification_report": report_str,
        "classification_report_dict": report_dict,
        "confusion_matrix": cm,
        "roc_auc": roc_auc,
    }

    return metrics, fpr, tpr, roc_auc


def plot_roc_comparison(
    curves: List[Tuple[str, np.ndarray, np.ndarray, float]],
    headless: bool = False,
) -> None:
    """
    Plot ROC curves for multiple models on a single figure.
    """
    plt.figure(figsize=(9, 7))

    for name, fpr, tpr, roc_auc in curves:
        plt.plot(
            fpr,
            tpr,
            linewidth=3,
            label=f"{name} (AUC = {roc_auc:.3f})",
        )

    plt.plot([0, 1], [0, 1], linestyle="--", color="gray", linewidth=2)
    plt.xlabel("False Positive Rate", fontsize=12)
    plt.ylabel("True Positive Rate", fontsize=12)
    plt.title("ROC Curve Comparison (Micro-Average)", fontsize=16, fontweight="bold")
    plt.legend(loc="lower right", fontsize=11)
    plt.grid(alpha=0.3)
    plt.tight_layout()
    if not headless:
        plt.show()
    plt.close()

