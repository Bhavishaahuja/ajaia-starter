AVA = "ava@example.com"
BEN = "ben@example.com"
CARA = "cara@example.com"

# seeded user ids (see conftest.py)
AVA_ID = 1
BEN_ID = 2
CARA_ID = 3


def auth(user_id):
    return {"X-User-Id": str(user_id)}


def make_doc(client, token, title="Notes"):
    res = client.post("/api/documents", json={"title": title}, headers=auth(token))
    assert res.status_code == 201
    return res.json()


def test_no_token_is_401(client):
    assert client.get("/api/documents").status_code == 401


def test_owner_can_create_rename_and_edit(client):
    doc = make_doc(client, AVA_ID)
    assert doc["role"] == "owner"
    assert doc["owner_name"] == "Ava Chen"

    res = client.patch(
        f"/api/documents/{doc['id']}",
        json={"title": "Q3 plan", "html": "<h1>Goals</h1><p><strong>Bold</strong></p>"},
        headers=auth(AVA_ID),
    )
    assert res.status_code == 200
    body = res.json()
    assert body["title"] == "Q3 plan"
    assert "<strong>Bold</strong>" in body["html"]


def test_stranger_cannot_see_or_edit(client):
    doc = make_doc(client, AVA_ID)
    url = f"/api/documents/{doc['id']}"

    # 404, not 403, so a stranger cannot tell the doc exists
    assert client.get(url, headers=auth(CARA_ID)).status_code == 404
    assert client.patch(url, json={"title": "hacked"}, headers=auth(CARA_ID)).status_code == 404
    assert client.get("/api/documents", headers=auth(CARA_ID)).json() == []


def test_share_gives_edit_access_and_shows_as_shared(client):
    doc = make_doc(client, AVA_ID, title="Shared plan")

    share = client.post(
        f"/api/documents/{doc['id']}/shares",
        json={"email": "BEN@example.com "},
        headers=auth(AVA_ID),
    )
    assert share.status_code == 201
    assert share.json()["email"] == BEN

    # Ben can open and edit it, and it shows up as shared
    res = client.get(f"/api/documents/{doc['id']}", headers=auth(BEN_ID))
    assert res.status_code == 200
    assert res.json()["role"] == "editor"
    edit = client.patch(
        f"/api/documents/{doc['id']}", json={"html": "<p>Ben was here</p>"}, headers=auth(BEN_ID)
    )
    assert edit.status_code == 200

    ben_list = client.get("/api/documents", headers=auth(BEN_ID)).json()
    assert [(d["title"], d["role"]) for d in ben_list] == [("Shared plan", "editor")]

    ava_list = client.get("/api/documents", headers=auth(AVA_ID)).json()
    assert ava_list[0]["role"] == "owner"


def test_only_owner_can_share_or_see_shares(client):
    doc = make_doc(client, AVA_ID)
    client.post(f"/api/documents/{doc['id']}/shares", json={"email": BEN}, headers=auth(AVA_ID))

    # Ben has edit access but cannot manage sharing
    share = client.post(
        f"/api/documents/{doc['id']}/shares", json={"email": CARA}, headers=auth(BEN_ID)
    )
    assert share.status_code == 403
    assert client.get(f"/api/documents/{doc['id']}/shares", headers=auth(BEN_ID)).status_code == 403

    # Cara has no access at all
    assert client.get(f"/api/documents/{doc['id']}/shares", headers=auth(CARA_ID)).status_code == 404


def test_share_with_unknown_email_is_404(client):
    doc = make_doc(client, AVA_ID)
    res = client.post(
        f"/api/documents/{doc['id']}/shares", json={"email": "nobody@example.com"}, headers=auth(AVA_ID)
    )
    assert res.status_code == 404
    assert "No user with that email" in res.json()["detail"]


def test_share_with_owner_or_bad_email_fails(client):
    doc = make_doc(client, AVA_ID)
    url = f"/api/documents/{doc['id']}/shares"

    self_share = client.post(url, json={"email": AVA}, headers=auth(AVA_ID))
    assert self_share.status_code == 422

    bad_email = client.post(url, json={"email": "not-an-email"}, headers=auth(AVA_ID))
    assert bad_email.status_code == 422


def test_sharing_twice_is_idempotent(client):
    doc = make_doc(client, AVA_ID)
    url = f"/api/documents/{doc['id']}/shares"
    client.post(url, json={"email": BEN}, headers=auth(AVA_ID))
    client.post(url, json={"email": BEN}, headers=auth(AVA_ID))
    shares = client.get(url, headers=auth(AVA_ID)).json()
    assert len(shares) == 1


def test_editor_html_is_sanitized_on_save(client):
    doc = make_doc(client, AVA_ID)
    dirty = '<p onclick="steal()">Hi</p><script>alert(1)</script><a href="javascript:bad()">x</a>'
    res = client.patch(f"/api/documents/{doc['id']}", json={"html": dirty}, headers=auth(AVA_ID))
    html = res.json()["html"]
    assert "<script" not in html
    assert "onclick" not in html
    assert "javascript:" not in html
    assert "Hi" in html


def test_empty_title_rejected(client):
    doc = make_doc(client, AVA_ID)
    res = client.patch(f"/api/documents/{doc['id']}", json={"title": "   "}, headers=auth(AVA_ID))
    assert res.status_code == 422


def test_owner_can_delete_document(client):
    doc = make_doc(client, AVA_ID)
    client.post(f"/api/documents/{doc['id']}/shares", json={"email": BEN}, headers=auth(AVA_ID))

    # Ben (editor) cannot delete it
    assert client.delete(f"/api/documents/{doc['id']}", headers=auth(BEN_ID)).status_code == 403

    # Ava (owner) can, and it is gone for Ben too
    assert client.delete(f"/api/documents/{doc['id']}", headers=auth(AVA_ID)).status_code == 204
    assert client.get(f"/api/documents/{doc['id']}", headers=auth(AVA_ID)).status_code == 404
    assert client.get("/api/documents", headers=auth(BEN_ID)).json() == []


def test_owner_can_remove_edit_access(client):
    doc = make_doc(client, AVA_ID)
    url = f"/api/documents/{doc['id']}"
    client.post(f"{url}/shares", json={"email": BEN}, headers=auth(AVA_ID))
    assert client.get(url, headers=auth(BEN_ID)).status_code == 200

    ben_id = BEN_ID

    # Ben cannot remove access, even for himself
    assert client.delete(f"{url}/shares/{ben_id}", headers=auth(BEN_ID)).status_code == 403

    res = client.delete(f"{url}/shares/{ben_id}", headers=auth(AVA_ID))
    assert res.status_code == 204
    assert client.get(url, headers=auth(BEN_ID)).status_code == 404
    assert client.get(f"{url}/shares", headers=auth(AVA_ID)).json() == []
