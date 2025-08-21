# app/services/jobs.py
import asyncio
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict

from ..schemas import JobStatus, GenerateRequest, GenerateResponse

JOB_TTL_MINUTES = 20
REAPER_INTERVAL_SECONDS = 30


@dataclass
class Job:
    job_id: str
    status: JobStatus
    created_at: datetime
    expires_at: datetime
    request: GenerateRequest
    result: Optional[GenerateResponse] = None
    error: Optional[str] = None


class InMemoryJobStore:
    def __init__(self) -> None:
        self._jobs: Dict[str, Job] = {}
        self._lock = asyncio.Lock()
        self._reaper_task: Optional[asyncio.Task] = None
        # cumulative totals since process start (not affected by reaper)
        self._totals: Dict[JobStatus, int] = {s: 0 for s in JobStatus}  # type: ignore
        self._totals_created: int = 0  # optional extra counter of jobs created

    async def start_reaper(self) -> None:
        if self._reaper_task is None:
            self._reaper_task = asyncio.create_task(self._reaper_loop())

    async def stop_reaper(self) -> None:
        if self._reaper_task:
            self._reaper_task.cancel()
            try:
                await self._reaper_task
            except asyncio.CancelledError:
                pass
            self._reaper_task = None

    async def _reaper_loop(self) -> None:
        while True:
            await asyncio.sleep(REAPER_INTERVAL_SECONDS)
            now = datetime.now(timezone.utc)
            async with self._lock:
                to_delete = [jid for jid, job in self._jobs.items() if job.expires_at <= now]
                for jid in to_delete:
                    self._jobs.pop(jid, None)

    async def create_job(self, req: GenerateRequest) -> Job:
        now = datetime.now(timezone.utc)
        job_id = str(uuid.uuid4())
        print(f"[job_store] create_job -> {job_id}")
        job = Job(
            job_id=job_id,
            status=JobStatus.received,
            created_at=now,
            expires_at=now + timedelta(minutes=JOB_TTL_MINUTES),
            request=req,
        )
        async with self._lock:
            self._jobs[job_id] = job
            # cumulative: count job created and status 'received'
            self._totals_created += 1
            self._totals[JobStatus.received] += 1
        return job

    async def get_job(self, job_id: str) -> Optional[Job]:
        async with self._lock:
            return self._jobs.get(job_id)

    async def set_status(self, job_id: str, status: JobStatus) -> None:
        async with self._lock:
            job = self._jobs.get(job_id)
            if job:
                prev = job.status
                if prev != status:
                    job.status = status
                    # cumulative: count new status
                    self._totals[status] += 1

    async def set_result(self, job_id: str, result: Optional[GenerateResponse], error: Optional[str]) -> None:
        async with self._lock:
            job = self._jobs.get(job_id)
            if job:
                job.result = result
                job.error = error

    async def list_jobs(self, *, status: Optional[JobStatus] = None, page: int = 1, size: int = 50):
        """
        Returns (items, total) ordered by created_at desc with simple pagination.
        """
        if page < 1:
            page = 1
        if size < 1:
            size = 1
        if size > 200:
            size = 200

        async with self._lock:
            jobs = list(self._jobs.values())

        if status:
            jobs = [j for j in jobs if j.status == status]

        jobs.sort(key=lambda j: j.created_at, reverse=True)
        total = len(jobs)
        start = (page - 1) * size
        end = start + size
        return jobs[start:end], total

    async def stats(self) -> Dict[JobStatus, int]:
        counts: Dict[JobStatus, int] = {s: 0 for s in JobStatus}  # type: ignore
        async with self._lock:
            for j in self._jobs.values():
                counts[j.status] += 1
        return counts

    async def stats_cumulative(self) -> Dict[str, Dict[str, int]]:
        """
        Returns both live counts and totals since process start.
        Shape:
        {
          "live": {"received": n, "processing": n, "finished": n, "failed": n},
          "total": {"received": N, "processing": N, "finished": N, "failed": N, "created": N_all}
        }
        """
        live = await self.stats()
        async with self._lock:
            total = {k.value: v for k, v in self._totals.items()}  # type: ignore
            total["created"] = self._totals_created
        return {"live": {k.value: v for k, v in live.items()}, "total": total}  # type: ignore


job_store = InMemoryJobStore()
