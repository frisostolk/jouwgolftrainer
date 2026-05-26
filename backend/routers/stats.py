from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case
from database import get_db
from models.session import TrainingSession, SessionExercise
from models.video import Video
from models.exercise import Exercise
from models.user import User
from schemas.stats import OverallStats, WeeklyStats, CategoryStats, ExerciseProgressEntry
from auth.dependencies import get_current_user
from datetime import datetime, timezone, timedelta

router = APIRouter()


@router.get("", response_model=OverallStats)
async def get_stats(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Overall session stats
    session_result = await db.execute(
        select(
            func.count(TrainingSession.id).label("total_sessions"),
            func.coalesce(func.sum(TrainingSession.duration_minutes), 0).label("total_minutes"),
            func.avg(TrainingSession.overall_score).label("avg_score"),
        ).where(TrainingSession.user_id == user.id)
    )
    row = session_result.one()

    # Video count
    video_result = await db.execute(
        select(func.count(Video.id)).where(Video.user_id == user.id)
    )
    total_videos = video_result.scalar() or 0

    # Streak: count consecutive days with sessions
    streak_days = await _calc_streak(user.id, db)

    # Weekly stats (last 8 weeks)
    weekly = await _weekly_stats(user.id, db)

    # Category breakdown
    by_category = await _category_stats(user.id, db)

    return OverallStats(
        total_sessions=row.total_sessions or 0,
        total_minutes=row.total_minutes or 0,
        total_videos=total_videos,
        avg_session_score=round(row.avg_score, 2) if row.avg_score else None,
        streak_days=streak_days,
        weekly=weekly,
        by_category=by_category,
    )


async def _calc_streak(user_id: int, db: AsyncSession) -> int:
    result = await db.execute(
        select(func.date(TrainingSession.created_at).label("day"))
        .where(TrainingSession.user_id == user_id)
        .group_by(func.date(TrainingSession.created_at))
        .order_by(func.date(TrainingSession.created_at).desc())
        .limit(60)
    )
    days = [row.day for row in result]
    if not days:
        return 0

    streak = 0
    today = datetime.now(timezone.utc).date()
    for i, day in enumerate(days):
        expected = today - timedelta(days=i)
        if str(day) == str(expected):
            streak += 1
        else:
            break
    return streak


async def _weekly_stats(user_id: int, db: AsyncSession) -> list[WeeklyStats]:
    result = await db.execute(
        select(
            func.to_char(TrainingSession.created_at, "IYYY-IW").label("week"),
            func.count(TrainingSession.id).label("sessions"),
            func.coalesce(func.sum(TrainingSession.duration_minutes), 0).label("total_minutes"),
            func.avg(TrainingSession.overall_score).label("avg_score"),
        )
        .where(
            TrainingSession.user_id == user_id,
            TrainingSession.created_at >= datetime.now(timezone.utc) - timedelta(weeks=8),
        )
        .group_by("week")
        .order_by("week")
    )
    return [
        WeeklyStats(
            week=row.week,
            sessions=row.sessions,
            total_minutes=row.total_minutes,
            avg_score=round(row.avg_score, 2) if row.avg_score else None,
        )
        for row in result
    ]


@router.get("/exercise-progress", response_model=list[ExerciseProgressEntry])
async def get_exercise_progress(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Get all logged entries per exercise ordered by date
    result = await db.execute(
        select(
            Exercise.id,
            Exercise.title,
            Exercise.category,
            SessionExercise.score,
            SessionExercise.scoring_data,
            TrainingSession.created_at,
        )
        .join(SessionExercise, SessionExercise.exercise_id == Exercise.id)
        .join(TrainingSession, TrainingSession.id == SessionExercise.session_id)
        .where(TrainingSession.user_id == user.id)
        .order_by(Exercise.id, TrainingSession.created_at.asc())
    )
    rows = result.all()

    # Group by exercise
    from collections import defaultdict
    grouped: dict[int, list] = defaultdict(list)
    meta: dict[int, tuple[str, str]] = {}
    for row in rows:
        grouped[row.id].append(row)
        meta[row.id] = (row.title, row.category)

    entries: list[ExerciseProgressEntry] = []
    for exercise_id, logs in grouped.items():
        if len(logs) < 2:
            continue
        title, category = meta[exercise_id]

        # Derive a single numeric score per log: use score field or first scoring_data value
        scores: list[float | None] = []
        for log in logs:
            if log.score is not None:
                scores.append(float(log.score))
            elif log.scoring_data:
                first_val = next(iter(log.scoring_data.values()), None)
                scores.append(float(first_val) if first_val is not None else None)
            else:
                scores.append(None)

        dates = [log.created_at.strftime("%d %b") for log in logs]

        # Compute trend from first to last non-None score
        numeric = [(i, s) for i, s in enumerate(scores) if s is not None]
        if len(numeric) >= 2:
            diff = numeric[-1][1] - numeric[0][1]
            trend = "up" if diff > 0 else ("down" if diff < 0 else "stable")
        else:
            trend = "none"

        entries.append(ExerciseProgressEntry(
            exercise_id=exercise_id,
            title=title,
            category=category,
            times_logged=len(logs),
            scores=scores[-10:],  # last 10 entries
            dates=dates[-10:],
            trend=trend,
        ))

    # Sort by most logged first
    entries.sort(key=lambda e: e.times_logged, reverse=True)
    return entries


async def _category_stats(user_id: int, db: AsyncSession) -> list[CategoryStats]:
    result = await db.execute(
        select(
            Exercise.category,
            func.count(SessionExercise.id).label("count"),
            func.coalesce(func.sum(SessionExercise.sets), 0).label("total_sets"),
            func.avg(SessionExercise.score).label("avg_score"),
        )
        .join(SessionExercise, SessionExercise.exercise_id == Exercise.id)
        .join(TrainingSession, TrainingSession.id == SessionExercise.session_id)
        .where(TrainingSession.user_id == user_id)
        .group_by(Exercise.category)
        .order_by(func.count(SessionExercise.id).desc())
    )
    return [
        CategoryStats(
            category=row.category,
            count=row.count,
            total_minutes=row.total_sets or 0,
            avg_score=round(row.avg_score, 2) if row.avg_score else None,
        )
        for row in result
    ]
