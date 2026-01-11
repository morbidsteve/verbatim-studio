/**
 * Transcription types matching the service API schemas.
 */

export type ModelSize = 'tiny' | 'base' | 'small' | 'medium' | 'large-v3';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
  confidence: number;
}

export interface TranscriptSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  speaker?: string;
  confidence: number;
  words: WordTimestamp[];
}

export interface TranscriptionResult {
  language: string;
  languageProbability: number;
  duration: number;
  segments: TranscriptSegment[];
  text: string;
}

export interface TranscriptionJob {
  jobId: string;
  status: JobStatus;
  progress: number;
  filename?: string;
  model: ModelSize;
  language?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  result?: TranscriptionResult;
}

export interface TranscriptionOptions {
  model?: ModelSize;
  language?: string;
  wordTimestamps?: boolean;
  batchSize?: number;
  beamSize?: number;
  initialPrompt?: string;
  vadFilter?: boolean;
}

export interface ModelInfo {
  id: ModelSize;
  name: string;
  sizeMb: number;
  languages: number;
  loaded: boolean;
  device?: string;
}
