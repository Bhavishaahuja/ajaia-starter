"""Checks Supabase login tokens. The backend never sees a password."""

from dataclasses import dataclass

import httpx
from fastapi import HTTPException

from app.config import get_settings


@dataclass
class Account:
    email: str
    name: str


def verify_token(token: str) -> Account:
    # Supabase checks the token and tells us who it belongs to.
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_publishable_key:
        raise HTTPException(status_code=500, detail="Login is not configured on the server.")
    try:
        res = httpx.get(
            f"{settings.supabase_url}/auth/v1/user",
            headers={
                "apikey": settings.supabase_publishable_key,
                "Authorization": f"Bearer {token}",
            },
            timeout=10,
        )
    except httpx.HTTPError:
        raise HTTPException(status_code=503, detail="Could not reach the login service. Try again.")

    if res.status_code != 200:
        raise HTTPException(status_code=401, detail="Your session expired. Sign in again.")

    body = res.json()
    email = (body.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(status_code=401, detail="This login has no email.")
    meta = body.get("user_metadata") or {}
    name = str(meta.get("name") or email.split("@")[0]).strip()[:100] or email
    return Account(email=email, name=name)
