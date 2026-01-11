# Diarization Service

PyAnnote Audio-based speaker diarization service for Verbatim Studio.

## Features

- Speaker diarization (who spoke when)
- Speaker embedding extraction
- Speaker profile management
- Integration with transcription for speaker labels

## Requirements

- HuggingFace token for PyAnnote models (set `HF_TOKEN` environment variable)
- Accept PyAnnote model terms at https://huggingface.co/pyannote/speaker-diarization-3.1

## Setup

```bash
export HF_TOKEN=your_huggingface_token
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

## Run

```bash
uvicorn src.main:app --reload --port 8003
```

## API Endpoints

- `GET /health` - Health check
- `POST /diarize` - Diarize audio file
- `POST /identify` - Identify speakers in audio
- `GET /speakers` - List known speaker profiles
- `POST /speakers` - Create speaker profile
