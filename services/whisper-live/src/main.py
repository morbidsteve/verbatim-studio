"""Real-time transcription service with WebSocket support."""

import json
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from src.config import settings
from src.schemas import (
    ConfigMessage,
    ErrorMessage,
    HealthResponse,
    ModelSize,
    StatusMessage,
)
from src.session import session_manager
from src.transcriber import transcriber

# Configure logging
logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    logger.info(f"Starting {settings.service_name}")
    logger.info(f"Device: {transcriber.device}")

    # Optionally preload model
    if os.environ.get("PRELOAD_MODEL", "").lower() == "true":
        try:
            transcriber.load_model(ModelSize(settings.default_model))
            transcriber.load_vad()
        except Exception as e:
            logger.warning(f"Failed to preload models: {e}")

    yield

    logger.info("Shutting down...")


app = FastAPI(
    title="WhisperLive Real-time Transcription",
    description="WebSocket-based real-time audio transcription service",
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


@app.get("/health", response_model=HealthResponse, tags=["System"])
async def health_check() -> HealthResponse:
    """Check service health."""
    return HealthResponse(
        status="healthy",
        version="0.1.0",
        device=transcriber.device,
        active_sessions=session_manager.active_sessions,
        model_loaded=transcriber.model_loaded,
    )


@app.websocket("/ws/transcribe")
async def websocket_transcribe(websocket: WebSocket):
    """
    WebSocket endpoint for real-time transcription.

    Protocol:
    1. Connect to this endpoint
    2. Send config message (optional): {"type": "config", "model": "small", "language": "en"}
    3. Send audio chunks as binary data (16kHz, mono, 16-bit PCM)
    4. Receive partial and final transcription results as JSON
    """
    await websocket.accept()

    try:
        # Create session
        session = await session_manager.create_session(websocket)

        # Send session created message
        await websocket.send_json(
            StatusMessage(
                status="connected",
                session_id=session.session_id,
            ).model_dump()
        )

        # Process messages
        while True:
            try:
                message = await websocket.receive()

                if message["type"] == "websocket.disconnect":
                    break

                if "bytes" in message:
                    # Binary audio data
                    await session_manager.process_audio(session, message["bytes"])

                elif "text" in message:
                    # JSON message (config, etc.)
                    try:
                        data = json.loads(message["text"])
                        msg_type = data.get("type", "")

                        if msg_type == "config":
                            config = ConfigMessage(**data)
                            await session_manager.configure_session(session, config)

                        elif msg_type == "ping":
                            await websocket.send_json({"type": "pong"})

                    except json.JSONDecodeError:
                        await websocket.send_json(
                            ErrorMessage(
                                error="invalid_json",
                                detail="Could not parse JSON message",
                            ).model_dump()
                        )

            except WebSocketDisconnect:
                break

    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.send_json(
                ErrorMessage(error="internal_error", detail=str(e)).model_dump()
            )
        except Exception:
            pass

    finally:
        if "session" in locals():
            await session_manager.close_session(session.session_id)


@app.get("/sessions", tags=["Sessions"])
async def get_sessions_count() -> dict:
    """Get count of active sessions."""
    return {
        "active_sessions": session_manager.active_sessions,
        "max_sessions": settings.max_sessions,
    }


@app.post("/models/{model_id}/load", tags=["Models"])
async def load_model(model_id: ModelSize) -> dict:
    """Pre-load a model."""
    try:
        import asyncio

        await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: transcriber.load_model(model_id),
        )
        return {"status": "loaded", "model": model_id.value}
    except Exception as e:
        return {"status": "error", "error": str(e)}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "src.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )
