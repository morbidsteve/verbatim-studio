"""WhisperX transcription service."""

import logging
import os
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

import aiofiles
from fastapi import BackgroundTasks, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from src.config import settings
from src.jobs import job_manager
from src.schemas import (
    ErrorResponse,
    HealthResponse,
    JobStatus,
    ModelInfo,
    ModelSize,
    TranscriptionJob,
    TranscriptionRequest,
    TranscriptionResult,
)
from src.transcriber import engine

# Configure logging
logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    logger.info(f"Starting {settings.service_name}")
    logger.info(f"Device: {engine.device}, Compute type: {engine.compute_type}")

    # Optionally preload default model
    if os.environ.get("PRELOAD_MODEL", "").lower() == "true":
        try:
            engine.load_model(ModelSize(settings.default_model))
        except Exception as e:
            logger.warning(f"Failed to preload model: {e}")

    yield

    # Shutdown
    logger.info("Shutting down...")


app = FastAPI(
    title="Whisper Transcription Service",
    description="WhisperX-based audio transcription service for Verbatim Studio",
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
    models_loaded = [m.value for m in engine._models.keys()]
    return HealthResponse(
        status="healthy",
        version="0.1.0",
        device=engine.device,
        models_loaded=models_loaded,
    )


# Model management
@app.get("/models", response_model=list[ModelInfo], tags=["Models"])
async def list_models() -> list[ModelInfo]:
    """List all available Whisper models."""
    return engine.list_models()


@app.get("/models/{model_id}", response_model=ModelInfo, tags=["Models"])
async def get_model(model_id: ModelSize) -> ModelInfo:
    """Get information about a specific model."""
    return engine.get_model_info(model_id)


@app.post("/models/{model_id}/load", response_model=ModelInfo, tags=["Models"])
async def load_model(model_id: ModelSize) -> ModelInfo:
    """Load a model into memory."""
    try:
        return engine.load_model(model_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/models/{model_id}/unload", tags=["Models"])
async def unload_model(model_id: ModelSize) -> dict[str, bool]:
    """Unload a model from memory."""
    success = engine.unload_model(model_id)
    return {"success": success}


# Transcription
@app.post("/transcribe", response_model=TranscriptionJob, tags=["Transcription"])
async def transcribe(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    model: ModelSize = Form(default=ModelSize.SMALL),
    language: str | None = Form(default=None),
    word_timestamps: bool = Form(default=True),
    batch_size: int = Form(default=16),
    beam_size: int = Form(default=5),
    initial_prompt: str | None = Form(default=None),
    vad_filter: bool = Form(default=True),
) -> TranscriptionJob:
    """
    Transcribe an audio or video file.

    The transcription runs in the background. Use the returned job_id
    to check status and retrieve results.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    # Validate file size
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)

    max_size = settings.max_file_size_mb * 1024 * 1024
    if file_size > max_size:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {settings.max_file_size_mb}MB",
        )

    # Save uploaded file
    file_id = str(uuid.uuid4())
    file_ext = Path(file.filename).suffix
    upload_path = Path(settings.upload_dir) / f"{file_id}{file_ext}"

    async with aiofiles.open(upload_path, "wb") as f:
        content = await file.read()
        await f.write(content)

    # Create job
    job = await job_manager.create_job(
        filename=file.filename,
        model=model,
        language=language,
    )

    # Start background transcription
    background_tasks.add_task(
        job_manager.process_job,
        job_id=job.job_id,
        audio_path=upload_path,
        model=model,
        language=language,
        word_timestamps=word_timestamps,
        batch_size=batch_size,
        beam_size=beam_size,
        initial_prompt=initial_prompt,
        vad_filter=vad_filter,
    )

    return job


@app.post("/transcribe/sync", response_model=TranscriptionResult, tags=["Transcription"])
async def transcribe_sync(
    file: UploadFile = File(...),
    model: ModelSize = Form(default=ModelSize.SMALL),
    language: str | None = Form(default=None),
    word_timestamps: bool = Form(default=True),
    batch_size: int = Form(default=16),
    beam_size: int = Form(default=5),
    initial_prompt: str | None = Form(default=None),
    vad_filter: bool = Form(default=True),
) -> TranscriptionResult:
    """
    Transcribe an audio file synchronously.

    Warning: This endpoint blocks until transcription is complete.
    Use /transcribe for async processing of longer files.
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
        # Run transcription
        import asyncio

        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: engine.transcribe(
                audio_path=upload_path,
                model_id=model,
                language=language,
                word_timestamps=word_timestamps,
                batch_size=batch_size,
                beam_size=beam_size,
                initial_prompt=initial_prompt,
                vad_filter=vad_filter,
            ),
        )
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        # Clean up uploaded file
        if upload_path.exists():
            upload_path.unlink()


# Job management
@app.get("/jobs", response_model=list[TranscriptionJob], tags=["Jobs"])
async def list_jobs(
    status: JobStatus | None = None,
    limit: int = 100,
) -> list[TranscriptionJob]:
    """List transcription jobs."""
    return await job_manager.list_jobs(status=status, limit=limit)


@app.get("/jobs/{job_id}", response_model=TranscriptionJob, tags=["Jobs"])
async def get_job(job_id: str) -> TranscriptionJob:
    """Get a transcription job by ID."""
    job = await job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@app.delete("/jobs/{job_id}", tags=["Jobs"])
async def delete_job(job_id: str) -> dict[str, bool]:
    """Delete a transcription job."""
    success = await job_manager.delete_job(job_id)
    if not success:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"success": success}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "src.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )
