"""Emotion detection using Wav2Vec2 and prosodic heuristics."""

import logging
from pathlib import Path

import librosa
import numpy as np
import torch
from transformers import AutoModelForAudioClassification, AutoFeatureExtractor

from src.config import settings
from src.schemas import EmotionDistribution, EmotionResult

logger = logging.getLogger(__name__)

# Standard emotion labels used across models
EMOTION_LABELS = ["angry", "fearful", "happy", "neutral", "sad", "surprised"]


class EmotionAnalyzer:
    """Analyzes emotions in audio using ML and prosodic heuristics."""

    def __init__(self):
        self.model = None
        self.feature_extractor = None
        self.device = settings.compute_device
        self.min_confidence = settings.min_confidence
        self.sample_rate = settings.sample_rate
        self._model_labels: list[str] = []

    def load_model(self) -> None:
        """Load the emotion detection model."""
        if self.model is not None:
            return

        logger.info(f"Loading emotion model: {settings.model_name}")
        logger.info(f"Using device: {self.device}")

        try:
            self.feature_extractor = AutoFeatureExtractor.from_pretrained(
                settings.model_name,
                cache_dir=settings.model_cache_dir,
            )
            self.model = AutoModelForAudioClassification.from_pretrained(
                settings.model_name,
                cache_dir=settings.model_cache_dir,
            )
            self.model.to(self.device)
            # Set model to inference mode (not training)
            self.model.train(False)

            # Get model's emotion labels
            if hasattr(self.model.config, "id2label"):
                self._model_labels = [
                    self.model.config.id2label[i]
                    for i in range(len(self.model.config.id2label))
                ]
            else:
                self._model_labels = EMOTION_LABELS

            logger.info(f"Model loaded with labels: {self._model_labels}")

        except Exception as e:
            logger.error(f"Failed to load emotion model: {e}")
            raise

    def is_loaded(self) -> bool:
        """Check if model is loaded."""
        return self.model is not None

    def analyze(
        self,
        audio_path: str | Path,
        start_time: float | None = None,
        end_time: float | None = None,
        prosody_features: dict | None = None,
    ) -> EmotionResult:
        """Analyze emotions in audio.

        Args:
            audio_path: Path to audio file
            start_time: Optional start time in seconds
            end_time: Optional end time in seconds
            prosody_features: Optional prosodic features for fallback

        Returns:
            EmotionResult with detected emotions
        """
        audio_path = Path(audio_path)
        if not audio_path.exists():
            raise FileNotFoundError(f"Audio file not found: {audio_path}")

        # Try ML-based detection first
        if self.model is not None:
            try:
                result = self._analyze_ml(audio_path, start_time, end_time)
                if result.confidence >= self.min_confidence:
                    return result
                logger.info(
                    f"ML confidence {result.confidence:.2f} below threshold, "
                    f"falling back to prosodic heuristics"
                )
            except Exception as e:
                logger.warning(f"ML analysis failed: {e}, using prosodic fallback")

        # Fallback to prosodic heuristics
        return self._analyze_prosodic(audio_path, start_time, end_time, prosody_features)

    def _analyze_ml(
        self,
        audio_path: Path,
        start_time: float | None,
        end_time: float | None,
    ) -> EmotionResult:
        """Analyze emotions using ML model."""
        # Load audio
        audio, sr = librosa.load(
            str(audio_path),
            sr=self.sample_rate,
            offset=start_time or 0,
            duration=(end_time - start_time) if start_time and end_time else None,
        )

        # Extract features
        inputs = self.feature_extractor(
            audio,
            sampling_rate=self.sample_rate,
            return_tensors="pt",
            padding=True,
        )

        # Move to device
        inputs = {k: v.to(self.device) for k, v in inputs.items()}

        # Run inference
        with torch.no_grad():
            outputs = self.model(**inputs)
            probs = torch.nn.functional.softmax(outputs.logits, dim=-1)
            probs = probs.cpu().numpy()[0]

        # Map to standard labels
        distribution = self._map_to_standard_distribution(probs)

        # Find primary emotion
        primary = max(distribution, key=lambda k: getattr(distribution, k))
        confidence = getattr(distribution, primary)

        return EmotionResult(
            primary=primary,
            confidence=confidence,
            distribution=distribution,
            source="ml",
        )

    def _map_to_standard_distribution(
        self,
        probs: np.ndarray,
    ) -> EmotionDistribution:
        """Map model output to standard emotion distribution."""
        # Create mapping from model labels to standard labels
        distribution = {label: 0.0 for label in EMOTION_LABELS}

        for i, prob in enumerate(probs):
            if i < len(self._model_labels):
                model_label = self._model_labels[i].lower()

                # Map common variations
                label_mapping = {
                    "ang": "angry",
                    "anger": "angry",
                    "fear": "fearful",
                    "hap": "happy",
                    "happiness": "happy",
                    "joy": "happy",
                    "neu": "neutral",
                    "calm": "neutral",
                    "sad": "sad",
                    "sadness": "sad",
                    "sur": "surprised",
                    "surprise": "surprised",
                    "disgust": "angry",  # Map disgust to angry as fallback
                }

                # Find matching standard label
                matched = False
                for key, standard in label_mapping.items():
                    if key in model_label:
                        distribution[standard] += float(prob)
                        matched = True
                        break

                # Direct match
                if not matched and model_label in distribution:
                    distribution[model_label] += float(prob)

        # Normalize to sum to 1
        total = sum(distribution.values())
        if total > 0:
            distribution = {k: v / total for k, v in distribution.items()}

        return EmotionDistribution(**distribution)

    def _analyze_prosodic(
        self,
        audio_path: Path,
        start_time: float | None,
        end_time: float | None,
        prosody_features: dict | None,
    ) -> EmotionResult:
        """Analyze emotions using prosodic heuristics.

        This is a simplified rule-based approach that uses pitch and energy
        patterns to estimate emotional state.
        """
        # Load audio if prosody features not provided
        if prosody_features is None:
            from src.prosody import ProsodyAnalyzer
            analyzer = ProsodyAnalyzer()
            result = analyzer.analyze(audio_path, start_time, end_time)
            prosody_features = {
                "pitch_mean": result.pitch_mean_hz,
                "pitch_std": result.pitch_std_hz,
                "volume_mean": result.volume_mean_db,
                "volume_std": result.volume_std_db,
                "speech_rate": result.speech_rate_syllables_per_sec,
            }

        # Default distribution
        distribution = {
            "angry": 0.1,
            "fearful": 0.1,
            "happy": 0.1,
            "neutral": 0.4,
            "sad": 0.1,
            "surprised": 0.2,
        }

        pitch_mean = prosody_features.get("pitch_mean")
        pitch_std = prosody_features.get("pitch_std")
        volume_mean = prosody_features.get("volume_mean")
        speech_rate = prosody_features.get("speech_rate")

        # Apply heuristic rules
        if pitch_mean is not None and volume_mean is not None:
            # High pitch + high volume + fast speech = angry or excited
            if pitch_mean > 200 and volume_mean > -15:
                if speech_rate and speech_rate > 5:
                    distribution["angry"] = 0.4
                    distribution["happy"] = 0.3
                else:
                    distribution["surprised"] = 0.4

            # Low pitch + low volume + slow speech = sad
            elif pitch_mean < 150 and volume_mean < -25:
                distribution["sad"] = 0.5
                distribution["neutral"] = 0.3

            # High pitch variation = emotional (happy or fearful)
            elif pitch_std and pitch_std > 40:
                distribution["happy"] = 0.35
                distribution["fearful"] = 0.25

            # Stable pitch + moderate volume = neutral
            elif pitch_std and pitch_std < 20:
                distribution["neutral"] = 0.6

        # Normalize
        total = sum(distribution.values())
        distribution = {k: v / total for k, v in distribution.items()}

        # Find primary emotion
        primary = max(distribution, key=distribution.get)
        confidence = distribution[primary]

        return EmotionResult(
            primary=primary,
            confidence=confidence,
            distribution=EmotionDistribution(**distribution),
            source="prosodic",
        )
