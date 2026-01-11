"""Real-time transcription engine using faster-whisper."""

import logging
import os
from collections.abc import Generator
from typing import Any

import numpy as np
import torch

from src.config import settings
from src.schemas import FinalResult, ModelSize, PartialResult, WordTimestamp

logger = logging.getLogger(__name__)


class RealtimeTranscriber:
    """Real-time transcription engine using faster-whisper."""

    def __init__(self) -> None:
        self._model = None
        self._model_size: ModelSize | None = None
        self._device: str = self._detect_device()
        self._compute_type: str = self._get_compute_type()
        self._vad_model = None

        os.makedirs(settings.model_cache_dir, exist_ok=True)

    def _detect_device(self) -> str:
        """Detect the best available compute device."""
        if settings.device != "auto":
            return settings.device

        if torch.cuda.is_available():
            return "cuda"
        else:
            return "cpu"

    def _get_compute_type(self) -> str:
        """Get compute type based on device."""
        if settings.compute_type != "auto":
            return settings.compute_type

        if self._device == "cuda":
            return "float16"
        else:
            return "int8"

    @property
    def device(self) -> str:
        """Get current device."""
        return self._device

    @property
    def model_loaded(self) -> bool:
        """Check if model is loaded."""
        return self._model is not None

    def load_model(self, model_size: ModelSize = ModelSize.SMALL) -> None:
        """Load the faster-whisper model."""
        if self._model is not None and self._model_size == model_size:
            return

        logger.info(f"Loading model {model_size.value} on {self._device}")

        try:
            from faster_whisper import WhisperModel

            self._model = WhisperModel(
                model_size.value,
                device=self._device,
                compute_type=self._compute_type,
                download_root=settings.model_cache_dir,
            )
            self._model_size = model_size
            logger.info(f"Model {model_size.value} loaded")

        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise

    def load_vad(self) -> None:
        """Load voice activity detection model."""
        if self._vad_model is not None:
            return

        try:
            # Use Silero VAD
            self._vad_model, _ = torch.hub.load(
                repo_or_dir="snakers4/silero-vad",
                model="silero_vad",
                force_reload=False,
            )
            logger.info("VAD model loaded")
        except Exception as e:
            logger.warning(f"Failed to load VAD model: {e}")

    def detect_voice_activity(
        self,
        audio: np.ndarray,
        threshold: float = 0.5,
    ) -> list[tuple[float, float]]:
        """Detect voice activity in audio.

        Returns list of (start, end) tuples in seconds.
        """
        if self._vad_model is None:
            self.load_vad()

        if self._vad_model is None:
            # No VAD available, return entire audio
            return [(0.0, len(audio) / settings.sample_rate)]

        # Convert to torch tensor
        audio_tensor = torch.from_numpy(audio).float()

        # Get speech timestamps
        speech_timestamps = self._vad_model.get_speech_timestamps(
            audio_tensor,
            sampling_rate=settings.sample_rate,
            threshold=threshold,
        )

        # Convert to seconds
        segments = []
        for ts in speech_timestamps:
            start = ts["start"] / settings.sample_rate
            end = ts["end"] / settings.sample_rate
            segments.append((start, end))

        return segments

    def transcribe_segment(
        self,
        audio: np.ndarray,
        language: str | None = None,
        beam_size: int = 5,
    ) -> Generator[PartialResult | FinalResult, None, None]:
        """Transcribe an audio segment with streaming results.

        Yields partial results followed by final result.
        """
        if self._model is None:
            raise RuntimeError("Model not loaded")

        # Ensure audio is float32 and normalized
        if audio.dtype != np.float32:
            audio = audio.astype(np.float32)
        if audio.max() > 1.0:
            audio = audio / 32768.0

        try:
            segments, info = self._model.transcribe(
                audio,
                language=language,
                beam_size=beam_size,
                word_timestamps=True,
                vad_filter=False,  # We handle VAD ourselves
            )

            detected_language = info.language
            current_text = ""
            segment_start = 0.0
            all_words: list[WordTimestamp] = []

            for segment in segments:
                # Yield partial result as we process
                current_text += segment.text
                yield PartialResult(
                    text=current_text.strip(),
                    timestamp=segment.end,
                )

                # Collect words
                if segment.words:
                    for word in segment.words:
                        all_words.append(
                            WordTimestamp(
                                word=word.word,
                                start=word.start,
                                end=word.end,
                                probability=word.probability,
                            )
                        )

                segment_start = min(segment_start, segment.start) if segment_start else segment.start

            # Yield final result
            if current_text.strip():
                segment_end = all_words[-1].end if all_words else 0.0
                yield FinalResult(
                    text=current_text.strip(),
                    start=segment_start,
                    end=segment_end,
                    language=detected_language,
                    words=all_words,
                )

        except Exception as e:
            logger.error(f"Transcription error: {e}")
            raise


# Global instance
transcriber = RealtimeTranscriber()
