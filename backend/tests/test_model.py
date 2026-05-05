"""
Model unit tests — covers skill normalization, extraction, job ranking,
and candidate ranking. The BERT model is mocked via conftest.pytest_configure
so no real model download occurs. Tests verify output format and contracts,
not semantic accuracy.
"""
import sys
import os

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import model


# ── Fixtures ───────────────────────────────────────────────────────────────────

SAMPLE_JOBS = [
    {
        "title": "Python Backend Developer",
        "description": "Looking for a Python developer with Flask, PostgreSQL and Docker experience.",
        "company": "TechCorp",
        "location": "Bangalore",
        "source": "static",
        "applyUrl": "",
        "url": "",
    },
    {
        "title": "React Frontend Engineer",
        "description": "React and JavaScript frontend role. TypeScript and CSS skills preferred.",
        "company": "WebCo",
        "location": "Mumbai",
        "source": "static",
        "applyUrl": "",
        "url": "",
    },
    {
        "title": "ML Engineer",
        "description": "Machine learning role using Python, TensorFlow and scikit-learn.",
        "company": "AI Startup",
        "location": "Pune",
        "source": "static",
        "applyUrl": "",
        "url": "",
    },
]


@pytest.fixture(autouse=True)
def reset_model_state():
    """Reset global model singletons before and after each test for isolation."""
    model._static_jobs = None
    model._static_job_embeddings = None
    model.MODEL = None
    yield
    model._static_jobs = None
    model._static_job_embeddings = None
    model.MODEL = None


# ── normalize_text ─────────────────────────────────────────────────────────────

def test_normalize_text_lowercases():
    assert model.normalize_text("PYTHON Flask") == "python flask"


def test_normalize_text_nodejs_synonym():
    assert "node.js" in model.normalize_text("I use nodejs for backend")


def test_normalize_text_js_synonym():
    assert "javascript" in model.normalize_text("js developer")


def test_normalize_text_ml_synonym():
    result = model.normalize_text("ml engineer with dl skills")
    assert "machine learning" in result
    assert "deep learning" in result


def test_normalize_text_k8s_synonym():
    assert "kubernetes" in model.normalize_text("deploying with k8s on cloud")


def test_normalize_text_postgres_synonym():
    assert "postgresql" in model.normalize_text("postgres database")


def test_normalize_text_no_partial_word_expansion():
    # "py" is a synonym for "python" but only at word boundaries.
    # "deploy" contains "py" mid-word and must NOT be expanded.
    result = model.normalize_text("deploy the app")
    assert "python" not in result


# ── extract_skills ─────────────────────────────────────────────────────────────

def test_extract_skills_empty_text():
    assert model.extract_skills("") == []


def test_extract_skills_no_known_skills():
    assert model.extract_skills("Hello world, random text here") == []


def test_extract_skills_python():
    skills = model.extract_skills("Experienced Python developer")
    assert "Python" in skills


def test_extract_skills_multiple():
    skills = model.extract_skills("We use Python, React, and Docker in our stack")
    assert "Python" in skills
    assert "React" in skills
    assert "Docker" in skills


def test_extract_skills_synonym_resolved():
    # "nodejs" normalises to "node.js" which is in _SKILLS
    skills = model.extract_skills("Backend built with nodejs and MongoDB")
    skill_names = [s.lower() for s in skills]
    assert any("node" in s for s in skill_names)
    assert any("mongo" in s for s in skill_names)


def test_extract_skills_case_insensitive():
    upper = set(model.extract_skills("PYTHON REACT DOCKER"))
    lower = set(model.extract_skills("python react docker"))
    assert upper == lower


def test_extract_skills_short_skills_are_uppercase():
    # Skills with ≤3 chars (GIT, SQL, C++) should be returned in UPPER CASE
    skills = model.extract_skills("git version control, sql queries")
    if any(s.lower() == "git" for s in skills):
        assert "GIT" in skills
    if any(s.lower() == "sql" for s in skills):
        assert "SQL" in skills


def test_extract_skills_long_skills_are_title_case():
    skills = model.extract_skills("python developer with react experience")
    assert "Python" in skills
    assert "React" in skills


def test_extract_skills_sorted_alphabetically():
    skills = model.extract_skills("React Python Docker Java")
    assert skills == sorted(skills)


def test_extract_skills_no_duplicates():
    skills = model.extract_skills("Python python PYTHON is great")
    assert skills.count("Python") == 1


def test_extract_skills_does_not_partial_match():
    # "typescript" should NOT extract as two separate "type" / "script" tokens
    # Only whole-skill matches count
    skills = model.extract_skills("typescript developer")
    skill_names_lower = [s.lower() for s in skills]
    assert "typescript" in skill_names_lower
    assert "type" not in skill_names_lower


# ── rank_jobs ──────────────────────────────────────────────────────────────────

def test_rank_jobs_raises_without_init():
    with pytest.raises(RuntimeError, match="init_job_embeddings"):
        model.rank_jobs("Python developer", jobs=None, count=1)


def test_rank_jobs_returns_requested_count():
    model.init_job_embeddings(SAMPLE_JOBS)
    results = model.rank_jobs("Python developer with Flask", count=2)
    assert len(results) == 2


def test_rank_jobs_count_clamped_to_pool_size():
    model.init_job_embeddings(SAMPLE_JOBS)
    results = model.rank_jobs("Developer", count=999)
    assert len(results) == len(SAMPLE_JOBS)


def test_rank_jobs_score_in_valid_range():
    model.init_job_embeddings(SAMPLE_JOBS)
    for job in model.rank_jobs("Python Flask developer", count=3):
        assert 0 <= job["matchScore"] <= 100


def test_rank_jobs_has_required_keys():
    model.init_job_embeddings(SAMPLE_JOBS)
    job = model.rank_jobs("Python developer", count=1)[0]
    for key in ("matchScore", "missingSkills", "matchedSkills", "title", "description"):
        assert key in job, f"Missing key: {key}"


def test_rank_jobs_skill_fields_are_lists():
    model.init_job_embeddings(SAMPLE_JOBS)
    job = model.rank_jobs("Python developer", count=1)[0]
    assert isinstance(job["missingSkills"], list)
    assert isinstance(job["matchedSkills"], list)


def test_rank_jobs_does_not_mutate_original_jobs():
    original_titles = [j["title"] for j in SAMPLE_JOBS]
    model.init_job_embeddings(SAMPLE_JOBS)
    model.rank_jobs("Python developer", count=3)
    assert [j["title"] for j in SAMPLE_JOBS] == original_titles


def test_rank_jobs_with_custom_pool_skips_static_cache():
    # Passing jobs= directly should work without calling init_job_embeddings
    custom = [
        {"title": "Go Dev", "description": "Golang microservices developer",
         "company": "GoCo", "source": "live", "applyUrl": "", "url": ""}
    ]
    results = model.rank_jobs("Golang developer", jobs=custom, count=1)
    assert len(results) == 1
    assert results[0]["title"] == "Go Dev"


# ── rank_candidates ────────────────────────────────────────────────────────────

def test_rank_candidates_empty_list():
    assert model.rank_candidates("Python developer", candidates=[], count=5) == []


def test_rank_candidates_returns_correct_count():
    candidates = [
        {"id": str(i), "name": f"Candidate {i}", "resume_text": "Python developer"}
        for i in range(5)
    ]
    results = model.rank_candidates("Python developer", candidates=candidates, count=3)
    assert len(results) == 3


def test_rank_candidates_count_clamped_to_pool():
    candidates = [{"id": "1", "name": "Alice", "resume_text": "Python Flask"}]
    results = model.rank_candidates("Python developer", candidates=candidates, count=999)
    assert len(results) == 1


def test_rank_candidates_scores_in_valid_range():
    candidates = [
        {"id": "1", "name": "Alice", "resume_text": "Python Flask developer with 2 years"},
        {"id": "2", "name": "Bob",   "resume_text": "React JavaScript frontend engineer"},
    ]
    for c in model.rank_candidates("Senior Python backend developer", candidates=candidates, count=2):
        assert 0 <= c["matchScore"] <= 100


def test_rank_candidates_has_required_keys():
    candidates = [{"id": "1", "name": "Alice", "resume_text": "Python Docker developer"}]
    result = model.rank_candidates("Python developer", candidates=candidates, count=1)[0]
    for key in ("matchScore", "missingSkills", "matchedSkills"):
        assert key in result, f"Missing key: {key}"


def test_rank_candidates_preserves_original_fields():
    candidates = [{"id": "42", "name": "Alice", "email": "alice@test.com", "resume_text": "Python"}]
    result = model.rank_candidates("Python developer", candidates=candidates, count=1)[0]
    assert result["id"] == "42"
    assert result["name"] == "Alice"
    assert result["email"] == "alice@test.com"
