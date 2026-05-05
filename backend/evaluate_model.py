import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score

# 1. Load Model & Data
print("Loading model...")
model = SentenceTransformer('all-MiniLM-L6-v2')
print("Model loaded.")

dataset = [
    # Positive pairs (Relevant)
    {"resume": "Frontend React developer with 5 years of experience in JavaScript and TypeScript.", "job": "Looking for a Senior React Developer with TS skills.", "label": 1},
    {"resume": "Python Backend Engineer skilled in Flask, Django, and PostgreSQL.", "job": "Hiring Python Developer. Requirements: Flask and SQL.", "label": 1},
    {"resume": "Data Scientist with experience in Machine Learning, Pandas, and scikit-learn.", "job": "Data Scientist needed. Must know ML and Python.", "label": 1},
    # Tricky Positive (Different terminology - will likely score low and be a False Negative)
    {"resume": "Expert in DOM manipulation, ECMAScript 6+, and state management libraries like Redux.", "job": "Hiring ReactJS Frontend Web Developer.", "label": 1},
    {"resume": "Experienced with building neural networks and predictive models using PyTorch.", "job": "Looking for an AI Researcher.", "label": 1},
    
    # Negative pairs (Irrelevant)
    {"resume": "Frontend React developer with 5 years of experience in JavaScript and TypeScript.", "job": "Hiring Python Developer. Requirements: Flask and SQL.", "label": 0},
    {"resume": "Python Backend Engineer skilled in Flask, Django, and PostgreSQL.", "job": "Looking for a Senior React Developer with TS skills.", "label": 0},
    {"resume": "Marketing Manager with 10 years of experience in SEO and Content Strategy.", "job": "Data Scientist needed. Must know ML and Python.", "label": 0},
    # Tricky Negative (Same terminology, different meaning - will likely score high and be a False Positive)
    {"resume": "Technical recruiter hiring Python and React developers for tech startups.", "job": "Hiring Python Developer. Requirements: Flask and SQL.", "label": 0},
    {"resume": "Data Scientist with experience in Machine Learning.", "job": "Hiring a Machine Learning instructor to teach beginners.", "label": 0},
]

# 2. Generate Embeddings & Similarities
resumes = [d['resume'] for d in dataset]
jobs = [d['job'] for d in dataset]
true_labels = [d['label'] for d in dataset]

print("Generating embeddings...")
resume_embs = model.encode(resumes)
job_embs = model.encode(jobs)

# Compute cosine similarity for each pair
print("Computing similarities...")
similarities = [cosine_similarity([r], [j])[0][0] for r, j in zip(resume_embs, job_embs)]
print("Raw Similarity Scores:", similarities)

# 3. Threshold Tuning Function
def evaluate_threshold(sim_scores, y_true, threshold=0.5):
    y_pred = [1 if score >= threshold else 0 for score in sim_scores]
    return {
        "threshold": threshold,
        "accuracy": accuracy_score(y_true, y_pred),
        "precision": precision_score(y_true, y_pred, zero_division=0),
        "recall": recall_score(y_true, y_pred, zero_division=0),
        "f1": f1_score(y_true, y_pred, zero_division=0)
    }

# 4. Find the best threshold
best_f1 = 0
best_metrics = {}

print("\n--- Evaluation Matrix Results ---\n")
for t in np.arange(0.3, 0.8, 0.05):
    metrics = evaluate_threshold(similarities, true_labels, threshold=t)
    print(f"Threshold: {metrics['threshold']:.2f} | Accuracy: {metrics['accuracy']:.2f} | Precision: {metrics['precision']:.2f} | Recall: {metrics['recall']:.2f} | F1 Score: {metrics['f1']:.2f}")
    if metrics["f1"] > best_f1:
        best_f1 = metrics["f1"]
        best_metrics = metrics

print("\n--- Best Performing Threshold ---")
print(f"Optimal Threshold: {best_metrics['threshold']:.2f}")
print(f"Accuracy:  {best_metrics['accuracy']:.2f}")
print(f"Precision: {best_metrics['precision']:.2f}")
print(f"Recall:    {best_metrics['recall']:.2f}")
print(f"F1 Score:  {best_metrics['f1']:.2f}")
