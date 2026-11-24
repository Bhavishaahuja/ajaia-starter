def test_health(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_create_and_list_item(client):
    res = client.post("/api/items", json={"text": "The export button is broken on Safari"})
    assert res.status_code == 201
    body = res.json()
    assert body["category"] == "bug"
    assert body["priority"] == "high"
    # high priority always goes to a human
    assert body["needs_review"] is True
    assert body["review_status"] == "pending"

    listed = client.get("/api/items").json()
    ids = [row["id"] for row in listed]
    assert body["id"] in ids


def test_low_risk_item_is_auto_approved(client):
    res = client.post("/api/items", json={"text": "Could you add dark mode?"})
    body = res.json()
    assert body["category"] == "feature_request"
    assert body["needs_review"] is False
    assert body["review_status"] == "auto_approved"


def test_empty_text_rejected(client):
    assert client.post("/api/items", json={"text": ""}).status_code == 422
    assert client.post("/api/items", json={"text": "   "}).status_code == 422


def test_too_long_text_rejected(client):
    res = client.post("/api/items", json={"text": "a" * 6000})
    assert res.status_code == 422


def test_review_flow(client):
    item = client.post("/api/items", json={"text": "I was charged twice"}).json()
    res = client.patch(f"/api/items/{item['id']}/review", json={"status": "approved"})
    assert res.status_code == 200
    assert res.json()["review_status"] == "approved"


def test_review_bad_status_and_missing_item(client):
    item = client.post("/api/items", json={"text": "hello?"}).json()
    bad = client.patch(f"/api/items/{item['id']}/review", json={"status": "maybe"})
    assert bad.status_code == 422
    missing = client.patch("/api/items/999999/review", json={"status": "approved"})
    assert missing.status_code == 404
