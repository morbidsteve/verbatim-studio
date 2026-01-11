"""FastAPI application for inflection analysis service."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException

from src.config import settings
from src.emotion import EmotionAnalyzer
from src.prosody import ProsodyAnalyzer
from src.schemas import (
    AnalyzeRequest,
    BatchAnalyzeRequest,
    BatchAnalyzeResponse,
    BatchSegmentResult,
    HealthResponse,
    InflectionResult,
    SegmentInfo,
)

# Configure logging
logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Global analyzers
prosody_analyzer: ProsodyAnalyzer | None = None
emotion_analyzer: EmotionAnalyzer | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    global prosody_analyzer, emotion_analyzer

    logger.info("Starting inflection analysis service...")

    # Initialize analyzers
    prosody_analyzer = ProsodyAnalyzer()
    emotion_analyzer = EmotionAnalyzer()

    # Load emotion model (can be slow)
    try:
        emotion_analyzer.load_model()
    except Exception as e:
        logger.warning(f"Failed to load emotion model: {e}")
        logger.warning("Emotion analysis will use prosodic heuristics only")

    logger.info("Service ready")

    yield

    logger.info("Shutting down inflection analysis service...")


app = FastAPI(
    title="Inflection Analysis Service",
    description="Voice inflection and emotion analysis for Verbatim Studio",
    version="0.1.0",
    lifespan=lifespan,
)


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        model_loaded=emotion_analyzer.is_loaded() if emotion_analyzer else False,
        device=settings.compute_device,
    )


@app.post("/analyze", response_model=InflectionResult)
async def analyze_audio(request: AnalyzeRequest):
    """Analyze prosodic features and emotions in audio.

    Args:
        request: Analysis request with audio path and optional time bounds

    Returns:
        InflectionResult with prosody and emotion analysis
    """
    if prosody_analyzer is None or emotion_analyzer is None:
        raise HTTPException(status_code=503, detail="Service not initialized")

    try:
        # Analyze prosody
        prosody = prosody_analyzer.analyze(
            request.audio_path,
            request.start_time,
            request.end_time,
        )

        # Analyze emotion with prosody features for potential fallback
        prosody_features = {
            "pitch_mean": prosody.pitch_mean_hz,
            "pitch_std": prosody.pitch_std_hz,
            "volume_mean": prosody.volume_mean_db,
            "volume_std": prosody.volume_std_db,
            "speech_rate": prosody.speech_rate_syllables_per_sec,
        }
        emotion = emotion_analyzer.analyze(
            request.audio_path,
            request.start_time,
            request.end_time,
            prosody_features=prosody_features,
        )

        # Calculate segment info
        start = request.start_time or 0
        end = request.end_time or (start + prosody.speaking_duration + prosody.total_pause_duration)
        duration = end - start

        return InflectionResult(
            prosody=prosody,
            emotion=emotion,
            segment=SegmentInfo(
                start=start,
                end=end,
                duration=duration,
            ),
        )

    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Analysis failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {e}")


@app.post("/analyze/segment", response_model=InflectionResult)
async def analyze_segment(request: AnalyzeRequest):
    """Analyze a specific segment of audio.

    This is an alias for /analyze with time bounds required.
    """
    if request.start_time is None or request.end_time is None:
        raise HTTPException(
            status_code=400,
            detail="start_time and end_time are required for segment analysis",
        )
    return await analyze_audio(request)


@app.post("/analyze/batch", response_model=BatchAnalyzeResponse)
async def analyze_batch(request: BatchAnalyzeRequest):
    """Analyze multiple segments in batch.

    More efficient than multiple individual calls as audio is loaded once.
    """
    if prosody_analyzer is None or emotion_analyzer is None:
        raise HTTPException(status_code=503, detail="Service not initialized")

    results: list[BatchSegmentResult] = []

    for segment in request.segments:
        try:
            # Analyze this segment
            prosody = prosody_analyzer.analyze(
                request.audio_path,
                segment.start_time,
                segment.end_time,
            )

            prosody_features = {
                "pitch_mean": prosody.pitch_mean_hz,
                "pitch_std": prosody.pitch_std_hz,
                "volume_mean": prosody.volume_mean_db,
                "volume_std": prosody.volume_std_db,
                "speech_rate": prosody.speech_rate_syllables_per_sec,
            }
            emotion = emotion_analyzer.analyze(
                request.audio_path,
                segment.start_time,
                segment.end_time,
                prosody_features=prosody_features,
            )

            duration = segment.end_time - segment.start_time

            result = InflectionResult(
                prosody=prosody,
                emotion=emotion,
                segment=SegmentInfo(
                    start=segment.start_time,
                    end=segment.end_time,
                    duration=duration,
                ),
            )
            results.append(BatchSegmentResult(id=segment.id, result=result, error=None))

        except Exception as e:
            logger.warning(f"Failed to analyze segment {segment.id}: {e}")
            results.append(BatchSegmentResult(id=segment.id, result=None, error=str(e)))

    return BatchAnalyzeResponse(results=results)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "src.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )
