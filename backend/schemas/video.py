from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional


class VideoUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    swing_type: Optional[str] = None
    club: Optional[str] = None
    is_public: Optional[bool] = None
    session_id: Optional[int] = None


class VideoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    session_id: Optional[int] = None
    title: str
    description: str
    url: str
    thumbnail_url: Optional[str] = None
    duration_seconds: Optional[int] = None
    file_size_bytes: Optional[int] = None
    swing_type: Optional[str] = None
    club: Optional[str] = None
    is_public: bool
    created_at: datetime


class UploadUrlResponse(BaseModel):
    upload_url: str
    key: str
    fields: dict = {}
