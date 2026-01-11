"""Recording API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import uuid
import os
import aiofiles

from src.config import settings
from src.database.connection import get_db
from src.database.models import Recording, Project, TranscriptionStatus, User
from src.api.auth import get_current_user

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


@router.post("/{recording_id}/transcribe")
async def start_transcription(
    recording_id: str,
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

    # TODO: Queue transcription job with Celery

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
