"""Audio processing utilities for Verbatim Studio."""

from audio_processing.config import AudioConfig
from audio_processing.processor import AudioProcessor
from audio_processing.quality import AudioQuality, analyze_quality
from audio_processing.formats import (
    SUPPORTED_AUDIO_FORMATS,
    SUPPORTED_VIDEO_FORMATS,
    get_audio_info,
    is_supported_format,
)

__all__ = [
    "AudioConfig",
    "AudioProcessor",
    "AudioQuality",
    "analyze_quality",
    "SUPPORTED_AUDIO_FORMATS",
    "SUPPORTED_VIDEO_FORMATS",
    "get_audio_info",
    "is_supported_format",
]
