"""Prosodic feature extraction using Praat/Parselmouth and librosa."""

import logging
from pathlib import Path

import librosa
import numpy as np
import parselmouth
from parselmouth.praat import call

from src.config import settings
from src.schemas import PauseInfo, ProsodyResult

logger = logging.getLogger(__name__)


class ProsodyAnalyzer:
    """Extracts prosodic features from audio."""

    def __init__(self):
        self.sample_rate = settings.sample_rate
        self.pitch_floor = settings.pitch_floor_hz
        self.pitch_ceiling = settings.pitch_ceiling_hz
        self.pause_threshold_db = settings.pause_threshold_db
        self.min_pause_duration = settings.min_pause_duration

    def analyze(
        self,
        audio_path: str | Path,
        start_time: float | None = None,
        end_time: float | None = None,
    ) -> ProsodyResult:
        """Analyze prosodic features of audio.

        Args:
            audio_path: Path to audio file
            start_time: Optional start time in seconds
            end_time: Optional end time in seconds

        Returns:
            ProsodyResult with prosodic features
        """
        audio_path = Path(audio_path)
        if not audio_path.exists():
            raise FileNotFoundError(f"Audio file not found: {audio_path}")

        # Load audio with librosa
        audio, sr = librosa.load(
            str(audio_path),
            sr=self.sample_rate,
            offset=start_time or 0,
            duration=(end_time - start_time) if start_time and end_time else None,
        )

        duration = len(audio) / sr

        # Load with Parselmouth for pitch analysis
        sound = parselmouth.Sound(str(audio_path))
        if start_time is not None or end_time is not None:
            sound = sound.extract_part(
                from_time=start_time or 0,
                to_time=end_time or sound.get_total_duration(),
            )

        # Extract features
        pitch_result = self._extract_pitch(sound)
        volume_result = self._extract_volume(audio, sr)
        pauses = self._detect_pauses(audio, sr)
        speech_rate = self._estimate_speech_rate(audio, sr)

        # Calculate speaking duration
        total_pause = sum(p.duration for p in pauses)
        speaking_duration = max(0, duration - total_pause)

        return ProsodyResult(
            pitch_mean_hz=pitch_result["mean"],
            pitch_std_hz=pitch_result["std"],
            pitch_min_hz=pitch_result["min"],
            pitch_max_hz=pitch_result["max"],
            pitch_contour=pitch_result["contour"],
            speech_rate_syllables_per_sec=speech_rate,
            volume_mean_db=volume_result["mean"],
            volume_std_db=volume_result["std"],
            volume_min_db=volume_result["min"],
            volume_max_db=volume_result["max"],
            pauses=pauses,
            total_pause_duration=total_pause,
            speaking_duration=speaking_duration,
        )

    def _extract_pitch(self, sound: parselmouth.Sound) -> dict:
        """Extract pitch (F0) features using Praat."""
        try:
            pitch = call(
                sound,
                "To Pitch",
                0.0,  # Time step (0 = auto)
                self.pitch_floor,
                self.pitch_ceiling,
            )

            # Get pitch values
            pitch_values = pitch.selected_array["frequency"]
            pitch_times = pitch.xs()

            # Filter out unvoiced frames (0 Hz)
            voiced_mask = pitch_values > 0
            voiced_pitches = pitch_values[voiced_mask]

            # Build pitch contour (time, pitch pairs)
            contour = [
                [float(t), float(p)]
                for t, p in zip(pitch_times, pitch_values)
                if p > 0
            ]

            if len(voiced_pitches) == 0:
                return {
                    "mean": None,
                    "std": None,
                    "min": None,
                    "max": None,
                    "contour": [],
                }

            return {
                "mean": float(np.mean(voiced_pitches)),
                "std": float(np.std(voiced_pitches)),
                "min": float(np.min(voiced_pitches)),
                "max": float(np.max(voiced_pitches)),
                "contour": contour,
            }
        except Exception as e:
            logger.warning(f"Pitch extraction failed: {e}")
            return {
                "mean": None,
                "std": None,
                "min": None,
                "max": None,
                "contour": [],
            }

    def _extract_volume(self, audio: np.ndarray, sr: int) -> dict:
        """Extract volume/intensity features."""
        # Calculate RMS energy in frames
        frame_length = int(0.025 * sr)  # 25ms frames
        hop_length = int(0.010 * sr)  # 10ms hop

        rms = librosa.feature.rms(
            y=audio,
            frame_length=frame_length,
            hop_length=hop_length,
        )[0]

        # Convert to dB
        rms_db = librosa.amplitude_to_db(rms, ref=1.0)

        # Filter out very quiet frames for statistics
        active_mask = rms_db > -60
        active_db = rms_db[active_mask] if np.any(active_mask) else rms_db

        return {
            "mean": float(np.mean(active_db)),
            "std": float(np.std(active_db)),
            "min": float(np.min(rms_db)),
            "max": float(np.max(rms_db)),
        }

    def _detect_pauses(self, audio: np.ndarray, sr: int) -> list[PauseInfo]:
        """Detect pauses in audio based on energy threshold."""
        frame_length = int(0.025 * sr)
        hop_length = int(0.010 * sr)

        # Calculate RMS energy
        rms = librosa.feature.rms(
            y=audio,
            frame_length=frame_length,
            hop_length=hop_length,
        )[0]

        rms_db = librosa.amplitude_to_db(rms, ref=1.0)

        # Find frames below threshold
        is_pause = rms_db < self.pause_threshold_db

        # Convert frame indices to time
        frame_times = librosa.frames_to_time(
            np.arange(len(rms_db)),
            sr=sr,
            hop_length=hop_length,
        )

        # Find pause boundaries
        pauses = []
        in_pause = False
        pause_start = 0.0

        for i, (t, p) in enumerate(zip(frame_times, is_pause)):
            if p and not in_pause:
                # Pause starts
                in_pause = True
                pause_start = t
            elif not p and in_pause:
                # Pause ends
                in_pause = False
                pause_duration = t - pause_start
                if pause_duration >= self.min_pause_duration:
                    pauses.append(PauseInfo(
                        start=pause_start,
                        end=t,
                        duration=pause_duration,
                    ))

        # Handle pause at end
        if in_pause:
            pause_duration = frame_times[-1] - pause_start
            if pause_duration >= self.min_pause_duration:
                pauses.append(PauseInfo(
                    start=pause_start,
                    end=frame_times[-1],
                    duration=pause_duration,
                ))

        return pauses

    def _estimate_speech_rate(self, audio: np.ndarray, sr: int) -> float | None:
        """Estimate speech rate in syllables per second.

        Uses onset detection as a proxy for syllable nuclei.
        """
        try:
            # Detect onsets (approximates syllable nuclei)
            onset_env = librosa.onset.onset_strength(y=audio, sr=sr)
            onsets = librosa.onset.onset_detect(
                onset_envelope=onset_env,
                sr=sr,
                units="time",
            )

            duration = len(audio) / sr

            if duration <= 0:
                return None

            # Syllables per second
            # This is a rough estimate - true syllable detection requires more
            # sophisticated analysis
            syllable_count = len(onsets)
            return syllable_count / duration if duration > 0 else None

        except Exception as e:
            logger.warning(f"Speech rate estimation failed: {e}")
            return None
