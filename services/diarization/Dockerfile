# Speaker Diarization Service
# CPU-compatible Dockerfile for broad compatibility

FROM python:3.11-slim AS base

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN mkdir -p /app/models /app/uploads /app/embeddings

# Upgrade pip to avoid dependency resolution bugs
RUN pip install --upgrade pip setuptools wheel

COPY pyproject.toml README.md ./

# Install CPU-only PyTorch first, then the rest
RUN pip install --no-cache-dir torch torchaudio --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -e .

COPY src/ ./src/

# HuggingFace token must be provided at runtime for model downloads
ENV HF_TOKEN=""
ENV MODEL_CACHE_DIR=/app/models
ENV UPLOAD_DIR=/app/uploads
ENV EMBEDDINGS_DIR=/app/embeddings
ENV DEVICE=cpu

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
