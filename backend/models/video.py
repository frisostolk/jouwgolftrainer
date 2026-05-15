from sqlalchemy import String, Text, Integer, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base
from models.mixins import TimestampMixin


class Video(TimestampMixin, Base):
    __tablename__ = "videos"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    session_id: Mapped[int | None] = mapped_column(ForeignKey("training_sessions.id"), default=None)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    storage_key: Mapped[str] = mapped_column(String(500))  # S3/Spaces object key
    url: Mapped[str] = mapped_column(String(500))
    thumbnail_key: Mapped[str | None] = mapped_column(String(500), default=None)
    thumbnail_url: Mapped[str | None] = mapped_column(String(500), default=None)
    duration_seconds: Mapped[int | None] = mapped_column(Integer, default=None)
    file_size_bytes: Mapped[int | None] = mapped_column(Integer, default=None)
    swing_type: Mapped[str | None] = mapped_column(String(50), default=None)  # driver, iron, chip, putt
    club: Mapped[str | None] = mapped_column(String(50), default=None)
    is_public: Mapped[bool] = mapped_column(default=False)

    user: Mapped["User"] = relationship(back_populates="videos")
    session: Mapped["TrainingSession | None"] = relationship(back_populates="videos")
    coach_notes: Mapped[list["CoachNote"]] = relationship(
        back_populates="video", cascade="all, delete-orphan"
    )
