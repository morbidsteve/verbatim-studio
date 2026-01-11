"""Audio quality analysis utilities."""

from dataclasses import dataclass
from pathlib import Path

import numpy as np
import soundfile as sf


@dataclass
class AudioQuality:
    """Audio quality analysis results."""

    # Signal-to-noise ratio in dB
    snr_db: float

    # Peak amplitude (0-1)
    peak_amplitude: float

    # RMS level in dB
    rms_db: float

    # Ratio of clipped samples (0-1)
    clipping_ratio: float

    # Ratio of silent samples (0-1)
    silence_ratio: float

    # Duration in seconds
    duration_seconds: float

    # Sample rate
    sample_rate: int

    # Number of channels
    channels: int

    # Quality score (0-100)
    quality_score: float

    # Issues detected
    issues: list[str]


def analyze_quality(
    path: str | Path,
    silence_threshold_db: float = -40.0,
    clipping_threshold: float = 0.99,
) -> AudioQuality:
    """Analyze the quality of an audio file.

    Args:
        path: Path to audio file
        silence_threshold_db: Threshold below which audio is considered silent
        clipping_threshold: Threshold above which samples are considered clipped

    Returns:
        AudioQuality with analysis results
    """
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"File not found: {path}")

    # Load audio
    audio, sample_rate = sf.read(str(path), dtype="float32")

    # Ensure 2D array
    if audio.ndim == 1:
        audio = audio.reshape(-1, 1)

    channels = audio.shape[1]
    duration = len(audio) / sample_rate

    # Mix to mono for analysis
    mono = np.mean(audio, axis=1)

    # Calculate metrics
    peak_amplitude = float(np.max(np.abs(mono)))
    rms = float(np.sqrt(np.mean(mono ** 2)))
    rms_db = 20 * np.log10(rms + 1e-10)

    # Calculate clipping ratio
    clipping_mask = np.abs(mono) >= clipping_threshold
    clipping_ratio = float(np.sum(clipping_mask) / len(mono))

    # Calculate silence ratio
    silence_threshold = 10 ** (silence_threshold_db / 20)
    silence_mask = np.abs(mono) < silence_threshold
    silence_ratio = float(np.sum(silence_mask) / len(mono))

    # Estimate SNR using a simple method
    # This is a rough estimate based on assuming noise is in quiet sections
    sorted_amplitudes = np.sort(np.abs(mono))
    noise_floor = np.mean(sorted_amplitudes[:len(sorted_amplitudes) // 10])  # Bottom 10%
    signal_level = np.mean(sorted_amplitudes[-len(sorted_amplitudes) // 10:])  # Top 10%

    if noise_floor > 0:
        snr_db = float(20 * np.log10(signal_level / noise_floor))
    else:
        snr_db = 60.0  # Very clean signal

    # Cap SNR at reasonable values
    snr_db = min(max(snr_db, 0.0), 60.0)

    # Identify issues
    issues: list[str] = []

    if clipping_ratio > 0.01:
        issues.append(f"Clipping detected ({clipping_ratio * 100:.1f}% of samples)")

    if silence_ratio > 0.9:
        issues.append(f"Mostly silent ({silence_ratio * 100:.1f}% silence)")

    if snr_db < 10:
        issues.append(f"Low signal-to-noise ratio ({snr_db:.1f} dB)")

    if peak_amplitude < 0.1:
        issues.append("Very low audio level")

    if rms_db < -30:
        issues.append(f"Low RMS level ({rms_db:.1f} dB)")

    # Calculate quality score (0-100)
    quality_score = 100.0

    # Penalize for issues
    if clipping_ratio > 0:
        quality_score -= min(clipping_ratio * 500, 30)

    if silence_ratio > 0.5:
        quality_score -= min((silence_ratio - 0.5) * 60, 30)

    if snr_db < 20:
        quality_score -= min((20 - snr_db) * 2, 30)

    if peak_amplitude < 0.3:
        quality_score -= min((0.3 - peak_amplitude) * 30, 15)

    quality_score = max(0.0, min(100.0, quality_score))

    return AudioQuality(
        snr_db=snr_db,
        peak_amplitude=peak_amplitude,
        rms_db=rms_db,
        clipping_ratio=clipping_ratio,
        silence_ratio=silence_ratio,
        duration_seconds=duration,
        sample_rate=sample_rate,
        channels=channels,
        quality_score=quality_score,
        issues=issues,
    )
