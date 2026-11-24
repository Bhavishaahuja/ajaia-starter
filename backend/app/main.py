import logging

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import Base, engine, get_db
from app.llm import LLMError, analyze_text
from app.models import Item
from app.rules import needs_human_review
from app.schemas import ItemCreate, ItemOut, ReviewUpdate

logging.basicConfig(level=logging.INFO)
settings = get_settings()

# fine for a take-home. With more time: Alembic migrations.
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Ajaia starter API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_methods=["GET", "POST", "PATCH"],
    allow_headers=["Content-Type"],
)


@app.get("/health")
def health():
    return {"status": "ok", "llm_mode": settings.llm_mode}


@app.post("/api/items", response_model=ItemOut, status_code=201)
def create_item(payload: ItemCreate, db: Session = Depends(get_db)):
    text = payload.text.strip()
    if not text:
        raise HTTPException(status_code=422, detail="Text is empty.")
    if len(text) > settings.max_text_length:
        raise HTTPException(
            status_code=422,
            detail=f"Text is too long (max {settings.max_text_length} characters).",
        )

    try:
        analysis = analyze_text(text)
    except LLMError as e:
        raise HTTPException(status_code=502, detail=str(e))

    item = Item(
        text=text,
        summary=analysis.summary,
        category=analysis.category,
        priority=analysis.priority,
        confidence=analysis.confidence,
        reasons=analysis.reasons,
        needs_review=needs_human_review(analysis),
    )
    if not item.needs_review:
        item.review_status = "auto_approved"
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@app.get("/api/items", response_model=list[ItemOut])
def list_items(db: Session = Depends(get_db)):
    rows = db.scalars(select(Item).order_by(Item.id.desc()).limit(100)).all()
    return rows


@app.patch("/api/items/{item_id}/review", response_model=ItemOut)
def review_item(item_id: int, payload: ReviewUpdate, db: Session = Depends(get_db)):
    item = db.get(Item, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found.")
    item.review_status = payload.status
    db.commit()
    db.refresh(item)
    return item
