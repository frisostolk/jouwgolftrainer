from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from database import get_db
from models.round import Round, RoundHole, Shot
from models.user import User
from schemas.round import (
    RoundCreate, RoundUpdate, RoundResponse, RoundSummary,
    ShotCreate, ShotResponse, StrokeGainedResponse, StrokeGainedHole,
)
from auth.dependencies import get_current_user
from services.stroke_gained import compute_and_store_hole_sg, calculate_hole_sg, calculate_round_sg

router = APIRouter()


async def _get_round_or_404(round_id: int, user_id: int, db: AsyncSession) -> Round:
    result = await db.execute(
        select(Round)
        .where(Round.id == round_id, Round.user_id == user_id)
        .options(selectinload(Round.holes).selectinload(RoundHole.shots))
    )
    r = result.scalar_one_or_none()
    if not r:
        raise HTTPException(404, "Round not found")
    return r


async def _get_hole_or_404(round_id: int, hole_number: int, user_id: int, db: AsyncSession) -> RoundHole:
    result = await db.execute(
        select(RoundHole)
        .join(Round)
        .where(Round.id == round_id, Round.user_id == user_id, RoundHole.hole_number == hole_number)
        .options(selectinload(RoundHole.shots))
    )
    hole = result.scalar_one_or_none()
    if not hole:
        raise HTTPException(404, "Hole not found")
    return hole


@router.post("", response_model=RoundResponse, status_code=201)
async def create_round(
    data: RoundCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    r = Round(
        user_id=user.id,
        course_name=data.course_name,
        tee_color=data.tee_color,
        total_holes=data.total_holes,
        handicap=data.handicap,
    )
    db.add(r)
    await db.flush()

    for h in data.holes:
        db.add(RoundHole(
            round_id=r.id,
            hole_number=h.hole_number,
            par=h.par,
            distance_yards=h.distance_yards,
            stroke_index=h.stroke_index,
        ))

    await db.flush()
    return await _get_round_or_404(r.id, user.id, db)


@router.get("", response_model=list[RoundSummary])
async def list_rounds(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Round)
        .where(Round.user_id == user.id)
        .order_by(Round.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{round_id}", response_model=RoundResponse)
async def get_round(
    round_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _get_round_or_404(round_id, user.id, db)


@router.patch("/{round_id}", response_model=RoundResponse)
async def update_round(
    round_id: int,
    data: RoundUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    r = await _get_round_or_404(round_id, user.id, db)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(r, field, value)
    await db.flush()
    return await _get_round_or_404(round_id, user.id, db)


@router.delete("/{round_id}", status_code=204)
async def delete_round(
    round_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    r = await _get_round_or_404(round_id, user.id, db)
    await db.delete(r)


@router.post("/{round_id}/holes/{hole_number}/shots", response_model=ShotResponse, status_code=201)
async def add_shot(
    round_id: int,
    hole_number: int,
    data: ShotCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    hole = await _get_hole_or_404(round_id, hole_number, user.id, db)
    if hole.is_complete:
        raise HTTPException(400, "Hole is already complete")

    shot_number = len(hole.shots) + 1
    shot = Shot(
        hole_id=hole.id,
        shot_number=shot_number,
        latitude=data.latitude,
        longitude=data.longitude,
        lie_type=data.lie_type,
        club=data.club,
        result="hole" if data.is_hole_out else None,
    )
    db.add(shot)
    await db.flush()

    if data.is_hole_out and data.latitude is not None and data.longitude is not None:
        hole.is_complete = True
        hole.gross_score = shot_number
        hole.pin_latitude = data.latitude
        hole.pin_longitude = data.longitude
        await db.flush()
        await db.refresh(hole, ["shots"])
        compute_and_store_hole_sg(hole)
        await db.flush()

    await db.refresh(shot)
    return shot


@router.delete("/{round_id}/holes/{hole_number}/shots/{shot_id}", status_code=204)
async def delete_shot(
    round_id: int,
    hole_number: int,
    shot_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    hole = await _get_hole_or_404(round_id, hole_number, user.id, db)
    shot = next((s for s in hole.shots if s.id == shot_id), None)
    if not shot:
        raise HTTPException(404, "Shot not found")

    was_hole_out = shot.result == "hole"
    await db.delete(shot)
    await db.flush()
    await db.refresh(hole, ["shots"])

    remaining = sorted(hole.shots, key=lambda s: s.shot_number)
    for i, s in enumerate(remaining):
        s.shot_number = i + 1

    if was_hole_out:
        hole.is_complete = False
        hole.gross_score = None
        hole.pin_latitude = None
        hole.pin_longitude = None
        for s in remaining:
            s.distance_to_pin_yards = None
            s.stroke_gained = None

    await db.flush()


@router.get("/{round_id}/stroke-gained", response_model=StrokeGainedResponse)
async def get_stroke_gained(
    round_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    r = await _get_round_or_404(round_id, user.id, db)
    completed_holes = [h for h in r.holes if h.is_complete]

    total_sg = calculate_round_sg(r.holes)
    total_score = sum(h.gross_score for h in completed_holes if h.gross_score) or None
    total_par = sum(h.par for h in completed_holes)
    vs_par = (total_score - total_par) if total_score is not None else None

    by_hole = []
    for hole in r.holes:
        if hole.is_complete:
            hsg = calculate_hole_sg(hole)
            by_hole.append(StrokeGainedHole(
                hole_number=hole.hole_number,
                par=hole.par,
                gross_score=hole.gross_score,
                vs_par=(hole.gross_score - hole.par) if hole.gross_score else None,
                sg_total=round(hsg["total"], 3),
                sg_off_tee=round(hsg["off_tee"], 3),
                sg_approach=round(hsg["approach"], 3),
                sg_around_green=round(hsg["around_green"], 3),
                sg_putting=round(hsg["putting"], 3),
            ))

    return StrokeGainedResponse(
        round_id=round_id,
        holes_completed=len(completed_holes),
        total_score=total_score,
        total_par=total_par,
        vs_par=vs_par,
        sg_total=round(total_sg["total"], 3),
        sg_off_tee=round(total_sg["off_tee"], 3),
        sg_approach=round(total_sg["approach"], 3),
        sg_around_green=round(total_sg["around_green"], 3),
        sg_putting=round(total_sg["putting"], 3),
        by_hole=by_hole,
    )
