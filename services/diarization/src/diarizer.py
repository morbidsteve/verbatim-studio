"""Speaker diarization engine using PyAnnote Audio."""

import logging
import os
from pathlib import Path

import torch

from src.config import settings
from src.schemas import DiarizationResult, SpeakerSegment

logger = logging.getLogger(__name__)


class DiarizationEngine:
    """PyAnnote Audio-based speaker diarization engine."""

    def __init__(self) -> None:
        self._pipeline = None
        self._device: str = self._detect_device()
        self._model_loaded = False

        # Ensure directories exist
        os.makedirs(settings.model_cache_dir, exist_ok=True)
        os.makedirs(settings.upload_dir, exist_ok=True)
        os.makedirs(settings.embeddings_dir, exist_ok=True)

    def _detect_device(self) -> str:
        """Detect the best available compute device."""
        if settings.device != "auto":
            return settings.device

        if torch.cuda.is_available():
            logger.info("CUDA available, using GPU")
            return "cuda"
        elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            logger.info("MPS available, using Apple Silicon GPU")
            return "mps"
        else:
            logger.info("No GPU available, using CPU")
            return "cpu"

    @property
    def device(self) -> str:
        """Get the current compute device."""
        return self._device

    @property
    def model_loaded(self) -> bool:
        """Check if the model is loaded."""
        return self._model_loaded

    def load_model(self) -> None:
        """Load the diarization pipeline."""
        if self._pipeline is not None:
            logger.info("Pipeline already loaded")
            return

        if not settings.hf_token:
            raise RuntimeError(
                "HuggingFace token required for PyAnnote models. "
                "Set HF_TOKEN environment variable."
            )

        logger.info(f"Loading diarization pipeline on {self._device}")

        try:
            from pyannote.audio import Pipeline

            self._pipeline = Pipeline.from_pretrained(
                "pyannote/speaker-diarization-3.1",
                use_auth_token=settings.hf_token,
                cache_dir=settings.model_cache_dir,
            )

            # Move to device
            if self._device == "cuda":
                self._pipeline.to(torch.device("cuda"))

            self._model_loaded = True
            logger.info("Diarization pipeline loaded successfully")

        except Exception as e:
            logger.error(f"Failed to load diarization pipeline: {e}")
            raise RuntimeError(f"Failed to load pipeline: {e}") from e

    def diarize(
        self,
        audio_path: str | Path,
        min_speakers: int | None = None,
        max_speakers: int | None = None,
    ) -> DiarizationResult:
        """Perform speaker diarization on an audio file."""
        if self._pipeline is None:
            self.load_model()

        audio_path = Path(audio_path)
        if not audio_path.exists():
            raise FileNotFoundError(f"Audio file not found: {audio_path}")

        logger.info(f"Diarizing {audio_path.name}")

        # Run diarization
        diarization_params = {}
        if min_speakers is not None:
            diarization_params["min_speakers"] = min_speakers
        if max_speakers is not None:
            diarization_params["max_speakers"] = max_speakers

        diarization = self._pipeline(str(audio_path), **diarization_params)

        # Convert to our schema
        segments: list[SpeakerSegment] = []
        speakers_set: set[str] = set()
        max_end = 0.0

        for turn, _, speaker in diarization.itertracks(yield_label=True):
            segment = SpeakerSegment(
                speaker=speaker,
                start=turn.start,
                end=turn.end,
            )
            segments.append(segment)
            speakers_set.add(speaker)
            max_end = max(max_end, turn.end)

        # Sort by start time
        segments.sort(key=lambda s: s.start)

        return DiarizationResult(
            num_speakers=len(speakers_set),
            segments=segments,
            duration=max_end,
            speakers=sorted(list(speakers_set)),
        )

    def get_embeddings(
        self,
        audio_path: str | Path,
    ) -> dict[str, list[float]]:
        """Extract speaker embeddings from audio."""
        if self._pipeline is None:
            self.load_model()

        audio_path = Path(audio_path)
        if not audio_path.exists():
            raise FileNotFoundError(f"Audio file not found: {audio_path}")

        logger.info(f"Extracting embeddings from {audio_path.name}")

        # First diarize to get speaker segments
        diarization = self._pipeline(str(audio_path))

        # Extract embeddings for each speaker
        embeddings: dict[str, list[float]] = {}

        # Get the embedding model from the pipeline
        if hasattr(self._pipeline, "embedding"):
            embedding_model = self._pipeline.embedding

            for turn, _, speaker in diarization.itertracks(yield_label=True):
                if speaker not in embeddings:
                    # Extract embedding for this speaker's segment
                    try:
                        import torchaudio

                        waveform, sample_rate = torchaudio.load(
                            str(audio_path),
                            frame_offset=int(turn.start * sample_rate),
                            num_frames=int((turn.end - turn.start) * sample_rate),
                        )

                        # Get embedding
                        with torch.no_grad():
                            emb = embedding_model(waveform.to(self._device))
                            embeddings[speaker] = emb.cpu().numpy().tolist()[0]

                    except Exception as e:
                        logger.warning(f"Failed to extract embedding for {speaker}: {e}")

        return embeddings


# Global engine instance
engine = DiarizationEngine()
