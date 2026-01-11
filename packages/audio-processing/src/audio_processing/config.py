"""Audio processing configuration."""

from dataclasses import dataclass


@dataclass
class AudioConfig:
    """Configuration for audio processing."""

    # Target format settings
    target_sample_rate: int = 16000
    target_channels: int = 1  # Mono
    target_bit_depth: int = 16

    # Chunking settings
    chunk_duration_seconds: float = 30.0
    chunk_overlap_seconds: float = 1.0

    # Quality thresholds
    min_snr_db: float = 10.0
    max_clipping_ratio: float = 0.01
    max_silence_ratio: float = 0.9

    # Noise reduction
    noise_reduce_enabled: bool = False
    noise_reduce_strength: float = 1.0

    # FFmpeg settings
    ffmpeg_path: str | None = None

    # Temporary file handling
    temp_dir: str | None = None
    cleanup_temp_files: bool = True
