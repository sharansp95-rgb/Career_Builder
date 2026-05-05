"""
model.py — BERT-based job recommendation using sentence-transformers.

Loads the SentenceTransformer model once at startup, pre-computes embeddings
for the static job list, and ranks jobs/candidates via cosine similarity.
"""

import logging
import re

import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

log = logging.getLogger(__name__)

_MODEL_NAME = "all-MiniLM-L6-v2"
MODEL: SentenceTransformer | None = None

# Cached embeddings for the static job list (populated at Flask startup)
_static_job_embeddings: np.ndarray | None = None
_static_jobs: list[dict] | None = None

# ── Skill synonym normalisation ────────────────────────────────────────────────

SYNONYMS: dict[str, str] = {
    "nodejs": "node.js",
    "node js": "node.js",
    "reactjs": "react",
    "react js": "react",
    "vuejs": "vue",
    "vue js": "vue",
    "ml": "machine learning",
    "ai": "artificial intelligence",
    "dl": "deep learning",
    "nlp": "natural language processing",
    "postgres": "postgresql",
    "mongo": "mongodb",
    "k8s": "kubernetes",
    "tf": "tensorflow",
    "js": "javascript",
    "ts": "typescript",
    "py": "python",
}


def normalize_text(text: str) -> str:
    """Lowercase the text and expand common tech abbreviations/synonyms.

    Uses a single-pass combined regex so that canonical forms (e.g. "node.js")
    cannot be re-matched by a shorter alias (e.g. "js") in the same call.
    """
    text = text.lower()
    # Longest aliases first so "nodejs" wins over "js" when both could match
    ordered = sorted(SYNONYMS.keys(), key=len, reverse=True)
    pattern = re.compile(
        r"\b(" + "|".join(re.escape(a) for a in ordered) + r")\b"
    )
    return pattern.sub(lambda m: SYNONYMS[m.group(0)], text)


_SKILLS: list[str] = [
    "python", "java", "c++", "c#", "javascript", "typescript",
    "react", "next.js", "node.js", "express", "flask", "django",
    "fastapi", "vue", "angular", "html", "css", "tailwind",
    "sql", "mysql", "postgresql", "mongodb", "redis", "sqlite",
    "aws", "azure", "gcp", "docker", "kubernetes", "terraform",
    "tensorflow", "pytorch", "scikit-learn", "pandas", "numpy",
    "machine learning", "deep learning", "natural language processing",
    "artificial intelligence", "computer vision",
    "spacy", "transformers", "git", "linux", "rest api", "graphql",
    "figma", "swift", "kotlin", "android", "ios",
    "spring boot", "microservices", "ci/cd", "agile", "scrum",
]


def extract_skills(text: str) -> list[str]:
    """
    Extract known tech skills from raw resume/job text.

    Algorithm:
        1. Normalise the text (lowercase + synonym expansion).
        2. For each skill in _SKILLS, apply a whole-word regex match.
        3. Return matched skills in title-case, sorted alphabetically.

    Args:
        text: Raw string from a resume PDF or job description.

    Returns:
        Sorted list of matched skill strings in display format.
    """
    normalised = normalize_text(text)
    found: set[str] = set()
    for skill in _SKILLS:
        pattern = re.escape(skill).replace(r"\.", r"[.\s]+")
        if re.search(rf"(?<![a-z0-9]){pattern}(?![a-z0-9])", normalised):
            found.add(skill)
    return [skill.upper() if len(skill) <= 3 else skill.title() for skill in sorted(found)]


def calculate_skill_score(resume_skills: list[str], job_skills: list[str]) -> float:
    """Return the fraction of job-required skills covered by the resume."""
    if not job_skills:
        return 0.0
    resume_set = set(s.lower().strip() for s in resume_skills)
    job_set = set(s.lower().strip() for s in job_skills)
    matched = resume_set.intersection(job_set)
    return len(matched) / len(job_set)


def calculate_match_score(
    resume_skills: list[str],
    job_skills: list[str],
    resume_embedding: np.ndarray,
    job_embedding: np.ndarray,
) -> int:
    """Hybrid score: 70% skill overlap + 30% BERT cosine similarity → int 0-100."""
    skill_score = calculate_skill_score(resume_skills, job_skills)
    r = np.array(resume_embedding).reshape(1, -1)
    j = np.array(job_embedding).reshape(1, -1)
    bert_score = max(0.0, float(cosine_similarity(r, j)[0][0]))
    hybrid = (0.70 * skill_score) + (0.30 * bert_score)
    return round(hybrid * 100)


# ── Model loading ──────────────────────────────────────────────────────────────

def load_model() -> SentenceTransformer:
    """Lazily load and return the SentenceTransformer singleton."""
    global MODEL
    if MODEL is None:
        log.info("Loading BERT model: %s …", _MODEL_NAME)
        MODEL = SentenceTransformer(_MODEL_NAME)
        log.info("BERT model loaded.")
    return MODEL


def init_job_embeddings(jobs: list[dict]) -> None:
    """
    Pre-compute and cache BERT embeddings for the static job list.

    Call this once at Flask startup so recommendation requests reuse the
    cached embeddings instead of re-encoding on every HTTP call.

    Args:
        jobs: List of job dicts; each must have a ``description`` key.
    """
    global _static_job_embeddings, _static_jobs
    model = load_model()
    descriptions = [job["description"] for job in jobs]
    log.info("Pre-computing embeddings for %d static jobs …", len(jobs))
    _static_job_embeddings = model.encode(descriptions, convert_to_numpy=True, show_progress_bar=False)
    _static_jobs = jobs
    log.info("Static job embeddings ready.")


# ── Ranking ────────────────────────────────────────────────────────────────────

def rank_jobs(
    resume_text: str,
    jobs: list[dict] | None = None,
    count: int = 5,
    resume_skills: list[str] | None = None,
) -> list[dict]:
    """
    Rank jobs by cosine similarity between resume and job description embeddings.

    Algorithm:
        1. Encode ``resume_text`` with the BERT model.
        2. Compute cosine similarity against pre-cached (or freshly encoded) job embeddings.
        3. Take the top-``count`` results; attach matchScore (0-100) and missingSkills.

    Args:
        resume_text:   Raw resume text or comma-joined skill list.
        jobs:          Job pool to rank. Uses pre-cached static jobs when None.
        count:         Number of top results to return (clamped to pool size).
        resume_skills: Skills already extracted from the resume (avoids re-extraction).

    Returns:
        List of job dicts sorted by descending matchScore, each enriched with
        ``matchScore`` (int 0-100) and ``missingSkills`` (list[str]).
    """
    model = load_model()

    if jobs is None:
        if _static_jobs is None or _static_job_embeddings is None:
            raise RuntimeError("Static job embeddings not initialised — call init_job_embeddings() first.")
        job_pool = _static_jobs
        job_embs = _static_job_embeddings
    else:
        descriptions = [job["description"] for job in jobs]
        job_embs = model.encode(descriptions, convert_to_numpy=True, show_progress_bar=False)
        job_pool = jobs

    resume_emb = model.encode([resume_text], convert_to_numpy=True, show_progress_bar=False)

    count = min(count, len(job_pool))
    user_skills = resume_skills if resume_skills else extract_skills(resume_text)
    user_lower = set(s.lower().strip() for s in user_skills)

    results: list[dict] = []
    for idx, job in enumerate(job_pool):
        job_copy = job.copy()
        job_text = " ".join(filter(None, [
            job.get("title", ""),
            job.get("description", ""),
            job.get("requirements", ""),
        ]))
        job_skills = extract_skills(job_text)
        job_lower_map = {s.lower().strip(): s for s in job_skills}
        job_lower_set = set(job_lower_map)

        job_copy["matchScore"] = calculate_match_score(
            user_skills, job_skills, resume_emb[0], job_embs[idx]
        )
        matched_lower = user_lower & job_lower_set
        job_copy["matchedSkills"] = sorted(job_lower_map[k] for k in matched_lower)
        job_copy["missingSkills"] = sorted(
            v for k, v in job_lower_map.items() if k not in user_lower
        )
        results.append(job_copy)

    results.sort(key=lambda x: x["matchScore"], reverse=True)
    return results[:count]


def rank_candidates(job_query: str, candidates: list[dict], count: int = 10) -> list[dict]:
    """
    Rank candidates against a job description using BERT cosine similarity.

    Algorithm:
        1. Encode each candidate's ``resume_text`` with BERT.
        2. Encode the ``job_query`` and compute cosine similarity.
        3. Return the top-``count`` candidates sorted by descending matchScore.

    Args:
        job_query:  Job title + requirements text entered by recruiter.
        candidates: List of candidate dicts, each with a ``resume_text`` field.
        count:      Maximum number of results (clamped to candidate pool size).

    Returns:
        List of candidate dicts enriched with ``matchScore``, ``matchedSkills``,
        and ``missingSkills``.
    """
    model = load_model()

    if not candidates:
        return []

    candidate_texts = [c.get("resume_text", "") for c in candidates]
    candidate_embs = model.encode(candidate_texts, convert_to_numpy=True, show_progress_bar=False)

    query_emb = model.encode([job_query], convert_to_numpy=True, show_progress_bar=False)
    count = min(count, len(candidates))

    job_skills = extract_skills(job_query)
    job_lower_map = {s.lower().strip(): s for s in job_skills}
    job_lower_set = set(job_lower_map)

    results: list[dict] = []
    for idx, candidate in enumerate(candidates):
        candidate_copy = candidate.copy()
        candidate_skills = extract_skills(candidate.get("resume_text", ""))
        candidate_lower = set(s.lower().strip() for s in candidate_skills)

        matched_lower = candidate_lower & job_lower_set
        candidate_copy["matchedSkills"] = sorted(job_lower_map[k] for k in matched_lower)
        candidate_copy["missingSkills"] = sorted(
            v for k, v in job_lower_map.items() if k not in candidate_lower
        )

        # Score = fraction of required skills the candidate covers.
        # BERT similarity between a short skill query and a full resume document is
        # unreliable and drags the score far below the intuitive skill-coverage number,
        # so skill overlap is the primary signal (90%) with BERT as a tiebreaker (10%).
        skill_score = len(matched_lower) / len(job_lower_set) if job_lower_set else 0.0
        r = candidate_embs[idx].reshape(1, -1)
        q = query_emb[0].reshape(1, -1)
        bert_score = max(0.0, float(cosine_similarity(r, q)[0][0]))
        candidate_copy["matchScore"] = round((0.90 * skill_score + 0.10 * bert_score) * 100)

        results.append(candidate_copy)

    results.sort(key=lambda x: x["matchScore"], reverse=True)
    return results[:count]
