from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload
from database import get_db
from models.connection import CoachPlayerConnection, ExerciseAssignment
from models.exercise import Exercise
from models.user import User
from schemas.connection import ConnectionInvite, ConnectionRespond, ConnectionResponse, AssignExerciseRequest, AssignmentResponse
from auth.dependencies import get_current_user, get_current_coach

router = APIRouter()


def _load_connection():
    return selectinload(CoachPlayerConnection.coach), selectinload(CoachPlayerConnection.player)


async def _get_accepted_player_ids(coach_id: int, db: AsyncSession) -> list[int]:
    result = await db.execute(
        select(CoachPlayerConnection.player_id).where(
            CoachPlayerConnection.coach_id == coach_id,
            CoachPlayerConnection.status == "accepted",
        )
    )
    return [r for r, in result]


# ── Coach sends invite by player email ────────────────────────────────────────

@router.post("/invite", response_model=ConnectionResponse, status_code=201)
async def invite_player(
    data: ConnectionInvite,
    coach: User = Depends(get_current_coach),
    db: AsyncSession = Depends(get_db),
):
    player_result = await db.execute(select(User).where(User.email == data.player_email))
    player = player_result.scalar_one_or_none()
    if not player:
        raise HTTPException(404, "No user with that email address")
    if player.role not in ("player",):
        raise HTTPException(400, "You can only invite players")
    if player.id == coach.id:
        raise HTTPException(400, "Cannot invite yourself")

    existing = await db.execute(
        select(CoachPlayerConnection).where(
            CoachPlayerConnection.coach_id == coach.id,
            CoachPlayerConnection.player_id == player.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(409, "Invite already exists")

    conn = CoachPlayerConnection(coach_id=coach.id, player_id=player.id, message=data.message)
    db.add(conn)
    await db.flush()

    result = await db.execute(
        select(CoachPlayerConnection)
        .where(CoachPlayerConnection.id == conn.id)
        .options(*_load_connection())
    )
    return result.scalar_one()


# ── List connections (both sides) ─────────────────────────────────────────────

@router.get("", response_model=list[ConnectionResponse])
async def list_connections(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CoachPlayerConnection)
        .where(
            or_(
                CoachPlayerConnection.coach_id == user.id,
                CoachPlayerConnection.player_id == user.id,
            )
        )
        .options(*_load_connection())
        .order_by(CoachPlayerConnection.created_at.desc())
    )
    return result.scalars().all()


# ── Player responds to invite ──────────────────────────────────────────────────

@router.patch("/{connection_id}/respond", response_model=ConnectionResponse)
async def respond_to_invite(
    connection_id: int,
    data: ConnectionRespond,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if data.status not in ("accepted", "declined"):
        raise HTTPException(400, "status must be 'accepted' or 'declined'")

    conn = await db.get(CoachPlayerConnection, connection_id)
    if not conn or conn.player_id != user.id:
        raise HTTPException(404, "Invite not found")
    if conn.status != "pending":
        raise HTTPException(400, "Invite already responded to")

    conn.status = data.status
    await db.flush()

    result = await db.execute(
        select(CoachPlayerConnection)
        .where(CoachPlayerConnection.id == conn.id)
        .options(*_load_connection())
    )
    return result.scalar_one()


# ── Disconnect ─────────────────────────────────────────────────────────────────

@router.delete("/{connection_id}", status_code=204)
async def disconnect(
    connection_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conn = await db.get(CoachPlayerConnection, connection_id)
    if not conn or (conn.coach_id != user.id and conn.player_id != user.id):
        raise HTTPException(404, "Connection not found")
    await db.delete(conn)


# ── Coach assigns an exercise to a connected player ───────────────────────────

@router.post("/assign", response_model=AssignmentResponse, status_code=201)
async def assign_exercise(
    data: AssignExerciseRequest,
    exercise_id: int,
    coach: User = Depends(get_current_coach),
    db: AsyncSession = Depends(get_db),
):
    exercise = await db.get(Exercise, exercise_id)
    if not exercise or not exercise.is_active:
        raise HTTPException(404, "Exercise not found")
    if exercise.library_type == "personal" and exercise.owner_id != coach.id:
        raise HTTPException(403, "Cannot assign an exercise you don't own")

    player_ids = await _get_accepted_player_ids(coach.id, db)
    if data.player_id not in player_ids:
        raise HTTPException(403, "Player is not connected to you")

    existing = await db.execute(
        select(ExerciseAssignment).where(
            ExerciseAssignment.exercise_id == exercise_id,
            ExerciseAssignment.coach_id == coach.id,
            ExerciseAssignment.player_id == data.player_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(409, "Already assigned")

    assignment = ExerciseAssignment(
        exercise_id=exercise_id,
        coach_id=coach.id,
        player_id=data.player_id,
        message=data.message,
    )
    db.add(assignment)
    await db.flush()

    result = await db.execute(
        select(ExerciseAssignment)
        .where(ExerciseAssignment.id == assignment.id)
        .options(
            selectinload(ExerciseAssignment.exercise),
            selectinload(ExerciseAssignment.coach),
        )
    )
    return result.scalar_one()


# ── Player sees their assignments ─────────────────────────────────────────────

@router.get("/assignments", response_model=list[AssignmentResponse])
async def my_assignments(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ExerciseAssignment)
        .where(ExerciseAssignment.player_id == user.id)
        .options(
            selectinload(ExerciseAssignment.exercise),
            selectinload(ExerciseAssignment.coach),
        )
        .order_by(ExerciseAssignment.created_at.desc())
    )
    return result.scalars().all()
