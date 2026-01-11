/**
 * Application configuration types
 */

import type { DeploymentMode, FeatureFlags } from './auth';
import type { TranscriptionModel } from './project';

export interface AppConfig {
  mode: DeploymentMode;
  apiUrl?: string;
  licenseServerUrl: string;
  features: FeatureFlags;
  version: string;
}

export interface UserPreferences {
  theme: Theme;
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  transcription: TranscriptionPreferences;
  editor: EditorPreferences;
  notifications: NotificationPreferences;
  keyboard: KeyboardShortcuts;
}

export type Theme = 'light' | 'dark' | 'system';

export interface TranscriptionPreferences {
  defaultModel: TranscriptionModel;
  defaultLanguage: string;
  autoDetectLanguage: boolean;
  enableDiarization: boolean;
  enableInflectionAnalysis: boolean;
  showConfidenceScores: boolean;
  autoSave: boolean;
  autoSaveInterval: number; // seconds
}

export interface EditorPreferences {
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  showTimestamps: boolean;
  timestampFormat: string;
  showSpeakerColors: boolean;
  highlightLowConfidence: boolean;
  lowConfidenceThreshold: number;
}

export interface NotificationPreferences {
  transcriptionComplete: boolean;
  transcriptionFailed: boolean;
  exportComplete: boolean;
  collaboratorJoined: boolean;
  mentionedInComment: boolean;
  soundEnabled: boolean;
}

export interface KeyboardShortcuts {
  playPause: string;
  seekBack: string;
  seekForward: string;
  insertTimestamp: string;
  nextSegment: string;
  previousSegment: string;
  markSpeaker: string;
  save: string;
  export: string;
}

export interface ModelConfig {
  whisperModels: WhisperModelConfig[];
  diarizationModels: DiarizationModelConfig[];
  emotionModels: EmotionModelConfig[];
  ollamaModels: string[];
}

export interface WhisperModelConfig {
  id: TranscriptionModel;
  name: string;
  size: number; // bytes
  languages: string[];
  supportsRealtime: boolean;
  requiresGpu: boolean;
  memoryRequired: number; // bytes
}

export interface DiarizationModelConfig {
  id: string;
  name: string;
  size: number;
  maxSpeakers: number;
}

export interface EmotionModelConfig {
  id: string;
  name: string;
  size: number;
  emotions: string[];
}

export interface StorageConfig {
  type: 'local' | 's3';
  basePath: string;
  s3Config?: S3Config;
  encryptionEnabled: boolean;
  maxFileSize: number; // bytes
  allowedFormats: string[];
}

export interface S3Config {
  bucket: string;
  region: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export interface DockerServiceConfig {
  whisperService: ServiceConfig;
  whisperLive: ServiceConfig;
  diarization: ServiceConfig;
  ollama: ServiceConfig;
}

export interface ServiceConfig {
  enabled: boolean;
  image: string;
  tag: string;
  ports: number[];
  gpuEnabled: boolean;
  memoryLimit: string;
  cpuLimit: string;
  environment: Record<string, string>;
}
