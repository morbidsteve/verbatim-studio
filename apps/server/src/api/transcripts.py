from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List

from src.api.auth import get_current_user

router = APIRouter()


class TranscriptSegmentResponse(BaseModel):
    id: str
    index: int
    speaker_id: str
    text: str
    start_time: int
    end_time: int
    confidence: float


class TranscriptResponse(BaseModel):
    id: str
    recording_id: str
    language: str
    model: str
    word_count: int
    segments: List[TranscriptSegmentResponse]
    created_at: str


class SegmentUpdate(BaseModel):
    text: str


class ExportRequest(BaseModel):
    format: str  # txt, json, srt, vtt, docx, pdf
    include_speaker_labels: bool = True
    include_timestamps: bool = True


@router.get("/{recording_id}", response_model=TranscriptResponse)
async def get_transcript(
    recording_id: str, current_user: dict = Depends(get_current_user)
):
    # TODO: Get transcript for recording
    raise HTTPException(status_code=501, detail="Not implemented")


@router.patch("/{recording_id}/segments/{segment_id}")
async def update_segment(
    recording_id: str,
    segment_id: str,
    updates: SegmentUpdate,
    current_user: dict = Depends(get_current_user),
):
    # TODO: Update transcript segment text
    raise HTTPException(status_code=501, detail="Not implemented")


@router.post("/{recording_id}/export")
async def export_transcript(
    recording_id: str,
    export_options: ExportRequest,
    current_user: dict = Depends(get_current_user),
):
    # TODO: Generate export in requested format
    raise HTTPException(status_code=501, detail="Not implemented")


@router.get("/{recording_id}/speakers")
async def get_speakers(
    recording_id: str, current_user: dict = Depends(get_current_user)
):
    # TODO: Get speakers for transcript
    raise HTTPException(status_code=501, detail="Not implemented")


@router.patch("/{recording_id}/speakers/{speaker_id}")
async def update_speaker(
    recording_id: str,
    speaker_id: str,
    name: str,
    current_user: dict = Depends(get_current_user),
):
    # TODO: Update speaker name
    raise HTTPException(status_code=501, detail="Not implemented")


@router.post("/{recording_id}/summarize")
async def summarize_transcript(
    recording_id: str,
    summary_type: str = "brief",
    current_user: dict = Depends(get_current_user),
):
    # TODO: Generate AI summary
    raise HTTPException(status_code=501, detail="Not implemented")


@router.post("/search")
async def search_transcripts(
    query: str,
    project_ids: List[str] | None = None,
    semantic: bool = False,
    current_user: dict = Depends(get_current_user),
):
    # TODO: Search transcripts
    raise HTTPException(status_code=501, detail="Not implemented")
