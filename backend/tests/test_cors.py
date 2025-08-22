# test_cors.py
# Validates that CORS middleware is active and allows any origin as configured in app.main
from http import HTTPStatus

def test_cors_preflight_health(client):
    # Simulate a browser preflight request
    headers = {
        "Origin": "http://example.com",
        "Access-Control-Request-Method": "GET",
    }
    resp = client.options("/api/ai/health", headers=headers)
    # FastAPI/Starlette replies 200 on a valid preflight
    assert resp.status_code in (HTTPStatus.OK, HTTPStatus.NO_CONTENT)
    # CORS headers should reflect permissive settings
    origin = headers["Origin"]
    assert resp.headers.get("access-control-allow-origin") in ("*", origin)
    allow_methods = resp.headers.get("access-control-allow-methods") or ""
    assert "GET" in allow_methods
