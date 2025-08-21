from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from .routers.ai import router as ai_router
from .services.jobs import job_store

@asynccontextmanager
async def lifespan(app: FastAPI):
    await job_store.start_reaper()
    try:
        yield
    finally:
        await job_store.stop_reaper()

app = FastAPI(title="AI Frontend Chat Service", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ai_router)
