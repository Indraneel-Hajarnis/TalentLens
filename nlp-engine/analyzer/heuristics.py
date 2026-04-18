"""
heuristics.py - Domain-specific heuristic scoring functions.
These produce the h(n) heuristic estimates used by Best-First Search in search.py.
"""

import re
from collections import Counter
from analyzer.similarity import tokenize, STOP_WORDS

# ---------------------------------------------------------------------------
# Skill taxonomy — greatly expanded for accuracy across tech domains
# ---------------------------------------------------------------------------

SKILL_TAXONOMY = {
    "languages": [
        "python", "java", "javascript", "typescript", "c", "c++", "c#", "go",
        "rust", "swift", "kotlin", "ruby", "php", "scala", "r", "matlab",
        "dart", "perl", "haskell", "elixir", "bash", "shell", "powershell",
        "html", "css", "sass", "less", "assembly", "fortran", "cobol",
        "objective-c", "lua", "groovy", "clojure", "f#", "ocaml", "julia",
        "solidity", "apex", "vba", "sas",
    ],
    "frameworks": [
        "react", "angular", "vue", "nextjs", "nuxtjs", "gatsby", "remix",
        "django", "flask", "fastapi", "spring", "spring boot", "express",
        "nestjs", "rails", "laravel", "asp.net", "blazor", "strapi",
        "pytorch", "tensorflow", "keras", "sklearn", "scikit-learn",
        "hugging face", "langchain", "xgboost", "lightgbm", "catboost",
        "tailwind", "bootstrap", "material ui", "chakra ui", "ant design",
        "svelte", "sveltekit", "astro", "solid", "qwik",
        "fastify", "hapi", "koa", "gin", "fiber", "echo", "beego",
        "hibernate", "mybatis", "sequelize", "prisma", "typeorm", "drizzle",
        "celery", "dramatiq", "rq", "apache spark", "spark", "hadoop",
        "airflow", "prefect", "dbt", "pandas", "numpy", "scipy",
        "matplotlib", "seaborn", "plotly", "streamlit", "gradio",
    ],
    "tools": [
        "git", "github", "gitlab", "bitbucket", "docker", "kubernetes", "k8s",
        "jenkins", "terraform", "ansible", "puppet", "chef", "helm",
        "nginx", "apache", "webpack", "vite", "rollup", "parcel", "esbuild",
        "eslint", "prettier", "babel", "gradle", "maven", "npm", "yarn", "pnpm",
        "jira", "confluence", "trello", "notion", "asana",
        "figma", "sketch", "adobe xd", "photoshop", "illustrator",
        "postman", "insomnia", "swagger", "openapi",
        "linux", "ubuntu", "centos", "debian", "macos", "windows server",
        "vim", "emacs", "vscode", "intellij", "pycharm", "eclipse",
        "splunk", "datadog", "grafana", "prometheus", "kibana", "logstash",
        "sonarqube", "veracode", "burp suite", "metasploit",
        "wireshark", "nmap", "snort",
        "selenium", "playwright", "cypress", "jest", "pytest", "mocha",
        "junit", "testng", "cucumber",
    ],
    "databases": [
        "sql", "mysql", "postgresql", "postgres", "mongodb", "redis", "sqlite",
        "elasticsearch", "cassandra", "dynamodb", "oracle", "firebase",
        "neo4j", "influxdb", "clickhouse", "snowflake", "bigquery",
        "hive", "hbase", "couchdb", "couchbase", "mariadb",
        "mssql", "sql server", "aurora", "cockroachdb", "timescaledb",
        "pinecone", "weaviate", "chroma", "qdrant", "milvus",
    ],
    "cloud": [
        "aws", "azure", "gcp", "google cloud", "heroku", "vercel", "netlify",
        "cloudflare", "digitalocean", "lambda", "s3", "ec2", "rds",
        "gke", "aks", "eks", "ecs", "fargate", "cloudwatch",
        "azure devops", "az", "cloud functions", "cloud run",
        "sagemaker", "vertex ai", "bedrock", "cognitive services",
        "route53", "cloudfront", "elb", "alb", "vpc", "iam",
        "terraform cloud", "pulumi",
    ],
    "concepts": [
        "machine learning", "deep learning", "nlp", "natural language processing",
        "computer vision", "data science", "data engineering", "data analysis",
        "api", "rest", "restful", "graphql", "grpc", "websocket",
        "microservices", "monolith", "serverless", "event-driven",
        "devops", "mlops", "dataops", "devsecops", "gitops",
        "ci/cd", "agile", "scrum", "kanban", "safe", "lean",
        "oop", "functional programming", "tdd", "bdd", "ddd",
        "system design", "distributed systems", "high availability",
        "blockchain", "web3", "cybersecurity", "information security",
        "penetration testing", "ethical hacking", "soc", "siem",
        "neural networks", "transformers", "llm", "generative ai",
        "rag", "fine-tuning", "prompt engineering",
        "load balancing", "caching", "message queue", "pub/sub",
        "kafka", "rabbitmq", "sqs", "redis pub/sub",
        "search engine optimization", "seo", "a/b testing",
        "data visualization", "business intelligence", "bi",
        "etl", "elt", "data pipeline", "data warehouse", "data lake",
        "statistics", "probability", "linear algebra", "calculus",
        "algorithms", "data structures",
    ],
    "soft_skills": [
        "leadership", "communication", "teamwork", "problem solving",
        "critical thinking", "time management", "project management",
        "stakeholder management", "mentoring", "collaboration",
        "presentation", "analytical", "strategic thinking",
        "product management", "product owner", "scrum master",
        "cross-functional", "remote work",
    ],
    "data_roles": [
        "data analyst", "data scientist", "data engineer", "ml engineer",
        "ai engineer", "research scientist", "applied scientist",
        "business analyst", "product analyst", "bi developer",
        "tableau", "power bi", "looker", "superset", "metabase",
        "excel", "google sheets", "google analytics", "mixpanel", "amplitude",
        "sql server reporting", "ssrs", "ssas", "ssis",
        "a/b testing", "hypothesis testing", "regression analysis",
        "predictive modeling", "statistical modeling", "time series",
        "feature engineering", "model evaluation", "cross-validation",
    ],
    "certifications": [
        "aws certified", "google certified", "azure certified",
        "certified kubernetes", "ckad", "cka",
        "cissp", "cism", "cisa", "ceh", "oscp",
        "pmp", "prince2", "csm", "psm",
        "comptia", "ccna", "ccnp", "rhce",
    ],
}

FLAT_SKILLS = {skill for category in SKILL_TAXONOMY.values() for skill in category}

# Sort multi-word skills first so they are matched before single-word sub-phrases
SORTED_SKILLS = sorted(FLAT_SKILLS, key=lambda s: -len(s.split()))

ACTION_VERBS = [
    "built", "created", "developed", "designed", "implemented", "architected",
    "engineered", "deployed", "optimized", "improved", "reduced", "increased",
    "led", "managed", "mentored", "collaborated", "researched", "analyzed",
    "automated", "migrated", "integrated", "launched", "delivered", "scaled",
    "refactored", "maintained", "tested", "documented", "trained", "published",
    "established", "executed", "expanded", "facilitated", "generated", "boosted",
    "coordinated", "accelerated", "achieved", "administered", "aligned",
    "assessed", "audited", "benchmarked", "classified", "compiled", "configured",
    "contributed", "converted", "debugged", "defined", "diagnosed", "drove",
    "enhanced", "ensured", "evaluated", "extracted", "forecasted", "formulated",
    "guided", "identified", "initiated", "introduced", "monitored", "negotiated",
    "organized", "participated", "piloted", "planned", "presented", "prioritized",
    "proposed", "prototyped", "redesigned", "resolved", "reviewed", "secured",
    "simplified", "spearheaded", "standardized", "streamlined", "structured",
    "support", "transformed", "validated", "visualized",
]


# ---------------------------------------------------------------------------
# Individual heuristic functions
# ---------------------------------------------------------------------------

def extract_skills(text: str) -> list[str]:
    """
    Extract known skills from text.
    Multi-word skills are matched before single-word ones to avoid partial matches.
    """
    text_lower = text.lower()
    found = []
    # Track matched character ranges to avoid double-counting sub-strings
    matched_spans = []

    for skill in SORTED_SKILLS:
        # Build pattern: word-boundary for single tokens, flexible spacing for multi-word
        if " " in skill:
            # Allow hyphens/dots/slashes between words (e.g. "ci/cd", "asp.net")
            escaped = re.sub(r'[ /]', r'[\\s/\\-_.]+', re.escape(skill))
            pattern = r'(?<![a-z0-9])' + escaped + r'(?![a-z0-9])'
        else:
            pattern = r'\b' + re.escape(skill) + r'\b'

        for m in re.finditer(pattern, text_lower):
            span = (m.start(), m.end())
            # Ensure this span doesn't overlap an already-matched longer skill
            overlap = any(s[0] <= span[0] < s[1] or span[0] <= s[0] < span[1]
                          for s in matched_spans)
            if not overlap:
                if skill not in found:
                    found.append(skill)
                matched_spans.append(span)
                break  # skill found; move to next

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
    When no JD is provided, score is based on overall skill diversity.
    """
    resume_skills = set(extract_skills(resume_text))

    if not jd_text.strip():
        # No JD: score based on breadth of skills (more skills = higher score)
        # Cap at 20 skills for 100%
        coverage = min(len(resume_skills) / 20, 1.0)
        return {
            "score": round(coverage, 4),
            "matched": sorted(resume_skills),
            "missing": [],
            "total_jd": 0,
            "resume_skills": sorted(resume_skills),
            "categorized": categorize_skills(sorted(resume_skills)),
        }

    jd_skills = set(extract_skills(jd_text))

    if not jd_skills:
        # JD provided but no recognisable skills in it — partial credit
        coverage = min(len(resume_skills) / 15, 1.0)
        return {
            "score": round(coverage * 0.5, 4),
            "matched": [],
            "missing": [],
            "total_jd": 0,
            "resume_skills": sorted(resume_skills),
            "categorized": categorize_skills(sorted(resume_skills)),
        }

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
    Heuristic: overlap of top-40 JD keywords in resume.
    When no JD, returns a neutral 0.5 so it doesn't distort scoring.
    """
    if not jd_text.strip():
        return {"score": 0.5, "keywords": [], "matched_keywords": [], "missing_keywords": []}

    jd_tokens = tokenize(jd_text)
    resume_tokens = tokenize(resume_text)

    # Use top 40 keywords (was 30)
    freq = Counter(jd_tokens)
    top_keywords = [kw for kw, _ in freq.most_common(40)]

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

    jd_tokens = set(tokenize(jd_text)) if jd_text.strip() else set(tokenize(resume_text))
    exp_tokens = tokenize(exp_text)
    overlap = sum(1 for t in exp_tokens if t in jd_tokens)

    # Years of experience mentioned — also match "X+ years", "X yrs"
    years = re.findall(r'(\d+)\+?\s*(?:years?|yrs?)', resume_text.lower())
    max_years = max((int(y) for y in years), default=0)
    years_score = min(max_years / 8, 1.0)   # 8+ years = full score (was 10)

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
    """
    word_count = len(resume_text.split())
    has_email = bool(re.search(r'[\w.+-]+@[\w-]+\.\w+', resume_text))
    has_phone = bool(re.search(r'(\+?[\d][\d\s\-().]{6,15}\d)', resume_text))
    has_linkedin = bool(re.search(r'linkedin\.com', resume_text.lower()))
    has_github = bool(re.search(r'github\.com', resume_text.lower()))
    has_portfolio = bool(re.search(r'(portfolio|website|blog|medium\.com)', resume_text.lower()))

    contact_score = (
        has_email * 0.40 +
        has_phone * 0.30 +
        has_linkedin * 0.20 +
        (has_github or has_portfolio) * 0.10
    )

    # Word count heuristic: 350–850 words is ideal for ATS
    if word_count < 100:
        length_score = 0.15
    elif word_count < 300:
        length_score = 0.50
    elif word_count < 350:
        length_score = 0.75
    elif word_count <= 900:
        length_score = 1.0
    elif word_count <= 1400:
        length_score = 0.80
    else:
        length_score = 0.60

    score = 0.5 * contact_score + 0.5 * length_score
    return {
        "score": round(score, 4),
        "word_count": word_count,
        "has_email": has_email,
        "has_phone": has_phone,
        "has_linkedin": has_linkedin,
        "has_github": has_github,
    }


def action_verb_score(resume_text: str) -> dict:
    """Heuristic: count of strong action verbs (achievement-oriented language)."""
    text_lower = resume_text.lower()
    found = [v for v in ACTION_VERBS if re.search(r'\b' + v + r'\b', text_lower)]
    score = min(len(found) / 12, 1.0)   # 12+ verbs = perfect score (was 10)
    return {"score": round(score, 4), "found_verbs": found, "count": len(found)}


def structure_score(resume_text: str) -> dict:
    """Heuristic: checks for standard ATS-parseable section headers."""
    section_patterns = {
        "experience":   r'\b(experience|work history|employment|career|professional background)\b',
        "education":    r'\b(education|academic|university|college|degree|qualification)\b',
        "skills":       r'\b(skills|technical skills|technologies|competencies|expertise|proficiencies)\b',
        "projects":     r'\b(projects|portfolio|work samples|open source|contributions)\b',
        "summary":      r'\b(summary|objective|profile|about me|overview|introduction)\b',
        "contact":      r'\b(contact|email|phone|mobile|address|linkedin)\b',
        "certifications": r'\b(certifications?|certificates?|credentials?|licenses?|awards?)\b',
    }
    text_lower = resume_text.lower()
    found = [s for s, p in section_patterns.items() if re.search(p, text_lower)]
    score = len(found) / len(section_patterns)
    return {
        "score": round(score, 4),
        "found_sections": found,
        "missing_sections": [s for s in section_patterns if s not in found],
    }


def quantified_achievement_score(resume_text: str) -> dict:
    """Heuristic: detects measurable impact metrics in resume."""
    patterns = [
        r'\d+\s*%',
        r'\$\s*\d+[\w]*',
        r'\d+\s*x\b',
        r'\d+[kmb]\b',
        r'\d+\s*(users?|customers?|clients?|employees?|teams?|projects?|people|members?)',
        r'(increased|decreased|reduced|improved|grew|boosted|saved|generated)\s+(by\s+)?\d+',
        r'\d+\s*(ms|seconds?|minutes?|hours?)\s+(improvement|faster|reduction)',
        r'(top|first|best|rank)\s+\d+',
    ]
    matches = []
    for p in patterns:
        matches.extend(re.findall(p, resume_text.lower()))
    count = len(matches)
    score = min(count / 5, 1.0)
    return {"score": round(score, 4), "achievement_count": count}


def keyword_stuffing_penalty(resume_text: str, jd_text: str) -> dict:
    """Detect unnatural keyword repetition — penalizes gaming the ATS."""
    if not jd_text.strip():
        return {"penalty": 0.0, "density": 0.0, "stuffed": False}

    jd_tokens = set(tokenize(jd_text))
    resume_tokens = tokenize(resume_text)
    total = len(resume_tokens)
    if total == 0:
        return {"penalty": 0.0, "density": 0.0, "stuffed": False}

    keyword_hits = sum(1 for t in resume_tokens if t in jd_tokens)
    density = keyword_hits / total
    stuffed = density > 0.30    # increased threshold (was 0.25)
    penalty = 0.10 if stuffed else 0.0   # reduced penalty (was 0.15)
    return {"penalty": round(penalty, 4), "density": round(density, 4), "stuffed": stuffed}


def education_score(resume_text: str) -> dict:
    """Heuristic: detect education level and relevant degrees."""
    text_lower = resume_text.lower()

    degree_patterns = {
        "phd":      r'\b(ph\.?d|doctorate|doctoral)\b',
        "masters":  r'\b(m\.?s\.?|m\.?e\.?|m\.?tech|msc|mba|master\'?s?|postgraduate)\b',
        "bachelors": r'\b(b\.?s\.?|b\.?e\.?|b\.?tech|bsc|bachelor\'?s?|undergraduate|b\.?a\.?)\b',
        "associate": r'\b(associate\'?s?|a\.?a\.?|a\.?s\.?)\b',
        "diploma":  r'\b(diploma|certificate program|certification course)\b',
    }

    degree_scores = {"phd": 1.0, "masters": 0.85, "bachelors": 0.70, "associate": 0.50, "diploma": 0.40}
    detected = []
    score = 0.35   # base score for any resume mentioning education

    for deg_name, pattern in degree_patterns.items():
        if re.search(pattern, text_lower):
            detected.append(deg_name)
            score = max(score, degree_scores[deg_name])

    return {"score": round(score, 4), "detected_degrees": detected}


# ---------------------------------------------------------------------------
# Composite heuristic — used as h(n) in Best-First Search
# ---------------------------------------------------------------------------

# Weights tuned for JD-present vs JD-absent modes
WEIGHTS_WITH_JD = {
    "keyword":      0.30,
    "skills":       0.30,
    "experience":   0.15,
    "formatting":   0.08,
    "action_verbs": 0.07,
    "structure":    0.05,
    "education":    0.05,
}

WEIGHTS_NO_JD = {
    "keyword":      0.10,   # minimal weight without JD
    "skills":       0.35,
    "experience":   0.20,
    "formatting":   0.12,
    "action_verbs": 0.10,
    "structure":    0.08,
    "education":    0.05,
}


def composite_heuristic(resume_text: str, jd_text: str) -> dict:
    """
    Composite heuristic h(n): weighted sum of individual heuristic scores.
    This is the evaluation function used by Best-First Search to rank candidates.
    Uses different weight profiles depending on whether a JD is present.
    """
    has_jd = bool(jd_text.strip())
    WEIGHTS = WEIGHTS_WITH_JD if has_jd else WEIGHTS_NO_JD

    kw  = keyword_match_score(resume_text, jd_text)
    sk  = skill_match_score(resume_text, jd_text)
    ex  = experience_relevance_score(resume_text, jd_text)
    fmt = formatting_score(resume_text)
    av  = action_verb_score(resume_text)
    st  = structure_score(resume_text)
    pen = keyword_stuffing_penalty(resume_text, jd_text)
    qa  = quantified_achievement_score(resume_text)
    ed  = education_score(resume_text)

    raw_score = (
        kw["score"]  * WEIGHTS["keyword"]      +
        sk["score"]  * WEIGHTS["skills"]       +
        ex["score"]  * WEIGHTS["experience"]   +
        fmt["score"] * WEIGHTS["formatting"]   +
        av["score"]  * WEIGHTS["action_verbs"] +
        st["score"]  * WEIGHTS["structure"]    +
        ed["score"]  * WEIGHTS["education"]
    )

    final_score = max(0.0, raw_score - pen["penalty"])

    return {
        "final_score":  round(final_score * 100, 2),
        "raw_score":    round(raw_score * 100, 2),
        "penalty":      round(pen["penalty"] * 100, 2),
        "breakdown": {
            "keyword_match":   {"score": round(kw["score"] * 100, 2),  "weight": WEIGHTS["keyword"]},
            "skill_match":     {"score": round(sk["score"] * 100, 2),  "weight": WEIGHTS["skills"]},
            "experience":      {"score": round(ex["score"] * 100, 2),  "weight": WEIGHTS["experience"]},
            "formatting":      {"score": round(fmt["score"] * 100, 2), "weight": WEIGHTS["formatting"]},
            "action_verbs":    {"score": round(av["score"] * 100, 2),  "weight": WEIGHTS["action_verbs"]},
            "structure":       {"score": round(st["score"] * 100, 2),  "weight": WEIGHTS["structure"]},
            "education":       {"score": round(ed["score"] * 100, 2),  "weight": WEIGHTS["education"]},
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
            "education":    ed,
        },
        "weights": WEIGHTS,
    }