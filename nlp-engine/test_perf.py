import time
from analyzer.search import best_first_search

resume = "Experienced software engineer with expertise in Python, Java, React, Node.js, MongoDB, Docker, Kubernetes, AWS, machine learning, tensorflow, git, sql, agile, leadership"
jd = "Looking for a Python developer with experience in machine learning, docker, aws, react, sql"

t = time.time()
try:
    r = best_first_search(resume, jd)
    elapsed = time.time() - t
    score = r.get("composite_score", {}).get("final_score", 0)
    nodes = r.get("stats", {}).get("nodes_explored", 0)
    print(f"Done in {elapsed:.2f}s, score={score}, nodes={nodes}")
except Exception as e:
    elapsed = time.time() - t
    print(f"ERROR after {elapsed:.2f}s: {e}")
