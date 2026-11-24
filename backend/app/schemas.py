from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

# editor HTML cap. Plenty for a long doc, keeps a single save small.
MAX_HTML_CHARS = 1_000_000


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    name: str


class DocCreate(BaseModel):
    title: str = Field(default="Untitled document", max_length=200)


class DocUpdate(BaseModel):
    # send only what changed. Both fields are optional.
    title: str | None = Field(default=None, max_length=200)
    html: str | None = Field(default=None, max_length=MAX_HTML_CHARS)


class DocSummary(BaseModel):
    # one row in the document list
    id: int
    title: str
    owner_id: int
    owner_name: str
    role: str  # "owner" or "editor"
    updated_at: datetime


class DocOut(DocSummary):
    html: str


class ShareCreate(BaseModel):
    email: str = Field(min_length=3, max_length=255)

    @field_validator("email")
    @classmethod
    def clean_email(cls, value: str) -> str:
        value = value.strip().lower()
        if "@" not in value or "." not in value.split("@")[-1]:
            raise ValueError("Enter a valid email address.")
        return value


class ShareOut(BaseModel):
    user_id: int
    email: str
    name: str


class VersionOut(BaseModel):
    # one row in the version list, newest first
    id: int
    title: str
    created_by_name: str
    created_at: datetime


class VersionFull(VersionOut):
    html: str
