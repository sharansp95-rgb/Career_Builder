"""
Flask HTTP endpoint tests — uses the flask_client fixture from conftest.py
which provides an isolated test DB and a mocked BERT model.
Tests verify status codes, response shapes, and auth enforcement.
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import numpy as np
import auth as auth_module
import model as model_module


# ── Helpers ────────────────────────────────────────────────────────────────────

def _register(client, email="user@test.com", password="Password1",
              role="job_seeker", name="Test User"):
    return client.post("/api/auth/register", json={
        "name": name, "email": email, "password": password, "role": role,
    })


def _force_verify(email: str):
    conn = auth_module.get_db_connection()
    try:
        conn.execute("UPDATE users SET is_verified=1, verified=1 WHERE email=?", (email,))
        conn.commit()
    finally:
        conn.close()


def _login(client, email="user@test.com", password="Password1"):
    return client.post("/api/auth/login", json={"email": email, "password": password})


def _get_token(client, email="user@test.com", password="Password1", role="job_seeker"):
    """Register → force-verify → login. Returns the JWT string."""
    _register(client, email=email, password=password, role=role)
    _force_verify(email)
    resp = _login(client, email=email, password=password)
    return resp.get_json()["token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ── Health ─────────────────────────────────────────────────────────────────────

def test_index(flask_client):
    resp = flask_client.get("/")
    assert resp.status_code == 200
    assert b"running" in resp.data.lower()


def test_health_check(flask_client):
    resp = flask_client.get("/health")
    assert resp.status_code == 200
    assert resp.get_json()["status"] == "healthy"


# ── Register ───────────────────────────────────────────────────────────────────

def test_register_no_body(flask_client):
    resp = flask_client.post("/api/auth/register")
    assert resp.status_code == 400


def test_register_missing_fields(flask_client):
    resp = flask_client.post("/api/auth/register", json={"name": "Alice"})
    assert resp.status_code == 400


def test_register_password_too_short(flask_client):
    resp = _register(flask_client, password="abc")
    assert resp.status_code == 400


def test_register_success(flask_client):
    resp = _register(flask_client)
    assert resp.status_code == 201
    data = resp.get_json()
    # Either email-verification flow or immediate token — both are valid
    assert data.get("requires_verification") is True or "token" in data


def test_register_duplicate_email(flask_client):
    _register(flask_client, email="dup@test.com")
    _force_verify("dup@test.com")  # backend only blocks duplicates after verification
    resp = _register(flask_client, email="dup@test.com")
    assert resp.status_code == 409


# ── Login ──────────────────────────────────────────────────────────────────────

def test_login_no_body(flask_client):
    resp = flask_client.post("/api/auth/login")
    assert resp.status_code == 400


def test_login_missing_password(flask_client):
    resp = flask_client.post("/api/auth/login", json={"email": "x@x.com"})
    assert resp.status_code == 400


def test_login_unknown_email(flask_client):
    resp = _login(flask_client, email="ghost@test.com")
    assert resp.status_code == 401


def test_login_wrong_password(flask_client):
    _register(flask_client)
    _force_verify("user@test.com")
    resp = _login(flask_client, password="BadPass999")
    assert resp.status_code == 401


def test_login_unverified_user(flask_client):
    _register(flask_client)   # registered but NOT verified
    resp = _login(flask_client)
    assert resp.status_code == 401


def test_login_success(flask_client):
    _register(flask_client)
    _force_verify("user@test.com")
    resp = _login(flask_client)
    assert resp.status_code == 200
    data = resp.get_json()
    assert "token" in data
    assert "user" in data
    assert data["user"]["email"] == "user@test.com"


def test_login_sets_auth_cookie(flask_client):
    _register(flask_client)
    _force_verify("user@test.com")
    resp = _login(flask_client)
    assert resp.status_code == 200
    assert "auth_token" in resp.headers.get("Set-Cookie", "")


# ── Logout ─────────────────────────────────────────────────────────────────────

def test_logout_succeeds_without_token(flask_client):
    resp = flask_client.post("/api/auth/logout")
    assert resp.status_code == 200


def test_logout_clears_cookie(flask_client):
    resp = flask_client.post("/api/auth/logout")
    cookie_header = resp.headers.get("Set-Cookie", "")
    assert "auth_token" in cookie_header
    assert "max-age=0" in cookie_header.lower()


# ── Auth enforcement (no token) ────────────────────────────────────────────────

def test_upload_requires_auth(flask_client):
    resp = flask_client.post("/api/upload")
    assert resp.status_code == 401


def test_recommend_requires_auth(flask_client):
    resp = flask_client.post("/api/recommend", json={"skills": ["Python"]})
    assert resp.status_code == 401


def test_profile_requires_auth(flask_client):
    resp = flask_client.get("/api/user/profile")
    assert resp.status_code == 401


def test_notifications_requires_auth(flask_client):
    resp = flask_client.get("/api/get_notifications")
    assert resp.status_code == 401


def test_set_role_requires_auth(flask_client):
    resp = flask_client.post("/api/auth/set-role", json={"role": "job_seeker"})
    assert resp.status_code == 401


def test_recruit_candidates_requires_auth(flask_client):
    resp = flask_client.post("/api/recruit_candidates", json={"jobDescription": "Python dev"})
    assert resp.status_code == 401


# ── Profile ────────────────────────────────────────────────────────────────────

def test_profile_returns_user_data(flask_client):
    token = _get_token(flask_client)
    resp = flask_client.get("/api/user/profile", headers=_auth(token))
    assert resp.status_code == 200
    # Response is wrapped by standardize_api_response middleware
    payload = resp.get_json()
    user_data = payload.get("data") or payload
    assert "email" in user_data
    assert user_data["email"] == "user@test.com"


def test_profile_has_no_resume_initially(flask_client):
    token = _get_token(flask_client)
    resp = flask_client.get("/api/user/profile", headers=_auth(token))
    assert resp.status_code == 200
    payload = resp.get_json()
    user_data = payload.get("data") or payload
    assert user_data.get("resume") is None


# ── Recommend ──────────────────────────────────────────────────────────────────

def test_recommend_with_skills(flask_client):
    token = _get_token(flask_client)
    resp = flask_client.post("/api/recommend",
        json={"skills": ["Python", "Flask"], "count": 3, "job_source": "static"},
        headers=_auth(token))
    assert resp.status_code == 200
    payload = resp.get_json()
    result = payload.get("data") or payload
    assert "recommendations" in result
    assert isinstance(result["recommendations"], list)


def test_recommend_count_respected(flask_client):
    token = _get_token(flask_client)
    resp = flask_client.post("/api/recommend",
        json={"skills": ["Python"], "count": 2, "job_source": "static"},
        headers=_auth(token))
    assert resp.status_code == 200
    payload = resp.get_json()
    result = payload.get("data") or payload
    assert len(result["recommendations"]) <= 2


def test_recommend_no_body(flask_client):
    token = _get_token(flask_client)
    resp = flask_client.post("/api/recommend", headers=_auth(token))
    assert resp.status_code == 400


def test_recommend_no_skills_no_resume(flask_client):
    token = _get_token(flask_client)
    resp = flask_client.post("/api/recommend",
        json={"count": 3},
        headers=_auth(token))
    assert resp.status_code == 400


# ── Forgot / Reset password ────────────────────────────────────────────────────

def test_forgot_password_no_body(flask_client):
    resp = flask_client.post("/api/auth/forgot-password")
    assert resp.status_code == 400


def test_forgot_password_missing_email(flask_client):
    resp = flask_client.post("/api/auth/forgot-password", json={})
    assert resp.status_code == 400


def test_forgot_password_unknown_email(flask_client):
    resp = flask_client.post("/api/auth/forgot-password",
                             json={"email": "nobody@test.com"})
    # Either 200 (silent for security) or 400 — must not crash
    assert resp.status_code in (200, 400)


def test_reset_password_missing_fields(flask_client):
    resp = flask_client.post("/api/auth/reset-password",
                             json={"reset_token": "sometoken"})
    assert resp.status_code == 400


def test_reset_password_invalid_token(flask_client):
    resp = flask_client.post("/api/auth/reset-password",
                             json={"reset_token": "bad.token", "new_password": "NewPass1"})
    assert resp.status_code == 400


# ── Set role ───────────────────────────────────────────────────────────────────

def test_set_role_missing_role_field(flask_client):
    token = _get_token(flask_client)
    resp = flask_client.post("/api/auth/set-role", json={}, headers=_auth(token))
    assert resp.status_code == 400


def test_set_role_already_set_returns_conflict(flask_client):
    # Register with job_seeker role (role is set at registration)
    token = _get_token(flask_client)
    resp = flask_client.post("/api/auth/set-role",
                             json={"role": "recruiter"},
                             headers=_auth(token))
    assert resp.status_code == 409


# ── Hybrid match score ─────────────────────────────────────────────────────────

def test_hybrid_exact_skill_match():
    """resume=[docker], job=[docker] → 70%*1.0 + 30%*1.0 = 100 ≥ 85"""
    emb = np.ones(384, dtype=np.float32) * 0.5
    score = model_module.calculate_match_score(["docker"], ["docker"], emb, emb)
    assert score >= 85


def test_hybrid_partial_skill_match():
    """resume=[docker], job=[docker, java] → skill=0.5 → 65 in [40, 65]"""
    emb = np.ones(384, dtype=np.float32) * 0.5
    score = model_module.calculate_match_score(["docker"], ["docker", "java"], emb, emb)
    assert 40 <= score <= 65


def test_hybrid_superset_skill_match():
    """resume covers all job skills → score ≥ 85"""
    emb = np.ones(384, dtype=np.float32) * 0.5
    score = model_module.calculate_match_score(
        ["python", "react", "docker"], ["python", "react"], emb, emb
    )
    assert score >= 85


def test_hybrid_no_skill_overlap():
    """No shared skills, orthogonal embeddings → bert=0, skill=0 → score ≤ 25"""
    resume_emb = np.zeros(384, dtype=np.float32)
    resume_emb[0] = 1.0
    job_emb = np.zeros(384, dtype=np.float32)
    job_emb[1] = 1.0
    score = model_module.calculate_match_score(
        ["python"], ["java", "docker", "kubernetes"], resume_emb, job_emb
    )
    assert score <= 25
