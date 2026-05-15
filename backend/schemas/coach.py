from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional
from schemas.user import UserResponse


class CoachNoteCreate(BaseModel):
    player_id: int
    video_id: Optional[int] = None
    content: str
    timestamp_seconds: Optional[int] = None
    category: str = "general"


class CoachNoteUpdate(BaseModel):
    content: Optional[str] = None
    timestamp_seconds: Optional[int] = None
    category: Optional[str] = None


class CoachNoteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    coach_id: int
    player_id: int
    video_id: Optional[int] = None
    content: str
    timestamp_seconds: Optional[int] = None
    category: str
    created_at: datetime
    coach: UserResponse
