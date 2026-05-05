"""
pytest fixtures — isolated DB per test + mocked BERT model.
"""
import os
import sys
import numpy as np
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


def pytest_configure():
    """
    Inject a fake sentence_transformers module before any test file imports it.
    This prevents the 400 MB BERT model from being downloaded or loaded during tests.
    The mock returns a constant embedding vector — good enough to verify shapes,
    output keys, and score ranges without real semantic similarity.
    """
    from unittest.mock import MagicMock

    _mock_instance = MagicMock()
    _mock_instance.encode.side_effect = (
        lambda texts, **kw: np.ones(
            (len(texts) if isinstance(texts, list) else 1, 384), dtype=np.float32
        ) * 0.5
    )
    _mock_module = MagicMock()
    _mock_module.SentenceTransformer.return_value = _mock_instance
    sys.modules["sentence_transformers"] = _mock_module


@pytest.fixture(autouse=True)
def block_real_emails(monkeypatch):
    """
    Prevent any real emails from being sent during tests.
    Patches smtplib.SMTP so no network connection is made.
    """
    import smtplib
    from unittest.mock import MagicMock
    monkeypatch.setattr(smtplib, "SMTP", MagicMock())


@pytest.fixture(autouse=True)
def isolated_db(tmp_path, monkeypatch):
    """
    Patch DB_PATH to a fresh temp file before each test and tear it down after.
    Runs both init_db() and migrate_db() so the full schema is present.
    """
    db_file = str(tmp_path / "test_users.db")
    monkeypatch.setenv("TEST_DB_PATH", db_file)

    import auth
    monkeypatch.setattr(auth, "DB_PATH", db_file)

    auth.init_db()
    auth.migrate_db()

    yield
    # tmp_path cleanup is handled automatically by pytest


@pytest.fixture
def flask_client():
    """Flask test client backed by an isolated per-test SQLite database."""
    import app as flask_app
    flask_app.app.config["TESTING"] = True
    # Reset rate-limiter storage so each test starts with a clean slate
    flask_app.limiter.reset()
    with flask_app.app.test_client() as client:
        yield client
