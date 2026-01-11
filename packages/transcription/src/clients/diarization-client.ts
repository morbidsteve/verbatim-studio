/**
 * Speaker diarization service client.
 */

import type {
  DiarizationOptions,
  DiarizationResult,
  SpeakerProfile,
} from '../types/diarization';

export interface DiarizationClientConfig {
  baseUrl: string;
  timeout?: number;
}

export class DiarizationClient {
  private baseUrl: string;
  private timeout: number;

  constructor(config: DiarizationClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.timeout = config.timeout ?? 30000;
  }

  /**
   * Check service health.
   */
  async health(): Promise<{
    status: string;
    version: string;
    device: string;
    modelLoaded: boolean;
  }> {
    const response = await fetch(`${this.baseUrl}/health`, {
      signal: AbortSignal.timeout(this.timeout),
    });
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Perform speaker diarization on an audio file.
   */
  async diarize(
    file: File | Blob,
    options: DiarizationOptions = {},
  ): Promise<DiarizationResult> {
    const formData = new FormData();
    formData.append('file', file);

    if (options.minSpeakers !== undefined) {
      formData.append('min_speakers', String(options.minSpeakers));
    }
    if (options.maxSpeakers !== undefined) {
      formData.append('max_speakers', String(options.maxSpeakers));
    }

    const response = await fetch(`${this.baseUrl}/diarize`, {
      method: 'POST',
      body: formData,
      // Diarization can take a while
      signal: AbortSignal.timeout(this.timeout * 10),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail ?? `Diarization failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Extract speaker embeddings from audio.
   */
  async extractEmbeddings(file: File | Blob): Promise<Record<string, number[]>> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(this.timeout * 10),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail ?? `Embedding extraction failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * List all speaker profiles.
   */
  async listSpeakers(): Promise<SpeakerProfile[]> {
    const response = await fetch(`${this.baseUrl}/speakers`, {
      signal: AbortSignal.timeout(this.timeout),
    });
    if (!response.ok) {
      throw new Error(`Failed to list speakers: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Create a speaker profile.
   */
  async createSpeaker(name: string): Promise<SpeakerProfile> {
    const response = await fetch(`${this.baseUrl}/speakers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail ?? `Failed to create speaker: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get a speaker profile by ID.
   */
  async getSpeaker(profileId: string): Promise<SpeakerProfile> {
    const response = await fetch(`${this.baseUrl}/speakers/${profileId}`, {
      signal: AbortSignal.timeout(this.timeout),
    });
    if (!response.ok) {
      throw new Error(`Failed to get speaker: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Delete a speaker profile.
   */
  async deleteSpeaker(profileId: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/speakers/${profileId}`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(this.timeout),
    });
    return response.ok;
  }
}
