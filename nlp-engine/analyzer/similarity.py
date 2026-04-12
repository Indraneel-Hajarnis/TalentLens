"""
similarity.py - TF-IDF Vectorization and Cosine Similarity
Used by the Best-First Search heuristic as the core scoring function.
"""

import math
import re
from collections import Counter

STOP_WORDS = {
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
    "being", "have", "has", "had", "do", "does", "did", "will", "would",
    "could", "should", "may", "might", "shall", "can", "need", "dare",
    "ought", "used", "it", "its", "this", "that", "these", "those", "i",
    "we", "you", "he", "she", "they", "what", "which", "who", "whom",
    "not", "no", "nor", "so", "yet", "both", "either", "neither", "each",
    "few", "more", "most", "other", "some", "such", "than", "too", "very",
    "just", "as", "if", "while", "although", "though", "because", "since",
    "until", "unless", "however", "therefore", "thus", "hence", "also"
}


def tokenize(text: str) -> list[str]:
    """Lowercase, strip punctuation, split into tokens."""
    text = text.lower()
    text = re.sub(r'[^a-z0-9\s]', ' ', text)
    tokens = text.split()
    return [t for t in tokens if len(t) > 1 and t not in STOP_WORDS]


def calculate_tf(tokens: list[str]) -> dict[str, float]:
    """Term Frequency: count of term / total terms."""
    if not tokens:
        return {}
    total = len(tokens)
    counts = Counter(tokens)
    return {term: count / total for term, count in counts.items()}


def calculate_idf(term: str, all_docs_tokens: list[list[str]]) -> float:
    """
    Inverse Document Frequency with smoothing.
    idf(t) = log((1 + N) / (1 + df(t))) + 1
    """
    N = len(all_docs_tokens)
    df = sum(1 for doc in all_docs_tokens if term in doc)
    return math.log((1 + N) / (1 + df)) + 1


def build_tfidf_vector(tokens: list[str], all_docs_tokens: list[list[str]]) -> dict[str, float]:
    """Build TF-IDF vector for a document given a corpus."""
    tf = calculate_tf(tokens)
    tfidf = {}
    for term, tf_val in tf.items():
        idf_val = calculate_idf(term, all_docs_tokens)
        tfidf[term] = tf_val * idf_val
    return tfidf


def cosine_similarity(vec1: dict[str, float], vec2: dict[str, float]) -> float:
    """
    Cosine similarity between two TF-IDF vectors.
    sim(A, B) = (A · B) / (||A|| * ||B||)
    """
    if not vec1 or not vec2:
        return 0.0

    common_keys = set(vec1.keys()) & set(vec2.keys())
    dot_product = sum(vec1[k] * vec2[k] for k in common_keys)

    mag1 = math.sqrt(sum(v ** 2 for v in vec1.values()))
    mag2 = math.sqrt(sum(v ** 2 for v in vec2.values()))

    if mag1 == 0 or mag2 == 0:
        return 0.0

    return dot_product / (mag1 * mag2)


def compute_similarity_score(resume_text: str, jd_text: str) -> dict:
    """
    Full pipeline: tokenize → TF-IDF → cosine similarity.
    Returns score and matched terms for explainability.
    """
    resume_tokens = tokenize(resume_text)
    jd_tokens = tokenize(jd_text)

    all_docs = [resume_tokens, jd_tokens]

    resume_vec = build_tfidf_vector(resume_tokens, all_docs)
    jd_vec = build_tfidf_vector(jd_tokens, all_docs)

    score = cosine_similarity(resume_vec, jd_vec)

    # Top matching terms for explainability
    common = set(resume_vec.keys()) & set(jd_vec.keys())
    matched_terms = sorted(common, key=lambda t: resume_vec[t] * jd_vec[t], reverse=True)[:15]

    return {
        "cosine_score": round(score, 4),
        "matched_terms": matched_terms,
        "resume_token_count": len(resume_tokens),
        "jd_token_count": len(jd_tokens),
    }