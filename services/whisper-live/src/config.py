"""Service configuration."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """WhisperLive service settings."""

    # Service
    service_name: str = "whisper-live"
    debug: bool = False
    host: str = "0.0.0.0"
    port: int = 8002

    # Model settings
    default_model: str = "small"
    model_cache_dir: str = "/app/models"
    device: str = "auto"
    compute_type: str = "auto"

    # Audio settings
    sample_rate: int = 16000
    chunk_duration_ms: int = 30  # Audio chunk duration
    vad_threshold: float = 0.5

    # Transcription settings
    default_language: str | None = None
    beam_size: int = 5
    best_of: int = 5

    # Session limits
    max_sessions: int = 10
    session_timeout_seconds: int = 300

    class Config:
        env_prefix = "WHISPER_LIVE_"
        env_file = ".env"


settings = Settings()
