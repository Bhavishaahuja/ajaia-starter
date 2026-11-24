import os
import tempfile

# set env before the app is imported so settings pick it up
db_file = os.path.join(tempfile.mkdtemp(), "test.db")
os.environ["DATABASE_URL"] = f"sqlite:///{db_file}"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.db import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.seed import seed_users  # noqa: E402


@pytest.fixture(autouse=True)
def fresh_db():
    # every test starts with empty tables and the three seed users.
    # Seed order is fixed, so Ava is always id 1, Ben 2, Cara 3.
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_users(db)
    yield


@pytest.fixture
def client():
    return TestClient(app)
