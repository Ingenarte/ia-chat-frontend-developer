# tests/test_schemas.py
from app.schemas import GenerateRequest, JobStatus, JobSummary, JobListResponse
from pydantic import ValidationError
from datetime import datetime

def test_generate_request_defaults():
    req = GenerateRequest(message="hello")
    assert req.message == "hello"
    assert req.temperature is not None
    assert req.top_p is not None

def test_generate_request_requires_message():
    try:
        GenerateRequest()  # type: ignore[arg-type]
    except Exception as e:
        assert isinstance(e, ValidationError)

def test_job_enums_and_list_response():
    # Align with current enum values
    assert JobStatus.received.value in ("received", "processing", "finished", "failed")

    now = datetime.utcnow()
    summary = JobSummary(job_id="abc", status=JobStatus.received, created_at=now, expires_at=now)
    resp = JobListResponse(items=[summary], total=1, page=1, size=10, has_more=False)
    assert resp.total == 1
    assert resp.items[0].job_id == "abc"
