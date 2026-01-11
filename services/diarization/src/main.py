"""Speaker diarization service."""

import logging
import os
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

import aiofiles
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from src.config import settings
from src.diarizer import engine
from src.schemas import (
    DiarizationRequest,
    DiarizationResult,
    HealthResponse,
    SpeakerProfile,
    SpeakerProfileCreate,
)

# Configure logging
logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# In-memory speaker profiles (would be DB in production)
speaker_profiles: dict[str, SpeakerProfile] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    logger.info(f"Starting {settings.service_name}")
    logger.info(f"Device: {engine.device}")

    if settings.hf_token:
        logger.info("HuggingFace token configured")
    else:
        logger.warning("No HuggingFace token - diarization will fail")

    # Optionally preload model
    if os.environ.get("PRELOAD_MODEL", "").lower() == "true":
        try:
            engine.load_model()
        except Exception as e:
            logger.warning(f"Failed to preload model: {e}")

    yield

    # Shutdown
    logger.info("Shutting down...")


app = FastAPI(
    title="Speaker Diarization Service",
    description="PyAnnote Audio-based speaker diarization for Verbatim Studio",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check
@app.get("/health", response_model=HealthResponse, tags=["System"])
async def health_check() -> HealthResponse:
    """Check service health."""
    return HealthResponse(
        status="healthy",
        version="0.1.0",
        device=engine.device,
        model_loaded=engine.model_loaded,
    )


# Diarization
@app.post("/diarize", response_model=DiarizationResult, tags=["Diarization"])
async def diarize(
    file: UploadFile = File(...),
    min_speakers: int | None = Form(default=None),
    max_speakers: int | None = Form(default=None),
) -> DiarizationResult:
    """
    Perform speaker diarization on an audio file.

    Returns segments with speaker labels and timestamps.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    # Save uploaded file
    file_id = str(uuid.uuid4())
    file_ext = Path(file.filename).suffix
    upload_path = Path(settings.upload_dir) / f"{file_id}{file_ext}"

    async with aiofiles.open(upload_path, "wb") as f:
        content = await file.read()
        await f.write(content)

    try:
        # Run diarization in thread pool
        import asyncio

        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: engine.diarize(
                audio_path=upload_path,
                min_speakers=min_speakers,
                max_speakers=max_speakers,
            ),
        )
        return result

    except Exception as e:
        logger.error(f"Diarization failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        # Clean up uploaded file
        if upload_path.exists():
            upload_path.unlink()


@app.post("/embeddings", tags=["Diarization"])
async def extract_embeddings(
    file: UploadFile = File(...),
) -> dict[str, list[float]]:
    """
    Extract speaker embeddings from an audio file.

    Returns a dictionary mapping speaker labels to embedding vectors.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    # Save uploaded file
    file_id = str(uuid.uuid4())
    file_ext = Path(file.filename).suffix
    upload_path = Path(settings.upload_dir) / f"{file_id}{file_ext}"

    async with aiofiles.open(upload_path, "wb") as f:
        content = await file.read()
        await f.write(content)

    try:
        import asyncio

        loop = asyncio.get_event_loop()
        embeddings = await loop.run_in_executor(
            None,
            lambda: engine.get_embeddings(audio_path=upload_path),
        )
        return embeddings

    except Exception as e:
        logger.error(f"Embedding extraction failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        if upload_path.exists():
            upload_path.unlink()


# Speaker profiles
@app.get("/speakers", response_model=list[SpeakerProfile], tags=["Speakers"])
async def list_speakers() -> list[SpeakerProfile]:
    """List all speaker profiles."""
    return list(speaker_profiles.values())


@app.post("/speakers", response_model=SpeakerProfile, tags=["Speakers"])
async def create_speaker(profile: SpeakerProfileCreate) -> SpeakerProfile:
    """Create a new speaker profile."""
    from datetime import datetime, timezone

    profile_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    speaker = SpeakerProfile(
        id=profile_id,
        name=profile.name,
        created_at=now,
        updated_at=now,
    )
    speaker_profiles[profile_id] = speaker
    return speaker


@app.get("/speakers/{profile_id}", response_model=SpeakerProfile, tags=["Speakers"])
async def get_speaker(profile_id: str) -> SpeakerProfile:
    """Get a speaker profile by ID."""
    if profile_id not in speaker_profiles:
        raise HTTPException(status_code=404, detail="Speaker profile not found")
    return speaker_profiles[profile_id]


@app.delete("/speakers/{profile_id}", tags=["Speakers"])
async def delete_speaker(profile_id: str) -> dict[str, bool]:
    """Delete a speaker profile."""
    if profile_id not in speaker_profiles:
        raise HTTPException(status_code=404, detail="Speaker profile not found")
    del speaker_profiles[profile_id]
    return {"success": True}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "src.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )
