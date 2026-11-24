"""Turns an uploaded .txt, .md or .docx file into sanitized HTML."""

import html
import io
import os

import markdown
import mammoth
import nh3

ALLOWED_EXTENSIONS = {".txt", ".md", ".docx"}

# same tags the editor can produce, plus a few mammoth uses for docx
ALLOWED_TAGS = {
    "p", "br", "hr",
    "h1", "h2", "h3",
    "strong", "em", "u", "s", "sub", "sup",
    "ul", "ol", "li",
    "blockquote", "code", "pre",
    "a",
}
ALLOWED_ATTRS = {"a": {"href"}}
ALLOWED_SCHEMES = {"http", "https", "mailto"}


class UploadError(Exception):
    # carries the HTTP status so the route can pass it straight through
    def __init__(self, status_code: int, detail: str):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


def sanitize_html(raw: str) -> str:
    # strips scripts, event handlers and unsafe links
    return nh3.clean(
        raw,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRS,
        url_schemes=ALLOWED_SCHEMES,
    )


def txt_to_html(text: str) -> str:
    # blank line starts a new paragraph, a single newline becomes a line break
    paragraphs = []
    for block in text.replace("\r\n", "\n").split("\n\n"):
        block = block.strip("\n")
        if not block.strip():
            continue
        escaped = html.escape(block).replace("\n", "<br>")
        paragraphs.append(f"<p>{escaped}</p>")
    return "".join(paragraphs)


def html_from_upload(filename: str, data: bytes) -> tuple[str, str]:
    # returns (title, html). Title comes from the file name without the extension.
    name = os.path.basename(filename or "").strip()
    stem, ext = os.path.splitext(name)
    ext = ext.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise UploadError(415, "Only .txt, .md and .docx files are supported.")

    if ext == ".docx":
        try:
            result = mammoth.convert_to_html(io.BytesIO(data))
        except Exception:
            # mammoth raises a few different errors for broken files
            raise UploadError(422, "Could not read this .docx file.")
        raw = result.value
    else:
        try:
            text = data.decode("utf-8-sig")
        except UnicodeDecodeError:
            raise UploadError(422, "This file must be UTF-8 text.")
        if ext == ".txt":
            raw = txt_to_html(text)
        else:
            raw = markdown.markdown(text)

    title = (stem.strip() or "Imported document")[:200]
    return title, sanitize_html(raw)
