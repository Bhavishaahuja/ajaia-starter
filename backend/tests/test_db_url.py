import pytest

from app.db import normalize_db_url


def test_postgres_schemes_get_psycopg_driver():
    assert normalize_db_url("postgres://u:p@h/db").startswith("postgresql+psycopg://")
    assert normalize_db_url("postgresql://u:p@h/db").startswith("postgresql+psycopg://")


def test_sqlite_url_is_left_alone():
    assert normalize_db_url("sqlite:///./app.db") == "sqlite:///./app.db"


def test_web_url_gives_a_clear_error():
    # this was the Render deploy crash: the Supabase project URL pasted as DATABASE_URL
    with pytest.raises(RuntimeError, match="Postgres URI"):
        normalize_db_url("https://kgqrdlunhwjnkwskpaea.supabase.co")
