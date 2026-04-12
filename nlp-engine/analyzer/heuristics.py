import re

PROGRAMMING_LANGUAGES = {
    "python", "java", "c", "c++", "c#", "go", "rust", "kotlin",
    "swift", "javascript", "typescript", "ruby", "php", "scala",
    "r", "matlab", "dart", "objective-c", "bash", "powershell"
}
WEB_TECH = {
    "html", "css", "sass", "less", "bootstrap", "tailwind",
    "react", "react.js", "next.js", "vue", "vue.js", "nuxt.js",
    "angular", "node", "node.js", "express", "express.js",
    "django", "flask", "spring", "spring boot", "asp.net",
    "rest api", "graphql", "websockets", "jwt authentication"
}
DATABASES = {
    "sql", "mysql", "postgresql", "sqlite", "oracle",
    "mongodb", "redis", "cassandra", "firebase",
    "dynamodb", "neo4j", "elasticsearch"
}
CLOUD_DEVOPS = {
    "aws", "azure", "gcp", "docker", "kubernetes", "terraform",
    "ansible", "jenkins", "ci/cd", "github actions", "gitlab ci",
    "cloudformation", "serverless", "microservices",
    "nginx", "apache", "linux", "unix"
}
AI_ML = {
    "machine learning", "deep learning", "nlp", "computer vision",
    "data science", "data analysis", "predictive modeling",
    "pandas", "numpy", "scipy", "scikit-learn", "tensorflow",
    "keras", "pytorch", "xgboost", "lightgbm",
    "feature engineering", "model deployment", "mlops"
}
DATA_TOOLS = {
    "power bi", "tableau", "excel", "google analytics",
    "looker", "bigquery", "hadoop", "spark", "kafka",
    "airflow", "snowflake", "databricks"
}
SECURITY = {
    "cybersecurity", "penetration testing", "ethical hacking",
    "network security", "encryption", "oauth", "saml",
    "identity management", "vulnerability assessment"
}
MOBILE = {
    "android", "ios", "flutter", "react native",
    "swift", "kotlin", "xamarin"
}
TESTING = {
    "unit testing", "integration testing", "selenium",
    "cypress", "jest", "mocha", "chai",
    "test automation", "manual testing", "postman"
}
TOOLS = {
    "git", "github", "gitlab", "bitbucket",
    "jira", "confluence", "notion",
    "figma", "adobe xd", "photoshop"
}
SOFT_SKILLS = {
    "leadership", "teamwork", "communication",
    "problem solving", "critical thinking",
    "time management", "adaptability",
    "collaboration", "creativity"
}

TECH_SKILLS = PROGRAMMING_LANGUAGES | WEB_TECH | DATABASES | CLOUD_DEVOPS | AI_ML | DATA_TOOLS | SECURITY | MOBILE | TESTING | TOOLS | SOFT_SKILLS

CREATION_VERBS = {
    "developed", "designed", "engineered", "built", "created",
    "constructed", "implemented", "programmed", "deployed",
    "architected", "initiated", "established"
}
IMPACT_VERBS = {
    "improved", "optimized", "enhanced", "increased", "reduced",
    "accelerated", "streamlined", "refined", "boosted",
    "maximized", "minimized"
}
ANALYSIS_VERBS = {
    "analyzed", "evaluated", "researched", "investigated",
    "assessed", "validated", "tested", "measured",
    "diagnosed", "interpreted"
}
LEADERSHIP_VERBS = {
    "led", "managed", "mentored", "coordinated",
    "supervised", "directed", "guided", "facilitated",
    "oversaw", "delegated"
}
COLLAB_VERBS = {
    "collaborated", "communicated", "presented",
    "partnered", "negotiated", "aligned",
    "engaged", "consulted"
}
EXECUTION_VERBS = {
    "executed", "delivered", "achieved", "completed",
    "launched", "rolled out", "integrated",
    "automated", "orchestrated"
}
PROBLEM_SOLVING_VERBS = {
    "resolved", "debugged", "troubleshot",
    "fixed", "eliminated", "mitigated",
    "recovered", "restructured"
}
BUSINESS_VERBS = {
    "strategized", "planned", "forecasted",
    "modeled", "budgeted", "prioritized",
    "analyzed trends", "identified opportunities"
}

ACTION_VERBS = CREATION_VERBS | IMPACT_VERBS | ANALYSIS_VERBS | LEADERSHIP_VERBS | COLLAB_VERBS | EXECUTION_VERBS | PROBLEM_SOLVING_VERBS | BUSINESS_VERBS

def evaluate_resume(resume_text: str, job_desc: str):
    """
    Evaluates heuristics (Skills, Experience, Action Verbs, Formatting).
    Returns a heuristic score normalized to 0.0 - 1.0 representing the aggregate of the 60% weight,
    and a breakdown dictionary.
    """
    text_lower = resume_text.lower()
    jd_lower = job_desc.lower() if job_desc else ""
    
    # 1. Skills Matching (out of 20 points)
    # Using regex word boundaries for precise matching
    found_skills = []
    for skill in TECH_SKILLS:
        # Escape skill for regex and use word boundaries
        # Note: some skills like C++ or .NET need special care, handled by re.escape
        pattern = rf"\b{re.escape(skill)}\b"
        if re.search(pattern, text_lower):
            found_skills.append(skill)
            
    # Max score if 8+ skills found, otherwise proportional
    skills_score_raw = min(len(found_skills) / 8.0, 1.0) 
    
    # Missing Skills (comparing JD and Resume)
    jd_skills = []
    if jd_lower:
        for skill in TECH_SKILLS:
            if re.search(rf"\b{re.escape(skill)}\b", jd_lower):
                jd_skills.append(skill)
    
    missing_skills = [s for s in jd_skills if s not in found_skills]
    
    # 2. Section Structure (out of 5 points)
    sections = ["experience", "education", "skills", "projects", "certifications", "summary", "contact", "achievements"]
    found_sections = []
    for sec in sections:
        if re.search(rf"\b{re.escape(sec)}\b", text_lower):
            found_sections.append(sec.capitalize())
    
    structure_score_raw = min(len(found_sections) / 5.0, 1.0)

    # 3. Action Verbs & Impact (out of 10 points)
    found_verbs = []
    for verb in ACTION_VERBS:
        if re.search(rf"\b{re.escape(verb)}\b", text_lower):
            found_verbs.append(verb)
            
    verbs_score_raw = min(len(found_verbs) / 6.0, 1.0)
    
    # Check for quantified achievements
    quantified = re.findall(r'\d+%?|\d+\s?%', text_lower)
    impact_score_raw = 1.0 if len(quantified) >= 2 else (0.5 if len(quantified) == 1 else 0.0)

    action_impact_score_raw = (verbs_score_raw * 0.6) + (impact_score_raw * 0.4)

    # 4. Contact Info Extraction (Part of Formatting/Structure)
    email_match = re.search(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', resume_text)
    phone_match = re.search(r'\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', resume_text)
    linkedin_match = re.search(r'(https?://)?(www\.)?linkedin\.com/in/[A-Za-z0-9_-]+', resume_text)

    contact_info = {
        "email": email_match.group(0) if email_match else None,
        "phone": phone_match.group(0) if phone_match else None,
        "linkedin": linkedin_match.group(0) if linkedin_match else None
    }

    # 5. Formatting & keyword stuffing penalty
    formatting_score_raw = 1.0 if len(text_lower.strip()) > 500 else 0.5
    
    words = text_lower.split()
    unique_words = set(words)
    density = (len(words) - len(unique_words)) / len(words) if len(words) > 0 else 0
    penalty = 0.2 if density > 0.45 else 0.0

    # Weights aggregation (Total 60 points)
    # Skills(20), Experience(15 - placeholder), Formatting(10), Action Verbs(10), Structure(5)
    w_skills = skills_score_raw * (20/60)
    w_exp = 0.5 * (15/60) # Default mid-score for experience detection
    w_format = formatting_score_raw * (10/60)
    w_action = action_impact_score_raw * (10/60)
    w_struct = structure_score_raw * (5/60)

    total_heuristic_ratio = w_skills + w_exp + w_format + w_action + w_struct - penalty
    total_heuristic_ratio = max(0.0, min(1.0, total_heuristic_ratio))

    return float(total_heuristic_ratio), {
        "skillsDetected": found_skills,
        "missingSkills": missing_skills,
        "sectionsFound": found_sections,
        "actionVerbsFound": len(found_verbs),
        "quantifiedAchievements": len(quantified),
        "contactInfo": contact_info,
        "keywordStuffingPenalty": penalty > 0,
        "breakdown": {
            "skills": skills_score_raw,
            "structure": structure_score_raw,
            "experience": 0.3, # placeholder for deep exp parsing
            "action_verbs": action_impact_score_raw,
            "formatting": formatting_score_raw
        }
    }
