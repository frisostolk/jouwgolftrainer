from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from database import get_db
from models.user import User
from models.round import Round
from models.session import TrainingSession
from auth.dependencies import get_current_superuser

router = APIRouter()


class AdminUserResponse(BaseModel):
    id: int
    email: str
    name: str
    role: str
    is_active: bool
    handicap: Optional[float]
    created_at: datetime
    rounds_count: int
    sessions_count: int

    model_config = {"from_attributes": False}


class AdminUserUpdate(BaseModel):
    role: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("/users", response_model=list[AdminUserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_superuser),
):
    # Count rounds per user
    rounds_q = await db.execute(
        select(Round.user_id, func.count(Round.id).label("cnt")).group_by(Round.user_id)
    )
    rounds_by_user = {row.user_id: row.cnt for row in rounds_q}

    # Count sessions per user
    sessions_q = await db.execute(
        select(TrainingSession.user_id, func.count(TrainingSession.id).label("cnt"))
        .group_by(TrainingSession.user_id)
    )
    sessions_by_user = {row.user_id: row.cnt for row in sessions_q}

    users_q = await db.execute(select(User).order_by(User.created_at.desc()))
    users = users_q.scalars().all()

    return [
        AdminUserResponse(
            id=u.id,
            email=u.email,
            name=u.name,
            role=u.role,
            is_active=u.is_active,
            handicap=u.handicap,
            created_at=u.created_at,
            rounds_count=rounds_by_user.get(u.id, 0),
            sessions_count=sessions_by_user.get(u.id, 0),
        )
        for u in users
    ]


@router.patch("/users/{user_id}", response_model=AdminUserResponse)
async def update_user(
    user_id: int,
    data: AdminUserUpdate,
    db: AsyncSession = Depends(get_db),
    current: User = Depends(get_current_superuser),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")

    if data.role is not None:
        allowed = ("player", "coach", "admin", "superuser")
        if data.role not in allowed:
            raise HTTPException(400, f"Role must be one of {allowed}")
        user.role = data.role

    if data.is_active is not None:
        user.is_active = data.is_active

    await db.flush()
    await db.refresh(user)

    rounds_q = await db.execute(
        select(func.count(Round.id)).where(Round.user_id == user.id)
    )
    sessions_q = await db.execute(
        select(func.count(TrainingSession.id)).where(TrainingSession.user_id == user.id)
    )

    return AdminUserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        is_active=user.is_active,
        handicap=user.handicap,
        created_at=user.created_at,
        rounds_count=rounds_q.scalar() or 0,
        sessions_count=sessions_q.scalar() or 0,
    )
