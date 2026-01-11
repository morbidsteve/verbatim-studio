/**
 * Model configuration constants
 */

import type { WhisperModelConfig, DiarizationModelConfig, EmotionModelConfig } from '../types/config';

export const WHISPER_MODELS: WhisperModelConfig[] = [
  {
    id: 'whisper-tiny',
    name: 'Tiny',
    size: 75_000_000, // ~75MB
    languages: ['en'],
    supportsRealtime: true,
    requiresGpu: false,
    memoryRequired: 1_000_000_000, // ~1GB
  },
  {
    id: 'whisper-base',
    name: 'Base',
    size: 142_000_000, // ~142MB
    languages: ['en', 'multilingual'],
    supportsRealtime: true,
    requiresGpu: false,
    memoryRequired: 1_500_000_000, // ~1.5GB
  },
  {
    id: 'whisper-small',
    name: 'Small',
    size: 466_000_000, // ~466MB
    languages: ['en', 'multilingual'],
    supportsRealtime: true,
    requiresGpu: true,
    memoryRequired: 2_500_000_000, // ~2.5GB
  },
  {
    id: 'whisper-medium',
    name: 'Medium',
    size: 1_500_000_000, // ~1.5GB
    languages: ['en', 'multilingual'],
    supportsRealtime: false,
    requiresGpu: true,
    memoryRequired: 5_000_000_000, // ~5GB
  },
  {
    id: 'whisper-large-v3',
    name: 'Large v3',
    size: 3_000_000_000, // ~3GB
    languages: ['multilingual'],
    supportsRealtime: false,
    requiresGpu: true,
    memoryRequired: 10_000_000_000, // ~10GB
  },
];

export const DEFAULT_WHISPER_MODEL = 'whisper-small';

export const DIARIZATION_MODELS: DiarizationModelConfig[] = [
  {
    id: 'pyannote-3.1',
    name: 'PyAnnote 3.1',
    size: 500_000_000,
    maxSpeakers: 20,
  },
];

export const DEFAULT_DIARIZATION_MODEL = 'pyannote-3.1';

export const EMOTION_MODELS: EmotionModelConfig[] = [
  {
    id: 'wav2vec2-emotion',
    name: 'Wav2Vec2 Emotion',
    size: 400_000_000,
    emotions: ['neutral', 'happy', 'sad', 'angry', 'fearful', 'surprised', 'disgusted'],
  },
];

export const DEFAULT_EMOTION_MODEL = 'wav2vec2-emotion';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'nl', name: 'Dutch' },
  { code: 'pl', name: 'Polish' },
  { code: 'ru', name: 'Russian' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'auto', name: 'Auto-detect' },
] as const;

export const DEFAULT_LANGUAGE = 'en';

export const DEFAULT_OLLAMA_MODELS = [
  'llama3.2',
  'mistral',
  'mixtral',
  'phi3',
  'gemma2',
] as const;

export const DEFAULT_OLLAMA_MODEL = 'llama3.2';

export const DEFAULT_EMBEDDING_MODEL = 'nomic-embed-text';
