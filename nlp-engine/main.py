"""
main.py — TalentLens NLP Engine (FastAPI)
==========================================
Exposes the Best-First Search + heuristic ATS analysis via REST endpoints.
"""

import io
import logging
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

try:
    import pdfplumber
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False

from analyzer.search import best_first_search
from analyzer.heuristics import composite_heuristic, extract_skills, education_score
from analyzer.similarity import compute_similarity_score

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("talentlens")

app = FastAPI(
    title="TalentLens NLP Engine",
    description="Best-First Search powered ATS resume analyzer",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class TextAnalysisRequest(BaseModel):
    resume_text: str
    jd_text: str = ""


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def extract_pdf_text(file_bytes: bytes) -> str:
    """Extract plain text from PDF bytes using pdfplumber."""
    if not PDF_AVAILABLE:
        raise HTTPException(status_code=500, detail="pdfplumber not installed.")
    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            pages = [page.extract_text() or "" for page in pdf.pages]
        return "\n".join(pages).strip()
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"PDF extraction failed: {e}")


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/")
def root():
    return {
        "service":   "TalentLens NLP Engine",
        "algorithm": "Best-First Search (Greedy Heuristic)",
        "status":    "running",
    }


@app.get("/health")
def health():
    return {"status": "ok", "pdf_support": PDF_AVAILABLE}


@app.post("/analyze")
def analyze_text(req: TextAnalysisRequest):
    """
    Full ATS analysis via Best-First Search + composite heuristic.
    Accepts plain text (used when frontend extracts PDF text client-side).
    """
    if not req.resume_text.strip():
        raise HTTPException(status_code=400, detail="resume_text is required.")

    logger.info("Running Best-First Search analysis...")

    # 1. Best-First Search (core algorithm)
    search_result = best_first_search(req.resume_text, req.jd_text)

    # 2. Cosine similarity
    sim = compute_similarity_score(req.resume_text, req.jd_text or req.resume_text)

    matched_skills = search_result.get("best_match", {}).get("matched_skills", [])
    missing_skills = search_result.get("best_match", {}).get("missing_skills", [])

    total_skills = len(matched_skills) + len(missing_skills)
    similarity_score = sim.get("cosine_score", 0)
    final_score = search_result.get("composite_score", {}).get("final_score", 0)

    breakdown = search_result.get("composite_score", {}).get("breakdown", {})

    breakdown_lines = []
    for key, val in breakdown.items():
        label = key.replace("_", " ").title()
        score_pct = val.get("score", 0)
        weight_pct = round(val.get("weight", 0) * 100)
        breakdown_lines.append(f"    • {label}: {score_pct:.1f}% (weight {weight_pct}%)")

    explanation_text = f"""The resume scored {final_score}% based on multi-factor heuristic evaluation:

  Skills: {len(matched_skills)} of {total_skills} JD skills matched
  Keyword Similarity: {similarity_score:.2f}
  Best-First Search explored {search_result.get('stats', {}).get('nodes_explored', 0)} nodes

  Score Breakdown:\n""" + "\n".join(breakdown_lines)

    if missing_skills:
        explanation_text += f"\n\n  Top Missing Skills: {', '.join(missing_skills[:5])}"

    return {
        "success": True,
        "search":  search_result,
        "similarity": sim,
        "score":   search_result.get("composite_score", {}).get("final_score", 0),
        "explanationText": explanation_text
    }


@app.post("/analyze/pdf")
async def analyze_pdf(
    resume: UploadFile = File(...),
    jd_text: str = Form(default=""),
):
    """
    Upload a PDF resume; server extracts text and runs Best-First Search.
    """
    if not resume.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    file_bytes = await resume.read()
    resume_text = extract_pdf_text(file_bytes)

    if not resume_text:
        raise HTTPException(status_code=422, detail="Could not extract text from PDF.")

    logger.info(f"PDF extracted: {len(resume_text)} chars. Running search...")

    search_result = best_first_search(resume_text, jd_text)
    sim = compute_similarity_score(resume_text, jd_text or resume_text)

    return {
        "success":     True,
        "resume_text": resume_text[:500] + "..." if len(resume_text) > 500 else resume_text,
        "search":      search_result,
        "similarity":  sim,
        "score":       search_result.get("composite_score", {}).get("final_score", 0),
    }


@app.post("/skills")
def extract_skills_endpoint(req: TextAnalysisRequest):
    """Quick endpoint to extract and compare skills only."""
    resume_skills = extract_skills(req.resume_text)
    jd_skills = extract_skills(req.jd_text) if req.jd_text else []
    matched = list(set(resume_skills) & set(jd_skills))
    missing = list(set(jd_skills) - set(resume_skills))
    return {
        "resume_skills": resume_skills,
        "jd_skills":     jd_skills,
        "matched":       matched,
        "missing":       missing,
        "match_rate":    round(len(matched) / max(len(jd_skills), 1) * 100, 1),
    }


@app.post("/heuristic")
def heuristic_only(req: TextAnalysisRequest):
    """Returns only the composite heuristic breakdown (no search)."""
    result = composite_heuristic(req.resume_text, req.jd_text)
    return result


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)