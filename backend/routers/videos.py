from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models.video import Video
from models.user import User
from schemas.video import VideoResponse, VideoUpdate, UploadUrlResponse
from auth.dependencies import get_current_user
from services import storage
from config import get_settings
from typing import Optional

router = APIRouter()
settings = get_settings()


@router.get("", response_model=list[VideoResponse])
async def list_videos(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Video)
        .where(Video.user_id == user.id)
        .order_by(Video.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{video_id}", response_model=VideoResponse)
async def get_video(
    video_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    video = await db.get(Video, video_id)
    if not video or (video.user_id != user.id and not video.is_public):
        raise HTTPException(404, "Video not found")
    return video


@router.post("/upload-url", response_model=UploadUrlResponse)
async def get_upload_url(
    content_type: str = "video/mp4",
    _: User = Depends(get_current_user),
):
    return storage.generate_presigned_upload(prefix="videos", content_type=content_type)


@router.post("", response_model=VideoResponse, status_code=201)
async def create_video_record(
    title: str = Form(...),
    description: str = Form(""),
    swing_type: Optional[str] = Form(None),
    club: Optional[str] = Form(None),
    session_id: Optional[int] = Form(None),
    storage_key: str = Form(...),
    file_size_bytes: Optional[int] = Form(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Register a video after direct Spaces upload."""
    from services.storage import _public_url
    video = Video(
        user_id=user.id,
        session_id=session_id,
        title=title,
        description=description,
        swing_type=swing_type,
        club=club,
        storage_key=storage_key,
        url=_public_url(storage_key),
        file_size_bytes=file_size_bytes,
    )
    db.add(video)
    await db.flush()
    await db.refresh(video)
    return video


@router.post("/upload", response_model=VideoResponse, status_code=201)
async def upload_video(
    title: str = Form(...),
    description: str = Form(""),
    swing_type: Optional[str] = Form(None),
    club: Optional[str] = Form(None),
    session_id: Optional[int] = Form(None),
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Direct multipart upload (for smaller files / dev)."""
    key, url = await storage.upload_file(
        file, prefix="videos", max_size_mb=settings.max_video_size_mb
    )
    video = Video(
        user_id=user.id,
        session_id=session_id,
        title=title,
        description=description,
        swing_type=swing_type,
        club=club,
        storage_key=key,
        url=url,
        file_size_bytes=len(await file.read()) if file.size is None else file.size,
    )
    db.add(video)
    await db.flush()
    await db.refresh(video)
    return video


@router.patch("/{video_id}", response_model=VideoResponse)
async def update_video(
    video_id: int,
    data: VideoUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    video = await db.get(Video, video_id)
    if not video or video.user_id != user.id:
        raise HTTPException(404, "Video not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(video, field, value)
    await db.flush()
    await db.refresh(video)
    return video


@router.delete("/{video_id}", status_code=204)
async def delete_video(
    video_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    video = await db.get(Video, video_id)
    if not video or video.user_id != user.id:
        raise HTTPException(404, "Video not found")
    await storage.delete_file(video.storage_key)
    if video.thumbnail_key:
        await storage.delete_file(video.thumbnail_key)
    await db.delete(video)
