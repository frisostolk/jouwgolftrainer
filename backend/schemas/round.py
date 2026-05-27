from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class HoleSetup(BaseModel):
    hole_number: int
    par: int
    distance_yards: Optional[int] = None
    stroke_index: Optional[int] = None


class RoundCreate(BaseModel):
    course_name: str
    tee_color: Optional[str] = None
    total_holes: int = 18
    handicap: Optional[float] = None
    holes: list[HoleSetup]


class RoundUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    handicap: Optional[float] = None


class ShotCreate(BaseModel):
    lie_type: str  # tee|fairway|rough|bunker|green|penalty
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    club: Optional[str] = None
    is_hole_out: bool = False


class ShotResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    shot_number: int
    lie_type: str
    latitude: Optional[float]
    longitude: Optional[float]
    club: Optional[str]
    result: Optional[str]
    distance_to_pin_yards: Optional[float]
    stroke_gained: Optional[float]
    created_at: datetime


class HoleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    hole_number: int
    par: int
    distance_yards: Optional[int]
    stroke_index: Optional[int]
    gross_score: Optional[int]
    is_complete: bool
    pin_latitude: Optional[float]
    pin_longitude: Optional[float]
    shots: list[ShotResponse]


class RoundSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    course_name: str
    tee_color: Optional[str]
    status: str
    total_holes: int
    handicap: Optional[float]
    notes: str
    created_at: datetime


class RoundResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    course_name: str
    tee_color: Optional[str]
    status: str
    total_holes: int
    handicap: Optional[float]
    notes: str
    created_at: datetime
    holes: list[HoleResponse]


class StrokeGainedHole(BaseModel):
    hole_number: int
    par: int
    gross_score: Optional[int]
    vs_par: Optional[int]
    sg_total: float
    sg_off_tee: float
    sg_approach: float
    sg_around_green: float
    sg_putting: float


class StrokeGainedResponse(BaseModel):
    round_id: int
    holes_completed: int
    total_score: Optional[int]
    total_par: int
    vs_par: Optional[int]
    sg_total: float
    sg_off_tee: float
    sg_approach: float
    sg_around_green: float
    sg_putting: float
    by_hole: list[StrokeGainedHole]
