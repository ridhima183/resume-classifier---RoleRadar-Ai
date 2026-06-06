from __future__ import annotations

from backend.ml.predict import confidence_label, predict_resume


def main() -> None:
    """
    Simple manual test script to run a prediction on a sample resume.

    Usage:
        python test_prediction.py
    """
    sample_resume = """
    Experienced software engineer with 5+ years in Python, Django, REST APIs,
    and cloud-native microservices on AWS. Designed and implemented scalable
    back-end systems, CI/CD pipelines, and containerised applications using
    Docker and Kubernetes. Collaborated with cross-functional teams to ship
    high-quality software in an agile environment.
    """

    predicted_role, confidence = predict_resume(sample_resume)
    label = confidence_label(confidence)

    print("\nSample resume prediction")
    print("------------------------")
    print(f"Predicted job role : {predicted_role}")
    print(f"Confidence score   : {confidence:.2f}% ({label})")


if __name__ == "__main__":
    main()

