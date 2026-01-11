"""Main audio processor."""

import logging
import os
import subprocess
import tempfile
import uuid
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import soundfile as sf

from audio_processing.config import AudioConfig
from audio_processing.formats import (
    AudioInfo,
    SUPPORTED_AUDIO_FORMATS,
    get_audio_info,
    is_supported_format,
    is_video_format,
)
from audio_processing.quality import AudioQuality, analyze_quality

logger = logging.getLogger(__name__)


@dataclass
class AudioChunk:
    """A chunk of audio data."""

    index: int
    start_seconds: float
    end_seconds: float
    path: str
    duration_seconds: float


class AudioProcessor:
    """Audio processing pipeline."""

    def __init__(self, config: AudioConfig | None = None):
        self.config = config or AudioConfig()
        self._temp_files: list[Path] = []

    def __del__(self):
        """Clean up temporary files."""
        if self.config.cleanup_temp_files:
            self._cleanup_temp_files()

    def _cleanup_temp_files(self) -> None:
        """Remove temporary files."""
        for path in self._temp_files:
            try:
                if path.exists():
                    path.unlink()
            except Exception as e:
                logger.warning(f"Failed to delete temp file {path}: {e}")
        self._temp_files.clear()

    def _get_temp_path(self, suffix: str = ".wav") -> Path:
        """Get a temporary file path."""
        temp_dir = self.config.temp_dir or tempfile.gettempdir()
        path = Path(temp_dir) / f"audio_{uuid.uuid4().hex}{suffix}"
        self._temp_files.append(path)
        return path

    def normalize(
        self,
        input_path: str | Path,
        output_path: str | Path | None = None,
    ) -> Path:
        """Normalize audio to standard format (16kHz mono PCM WAV).

        Args:
            input_path: Path to input audio/video file
            output_path: Optional output path (temp file if not provided)

        Returns:
            Path to normalized audio file
        """
        input_path = Path(input_path)
        if not input_path.exists():
            raise FileNotFoundError(f"File not found: {input_path}")

        if not is_supported_format(input_path):
            raise ValueError(f"Unsupported format: {input_path.suffix}")

        # Determine output path
        if output_path:
            output_path = Path(output_path)
        else:
            output_path = self._get_temp_path(".wav")

        # Use FFmpeg for conversion
        ffmpeg = self.config.ffmpeg_path or "ffmpeg"

        cmd = [
            ffmpeg,
            "-y",  # Overwrite output
            "-i", str(input_path),
            "-ar", str(self.config.target_sample_rate),
            "-ac", str(self.config.target_channels),
            "-sample_fmt", f"s{self.config.target_bit_depth}",
            "-acodec", "pcm_s16le",
            str(output_path),
        ]

        try:
            subprocess.run(
                cmd,
                capture_output=True,
                check=True,
            )
        except subprocess.CalledProcessError as e:
            raise RuntimeError(f"FFmpeg conversion failed: {e.stderr.decode()}") from e
        except FileNotFoundError:
            raise RuntimeError("FFmpeg not found. Please install FFmpeg.")

        logger.info(f"Normalized {input_path.name} to {output_path}")
        return output_path

    def extract_from_video(
        self,
        video_path: str | Path,
        output_path: str | Path | None = None,
    ) -> Path:
        """Extract and normalize audio from a video file.

        Args:
            video_path: Path to video file
            output_path: Optional output path

        Returns:
            Path to extracted audio file
        """
        video_path = Path(video_path)
        if not video_path.exists():
            raise FileNotFoundError(f"File not found: {video_path}")

        if not is_video_format(video_path):
            raise ValueError(f"Not a video format: {video_path.suffix}")

        return self.normalize(video_path, output_path)

    def chunk(
        self,
        input_path: str | Path,
        chunk_duration_seconds: float | None = None,
        overlap_seconds: float | None = None,
    ) -> list[AudioChunk]:
        """Split audio into chunks.

        Args:
            input_path: Path to audio file
            chunk_duration_seconds: Duration of each chunk
            overlap_seconds: Overlap between chunks

        Returns:
            List of AudioChunk objects
        """
        input_path = Path(input_path)
        if not input_path.exists():
            raise FileNotFoundError(f"File not found: {input_path}")

        chunk_duration = chunk_duration_seconds or self.config.chunk_duration_seconds
        overlap = overlap_seconds or self.config.chunk_overlap_seconds

        # Load audio
        audio, sample_rate = sf.read(str(input_path), dtype="float32")

        # Ensure mono
        if audio.ndim > 1:
            audio = np.mean(audio, axis=1)

        total_duration = len(audio) / sample_rate
        chunk_samples = int(chunk_duration * sample_rate)
        overlap_samples = int(overlap * sample_rate)
        step_samples = chunk_samples - overlap_samples

        chunks: list[AudioChunk] = []
        position = 0
        index = 0

        while position < len(audio):
            end_position = min(position + chunk_samples, len(audio))
            chunk_audio = audio[position:end_position]

            # Save chunk to temp file
            chunk_path = self._get_temp_path(f"_chunk{index:04d}.wav")
            sf.write(str(chunk_path), chunk_audio, sample_rate)

            start_seconds = position / sample_rate
            end_seconds = end_position / sample_rate

            chunks.append(AudioChunk(
                index=index,
                start_seconds=start_seconds,
                end_seconds=end_seconds,
                path=str(chunk_path),
                duration_seconds=end_seconds - start_seconds,
            ))

            position += step_samples
            index += 1

            # Break if we've processed all audio
            if end_position >= len(audio):
                break

        logger.info(f"Split {input_path.name} into {len(chunks)} chunks")
        return chunks

    def analyze_quality(self, path: str | Path) -> AudioQuality:
        """Analyze audio quality.

        Args:
            path: Path to audio file

        Returns:
            AudioQuality analysis results
        """
        return analyze_quality(path)

    def get_info(self, path: str | Path) -> AudioInfo:
        """Get audio file information.

        Args:
            path: Path to audio/video file

        Returns:
            AudioInfo with file details
        """
        return get_audio_info(path)

    def reduce_noise(
        self,
        input_path: str | Path,
        output_path: str | Path | None = None,
        strength: float | None = None,
    ) -> Path:
        """Apply noise reduction to audio.

        Args:
            input_path: Path to input audio file
            output_path: Optional output path
            strength: Noise reduction strength (0-2, default 1.0)

        Returns:
            Path to processed audio file
        """
        import noisereduce as nr

        input_path = Path(input_path)
        if not input_path.exists():
            raise FileNotFoundError(f"File not found: {input_path}")

        if output_path:
            output_path = Path(output_path)
        else:
            output_path = self._get_temp_path("_denoised.wav")

        strength = strength or self.config.noise_reduce_strength

        # Load audio
        audio, sample_rate = sf.read(str(input_path), dtype="float32")

        # Apply noise reduction
        reduced = nr.reduce_noise(
            y=audio,
            sr=sample_rate,
            prop_decrease=min(strength, 1.0),
            stationary=True,
        )

        # Save
        sf.write(str(output_path), reduced, sample_rate)

        logger.info(f"Applied noise reduction to {input_path.name}")
        return output_path

    def load_audio(
        self,
        path: str | Path,
        normalize: bool = True,
    ) -> tuple[np.ndarray, int]:
        """Load audio as numpy array.

        Args:
            path: Path to audio file
            normalize: Whether to normalize to target format first

        Returns:
            Tuple of (audio array, sample rate)
        """
        path = Path(path)

        if normalize and (
            is_video_format(path) or
            path.suffix.lower() not in {".wav"}
        ):
            path = self.normalize(path)

        audio, sample_rate = sf.read(str(path), dtype="float32")
        return audio, sample_rate
