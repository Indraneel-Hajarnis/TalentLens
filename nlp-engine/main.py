from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import pdfplumber
import json

from analyzer.similarity import calculate_similarity
from analyzer.heuristics import evaluate_resume

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
import io

async def extract_text_from_pdf(file: UploadFile) -> str:
    text = ""
    file_bytes = await file.read()
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return text

@app.post("/score")
async def score_resume(
    resume: UploadFile = File(...),
    jobDescription: Optional[str] = Form(None)
):
    # 1. Parse PDF
    text = await extract_text_from_pdf(resume)
    
    # 2. Similarity Models (40% Weight for Keyword Match)
    similarity_score = 0
    keyword_details = {}
    if jobDescription:
        similarity_score, keyword_details = calculate_similarity(text, jobDescription)
    else:
        similarity_score = 0 # No Job Description provided

    # 3. Heuristics Models (Skills, Experience formatting, Action Verbs, Structure)
    heuristic_score, h_details = evaluate_resume(text, jobDescription)

    # 4. Final Score Assembly (Based on README weights)
    # 40% Keyword, 20% Skills, 15% Experience, 10% Formatting, 10% Action Verbs, 5% Structure
    # Similarity handles Keyword (40)
    # Heuristics handle the rest (60)
    
    # We will compute a 0-100 score in total

    final_score = int(similarity_score * 40 + heuristic_score * 60)
    
    return {
        "totalScore": final_score,
        "parsedText": text[:500], # return a snippet
        "scoreDetails": {
            "similarityMatch": similarity_score,
            "heuristicEvaluation": h_details,
            "keywords": keyword_details
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
