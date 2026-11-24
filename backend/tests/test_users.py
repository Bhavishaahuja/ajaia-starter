from app.db import SessionLocal
from app.models import User


def test_switcher_lists_only_the_three_demo_users(client):
    # a real sign-up should not show up in the switcher
    with SessionLocal() as db:
        db.add(User(email="bhavisha@example.com", name="Bhavisha"))
        db.commit()

    res = client.get("/api/users")
    assert res.status_code == 200
    emails = [u["email"] for u in res.json()]
    assert emails == ["ava@example.com", "ben@example.com", "cara@example.com"]
