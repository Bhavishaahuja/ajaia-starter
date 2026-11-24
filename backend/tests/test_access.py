AVA = "ava@example.com"
BEN = "ben@example.com"
CARA = "cara@example.com"


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def sign_in(client, token):
    # first call creates the local user row, like the real app does
    res = client.get("/api/me", headers=auth(token))
    assert res.status_code == 200
    return res.json()["id"]


def make_doc(client, token, title="Notes"):
    res = client.post("/api/documents", json={"title": title}, headers=auth(token))
    assert res.status_code == 201
    return res.json()


def test_no_token_is_401(client):
    assert client.get("/api/documents").status_code == 401


def test_bad_token_is_401(client):
    assert client.get("/api/documents", headers=auth("tok-nobody")).status_code == 401


def test_first_login_creates_user_row(client):
    res = client.get("/api/me", headers=auth("tok-ava"))
    assert res.json() == {"id": res.json()["id"], "email": AVA, "name": "Ava Chen"}
    # second login reuses the same row
    assert client.get("/api/me", headers=auth("tok-ava")).json()["id"] == res.json()["id"]


def test_owner_can_create_rename_and_edit(client):
    sign_in(client, "tok-ava")
    doc = make_doc(client, "tok-ava")
    assert doc["role"] == "owner"
    assert doc["owner_name"] == "Ava Chen"

    res = client.patch(
        f"/api/documents/{doc['id']}",
        json={"title": "Q3 plan", "html": "<h1>Goals</h1><p><strong>Bold</strong></p>"},
        headers=auth("tok-ava"),
    )
    assert res.status_code == 200
    body = res.json()
    assert body["title"] == "Q3 plan"
    assert "<strong>Bold</strong>" in body["html"]


def test_stranger_cannot_see_or_edit(client):
    sign_in(client, "tok-cara")
    doc = make_doc(client, "tok-ava")
    url = f"/api/documents/{doc['id']}"

    # 404, not 403, so a stranger cannot tell the doc exists
    assert client.get(url, headers=auth("tok-cara")).status_code == 404
    assert client.patch(url, json={"title": "hacked"}, headers=auth("tok-cara")).status_code == 404
    assert client.get("/api/documents", headers=auth("tok-cara")).json() == []


def test_share_gives_edit_access_and_shows_as_shared(client):
    sign_in(client, "tok-ben")
    doc = make_doc(client, "tok-ava", title="Shared plan")

    share = client.post(
        f"/api/documents/{doc['id']}/shares",
        json={"email": "BEN@example.com "},
        headers=auth("tok-ava"),
    )
    assert share.status_code == 201
    assert share.json()["email"] == BEN

    # Ben can open and edit it, and it shows up as shared
    res = client.get(f"/api/documents/{doc['id']}", headers=auth("tok-ben"))
    assert res.status_code == 200
    assert res.json()["role"] == "editor"
    edit = client.patch(
        f"/api/documents/{doc['id']}", json={"html": "<p>Ben was here</p>"}, headers=auth("tok-ben")
    )
    assert edit.status_code == 200

    ben_list = client.get("/api/documents", headers=auth("tok-ben")).json()
    assert [(d["title"], d["role"]) for d in ben_list] == [("Shared plan", "editor")]

    ava_list = client.get("/api/documents", headers=auth("tok-ava")).json()
    assert ava_list[0]["role"] == "owner"


def test_only_owner_can_share_or_see_shares(client):
    sign_in(client, "tok-ben")
    sign_in(client, "tok-cara")
    doc = make_doc(client, "tok-ava")
    client.post(f"/api/documents/{doc['id']}/shares", json={"email": BEN}, headers=auth("tok-ava"))

    # Ben has edit access but cannot manage sharing
    share = client.post(
        f"/api/documents/{doc['id']}/shares", json={"email": CARA}, headers=auth("tok-ben")
    )
    assert share.status_code == 403
    assert client.get(f"/api/documents/{doc['id']}/shares", headers=auth("tok-ben")).status_code == 403

    # Cara has no access at all
    assert client.get(f"/api/documents/{doc['id']}/shares", headers=auth("tok-cara")).status_code == 404


def test_share_with_someone_who_never_signed_in_fails(client):
    doc = make_doc(client, "tok-ava")
    res = client.post(
        f"/api/documents/{doc['id']}/shares", json={"email": BEN}, headers=auth("tok-ava")
    )
    assert res.status_code == 404
    assert "create an account" in res.json()["detail"]


def test_share_with_owner_or_bad_email_fails(client):
    sign_in(client, "tok-ava")
    doc = make_doc(client, "tok-ava")
    url = f"/api/documents/{doc['id']}/shares"

    self_share = client.post(url, json={"email": AVA}, headers=auth("tok-ava"))
    assert self_share.status_code == 422

    bad_email = client.post(url, json={"email": "not-an-email"}, headers=auth("tok-ava"))
    assert bad_email.status_code == 422


def test_sharing_twice_is_idempotent(client):
    sign_in(client, "tok-ben")
    doc = make_doc(client, "tok-ava")
    url = f"/api/documents/{doc['id']}/shares"
    client.post(url, json={"email": BEN}, headers=auth("tok-ava"))
    client.post(url, json={"email": BEN}, headers=auth("tok-ava"))
    shares = client.get(url, headers=auth("tok-ava")).json()
    assert len(shares) == 1


def test_editor_html_is_sanitized_on_save(client):
    doc = make_doc(client, "tok-ava")
    dirty = '<p onclick="steal()">Hi</p><script>alert(1)</script><a href="javascript:bad()">x</a>'
    res = client.patch(f"/api/documents/{doc['id']}", json={"html": dirty}, headers=auth("tok-ava"))
    html = res.json()["html"]
    assert "<script" not in html
    assert "onclick" not in html
    assert "javascript:" not in html
    assert "Hi" in html


def test_empty_title_rejected(client):
    doc = make_doc(client, "tok-ava")
    res = client.patch(f"/api/documents/{doc['id']}", json={"title": "   "}, headers=auth("tok-ava"))
    assert res.status_code == 422


def test_owner_can_delete_document(client):
    sign_in(client, "tok-ben")
    doc = make_doc(client, "tok-ava")
    client.post(f"/api/documents/{doc['id']}/shares", json={"email": BEN}, headers=auth("tok-ava"))

    # Ben (editor) cannot delete it
    assert client.delete(f"/api/documents/{doc['id']}", headers=auth("tok-ben")).status_code == 403

    # Ava (owner) can, and it is gone for Ben too
    assert client.delete(f"/api/documents/{doc['id']}", headers=auth("tok-ava")).status_code == 204
    assert client.get(f"/api/documents/{doc['id']}", headers=auth("tok-ava")).status_code == 404
    assert client.get("/api/documents", headers=auth("tok-ben")).json() == []


def test_owner_can_remove_edit_access(client):
    sign_in(client, "tok-ben")
    doc = make_doc(client, "tok-ava")
    url = f"/api/documents/{doc['id']}"
    client.post(f"{url}/shares", json={"email": BEN}, headers=auth("tok-ava"))
    assert client.get(url, headers=auth("tok-ben")).status_code == 200

    ben_id = client.get("/api/me", headers=auth("tok-ben")).json()["id"]

    # Ben cannot remove access, even for himself
    assert client.delete(f"{url}/shares/{ben_id}", headers=auth("tok-ben")).status_code == 403

    res = client.delete(f"{url}/shares/{ben_id}", headers=auth("tok-ava"))
    assert res.status_code == 204
    assert client.get(url, headers=auth("tok-ben")).status_code == 404
    assert client.get(f"{url}/shares", headers=auth("tok-ava")).json() == []
