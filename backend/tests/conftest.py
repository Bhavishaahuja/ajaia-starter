import os
import tempfile

# set env before the app is imported so settings pick it up
db_file = os.path.join(tempfile.mkdtemp(), "test.db")
os.environ["DATABASE_URL"] = f"sqlite:///{db_file}"

import pytest  # noqa: E402
from fastapi import HTTPException  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app import main  # noqa: E402
from app.auth import Account  # noqa: E402
from app.db import Base, engine  # noqa: E402
from app.main import app  # noqa: E402

# fake Supabase: each token maps to one account. No network in tests.
FAKE_ACCOUNTS = {
    "tok-ava": Account(email="ava@example.com", name="Ava Chen"),
    "tok-ben": Account(email="ben@example.com", name="Ben Ortiz"),
    "tok-cara": Account(email="cara@example.com", name="Cara Singh"),
}


def fake_verify(token):
    if token not in FAKE_ACCOUNTS:
        raise HTTPException(status_code=401, detail="Your session expired. Sign in again.")
    return FAKE_ACCOUNTS[token]


@pytest.fixture(autouse=True)
def fresh_db(monkeypatch):
    # every test starts with empty tables and no users
    monkeypatch.setattr(main.auth, "verify_token", fake_verify)
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture
def client():
    return TestClient(app)
