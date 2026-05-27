from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlalchemy import select, text
from config import get_settings
from database import engine, Base
from routers import auth, exercises, sessions, videos, coach, stats, connections, rounds, courses, admin
import models.round  # noqa: F401 — ensures Round/RoundHole/Shot tables are registered
import models.course  # noqa: F401 — ensures CourseTemplate/CourseHoleTemplate tables are registered

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Add columns that may be missing from tables created before they were added to the model
        for stmt in [
            "ALTER TABLE round_holes ADD COLUMN IF NOT EXISTS tee_latitude FLOAT",
            "ALTER TABLE round_holes ADD COLUMN IF NOT EXISTS tee_longitude FLOAT",
            "ALTER TABLE round_holes ADD COLUMN IF NOT EXISTS green_front_latitude FLOAT",
            "ALTER TABLE round_holes ADD COLUMN IF NOT EXISTS green_front_longitude FLOAT",
            "ALTER TABLE round_holes ADD COLUMN IF NOT EXISTS green_middle_latitude FLOAT",
            "ALTER TABLE round_holes ADD COLUMN IF NOT EXISTS green_middle_longitude FLOAT",
            "ALTER TABLE round_holes ADD COLUMN IF NOT EXISTS green_back_latitude FLOAT",
            "ALTER TABLE round_holes ADD COLUMN IF NOT EXISTS green_back_longitude FLOAT",
            "ALTER TABLE course_hole_hazards ADD COLUMN IF NOT EXISTS radius_meters FLOAT",
            "ALTER TABLE course_hole_templates ADD COLUMN IF NOT EXISTS green_front_latitude FLOAT",
            "ALTER TABLE course_hole_templates ADD COLUMN IF NOT EXISTS green_front_longitude FLOAT",
            "ALTER TABLE course_hole_templates ADD COLUMN IF NOT EXISTS green_middle_latitude FLOAT",
            "ALTER TABLE course_hole_templates ADD COLUMN IF NOT EXISTS green_middle_longitude FLOAT",
            "ALTER TABLE course_hole_templates ADD COLUMN IF NOT EXISTS green_back_latitude FLOAT",
            "ALTER TABLE course_hole_templates ADD COLUMN IF NOT EXISTS green_back_longitude FLOAT",
        ]:
            try:
                await conn.execute(text(stmt))
            except Exception:
                pass

    # Promote SUPERUSER_EMAIL to superuser role if configured
    if settings.superuser_email:
        from models.user import User
        async with engine.begin() as conn:
            from sqlalchemy.ext.asyncio import AsyncSession
            from sqlalchemy.orm import sessionmaker
            AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
            async with AsyncSessionLocal() as db:
                result = await db.execute(
                    select(User).where(User.email == settings.superuser_email)
                )
                user = result.scalar_one_or_none()
                if user and user.role != "superuser":
                    user.role = "superuser"
                    user.is_active = True
                    await db.commit()

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
app.include_router(rounds.router, prefix="/api/rounds", tags=["rounds"])
app.include_router(courses.router, prefix="/api/courses", tags=["courses"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])


@app.get("/api/health")
async def health():
    return {"status": "ok", "environment": settings.environment}
