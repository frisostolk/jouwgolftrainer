from sqlalchemy import String, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base
from models.mixins import TimestampMixin


class CoachNote(TimestampMixin, Base):
    __tablename__ = "coach_notes"

    id: Mapped[int] = mapped_column(primary_key=True)
    coach_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    player_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    video_id: Mapped[int | None] = mapped_column(ForeignKey("videos.id"), default=None)
    content: Mapped[str] = mapped_column(Text)
    timestamp_seconds: Mapped[int | None] = mapped_column(default=None)  # video timestamp
    category: Mapped[str] = mapped_column(String(50), default="general")  # general, grip, stance, swing, etc.

    player: Mapped["User"] = relationship(back_populates="coach_notes", foreign_keys=[player_id])
    coach: Mapped["User"] = relationship(foreign_keys=[coach_id])
    video: Mapped["Video | None"] = relationship(back_populates="coach_notes")
