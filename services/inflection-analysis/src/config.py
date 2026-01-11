"""Service configuration."""

import torch
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Inflection analysis service settings."""

    # Model settings
    model_name: str = "ehcalabres/wav2vec2-lg-xlsr-en-speech-emotion-recognition"
    device: str = "auto"  # auto, cuda, cpu

    # Server settings
    host: str = "0.0.0.0"
    port: int = 8004
    debug: bool = False

    # Analysis settings
    min_confidence: float = 0.5  # Minimum confidence for ML predictions
    sample_rate: int = 16000  # Target sample rate for analysis
    pitch_floor_hz: float = 75.0  # Minimum pitch for F0 extraction
    pitch_ceiling_hz: float = 500.0  # Maximum pitch for F0 extraction
    pause_threshold_db: float = -40.0  # Threshold for pause detection
    min_pause_duration: float = 0.25  # Minimum pause duration in seconds

    # Cache settings
    model_cache_dir: str | None = None

    class Config:
        env_prefix = "INFLECTION_"

    @property
    def compute_device(self) -> str:
        """Get the compute device to use."""
        if self.device == "auto":
            return "cuda" if torch.cuda.is_available() else "cpu"
        return self.device


settings = Settings()
