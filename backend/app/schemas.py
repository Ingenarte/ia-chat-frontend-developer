from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from enum import Enum
from datetime import datetime

class GenerateRequest(BaseModel):
    message: str = Field(..., description="User instruction. Natural language.")
    previous_html: Optional[str] = Field(
        None,
        description="Optional previous full HTML returned earlier, for iterative refinement."
    )
    temperature: Optional[float] = Field(
        default=0.2,
        description="Sampling temperature (higher = more creative, lower = more deterministic)."
    )
    top_p: Optional[float] = Field(
        default=0.95,
        description="Nucleus sampling cutoff."
    )
    extra: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Optional free-form object for future constraints."
    )

class GenerateResponse(BaseModel):
    error: bool = Field(..., description="True if generation failed, false otherwise.")
    html: str = Field(..., description="Self-contained HTML5 page or empty string if error.")
    detail: Optional[str] = Field(
        default=None,
        description="Optional diagnostic message explaining the error cause."
    )

class HealthResponse(BaseModel):
    status: str
    service: str


class JobStatus(str, Enum):
    received = "received"
    processing = "processing"
    finished = "finished"
    failed = "failed"

class AcceptedJob(BaseModel):
    job_id: str
    status: JobStatus
    expires_at: datetime

class JobResult(BaseModel):
    job_id: str
    status: JobStatus
    result: Optional[GenerateResponse] | None = None
    error: Optional[str] | None = None

class JobSummary(BaseModel):
    job_id: str
    status: JobStatus
    created_at: datetime
    expires_at: datetime

class JobListResponse(BaseModel):
    items: list[JobSummary]
    total: int
    page: int
    size: int
    has_more: bool