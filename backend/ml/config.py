from pathlib import Path


def _resolve_preferred_dir(*candidates: Path) -> Path:
    """
    Return the first existing directory from a list of candidates.

    If none exist yet, fall back to the first candidate so callers can still
    create it later.
    """
    for candidate in candidates:
        if candidate.exists():
            return candidate
    return candidates[0]


# Project paths
PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATASETS_DIR = _resolve_preferred_dir(
    PROJECT_ROOT / "data" / "datasets",
    PROJECT_ROOT / "datasets",
)
MODELS_DIR = _resolve_preferred_dir(
    PROJECT_ROOT / "backend" / "models",
    PROJECT_ROOT / "models",
)

# Dataset locations
DATASET1_URL = (
    "https://media.githubusercontent.com/media/"
    "noran-mohamed/Resume-Classification-Dataset/"
    "refs/heads/main/Preprocessed_Data.csv"
)
DATASET1_LOCAL = DATASETS_DIR / "Preprocessed_Data.csv"
DATASET2_LOCAL = DATASETS_DIR / "Resume.csv"

# Train / test split
TEST_SIZE = 0.20
RANDOM_STATE = 42

# TF-IDF configuration
TFIDF_NGRAM_RANGE = (1, 2)
TFIDF_MAX_FEATURES = 25000
TFIDF_MIN_DF = 5
TFIDF_SUBLINEAR_TF = True
TFIDF_STOP_WORDS = "english"

# Model persistence
MODEL_FILENAME = "resume_classifier_model.pkl"
MODEL_PATH = MODELS_DIR / MODEL_FILENAME

# Category filtering (technical roles only)
TECH_CATEGORIES = [
    "INFORMATION-TECHNOLOGY",
    "SOFTWARE",
    "ENGINEERING",
    "DATA SCIENCE",
    "DEVOPS",
    "DATABASE",
    "AI",
    "ML",
]

# Category normalization / mapping
CATEGORY_MAP = {
    "data science": "data_science",
    "datascience": "data_science",
    "ml engineer": "data_science",
    "machine learning": "data_science",
    "software engineer": "software_developer",
    "software developer": "software_developer",
    "developer": "software_developer",
    "devops engineer": "devops",
    "cloud engineer": "devops",
    "network security engineer": "cybersecurity",
    "cyber security": "cybersecurity",
}
