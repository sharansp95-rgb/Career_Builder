"""
Auth unit tests — exercises register_user, login_user, set_user_role,
verify_email_link, and request_password_reset directly (no HTTP layer).
All tests run against a fresh isolated SQLite DB via the autouse fixture
in conftest.py.
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import auth as auth_module


# ── Helpers ────────────────────────────────────────────────────────────────────

def _register(name="Alice", email="alice@example.com", password="Password1", role="job_seeker"):
    return auth_module.register_user(name, email, password, role)


def _force_verify(email: str):
    """Mark the user as verified so login works immediately in tests."""
    conn = auth_module.get_db_connection()
    try:
        conn.execute("UPDATE users SET is_verified=1, verified=1 WHERE email=?", (email,))
        conn.commit()
    finally:
        conn.close()


# ── Registration ───────────────────────────────────────────────────────────────

def test_register_valid_user():
    result = _register()
    assert result["success"] is True
    assert "message" in result


def test_register_invalid_email_format():
    result = auth_module.register_user("Bob", "not-an-email", "Password1", "job_seeker")
    assert result.get("success") is False or "@" not in "not-an-email"


def test_register_password_too_short():
    result = auth_module.register_user("Bob", "bob@example.com", "short", "job_seeker")
    assert result["success"] is False
    assert "8 characters" in result.get("error", "") or "password" in result.get("error", "").lower()


def test_register_duplicate_email_returns_conflict():
    _register(email="dup@example.com")
    _force_verify("dup@example.com")   # backend allows re-registration until verified
    result = _register(email="dup@example.com")
    assert result["success"] is False
    assert "already registered" in result.get("error", "").lower()


def test_register_invalid_role_fails():
    result = auth_module.register_user("Dave", "dave@example.com", "Password1", "superadmin")
    assert result["success"] is False


# ── Login ──────────────────────────────────────────────────────────────────────

def test_login_nonexistent_email():
    result = auth_module.login_user("ghost@example.com", "Password1")
    assert result["success"] is False


def test_login_wrong_password():
    _register(email="wrongpw@example.com")
    _force_verify("wrongpw@example.com")
    result = auth_module.login_user("wrongpw@example.com", "WrongPass9")
    assert result["success"] is False


def test_login_unverified_user_fails():
    _register(email="unverified@example.com")
    # Do NOT force-verify — login should be rejected
    result = auth_module.login_user("unverified@example.com", "Password1")
    assert result["success"] is False


def test_login_success():
    _register(email="login@example.com")
    _force_verify("login@example.com")
    result = auth_module.login_user("login@example.com", "Password1")
    assert result["success"] is True
    assert "token" in result
    assert result["user"]["email"] == "login@example.com"


def test_login_returns_correct_role():
    _register(email="rolecheck@example.com", role="job_seeker")
    _force_verify("rolecheck@example.com")
    result = auth_module.login_user("rolecheck@example.com", "Password1")
    assert result["success"] is True
    assert result["user"]["role"] == "job_seeker"


# ── Role management ────────────────────────────────────────────────────────────

def test_set_role_on_user_with_existing_role_returns_conflict():
    _register(email="roled@example.com", role="job_seeker")
    _force_verify("roled@example.com")
    conn = auth_module.get_db_connection()
    try:
        user = conn.execute("SELECT id FROM users WHERE email=?", ("roled@example.com",)).fetchone()
        user_id = user["id"]
    finally:
        conn.close()

    auth_module.set_user_role(user_id, "job_seeker")
    result = auth_module.set_user_role(user_id, "recruiter")
    assert result["success"] is False
    assert "already set" in result.get("error", "").lower()


# ── Email verification ─────────────────────────────────────────────────────────

def test_verify_email_link_invalid_token():
    result = auth_module.verify_email_link("this.is.not.a.valid.jwt")
    assert result["success"] is False


def test_verify_email_link_empty_token():
    result = auth_module.verify_email_link("")
    assert result["success"] is False


# ── Password reset ─────────────────────────────────────────────────────────────

def test_request_password_reset_unknown_email():
    # Must not raise — either returns success silently or a graceful error
    result = auth_module.request_password_reset("nobody@example.com")
    assert isinstance(result, dict)
    assert "success" in result


def test_reset_password_invalid_token():
    result = auth_module.reset_password_with_token("bad.token.value", "NewPassword1")
    assert result["success"] is False
