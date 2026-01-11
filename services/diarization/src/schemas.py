"""API schemas for the diarization service."""

from pydantic import BaseModel, Field


class SpeakerSegment(BaseModel):
    """A segment where a speaker is talking."""

    speaker: str
    start: float
    end: float
    confidence: float = 1.0


class DiarizationResult(BaseModel):
    """Complete diarization result."""

    num_speakers: int
    segments: list[SpeakerSegment]
    duration: float
    speakers: list[str]


class DiarizationRequest(BaseModel):
    """Request to diarize audio."""

    min_speakers: int | None = None
    max_speakers: int | None = None


class SpeakerProfile(BaseModel):
    """A known speaker profile."""

    id: str
    name: str
    embedding: list[float] | None = None
    created_at: str
    updated_at: str
    sample_count: int = 0


class SpeakerProfileCreate(BaseModel):
    """Create a speaker profile."""

    name: str


class SpeakerIdentification(BaseModel):
    """Speaker identification result."""

    speaker_id: str
    profile_id: str | None = None
    profile_name: str | None = None
    confidence: float


class IdentificationResult(BaseModel):
    """Result of speaker identification."""

    segments: list[SpeakerSegment]
    identifications: dict[str, SpeakerIdentification]


class HealthResponse(BaseModel):
    """Health check response."""

    status: str
    version: str
    device: str
    model_loaded: bool
