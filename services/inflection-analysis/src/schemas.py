"""Request and response schemas."""

from pydantic import BaseModel, Field


class PauseInfo(BaseModel):
    """Information about a detected pause."""

    start: float = Field(description="Start time in seconds")
    end: float = Field(description="End time in seconds")
    duration: float = Field(description="Duration in seconds")


class ProsodyResult(BaseModel):
    """Prosodic analysis results."""

    # Pitch (F0) statistics
    pitch_mean_hz: float | None = Field(description="Mean pitch in Hz")
    pitch_std_hz: float | None = Field(description="Pitch standard deviation in Hz")
    pitch_min_hz: float | None = Field(description="Minimum pitch in Hz")
    pitch_max_hz: float | None = Field(description="Maximum pitch in Hz")
    pitch_contour: list[list[float]] = Field(
        default_factory=list,
        description="Pitch contour as [[time, pitch], ...]"
    )

    # Speech rate
    speech_rate_syllables_per_sec: float | None = Field(
        description="Estimated speech rate in syllables per second"
    )

    # Volume/intensity
    volume_mean_db: float = Field(description="Mean volume in dB")
    volume_std_db: float = Field(description="Volume standard deviation in dB")
    volume_min_db: float = Field(description="Minimum volume in dB")
    volume_max_db: float = Field(description="Maximum volume in dB")

    # Pauses
    pauses: list[PauseInfo] = Field(
        default_factory=list,
        description="Detected pauses"
    )
    total_pause_duration: float = Field(
        default=0.0,
        description="Total pause duration in seconds"
    )
    speaking_duration: float = Field(
        description="Total speaking duration (excluding pauses) in seconds"
    )


class EmotionDistribution(BaseModel):
    """Distribution of emotion probabilities."""

    happy: float = Field(ge=0, le=1)
    sad: float = Field(ge=0, le=1)
    angry: float = Field(ge=0, le=1)
    neutral: float = Field(ge=0, le=1)
    fearful: float = Field(ge=0, le=1)
    surprised: float = Field(ge=0, le=1)


class EmotionResult(BaseModel):
    """Emotion detection results."""

    primary: str = Field(description="Primary detected emotion")
    confidence: float = Field(ge=0, le=1, description="Confidence score")
    distribution: EmotionDistribution = Field(
        description="Probability distribution across emotions"
    )
    source: str = Field(
        description="Source of prediction: 'ml' or 'prosodic'"
    )


class SegmentInfo(BaseModel):
    """Information about the analyzed segment."""

    start: float = Field(description="Start time in seconds")
    end: float = Field(description="End time in seconds")
    duration: float = Field(description="Duration in seconds")


class InflectionResult(BaseModel):
    """Complete inflection analysis result."""

    prosody: ProsodyResult
    emotion: EmotionResult
    segment: SegmentInfo


class AnalyzeRequest(BaseModel):
    """Request to analyze an audio file."""

    audio_path: str = Field(description="Path to audio file")
    start_time: float | None = Field(
        default=None,
        description="Start time in seconds (optional)"
    )
    end_time: float | None = Field(
        default=None,
        description="End time in seconds (optional)"
    )


class BatchSegment(BaseModel):
    """A segment for batch analysis."""

    id: str = Field(description="Segment identifier")
    start_time: float = Field(description="Start time in seconds")
    end_time: float = Field(description="End time in seconds")


class BatchAnalyzeRequest(BaseModel):
    """Request to analyze multiple segments."""

    audio_path: str = Field(description="Path to audio file")
    segments: list[BatchSegment] = Field(description="Segments to analyze")


class BatchSegmentResult(BaseModel):
    """Result for a single segment in batch analysis."""

    id: str = Field(description="Segment identifier")
    result: InflectionResult | None = Field(description="Analysis result")
    error: str | None = Field(default=None, description="Error if analysis failed")


class BatchAnalyzeResponse(BaseModel):
    """Response for batch analysis."""

    results: list[BatchSegmentResult]


class HealthResponse(BaseModel):
    """Health check response."""

    status: str
    model_loaded: bool
    device: str
