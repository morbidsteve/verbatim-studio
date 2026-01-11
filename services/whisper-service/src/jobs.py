"""Transcription job management."""

import asyncio
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from src.schemas import (
    JobStatus,
    ModelSize,
    TranscriptionJob,
    TranscriptionResult,
)
from src.transcriber import engine

logger = logging.getLogger(__name__)


class JobManager:
    """Manages transcription jobs."""

    def __init__(self) -> None:
        self._jobs: dict[str, TranscriptionJob] = {}
        self._results: dict[str, TranscriptionResult] = {}
        self._lock = asyncio.Lock()

    async def create_job(
        self,
        filename: str,
        model: ModelSize = ModelSize.SMALL,
        language: str | None = None,
    ) -> TranscriptionJob:
        """Create a new transcription job."""
        job_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()

        job = TranscriptionJob(
            job_id=job_id,
            status=JobStatus.PENDING,
            progress=0.0,
            filename=filename,
            model=model,
            language=language,
            created_at=now,
        )

        async with self._lock:
            self._jobs[job_id] = job

        return job

    async def get_job(self, job_id: str) -> TranscriptionJob | None:
        """Get a job by ID."""
        async with self._lock:
            job = self._jobs.get(job_id)
            if job and job.status == JobStatus.COMPLETED:
                # Attach result if completed
                job.result = self._results.get(job_id)
            return job

    async def list_jobs(
        self,
        status: JobStatus | None = None,
        limit: int = 100,
    ) -> list[TranscriptionJob]:
        """List jobs, optionally filtered by status."""
        async with self._lock:
            jobs = list(self._jobs.values())

        if status:
            jobs = [j for j in jobs if j.status == status]

        # Sort by created_at descending
        jobs.sort(key=lambda j: j.created_at, reverse=True)

        return jobs[:limit]

    async def update_job(
        self,
        job_id: str,
        status: JobStatus | None = None,
        progress: float | None = None,
        error: str | None = None,
        result: TranscriptionResult | None = None,
    ) -> TranscriptionJob | None:
        """Update a job's status."""
        async with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                return None

            now = datetime.now(timezone.utc).isoformat()

            if status:
                job.status = status
                if status == JobStatus.PROCESSING and not job.started_at:
                    job.started_at = now
                elif status in (JobStatus.COMPLETED, JobStatus.FAILED):
                    job.completed_at = now

            if progress is not None:
                job.progress = progress

            if error:
                job.error = error

            if result:
                self._results[job_id] = result
                job.result = result

            return job

    async def delete_job(self, job_id: str) -> bool:
        """Delete a job."""
        async with self._lock:
            if job_id in self._jobs:
                del self._jobs[job_id]
                self._results.pop(job_id, None)
                return True
            return False

    async def process_job(
        self,
        job_id: str,
        audio_path: Path,
        model: ModelSize = ModelSize.SMALL,
        language: str | None = None,
        word_timestamps: bool = True,
        batch_size: int = 16,
        beam_size: int = 5,
        initial_prompt: str | None = None,
        vad_filter: bool = True,
        vad_parameters: dict[str, Any] | None = None,
    ) -> TranscriptionResult | None:
        """Process a transcription job."""
        # Update status to processing
        await self.update_job(job_id, status=JobStatus.PROCESSING, progress=0.1)

        try:
            # Run transcription in thread pool to not block
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                lambda: engine.transcribe(
                    audio_path=audio_path,
                    model_id=model,
                    language=language,
                    word_timestamps=word_timestamps,
                    batch_size=batch_size,
                    beam_size=beam_size,
                    initial_prompt=initial_prompt,
                    vad_filter=vad_filter,
                    vad_parameters=vad_parameters,
                ),
            )

            # Update with result
            await self.update_job(
                job_id,
                status=JobStatus.COMPLETED,
                progress=1.0,
                result=result,
            )

            return result

        except Exception as e:
            logger.error(f"Transcription failed for job {job_id}: {e}")
            await self.update_job(
                job_id,
                status=JobStatus.FAILED,
                error=str(e),
            )
            return None


# Global job manager instance
job_manager = JobManager()
