# test_jobs_stats.py
# This test targets the stats endpoint exposed by the jobs store router.
# If the endpoint name/path changes, update this test accordingly.
from http import HTTPStatus

def test_jobs_stats_endpoint(client):
    resp = client.get("/api/ai/jobs/stats")
    assert resp.status_code == HTTPStatus.OK
    data = resp.json()
    # Expect at least these keys to exist (live counters and totals)
    # We don't assume exact numbers; we only assert structure.
    # Examples of keys this endpoint may include:
    #   - "live": {"pending": int, "running": int, "done": int, "failed": int}
    #   - "totals": {"created": int, "completed": int, "failed": int}
    assert isinstance(data, dict)
    # Accept any structure but require at least one numeric field to avoid false positives
    has_numeric_field = any(isinstance(v, (int, float)) for v in data.values())
    has_nested_numeric = any(
        isinstance(v, dict) and any(isinstance(x, (int, float)) for x in v.values())
        for v in data.values()
    )
    assert has_numeric_field or has_nested_numeric
