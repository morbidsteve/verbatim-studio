"""Service configuration."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Diarization service settings."""

    # Service
    service_name: str = "diarization-service"
    debug: bool = False
    host: str = "0.0.0.0"
    port: int = 8003

    # HuggingFace
    hf_token: str | None = None

    # Model settings
    model_cache_dir: str = "/app/models"
    device: str = "auto"  # auto, cuda, cpu

    # Diarization settings
    min_speakers: int | None = None
    max_speakers: int | None = None

    # Storage
    upload_dir: str = "/app/uploads"
    embeddings_dir: str = "/app/embeddings"

    class Config:
        env_prefix = ""
        env_file = ".env"


settings = Settings()
