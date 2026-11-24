from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Category = Literal["bug", "feature_request", "question", "billing", "other"]
Priority = Literal["low", "medium", "high"]


class ItemCreate(BaseModel):
    # length cap is checked again in the route against settings.max_text_length
    text: str = Field(min_length=1, max_length=20000)


class Analysis(BaseModel):
    """What the LLM must return. Validated before we trust it."""

    summary: str = Field(description="One sentence summary, max 200 characters")
    category: Category
    priority: Priority
    confidence: float = Field(ge=0, le=1, description="0 to 1, how sure you are")
    reasons: list[str] = Field(description="1 to 3 short reasons for the call")


class ReviewUpdate(BaseModel):
    status: Literal["approved", "rejected"]


class ItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    text: str
    summary: str
    category: str
    priority: str
    confidence: float
    reasons: list[str]
    needs_review: bool
    review_status: str
    created_at: datetime
