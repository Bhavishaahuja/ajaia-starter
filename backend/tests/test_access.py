AVA = "ava@example.com"
BEN = "ben@example.com"
CARA = "cara@example.com"


def as_user(user_id):
    return {"X-User-Id": str(user_id)}


def make_doc(client, user_id, title="Notes"):
    res = client.post("/api/documents", json={"title": title}, headers=as_user(user_id))
    assert res.status_code == 201
    return res.json()


def test_no_user_header_is_401(client):
    assert client.get("/api/documents").status_code == 401


def test_unknown_user_is_401(client):
    assert client.get("/api/documents", headers=as_user(999)).status_code == 401


def test_owner_can_create_rename_and_edit(client, ids):
    ava = ids[AVA]
    doc = make_doc(client, ava)
    assert doc["role"] == "owner"
    assert doc["owner_name"] == "Ava Chen"

    res = client.patch(
        f"/api/documents/{doc['id']}",
        json={"title": "Q3 plan", "html": "<h1>Goals</h1><p><strong>Bold</strong></p>"},
        headers=as_user(ava),
    )
    assert res.status_code == 200
    body = res.json()
    assert body["title"] == "Q3 plan"
    assert "<strong>Bold</strong>" in body["html"]


def test_stranger_cannot_see_or_edit(client, ids):
    doc = make_doc(client, ids[AVA])
    url = f"/api/documents/{doc['id']}"

    # 404, not 403, so a stranger cannot tell the doc exists
    assert client.get(url, headers=as_user(ids[CARA])).status_code == 404
    assert client.patch(url, json={"title": "hacked"}, headers=as_user(ids[CARA])).status_code == 404
    assert client.get("/api/documents", headers=as_user(ids[CARA])).json() == []


def test_share_gives_edit_access_and_shows_as_shared(client, ids):
    ava, ben = ids[AVA], ids[BEN]
    doc = make_doc(client, ava, title="Shared plan")

    share = client.post(
        f"/api/documents/{doc['id']}/shares",
        json={"email": "BEN@example.com "},
        headers=as_user(ava),
    )
    assert share.status_code == 201
    assert share.json()["email"] == BEN

    # Ben can open and edit it, and it shows up as shared
    res = client.get(f"/api/documents/{doc['id']}", headers=as_user(ben))
    assert res.status_code == 200
    assert res.json()["role"] == "editor"
    edit = client.patch(
        f"/api/documents/{doc['id']}", json={"html": "<p>Ben was here</p>"}, headers=as_user(ben)
    )
    assert edit.status_code == 200

    ben_list = client.get("/api/documents", headers=as_user(ben)).json()
    assert [(d["title"], d["role"]) for d in ben_list] == [("Shared plan", "editor")]

    ava_list = client.get("/api/documents", headers=as_user(ava)).json()
    assert ava_list[0]["role"] == "owner"


def test_only_owner_can_share_or_see_shares(client, ids):
    ava, ben, cara = ids[AVA], ids[BEN], ids[CARA]
    doc = make_doc(client, ava)
    client.post(f"/api/documents/{doc['id']}/shares", json={"email": BEN}, headers=as_user(ava))

    # Ben has edit access but cannot manage sharing
    share = client.post(
        f"/api/documents/{doc['id']}/shares", json={"email": CARA}, headers=as_user(ben)
    )
    assert share.status_code == 403
    assert client.get(f"/api/documents/{doc['id']}/shares", headers=as_user(ben)).status_code == 403

    # Cara has no access at all
    assert client.get(f"/api/documents/{doc['id']}/shares", headers=as_user(cara)).status_code == 404


def test_share_with_unknown_email_or_owner_fails(client, ids):
    ava = ids[AVA]
    doc = make_doc(client, ava)
    url = f"/api/documents/{doc['id']}/shares"

    unknown = client.post(url, json={"email": "nobody@example.com"}, headers=as_user(ava))
    assert unknown.status_code == 404

    self_share = client.post(url, json={"email": AVA}, headers=as_user(ava))
    assert self_share.status_code == 422

    bad_email = client.post(url, json={"email": "not-an-email"}, headers=as_user(ava))
    assert bad_email.status_code == 422


def test_sharing_twice_is_idempotent(client, ids):
    ava = ids[AVA]
    doc = make_doc(client, ava)
    url = f"/api/documents/{doc['id']}/shares"
    client.post(url, json={"email": BEN}, headers=as_user(ava))
    client.post(url, json={"email": BEN}, headers=as_user(ava))
    shares = client.get(url, headers=as_user(ava)).json()
    assert len(shares) == 1


def test_editor_html_is_sanitized_on_save(client, ids):
    ava = ids[AVA]
    doc = make_doc(client, ava)
    dirty = '<p onclick="steal()">Hi</p><script>alert(1)</script><a href="javascript:bad()">x</a>'
    res = client.patch(f"/api/documents/{doc['id']}", json={"html": dirty}, headers=as_user(ava))
    html = res.json()["html"]
    assert "<script" not in html
    assert "onclick" not in html
    assert "javascript:" not in html
    assert "Hi" in html


def test_empty_title_rejected(client, ids):
    ava = ids[AVA]
    doc = make_doc(client, ava)
    res = client.patch(f"/api/documents/{doc['id']}", json={"title": "   "}, headers=as_user(ava))
    assert res.status_code == 422
