from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional


class ExerciseCreate(BaseModel):
    title: str
    category: str
    difficulty: str = "beginner"
    duration_minutes: int = 15
    thumbnail_url: Optional[str] = None
    demo_video_url: Optional[str] = None
    instructions: list[str] = []
    tags: list[str] = []
    scoring_fields: Optional[list[str]] = None


class ExerciseUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    difficulty: Optional[str] = None
    duration_minutes: Optional[int] = None
    thumbnail_url: Optional[str] = None
    demo_video_url: Optional[str] = None
    instructions: Optional[list[str]] = None
    tags: Optional[list[str]] = None
    is_active: Optional[bool] = None
    scoring_fields: Optional[list[str]] = None


class ExerciseLogRequest(BaseModel):
    notes: str = ""
    score: Optional[float] = None
    sets: Optional[int] = None
    reps: Optional[int] = None
    duration_minutes: Optional[int] = None
    scoring_data: Optional[dict[str, float]] = None


class ExerciseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    category: str
    difficulty: str
    duration_minutes: int
    thumbnail_url: Optional[str] = None
    demo_video_url: Optional[str] = None
    instructions: list[str] = []
    tags: list[str] = []
    is_active: bool
    library_type: str = "public"
    owner_id: Optional[int] = None
    scoring_fields: Optional[list[str]] = None
    created_at: datetime
