from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload
from database import get_db
from models.exercise import Exercise
from models.session import TrainingSession, SessionExercise
from models.connection import ExerciseAssignment
from models.user import User
from schemas.exercise import ExerciseCreate, ExerciseUpdate, ExerciseResponse, ExerciseLogRequest
from schemas.session import SessionResponse
from auth.dependencies import get_current_user, get_current_coach
from datetime import datetime, timezone
from typing import Optional

router = APIRouter()


def _can_manage(user: User, exercise: Exercise) -> bool:
    if user.role in ("superuser", "admin") and exercise.library_type == "public":
        return True
    if user.role in ("coach", "admin", "superuser") and exercise.owner_id == user.id:
        return True
    return False


async def _visible_exercise_ids(user: User, db: AsyncSession) -> list[int] | None:
    """None means 'all public'. Otherwise returns explicit list."""
    # Players and coaches get: public + their own personal + assigned to them
    if user.role in ("superuser", "admin"):
        return None  # can see everything

    assigned_result = await db.execute(
        select(ExerciseAssignment.exercise_id).where(ExerciseAssignment.player_id == user.id)
    )
    assigned_ids = [r for r, in assigned_result]
    return assigned_ids  # combined with OR on library_type below


@router.get("", response_model=list[ExerciseResponse])
async def list_exercises(
    category: Optional[str] = Query(None),
    difficulty: Optional[str] = Query(None),
    library: Optional[str] = Query(None),  # public | personal | assigned
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    assigned_result = await db.execute(
        select(ExerciseAssignment.exercise_id).where(ExerciseAssignment.player_id == user.id)
    )
    assigned_ids = [r for r, in assigned_result]

    visibility = [
        Exercise.library_type == "public",
        Exercise.owner_id == user.id,
    ]
    if assigned_ids:
        visibility.append(Exercise.id.in_(assigned_ids))

    q = (
        select(Exercise)
        .where(Exercise.is_active == True, or_(*visibility))
    )

    if category:
        q = q.where(Exercise.category == category)
    if difficulty:
        q = q.where(Exercise.difficulty == difficulty)
    if library == "public":
        q = q.where(Exercise.library_type == "public")
    elif library == "personal":
        q = q.where(Exercise.library_type == "personal", Exercise.owner_id == user.id)
    elif library == "assigned":
        q = q.where(Exercise.id.in_(assigned_ids)) if assigned_ids else q.where(Exercise.id == -1)

    result = await db.execute(q.order_by(Exercise.title))
    return result.scalars().all()


@router.get("/{exercise_id}", response_model=ExerciseResponse)
async def get_exercise(
    exercise_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    exercise = await db.get(Exercise, exercise_id)
    if not exercise:
        raise HTTPException(404, "Exercise not found")

    # Check visibility
    if exercise.library_type == "public":
        return exercise
    if exercise.owner_id == user.id:
        return exercise
    assigned = await db.execute(
        select(ExerciseAssignment).where(
            ExerciseAssignment.exercise_id == exercise_id,
            ExerciseAssignment.player_id == user.id,
        )
    )
    if assigned.scalar_one_or_none():
        return exercise
    if user.role in ("superuser", "admin"):
        return exercise
    raise HTTPException(404, "Exercise not found")


@router.post("", response_model=ExerciseResponse, status_code=201)
async def create_exercise(
    data: ExerciseCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role in ("superuser", "admin"):
        library_type, owner_id = "public", None
    elif user.role == "coach":
        library_type, owner_id = "personal", user.id
    else:
        raise HTTPException(403, "Players cannot create exercises")

    exercise = Exercise(**data.model_dump(), library_type=library_type, owner_id=owner_id)
    db.add(exercise)
    await db.flush()
    await db.refresh(exercise)
    return exercise


@router.patch("/{exercise_id}", response_model=ExerciseResponse)
async def update_exercise(
    exercise_id: int,
    data: ExerciseUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    exercise = await db.get(Exercise, exercise_id)
    if not exercise or not _can_manage(user, exercise):
        raise HTTPException(404, "Exercise not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(exercise, field, value)
    await db.flush()
    await db.refresh(exercise)
    return exercise


@router.delete("/{exercise_id}", status_code=204)
async def delete_exercise(
    exercise_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    exercise = await db.get(Exercise, exercise_id)
    if not exercise or not _can_manage(user, exercise):
        raise HTTPException(404, "Exercise not found")
    await db.delete(exercise)


@router.post("/{exercise_id}/log", response_model=SessionResponse, status_code=201)
async def log_exercise(
    exercise_id: int,
    data: ExerciseLogRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    exercise = await db.get(Exercise, exercise_id)
    if not exercise:
        raise HTTPException(404, "Exercise not found")

    today = datetime.now(timezone.utc).strftime("%b %d")
    session = TrainingSession(
        user_id=user.id,
        title=f"{exercise.title} — {today}",
        notes=data.notes,
        duration_minutes=data.duration_minutes or exercise.duration_minutes,
    )
    db.add(session)
    await db.flush()

    se = SessionExercise(
        session_id=session.id,
        exercise_id=exercise_id,
        sets=data.sets,
        reps=data.reps,
        score=data.score,
        notes=data.notes,
        completed=True,
        scoring_data=data.scoring_data,
    )
    db.add(se)
    await db.flush()

    result = await db.execute(
        select(TrainingSession)
        .where(TrainingSession.id == session.id)
        .options(selectinload(TrainingSession.exercises).selectinload(SessionExercise.exercise))
    )
    return result.scalar_one()
