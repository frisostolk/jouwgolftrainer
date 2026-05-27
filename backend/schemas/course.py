from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class CourseHoleBunkerCreate(BaseModel):
    label: Optional[str] = None
    front_latitude: float
    front_longitude: float
    back_latitude: float
    back_longitude: float


class CourseHoleBunkerUpdate(BaseModel):
    label: Optional[str] = None
    front_latitude: Optional[float] = None
    front_longitude: Optional[float] = None
    back_latitude: Optional[float] = None
    back_longitude: Optional[float] = None


class CourseHoleBunkerResponse(BaseModel):
    id: int
    label: Optional[str]
    front_latitude: Optional[float]
    front_longitude: Optional[float]
    back_latitude: Optional[float]
    back_longitude: Optional[float]

    model_config = {"from_attributes": True}


class CourseHoleTemplateUpdate(BaseModel):
    par: Optional[int] = None
    distance_yards: Optional[int] = None
    stroke_index: Optional[int] = None
    tee_latitude: Optional[float] = None
    tee_longitude: Optional[float] = None
    green_latitude: Optional[float] = None
    green_longitude: Optional[float] = None


class CourseHoleTemplateResponse(BaseModel):
    id: int
    hole_number: int
    par: int
    distance_yards: Optional[int]
    stroke_index: Optional[int]
    tee_latitude: Optional[float]
    tee_longitude: Optional[float]
    green_latitude: Optional[float]
    green_longitude: Optional[float]
    bunkers: list[CourseHoleBunkerResponse] = []

    model_config = {"from_attributes": True}


class CourseTemplateCreate(BaseModel):
    name: str
    total_holes: int = 18


class CourseTemplateResponse(BaseModel):
    id: int
    name: str
    total_holes: int
    created_at: datetime
    holes: list[CourseHoleTemplateResponse]

    model_config = {"from_attributes": True}


class CourseTemplateSummary(BaseModel):
    id: int
    name: str
    total_holes: int
    created_at: datetime

    model_config = {"from_attributes": True}
