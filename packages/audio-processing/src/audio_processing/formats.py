"""Audio and video format utilities."""

import subprocess
from dataclasses import dataclass
from pathlib import Path


# Supported audio formats
SUPPORTED_AUDIO_FORMATS = {
    ".wav",
    ".mp3",
    ".m4a",
    ".aac",
    ".flac",
    ".ogg",
    ".opus",
    ".wma",
    ".aiff",
    ".aif",
}

# Supported video formats (for audio extraction)
SUPPORTED_VIDEO_FORMATS = {
    ".mp4",
    ".mov",
    ".avi",
    ".mkv",
    ".webm",
    ".wmv",
    ".flv",
    ".m4v",
    ".mpeg",
    ".mpg",
}


@dataclass
class AudioInfo:
    """Information about an audio file."""

    path: str
    format: str
    duration_seconds: float
    sample_rate: int
    channels: int
    bit_depth: int | None
    codec: str | None
    file_size_bytes: int


def is_supported_format(path: str | Path) -> bool:
    """Check if a file format is supported."""
    ext = Path(path).suffix.lower()
    return ext in SUPPORTED_AUDIO_FORMATS or ext in SUPPORTED_VIDEO_FORMATS


def is_video_format(path: str | Path) -> bool:
    """Check if a file is a video format."""
    ext = Path(path).suffix.lower()
    return ext in SUPPORTED_VIDEO_FORMATS


def get_audio_info(path: str | Path, ffprobe_path: str | None = None) -> AudioInfo:
    """Get information about an audio or video file using ffprobe."""
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"File not found: {path}")

    ffprobe = ffprobe_path or "ffprobe"

    try:
        # Get format info
        cmd = [
            ffprobe,
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            str(path),
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        import json
        data = json.loads(result.stdout)

        # Find audio stream
        audio_stream = None
        for stream in data.get("streams", []):
            if stream.get("codec_type") == "audio":
                audio_stream = stream
                break

        if not audio_stream:
            raise ValueError(f"No audio stream found in {path}")

        format_info = data.get("format", {})

        # Extract info
        duration = float(format_info.get("duration", 0))
        sample_rate = int(audio_stream.get("sample_rate", 0))
        channels = int(audio_stream.get("channels", 0))

        # Bit depth (not always available)
        bit_depth = None
        bits_per_sample = audio_stream.get("bits_per_sample")
        if bits_per_sample:
            bit_depth = int(bits_per_sample)

        return AudioInfo(
            path=str(path),
            format=path.suffix.lower(),
            duration_seconds=duration,
            sample_rate=sample_rate,
            channels=channels,
            bit_depth=bit_depth,
            codec=audio_stream.get("codec_name"),
            file_size_bytes=int(format_info.get("size", path.stat().st_size)),
        )

    except subprocess.CalledProcessError as e:
        raise RuntimeError(f"ffprobe failed: {e.stderr}") from e
    except FileNotFoundError:
        raise RuntimeError(
            "ffprobe not found. Please install FFmpeg."
        )
