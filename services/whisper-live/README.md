# WhisperLive

Real-time transcription service using faster-whisper for Verbatim Studio.

## Features

- WebSocket-based streaming audio input
- Real-time transcription with partial results
- Voice Activity Detection (VAD) for efficient processing
- GPU acceleration with automatic fallback to CPU
- Multi-client session management

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

## Run

```bash
uvicorn src.main:app --reload --port 8002
```

## WebSocket Protocol

Connect to `ws://localhost:8002/ws/transcribe`

### Client → Server Messages

1. **Audio data**: Raw binary audio chunks (16kHz, mono, 16-bit PCM)
2. **Config message**: JSON with session configuration

```json
{
  "type": "config",
  "model": "small",
  "language": "en"
}
```

### Server → Client Messages

```json
{
  "type": "partial",
  "text": "Hello, this is",
  "timestamp": 1.5
}

{
  "type": "final",
  "text": "Hello, this is a complete sentence.",
  "start": 0.0,
  "end": 2.5,
  "words": [...]
}
```
