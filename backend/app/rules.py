"""Deterministic access rules. No LLM in here, on purpose."""

from typing import Literal

Role = Literal["owner", "editor"]


def role_for(owner_id: int, user_id: int, has_share: bool) -> Role | None:
    # owner wins, a share row gives edit access, anyone else gets nothing
    if owner_id == user_id:
        return "owner"
    if has_share:
        return "editor"
    return None


def can_share(role: Role | None) -> bool:
    # only the owner manages who has access
    return role == "owner"
