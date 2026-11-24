import logging

from fastapi import Depends, FastAPI, File, Header, HTTPException, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app import auth
from app.auth import verify_token
from app.config import get_settings
from app.db import Base, engine, get_db
from app.importer import UploadError, html_from_upload, sanitize_html
from app.models import Document, Share, User
from app.rules import can_share, role_for
from app.schemas import DocCreate, DocOut, DocSummary, DocUpdate, ShareCreate, ShareOut, UserOut

logging.basicConfig(level=logging.INFO)
settings = get_settings()

# fine for a take-home. With more time: Alembic migrations.
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Collaborative doc editor API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)


# --- auth ------------------------------------------------------------------
# The browser logs in with Supabase and sends the access token as a Bearer
# token. We ask Supabase who that is, then match the email to a local user row.

def current_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Sign in first.")
    token = authorization[7:].strip()
    account = auth.verify_token(token)

    user = db.scalar(select(User).where(User.email == account.email))
    if user is None:
        # first login creates the local row that documents point at
        user = User(email=account.email, name=account.name)
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


def load_doc_for(doc_id: int, user: User, db: Session):
    # returns (doc, role) or raises 404. A stranger gets the same 404 as a
    # missing doc, so nobody can probe ids.
    doc = db.get(Document, doc_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    has_share = db.scalar(
        select(Share.id).where(Share.doc_id == doc.id, Share.user_id == user.id)
    ) is not None
    role = role_for(doc.owner_id, user.id, has_share)
    if role is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    return doc, role


def owner_name_of(db: Session, owner_id: int) -> str:
    owner = db.get(User, owner_id)
    return owner.name if owner else "Unknown"


def doc_out(doc: Document, role: str, owner_name: str) -> DocOut:
    return DocOut(
        id=doc.id,
        title=doc.title,
        owner_id=doc.owner_id,
        owner_name=owner_name,
        role=role,
        updated_at=doc.updated_at,
        html=doc.html,
    )


# --- routes ----------------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/me", response_model=UserOut)
def me(user: User = Depends(current_user)):
    # the frontend calls this after login. It also creates the local user row.
    return user


@app.get("/api/documents", response_model=list[DocSummary])
def list_documents(user: User = Depends(current_user), db: Session = Depends(get_db)):
    owned = db.scalars(select(Document).where(Document.owner_id == user.id)).all()
    shared = db.scalars(
        select(Document).join(Share, Share.doc_id == Document.id).where(Share.user_id == user.id)
    ).all()

    names = {u.id: u.name for u in db.scalars(select(User))}
    rows = []
    for doc in owned:
        rows.append(DocSummary(
            id=doc.id, title=doc.title, owner_id=doc.owner_id,
            owner_name=names.get(doc.owner_id, "Unknown"), role="owner",
            updated_at=doc.updated_at,
        ))
    for doc in shared:
        rows.append(DocSummary(
            id=doc.id, title=doc.title, owner_id=doc.owner_id,
            owner_name=names.get(doc.owner_id, "Unknown"), role="editor",
            updated_at=doc.updated_at,
        ))
    rows.sort(key=lambda row: row.updated_at, reverse=True)
    return rows


@app.post("/api/documents", response_model=DocOut, status_code=201)
def create_document(
    payload: DocCreate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    title = payload.title.strip() or "Untitled document"
    doc = Document(owner_id=user.id, title=title, html="")
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc_out(doc, "owner", user.name)


@app.post("/api/documents/import", response_model=DocOut, status_code=201)
def import_document(
    file: UploadFile = File(...),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    # read one byte past the limit, so "too big" is easy to spot
    data = file.file.read(settings.max_upload_bytes + 1)
    if len(data) > settings.max_upload_bytes:
        raise HTTPException(status_code=413, detail="File is larger than 2 MB.")
    try:
        title, body = html_from_upload(file.filename or "", data)
    except UploadError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)

    doc = Document(owner_id=user.id, title=title, html=body)
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc_out(doc, "owner", user.name)


@app.get("/api/documents/{doc_id}", response_model=DocOut)
def get_document(doc_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    doc, role = load_doc_for(doc_id, user, db)
    return doc_out(doc, role, owner_name_of(db, doc.owner_id))


@app.patch("/api/documents/{doc_id}", response_model=DocOut)
def update_document(
    doc_id: int,
    payload: DocUpdate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    doc, role = load_doc_for(doc_id, user, db)
    # owners and editors both can change the doc
    if payload.title is not None:
        title = payload.title.strip()
        if not title:
            raise HTTPException(status_code=422, detail="Title cannot be empty.")
        doc.title = title
    if payload.html is not None:
        doc.html = sanitize_html(payload.html)
    db.commit()
    db.refresh(doc)
    return doc_out(doc, role, owner_name_of(db, doc.owner_id))


@app.get("/api/documents/{doc_id}/shares", response_model=list[ShareOut])
def list_shares(doc_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    doc, role = load_doc_for(doc_id, user, db)
    if not can_share(role):
        raise HTTPException(status_code=403, detail="Only the owner can see who has access.")
    rows = db.execute(
        select(User).join(Share, Share.user_id == User.id).where(Share.doc_id == doc.id)
    ).scalars().all()
    return [ShareOut(user_id=u.id, email=u.email, name=u.name) for u in rows]


@app.post("/api/documents/{doc_id}/shares", response_model=ShareOut, status_code=201)
def share_document(
    doc_id: int,
    payload: ShareCreate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    doc, role = load_doc_for(doc_id, user, db)
    if not can_share(role):
        raise HTTPException(status_code=403, detail="Only the owner can share this document.")

    # only people who have signed in once have a row to share with
    target = db.scalar(select(User).where(User.email == payload.email))
    if target is None:
        raise HTTPException(
            status_code=404,
            detail="No account with that email yet. They need to create an account first.",
        )
    if target.id == doc.owner_id:
        raise HTTPException(status_code=422, detail="You already own this document.")

    # sharing twice is fine, it just returns the existing row
    existing = db.scalar(
        select(Share).where(Share.doc_id == doc.id, Share.user_id == target.id)
    )
    if existing is None:
        db.add(Share(doc_id=doc.id, user_id=target.id))
        db.commit()
    return ShareOut(user_id=target.id, email=target.email, name=target.name)


@app.delete("/api/documents/{doc_id}", status_code=204)
def delete_document(doc_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    doc, role = load_doc_for(doc_id, user, db)
    if not can_share(role):
        # same rule as sharing: only the owner manages the document's access
        raise HTTPException(status_code=403, detail="Only the owner can delete this document.")
    # drop the share rows first, then the document
    db.execute(delete(Share).where(Share.doc_id == doc.id))
    db.delete(doc)
    db.commit()
    return Response(status_code=204)


@app.delete("/api/documents/{doc_id}/shares/{user_id}", status_code=204)
def remove_share(
    doc_id: int,
    user_id: int,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    doc, role = load_doc_for(doc_id, user, db)
    if not can_share(role):
        raise HTTPException(status_code=403, detail="Only the owner can remove access.")
    db.execute(delete(Share).where(Share.doc_id == doc.id, Share.user_id == user_id))
    db.commit()
    return Response(status_code=204)
