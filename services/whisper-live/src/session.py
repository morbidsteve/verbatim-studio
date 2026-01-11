"""WebSocket session management for real-time transcription."""

import asyncio
import logging
import uuid
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

import numpy as np
from fastapi import WebSocket

from src.config import settings
from src.schemas import ConfigMessage, ErrorMessage, FinalResult, ModelSize, PartialResult, StatusMessage
from src.transcriber import transcriber

logger = logging.getLogger(__name__)


@dataclass
class TranscriptionSession:
    """A real-time transcription session."""

    session_id: str
    websocket: WebSocket
    model: ModelSize = ModelSize.SMALL
    language: str | None = None
    vad_enabled: bool = True
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    last_activity: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    audio_buffer: bytearray = field(default_factory=bytearray)
    is_active: bool = True

    def update_activity(self) -> None:
        """Update last activity timestamp."""
        self.last_activity = datetime.now(timezone.utc)


class SessionManager:
    """Manages transcription sessions."""

    def __init__(self) -> None:
        self._sessions: dict[str, TranscriptionSession] = {}
        self._lock = asyncio.Lock()

    @property
    def active_sessions(self) -> int:
        """Get count of active sessions."""
        return len(self._sessions)

    async def create_session(self, websocket: WebSocket) -> TranscriptionSession:
        """Create a new transcription session."""
        async with self._lock:
            if len(self._sessions) >= settings.max_sessions:
                raise RuntimeError("Maximum sessions reached")

            session_id = str(uuid.uuid4())
            session = TranscriptionSession(
                session_id=session_id,
                websocket=websocket,
            )
            self._sessions[session_id] = session

            logger.info(f"Created session {session_id}")
            return session

    async def get_session(self, session_id: str) -> TranscriptionSession | None:
        """Get a session by ID."""
        return self._sessions.get(session_id)

    async def close_session(self, session_id: str) -> None:
        """Close and remove a session."""
        async with self._lock:
            if session_id in self._sessions:
                session = self._sessions[session_id]
                session.is_active = False
                del self._sessions[session_id]
                logger.info(f"Closed session {session_id}")

    async def process_audio(
        self,
        session: TranscriptionSession,
        audio_data: bytes,
    ) -> None:
        """Process incoming audio data."""
        session.update_activity()

        # Add to buffer
        session.audio_buffer.extend(audio_data)

        # Process when we have enough audio (roughly 1 second)
        bytes_per_second = settings.sample_rate * 2  # 16-bit audio
        min_buffer_size = bytes_per_second

        if len(session.audio_buffer) >= min_buffer_size:
            await self._process_buffer(session)

    async def _process_buffer(self, session: TranscriptionSession) -> None:
        """Process the audio buffer."""
        if not session.audio_buffer:
            return

        # Convert bytes to numpy array
        audio_bytes = bytes(session.audio_buffer)
        audio = np.frombuffer(audio_bytes, dtype=np.int16).astype(np.float32) / 32768.0

        # Clear buffer
        session.audio_buffer.clear()

        # Run VAD if enabled
        if session.vad_enabled:
            segments = transcriber.detect_voice_activity(audio)
            if not segments:
                # No speech detected
                return

        # Transcribe
        try:
            loop = asyncio.get_event_loop()

            async def transcribe_and_send():
                for result in transcriber.transcribe_segment(
                    audio,
                    language=session.language,
                ):
                    if isinstance(result, PartialResult):
                        await session.websocket.send_json(result.model_dump())
                    elif isinstance(result, FinalResult):
                        await session.websocket.send_json(result.model_dump())

            await loop.run_in_executor(None, lambda: asyncio.run(transcribe_and_send()))

        except Exception as e:
            logger.error(f"Transcription error in session {session.session_id}: {e}")
            await session.websocket.send_json(
                ErrorMessage(error="transcription_failed", detail=str(e)).model_dump()
            )

    async def configure_session(
        self,
        session: TranscriptionSession,
        config: ConfigMessage,
    ) -> None:
        """Configure a session."""
        session.model = config.model
        session.language = config.language
        session.vad_enabled = config.vad_enabled

        # Ensure model is loaded
        if not transcriber.model_loaded or transcriber._model_size != config.model:
            await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: transcriber.load_model(config.model),
            )

        await session.websocket.send_json(
            StatusMessage(
                status="configured",
                session_id=session.session_id,
            ).model_dump()
        )


# Global session manager
session_manager = SessionManager()
