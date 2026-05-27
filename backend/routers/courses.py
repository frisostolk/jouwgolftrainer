from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from database import get_db
from models.course import CourseTemplate, CourseHoleTemplate, CourseHoleBunker
from schemas.course import (
    CourseTemplateCreate, CourseTemplateResponse, CourseTemplateSummary,
    CourseHoleTemplateUpdate, CourseHoleTemplateResponse,
    CourseHoleBunkerCreate, CourseHoleBunkerUpdate, CourseHoleBunkerResponse,
)
from auth.dependencies import get_current_superuser, get_current_user
from models.user import User

router = APIRouter()


def _hole_options():
    return selectinload(CourseTemplate.holes).selectinload(CourseHoleTemplate.bunkers)


async def _get_course_or_404(course_id: int, db: AsyncSession) -> CourseTemplate:
    result = await db.execute(
        select(CourseTemplate)
        .where(CourseTemplate.id == course_id)
        .options(_hole_options())
    )
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(404, "Course template not found")
    return c


async def _get_hole_or_404(course_id: int, hole_number: int, db: AsyncSession) -> CourseHoleTemplate:
    result = await db.execute(
        select(CourseHoleTemplate)
        .where(
            CourseHoleTemplate.course_id == course_id,
            CourseHoleTemplate.hole_number == hole_number,
        )
        .options(selectinload(CourseHoleTemplate.bunkers))
    )
    hole = result.scalar_one_or_none()
    if not hole:
        raise HTTPException(404, "Hole not found")
    return hole


@router.get("/lookup", response_model=CourseTemplateResponse)
async def lookup_course(
    name: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(CourseTemplate)
        .where(func.lower(CourseTemplate.name) == func.lower(name))
        .options(_hole_options())
    )
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(404, "Course template not found")
    return c


@router.get("", response_model=list[CourseTemplateSummary])
async def list_courses(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(CourseTemplate).order_by(CourseTemplate.name)
    )
    return result.scalars().all()


@router.post("", response_model=CourseTemplateResponse, status_code=201)
async def create_course(
    data: CourseTemplateCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_superuser),
):
    existing = await db.execute(
        select(CourseTemplate).where(func.lower(CourseTemplate.name) == func.lower(data.name))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(409, "A course template with this name already exists")

    course = CourseTemplate(name=data.name, total_holes=data.total_holes)
    db.add(course)
    await db.flush()

    for i in range(1, data.total_holes + 1):
        db.add(CourseHoleTemplate(course_id=course.id, hole_number=i, par=4))
    await db.flush()

    return await _get_course_or_404(course.id, db)


@router.get("/{course_id}", response_model=CourseTemplateResponse)
async def get_course(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_superuser),
):
    return await _get_course_or_404(course_id, db)


@router.put("/{course_id}/holes/{hole_number}", response_model=CourseHoleTemplateResponse)
async def update_course_hole(
    course_id: int,
    hole_number: int,
    data: CourseHoleTemplateUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_superuser),
):
    hole = await _get_hole_or_404(course_id, hole_number, db)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(hole, field, value)
    await db.flush()
    await db.refresh(hole, ["bunkers"])
    return hole


# ─── Bunker endpoints ────────────────────────────────────────────────────────

@router.post("/{course_id}/holes/{hole_number}/bunkers", response_model=CourseHoleBunkerResponse, status_code=201)
async def add_bunker(
    course_id: int,
    hole_number: int,
    data: CourseHoleBunkerCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_superuser),
):
    hole = await _get_hole_or_404(course_id, hole_number, db)
    bunker = CourseHoleBunker(
        hole_id=hole.id,
        label=data.label,
        front_latitude=data.front_latitude,
        front_longitude=data.front_longitude,
        back_latitude=data.back_latitude,
        back_longitude=data.back_longitude,
    )
    db.add(bunker)
    await db.flush()
    await db.refresh(bunker)
    return bunker


@router.put("/{course_id}/holes/{hole_number}/bunkers/{bunker_id}", response_model=CourseHoleBunkerResponse)
async def update_bunker(
    course_id: int,
    hole_number: int,
    bunker_id: int,
    data: CourseHoleBunkerUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_superuser),
):
    hole = await _get_hole_or_404(course_id, hole_number, db)
    bunker = next((b for b in hole.bunkers if b.id == bunker_id), None)
    if not bunker:
        raise HTTPException(404, "Bunker not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(bunker, field, value)
    await db.flush()
    await db.refresh(bunker)
    return bunker


@router.delete("/{course_id}/holes/{hole_number}/bunkers/{bunker_id}", status_code=204)
async def delete_bunker(
    course_id: int,
    hole_number: int,
    bunker_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_superuser),
):
    hole = await _get_hole_or_404(course_id, hole_number, db)
    bunker = next((b for b in hole.bunkers if b.id == bunker_id), None)
    if not bunker:
        raise HTTPException(404, "Bunker not found")
    await db.delete(bunker)


@router.delete("/{course_id}", status_code=204)
async def delete_course(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_superuser),
):
    course = await _get_course_or_404(course_id, db)
    await db.delete(course)
