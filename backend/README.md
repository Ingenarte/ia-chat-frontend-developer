# Backend — FastAPI Orchestrator for Local LLM (Ollama + Qwen2.5‑Coder 3B)

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.x-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Pytest](https://img.shields.io/badge/Test-Pytest-0A9EDC?logo=pytest)](https://docs.pytest.org/)
[![Cloudflare Tunnel](https://img.shields.io/badge/Cloudflare%20Tunnel-secure-F38020?logo=cloudflare)](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
[![Ollama](https://img.shields.io/badge/Ollama-local-000000?logo=ollama&logoColor=white)](https://ollama.com/)

This service exposes a clean API to generate **single‑file HTML** artifacts using a **local LLM** (Ollama running **Qwen2.5‑Coder 3B**). It implements **job‑based orchestration**, **strict HTML validation**, **CORS**, and **expiring artifacts**.

## Features

- **/api/ai/** router with health, job submission, and stats.
- **Job Store** with TTL reaper.
- **Validator** that enforces doc structure, inline assets, semantics.
- **Deterministic prompting** to reduce drift and ensure fully offline HTML.

## Requirements

- Python **3.11+**
- Ollama installed locally with model `qwen2.5-coder:3b` pulled.
- (Optional) Cloudflare Tunnel for public HTTPS.

## Environment

Create `.env` at the project root (see also defaults in code):

```env
# Ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5-coder:3b

# Generation controls
GENERATION_TIMEOUT_SECONDS=60
GEN_MAX_RETRIES=5
GEN_MIN_SCORE=0.80
DEFAULT_NUM_PREDICT=512

# Server
HOST=0.0.0.0
PORT=8000
```

## Install & Run (local)

```bash
python -m venv .venv && source .venv/bin/activate    # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host ${HOST:-0.0.0.0} --port ${PORT:-8000}
```

## Endpoints (manual)

> Base path: `/api/ai`

### Health

```http
GET /api/ai/health
200 OK
{"status":"ok","service":"ai-frontend-chat-service"}
```

### Submit job (generate)

```http
POST /api/ai/generate
Content-Type: application/json

{
  "message": "Create a landing page with rotating hero and 10 cars",
  "temperature": 0.35,
  "top_p": 0.95,
  "previous_html": null
}
```

**Response** (`202 Accepted`):
```json
{
  "job_id": "UUID",
  "status": "received",
  "expires_at": "2025-08-22T00:00:00Z"
}
```

### Fetch result

```http
GET /api/ai/result/{job_id}
```

**Response** (`200 OK`):
```json
{
  "status": "finished",
  "message": "string",
  "result": {
    "error": false,
    "html": "<!doctype html>...",
    "detail": null
  }
}
```

> **Job status enum** (per tests): `received | processing | finished | failed`.

### List jobs (paged)

```http
GET /api/ai/jobs?page=1&size=10
```

**Response**:
```json
{
  "items": [
    {"job_id":"...","status":"received","created_at":"...","expires_at":"..."}
  ],
  "total": 1,
  "page": 1,
  "size": 10,
  "has_more": false
}
```

### Stats

```http
GET /api/ai/jobs/stats
```

Aggregated counters for live and cumulative usage.

## Cloudflare Tunnel (optional)

Expose the API publicly with a quick tunnel:

```bash
cloudflared tunnel --url http://localhost:8000
```

Use the printed HTTPS URL as the frontend `BACKEND_BASE_URL`.

## Testing

```bash
pytest
```

Pytest suite covers health, CORS, job/store behavior, and schema guarantees.

## Notes on Validation

The validator rejects outputs that violate:
- Missing `<!doctype html>`, duplicated root tags, unclosed tags
- External assets (`<link rel="stylesheet">`, external `<script src>`, remote images)
- Missing semantics (lang, meta charset, title)

This ensures **single‑file, offline‑runnable** artifacts.
