/**
 * Types for voice inflection and emotion analysis.
 */

/**
 * Information about a detected pause.
 */
export interface PauseInfo {
  /** Start time in seconds */
  start: number;
  /** End time in seconds */
  end: number;
  /** Duration in seconds */
  duration: number;
}

/**
 * Prosodic analysis results.
 */
export interface ProsodyResult {
  /** Mean pitch in Hz (null if no voiced segments) */
  pitchMeanHz: number | null;
  /** Pitch standard deviation in Hz */
  pitchStdHz: number | null;
  /** Minimum pitch in Hz */
  pitchMinHz: number | null;
  /** Maximum pitch in Hz */
  pitchMaxHz: number | null;
  /** Pitch contour as [time, pitch] pairs */
  pitchContour: [number, number][];

  /** Estimated speech rate in syllables per second */
  speechRateSyllablesPerSec: number | null;

  /** Mean volume in dB */
  volumeMeanDb: number;
  /** Volume standard deviation in dB */
  volumeStdDb: number;
  /** Minimum volume in dB */
  volumeMinDb: number;
  /** Maximum volume in dB */
  volumeMaxDb: number;

  /** Detected pauses */
  pauses: PauseInfo[];
  /** Total pause duration in seconds */
  totalPauseDuration: number;
  /** Speaking duration (excluding pauses) in seconds */
  speakingDuration: number;
}

/**
 * Emotion category.
 */
export type EmotionCategory =
  | "happy"
  | "sad"
  | "angry"
  | "neutral"
  | "fearful"
  | "surprised";

/**
 * Distribution of emotion probabilities.
 */
export interface EmotionDistribution {
  happy: number;
  sad: number;
  angry: number;
  neutral: number;
  fearful: number;
  surprised: number;
}

/**
 * Source of emotion prediction.
 */
export type EmotionSource = "ml" | "prosodic";

/**
 * Emotion detection results.
 */
export interface EmotionResult {
  /** Primary detected emotion */
  primary: EmotionCategory;
  /** Confidence score (0-1) */
  confidence: number;
  /** Probability distribution across emotions */
  distribution: EmotionDistribution;
  /** Source of prediction: ML model or prosodic heuristics */
  source: EmotionSource;
}

/**
 * Information about the analyzed segment.
 */
export interface SegmentInfo {
  /** Start time in seconds */
  start: number;
  /** End time in seconds */
  end: number;
  /** Duration in seconds */
  duration: number;
}

/**
 * Complete inflection analysis result.
 */
export interface InflectionResult {
  /** Prosodic features */
  prosody: ProsodyResult;
  /** Emotion detection result */
  emotion: EmotionResult;
  /** Segment information */
  segment: SegmentInfo;
}

/**
 * Request to analyze audio.
 */
export interface AnalyzeRequest {
  /** Path to audio file */
  audioPath: string;
  /** Start time in seconds (optional) */
  startTime?: number;
  /** End time in seconds (optional) */
  endTime?: number;
}

/**
 * Segment for batch analysis.
 */
export interface BatchSegment {
  /** Segment identifier */
  id: string;
  /** Start time in seconds */
  startTime: number;
  /** End time in seconds */
  endTime: number;
}

/**
 * Request for batch analysis.
 */
export interface BatchAnalyzeRequest {
  /** Path to audio file */
  audioPath: string;
  /** Segments to analyze */
  segments: BatchSegment[];
}

/**
 * Result for a single segment in batch analysis.
 */
export interface BatchSegmentResult {
  /** Segment identifier */
  id: string;
  /** Analysis result (null if error) */
  result: InflectionResult | null;
  /** Error message if analysis failed */
  error: string | null;
}

/**
 * Response for batch analysis.
 */
export interface BatchAnalyzeResponse {
  /** Results for each segment */
  results: BatchSegmentResult[];
}

/**
 * Health check response.
 */
export interface InflectionHealthResponse {
  status: string;
  modelLoaded: boolean;
  device: string;
}
