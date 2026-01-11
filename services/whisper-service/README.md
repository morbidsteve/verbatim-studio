# Whisper Service

WhisperX-based transcription service for Verbatim Studio.

## Features

- File-based audio/video transcription
- Multiple Whisper model sizes (tiny, base, small, medium, large-v3)
- Word-level timestamps
- Language detection and multi-language support
- GPU acceleration with automatic fallback to CPU

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

## Run

```bash
uvicorn src.main:app --reload --port 8001
```

## API Endpoints

- `GET /health` - Health check
- `GET /models` - List available models
- `POST /models/{model_id}/load` - Load a model
- `POST /transcribe` - Transcribe audio file
- `GET /jobs/{job_id}` - Get transcription job status
