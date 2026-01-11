# WhisperX Transcription Service
# GPU-enabled Dockerfile with CUDA support

FROM nvidia/cuda:12.1.0-cudnn8-runtime-ubuntu22.04 AS base

# Prevent interactive prompts
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3.11 \
    python3.11-venv \
    python3-pip \
    ffmpeg \
    git \
    && rm -rf /var/lib/apt/lists/*

# Set Python 3.11 as default
RUN update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1

WORKDIR /app

# Create directories
RUN mkdir -p /app/models /app/uploads /app/outputs

# Copy requirements and install dependencies
COPY pyproject.toml README.md ./
RUN pip install --no-cache-dir -e .

# Copy application code
COPY src/ ./src/

# Environment variables
ENV WHISPER_MODEL_CACHE_DIR=/app/models
ENV WHISPER_UPLOAD_DIR=/app/uploads
ENV WHISPER_OUTPUT_DIR=/app/outputs
ENV WHISPER_DEVICE=auto

EXPOSE 8001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python3 -c "import httpx; httpx.get('http://localhost:8001/health').raise_for_status()"

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8001"]
