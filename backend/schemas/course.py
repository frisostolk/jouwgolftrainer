from pydantic import BaseModel
from datetime import datetime


class CourseHoleTemplateUpdate(BaseModel):
    par: int | None = None
    distance_yards: int | None = None
    stroke_index: int | None = None
    tee_latitude: float | None = None
    tee_longitude: float | None = None


class CourseHoleTemplateResponse(BaseModel):
    id: int
    hole_number: int
    par: int
    distance_yards: int | None
    stroke_index: int | None
    tee_latitude: float | None
    tee_longitude: float | None

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
