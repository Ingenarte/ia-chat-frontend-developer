# app/routers/ai.py
from fastapi import APIRouter, HTTPException, status
import asyncio, os
from datetime import datetime, timezone

from ..schemas import (
    HealthResponse,
    GenerateRequest,
    GenerateResponse,
    AcceptedJob,
    JobResult,
    JobStatus,
    JobSummary,
    JobListResponse,)
from ..services.runner import run_generation_job
from ..services.jobs import job_store

router = APIRouter(prefix="/api/ai", tags=["ai"])

@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok", service="ai-frontend-chat-service")

@router.post("/generate", response_model=AcceptedJob, status_code=status.HTTP_202_ACCEPTED)
async def generate(req: GenerateRequest) -> AcceptedJob:
    job = await job_store.create_job(req)
    print(f"[router] /generate -> returning job_id={job.job_id}")
    asyncio.create_task(run_generation_job(job.job_id, req))
    return AcceptedJob(job_id=job.job_id, status=job.status, expires_at=job.expires_at)

@router.get("/result/{job_id}", response_model=JobResult)
async def get_result(job_id: str) -> JobResult:
    job = await job_store.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail={"job_id": job_id, "status": "not_found"})
    now = datetime.now(timezone.utc)
    if job.expires_at <= now:
        raise HTTPException(status_code=404, detail={"job_id": job_id, "status": "not_found"})

    if job.status == JobStatus.finished and job.error is None:
        return JobResult(job_id=job.job_id, status=job.status, result=job.result)
    if job.status == JobStatus.failed:
        return JobResult(job_id=job.job_id, status=job.status, error=job.error)
    return JobResult(job_id=job.job_id, status=job.status)



@router.get("/jobs", response_model=JobListResponse)
async def list_jobs(status: JobStatus | None = None, page: int = 1, size: int = 50) -> JobListResponse:
    items, total = await job_store.list_jobs(status=status, page=page, size=size)
    summaries = [
        JobSummary(
            job_id=j.job_id,
            status=j.status,
            created_at=j.created_at,
            expires_at=j.expires_at,
        )
       for j in items
    ]
    has_more = (page * size) < total
    return JobListResponse(items=summaries, total=total, page=page, size=size, has_more=has_more)

@router.get("/jobs/stats")
async def jobs_stats():
    """
    Returns both live counts and cumulative totals since process start.
    Useful for dashboards with persistent stats even after jobs expire.
    """
    return await job_store.stats_cumulative()
