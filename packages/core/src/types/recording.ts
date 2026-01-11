/**
 * Recording and media types
 */

import type { UUID, Timestamp, Status, Duration } from './common';
import type { CustomFieldValue, TranscriptionModel } from './project';

export interface Recording {
  id: UUID;
  projectId: UUID;
  folderId?: UUID;
  name: string;
  description?: string;
  source: RecordingSource;
  mediaInfo: MediaInfo;
  transcriptionStatus: TranscriptionStatus;
  transcriptId?: UUID;
  metadata: RecordingMetadata;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type RecordingSource =
  | { type: 'upload'; filename: string }
  | { type: 'live'; deviceId: string }
  | { type: 'meeting-bot'; platform: MeetingPlatform; meetingId: string };

export type MeetingPlatform = 'zoom' | 'teams' | 'meet';

export interface MediaInfo {
  type: MediaType;
  format: string;
  codec?: string;
  duration: Duration;
  size: number; // bytes
  sampleRate?: number;
  channels?: number;
  bitrate?: number;
  resolution?: { width: number; height: number };
  storagePath: string;
}

export type MediaType = 'audio' | 'video';

export interface TranscriptionStatus {
  status: Status;
  progress: number; // 0-100
  model: TranscriptionModel;
  language?: string;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  error?: TranscriptionError;
}

export interface TranscriptionError {
  code: string;
  message: string;
  retryable: boolean;
}

export interface RecordingMetadata {
  customFields: CustomFieldValue[];
  tags: string[];
  notes?: string;
}

export interface RecordingTemplate {
  id: UUID;
  name: string;
  description?: string;
  defaultModel: TranscriptionModel;
  defaultLanguage: string;
  customFields: CustomFieldValue[];
  tags: string[];
  isDefault: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface RecordingUploadRequest {
  projectId: UUID;
  folderId?: UUID;
  name: string;
  file: File | Blob;
  templateId?: UUID;
  metadata?: Partial<RecordingMetadata>;
}

export interface LiveRecordingSession {
  id: UUID;
  recordingId: UUID;
  deviceId: string;
  status: 'recording' | 'paused' | 'stopped';
  startedAt: Timestamp;
  pausedAt?: Timestamp;
  duration: Duration;
  realTimeTranscription: boolean;
}

export interface RecordingJob {
  id: UUID;
  recordingId: UUID;
  type: 'transcription' | 'diarization' | 'analysis';
  status: Status;
  priority: number;
  progress: number;
  createdAt: Timestamp;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  error?: string;
}
