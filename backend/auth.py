"""
auth.py - local authentication, Google OAuth helpers, and JWT middleware.
Backed by SQLite; issues signed JWTs on successful login.

Tables (6 total):
- users: Core account data
- notifications: Alerts for candidates
- resumes: Candidate resume text and extracted skills
- kanban_cards: Job application tracker
- ai_conversations: Logs for CareerBot context
- recommendation_cache: Cache for job recommendations
"""

from __future__ import annotations

import json
import logging
import os
import random
import re
import sqlite3
import string
import time
from contextlib import closing
from functools import wraps
from typing import Callable

import jwt
from dotenv import load_dotenv
from flask import jsonify, request
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from werkzeug.security import check_password_hash, generate_password_hash

log = logging.getLogger(__name__)

DB_PATH = os.path.join(os.path.dirname(__file__), "users.db")
_GOOGLE_TRANSPORT = google_requests.Request()
_BACKEND_ENV_PATH = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(_BACKEND_ENV_PATH)

# ── JWT config ─────────────────────────────────────────────────────────────────
_JWT_SECRET = os.getenv('JWT_SECRET')
if not _JWT_SECRET:
    raise ValueError("JWT_SECRET environment variable is not set")

_JWT_ALGO = "HS256"
_JWT_EXPIRY_SECONDS = 60 * 60 * 24 * 7   # 7 days
_RESET_TOKEN_EXPIRY = 60 * 15             # 15 minutes


def get_db_connection():
    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    return conn


def create_jwt(
    user_id: int,
    email: str,
    name: str = "",
    role: str | None = None,
    expiry: int | None = None,
    extra: dict | None = None,
) -> str:
    exp = int(time.time()) + (expiry if expiry is not None else _JWT_EXPIRY_SECONDS)
    payload: dict = {
        "user_id": user_id,
        "email": email,
        "name": name,
        "role": role,
        "iat": int(time.time()),
        "exp": exp,
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, _JWT_SECRET, algorithm=_JWT_ALGO)


def require_auth(f: Callable) -> Callable:
    """Decorator: validates JWT from HttpOnly cookie or Bearer Authorization header."""
    @wraps(f)
    def decorated(*args, **kwargs):
        # Prefer HttpOnly cookie; fall back to Authorization header for backward compat
        token = request.cookies.get("auth_token", "")
        if not token:
            auth_header = request.headers.get("Authorization", "")
            token = auth_header.replace("Bearer ", "").strip()
        if not token:
            return jsonify({"error": "Unauthorized — no token provided"}), 401
        try:
            payload = jwt.decode(token, _JWT_SECRET, algorithms=[_JWT_ALGO])
            request.user_id = payload["user_id"]
            request.user_email = payload.get("email", "")
            request.user_name = payload.get("name", "")
            request.user_role = payload.get("role")
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired — please log in again"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
        return f(*args, **kwargs)
    return decorated


def require_role(*allowed_roles):
    """Decorator factory: restricts endpoint to users with a specified role."""
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated(*args, **kwargs):
            if not hasattr(request, "user_role") or request.user_role not in allowed_roles:
                return jsonify({"error": "Access denied. Insufficient permissions."}), 403
            return f(*args, **kwargs)
        return decorated
    return decorator


# ── Database init ──────────────────────────────────────────────────────────────

def init_db() -> None:
    with closing(sqlite3.connect(DB_PATH)) as conn:
        with closing(conn.cursor()) as cursor:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id              INTEGER PRIMARY KEY AUTOINCREMENT,
                    name            TEXT    NOT NULL,
                    email           TEXT    UNIQUE NOT NULL,
                    password_hash   TEXT    NOT NULL,
                    google_id       TEXT,
                    role            TEXT    DEFAULT NULL,
                    is_verified     INTEGER DEFAULT 1,
                    verified        INTEGER DEFAULT 1,
                    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS notifications (
                    id              INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id         TEXT    NOT NULL,
                    message         TEXT    NOT NULL,
                    company         TEXT,
                    job_title       TEXT,
                    required_skills TEXT,
                    recruiter_email TEXT,
                    recruiter_name  TEXT,
                    is_read         INTEGER DEFAULT 0,
                    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS resumes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL UNIQUE,
                    resume_text TEXT NOT NULL,
                    skills TEXT NOT NULL,
                    file_name TEXT,
                    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(user_id) REFERENCES users(id)
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS kanban_cards (
                    id          INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id     INTEGER NOT NULL,
                    job_id      INTEGER NOT NULL,
                    title       TEXT    NOT NULL,
                    company     TEXT    NOT NULL,
                    location    TEXT    DEFAULT '',
                    match_score INTEGER DEFAULT 0,
                    col         TEXT    NOT NULL DEFAULT 'Saved',
                    added_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, job_id)
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS ai_conversations (
                    id              INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id         INTEGER NOT NULL,
                    user_message    TEXT    NOT NULL,
                    ai_response     TEXT    NOT NULL,
                    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS recommendation_cache (
                    user_id     INTEGER PRIMARY KEY,
                    data        TEXT    NOT NULL,
                    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            """)

            conn.commit()


def migrate_db() -> None:
    """Safely add missing columns and tables to the DB."""
    conn = get_db_connection()
    try:
        columns = [row[1] for row in conn.execute("PRAGMA table_info(users)").fetchall()]

        pending = [
            ("is_verified", "ALTER TABLE users ADD COLUMN is_verified INTEGER DEFAULT 1"),
            ("role",         "ALTER TABLE users ADD COLUMN role TEXT DEFAULT NULL"),
            ("google_id",    "ALTER TABLE users ADD COLUMN google_id TEXT"),
            ("created_at",   "ALTER TABLE users ADD COLUMN created_at DATETIME DEFAULT NULL"),
            ("verified",     "ALTER TABLE users ADD COLUMN verified INTEGER DEFAULT 1"),
        ]
        for col, sql in pending:
            if col not in columns:
                try:
                    conn.execute(sql)
                    log.info("Migration: added column %s to users", col)
                except Exception as exc:
                    log.warning("Migration skipped for column %s: %s", col, exc)

        # Only mark legacy users (created before verification existed) as verified
        # New registrations must verify via email link
        conn.execute("UPDATE users SET is_verified=1, verified=1 WHERE is_verified IS NULL")

        # Drop OTP table if it still exists
        conn.execute("DROP TABLE IF EXISTS otp_table")

        # Remove OTP columns from users if they exist (legacy cleanup)
        refreshed = [row[1] for row in conn.execute("PRAGMA table_info(users)").fetchall()]
        if "otp" in refreshed or "otp_expiry" in refreshed:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS users_no_otp (
                    id              INTEGER PRIMARY KEY AUTOINCREMENT,
                    name            TEXT    NOT NULL,
                    email           TEXT    UNIQUE NOT NULL,
                    password_hash   TEXT    NOT NULL,
                    google_id       TEXT,
                    role            TEXT    DEFAULT NULL,
                    is_verified     INTEGER DEFAULT 1,
                    verified        INTEGER DEFAULT 1,
                    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.execute("""
                INSERT INTO users_no_otp (id, name, email, password_hash, google_id, role, is_verified, verified)
                SELECT id, name, email, password_hash, google_id, role, 1, 1
                FROM users
            """)
            conn.execute("DROP TABLE users")
            conn.execute("ALTER TABLE users_no_otp RENAME TO users")
            log.info("Migration: removed OTP columns from users table.")

        # Check if notifications table uses candidate_id (old schema)
        columns = [row[1] for row in conn.execute("PRAGMA table_info(notifications)").fetchall()]
        if "candidate_id" in columns:
            conn.execute("DROP TABLE notifications")
            log.info("Migration: dropped old notifications table.")

        conn.execute("""
            CREATE TABLE IF NOT EXISTS notifications (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id         TEXT    NOT NULL,
                message         TEXT    NOT NULL,
                company         TEXT,
                job_title       TEXT,
                required_skills TEXT,
                recruiter_email TEXT,
                recruiter_name  TEXT,
                is_read         INTEGER DEFAULT 0,
                created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Safely add job_title and recruiter_name if they don't exist yet
        notif_cols = [row[1] for row in conn.execute("PRAGMA table_info(notifications)").fetchall()]
        notif_pending = [
            ("job_title",      "ALTER TABLE notifications ADD COLUMN job_title TEXT"),
            ("recruiter_name", "ALTER TABLE notifications ADD COLUMN recruiter_name TEXT"),
        ]
        for col, sql in notif_pending:
            if col not in notif_cols:
                try:
                    conn.execute(sql)
                    log.info("Migration: added column %s to notifications", col)
                except Exception as exc:
                    log.warning("Migration skipped for column %s: %s", col, exc)

        conn.execute("DROP TABLE IF EXISTS otps")
        conn.execute("""
            CREATE TABLE IF NOT EXISTS resumes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL UNIQUE,
                resume_text TEXT NOT NULL,
                skills TEXT NOT NULL,
                file_name TEXT,
                uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS kanban_cards (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id     INTEGER NOT NULL,
                job_id      INTEGER NOT NULL,
                title       TEXT    NOT NULL,
                company     TEXT    NOT NULL,
                location    TEXT    DEFAULT '',
                match_score INTEGER DEFAULT 0,
                col         TEXT    NOT NULL DEFAULT 'Saved',
                added_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, job_id)
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS ai_conversations (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id         INTEGER NOT NULL,
                user_message    TEXT    NOT NULL,
                ai_response     TEXT    NOT NULL,
                created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS recommendation_cache (
                user_id     INTEGER PRIMARY KEY,
                data        TEXT    NOT NULL,
                updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)
        conn.commit()
        log.info("migrate_db() completed successfully.")
    except Exception as exc:
        log.error("migrate_db() failed: %s", exc)
    finally:
        conn.close()


init_db()
migrate_db()


# ── Kanban tracker ─────────────────────────────────────────────────────────────

def get_kanban_board(user_id: int) -> dict:
    conn = get_db_connection()
    try:
        rows = conn.execute(
            "SELECT job_id, title, company, location, match_score, col, added_at "
            "FROM kanban_cards WHERE user_id=? ORDER BY added_at ASC",
            (user_id,)
        ).fetchall()
        board: dict = {"Saved": [], "Applied": [], "Interview": [], "Offer/Rejected": []}
        for row in rows:
            col = row["col"]
            if col in board:
                board[col].append({
                    "id": row["job_id"], "title": row["title"],
                    "company": row["company"], "location": row["location"],
                    "matchScore": row["match_score"], "column": col,
                    "addedAt": row["added_at"],
                })
        return board
    finally:
        conn.close()


def add_kanban_card(user_id: int, job: dict) -> dict:
    conn = get_db_connection()
    try:
        existing = conn.execute("SELECT id FROM kanban_cards WHERE user_id=? AND job_id=?", (user_id, job["id"])).fetchone()
        if existing:
            return {"success": True, "duplicate": True}
            
        conn.execute(
            "INSERT INTO kanban_cards "
            "(user_id, job_id, title, company, location, match_score, col) "
            "VALUES (?, ?, ?, ?, ?, ?, 'Saved')",
            (user_id, job["id"], job["title"], job["company"],
             job.get("location", ""), job.get("matchScore", 0))
        )
        conn.commit()
        return {"success": True, "duplicate": False}
    except Exception as exc:
        log.error(f"add_kanban_card error: {exc}")
        return {"success": False, "error": str(exc)}
    finally:
        conn.close()


def move_kanban_card(user_id: int, job_id: int, column: str) -> dict:
    if column not in {"Saved", "Applied", "Interview", "Offer/Rejected"}:
        return {"success": False, "error": "Invalid column"}
    conn = get_db_connection()
    try:
        conn.execute(
            "UPDATE kanban_cards SET col=? WHERE user_id=? AND job_id=?",
            (column, user_id, job_id)
        )
        conn.commit()
        return {"success": True}
    finally:
        conn.close()


def remove_kanban_card(user_id: int, job_id: int) -> dict:
    conn = get_db_connection()
    try:
        conn.execute(
            "DELETE FROM kanban_cards WHERE user_id=? AND job_id=?",
            (user_id, job_id)
        )
        conn.commit()
        return {"success": True}
    finally:
        conn.close()


def reset_db() -> None:
    """Clear all records from database tables for fresh testing."""
    conn = get_db_connection()
    try:
        tables = conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
        for table in tables:
            table_name = table["name"]
            if table_name.startswith("sqlite_"):
                if table_name == "sqlite_sequence":
                    conn.execute("DELETE FROM sqlite_sequence")
                continue
            conn.execute(f"DELETE FROM {table_name}")
        conn.commit()
        log.info("Database cleared for fresh testing")
    except Exception as exc:
        log.error("reset_db() failed: %s", exc)
        raise exc
    finally:
        conn.close()


# ── Internal helpers ───────────────────────────────────────────────────────────

def _random_secret(length: int = 32) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(random.choices(alphabet, k=length))


def _get_google_client_id() -> str:
    return os.environ.get("GOOGLE_CLIENT_ID", "").strip()


# ── Registration ───────────────────────────────────────────────────────────────

def _send_email(email_address: str, subject: str, content: str, fallback_type: str, fallback_link: str, html_content: str = ""):
    import smtplib
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText

    sender = os.environ.get("SMTP_USER", "no-reply@careerbuilder.com")
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"CareerBuilder <{sender}>"
    msg["To"] = email_address

    msg.attach(MIMEText(content, "plain"))
    if html_content:
        msg.attach(MIMEText(html_content, "html"))

    try:
        smtp_server = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
        smtp_port = int(os.environ.get("SMTP_PORT", "587"))
        smtp_user = os.environ.get("SMTP_USER", "")
        smtp_pass = os.environ.get("SMTP_PASS", "")
        if not smtp_user or not smtp_pass:
            raise Exception("SMTP credentials not configured — set SMTP_USER and SMTP_PASS in backend/.env")
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
        log.info("Email sent to %s | subject: %s", email_address, subject)
    except Exception as e:
        log.warning("SMTP failed (%s). Falling back to console.", e)
        print("\n=====================================")
        print(f"DEVELOPMENT MODE {fallback_type} FALLBACK")
        print(f"Email: {email_address}")
        print(f"Link:  {fallback_link}")
        print("=====================================\n")

_FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000").rstrip("/")

def _html_email(title: str, body_html: str) -> str:
    return f"""<!DOCTYPE html><html><body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f4f4">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 20px">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
<tr><td style="background:#2563EB;padding:24px 32px">
  <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700">CareerBuilder</h1></td></tr>
<tr><td style="padding:32px">
  <h2 style="margin:0 0 16px;color:#111827;font-size:20px">{title}</h2>
  {body_html}
  <p style="margin:32px 0 0;color:#9ca3af;font-size:12px">This email was sent by CareerBuilder. Please do not reply directly.</p>
</td></tr>
</table></td></tr></table></body></html>"""

def send_verification_email(email_address: str, token: str):
    link = f"{_FRONTEND_URL}/verify-email?token={token}"
    content = f"Please click the following link to verify your CareerBuilder account:\n{link}\n\nIt expires in 15 minutes."
    html = _html_email("Verify your email address", f"""
        <p style="color:#374151;line-height:1.6">Click the button below to verify your CareerBuilder account. This link expires in <strong>15 minutes</strong>.</p>
        <a href="{link}" style="display:inline-block;margin:16px 0;background:#2563EB;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">Verify Email</a>
        <p style="color:#6b7280;font-size:13px">Or copy this link into your browser:<br><a href="{link}" style="color:#2563EB;word-break:break-all">{link}</a></p>""")
    _send_email(email_address, "Verify your CareerBuilder Account", content, "VERIFICATION LINK", link, html)

def send_password_reset_email(email_address: str, token: str):
    link = f"{_FRONTEND_URL}/reset-password?token={token}"
    content = f"Please click the following link to reset your CareerBuilder password:\n{link}\n\nIt expires in 15 minutes."
    html = _html_email("Reset your password", f"""
        <p style="color:#374151;line-height:1.6">We received a request to reset your CareerBuilder password. Click the button below. This link expires in <strong>15 minutes</strong>.</p>
        <a href="{link}" style="display:inline-block;margin:16px 0;background:#2563EB;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">Reset Password</a>
        <p style="color:#6b7280;font-size:13px">If you did not request this, you can safely ignore this email.</p>
        <p style="color:#6b7280;font-size:13px">Or copy this link:<br><a href="{link}" style="color:#2563EB;word-break:break-all">{link}</a></p>""")
    _send_email(email_address, "Reset your CareerBuilder Password", content, "PASSWORD RESET LINK", link, html)

def register_user(name: str, email: str, password: str, role: str) -> dict:
    if role not in ("job_seeker", "recruiter"):
        return {"success": False, "error": "Role must be job_seeker or recruiter"}

    if (len(password) < 8
            or not re.search(r"[A-Z]", password)
            or not re.search(r"[0-9]", password)):
        return {
            "success": False,
            "error": "Password must be at least 8 characters with one uppercase letter and one number",
        }

    hash_pw = generate_password_hash(password, method="pbkdf2:sha256")

    conn = get_db_connection()
    try:
        existing = conn.execute(
            "SELECT id, is_verified FROM users WHERE email = ?", (email,)
        ).fetchone()

        if existing:
            if existing["is_verified"]:
                return {"success": False, "error": "Email already registered"}
            else:
                conn.execute("UPDATE users SET name=?, password_hash=?, role=? WHERE id=?", (name, hash_pw, role, existing["id"]))
                user_id = existing["id"]
        else:
            conn.execute(
                """INSERT INTO users (name, email, password_hash, role, is_verified, verified)
                   VALUES (?, ?, ?, ?, 0, 0)""",
                (name, email, hash_pw, role),
            )
            user_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
        conn.commit()
    except Exception as exc:
        log.error("Registration error: %s", exc)
        conn.close()
        return {"success": False, "error": "Internal server error"}
    finally:
        conn.close()

    token = create_jwt(user_id, email, expiry=900, extra={"purpose": "email_verification"})
    send_verification_email(email, token)

    return {
        "success": True,
        "message": "Verification link sent to email.",
        "requires_verification": True,
        "email": email,
    }

def verify_email_link(token: str) -> dict:
    try:
        payload = jwt.decode(token, _JWT_SECRET, algorithms=[_JWT_ALGO])
    except jwt.ExpiredSignatureError:
        return {"success": False, "error": "Verification link has expired. Please register again."}
    except jwt.InvalidTokenError:
        return {"success": False, "error": "Invalid verification link."}

    if payload.get("purpose") != "email_verification":
        return {"success": False, "error": "Invalid verification link."}

    conn = get_db_connection()
    try:
        user_id = payload["user_id"]
        user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        if not user:
            return {"success": False, "error": "User not found."}
            
        conn.execute("UPDATE users SET is_verified = 1, verified = 1 WHERE id = ?", (user_id,))
        conn.commit()
        
        # Generate a fresh auth token for immediate login if desired by frontend
        auth_token = create_jwt(user["id"], user["email"], name=user["name"] or "", role=user["role"])
        return {
            "success": True,
            "message": "Email verified successfully.",
            "token": auth_token,
            "user": {
                "id": user["id"],
                "name": user["name"],
                "email": user["email"],
                "role": user["role"],
            }
        }
    except Exception as exc:
        log.error("verify_email_link error: %s", exc)
        return {"success": False, "error": "Internal server error"}
    finally:
        conn.close()


# ── Login ──────────────────────────────────────────────────────────────────────

def login_user(email: str, password: str) -> dict:
    conn = get_db_connection()
    try:
        user = conn.execute(
            "SELECT id, name, email, password_hash, google_id, role FROM users WHERE email=?",
            (email,),
        ).fetchone()
    finally:
        conn.close()

    if not user:
        return {"success": False, "error": "Invalid email or password."}

    if user["google_id"] and not user["password_hash"]:
        return {"success": False, "error": "This account uses Google login. Please sign in with Google."}

    if not check_password_hash(user["password_hash"] or "", password):
        return {"success": False, "error": "Invalid email or password."}

    # Check verification status
    conn = get_db_connection()
    try:
        is_verified = conn.execute("SELECT is_verified FROM users WHERE id=?", (user["id"],)).fetchone()["is_verified"]
        if not is_verified:
            return {"success": False, "error": "Please verify your email first."}
    finally:
        conn.close()

    token = create_jwt(user["id"], user["email"], name=user["name"] or "", role=user["role"])
    return {
        "success": True,
        "token": token,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
        },
    }


# ── Forgot password ────────────────────────────────────────────────────────────

def request_password_reset(email: str) -> dict:
    """Issue a short-lived reset_token for password reset."""
    conn = get_db_connection()
    try:
        user = conn.execute(
            "SELECT id FROM users WHERE email=?", (email,)
        ).fetchone()
    finally:
        conn.close()

    if not user:
        # Never reveal whether the email exists — security best practice
        return {"success": True, "message": "If the email is registered, you will receive a reset link."}

    reset_token = create_jwt(
        user["id"], email, expiry=_RESET_TOKEN_EXPIRY, extra={"purpose": "password_reset"}
    )
    send_password_reset_email(email, reset_token)
    return {"success": True, "message": "If the email is registered, you will receive a reset link."}


def reset_password_with_token(reset_token: str, new_password: str) -> dict:
    """Validate reset_token and update password."""
    try:
        payload = jwt.decode(reset_token, _JWT_SECRET, algorithms=[_JWT_ALGO])
    except jwt.ExpiredSignatureError:
        return {"success": False, "error": "Reset link has expired. Please request a new one."}
    except jwt.InvalidTokenError:
        return {"success": False, "error": "Invalid reset token."}

    if payload.get("purpose") != "password_reset":
        return {"success": False, "error": "Invalid reset token."}

    if (len(new_password) < 8
            or not re.search(r"[A-Z]", new_password)
            or not re.search(r"[0-9]", new_password)):
        return {
            "success": False,
            "error": "Password must be at least 8 characters with one uppercase letter and one number",
        }

    new_hash = generate_password_hash(new_password, method="pbkdf2:sha256")
    conn = get_db_connection()
    try:
        conn.execute(
            "UPDATE users SET password_hash=? WHERE id=?",
            (new_hash, payload["user_id"]),
        )
        conn.commit()
    except Exception as exc:
        log.error("reset_password_with_token error: %s", exc)
        return {"success": False, "error": "Internal server error"}
    finally:
        conn.close()

    return {"success": True, "message": "Password has been reset successfully."}


# ── Google OAuth ───────────────────────────────────────────────────────────────

def verify_google_token(token: str) -> dict:
    import google.auth.exceptions
    google_client_id = _get_google_client_id()
    if not google_client_id:
        raise ValueError("GOOGLE_CLIENT_ID is not configured on the backend.")

    try:
        id_info = id_token.verify_oauth2_token(token, _GOOGLE_TRANSPORT, google_client_id)
    except google.auth.exceptions.GoogleAuthError as e:
        raise ValueError(f"Google auth error: {e}")

    if id_info.get("aud") != google_client_id:
        raise ValueError("Token audience mismatch.")

    if not id_info.get("email_verified"):
        raise ValueError("Google account email is not verified.")

    email = str(id_info.get("email", "")).strip()
    if not email:
        raise ValueError("Google did not return an email address.")

    return {
        "name":      str(id_info.get("name", "Google User")).strip() or "Google User",
        "email":     email,
        "picture":   str(id_info.get("picture", "")).strip(),
        "google_id": str(id_info.get("sub", "")).strip(),
    }


def _upsert_google_user(profile: dict) -> dict:
    name      = str(profile.get("name", "Google User")).strip() or "Google User"
    email     = str(profile.get("email", "")).strip()
    google_id = str(profile.get("google_id", "")).strip()

    conn = get_db_connection()
    try:
        user = conn.execute(
            "SELECT id, name, email, role, google_id FROM users WHERE email=?", (email,)
        ).fetchone()

        if user:
            updates = []
            params: list = []
            if name and name != user["name"]:
                updates.append("name=?"); params.append(name)
            if google_id and not user["google_id"]:
                updates.append("google_id=?"); params.append(google_id)
            if updates:
                params.append(user["id"])
                conn.execute(
                    f"UPDATE users SET {', '.join(updates)} WHERE id=?", params
                )
                conn.commit()
            user_id = user["id"]
            role    = user["role"]
        else:
            placeholder_hash = generate_password_hash(
                f"google-oauth-{_random_secret()}", method="pbkdf2:sha256"
            )
            conn.execute(
                """INSERT INTO users (name, email, password_hash, google_id, is_verified, verified)
                   VALUES (?, ?, ?, ?, 1, 1)""",
                (name, email, placeholder_hash, google_id),
            )
            conn.commit()
            user_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
            role    = None
    finally:
        conn.close()

    token = create_jwt(user_id, email, name=name, role=role)
    return {
        "id":               user_id,
        "name":             name,
        "email":            email,
        "picture":          str(profile.get("picture", "")).strip(),
        "role":             role,
        "needs_role_selection": role is None,
        "token":            token,
    }


def login_with_google(token: str) -> dict:
    profile = verify_google_token(token)
    return _upsert_google_user(profile)


def set_user_role(user_id: int, role: str) -> dict:
    """Permanently set role for a user — only allowed if role is currently NULL."""
    if role not in ("job_seeker", "recruiter"):
        return {"success": False, "error": "Role must be job_seeker or recruiter"}

    conn = get_db_connection()
    try:
        user = conn.execute(
            "SELECT id, name, email, role FROM users WHERE id=?", (user_id,)
        ).fetchone()
        if not user:
            return {"success": False, "error": "User not found"}
        if user["role"] is not None:
            return {"success": False, "error": "Role already set. Cannot change role."}

        conn.execute("UPDATE users SET role=? WHERE id=?", (role, user_id))
        conn.commit()
    except Exception as exc:
        log.error("set_user_role error: %s", exc)
        return {"success": False, "error": "Internal server error"}
    finally:
        conn.close()

    token = create_jwt(user_id, user["email"], name=user["name"] or "", role=role)
    return {"success": True, "token": token, "role": role}


# ── Notifications ──────────────────────────────────────────────────────────────

def insert_notification(
    user_id: str,
    job_title: str,
    company: str,
    required_skills: str,
    recruiter_email: str,
    recruiter_name: str = "",
) -> dict:
    message = (
        f"You have been shortlisted for {job_title} at {company}.\n"
        f"Required skills: {required_skills}.\n"
        f"Contact: {recruiter_email}"
    )
    conn = get_db_connection()
    try:
        conn.execute(
            """INSERT INTO notifications
               (user_id, message, company, job_title, required_skills, recruiter_email, recruiter_name)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (user_id, message, company, job_title, required_skills, recruiter_email, recruiter_name),
        )
        conn.commit()
        row_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
    finally:
        conn.close()
    return {"id": row_id, "message": message}


def get_notifications_for_user(user_id: str) -> dict:
    conn = get_db_connection()
    try:
        rows = conn.execute(
            "SELECT * FROM notifications WHERE CAST(user_id AS TEXT)=? ORDER BY created_at DESC",
            (str(user_id),),
        ).fetchall()
    finally:
        conn.close()
    notifications = [dict(r) for r in rows]
    unread_count  = sum(1 for n in notifications if not n["is_read"])
    return {"notifications": notifications, "unread_count": unread_count}


def get_shortlisted_candidates_for_recruiter(recruiter_email: str) -> list[dict]:
    conn = get_db_connection()
    try:
        rows = conn.execute(
            """
            SELECT n.id as notification_id, n.job_title, n.company, n.created_at as shortlisted_at,
                   u.id as candidate_id, u.name as candidate_name, u.email as candidate_email,
                   r.skills, r.resume_text
            FROM notifications n
            JOIN users u ON CAST(n.user_id AS INTEGER) = u.id
            LEFT JOIN resumes r ON u.id = r.user_id
            WHERE n.recruiter_email = ?
            ORDER BY n.created_at DESC
            """,
            (recruiter_email,)
        ).fetchall()
    finally:
        conn.close()
    
    results = []
    for row in rows:
        try:
            skills = json.loads(row["skills"]) if row["skills"] else []
        except:
            skills = []
        results.append({
            "notification_id": row["notification_id"],
            "job_title": row["job_title"],
            "company": row["company"],
            "shortlisted_at": row["shortlisted_at"],
            "candidate_id": row["candidate_id"],
            "candidate_name": row["candidate_name"],
            "candidate_email": row["candidate_email"],
            "skills": skills,
            "resume_text": row["resume_text"] or "",
            "resume_snippet": (row["resume_text"][:200] + "...") if row["resume_text"] else ""
        })
    return results


def mark_notification_read(notif_id: int, user_id: str) -> bool:
    conn = get_db_connection()
    try:
        conn.execute(
            "UPDATE notifications SET is_read=1 WHERE id=? AND CAST(user_id AS TEXT)=?",
            (notif_id, str(user_id)),
        )
        conn.commit()
    finally:
        conn.close()
    return True


def send_shortlist_email(candidate_id: str, job_title: str, company: str, skills: str, recruiter_email: str):
    conn = get_db_connection()
    try:
        user = conn.execute("SELECT email FROM users WHERE id=?", (candidate_id,)).fetchone()
        if not user:
            return
        candidate_email = user["email"]
        
        subject = "You've been shortlisted!"
        body = (
            f"Congratulations!\n\n"
            f"You have been shortlisted for {job_title} at {company}.\n"
            f"Required skills: {skills}.\n"
            f"Contact: {recruiter_email}\n\n"
            f"Best of luck!"
        )
        html = _html_email("You've been shortlisted! 🎉", f"""
            <p style="color:#374151;line-height:1.6">Congratulations! A recruiter has shortlisted you for the following position:</p>
            <table style="margin:16px 0;border-left:4px solid #2563EB;padding-left:16px">
                <tr><td style="color:#6b7280;font-size:13px">Role</td><td style="padding-left:12px;font-weight:600;color:#111827">{job_title}</td></tr>
                <tr><td style="color:#6b7280;font-size:13px">Company</td><td style="padding-left:12px;font-weight:600;color:#111827">{company}</td></tr>
                <tr><td style="color:#6b7280;font-size:13px">Skills</td><td style="padding-left:12px;color:#374151">{skills}</td></tr>
                <tr><td style="color:#6b7280;font-size:13px">Contact</td><td style="padding-left:12px"><a href="mailto:{recruiter_email}" style="color:#2563EB">{recruiter_email}</a></td></tr>
            </table>
            <p style="color:#374151;line-height:1.6">Reach out to the recruiter directly to follow up. Best of luck!</p>""")
        try:
            _send_email(candidate_email, subject, body, "SHORTLIST NOTIFICATION", "", html)
        except Exception as e:
            log.error(f"Failed to send shortlist email to {candidate_email}: {e}")
    except Exception as e:
        log.error(f"Failed to lookup user email for shortlist: {e}")
    finally:
        conn.close()
