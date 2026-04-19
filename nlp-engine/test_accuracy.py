"""
test_accuracy.py - Discrimination test for the updated heuristic engine.
Run: python test_accuracy.py
"""
from analyzer.heuristics import composite_heuristic

JD = """
Senior Python Backend Engineer. Requirements: Python, Django, REST API, PostgreSQL, Docker, AWS, Redis,
CI/CD, microservices, 3+ years experience. Strong knowledge of Git, pytest, system design.
"""

MATCHING_RESUME = """
John Doe | john@example.com | +91-9876543210 | linkedin.com/in/johndoe | github.com/johndoe

SUMMARY
Python backend engineer with 4 years experience building scalable REST APIs and microservices.

EXPERIENCE
Senior Software Engineer - ABC Corp (2021-2024)
- Developed Django REST API serving 500k users, improving latency by 40%
- Deployed microservices on AWS ECS using Docker and CI/CD pipelines
- Optimized PostgreSQL queries, reducing query time by 60%
- Implemented Redis caching layer, boosting performance 3x
- Led team of 5 engineers, mentored junior developers

SKILLS: Python, Django, REST API, PostgreSQL, Docker, AWS, Redis, Git, pytest, Linux

EDUCATION: B.Tech Computer Science, 2020
"""

MISMATCHED_RESUME = """
Jane Smith | jane@example.com | linkedin.com/in/janesmith

SUMMARY
Marketing professional with 3 years experience in brand management and social media.

EXPERIENCE
Marketing Manager - XYZ Brand (2021-2024)
- Created and managed social media campaigns increasing engagement by 50%
- Led content strategy resulting in 30% growth in followers
- Collaborated with cross-functional teams on product launches
- Managed advertising budget of $200k

SKILLS: Social Media, Content Writing, SEO, Google Analytics, Photoshop, Excel

EDUCATION: MBA Marketing, 2020
"""

r1 = composite_heuristic(MATCHING_RESUME, JD)
r2 = composite_heuristic(MISMATCHED_RESUME, JD)

print(f"Matching resume score:   {r1['final_score']}%")
print(f"Mismatched resume score: {r2['final_score']}%")
print(f"Discrimination gap:      {r1['final_score'] - r2['final_score']:.1f} points")
print()
print("Matching breakdown:")
for k, v in r1["breakdown"].items():
    print(f"  {k:<20} {v['score']:>6.1f}%  (w={round(v['weight']*100)}%)")
print()
print("Mismatched breakdown:")
for k, v in r2["breakdown"].items():
    print(f"  {k:<20} {v['score']:>6.1f}%  (w={round(v['weight']*100)}%)")
