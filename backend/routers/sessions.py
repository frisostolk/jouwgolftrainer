from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from database import get_db
from models.session import TrainingSession, SessionExercise
from models.user import User
from schemas.session import SessionCreate, SessionUpdate, SessionResponse, SessionExerciseResponse
from auth.dependencies import get_current_user
from pydantic import BaseModel
from typing import Optional

router = APIRouter()


async def _get_session_or_404(session_id: int, user_id: int, db: AsyncSession) -> TrainingSession:
    result = await db.execute(
        select(TrainingSession)
        .where(TrainingSession.id == session_id, TrainingSession.user_id == user_id)
        .options(selectinload(TrainingSession.exercises).selectinload(SessionExercise.exercise))
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Session not found")
    return session


@router.get("", response_model=list[SessionResponse])
async def list_sessions(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TrainingSession)
        .where(TrainingSession.user_id == user.id)
        .options(selectinload(TrainingSession.exercises).selectinload(SessionExercise.exercise))
        .order_by(TrainingSession.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _get_session_or_404(session_id, user.id, db)


@router.post("", response_model=SessionResponse, status_code=201)
async def create_session(
    data: SessionCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    exercises = data.exercises
    session_data = data.model_dump(exclude={"exercises"})
    session = TrainingSession(user_id=user.id, **session_data)
    db.add(session)
    await db.flush()

    for ex_data in exercises:
        se = SessionExercise(session_id=session.id, **ex_data.model_dump())
        db.add(se)

    await db.flush()
    return await _get_session_or_404(session.id, user.id, db)


@router.patch("/{session_id}", response_model=SessionResponse)
async def update_session(
    session_id: int,
    data: SessionUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await _get_session_or_404(session_id, user.id, db)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(session, field, value)
    await db.flush()
    return await _get_session_or_404(session_id, user.id, db)


@router.delete("/{session_id}", status_code=204)
async def delete_session(
    session_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await _get_session_or_404(session_id, user.id, db)
    await db.delete(session)


class SessionExerciseUpdate(BaseModel):
    completed: Optional[bool] = None
    score: Optional[float] = None
    notes: Optional[str] = None
    scoring_data: Optional[dict[str, float]] = None


@router.patch("/{session_id}/exercises/{exercise_id}", response_model=SessionExerciseResponse)
async def update_session_exercise(
    session_id: int,
    exercise_id: int,
    data: SessionExerciseUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_session_or_404(session_id, user.id, db)
    result = await db.execute(
        select(SessionExercise)
        .where(SessionExercise.session_id == session_id, SessionExercise.id == exercise_id)
        .options(selectinload(SessionExercise.exercise))
    )
    se = result.scalar_one_or_none()
    if not se:
        raise HTTPException(404, "Exercise not found in session")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(se, field, value)
    await db.flush()
    return se


class FinishSessionData(BaseModel):
    duration_minutes: Optional[int] = None
    overall_score: Optional[float] = None
    mood: Optional[int] = None
    notes: Optional[str] = None


@router.post("/{session_id}/finish", response_model=SessionResponse)
async def finish_session(
    session_id: int,
    data: FinishSessionData,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await _get_session_or_404(session_id, user.id, db)
    session.status = "completed"
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(session, field, value)
    await db.flush()
    return await _get_session_or_404(session_id, user.id, db)
