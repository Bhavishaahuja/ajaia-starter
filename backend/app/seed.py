from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import User

# mock users for the switcher. There is no real login, see README.
SEED_USERS = [
    {"email": "ava@example.com", "name": "Ava Chen"},
    {"email": "ben@example.com", "name": "Ben Ortiz"},
    {"email": "cara@example.com", "name": "Cara Singh"},
]


def seed_users(db: Session):
    # add any seed user that is missing, so this is safe to run on every start
    for row in SEED_USERS:
        exists = db.scalar(select(User).where(User.email == row["email"]))
        if exists is None:
            db.add(User(**row))
    db.commit()
