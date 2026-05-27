from sqlalchemy import String, Integer, Float, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base
from models.mixins import TimestampMixin


class CourseTemplate(TimestampMixin, Base):
    __tablename__ = "course_templates"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    total_holes: Mapped[int] = mapped_column(Integer, default=18)

    holes: Mapped[list["CourseHoleTemplate"]] = relationship(
        back_populates="course",
        cascade="all, delete-orphan",
        order_by="CourseHoleTemplate.hole_number",
    )


class CourseHoleTemplate(TimestampMixin, Base):
    __tablename__ = "course_hole_templates"
    __table_args__ = (UniqueConstraint("course_id", "hole_number"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("course_templates.id", ondelete="CASCADE"))
    hole_number: Mapped[int] = mapped_column(Integer)
    par: Mapped[int] = mapped_column(Integer, default=4)
    distance_yards: Mapped[int | None] = mapped_column(Integer, default=None)
    stroke_index: Mapped[int | None] = mapped_column(Integer, default=None)
    tee_latitude: Mapped[float | None] = mapped_column(Float, default=None)
    tee_longitude: Mapped[float | None] = mapped_column(Float, default=None)
    green_front_latitude: Mapped[float | None] = mapped_column(Float, default=None)
    green_front_longitude: Mapped[float | None] = mapped_column(Float, default=None)
    green_middle_latitude: Mapped[float | None] = mapped_column(Float, default=None)
    green_middle_longitude: Mapped[float | None] = mapped_column(Float, default=None)
    green_back_latitude: Mapped[float | None] = mapped_column(Float, default=None)
    green_back_longitude: Mapped[float | None] = mapped_column(Float, default=None)

    course: Mapped["CourseTemplate"] = relationship(back_populates="holes")
    bunkers: Mapped[list["CourseHoleBunker"]] = relationship(
        back_populates="hole",
        cascade="all, delete-orphan",
        order_by="CourseHoleBunker.id",
    )


class CourseHoleBunker(TimestampMixin, Base):
    __tablename__ = "course_hole_bunkers"

    id: Mapped[int] = mapped_column(primary_key=True)
    hole_id: Mapped[int] = mapped_column(ForeignKey("course_hole_templates.id", ondelete="CASCADE"))
    label: Mapped[str | None] = mapped_column(String(100), default=None)
    front_latitude: Mapped[float | None] = mapped_column(Float, default=None)
    front_longitude: Mapped[float | None] = mapped_column(Float, default=None)
    back_latitude: Mapped[float | None] = mapped_column(Float, default=None)
    back_longitude: Mapped[float | None] = mapped_column(Float, default=None)

    hole: Mapped["CourseHoleTemplate"] = relationship(back_populates="bunkers")
