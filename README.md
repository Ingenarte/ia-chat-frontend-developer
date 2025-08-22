# AI Frontend Chat Service — Self‑Hosted, AI‑Driven Web Developer

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.x-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Ollama](https://img.shields.io/badge/Ollama-local-000000?logo=ollama&logoColor=white)](https://ollama.com/)
[![Qwen Code 3B](https://img.shields.io/badge/Model-Qwen2.5%20Coder%203B-4B9CD3)](https://ollama.com/library/qwen2.5-coder)
[![Cloudflare Tunnel](https://img.shields.io/badge/Cloudflare%20Tunnel-secure%20exposure-F38020?logo=cloudflare)](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
[![Vercel](https://img.shields.io/badge/Vercel-hosted-000000?logo=vercel)](https://vercel.com/)

> **One‑sentence value proposition:** A portfolio‑grade, production‑minded system that lets you build web pages with AI in a secure, self‑hosted stack — you own the model, the data, and the infrastructure.

This repository contains a **full‑stack AI product**:

- **Frontend**: Next.js (App Router, TypeScript) UI that behaves like a “nano‑Replit” — a chat interface where the assistant iteratively **generates and refines a single‑file HTML page** and renders it live.
- **Backend**: FastAPI service that orchestrates **Ollama** with **Qwen2.5‑Coder 3B**, validates outputs, and exposes a clean API (`/api/ai/...`) for job‑style generation.
- **Connectivity**: Secure public exposure via **Cloudflare Tunnel**, and easy frontend deployment on **Vercel**.
- **Testing**: Jest (frontend) and Pytest (backend).

The project demonstrates **senior full‑stack and AI engineering** practices: modular architecture, strict validation, job orchestration, deterministic prompts, environment isolation, and production‑ready operational concerns (CORS, TTL reaper, health/stats endpoints).

---

## Architecture (Mermaid)

```mermaid
flowchart LR
    subgraph Browser["User Browser"]
        UI["Chat UI"]
        Preview["Live HTML Preview"]
    end

    subgraph Vercel["Frontend (Next.js, Vercel)"]
        FE["/app (Next.js 15, TS)"]
    end

    subgraph Server["Backend (FastAPI, Python 3.11)"]
        API["/api/ai/*"]
        Runner["Job Runner / Validator"]
    end

    subgraph LocalAI["Local AI Runtime"]
        Ollama["Ollama"]
        Qwen["Qwen2.5 Coder 3B"]
    end

    CF["Cloudflare Tunnel"]

    UI --> FE
    FE -->|REST| API
    API --> Runner
    Runner -->|LLM calls| Ollama
    Ollama --> Qwen

    API <-->|public HTTPS| CF
    CF <-->|secure tunnel| Server

    FE -->|Deploy| Vercel
```

---

## What it does

- Provides an **AI chat assistant specialized in frontend** that **returns a single, valid HTML5 document** per request.
- Enforces **strict output validation** (doctype, one `<html>/<head>/<body>`, no external assets, semantics checks).
- Implements **asynchronous, job‑based generation** with expiration and status tracking.
- Can run **end‑to‑end locally** or be **publicly reachable** via Cloudflare Tunnel. Frontend can be deployed to Vercel.

---

## Repos & structure

- `frontend/` — Next.js app (TypeScript).  
- `backend/` — FastAPI app (Python).

Each subproject has its own `README.md` with setup and operations guides.

---

## Quickstart (local, minimal)

> Prerequisites: Node.js 18+, Python 3.11+, Docker optional; Ollama installed with the **Qwen2.5‑Coder 3B** model pulled.

1. **Run Ollama locally** (first time pulls the model):
   ```bash
   ollama run qwen2.5-coder:3b
   ```

2. **Backend** (see `backend/README.md` for details):
   ```bash
   cd backend
   python -m venv .venv && source .venv/bin/activate  # Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```

3. **Frontend** (see `frontend/README.md` for details):
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Tunnel (optional, public HTTPS)**:
   ```bash
   cloudflared tunnel --url http://localhost:8000
   # Copy the provided trycloudflare URL and use it as BACKEND_BASE_URL for the frontend.
   ```

---

## Testing

- **Frontend**: `npm test` (Jest).  
- **Backend**: `pytest` (Pytest).

---

## Why this is portfolio‑grade

- **Self‑sovereign AI**: You run the model locally (Ollama) and control exposure (Cloudflare Tunnel). No vendor lock‑in.
- **Production posture**: CORS, health, stats, TTL reaper, deterministic prompts, robust validation.
- **Hiring signal**: Demonstrates **Senior Full‑Stack**, **Senior AI Engineer**, and **CTO‑level** system ownership: architecture, runtime strategy, and operational safety.
