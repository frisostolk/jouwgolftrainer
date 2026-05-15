from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.sql.functions import coalesce
from sqlalchemy.orm import selectinload
from database import get_db
from models.coach import CoachNote
from models.connection import CoachPlayerConnection
from models.session import TrainingSession, SessionExercise
from models.video import Video
from models.exercise import Exercise
from models.user import User
from schemas.coach import CoachNoteCreate, CoachNoteUpdate, CoachNoteResponse
from schemas.session import SessionResponse
from schemas.stats import OverallStats
from auth.dependencies import get_current_user, get_current_coach
from datetime import datetime, timezone, timedelta
from typing import Optional

router = APIRouter()


async def _require_connected_player(coach_id: int, player_id: int, db: AsyncSession) -> User:
    conn = await db.execute(
        select(CoachPlayerConnection).where(
            CoachPlayerConnection.coach_id == coach_id,
            CoachPlayerConnection.player_id == player_id,
            CoachPlayerConnection.status == "accepted",
        )
    )
    if not conn.scalar_one_or_none():
        raise HTTPException(403, "Player is not connected to you")
    player = await db.get(User, player_id)
    if not player:
        raise HTTPException(404, "Player not found")
    return player


# ── Connected players ─────────────────────────────────────────────────────────

@router.get("/players", response_model=list)
async def list_players(
    coach: User = Depends(get_current_coach),
    db: AsyncSession = Depends(get_db),
):
    from schemas.user import UserResponse
    result = await db.execute(
        select(User)
        .join(CoachPlayerConnection, CoachPlayerConnection.player_id == User.id)
        .where(
            CoachPlayerConnection.coach_id == coach.id,
            CoachPlayerConnection.status == "accepted",
        )
    )
    return [UserResponse.model_validate(u) for u in result.scalars().all()]


# ── View a connected player's sessions ────────────────────────────────────────

@router.get("/players/{player_id}/sessions", response_model=list[SessionResponse])
async def player_sessions(
    player_id: int,
    coach: User = Depends(get_current_coach),
    db: AsyncSession = Depends(get_db),
):
    await _require_connected_player(coach.id, player_id, db)
    result = await db.execute(
        select(TrainingSession)
        .where(TrainingSession.user_id == player_id)
        .options(selectinload(TrainingSession.exercises).selectinload(SessionExercise.exercise))
        .order_by(TrainingSession.created_at.desc())
        .limit(50)
    )
    return result.scalars().all()


# ── View a connected player's stats ───────────────────────────────────────────

@router.get("/players/{player_id}/stats", response_model=OverallStats)
async def player_stats(
    player_id: int,
    coach: User = Depends(get_current_coach),
    db: AsyncSession = Depends(get_db),
):
    await _require_connected_player(coach.id, player_id, db)

    row = (await db.execute(
        select(
            func.count(TrainingSession.id).label("total_sessions"),
            coalesce(func.sum(TrainingSession.duration_minutes), 0).label("total_minutes"),
            func.avg(TrainingSession.overall_score).label("avg_score"),
        ).where(TrainingSession.user_id == player_id)
    )).one()

    total_videos = (await db.execute(
        select(func.count(Video.id)).where(Video.user_id == player_id)
    )).scalar() or 0

    # Simple streak
    days_result = await db.execute(
        select(func.date(TrainingSession.created_at).label("day"))
        .where(TrainingSession.user_id == player_id)
        .group_by(func.date(TrainingSession.created_at))
        .order_by(func.date(TrainingSession.created_at).desc())
        .limit(60)
    )
    days = [r.day for r in days_result]
    streak = 0
    today = datetime.now(timezone.utc).date()
    for i, day in enumerate(days):
        if str(day) == str(today - timedelta(days=i)):
            streak += 1
        else:
            break

    return OverallStats(
        total_sessions=row.total_sessions or 0,
        total_minutes=row.total_minutes or 0,
        total_videos=total_videos,
        avg_session_score=round(row.avg_score, 2) if row.avg_score else None,
        streak_days=streak,
    )


# ── Coach notes ───────────────────────────────────────────────────────────────

@router.get("/notes", response_model=list[CoachNoteResponse])
async def list_notes(
    player_id: Optional[int] = None,
    coach: User = Depends(get_current_coach),
    db: AsyncSession = Depends(get_db),
):
    q = (
        select(CoachNote)
        .where(CoachNote.coach_id == coach.id)
        .options(selectinload(CoachNote.coach))
    )
    if player_id:
        q = q.where(CoachNote.player_id == player_id)
    result = await db.execute(q.order_by(CoachNote.created_at.desc()))
    return result.scalars().all()


@router.get("/my-notes", response_model=list[CoachNoteResponse])
async def my_notes(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CoachNote)
        .where(CoachNote.player_id == user.id)
        .options(selectinload(CoachNote.coach))
        .order_by(CoachNote.created_at.desc())
    )
    return result.scalars().all()


@router.post("/notes", response_model=CoachNoteResponse, status_code=201)
async def create_note(
    data: CoachNoteCreate,
    coach: User = Depends(get_current_coach),
    db: AsyncSession = Depends(get_db),
):
    await _require_connected_player(coach.id, data.player_id, db)

    note = CoachNote(coach_id=coach.id, **data.model_dump())
    db.add(note)
    await db.flush()
    result = await db.execute(
        select(CoachNote).where(CoachNote.id == note.id).options(selectinload(CoachNote.coach))
    )
    return result.scalar_one()


@router.patch("/notes/{note_id}", response_model=CoachNoteResponse)
async def update_note(
    note_id: int,
    data: CoachNoteUpdate,
    coach: User = Depends(get_current_coach),
    db: AsyncSession = Depends(get_db),
):
    note = await db.get(CoachNote, note_id)
    if not note or note.coach_id != coach.id:
        raise HTTPException(404, "Note not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(note, field, value)
    await db.flush()
    result = await db.execute(
        select(CoachNote).where(CoachNote.id == note.id).options(selectinload(CoachNote.coach))
    )
    return result.scalar_one()


@router.delete("/notes/{note_id}", status_code=204)
async def delete_note(
    note_id: int,
    coach: User = Depends(get_current_coach),
    db: AsyncSession = Depends(get_db),
):
    note = await db.get(CoachNote, note_id)
    if not note or note.coach_id != coach.id:
        raise HTTPException(404, "Note not found")
    await db.delete(note)
