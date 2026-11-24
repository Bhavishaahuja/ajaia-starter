"""Deterministic rules. Anything exact or risky lives here, not in the LLM."""

from app.schemas import Analysis

CONFIDENCE_FLOOR = 0.7


def needs_human_review(analysis: Analysis) -> bool:
    # rules can only add review, never remove it
    if analysis.confidence < CONFIDENCE_FLOOR:
        return True
    if analysis.category in ("billing", "other"):
        return True
    if analysis.priority == "high":
        return True
    return False
