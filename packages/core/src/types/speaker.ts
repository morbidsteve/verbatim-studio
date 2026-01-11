/**
 * Speaker and diarization types
 */

import type { UUID, Timestamp, Duration } from './common';

export type SpeakerId = string; // Format: "speaker_0", "speaker_1", etc. or named

export interface SpeakerProfile {
  id: SpeakerId;
  name?: string;
  color: string;
  voiceprint?: VoicePrint;
  metadata?: SpeakerMetadata;
}

export interface VoicePrint {
  embedding: number[];
  model: string;
  createdAt: Timestamp;
}

export interface SpeakerMetadata {
  role?: string;
  organization?: string;
  notes?: string;
  customFields?: Record<string, unknown>;
}

export interface DiarizationResult {
  speakers: SpeakerProfile[];
  segments: DiarizationSegment[];
  overlapSegments: OverlapSegment[];
  stats: DiarizationStats;
}

export interface DiarizationSegment {
  speakerId: SpeakerId;
  startTime: Duration;
  endTime: Duration;
  confidence: number;
}

export interface OverlapSegment {
  speakerIds: SpeakerId[];
  startTime: Duration;
  endTime: Duration;
}

export interface DiarizationStats {
  speakerCount: number;
  totalSpeakingTime: Record<SpeakerId, Duration>;
  turnCount: Record<SpeakerId, number>;
  averageTurnDuration: Record<SpeakerId, Duration>;
  overlapDuration: Duration;
  overlapPercentage: number;
  silenceDuration: Duration;
  silencePercentage: number;
}

export interface SpeakerTurn {
  speakerId: SpeakerId;
  startTime: Duration;
  endTime: Duration;
  wordCount: number;
  interruptedBy?: SpeakerId;
}

export interface SpeakerAnalysis {
  speakerId: SpeakerId;
  totalSpeakingTime: Duration;
  percentageOfTotal: number;
  turnCount: number;
  averageTurnDuration: Duration;
  wordsPerMinute: number;
  interruptionsMade: number;
  interruptionsReceived: number;
  longestTurn: Duration;
  shortestTurn: Duration;
}

export interface SpeakerLibrary {
  id: UUID;
  organizationId?: UUID;
  name: string;
  description?: string;
  speakers: SavedSpeaker[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SavedSpeaker {
  id: UUID;
  name: string;
  voiceprint: VoicePrint;
  metadata: SpeakerMetadata;
  sampleCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
