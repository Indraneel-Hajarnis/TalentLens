"""
test_nlp_scenario.py - Tests NLP JD scenario with PDF text artifacts.
"""
from analyzer.heuristics import composite_heuristic, normalize_resume_text, action_verb_score, extract_skills

BAD_PDF = (
    "John\u00a0Doe | john@example.com | +91-9876543210\u00a0| linkedin.com/in/johndoe\n\n"
    "\u2022Developed NLP pipelines using spaCy and NLTK for text classification\n"
    "\u2022Built BERT\u2014fine-tuned sentiment analysis models with 95% accuracy\n"
    "\u2022Implemented named entity recognition with Transformers library\n"
    "\u2022Analyzed large datasets using Python, Pandas, NumPy\n"
    "\u2022Trained and deployed machine learning models on AWS SageMaker\n"
    "\u2013Responsible for data preprocessing, tokenization, lemmatization\n\n"
    "Skills: Python, NLP, BERT, spaCy, NLTK, PyTorch, scikit-learn, SQL\n\n"
    "Education: B.Tech CSE (AI/ML), 2022\n"
)

NLP_JD = (
    "We are looking for an NLP Engineer with:\n"
    "- Experience in natural language processing and text classification\n"
    "- Proficiency in Python, spaCy, NLTK, Transformers library\n"
    "- Knowledge of sentiment analysis, named entity recognition (NER)\n"
    "- Familiarity with BERT, GPT, and other language models\n"
    "- Experience with deep learning frameworks like PyTorch or TensorFlow\n"
    "- Strong background in machine learning, feature engineering\n"
    "- Experience with data pipelines and model deployment\n"
)

print("=== Skills found in resume (raw, before normalize) ===")
skills_raw = extract_skills(BAD_PDF)
print(f"  {len(skills_raw)} skills: {skills_raw}")
print()

print("=== Skills found in resume (after normalize) ===")
norm = normalize_resume_text(BAD_PDF)
print("  Normalized snippet:", repr(norm[:200]))
skills_norm = extract_skills(norm)
print(f"  {len(skills_norm)} skills: {skills_norm}")
print()

print("=== Action verbs ===")
av = action_verb_score(norm)
print(f"  Found {av['count']} verbs: {av['found_verbs']}")
print()

print("=== Full analysis (NLP resume vs NLP JD) ===")
r = composite_heuristic(BAD_PDF, NLP_JD)
print(f"  Final Score: {r['final_score']}%")
for k, v in r["breakdown"].items():
    print(f"  {k:<22} {v['score']:>6.1f}%  (w={round(v['weight']*100)}%)")
