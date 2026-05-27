from sqlalchemy import String, Text, Integer, Float, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base
from models.mixins import TimestampMixin


class Round(TimestampMixin, Base):
    __tablename__ = "rounds"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    course_name: Mapped[str] = mapped_column(String(200))
    tee_color: Mapped[str | None] = mapped_column(String(50), default=None)
    status: Mapped[str] = mapped_column(String(20), default="active")  # active | completed
    total_holes: Mapped[int] = mapped_column(Integer, default=18)
    handicap: Mapped[float | None] = mapped_column(Float, default=None)
    notes: Mapped[str] = mapped_column(Text, default="")

    user: Mapped["User"] = relationship(back_populates="rounds")
    holes: Mapped[list["RoundHole"]] = relationship(
        back_populates="round",
        cascade="all, delete-orphan",
        order_by="RoundHole.hole_number",
    )


class RoundHole(TimestampMixin, Base):
    __tablename__ = "round_holes"

    id: Mapped[int] = mapped_column(primary_key=True)
    round_id: Mapped[int] = mapped_column(ForeignKey("rounds.id", ondelete="CASCADE"))
    hole_number: Mapped[int] = mapped_column(Integer)
    par: Mapped[int] = mapped_column(Integer)
    distance_yards: Mapped[int | None] = mapped_column(Integer, default=None)
    stroke_index: Mapped[int | None] = mapped_column(Integer, default=None)
    gross_score: Mapped[int | None] = mapped_column(Integer, default=None)
    is_complete: Mapped[bool] = mapped_column(Boolean, default=False)
    pin_latitude: Mapped[float | None] = mapped_column(Float, default=None)
    pin_longitude: Mapped[float | None] = mapped_column(Float, default=None)
    tee_latitude: Mapped[float | None] = mapped_column(Float, default=None)
    tee_longitude: Mapped[float | None] = mapped_column(Float, default=None)

    round: Mapped["Round"] = relationship(back_populates="holes")
    shots: Mapped[list["Shot"]] = relationship(
        back_populates="hole",
        cascade="all, delete-orphan",
        order_by="Shot.shot_number",
    )


class Shot(TimestampMixin, Base):
    __tablename__ = "shots"

    id: Mapped[int] = mapped_column(primary_key=True)
    hole_id: Mapped[int] = mapped_column(ForeignKey("round_holes.id", ondelete="CASCADE"))
    shot_number: Mapped[int] = mapped_column(Integer)
    latitude: Mapped[float | None] = mapped_column(Float, default=None)
    longitude: Mapped[float | None] = mapped_column(Float, default=None)
    lie_type: Mapped[str] = mapped_column(String(20))  # tee|fairway|rough|bunker|green|penalty
    club: Mapped[str | None] = mapped_column(String(50), default=None)
    result: Mapped[str | None] = mapped_column(String(20), default=None)
    distance_to_pin_yards: Mapped[float | None] = mapped_column(Float, default=None)
    stroke_gained: Mapped[float | None] = mapped_column(Float, default=None)

    hole: Mapped["RoundHole"] = relationship(back_populates="shots")
