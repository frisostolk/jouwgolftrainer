from sqlalchemy import String, Text, Integer, Float, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base
from models.mixins import TimestampMixin


class TrainingSession(TimestampMixin, Base):
    __tablename__ = "training_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(200))
    notes: Mapped[str] = mapped_column(Text, default="")
    duration_minutes: Mapped[int] = mapped_column(Integer, default=0)
    location: Mapped[str | None] = mapped_column(String(200), default=None)
    weather: Mapped[str | None] = mapped_column(String(50), default=None)
    mood: Mapped[int | None] = mapped_column(Integer, default=None)  # 1-5
    overall_score: Mapped[float | None] = mapped_column(Float, default=None)
    status: Mapped[str] = mapped_column(String(20), default="completed")  # planned | completed

    user: Mapped["User"] = relationship(back_populates="sessions")
    exercises: Mapped[list["SessionExercise"]] = relationship(
        back_populates="session", cascade="all, delete-orphan"
    )
    videos: Mapped[list["Video"]] = relationship(back_populates="session")


class SessionExercise(TimestampMixin, Base):
    __tablename__ = "session_exercises"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("training_sessions.id", ondelete="CASCADE"))
    exercise_id: Mapped[int] = mapped_column(ForeignKey("exercises.id"))
    sets: Mapped[int | None] = mapped_column(Integer, default=None)
    reps: Mapped[int | None] = mapped_column(Integer, default=None)
    score: Mapped[float | None] = mapped_column(Float, default=None)
    notes: Mapped[str] = mapped_column(Text, default="")
    completed: Mapped[bool] = mapped_column(default=False)
    scoring_data: Mapped[dict | None] = mapped_column(JSON, default=None)

    session: Mapped["TrainingSession"] = relationship(back_populates="exercises")
    exercise: Mapped["Exercise"] = relationship(back_populates="session_exercises")
