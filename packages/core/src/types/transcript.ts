/**
 * Transcript and segment types
 */

import type { UUID, Timestamp, Duration } from './common';
import type { SpeakerId, SpeakerProfile } from './speaker';
import type { InflectionData } from './ai';

export interface Transcript {
  id: UUID;
  recordingId: UUID;
  language: string;
  segments: TranscriptSegment[];
  speakers: SpeakerProfile[];
  metadata: TranscriptMetadata;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TranscriptSegment {
  id: UUID;
  index: number;
  speakerId: SpeakerId;
  text: string;
  startTime: Duration;
  endTime: Duration;
  confidence: number;
  words: WordTimestamp[];
  inflection?: InflectionData;
  isEdited: boolean;
  editHistory?: SegmentEdit[];
}

export interface WordTimestamp {
  word: string;
  startTime: Duration;
  endTime: Duration;
  confidence: number;
}

export interface SegmentEdit {
  timestamp: Timestamp;
  userId?: UUID;
  previousText: string;
  newText: string;
}

export interface TranscriptMetadata {
  model: string;
  modelVersion: string;
  processingTime: Duration;
  wordCount: number;
  characterCount: number;
  averageConfidence: number;
  languageConfidence: number;
}

export interface TranscriptExport {
  format: ExportFormat;
  includeSpeakerLabels: boolean;
  includeTimestamps: boolean;
  includeConfidence: boolean;
  includeInflection: boolean;
  timestampFormat: TimestampFormat;
}

export type ExportFormat = 'txt' | 'json' | 'srt' | 'vtt' | 'docx' | 'pdf';

export type TimestampFormat = 'hh:mm:ss' | 'hh:mm:ss,ms' | 'seconds' | 'milliseconds';

export interface TranscriptSearch {
  query: string;
  projectIds?: UUID[];
  speakerIds?: SpeakerId[];
  dateRange?: { start: Timestamp; end: Timestamp };
  useSemanticSearch: boolean;
}

export interface TranscriptSearchResult {
  transcriptId: UUID;
  recordingId: UUID;
  projectId: UUID;
  segmentId: UUID;
  text: string;
  matchedText: string;
  startTime: Duration;
  score: number;
}

export interface TranscriptAnnotation {
  id: UUID;
  transcriptId: UUID;
  segmentId?: UUID;
  type: AnnotationType;
  startTime: Duration;
  endTime: Duration;
  content: string;
  color?: string;
  createdBy: UUID;
  createdAt: Timestamp;
}

export type AnnotationType = 'highlight' | 'comment' | 'bookmark' | 'action-item';
