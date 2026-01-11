/**
 * Real-time transcription types.
 */

import type { ModelSize, WordTimestamp } from './transcription';

export type RealtimeMessageType = 'config' | 'partial' | 'final' | 'error' | 'status';

export interface RealtimeConfig {
  type: 'config';
  model: ModelSize;
  language?: string;
  vadEnabled?: boolean;
  beamSize?: number;
}

export interface PartialResult {
  type: 'partial';
  text: string;
  timestamp: number;
}

export interface FinalResult {
  type: 'final';
  text: string;
  start: number;
  end: number;
  language: string;
  words: WordTimestamp[];
}

export interface RealtimeError {
  type: 'error';
  error: string;
  detail?: string;
}

export interface RealtimeStatus {
  type: 'status';
  status: string;
  sessionId?: string;
}

export type RealtimeMessage = PartialResult | FinalResult | RealtimeError | RealtimeStatus;

export interface RealtimeSessionOptions {
  url: string;
  model?: ModelSize;
  language?: string;
  vadEnabled?: boolean;
  onPartial?: (result: PartialResult) => void;
  onFinal?: (result: FinalResult) => void;
  onError?: (error: RealtimeError) => void;
  onStatus?: (status: RealtimeStatus) => void;
  onClose?: () => void;
}
