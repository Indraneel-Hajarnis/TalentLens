"""
heuristics.py - Domain-specific heuristic scoring functions.
These produce the h(n) heuristic estimates used by Best-First Search in search.py.
"""

import re
from collections import Counter
from analyzer.similarity import tokenize, STOP_WORDS

# ---------------------------------------------------------------------------
# Skill taxonomy — used for categorization & gap analysis
# ---------------------------------------------------------------------------

SKILL_TAXONOMY = {
    "languages":   ["python", "java", "javascript", "typescript", "c", "c++", "c#", "go",
                    "rust", "swift", "kotlin", "ruby", "php", "scala", "r", "matlab",
                    "dart", "perl", "haskell", "elixir"],
    "frameworks":  ["react", "angular", "vue", "nextjs", "django", "flask", "fastapi",
                    "spring", "express", "nestjs", "rails", "laravel", "asp.net",
                    "pytorch", "tensorflow", "keras", "sklearn", "scikit-learn",
                    "tailwind", "bootstrap", "svelte"],
    "tools":       ["git", "docker", "kubernetes", "jenkins", "terraform", "ansible",
                    "nginx", "webpack", "vite", "eslint", "babel", "gradle", "maven",
                    "jira", "confluence", "figma", "postman", "linux"],
    "databases":   ["sql", "mysql", "postgresql", "mongodb", "redis", "sqlite",
                    "elasticsearch", "cassandra", "dynamodb", "oracle", "firebase",
                    "neo4j", "influxdb", "clickhouse"],
    "cloud":       ["aws", "azure", "gcp", "heroku", "vercel", "netlify", "cloudflare",
                    "digitalocean", "lambda", "s3", "ec2", "rds", "gke", "aks"],
    "concepts":    ["machine learning", "deep learning", "nlp", "computer vision",
                    "data science", "api", "rest", "graphql", "microservices",
                    "devops", "ci/cd", "agile", "scrum", "oop", "functional programming",
                    "system design", "distributed systems", "blockchain", "cybersecurity"],
}

FLAT_SKILLS = {skill for category in SKILL_TAXONOMY.values() for skill in category}

ACTION_VERBS = [
    "built", "created", "developed", "designed", "implemented", "architected",
    "engineered", "deployed", "optimized", "improved", "reduced", "increased",
    "led", "managed", "mentored", "collaborated", "researched", "analyzed",
    "automated", "migrated", "integrated", "launched", "delivered", "scaled",
    "refactored", "maintained", "tested", "documented", "trained", "published",
]


# ---------------------------------------------------------------------------
# Individual heuristic functions
# ---------------------------------------------------------------------------

def extract_skills(text: str) -> list[str]:
    """Extract known skills from text using pattern matching."""
    text_lower = text.lower()
    found = []
    for skill in FLAT_SKILLS:
        pattern = r'\b' + re.escape(skill) + r'\b'
        if re.search(pattern, text_lower):
            found.append(skill)
    return found


def categorize_skills(skills: list[str]) -> dict[str, list[str]]:
    """Bin extracted skills into taxonomy categories."""
    result = {cat: [] for cat in SKILL_TAXONOMY}
    for skill in skills:
        for cat, cat_skills in SKILL_TAXONOMY.items():
            if skill in cat_skills:
                result[cat].append(skill)
                break
    return result


def skill_match_score(resume_text: str, jd_text: str) -> dict:
    """
    Heuristic: fraction of JD-required skills found in resume.
    h(n) component — measures how close a candidate is to the goal state.
    """
    resume_skills = set(extract_skills(resume_text))
    jd_skills = set(extract_skills(jd_text))

    if not jd_skills:
        return {"score": 0.5, "matched": [], "missing": [], "total_jd": 0}

    matched = resume_skills & jd_skills
    missing = jd_skills - resume_skills

    score = len(matched) / len(jd_skills)
    return {
        "score": round(score, 4),
        "matched": sorted(matched),
        "missing": sorted(missing),
        "total_jd": len(jd_skills),
        "resume_skills": sorted(resume_skills),
        "categorized": categorize_skills(sorted(matched)),
    }


def keyword_match_score(resume_text: str, jd_text: str) -> dict:
    """
    Heuristic: overlap of top-30 JD keywords in resume.
    Uses frequency-ranked non-stop tokens as keywords.
    """
    jd_tokens = tokenize(jd_text)
    resume_tokens = tokenize(resume_text)

    freq = Counter(jd_tokens)
    top_keywords = [kw for kw, _ in freq.most_common(30)]

    resume_set = set(resume_tokens)
    matched = [kw for kw in top_keywords if kw in resume_set]

    score = len(matched) / len(top_keywords) if top_keywords else 0
    return {
        "score": round(score, 4),
        "keywords": top_keywords,
        "matched_keywords": matched,
        "missing_keywords": [kw for kw in top_keywords if kw not in resume_set],
    }


def experience_relevance_score(resume_text: str, jd_text: str) -> dict:
    """
    Heuristic: estimates experience relevance using years-mentioned
    and contextual keyword co-occurrence with experience-section words.
    """
    experience_section_pattern = r'(experience|work history|employment|career)(.*?)(education|skills|projects|$)'
    match = re.search(experience_section_pattern, resume_text.lower(), re.DOTALL)
    exp_text = match.group(2) if match else resume_text

    jd_tokens = set(tokenize(jd_text))
    exp_tokens = tokenize(exp_text)
    overlap = sum(1 for t in exp_tokens if t in jd_tokens)

    # Years of experience mentioned
    years = re.findall(r'(\d+)\+?\s*years?', resume_text.lower())
    max_years = max((int(y) for y in years), default=0)
    years_score = min(max_years / 10, 1.0)

    overlap_score = min(overlap / max(len(jd_tokens), 1), 1.0)
    score = 0.6 * overlap_score + 0.4 * years_score

    return {
        "score": round(score, 4),
        "years_mentioned": max_years,
        "experience_overlap_tokens": overlap,
    }


def formatting_score(resume_text: str) -> dict:
    """
    Heuristic: estimates ATS-friendliness of resume formatting.
    Penalizes overly short or empty resumes.
    """
    word_count = len(resume_text.split())
    has_email = bool(re.search(r'[\w.+-]+@[\w-]+\.\w+', resume_text))
    has_phone = bool(re.search(r'(\+?\d[\d\s\-().]{7,15}\d)', resume_text))
    has_linkedin = bool(re.search(r'linkedin\.com', resume_text.lower()))

    contact_score = (has_email + has_phone + has_linkedin) / 3

    # Word count heuristic: 300–800 words is ideal
    if word_count < 100:
        length_score = 0.2
    elif word_count < 300:
        length_score = 0.5
    elif word_count <= 800:
        length_score = 1.0
    elif word_count <= 1200:
        length_score = 0.8
    else:
        length_score = 0.6

    score = 0.5 * contact_score + 0.5 * length_score
    return {
        "score": round(score, 4),
        "word_count": word_count,
        "has_email": has_email,
        "has_phone": has_phone,
        "has_linkedin": has_linkedin,
    }


def action_verb_score(resume_text: str) -> dict:
    """Heuristic: count of strong action verbs (achievement-oriented language)."""
    text_lower = resume_text.lower()
    found = [v for v in ACTION_VERBS if re.search(r'\b' + v + r'\b', text_lower)]
    score = min(len(found) / 10, 1.0)  # 10+ verbs = perfect score
    return {"score": round(score, 4), "found_verbs": found, "count": len(found)}


def structure_score(resume_text: str) -> dict:
    """Heuristic: checks for standard ATS-parseable section headers."""
    section_patterns = {
        "experience": r'\b(experience|work history|employment|career)\b',
        "education":  r'\b(education|academic|university|college|degree)\b',
        "skills":     r'\b(skills|technical skills|technologies|competencies)\b',
        "projects":   r'\b(projects|portfolio|work samples)\b',
        "summary":    r'\b(summary|objective|profile|about)\b',
        "contact":    r'\b(contact|email|phone|address|linkedin)\b',
    }
    text_lower = resume_text.lower()
    found = [s for s, p in section_patterns.items() if re.search(p, text_lower)]
    score = len(found) / len(section_patterns)
    return {"score": round(score, 4), "found_sections": found, "missing_sections": [s for s in section_patterns if s not in found]}


def quantified_achievement_score(resume_text: str) -> dict:
    """Heuristic: detects measurable impact metrics in resume."""
    patterns = [
        r'\d+\s*%',
        r'\$\s*\d+[\w]*',
        r'\d+\s*x\b',
        r'\d+[kmb]\b',
        r'\d+\s*(users?|customers?|clients?|employees?|teams?|projects?)',
        r'(increased|decreased|reduced|improved|grew|boosted)\s+(by\s+)?\d+',
    ]
    matches = []
    for p in patterns:
        matches.extend(re.findall(p, resume_text.lower()))
    count = len(matches)
    score = min(count / 5, 1.0)
    return {"score": round(score, 4), "achievement_count": count}


def keyword_stuffing_penalty(resume_text: str, jd_text: str) -> dict:
    """Detect unnatural keyword repetition — penalizes gaming the ATS."""
    jd_tokens = set(tokenize(jd_text))
    resume_tokens = tokenize(resume_text)
    total = len(resume_tokens)
    if total == 0:
        return {"penalty": 0.0, "density": 0.0, "stuffed": False}

    keyword_hits = sum(1 for t in resume_tokens if t in jd_tokens)
    density = keyword_hits / total
    stuffed = density > 0.25
    penalty = 0.15 if stuffed else 0.0
    return {"penalty": round(penalty, 4), "density": round(density, 4), "stuffed": stuffed}


# ---------------------------------------------------------------------------
# Composite heuristic — used as h(n) in Best-First Search
# ---------------------------------------------------------------------------

WEIGHTS = {
    "keyword":      0.40,
    "skills":       0.20,
    "experience":   0.15,
    "formatting":   0.10,
    "action_verbs": 0.10,
    "structure":    0.05,
}


def composite_heuristic(resume_text: str, jd_text: str) -> dict:
    """
    Composite heuristic h(n): weighted sum of individual heuristic scores.
    This is the evaluation function used by Best-First Search to rank candidates.
    """
    kw    = keyword_match_score(resume_text, jd_text)
    sk    = skill_match_score(resume_text, jd_text)
    ex    = experience_relevance_score(resume_text, jd_text)
    fmt   = formatting_score(resume_text)
    av    = action_verb_score(resume_text)
    st    = structure_score(resume_text)
    pen   = keyword_stuffing_penalty(resume_text, jd_text)
    qa    = quantified_achievement_score(resume_text)

    raw_score = (
        kw["score"]  * WEIGHTS["keyword"]      +
        sk["score"]  * WEIGHTS["skills"]       +
        ex["score"]  * WEIGHTS["experience"]   +
        fmt["score"] * WEIGHTS["formatting"]   +
        av["score"]  * WEIGHTS["action_verbs"] +
        st["score"]  * WEIGHTS["structure"]
    )

    final_score = max(0.0, raw_score - pen["penalty"])

    return {
        "final_score":   round(final_score * 100, 2),
        "raw_score":     round(raw_score * 100, 2),
        "penalty":       round(pen["penalty"] * 100, 2),
        "breakdown": {
            "keyword_match":   {"score": round(kw["score"] * 100, 2),  "weight": WEIGHTS["keyword"]},
            "skill_match":     {"score": round(sk["score"] * 100, 2),  "weight": WEIGHTS["skills"]},
            "experience":      {"score": round(ex["score"] * 100, 2),  "weight": WEIGHTS["experience"]},
            "formatting":      {"score": round(fmt["score"] * 100, 2), "weight": WEIGHTS["formatting"]},
            "action_verbs":    {"score": round(av["score"] * 100, 2),  "weight": WEIGHTS["action_verbs"]},
            "structure":       {"score": round(st["score"] * 100, 2),  "weight": WEIGHTS["structure"]},
        },
        "details": {
            "keyword":      kw,
            "skills":       sk,
            "experience":   ex,
            "formatting":   fmt,
            "action_verbs": av,
            "structure":    st,
            "stuffing":     pen,
            "achievements": qa,
        },
        "weights": WEIGHTS,
    }