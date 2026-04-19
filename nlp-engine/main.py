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

    total_jd_skills = len(matched_skills) + len(missing_skills)
    similarity_score = sim.get("cosine_score", 0)
    final_score = search_result.get("composite_score", {}).get("final_score", 0)
    breakdown = search_result.get("composite_score", {}).get("breakdown", {})
    details   = search_result.get("composite_score", {}).get("details", {})

    # ── Structured report generation ─────────────────────────────────────────
    has_jd = bool(req.jd_text.strip())

    # Overall verdict label
    if final_score >= 75:
        verdict = "Strong Match"
        verdict_detail = "This resume is well-aligned with the job description."
    elif final_score >= 55:
        verdict = "Good Match"
        verdict_detail = "This resume covers most key requirements with some gaps to address."
    elif final_score >= 35:
        verdict = "Partial Match"
        verdict_detail = "Significant skill or keyword gaps exist between this resume and the JD."
    else:
        verdict = "Weak Match"
        verdict_detail = "This resume has limited alignment with the job requirements."

    # Identify top 3 strengths (highest scoring sub-components)
    strengths = []
    sorted_bd = sorted(breakdown.items(), key=lambda x: x[1]["score"], reverse=True)
    for key, val in sorted_bd[:3]:
        label = key.replace("_", " ").title()
        strengths.append(f"{label}: {val['score']:.1f}%")

    # Identify top 3 critical gaps (lowest scoring components with notable weight)
    gaps = []
    sorted_low = sorted(breakdown.items(), key=lambda x: x[1]["score"] * x[1]["weight"])
    for key, val in sorted_low[:3]:
        label = key.replace("_", " ").title()
        gaps.append(f"{label}: {val['score']:.1f}% (weight {round(val['weight']*100)}%)")

    # Specific skill gap context
    skill_gap_text = ""
    if has_jd and missing_skills:
        top_missing = missing_skills[:5]
        skill_gap_text = f"Top missing JD skills: {', '.join(top_missing)}."
        if len(missing_skills) > 5:
            skill_gap_text += f" (+{len(missing_skills) - 5} more)"
    elif has_jd and not missing_skills and matched_skills:
        skill_gap_text = "All detected JD skills are present in the resume."

    # Keyword context
    kw_details = details.get("keyword", {})
    keyword_context = ""
    if kw_details.get("matched_keywords"):
        top_kw = kw_details["matched_keywords"][:6]
        keyword_context = f"Strong contextual keywords found: {', '.join(top_kw)}."
    if kw_details.get("missing_keywords"):
        miss_kw = kw_details["missing_keywords"][:5]
        keyword_context += f" Missing key terms: {', '.join(miss_kw)}."

    # Actionable suggestions
    suggestions = []
    fmt_d = details.get("formatting", {})
    av_d  = details.get("action_verbs", {})
    qa_d  = details.get("achievements", {})
    st_d  = details.get("structure", {})

    if not fmt_d.get("has_email"):
        suggestions.append("Add a professional email address — ATS parsers require it for contact extraction.")
    if not fmt_d.get("has_phone"):
        suggestions.append("Include a direct phone number for recruiter outreach.")
    if not fmt_d.get("has_linkedin"):
        suggestions.append("Add your LinkedIn profile URL to increase profile credibility.")
    if (av_d.get("count", 0)) < 5:
        suggestions.append(
            f"Strengthen with action verbs (currently {av_d.get('count', 0)} found; aim for 8+). "
            "E.g., 'Implemented', 'Optimized', 'Led', 'Deployed'."
        )
    if (qa_d.get("achievement_count", 0)) < 3:
        suggestions.append(
            "Quantify achievements: use metrics like %, $, or × multipliers to show measurable impact."
        )
    if missing_skills:
        suggestions.append(f"Bridge skill gaps by adding: {', '.join(missing_skills[:4])}.")
    if st_d.get("missing_sections"):
        miss_sec = st_d["missing_sections"][:3]
        suggestions.append(f"Consider adding missing sections: {', '.join(s.title() for s in miss_sec)}.")
    if details.get("stuffing", {}).get("stuffed"):
        suggestions.append("Reduce keyword repetition — unnatural density may trigger ATS spam filters.")

    # Build the structured report summary
    report_lines = [
        f"OVERALL: {verdict} — {final_score:.1f}%",
        f"{verdict_detail}",
        "",
    ]

    if strengths:
        report_lines.append("STRENGTHS")
        for s in strengths:
            report_lines.append(f"  ✓ {s}")
        report_lines.append("")

    if gaps:
        report_lines.append("CRITICAL GAPS")
        for g in gaps:
            report_lines.append(f"  ✗ {g}")
        report_lines.append("")

    if skill_gap_text:
        report_lines.append(f"SKILL ALIGNMENT ({len(matched_skills)}/{total_jd_skills} JD skills matched)")
        report_lines.append(f"  {skill_gap_text}")
        report_lines.append("")

    if keyword_context:
        report_lines.append("KEYWORD CONTEXT")
        report_lines.append(f"  {keyword_context}")
        report_lines.append("")

    if suggestions:
        report_lines.append("RECOMMENDATIONS")
        for i, tip in enumerate(suggestions, 1):
            report_lines.append(f"  {i}. {tip}")

    report_summary = "\n".join(report_lines)

    # Legacy explanation text (kept for backwards compat)
    breakdown_lines = []
    for key, val in breakdown.items():
        label = key.replace("_", " ").title()
        score_pct = val.get("score", 0)
        weight_pct = round(val.get("weight", 0) * 100)
        breakdown_lines.append(f"    • {label}: {score_pct:.1f}% (weight {weight_pct}%)")

    explanation_text = f"""The resume scored {final_score}% based on multi-factor heuristic evaluation:

  Skills: {len(matched_skills)} of {total_jd_skills} JD skills matched
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
        "explanationText": explanation_text,
        "reportSummary": report_summary,
        "verdict": verdict,
        "strengths": strengths,
        "gaps": gaps,
        "suggestions": suggestions,
    }


@app.post("/analyze/pdf")
async def analyze_pdf(
    resume: UploadFile = File(...),
    jd_text: str = Form(default=""),
):
    """
    Upload a PDF resume; server extracts text and runs Best-First Search.
    Returns full structured report identical to /analyze.
    """
    if not resume.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    file_bytes = await resume.read()
    resume_text = extract_pdf_text(file_bytes)

    if not resume_text:
        raise HTTPException(status_code=422, detail="Could not extract text from PDF.")

    logger.info(f"PDF extracted: {len(resume_text)} chars. Running search...")

    # Delegate to the same analysis logic as /analyze by constructing a request
    req = TextAnalysisRequest(resume_text=resume_text, jd_text=jd_text)
    result = analyze_text(req)

    # Attach truncated preview of the extracted text for the frontend to display
    result["resume_text"] = resume_text[:500] + "..." if len(resume_text) > 500 else resume_text
    return result


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