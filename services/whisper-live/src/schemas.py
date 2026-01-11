"""API schemas for real-time transcription."""

from enum import Enum
from typing import Any

from pydantic import BaseModel


class MessageType(str, Enum):
    """WebSocket message types."""

    CONFIG = "config"
    PARTIAL = "partial"
    FINAL = "final"
    ERROR = "error"
    STATUS = "status"


class ModelSize(str, Enum):
    """Available model sizes."""

    TINY = "tiny"
    BASE = "base"
    SMALL = "small"
    MEDIUM = "medium"
    LARGE_V3 = "large-v3"


class ConfigMessage(BaseModel):
    """Session configuration message."""

    type: str = "config"
    model: ModelSize = ModelSize.SMALL
    language: str | None = None
    vad_enabled: bool = True
    beam_size: int = 5


class WordTimestamp(BaseModel):
    """Word with timestamp."""

    word: str
    start: float
    end: float
    probability: float = 1.0


class PartialResult(BaseModel):
    """Partial (interim) transcription result."""

    type: str = "partial"
    text: str
    timestamp: float


class FinalResult(BaseModel):
    """Final transcription result for a segment."""

    type: str = "final"
    text: str
    start: float
    end: float
    language: str
    words: list[WordTimestamp] = []


class ErrorMessage(BaseModel):
    """Error message."""

    type: str = "error"
    error: str
    detail: str | None = None


class StatusMessage(BaseModel):
    """Status update message."""

    type: str = "status"
    status: str
    session_id: str | None = None


class HealthResponse(BaseModel):
    """Health check response."""

    status: str
    version: str
    device: str
    active_sessions: int
    model_loaded: bool
