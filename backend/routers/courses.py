from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from database import get_db
from models.course import CourseTemplate, CourseHoleTemplate
from schemas.course import (
    CourseTemplateCreate, CourseTemplateResponse, CourseTemplateSummary,
    CourseHoleTemplateUpdate, CourseHoleTemplateResponse,
)
from auth.dependencies import get_current_superuser, get_current_user
from models.user import User

router = APIRouter()


async def _get_course_or_404(course_id: int, db: AsyncSession) -> CourseTemplate:
    result = await db.execute(
        select(CourseTemplate)
        .where(CourseTemplate.id == course_id)
        .options(selectinload(CourseTemplate.holes))
    )
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(404, "Course template not found")
    return c


@router.get("/lookup", response_model=CourseTemplateResponse)
async def lookup_course(
    name: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(CourseTemplate)
        .where(func.lower(CourseTemplate.name) == func.lower(name))
        .options(selectinload(CourseTemplate.holes))
    )
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(404, "Course template not found")
    return c


@router.get("", response_model=list[CourseTemplateSummary])
async def list_courses(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_superuser),
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
    result = await db.execute(
        select(CourseHoleTemplate).where(
            CourseHoleTemplate.course_id == course_id,
            CourseHoleTemplate.hole_number == hole_number,
        )
    )
    hole = result.scalar_one_or_none()
    if not hole:
        raise HTTPException(404, "Hole not found")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(hole, field, value)
    await db.flush()
    await db.refresh(hole)
    return hole


@router.delete("/{course_id}", status_code=204)
async def delete_course(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_superuser),
):
    course = await _get_course_or_404(course_id, db)
    await db.delete(course)
