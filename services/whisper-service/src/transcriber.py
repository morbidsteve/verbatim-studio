"""Faster-Whisper transcription engine."""

import logging
import os
from pathlib import Path
from typing import Any

from src.config import settings
from src.schemas import (
    ModelInfo,
    ModelSize,
    TranscriptionResult,
    TranscriptSegment,
    WordTimestamp,
)

logger = logging.getLogger(__name__)


# Model metadata
MODEL_INFO: dict[ModelSize, dict[str, Any]] = {
    ModelSize.TINY: {"name": "Whisper Tiny", "size_mb": 75, "languages": 99},
    ModelSize.BASE: {"name": "Whisper Base", "size_mb": 145, "languages": 99},
    ModelSize.SMALL: {"name": "Whisper Small", "size_mb": 488, "languages": 99},
    ModelSize.MEDIUM: {"name": "Whisper Medium", "size_mb": 1500, "languages": 99},
    ModelSize.LARGE_V3: {"name": "Whisper Large V3", "size_mb": 3100, "languages": 99},
}


class TranscriptionEngine:
    """Faster-Whisper based transcription engine."""

    def __init__(self) -> None:
        self._models: dict[ModelSize, Any] = {}
        self._device: str = self._detect_device()
        self._compute_type: str = self._get_compute_type()

        # Ensure directories exist
        os.makedirs(settings.model_cache_dir, exist_ok=True)
        os.makedirs(settings.upload_dir, exist_ok=True)
        os.makedirs(settings.output_dir, exist_ok=True)

    def _detect_device(self) -> str:
        """Detect the best available compute device."""
        if settings.device != "auto":
            return settings.device

        try:
            import torch
            if torch.cuda.is_available():
                logger.info("CUDA available, using GPU")
                return "cuda"
        except ImportError:
            pass

        logger.info("Using CPU")
        return "cpu"

    def _get_compute_type(self) -> str:
        """Get the compute type based on device."""
        if settings.compute_type != "auto":
            return settings.compute_type

        if self._device == "cuda":
            return "float16"
        else:
            return "int8"  # CPU optimization

    @property
    def device(self) -> str:
        """Get the current compute device."""
        return self._device

    @property
    def compute_type(self) -> str:
        """Get the current compute type."""
        return self._compute_type

    def get_model_info(self, model_id: ModelSize) -> ModelInfo:
        """Get information about a model."""
        info = MODEL_INFO[model_id]
        return ModelInfo(
            id=model_id,
            name=info["name"],
            size_mb=info["size_mb"],
            languages=info["languages"],
            loaded=model_id in self._models,
            device=self._device if model_id in self._models else None,
        )

    def list_models(self) -> list[ModelInfo]:
        """List all available models."""
        return [self.get_model_info(model_id) for model_id in ModelSize]

    def load_model(self, model_id: ModelSize) -> ModelInfo:
        """Load a Whisper model."""
        if model_id in self._models:
            logger.info(f"Model {model_id.value} already loaded")
            return self.get_model_info(model_id)

        logger.info(f"Loading model {model_id.value} on {self._device}")

        try:
            from faster_whisper import WhisperModel

            model = WhisperModel(
                model_id.value,
                device=self._device,
                compute_type=self._compute_type,
                download_root=settings.model_cache_dir,
            )
            self._models[model_id] = model
            logger.info(f"Model {model_id.value} loaded successfully")
            return self.get_model_info(model_id)

        except Exception as e:
            logger.error(f"Failed to load model {model_id.value}: {e}")
            raise RuntimeError(f"Failed to load model: {e}") from e

    def unload_model(self, model_id: ModelSize) -> bool:
        """Unload a model from memory."""
        if model_id not in self._models:
            return False

        del self._models[model_id]
        logger.info(f"Model {model_id.value} unloaded")
        return True

    def transcribe(
        self,
        audio_path: str | Path,
        model_id: ModelSize = ModelSize.SMALL,
        language: str | None = None,
        word_timestamps: bool = True,
        batch_size: int = 16,
        beam_size: int = 5,
        initial_prompt: str | None = None,
        vad_filter: bool = True,
        vad_parameters: dict[str, Any] | None = None,
    ) -> TranscriptionResult:
        """Transcribe an audio file."""
        audio_path = Path(audio_path)
        if not audio_path.exists():
            raise FileNotFoundError(f"Audio file not found: {audio_path}")

        # Ensure model is loaded
        if model_id not in self._models:
            self.load_model(model_id)

        model = self._models[model_id]
        logger.info(f"Transcribing {audio_path.name} with model {model_id.value}")

        # Transcribe with faster-whisper
        transcribe_options: dict[str, Any] = {
            "beam_size": beam_size,
            "word_timestamps": word_timestamps,
            "vad_filter": vad_filter,
        }
        if language:
            transcribe_options["language"] = language
        if initial_prompt:
            transcribe_options["initial_prompt"] = initial_prompt
        if vad_parameters:
            transcribe_options["vad_parameters"] = vad_parameters

        segments_generator, info = model.transcribe(str(audio_path), **transcribe_options)

        # Convert generator to list and build result
        segments = []
        full_text_parts = []

        for i, seg in enumerate(segments_generator):
            words = []
            if word_timestamps and seg.words:
                for w in seg.words:
                    words.append(
                        WordTimestamp(
                            word=w.word,
                            start=w.start,
                            end=w.end,
                            confidence=w.probability,
                        )
                    )

            segment = TranscriptSegment(
                id=i,
                start=seg.start,
                end=seg.end,
                text=seg.text.strip(),
                confidence=seg.avg_logprob if hasattr(seg, 'avg_logprob') else 1.0,
                words=words,
            )
            segments.append(segment)
            full_text_parts.append(segment.text)

        # Calculate duration
        duration = segments[-1].end if segments else 0.0

        return TranscriptionResult(
            language=info.language,
            language_probability=info.language_probability,
            duration=duration,
            segments=segments,
            text=" ".join(full_text_parts),
        )


# Global engine instance
engine = TranscriptionEngine()
