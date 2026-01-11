/**
 * Speaker diarization types.
 */

export interface SpeakerSegment {
  speaker: string;
  start: number;
  end: number;
  confidence: number;
}

export interface DiarizationResult {
  numSpeakers: number;
  segments: SpeakerSegment[];
  duration: number;
  speakers: string[];
}

export interface DiarizationOptions {
  minSpeakers?: number;
  maxSpeakers?: number;
}

export interface SpeakerProfile {
  id: string;
  name: string;
  embedding?: number[];
  createdAt: string;
  updatedAt: string;
  sampleCount: number;
}

export interface SpeakerIdentification {
  speakerId: string;
  profileId?: string;
  profileName?: string;
  confidence: number;
}
