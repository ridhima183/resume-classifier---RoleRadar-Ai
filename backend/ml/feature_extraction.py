from __future__ import annotations

from sklearn.feature_extraction.text import TfidfVectorizer

from .config import (
    TFIDF_MAX_FEATURES,
    TFIDF_MIN_DF,
    TFIDF_NGRAM_RANGE,
    TFIDF_STOP_WORDS,
    TFIDF_SUBLINEAR_TF,
)


def build_tfidf_vectorizer() -> TfidfVectorizer:
    """
    Create a TF-IDF vectorizer with the same configuration used during training.
    """
    return TfidfVectorizer(
        stop_words=TFIDF_STOP_WORDS,
        ngram_range=TFIDF_NGRAM_RANGE,
        max_features=TFIDF_MAX_FEATURES,
        min_df=TFIDF_MIN_DF,
        sublinear_tf=TFIDF_SUBLINEAR_TF,
    )

