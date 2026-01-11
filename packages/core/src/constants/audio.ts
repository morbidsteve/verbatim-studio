/**
 * Audio-related constants
 */

export const SUPPORTED_AUDIO_FORMATS = [
  'wav',
  'mp3',
  'm4a',
  'flac',
  'ogg',
  'wma',
  'aac',
] as const;

export const SUPPORTED_VIDEO_FORMATS = [
  'mp4',
  'mov',
  'avi',
  'mkv',
  'webm',
  'wmv',
  'flv',
] as const;

export const SUPPORTED_MEDIA_FORMATS = [
  ...SUPPORTED_AUDIO_FORMATS,
  ...SUPPORTED_VIDEO_FORMATS,
] as const;

export const EXPORT_FORMATS = ['txt', 'json', 'srt', 'vtt', 'docx', 'pdf'] as const;

export const DEFAULT_SAMPLE_RATE = 16000;

export const DEFAULT_CHANNELS = 1;

export const AUDIO_CHUNK_SIZE = 1024 * 1024 * 5; // 5MB chunks for upload

export const MAX_REAL_TIME_LATENCY_MS = 500;

export const VOICE_ACTIVITY_THRESHOLD = 0.5;

export const SPEAKER_COLORS = [
  '#3B82F6', // blue-500
  '#10B981', // emerald-500
  '#F59E0B', // amber-500
  '#EF4444', // red-500
  '#8B5CF6', // violet-500
  '#EC4899', // pink-500
  '#06B6D4', // cyan-500
  '#F97316', // orange-500
  '#84CC16', // lime-500
  '#6366F1', // indigo-500
] as const;
