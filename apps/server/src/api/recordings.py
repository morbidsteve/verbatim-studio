"""Recording API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
import uuid
import os
import aiofiles
import mimetypes
import httpx
import logging

from src.config import settings
from src.database.connection import get_db, AsyncSessionLocal
from src.database.models import Recording, Project, TranscriptionStatus, User, Transcript, TranscriptSegment
from src.api.auth import get_current_user, get_user_from_token

logger = logging.getLogger(__name__)

router = APIRouter()


# Pydantic models
class RecordingUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    metadata: Optional[dict] = None


class RecordingResponse(BaseModel):
    id: str
    project_id: str
    name: str
    description: Optional[str]
    source_type: str
    media_type: str
    format: str
    duration: int
    size: int
    storage_path: str
    transcription_status: str
    transcription_progress: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RecordingListResponse(BaseModel):
    items: List[RecordingResponse]
    total: int
    page: int
    page_size: int


# Helper functions
def get_file_format(filename: str) -> str:
    """Extract file format from filename."""
    return os.path.splitext(filename)[1].lower().lstrip(".")


def get_media_type(file_format: str) -> str:
    """Determine media type from file format."""
    video_formats = {"mp4", "mov", "avi", "mkv", "webm"}
    return "video" if file_format in video_formats else "audio"


async def verify_project_access(
    db: AsyncSession, project_id: str, user_id: str
) -> Project:
    """Verify user has access to the project."""
    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.owner_id == user_id
        )
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


# API Endpoints
@router.post("/upload", response_model=RecordingResponse)
async def upload_recording(
    project_id: str = Form(...),
    name: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Upload a new recording file."""
    # Verify project access
    project = await verify_project_access(db, project_id, current_user.id)

    # Get file info
    file_format = get_file_format(file.filename or "unknown")
    media_type = get_media_type(file_format)
    recording_name = name or file.filename or "Untitled Recording"

    # Generate unique ID and storage path
    recording_id = str(uuid.uuid4())
    storage_dir = os.path.join(settings.storage_path, project_id)
    os.makedirs(storage_dir, exist_ok=True)
    storage_path = os.path.join(storage_dir, f"{recording_id}.{file_format}")

    # Save file
    file_size = 0
    async with aiofiles.open(storage_path, "wb") as f:
        while chunk := await file.read(1024 * 1024):  # 1MB chunks
            await f.write(chunk)
            file_size += len(chunk)

    # Create recording record
    recording = Recording(
        id=recording_id,
        project_id=project_id,
        name=recording_name,
        description=description,
        source_type="upload",
        media_type=media_type,
        format=file_format,
        size=file_size,
        storage_path=storage_path,
        transcription_status=TranscriptionStatus.PENDING,
    )

    db.add(recording)

    # Update project stats
    project.recording_count += 1
    project.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(recording)

    return RecordingResponse(
        id=recording.id,
        project_id=recording.project_id,
        name=recording.name,
        description=recording.description,
        source_type=recording.source_type,
        media_type=recording.media_type,
        format=recording.format,
        duration=recording.duration,
        size=recording.size,
        storage_path=recording.storage_path,
        transcription_status=recording.transcription_status.value,
        transcription_progress=recording.transcription_progress,
        created_at=recording.created_at,
        updated_at=recording.updated_at,
    )


@router.get("/", response_model=RecordingListResponse)
async def list_recordings(
    project_id: str = Query(..., description="Filter by project ID"),
    status: Optional[str] = Query(None, description="Filter by transcription status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List recordings for a project."""
    # Verify project access
    await verify_project_access(db, project_id, current_user.id)

    query = select(Recording).where(Recording.project_id == project_id)

    # Apply filters
    if status:
        try:
            status_enum = TranscriptionStatus(status)
            query = query.where(Recording.transcription_status == status_enum)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status}")

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Apply pagination
    query = query.order_by(Recording.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    recordings = result.scalars().all()

    return RecordingListResponse(
        items=[
            RecordingResponse(
                id=r.id,
                project_id=r.project_id,
                name=r.name,
                description=r.description,
                source_type=r.source_type,
                media_type=r.media_type,
                format=r.format,
                duration=r.duration,
                size=r.size,
                storage_path=r.storage_path,
                transcription_status=r.transcription_status.value,
                transcription_progress=r.transcription_progress,
                created_at=r.created_at,
                updated_at=r.updated_at,
            )
            for r in recordings
        ],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{recording_id}", response_model=RecordingResponse)
async def get_recording(
    recording_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a recording by ID."""
    result = await db.execute(
        select(Recording).where(Recording.id == recording_id)
    )
    recording = result.scalar_one_or_none()

    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")

    # Verify project access
    await verify_project_access(db, recording.project_id, current_user.id)

    return RecordingResponse(
        id=recording.id,
        project_id=recording.project_id,
        name=recording.name,
        description=recording.description,
        source_type=recording.source_type,
        media_type=recording.media_type,
        format=recording.format,
        duration=recording.duration,
        size=recording.size,
        storage_path=recording.storage_path,
        transcription_status=recording.transcription_status.value,
        transcription_progress=recording.transcription_progress,
        created_at=recording.created_at,
        updated_at=recording.updated_at,
    )


@router.patch("/{recording_id}", response_model=RecordingResponse)
async def update_recording(
    recording_id: str,
    updates: RecordingUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a recording."""
    result = await db.execute(
        select(Recording).where(Recording.id == recording_id)
    )
    recording = result.scalar_one_or_none()

    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")

    # Verify project access
    await verify_project_access(db, recording.project_id, current_user.id)

    # Apply updates
    if updates.name is not None:
        recording.name = updates.name
    if updates.description is not None:
        recording.description = updates.description
    if updates.metadata is not None:
        recording.metadata_json = updates.metadata

    recording.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(recording)

    return RecordingResponse(
        id=recording.id,
        project_id=recording.project_id,
        name=recording.name,
        description=recording.description,
        source_type=recording.source_type,
        media_type=recording.media_type,
        format=recording.format,
        duration=recording.duration,
        size=recording.size,
        storage_path=recording.storage_path,
        transcription_status=recording.transcription_status.value,
        transcription_progress=recording.transcription_progress,
        created_at=recording.created_at,
        updated_at=recording.updated_at,
    )


@router.delete("/{recording_id}")
async def delete_recording(
    recording_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a recording."""
    result = await db.execute(
        select(Recording).where(Recording.id == recording_id)
    )
    recording = result.scalar_one_or_none()

    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")

    # Verify project access
    project = await verify_project_access(db, recording.project_id, current_user.id)

    # Delete file
    if os.path.exists(recording.storage_path):
        os.remove(recording.storage_path)

    # Update project stats
    project.recording_count = max(0, project.recording_count - 1)
    project.total_duration = max(0, project.total_duration - recording.duration)
    project.updated_at = datetime.utcnow()

    await db.delete(recording)
    await db.commit()

    return {"message": "Recording deleted successfully"}


async def update_transcription_progress(db: AsyncSession, recording_id: str, progress: int):
    """Update transcription progress in database."""
    result = await db.execute(
        select(Recording).where(Recording.id == recording_id)
    )
    recording = result.scalar_one_or_none()
    if recording:
        recording.transcription_progress = progress
        recording.updated_at = datetime.utcnow()
        await db.commit()


async def process_transcription(
    recording_id: str,
    storage_path: str,
    model: str,
    language: Optional[str],
):
    """Background task to process transcription via WhisperX service."""
    async with AsyncSessionLocal() as db:
        try:
            logger.info(f"Starting transcription for recording {recording_id}")

            # Update progress: Starting
            await update_transcription_progress(db, recording_id, 10)

            # Send file to WhisperX service
            async with httpx.AsyncClient(timeout=600.0) as client:  # 10 min timeout for long files
                # Update progress: Sending to service
                await update_transcription_progress(db, recording_id, 20)

                # Read the audio file
                with open(storage_path, "rb") as audio_file:
                    files = {"file": (os.path.basename(storage_path), audio_file, "audio/mpeg")}
                    data = {
                        "model": model,
                        "word_timestamps": "true",
                        "vad_filter": "true",
                    }
                    if language:
                        data["language"] = language

                    logger.info(f"Sending request to WhisperX service: {settings.whisper_service_url}/transcribe/sync")

                    # Update progress: Transcribing
                    await update_transcription_progress(db, recording_id, 40)

                    response = await client.post(
                        f"{settings.whisper_service_url}/transcribe/sync",
                        files=files,
                        data=data,
                    )

            # Update progress: Processing response
            await update_transcription_progress(db, recording_id, 80)

            if response.status_code != 200:
                raise Exception(f"WhisperX service error: {response.status_code} - {response.text}")

            result = response.json()
            logger.info(f"Transcription completed, {len(result.get('segments', []))} segments")

            # Get the recording from DB
            db_result = await db.execute(
                select(Recording).where(Recording.id == recording_id)
            )
            recording = db_result.scalar_one_or_none()

            if not recording:
                logger.error(f"Recording {recording_id} not found after transcription")
                return

            # Create transcript record
            transcript_id = str(uuid.uuid4())
            transcript = Transcript(
                id=transcript_id,
                recording_id=recording_id,
                full_text=result.get("text", ""),
                language=result.get("language", "en"),
                model_used=model,
                word_count=len(result.get("text", "").split()),
                speaker_count=len(set(seg.get("speaker") for seg in result.get("segments", []) if seg.get("speaker"))),
                confidence=result.get("language_probability", 0.0),
            )
            db.add(transcript)

            # Create segment records
            for idx, seg in enumerate(result.get("segments", [])):
                segment = TranscriptSegment(
                    id=str(uuid.uuid4()),
                    transcript_id=transcript_id,
                    segment_index=idx,
                    speaker_id=seg.get("speaker") or f"speaker_0",
                    text=seg.get("text", ""),
                    start_time=seg.get("start", 0),
                    end_time=seg.get("end", 0),
                    confidence=seg.get("confidence", 0.0),
                    words_json=[
                        {
                            "word": w.get("word", ""),
                            "start_time": w.get("start", 0),
                            "end_time": w.get("end", 0),
                            "confidence": w.get("confidence", 1.0),
                        }
                        for w in seg.get("words", [])
                    ] if seg.get("words") else None,
                )
                db.add(segment)

            # Update progress: Saving
            await update_transcription_progress(db, recording_id, 90)

            # Update recording status
            recording.transcription_status = TranscriptionStatus.COMPLETED
            recording.transcription_progress = 100
            recording.duration = int(result.get("duration", 0) * 1000)  # Convert to milliseconds
            recording.updated_at = datetime.utcnow()

            await db.commit()
            logger.info(f"Transcription saved for recording {recording_id}")

        except Exception as e:
            logger.error(f"Transcription failed for recording {recording_id}: {e}")

            # Update recording status to failed
            try:
                db_result = await db.execute(
                    select(Recording).where(Recording.id == recording_id)
                )
                recording = db_result.scalar_one_or_none()
                if recording:
                    recording.transcription_status = TranscriptionStatus.FAILED
                    recording.updated_at = datetime.utcnow()
                    await db.commit()
            except Exception as commit_error:
                logger.error(f"Failed to update recording status: {commit_error}")


@router.post("/{recording_id}/transcribe")
async def start_transcription(
    recording_id: str,
    background_tasks: BackgroundTasks,
    model: str = Query("small", description="Whisper model size"),
    language: Optional[str] = Query(None, description="Language code"),
    diarize: bool = Query(True, description="Enable speaker diarization"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Start transcription for a recording."""
    result = await db.execute(
        select(Recording).where(Recording.id == recording_id)
    )
    recording = result.scalar_one_or_none()

    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")

    # Verify project access
    await verify_project_access(db, recording.project_id, current_user.id)

    if recording.transcription_status == TranscriptionStatus.PROCESSING:
        raise HTTPException(status_code=400, detail="Transcription already in progress")

    # Update status
    recording.transcription_status = TranscriptionStatus.PROCESSING
    recording.transcription_progress = 0
    recording.updated_at = datetime.utcnow()

    await db.commit()

    # Start background transcription task
    background_tasks.add_task(
        process_transcription,
        recording_id=recording_id,
        storage_path=recording.storage_path,
        model=model,
        language=language,
    )

    return {
        "message": "Transcription started",
        "recording_id": recording_id,
        "model": model,
        "language": language,
        "diarize": diarize,
    }


@router.get("/{recording_id}/status")
async def get_transcription_status(
    recording_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get transcription status for a recording."""
    result = await db.execute(
        select(Recording).where(Recording.id == recording_id)
    )
    recording = result.scalar_one_or_none()

    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")

    # Verify project access
    await verify_project_access(db, recording.project_id, current_user.id)

    return {
        "recording_id": recording.id,
        "status": recording.transcription_status.value,
        "progress": recording.transcription_progress,
    }


# Speaker colors for visualization
SPEAKER_COLORS = [
    "#3B82F6",  # blue
    "#22C55E",  # green
    "#A855F7",  # purple
    "#F97316",  # orange
    "#EC4899",  # pink
    "#06B6D4",  # cyan
    "#EAB308",  # yellow
    "#EF4444",  # red
]


def get_speaker_color(index: int) -> str:
    """Get a color for a speaker based on index."""
    return SPEAKER_COLORS[index % len(SPEAKER_COLORS)]


class WordTimestamp(BaseModel):
    word: str
    start_time: float
    end_time: float
    confidence: float


class TranscriptSegmentResponse(BaseModel):
    id: str
    index: int
    speaker_id: str
    text: str
    start_time: int  # milliseconds
    end_time: int  # milliseconds
    confidence: float
    words: List[WordTimestamp]
    is_edited: bool


class SpeakerResponse(BaseModel):
    id: str
    name: Optional[str]
    color: str


class TranscriptResponse(BaseModel):
    id: str
    recording_id: str
    language: str
    segments: List[TranscriptSegmentResponse]
    speakers: List[SpeakerResponse]
    model: str
    model_version: str
    processing_time: int
    word_count: int
    character_count: int
    average_confidence: float
    created_at: str
    updated_at: str


@router.get("/{recording_id}/transcript", response_model=TranscriptResponse)
async def get_transcript(
    recording_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get transcript for a recording."""
    result = await db.execute(
        select(Recording)
        .options(
            selectinload(Recording.project),
            selectinload(Recording.transcript).selectinload(Transcript.segments),
        )
        .where(Recording.id == recording_id)
    )
    recording = result.scalar_one_or_none()

    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")

    # Verify access
    if recording.project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    if not recording.transcript:
        raise HTTPException(status_code=404, detail="No transcript found for this recording")

    transcript = recording.transcript

    # Build segments response
    segments = []
    speaker_ids = set()
    speaker_names = {}

    for seg in sorted(transcript.segments, key=lambda s: s.segment_index):
        speaker_id = seg.speaker_id or "speaker_0"
        speaker_ids.add(speaker_id)
        if seg.speaker_name:
            speaker_names[speaker_id] = seg.speaker_name

        words = seg.words_json or []

        segments.append(
            TranscriptSegmentResponse(
                id=seg.id,
                index=seg.segment_index,
                speaker_id=speaker_id,
                text=seg.text,
                start_time=int(seg.start_time * 1000),
                end_time=int(seg.end_time * 1000),
                confidence=seg.confidence,
                words=[
                    WordTimestamp(
                        word=w.get("word", ""),
                        start_time=w.get("start_time", 0),
                        end_time=w.get("end_time", 0),
                        confidence=w.get("confidence", 0),
                    )
                    for w in words
                ],
                is_edited=seg.updated_at > seg.created_at,
            )
        )

    # Build speakers list
    speakers = []
    for idx, speaker_id in enumerate(sorted(speaker_ids)):
        speakers.append(
            SpeakerResponse(
                id=speaker_id,
                name=speaker_names.get(speaker_id),
                color=get_speaker_color(idx),
            )
        )

    return TranscriptResponse(
        id=transcript.id,
        recording_id=recording.id,
        language=transcript.language,
        segments=segments,
        speakers=speakers,
        model=transcript.model_used or "unknown",
        model_version="1.0",
        processing_time=0,
        word_count=transcript.word_count,
        character_count=len(transcript.full_text),
        average_confidence=transcript.confidence,
        created_at=transcript.created_at.isoformat(),
        updated_at=transcript.updated_at.isoformat(),
    )


@router.get("/{recording_id}/media")
async def get_media(
    recording_id: str,
    token: str = Query(..., description="Auth token for streaming"),
    db: AsyncSession = Depends(get_db),
):
    """Stream the media file for a recording.

    Uses token as query parameter since HTML audio/video elements can't set headers.
    """
    # Authenticate via token query parameter
    current_user = await get_user_from_token(token, db)

    result = await db.execute(
        select(Recording)
        .options(selectinload(Recording.project))
        .where(Recording.id == recording_id)
    )
    recording = result.scalar_one_or_none()

    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")

    # Verify access
    if recording.project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Check file exists
    if not os.path.exists(recording.storage_path):
        raise HTTPException(status_code=404, detail="Media file not found")

    # Determine content type
    content_type, _ = mimetypes.guess_type(recording.storage_path)
    if not content_type:
        content_type = "application/octet-stream"

    return FileResponse(
        recording.storage_path,
        media_type=content_type,
        filename=f"{recording.name}.{recording.format}",
    )
