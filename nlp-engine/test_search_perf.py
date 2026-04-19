"""Quick performance test for the optimized Best-First Search."""
import time
from analyzer.search import best_first_search

RESUME = """
Experienced Full Stack Developer with 8 years of experience in Python Django
Flask React JavaScript TypeScript Node.js Express MongoDB PostgreSQL Redis
Docker Kubernetes AWS Azure GCP CI/CD Git Jenkins Terraform Ansible.
Built microservices architecture for fintech platform handling 10M users.
Led team of 12 engineers. Improved API performance by 60% using caching
and optimization techniques. Implemented machine learning models with
PyTorch TensorFlow for fraud detection. Created data pipelines with
Apache Spark and Airflow. Email: developer@gmail.com Phone: +1-555-123-4567
linkedin.com/in/developer Education: M.S. Computer Science from MIT.
Skills: Python Java C++ Go Rust React Angular Vue Next.js Django Flask
FastAPI Spring Boot Docker Kubernetes AWS Azure GraphQL REST APIs Kafka
RabbitMQ Elasticsearch Agile Scrum Leadership Communication
"""

JD = """
Looking for a Senior Python developer with experience in Django, REST APIs,
Docker, Kubernetes, AWS, React, microservices, CI/CD, machine learning,
and data engineering. Must have experience with PostgreSQL, Redis, and
message queues like Kafka.
"""

t0 = time.time()
result = best_first_search(RESUME, JD)
elapsed = time.time() - t0

print(f"Time:      {elapsed:.3f}s")
print(f"Score:     {result['composite_score']['final_score']}")
print(f"Nodes:     {result['stats']['nodes_explored']}")
print(f"Goal:      {result['goal_reached']}")
print(f"Matched:   {result['best_match']['matched_skills']}")
print(f"Missing:   {result['best_match']['missing_skills']}")
print(f"Trace len: {len(result['search_trace'])}")
