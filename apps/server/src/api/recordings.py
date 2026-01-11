from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import List

from src.api.auth import get_current_user

router = APIRouter()


class RecordingResponse(BaseModel):
    id: str
    project_id: str
    name: str
    description: str | None
    media_type: str
    duration: int
    size: int
    transcription_status: str
    created_at: str


class RecordingUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


@router.post("/upload", response_model=RecordingResponse)
async def upload_recording(
    project_id: str = Form(...),
    name: str = Form(...),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    # TODO: Handle file upload
    # 1. Validate file type
    # 2. Save to storage
    # 3. Create database record
    # 4. Queue transcription job
    raise HTTPException(status_code=501, detail="Not implemented")


@router.get("/", response_model=List[RecordingResponse])
async def list_recordings(
    project_id: str, current_user: dict = Depends(get_current_user)
):
    # TODO: List recordings for project
    raise HTTPException(status_code=501, detail="Not implemented")


@router.get("/{recording_id}", response_model=RecordingResponse)
async def get_recording(
    recording_id: str, current_user: dict = Depends(get_current_user)
):
    # TODO: Get recording by ID
    raise HTTPException(status_code=501, detail="Not implemented")


@router.patch("/{recording_id}", response_model=RecordingResponse)
async def update_recording(
    recording_id: str,
    updates: RecordingUpdate,
    current_user: dict = Depends(get_current_user),
):
    # TODO: Update recording metadata
    raise HTTPException(status_code=501, detail="Not implemented")


@router.delete("/{recording_id}")
async def delete_recording(
    recording_id: str, current_user: dict = Depends(get_current_user)
):
    # TODO: Delete recording
    raise HTTPException(status_code=501, detail="Not implemented")


@router.post("/{recording_id}/transcribe")
async def start_transcription(
    recording_id: str,
    model: str = "whisper-small",
    language: str | None = None,
    current_user: dict = Depends(get_current_user),
):
    # TODO: Queue transcription job
    raise HTTPException(status_code=501, detail="Not implemented")


@router.get("/{recording_id}/status")
async def get_transcription_status(
    recording_id: str, current_user: dict = Depends(get_current_user)
):
    # TODO: Get transcription job status
    raise HTTPException(status_code=501, detail="Not implemented")
