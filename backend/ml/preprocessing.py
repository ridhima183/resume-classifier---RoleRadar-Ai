from __future__ import annotations

import re
from pathlib import Path
from typing import List, Tuple

import pandas as pd
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize


from .config import CATEGORY_MAP, DATASET1_LOCAL, DATASET1_URL, DATASET2_LOCAL, TECH_CATEGORIES


def _load_csv(path: Path, url_fallback: str | None = None) -> pd.DataFrame:
    """
    Load a CSV from a local path, falling back to a URL if provided.

    This keeps the original Colab behaviour (remote CSV) while allowing
    you to place datasets in the local `datasets/` directory.
    """
    if path.exists():
        return pd.read_csv(path)
    if url_fallback:
        return pd.read_csv(url_fallback)
    raise FileNotFoundError(f"Dataset not found at {path} and no fallback URL provided.")


def clean_text(text: str) -> str:
    """
    Basic text normalisation with tokenisation and stopword removal:
    - lowercasing
    - removing non-alphabetic characters
    - tokenising
    - removing stopwords
    - collapsing extra whitespace
    """
    if not isinstance(text, str):
        text = str(text)
    text = text.lower()
    text = re.sub(r"[^a-z\s]", " ", text)
    tokens = word_tokenize(text)
    stop_words = set(stopwords.words("english"))
    filtered_tokens = [t for t in tokens if t not in stop_words]
    cleaned = " ".join(filtered_tokens)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def load_raw_datasets() -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Load the two resume datasets.

    Dataset 1:
        - original GitHub CSV (Preprocessed_Data.csv)
    Dataset 2:
        - local CSV (Resume.csv) filtered to technical categories
    """
    data1 = _load_csv(DATASET1_LOCAL, DATASET1_URL)
    data2 = _load_csv(DATASET2_LOCAL)

    return data1, data2


def preprocess_datasets() -> pd.DataFrame:
    """
    Reproduce the original dataset preparation logic in a reusable form:

    - Rename columns to have a unified `Resume` column.
    - Keep only `Category` and `Resume`.
    - Drop NaNs and normalise text.
    - Filter dataset 2 to technical categories.
    - Normalise category labels and apply CATEGORY_MAP.
    - Merge both datasets.
    """
    data1, data2 = load_raw_datasets()

    # Dataset 2: normalise columns and filter
    data2 = data2.rename(columns={"Resume_str": "Resume"})
    data2 = data2[["Category", "Resume"]]
    data2["Resume"] = data2["Resume"].astype(str).fillna("")

    data2["Category"] = data2["Category"].astype(str).fillna("")
    data2 = data2[data2["Category"].str.upper().isin(TECH_CATEGORIES)]

    # Optional sampling (mirrors the original script's behaviour)
    # If you prefer to use all data, remove this line.
    data2 = data2.sample(frac=0.3, random_state=42).reset_index(drop=True)

    # Dataset 1: rename & clean columns
    data1 = data1.rename(columns={"Text": "Resume"})
    data1 = data1[["Category", "Resume"]]
    data1["Resume"] = data1["Resume"].astype(str).fillna("")

    # Normalise category labels
    for df in (data1, data2):
        df["Category"] = (
            df["Category"]
            .astype(str)
            .str.strip()
            .str.lower()
        )

    # Apply category mapping
    data1["Category"] = data1["Category"].replace(CATEGORY_MAP)
    data2["Category"] = data2["Category"].replace(CATEGORY_MAP)

    # Merge datasets
    data = pd.concat([data1, data2], ignore_index=True)

    # Clean resume text
    data["Resume"] = data["Resume"].apply(clean_text)

    return data


def prepare_training_data() -> Tuple[pd.Series, pd.Series, List[str]]:
    """
    Prepare X, y and the sorted list of unique categories for model training.
    """
    data = preprocess_datasets()
    X = data["Resume"]
    y = data["Category"]
    categories = sorted(y.unique())
    return X, y, categories

