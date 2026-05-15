from pydantic import BaseModel, EmailStr, ConfigDict
from datetime import datetime
from typing import Optional
from schemas.user import UserResponse
from schemas.exercise import ExerciseResponse


class ConnectionInvite(BaseModel):
    player_email: EmailStr
    message: str = ""


class ConnectionRespond(BaseModel):
    status: str  # "accepted" or "declined"


class ConnectionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    coach_id: int
    player_id: int
    status: str
    message: str
    created_at: datetime
    coach: UserResponse
    player: UserResponse


class AssignExerciseRequest(BaseModel):
    player_id: int
    message: str = ""


class AssignmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    exercise_id: int
    coach_id: int
    player_id: int
    message: str
    created_at: datetime
    exercise: ExerciseResponse
    coach: UserResponse
