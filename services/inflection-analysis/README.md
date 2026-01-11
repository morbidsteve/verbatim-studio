# Inflection Analysis Service

Voice inflection and emotion analysis service for Verbatim Studio.

## Features

### Prosodic Analysis
- **Pitch (F0) extraction**: Fundamental frequency tracking using Praat/Parselmouth
- **Speech rate analysis**: Syllables per second estimation
- **Volume/intensity tracking**: RMS energy in dB
- **Pause detection**: Identify and measure pauses in speech
- **Pitch contour**: Time-series pitch data for visualization

### Emotion Detection
- **ML-based classification**: Uses Wav2Vec2 fine-tuned for emotion recognition
- **Emotion categories**: Happy, sad, angry, neutral, fearful, surprised
- **Confidence scores**: Probability distribution across emotions
- **Prosodic fallback**: Heuristic-based emotion estimation when ML confidence is low

## API Endpoints

### `POST /analyze`
Analyze a complete audio file for prosodic features and emotions.

### `POST /analyze/segment`
Analyze a specific time segment of audio.

### `POST /analyze/batch`
Analyze multiple segments in batch for efficiency.

### `GET /health`
Health check endpoint.

## Configuration

Environment variables:
- `MODEL_NAME`: Emotion detection model (default: `ehcalabres/wav2vec2-lg-xlsr-en-speech-emotion-recognition`)
- `DEVICE`: Compute device - `cuda`, `cpu`, or `auto` (default: `auto`)
- `HOST`: Server host (default: `0.0.0.0`)
- `PORT`: Server port (default: `8004`)
- `MIN_CONFIDENCE`: Minimum confidence for ML predictions (default: `0.5`)

## Running

```bash
# Development
cd services/inflection-analysis
uv venv
source .venv/bin/activate
uv pip install -e ".[dev]"
uvicorn src.main:app --reload --port 8004

# Docker
docker build -t inflection-analysis .
docker run -p 8004:8004 inflection-analysis
```

## Output Schema

```json
{
  "prosody": {
    "pitch_mean_hz": 150.5,
    "pitch_std_hz": 25.3,
    "pitch_min_hz": 85.0,
    "pitch_max_hz": 220.0,
    "pitch_contour": [[0.0, 145.2], [0.01, 148.5], ...],
    "speech_rate_syllables_per_sec": 4.2,
    "volume_mean_db": -18.5,
    "volume_std_db": 6.2,
    "pauses": [
      {"start": 1.5, "end": 2.1, "duration": 0.6}
    ],
    "total_pause_duration": 2.3,
    "speaking_duration": 8.7
  },
  "emotion": {
    "primary": "neutral",
    "confidence": 0.78,
    "distribution": {
      "happy": 0.05,
      "sad": 0.08,
      "angry": 0.02,
      "neutral": 0.78,
      "fearful": 0.04,
      "surprised": 0.03
    },
    "source": "ml"
  },
  "segment": {
    "start": 0.0,
    "end": 11.0,
    "duration": 11.0
  }
}
```
