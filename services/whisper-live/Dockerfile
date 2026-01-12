# WhisperLive Real-time Transcription Service
# GPU-enabled Dockerfile

FROM nvidia/cuda:12.1.0-cudnn8-runtime-ubuntu22.04 AS base

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    python3.11 \
    python3.11-venv \
    python3-pip \
    ffmpeg \
    git \
    && rm -rf /var/lib/apt/lists/*

RUN update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1

WORKDIR /app

RUN mkdir -p /app/models

# Upgrade pip to avoid dependency resolution bugs
RUN pip install --upgrade pip setuptools wheel

COPY pyproject.toml README.md ./
RUN pip install --no-cache-dir -e .

COPY src/ ./src/

ENV WHISPER_LIVE_MODEL_CACHE_DIR=/app/models
ENV WHISPER_LIVE_DEVICE=auto

EXPOSE 8002

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python3 -c "import httpx; httpx.get('http://localhost:8002/health').raise_for_status()"

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8002"]
