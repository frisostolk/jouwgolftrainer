from pydantic import BaseModel
from typing import Optional


class WeeklyStats(BaseModel):
    week: str
    sessions: int
    total_minutes: int
    avg_score: Optional[float] = None


class CategoryStats(BaseModel):
    category: str
    count: int
    total_minutes: int
    avg_score: Optional[float] = None


class OverallStats(BaseModel):
    total_sessions: int
    total_minutes: int
    total_videos: int
    avg_session_score: Optional[float] = None
    streak_days: int
    weekly: list[WeeklyStats] = []
    by_category: list[CategoryStats] = []
