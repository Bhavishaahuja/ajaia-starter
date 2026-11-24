from tests.test_access import AVA_ID, BEN_ID, CARA_ID, auth, make_doc


def test_manual_save_makes_a_version(client):
    doc = make_doc(client, AVA_ID, title="Plan")
    url = f"/api/documents/{doc['id']}/versions"
    client.patch(f"/api/documents/{doc['id']}", json={"html": "<p>v1</p>"}, headers=auth(AVA_ID))

    res = client.post(url, headers=auth(AVA_ID))
    assert res.status_code == 201
    assert res.json()["created_by_name"] == "Ava Chen"
    assert len(client.get(url, headers=auth(AVA_ID)).json()) == 1


def test_saving_twice_without_changes_does_not_duplicate(client):
    doc = make_doc(client, AVA_ID)
    url = f"/api/documents/{doc['id']}/versions"
    client.post(url, headers=auth(AVA_ID))
    client.post(url, headers=auth(AVA_ID))
    assert len(client.get(url, headers=auth(AVA_ID)).json()) == 1


def test_versions_list_newest_first_with_authors(client):
    doc = make_doc(client, AVA_ID)
    url = f"/api/documents/{doc['id']}/versions"
    client.post(f"/api/documents/{doc['id']}/shares", json={"email": "ben@example.com"}, headers=auth(AVA_ID))
    client.patch(f"/api/documents/{doc['id']}", json={"html": "<p>one</p>"}, headers=auth(AVA_ID))
    client.post(url, headers=auth(AVA_ID))
    client.patch(f"/api/documents/{doc['id']}", json={"html": "<p>two</p>"}, headers=auth(BEN_ID))
    client.post(url, headers=auth(BEN_ID))

    rows = client.get(url, headers=auth(AVA_ID)).json()
    assert [r["created_by_name"] for r in rows] == ["Ben Ortiz", "Ava Chen"]


def test_editor_can_see_and_restore_but_stranger_cannot(client):
    doc = make_doc(client, AVA_ID, title="Plan")
    doc_url = f"/api/documents/{doc['id']}"
    client.patch(doc_url, json={"title": "Plan", "html": "<p>old text</p>"}, headers=auth(AVA_ID))
    old = client.post(f"{doc_url}/versions", headers=auth(AVA_ID)).json()
    client.patch(doc_url, json={"html": "<p>new text</p>"}, headers=auth(AVA_ID))

    # Cara is not on the doc, so she gets the usual 404
    assert client.get(f"{doc_url}/versions", headers=auth(CARA_ID)).status_code == 404

    client.post(f"/api/documents/{doc['id']}/shares", json={"email": "ben@example.com"}, headers=auth(AVA_ID))
    res = client.post(f"{doc_url}/versions/{old['id']}/restore", headers=auth(BEN_ID))
    assert res.status_code == 200
    assert "old text" in res.json()["html"]


def test_restore_saves_current_state_first_so_it_can_be_undone(client):
    doc = make_doc(client, AVA_ID)
    doc_url = f"/api/documents/{doc['id']}"
    client.patch(doc_url, json={"html": "<p>keep me</p>"}, headers=auth(AVA_ID))
    old = client.post(f"{doc_url}/versions", headers=auth(AVA_ID)).json()
    client.patch(doc_url, json={"html": "<p>oops</p>"}, headers=auth(AVA_ID))

    client.post(f"{doc_url}/versions/{old['id']}/restore", headers=auth(AVA_ID))
    rows = client.get(f"{doc_url}/versions", headers=auth(AVA_ID)).json()
    # the "oops" state was saved before the restore
    assert len(rows) == 2
    undo = client.post(f"{doc_url}/versions/{rows[0]['id']}/restore", headers=auth(AVA_ID))
    assert "oops" in undo.json()["html"]


def test_deleting_a_doc_removes_its_versions(client):
    doc = make_doc(client, AVA_ID)
    client.post(f"/api/documents/{doc['id']}/versions", headers=auth(AVA_ID))
    assert client.delete(f"/api/documents/{doc['id']}", headers=auth(AVA_ID)).status_code == 204
    assert client.get(f"/api/documents/{doc['id']}/versions", headers=auth(AVA_ID)).status_code == 404
