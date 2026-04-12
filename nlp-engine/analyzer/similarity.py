from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import re

def clean_text(text: str) -> str:
    # Lowercase and remove punctuation
    text = text.lower()
    text = re.sub(r'[^a-z0-9\s]', '', text)
    return text

def calculate_similarity(resume_text: str, job_desc: str):
    """
    Returns a similarity score (0.0 to 1.0) and a dictionary of matching keywords.
    """
    clean_resume = clean_text(resume_text)
    clean_jd = clean_text(job_desc)

    # Setup Tfidf to capture multi-word phrases (N-grams)
    vectorizer = TfidfVectorizer(
        stop_words='english',
        ngram_range=(1, 3), # Capture "Machine Learning", etc.
        token_pattern=r"(?u)\b[\w#.+]+\b" # Allow # and . for C#, React.js, etc.
    )
    
    try:
        tfidf_matrix = vectorizer.fit_transform([clean_jd, clean_resume])
        
        # Calculate cosine similarity
        match_score = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
        
        # Get feature names and weights
        feature_names = vectorizer.get_feature_names_out()
        
        # Get weights for the JD to find critical keywords
        jd_weights = tfidf_matrix[0].toarray()[0]
        resume_weights = tfidf_matrix[1].toarray()[0]
        
        jd_keywords_list = []
        for i, weight in enumerate(jd_weights):
            if weight > 0:
                jd_keywords_list.append((feature_names[i], weight))
                
        # Sort by weight to get the most important ones
        jd_keywords_list.sort(key=lambda x: x[1], reverse=True)
        
        matching = []
        missing = []
        
        # Check top keywords from JD against the resume weights
        for kw, weight in jd_keywords_list[:40]:
            kw_idx = vectorizer.vocabulary_.get(kw)
            if resume_weights[kw_idx] > 0:
                matching.append(kw)
            else:
                missing.append(kw)

        return float(match_score), {
            "matching": matching[:15],
            "missing": missing[:15]
        }
    except Exception as e:
        print("Error calculating similarity:", e)
        return 0.0, {"matching": [], "missing": []}
