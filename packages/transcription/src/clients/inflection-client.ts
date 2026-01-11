/**
 * Client for the inflection analysis service.
 */

import type {
  AnalyzeRequest,
  BatchAnalyzeRequest,
  BatchAnalyzeResponse,
  InflectionHealthResponse,
  InflectionResult,
} from "../types/inflection";

/**
 * Configuration for the inflection client.
 */
export interface InflectionClientConfig {
  /** Base URL of the inflection service */
  baseUrl: string;
  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * Convert snake_case API response to camelCase.
 */
function toCamelCase<T>(obj: unknown): T {
  if (obj === null || obj === undefined) {
    return obj as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => toCamelCase(item)) as T;
  }

  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) =>
        letter.toUpperCase()
      );
      result[camelKey] = toCamelCase(value);
    }
    return result as T;
  }

  return obj as T;
}

/**
 * Convert camelCase request to snake_case for API.
 */
function toSnakeCase(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => toSnakeCase(item));
  }

  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      result[snakeKey] = toSnakeCase(value);
    }
    return result;
  }

  return obj;
}

/**
 * Client for interacting with the inflection analysis service.
 */
export class InflectionClient {
  private baseUrl: string;
  private timeout: number;

  constructor(config: InflectionClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.timeout = config.timeout ?? 60000;
  }

  /**
   * Check service health.
   */
  async healthCheck(): Promise<InflectionHealthResponse> {
    const response = await this.fetch<InflectionHealthResponse>("/health");
    return response;
  }

  /**
   * Analyze prosodic features and emotions in audio.
   *
   * @param request - Analysis request
   * @returns Inflection analysis result
   */
  async analyze(request: AnalyzeRequest): Promise<InflectionResult> {
    const response = await this.fetch<InflectionResult>("/analyze", {
      method: "POST",
      body: toSnakeCase(request),
    });
    return response;
  }

  /**
   * Analyze a specific segment of audio.
   *
   * @param audioPath - Path to audio file
   * @param startTime - Start time in seconds
   * @param endTime - End time in seconds
   * @returns Inflection analysis result
   */
  async analyzeSegment(
    audioPath: string,
    startTime: number,
    endTime: number
  ): Promise<InflectionResult> {
    return this.analyze({
      audioPath,
      startTime,
      endTime,
    });
  }

  /**
   * Analyze multiple segments in batch.
   *
   * @param request - Batch analysis request
   * @returns Batch analysis response
   */
  async analyzeBatch(request: BatchAnalyzeRequest): Promise<BatchAnalyzeResponse> {
    const response = await this.fetch<BatchAnalyzeResponse>("/analyze/batch", {
      method: "POST",
      body: toSnakeCase(request),
    });
    return response;
  }

  /**
   * Make a request to the service.
   */
  private async fetch<T>(
    path: string,
    options?: {
      method?: string;
      body?: unknown;
    }
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: options?.method ?? "GET",
        headers: {
          "Content-Type": "application/json",
        },
        body: options?.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Request failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return toCamelCase<T>(data);
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Create an inflection client with default configuration.
 *
 * @param baseUrl - Base URL of the service (default: http://localhost:8004)
 * @returns InflectionClient instance
 */
export function createInflectionClient(
  baseUrl: string = "http://localhost:8004"
): InflectionClient {
  return new InflectionClient({ baseUrl });
}
