from sqlalchemy import String, Boolean, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from database import Base
from models.mixins import TimestampMixin
import enum


class UserRole(str, enum.Enum):
    player = "player"
    coach = "coach"
    admin = "admin"
    superuser = "superuser"


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(100))
    hashed_password: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20), default="player")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    handicap: Mapped[float | None] = mapped_column(default=None)
    avatar_url: Mapped[str | None] = mapped_column(String(500), default=None)

    sessions: Mapped[list["TrainingSession"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    videos: Mapped[list["Video"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    rounds: Mapped[list["Round"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    coach_notes: Mapped[list["CoachNote"]] = relationship(
        back_populates="player",
        foreign_keys="CoachNote.player_id",
        cascade="all, delete-orphan",
    )
