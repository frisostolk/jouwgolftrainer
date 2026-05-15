from sqlalchemy import String, Text, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base
from models.mixins import TimestampMixin


class CoachPlayerConnection(TimestampMixin, Base):
    __tablename__ = "coach_player_connections"
    __table_args__ = (UniqueConstraint("coach_id", "player_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    coach_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    player_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending / accepted / declined
    message: Mapped[str] = mapped_column(Text, default="")

    coach: Mapped["User"] = relationship(foreign_keys=[coach_id])
    player: Mapped["User"] = relationship(foreign_keys=[player_id])


class ExerciseAssignment(TimestampMixin, Base):
    __tablename__ = "exercise_assignments"

    id: Mapped[int] = mapped_column(primary_key=True)
    exercise_id: Mapped[int] = mapped_column(ForeignKey("exercises.id", ondelete="CASCADE"))
    coach_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    player_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    message: Mapped[str] = mapped_column(Text, default="")

    exercise: Mapped["Exercise"] = relationship()
    coach: Mapped["User"] = relationship(foreign_keys=[coach_id])
    player: Mapped["User"] = relationship(foreign_keys=[player_id])
