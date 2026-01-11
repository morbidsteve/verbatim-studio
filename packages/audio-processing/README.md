# Audio Processing

Audio processing utilities for Verbatim Studio transcription services.

## Features

- **Format Normalization**: Convert any audio format to standard 16kHz mono PCM
- **Audio Chunking**: Split long audio files into manageable chunks
- **Quality Analysis**: Analyze audio quality (SNR, clipping, silence)
- **Noise Reduction**: Optional noise reduction preprocessing
- **Video Extraction**: Extract audio from video files using FFmpeg
- **Format Support**: WAV, MP3, M4A, FLAC, OGG, MP4, MOV, AVI, MKV, WEBM

## Installation

```bash
pip install -e .
```

## Usage

```python
from audio_processing import AudioProcessor, AudioConfig

# Create processor with default config
processor = AudioProcessor()

# Normalize audio file
normalized = processor.normalize("input.mp3", "output.wav")

# Chunk long audio
chunks = processor.chunk("long_audio.wav", chunk_duration_seconds=30)

# Analyze quality
quality = processor.analyze_quality("audio.wav")
print(f"SNR: {quality.snr_db:.1f} dB")

# Extract from video
audio_path = processor.extract_from_video("video.mp4")
```
