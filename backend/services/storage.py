import boto3
import uuid
from botocore.exceptions import ClientError
from botocore.config import Config
from fastapi import UploadFile, HTTPException
from config import get_settings

settings = get_settings()


def _get_client():
    return boto3.client(
        "s3",
        region_name=settings.spaces_region,
        endpoint_url=settings.spaces_endpoint,
        aws_access_key_id=settings.spaces_key,
        aws_secret_access_key=settings.spaces_secret,
        config=Config(signature_version="s3v4"),
    )


def _public_url(key: str) -> str:
    if settings.spaces_cdn_endpoint:
        return f"{settings.spaces_cdn_endpoint.rstrip('/')}/{key}"
    return f"{settings.spaces_endpoint.rstrip('/')}/{settings.spaces_bucket}/{key}"


async def upload_file(
    file: UploadFile,
    prefix: str = "uploads",
    max_size_mb: int = 10,
) -> tuple[str, str]:
    """Upload a file to Spaces. Returns (key, public_url)."""
    content = await file.read()
    size_mb = len(content) / (1024 * 1024)
    if size_mb > max_size_mb:
        raise HTTPException(400, f"File too large: {size_mb:.1f}MB (max {max_size_mb}MB)")

    ext = (file.filename or "file").rsplit(".", 1)[-1].lower()
    key = f"{prefix}/{uuid.uuid4()}.{ext}"

    client = _get_client()
    try:
        client.put_object(
            Bucket=settings.spaces_bucket,
            Key=key,
            Body=content,
            ContentType=file.content_type or "application/octet-stream",
            ACL="public-read",
        )
    except ClientError as e:
        raise HTTPException(500, f"Storage upload failed: {e}")

    return key, _public_url(key)


async def delete_file(key: str) -> None:
    client = _get_client()
    try:
        client.delete_object(Bucket=settings.spaces_bucket, Key=key)
    except ClientError:
        pass


def generate_presigned_upload(prefix: str = "uploads", content_type: str = "video/mp4") -> dict:
    """Generate a presigned POST URL for direct browser-to-Spaces uploads."""
    ext = content_type.split("/")[-1]
    key = f"{prefix}/{uuid.uuid4()}.{ext}"

    client = _get_client()
    try:
        response = client.generate_presigned_post(
            Bucket=settings.spaces_bucket,
            Key=key,
            Fields={"Content-Type": content_type, "acl": "public-read"},
            Conditions=[
                {"acl": "public-read"},
                ["content-length-range", 0, settings.max_video_size_mb * 1024 * 1024],
            ],
            ExpiresIn=3600,
        )
        return {"upload_url": response["url"], "key": key, "fields": response["fields"]}
    except ClientError as e:
        raise HTTPException(500, f"Could not generate upload URL: {e}")
