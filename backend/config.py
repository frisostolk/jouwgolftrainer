from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # App
    app_name: str = "GolfTrainer API"
    environment: str = "development"
    debug: bool = False

    # Database
    database_url: str = "sqlite+aiosqlite:///./golf.db"

    # JWT
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days

    # DigitalOcean Spaces / S3
    spaces_key: str = ""
    spaces_secret: str = ""
    spaces_region: str = "ams3"
    spaces_bucket: str = "golf-trainer"
    spaces_endpoint: str = "https://ams3.digitaloceanspaces.com"
    spaces_cdn_endpoint: str = ""

    # CORS
    allowed_origins: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "capacitor://localhost",   # Capacitor iOS app
        "http://localhost",        # Capacitor iOS simulator
    ]

    # File limits
    max_video_size_mb: int = 500
    max_image_size_mb: int = 10


@lru_cache
def get_settings() -> Settings:
    return Settings()
