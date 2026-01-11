/**
 * AI and analysis types
 */

import type { UUID, Timestamp, Duration } from './common';
import type { SpeakerId } from './speaker';

// Inflection / Prosody types
export interface InflectionData {
  prosody: ProsodyFeatures;
  emotion?: EmotionPrediction;
}

export interface ProsodyFeatures {
  pitch: PitchAnalysis;
  speechRate: number; // syllables per second
  volume: number; // dB normalized 0-1
  pauseDuration: Duration;
  pitchContour: PitchPoint[];
}

export interface PitchAnalysis {
  mean: number; // Hz
  min: number;
  max: number;
  variance: number;
  trend: 'rising' | 'falling' | 'flat' | 'varied';
}

export interface PitchPoint {
  time: Duration;
  frequency: number; // Hz
}

export interface EmotionPrediction {
  primary: Emotion;
  confidence: number;
  scores: Record<Emotion, number>;
}

export type Emotion = 'neutral' | 'happy' | 'sad' | 'angry' | 'fearful' | 'surprised' | 'disgusted';

// AI Chat types
export interface ChatMessage {
  id: UUID;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations?: Citation[];
  timestamp: Timestamp;
}

export interface Citation {
  transcriptId: UUID;
  segmentId: UUID;
  text: string;
  startTime: Duration;
}

export interface ChatSession {
  id: UUID;
  transcriptIds: UUID[];
  messages: ChatMessage[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ChatRequest {
  sessionId?: UUID;
  transcriptIds: UUID[];
  message: string;
  includeContext: boolean;
}

export interface ChatResponse {
  sessionId: UUID;
  message: ChatMessage;
  tokensUsed: number;
}

// Summarization types
export interface TranscriptSummary {
  id: UUID;
  transcriptId: UUID;
  type: SummaryType;
  content: string;
  keyPoints: string[];
  actionItems: ActionItem[];
  topics: Topic[];
  generatedAt: Timestamp;
  model: string;
}

export type SummaryType = 'brief' | 'detailed' | 'bullet-points' | 'executive';

export interface ActionItem {
  id: UUID;
  text: string;
  assignee?: string;
  dueDate?: Timestamp;
  speakerId?: SpeakerId;
  segmentId?: UUID;
  isCompleted: boolean;
}

export interface Topic {
  name: string;
  confidence: number;
  segments: UUID[];
  keywords: string[];
}

// Semantic search types
export interface SemanticSearchQuery {
  query: string;
  transcriptIds?: UUID[];
  projectIds?: UUID[];
  limit: number;
  threshold: number;
}

export interface SemanticSearchResult {
  transcriptId: UUID;
  segmentId: UUID;
  text: string;
  score: number;
  startTime: Duration;
}

// Ollama / LLM types
export interface OllamaModel {
  name: string;
  modifiedAt: Timestamp;
  size: number;
  digest: string;
  details: {
    family: string;
    parameterSize: string;
    quantizationLevel: string;
  };
}

export interface OllamaConfig {
  baseUrl: string;
  defaultModel: string;
  embeddingModel: string;
  temperature: number;
  maxTokens: number;
  contextWindow: number;
}

export interface PromptTemplate {
  id: UUID;
  name: string;
  description?: string;
  systemPrompt: string;
  userPromptTemplate: string;
  variables: string[];
  category: PromptCategory;
  isBuiltIn: boolean;
}

export type PromptCategory = 'summarization' | 'extraction' | 'analysis' | 'chat' | 'custom';
