"""
heuristics.py - Domain-specific heuristic scoring functions.
These produce the h(n) heuristic estimates used by Best-First Search in search.py.
"""

import re
from collections import Counter
from analyzer.similarity import tokenize, STOP_WORDS


# ---------------------------------------------------------------------------
# Text normalization — applied before ALL analysis to fix PDF extraction artifacts
# ---------------------------------------------------------------------------

def normalize_resume_text(text: str) -> str:
    """
    Normalize text extracted from PDFs / PDF.js / pdfplumber to fix common
    artifacts that break word-boundary (\b) regex matching:

    - Non-breaking space (\u00a0), zero-width chars, BOM → regular space
    - Bullet/decoration characters (•, ▸, ►, ◆ …) → space
    - Em-dash, en-dash (–, —) → space (prevents "word1—word2" joining)
    - ASCII control characters → removed
    - Runs of repeated whitespace → single space
    """
    # Non-breaking and invisible whitespace variants
    text = re.sub(r'[\u00a0\u200b\u200c\u200d\u2009\u202f\ufeff\u3000\u00ad]', ' ', text)
    # Bullet and decoration characters
    text = re.sub(r'[•·◦▪▸►‣⁃∙◆◇○●▷▶▻❯❱➤➢➜➔→]', ' ', text)
    # Em-dash, en-dash, horizontal bar
    text = re.sub(r'[\u2013\u2014\u2015\u2212]', ' ', text)
    # ASCII control characters (keep \n and \r)
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
    # Collapse multiple spaces / tabs to one
    text = re.sub(r'[ \t]{2,}', ' ', text)
    return text.strip()

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
        # NLP / AI sub-domains
        "text classification", "sentiment analysis", "named entity recognition",
        "ner", "information extraction", "text mining", "speech recognition",
        "question answering", "text summarization", "machine translation",
        "topic modeling", "word embeddings", "language model",
        "tokenization", "lemmatization", "stemming", "pos tagging",
        "dependency parsing", "coreference resolution", "entity linking",
        "zero-shot", "few-shot", "instruction tuning", "rlhf",
        # Data / ML ops
        "feature engineering", "model training", "model deployment",
        "model evaluation", "cross validation", "hyperparameter tuning",
        "data augmentation", "transfer learning", "reinforcement learning",
        # Engineering concepts
        "object detection", "image segmentation", "ocr", "recommendation system",
        "search", "ranking", "retrieval", "embedding", "vector search",
        # Soft/process
        "full stack", "backend", "frontend", "cloud native", "open source",
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

# Additional NLP/ML/Data tools not fitting neatly into taxonomy categories
_EXTRA_SKILLS = {
    "spacy", "nltk", "gensim", "bert", "gpt", "gpt-2", "gpt-3", "gpt-4",
    "word2vec", "glove", "fasttext", "doc2vec",
    "jupyter", "jupyter notebook", "colab", "google colab",
    "weights & biases", "wandb", "mlflow", "bentoml", "seldon",
    "dvc", "great expectations", "feast",
    "r", "stata", "spss",
    "tableau", "power bi", "looker", "superset", "metabase",
    "excel", "google sheets",
    "postman", "curl", "graphql", "rest api",
    "linux", "bash", "shell scripting",
    "flask", "fastapi", "django rest framework", "drf",
    "celery", "redis", "rabbitmq",
    "microservices", "docker-compose", "ci cd",
    "jira", "confluence", "notion",
    "pytorch lightning", "timm", "detectron", "mmdetection",
    "opencv", "pillow", "albumentations",
    "sql", "nosql", "orm",
    "langchain", "llamaindex", "llama index", "openai", "anthropic",
    "mistral", "llama", "ollama", "groq",
    "vector database", "embeddings", "semantic search",
    "data cleaning", "data preprocessing", "eda",
    "a/b test", "hypothesis testing", "regression",
    "agile", "sprint", "retrospective",
    "communication", "teamwork", "problem solving",
    "salesforce", "hubspot", "marketo", "zendesk",
    "adobe analytics", "google analytics", "mixpanel",
    "ios", "android", "react native", "flutter", "xamarin",
    "unity", "unreal", "game development",
    "blockchain", "smart contracts", "web3", "solidity",
    "penetration testing", "ethical hacking", "burpsuite",
    "wireshark", "metasploit", "nmap",
}

FLAT_SKILLS = {skill for category in SKILL_TAXONOMY.values() for skill in category} | _EXTRA_SKILLS

# Sort multi-word skills first so they are matched before single-word sub-phrases
SORTED_SKILLS = sorted(FLAT_SKILLS, key=lambda s: -len(s.split()))

ACTION_VERBS = [
    # Past tense (original)
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
    "supported", "transformed", "validated", "visualized",
    "utilized", "leveraged", "oversaw", "owned", "owned", "drove", "handled",
    "wrote", "ran", "grew", "tracked", "measured", "reported", "shipped",
    "onboarded", "hired", "allocated", "partnered", "interfaced", "liaised",
    "conceptualized", "operationalized", "modelled", "modeled", "fine-tuned",
    "annotated", "curated", "ingested", "preprocessed", "tokenized", "embedded",
    "fine tuned", "pretrained", "retrained", "distilled", "deployed",
    # Present / base forms (many resumes use these)
    "develop", "build", "create", "design", "implement", "architect",
    "engineer", "deploy", "optimize", "improve", "lead", "manage", "mentor",
    "collaborate", "research", "analyze", "automate", "migrate", "integrate",
    "launch", "deliver", "scale", "refactor", "maintain", "test", "document",
    "train", "establish", "execute", "expand", "facilitate", "generate",
    "coordinate", "achieve", "configure", "contribute", "debug", "define",
    "enhance", "ensure", "evaluate", "monitor", "organize", "present",
    "resolve", "review", "secure", "standardize", "streamline", "transform",
    "validate", "utilize", "leverage", "oversee", "own", "handle", "write",
    "grow", "track", "measure", "report", "ship", "drive",
    "model", "annotate", "curate", "ingest", "preprocess", "embed",
    # Progressive / -ing forms (resumes sometimes use these)
    "developing", "building", "creating", "designing", "implementing",
    "deploying", "optimizing", "improving", "leading", "managing",
    "mentoring", "collaborating", "researching", "analyzing", "automating",
    "integrating", "delivering", "maintaining", "testing", "documenting",
    "training", "establishing", "facilitating", "generating", "coordinating",
    "achieving", "configuring", "contributing", "debugging", "enhancing",
    "ensuring", "evaluating", "monitoring", "organizing", "presenting",
    "resolving", "reviewing", "securing", "streamlining", "transforming",
    "validating", "utilizing", "leveraging", "overseeing", "handling",
    "writing", "growing", "tracking", "measuring", "reporting", "driving",
    "modeling", "annotating", "curating", "ingesting", "preprocessing",
    "embedding", "scaling", "migrating", "refactoring", "launching",
    # Responsibility / ownership language (common in modern resumes)
    "responsible", "ownership", "spearhead", "pioneer", "champion",
    "oversee", "helm", "steer",
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
    taxonomy_score = len(matched) / len(jd_skills)

    # ── Keyword-floor hybrid ───────────────────────────────────────────────
    # When the JD uses domain-specific skills not in our taxonomy (<5 found),
    # supplement with meaningful keyword overlap so the score never falsely
    # bottoms out at 0% for a genuinely relevant resume.
    keyword_supplement = 0.0
    if len(jd_skills) < 5:
        jd_kw  = {t for t in tokenize(jd_text) if len(t) >= 4}
        res_kw = {t for t in tokenize(resume_text) if len(t) >= 4}
        if jd_kw:
            keyword_supplement = len(res_kw & jd_kw) / len(jd_kw)

    # Blend: taxonomy match is authoritative; keyword supplement fills the gap
    # when taxonomy coverage is sparse (weight shifts toward keyword as jd_skills→0)
    taxonomy_weight = min(len(jd_skills) / 5, 1.0)  # 0→0.0 . 5+skills→1.0
    score = taxonomy_weight * taxonomy_score + (1 - taxonomy_weight) * keyword_supplement

    return {
        "score": round(score, 4),
        "matched": sorted(matched),
        "missing": sorted(missing),
        "total_jd": len(jd_skills),
        "resume_skills": sorted(resume_skills),
        "categorized": categorize_skills(sorted(matched)),
        "keyword_supplement": round(keyword_supplement, 4),
    }


def keyword_match_score(resume_text: str, jd_text: str) -> dict:
    """
    Heuristic: overlap of distinctive JD keywords in resume.
    Filters trivial short tokens (< 4 chars) that pass stop-word removal
    but carry no discriminating signal (e.g. 'use', 'role', 'team', 'work').
    When no JD, returns a neutral 0.5 so it doesn't distort scoring.
    """
    if not jd_text.strip():
        return {"score": 0.5, "keywords": [], "matched_keywords": [], "missing_keywords": []}

    jd_tokens = tokenize(jd_text)
    resume_tokens = tokenize(resume_text)

    # Filter: only keep tokens with at least 4 characters to avoid generic short words
    # that pass stop-word removal but are not discriminative (e.g. "use", "get", "via")
    freq = Counter(t for t in jd_tokens if len(t) >= 4)
    top_keywords = [kw for kw, _ in freq.most_common(35)]

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

    Fixes applied:
    - Safer section extraction: non-greedy search with explicit boundary patterns.
    - Counts UNIQUE overlapping token types (not raw occurrences) to avoid
      double-counting tokens that appear repeatedly in a section.
    - Falls back to the last 60% of resume text when no section header is found
      (experience typically appears in the middle/lower portion).
    """
    # More robust: search for experience section using non-greedy match
    # and stop at the NEXT section header rather than end-of-string
    section_end = r'(?=\n\s*(?:education|skills|projects|certifications|awards|publications|references|summary|objective)|$)'
    exp_match = re.search(
        r'\b(?:experience|work history|employment|career|professional background)\b(.+?)' + section_end,
        resume_text,
        re.IGNORECASE | re.DOTALL,
    )
    if exp_match:
        exp_text = exp_match.group(1)
    else:
        # Heuristic fallback: experience usually lives in the latter half of the resume
        midpoint = len(resume_text) // 3
        exp_text = resume_text[midpoint:]

    jd_tokens = set(tokenize(jd_text)) if jd_text.strip() else set(tokenize(resume_text))
    # Count UNIQUE token types that overlap — prevents inflation from repeated words
    exp_token_set = set(tokenize(exp_text))
    unique_overlap = len(exp_token_set & jd_tokens)

    # Years of experience mentioned — also match "X+ years", "X yrs"
    years = re.findall(r'(\d+)\+?\s*(?:years?|yrs?)', resume_text.lower())
    # Cap at reasonable maximum (> 15 is usually embellishment)
    max_years = min(max((int(y) for y in years if int(y) <= 50), default=0), 50)
    years_score = min(max_years / 10, 1.0)  # 10+ years = full score

    # Normalise overlap against JD vocabulary size
    overlap_score = min(unique_overlap / max(len(jd_tokens), 1), 1.0)
    score = 0.6 * overlap_score + 0.4 * years_score

    return {
        "score": round(score, 4),
        "years_mentioned": max_years,
        "experience_overlap_tokens": unique_overlap,
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
    # Deduplicate ACTION_VERBS before matching (list now contains past/present/ing)
    unique_verbs = list(dict.fromkeys(ACTION_VERBS))
    found = [v for v in unique_verbs if re.search(r'\b' + re.escape(v) + r'\b', text_lower)]
    score = min(len(found) / 8, 1.0)   # 8+ distinct verb types = full score
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
# NOTE: achievements weight was added; weights sum to exactly 1.0
WEIGHTS_WITH_JD = {
    "keyword":      0.28,
    "skills":       0.30,
    "experience":   0.15,
    "formatting":   0.08,
    "action_verbs": 0.07,
    "structure":    0.04,
    "education":    0.04,
    "achievements": 0.04,
}

WEIGHTS_NO_JD = {
    "keyword":      0.08,   # minimal weight without JD
    "skills":       0.33,
    "experience":   0.20,
    "formatting":   0.12,
    "action_verbs": 0.10,
    "structure":    0.07,
    "education":    0.05,
    "achievements": 0.05,
}


def composite_heuristic(resume_text: str, jd_text: str) -> dict:
    """
    Composite heuristic h(n): weighted sum of individual heuristic scores.
    This is the evaluation function used by Best-First Search to rank candidates.
    Uses different weight profiles depending on whether a JD is present.
    """
    # Normalize both texts to fix PDF extraction artifacts BEFORE any analysis
    resume_text = normalize_resume_text(resume_text)
    if jd_text:
        jd_text = normalize_resume_text(jd_text)

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
        ed["score"]  * WEIGHTS["education"]    +
        qa["score"]  * WEIGHTS["achievements"]
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
            "achievements":    {"score": round(qa["score"] * 100, 2),  "weight": WEIGHTS["achievements"]},
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