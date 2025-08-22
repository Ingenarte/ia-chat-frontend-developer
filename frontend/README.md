# Frontend — Next.js (TypeScript) Chat UI with Live HTML Preview

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Jest](https://img.shields.io/badge/Test-Jest-C21325?logo=jest&logoColor=white)](https://jestjs.io/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel)](https://vercel.com/)

A minimalist, production‑minded UI that behaves like a **nano‑Replit**: you chat with the AI, and the **preview pane** renders the **single‑file HTML** returned by the backend. Includes graceful states, modal UX, and a small component system.

## Features

- **ChatPanel** to send prompts and display assistant responses
- **PreviewPane** renders returned HTML securely
- **Stats/Service modals** and guardrails for disabled service states
- **Type‑safe API client** and tests via **Jest**

## Requirements

- Node.js **18+**
- `BACKEND_BASE_URL` pointing to the FastAPI service

## Environment

Copy `env.template` to `.env.local` and set variables:

```env
# Backend base URL: Local dev, Cloudflare Tunnel, or any public endpoint
NEXT_PUBLIC_BACKEND_BASE_URL=http://localhost:8000
# Optional: feature flags or UI toggles can be added here
```

## Install & Run (local)

```bash
npm install
npm run dev
# Open http://localhost:3000
```

## Build & Production

```bash
npm run build
npm start
```

### Vercel Deployment

1. Push the project to GitHub.
2. Import the repo in Vercel.
3. Set **Environment Variable** `NEXT_PUBLIC_BACKEND_BASE_URL` to your API origin (local, server, or Cloudflare Tunnel URL).
4. Deploy.

## How it connects to the backend

The UI calls the backend endpoints under `/api/ai/*`:
- `GET /api/ai/health` for availability checks
- `POST /api/ai/generate` to enqueue a generation job
- `GET /api/ai/result/{job_id}` to retrieve the generated HTML
- `GET /api/ai/jobs/stats` for basic dashboard metrics

## Testing

```bash
npm test
# or
npm run test
```

Jest covers key components (`ChatPanel`, `PreviewPane`, modals) and integration behaviors.
