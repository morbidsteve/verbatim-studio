# Speaker Diarization Service
# GPU-enabled Dockerfile with CUDA support

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

RUN mkdir -p /app/models /app/uploads /app/embeddings

COPY pyproject.toml README.md ./
RUN pip install --no-cache-dir -e .

COPY src/ ./src/

# HuggingFace token must be provided at runtime
ENV HF_TOKEN=""
ENV MODEL_CACHE_DIR=/app/models
ENV UPLOAD_DIR=/app/uploads
ENV EMBEDDINGS_DIR=/app/embeddings
ENV DEVICE=auto

EXPOSE 8003

HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
    CMD python3 -c "import httpx; httpx.get('http://localhost:8003/health').raise_for_status()"

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8003"]
