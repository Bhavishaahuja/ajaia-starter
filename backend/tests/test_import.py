import io
import zipfile

from tests.test_access import AVA, as_user


def upload(client, user_id, filename, data, content_type="application/octet-stream"):
    return client.post(
        "/api/documents/import",
        files={"file": (filename, data, content_type)},
        headers=as_user(user_id),
    )


def make_docx(paragraph_text):
    # a minimal .docx built by hand, so tests need no extra library
    document_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        "<w:body><w:p><w:r><w:t>"
        f"{paragraph_text}"
        "</w:t></w:r></w:p></w:body></w:document>"
    )
    content_types = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        '<Default Extension="xml" ContentType="application/xml"/>'
        '<Override PartName="/word/document.xml" '
        'ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
        "</Types>"
    )
    rels = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" '
        'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" '
        'Target="word/document.xml"/>'
        "</Relationships>"
    )
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as zf:
        zf.writestr("[Content_Types].xml", content_types)
        zf.writestr("_rels/.rels", rels)
        zf.writestr("word/document.xml", document_xml)
    return buffer.getvalue()


def test_txt_becomes_new_document_with_escaped_text(client, ids):
    ava = ids[AVA]
    text = "Plan for Q3\n\nFirst line\nsecond line\n\n<script>alert(1)</script>"
    res = upload(client, ava, "plan.txt", text.encode("utf-8"), "text/plain")
    assert res.status_code == 201
    body = res.json()
    assert body["title"] == "plan"
    assert body["role"] == "owner"
    assert "<p>Plan for Q3</p>" in body["html"]
    assert "First line<br>second line" in body["html"]
    # script shows up as text, not as a tag
    assert "&lt;script&gt;" in body["html"]
    assert "<script" not in body["html"]


def test_md_is_converted_and_sanitized(client, ids):
    ava = ids[AVA]
    text = "# Roadmap\n\n- ship sharing\n- ship import\n\n<script>bad()</script>\n\n[ok](https://example.com)"
    res = upload(client, ava, "roadmap.md", text.encode("utf-8"))
    assert res.status_code == 201
    html = res.json()["html"]
    assert "<h1>Roadmap</h1>" in html
    assert "<li>ship sharing</li>" in html
    assert "<script" not in html
    assert 'href="https://example.com"' in html


def test_docx_text_comes_through(client, ids):
    ava = ids[AVA]
    res = upload(client, ava, "memo.docx", make_docx("Hello from Word"))
    assert res.status_code == 201
    body = res.json()
    assert body["title"] == "memo"
    assert "Hello from Word" in body["html"]


def test_unsupported_extension_is_415(client, ids):
    res = upload(client, ids[AVA], "photo.png", b"not really a png")
    assert res.status_code == 415


def test_file_over_2mb_is_413(client, ids):
    too_big = b"a" * (2 * 1024 * 1024 + 1)
    res = upload(client, ids[AVA], "big.txt", too_big, "text/plain")
    assert res.status_code == 413


def test_broken_docx_is_422(client, ids):
    res = upload(client, ids[AVA], "broken.docx", b"this is not a zip file")
    assert res.status_code == 422


def test_non_utf8_text_is_422(client, ids):
    res = upload(client, ids[AVA], "latin.txt", "caf\xe9".encode("latin-1"), "text/plain")
    assert res.status_code == 422


def test_import_needs_a_user(client):
    res = client.post("/api/documents/import", files={"file": ("a.txt", b"hi", "text/plain")})
    assert res.status_code == 401
