"""API schemas for the whisper service."""

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class ModelSize(str, Enum):
    """Available Whisper model sizes."""

    TINY = "tiny"
    BASE = "base"
    SMALL = "small"
    MEDIUM = "medium"
    LARGE_V3 = "large-v3"


class DeviceType(str, Enum):
    """Compute device types."""

    AUTO = "auto"
    CUDA = "cuda"
    CPU = "cpu"


class JobStatus(str, Enum):
    """Transcription job status."""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class WordTimestamp(BaseModel):
    """Word-level timestamp."""

    word: str
    start: float
    end: float
    confidence: float = 1.0


class TranscriptSegment(BaseModel):
    """A segment of the transcript."""

    id: int
    start: float
    end: float
    text: str
    speaker: str | None = None
    confidence: float = 1.0
    words: list[WordTimestamp] = Field(default_factory=list)


class TranscriptionResult(BaseModel):
    """Complete transcription result."""

    language: str
    language_probability: float
    duration: float
    segments: list[TranscriptSegment]
    text: str  # Full transcript text


class TranscriptionRequest(BaseModel):
    """Request to transcribe audio."""

    model: ModelSize = ModelSize.SMALL
    language: str | None = None  # None = auto-detect
    word_timestamps: bool = True
    batch_size: int = 16
    beam_size: int = 5
    initial_prompt: str | None = None
    vad_filter: bool = True
    vad_parameters: dict[str, Any] | None = None


class TranscriptionJob(BaseModel):
    """Transcription job details."""

    job_id: str
    status: JobStatus
    progress: float = 0.0
    filename: str | None = None
    model: ModelSize
    language: str | None = None
    created_at: str
    started_at: str | None = None
    completed_at: str | None = None
    error: str | None = None
    result: TranscriptionResult | None = None


class ModelInfo(BaseModel):
    """Information about a Whisper model."""

    id: ModelSize
    name: str
    size_mb: int
    languages: int
    loaded: bool = False
    device: str | None = None


class HealthResponse(BaseModel):
    """Health check response."""

    status: str
    version: str
    device: str
    models_loaded: list[str]


class ErrorResponse(BaseModel):
    """Error response."""

    error: str
    detail: str | None = None
