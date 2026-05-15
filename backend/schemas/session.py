from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional
from schemas.exercise import ExerciseResponse


class SessionExerciseCreate(BaseModel):
    exercise_id: int
    sets: Optional[int] = None
    reps: Optional[int] = None
    score: Optional[float] = None
    notes: str = ""
    completed: bool = False


class SessionExerciseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    exercise_id: int
    sets: Optional[int] = None
    reps: Optional[int] = None
    score: Optional[float] = None
    notes: str
    completed: bool
    scoring_data: Optional[dict] = None
    exercise: ExerciseResponse


class SessionCreate(BaseModel):
    title: str
    notes: str = ""
    duration_minutes: int = 0
    location: Optional[str] = None
    weather: Optional[str] = None
    mood: Optional[int] = None
    overall_score: Optional[float] = None
    status: str = "completed"
    exercises: list[SessionExerciseCreate] = []


class SessionUpdate(BaseModel):
    title: Optional[str] = None
    notes: Optional[str] = None
    duration_minutes: Optional[int] = None
    location: Optional[str] = None
    weather: Optional[str] = None
    mood: Optional[int] = None
    overall_score: Optional[float] = None
    status: Optional[str] = None


class SessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    title: str
    notes: str
    duration_minutes: int
    location: Optional[str] = None
    weather: Optional[str] = None
    mood: Optional[int] = None
    overall_score: Optional[float] = None
    status: str = "completed"
    created_at: datetime
    exercises: list[SessionExerciseResponse] = []
