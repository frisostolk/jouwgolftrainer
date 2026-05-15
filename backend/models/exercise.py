from sqlalchemy import String, Text, Integer, Float, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base
from models.mixins import TimestampMixin


class Exercise(TimestampMixin, Base):
    __tablename__ = "exercises"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    category: Mapped[str] = mapped_column(String(50))
    difficulty: Mapped[str] = mapped_column(String(20), default="beginner")
    duration_minutes: Mapped[int] = mapped_column(Integer, default=15)
    thumbnail_url: Mapped[str | None] = mapped_column(String(500), default=None)
    demo_video_url: Mapped[str | None] = mapped_column(String(500), default=None)
    instructions: Mapped[list | None] = mapped_column(JSON, default=list)
    tags: Mapped[list | None] = mapped_column(JSON, default=list)
    is_active: Mapped[bool] = mapped_column(default=True)
    scoring_fields: Mapped[list | None] = mapped_column(JSON, default=None)

    # "public" = superuser-managed global library; "personal" = coach's own library
    library_type: Mapped[str] = mapped_column(String(20), default="public")
    owner_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), default=None)

    session_exercises: Mapped[list["SessionExercise"]] = relationship(back_populates="exercise")
    assignments: Mapped[list["ExerciseAssignment"]] = relationship(
        back_populates="exercise", cascade="all, delete-orphan"
    )
