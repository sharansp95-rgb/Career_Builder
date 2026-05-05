"""
model.py - lightweight job recommendation using TF-IDF similarity.

Uses scikit-learn's TfidfVectorizer so the backend can run comfortably on
small-memory hosts such as Render free tier.
"""

import logging
import re
from typing import Any

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

log = logging.getLogger(__name__)

MODEL: TfidfVectorizer | None = None

# Cached TF-IDF vectors for the static job list (populated at Flask startup)
_static_job_embeddings: Any | None = None
_static_jobs: list[dict] | None = None

# Skill synonym normalisation

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
    """Lowercase the text and expand common tech abbreviations/synonyms."""
    text = text.lower()
    ordered = sorted(SYNONYMS.keys(), key=len, reverse=True)
    pattern = re.compile(
        r"\b(" + "|".join(re.escape(alias) for alias in ordered) + r")\b"
    )
    return pattern.sub(lambda match: SYNONYMS[match.group(0)], text)


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


def _job_search_text(job: dict) -> str:
    """Build the text used for both TF-IDF matching and skill extraction."""
    return " ".join(
        filter(
            None,
            [
                job.get("title", ""),
                job.get("description", ""),
                job.get("requirements", ""),
            ],
        )
    )


def _new_vectorizer() -> TfidfVectorizer:
    return TfidfVectorizer(
        lowercase=True,
        stop_words="english",
        ngram_range=(1, 2),
        max_features=8000,
        sublinear_tf=True,
    )


def extract_skills(text: str) -> list[str]:
    """
    Extract known tech skills from raw resume/job text.

    Algorithm:
        1. Normalise the text (lowercase + synonym expansion).
        2. For each skill in _SKILLS, apply a whole-word regex match.
        3. Return matched skills in title-case, sorted alphabetically.
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
    resume_embedding: Any,
    job_embedding: Any,
) -> int:
    """Hybrid score: 70% skill overlap + 30% TF-IDF cosine similarity."""
    skill_score = calculate_skill_score(resume_skills, job_skills)
    text_score = max(0.0, float(cosine_similarity(resume_embedding, job_embedding)[0][0]))
    hybrid = (0.70 * skill_score) + (0.30 * text_score)
    return round(hybrid * 100)


# Model loading

def load_model() -> TfidfVectorizer:
    """Return a lightweight TF-IDF vectorizer singleton."""
    global MODEL
    if MODEL is None:
        log.info("Initialising TF-IDF vectorizer.")
        MODEL = _new_vectorizer()
    return MODEL


def init_job_embeddings(jobs: list[dict]) -> None:
    """
    Pre-compute and cache TF-IDF vectors for the static job list.

    Kept under the old function name so startup code does not need to change.
    """
    global MODEL, _static_job_embeddings, _static_jobs
    MODEL = _new_vectorizer()
    job_texts = [_job_search_text(job) for job in jobs]
    log.info("Fitting TF-IDF vectorizer for %d static jobs.", len(jobs))
    _static_job_embeddings = MODEL.fit_transform(job_texts)
    _static_jobs = jobs
    log.info("Static job TF-IDF vectors ready.")


# Ranking

def rank_jobs(
    resume_text: str,
    jobs: list[dict] | None = None,
    count: int = 5,
    resume_skills: list[str] | None = None,
) -> list[dict]:
    """
    Rank jobs by hybrid skill overlap and TF-IDF text similarity.

    Returns job dicts sorted by descending matchScore, each enriched with
    ``matchScore`` (int 0-100), ``matchedSkills`` and ``missingSkills``.
    """
    if jobs is None:
        if _static_jobs is None or _static_job_embeddings is None or MODEL is None:
            raise RuntimeError("Static job vectors not initialised - call init_job_embeddings() first.")
        job_pool = _static_jobs
        job_vectors = _static_job_embeddings
        vectorizer = MODEL
        resume_vector = vectorizer.transform([resume_text])
    else:
        job_pool = jobs
        job_texts = [_job_search_text(job) for job in job_pool]
        vectorizer = _new_vectorizer()
        vectors = vectorizer.fit_transform([resume_text, *job_texts])
        resume_vector = vectors[0]
        job_vectors = vectors[1:]

    count = min(count, len(job_pool))
    user_skills = resume_skills if resume_skills else extract_skills(resume_text)
    user_lower = set(s.lower().strip() for s in user_skills)

    results: list[dict] = []
    for idx, job in enumerate(job_pool):
        job_copy = job.copy()
        job_skills = extract_skills(_job_search_text(job))
        job_lower_map = {s.lower().strip(): s for s in job_skills}
        job_lower_set = set(job_lower_map)

        job_copy["matchScore"] = calculate_match_score(
            user_skills, job_skills, resume_vector, job_vectors[idx]
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
    Rank candidates against a job description using skill overlap and TF-IDF text similarity.
    """
    if not candidates:
        return []

    candidate_texts = [candidate.get("resume_text", "") for candidate in candidates]
    vectorizer = _new_vectorizer()
    vectors = vectorizer.fit_transform([job_query, *candidate_texts])
    query_vector = vectors[0]
    candidate_vectors = vectors[1:]
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

        skill_score = len(matched_lower) / len(job_lower_set) if job_lower_set else 0.0
        text_score = max(0.0, float(cosine_similarity(candidate_vectors[idx], query_vector)[0][0]))
        candidate_copy["matchScore"] = round((0.90 * skill_score + 0.10 * text_score) * 100)

        results.append(candidate_copy)

    results.sort(key=lambda x: x["matchScore"], reverse=True)
    return results[:count]
