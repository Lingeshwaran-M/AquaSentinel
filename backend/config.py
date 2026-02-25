"""
AquaSentinel X — Application Configuration
"""
from pydantic_settings import BaseSettings
from functools import lru_cache
import os


class Settings(BaseSettings):
    # App
    APP_NAME: str = "AquaSentinel X"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/aquasentinel"

    # Security
    SECRET_KEY: str = "change-me-in-production-use-a-strong-random-key"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    ALGORITHM: str = "HS256"

    # CORS
    FRONTEND_URL: str = "http://localhost:3000"

    # File uploads
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE_MB: int = 50

    # SMTP
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASS: str = ""
    EMAIL_FROM: str = "noreply@aquasentinel.com"

    # AI
    AI_MODEL_PATH: str = "./ai/models"
    AI_CONFIDENCE_THRESHOLD: float = 0.6

    # SLA Deadlines (in days)
    SLA_CRITICAL_DAYS: int = 3
    SLA_MEDIUM_DAYS: int = 7
    SLA_LOW_DAYS: int = 10

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()
