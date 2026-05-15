from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from config import get_settings
from database import engine, Base
from routers import auth, exercises, sessions, videos, coach, stats, connections

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    docs_url="/api/docs" if settings.debug else None,
    redoc_url=None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(exercises.router, prefix="/api/exercises", tags=["exercises"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["sessions"])
app.include_router(videos.router, prefix="/api/videos", tags=["videos"])
app.include_router(coach.router, prefix="/api/coach", tags=["coach"])
app.include_router(stats.router, prefix="/api/stats", tags=["stats"])
app.include_router(connections.router, prefix="/api/connections", tags=["connections"])


@app.get("/api/health")
async def health():
    return {"status": "ok", "environment": settings.environment}
