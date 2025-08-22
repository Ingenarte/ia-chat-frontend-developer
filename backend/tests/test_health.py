# test_health.py
from http import HTTPStatus

def test_health_endpoint(client):
    resp = client.get("/api/ai/health")
    assert resp.status_code == HTTPStatus.OK
    data = resp.json()
    assert data.get("status") == "ok"
    assert data.get("service") == "ai-frontend-chat-service"
