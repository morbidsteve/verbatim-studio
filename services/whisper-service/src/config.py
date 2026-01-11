"""Service configuration."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Whisper service settings."""

    # Service
    service_name: str = "whisper-service"
    debug: bool = False
    host: str = "0.0.0.0"
    port: int = 8001

    # Model settings
    default_model: str = "small"
    model_cache_dir: str = "/app/models"
    device: str = "auto"  # auto, cuda, cpu
    compute_type: str = "auto"  # auto, float16, int8, float32

    # Transcription defaults
    default_language: str | None = None  # None = auto-detect
    default_batch_size: int = 16
    default_beam_size: int = 5

    # Limits
    max_file_size_mb: int = 500
    max_duration_seconds: int = 14400  # 4 hours

    # Storage
    upload_dir: str = "/app/uploads"
    output_dir: str = "/app/outputs"

    class Config:
        env_prefix = "WHISPER_"
        env_file = ".env"


settings = Settings()
