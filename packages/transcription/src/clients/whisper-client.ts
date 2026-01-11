/**
 * WhisperX transcription service client.
 */

import type {
  ModelInfo,
  ModelSize,
  TranscriptionJob,
  TranscriptionOptions,
  TranscriptionResult,
} from '../types/transcription';

export interface WhisperClientConfig {
  baseUrl: string;
  timeout?: number;
}

export class WhisperClient {
  private baseUrl: string;
  private timeout: number;

  constructor(config: WhisperClientConfig) {
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
    modelsLoaded: string[];
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
   * List available models.
   */
  async listModels(): Promise<ModelInfo[]> {
    const response = await fetch(`${this.baseUrl}/models`, {
      signal: AbortSignal.timeout(this.timeout),
    });
    if (!response.ok) {
      throw new Error(`Failed to list models: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Load a model into memory.
   */
  async loadModel(modelId: ModelSize): Promise<ModelInfo> {
    const response = await fetch(`${this.baseUrl}/models/${modelId}/load`, {
      method: 'POST',
      signal: AbortSignal.timeout(this.timeout * 10), // Model loading takes longer
    });
    if (!response.ok) {
      throw new Error(`Failed to load model: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Transcribe a file asynchronously.
   * Returns a job that can be polled for status.
   */
  async transcribe(
    file: File | Blob,
    options: TranscriptionOptions = {},
  ): Promise<TranscriptionJob> {
    const formData = new FormData();
    formData.append('file', file);

    if (options.model) formData.append('model', options.model);
    if (options.language) formData.append('language', options.language);
    if (options.wordTimestamps !== undefined)
      formData.append('word_timestamps', String(options.wordTimestamps));
    if (options.batchSize) formData.append('batch_size', String(options.batchSize));
    if (options.beamSize) formData.append('beam_size', String(options.beamSize));
    if (options.initialPrompt) formData.append('initial_prompt', options.initialPrompt);
    if (options.vadFilter !== undefined) formData.append('vad_filter', String(options.vadFilter));

    const response = await fetch(`${this.baseUrl}/transcribe`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail ?? `Transcription failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Transcribe a file synchronously.
   * Blocks until transcription is complete.
   */
  async transcribeSync(
    file: File | Blob,
    options: TranscriptionOptions = {},
  ): Promise<TranscriptionResult> {
    const formData = new FormData();
    formData.append('file', file);

    if (options.model) formData.append('model', options.model);
    if (options.language) formData.append('language', options.language);
    if (options.wordTimestamps !== undefined)
      formData.append('word_timestamps', String(options.wordTimestamps));
    if (options.batchSize) formData.append('batch_size', String(options.batchSize));
    if (options.beamSize) formData.append('beam_size', String(options.beamSize));
    if (options.initialPrompt) formData.append('initial_prompt', options.initialPrompt);
    if (options.vadFilter !== undefined) formData.append('vad_filter', String(options.vadFilter));

    const response = await fetch(`${this.baseUrl}/transcribe/sync`, {
      method: 'POST',
      body: formData,
      // Long timeout for sync transcription
      signal: AbortSignal.timeout(this.timeout * 60),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail ?? `Transcription failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get job status.
   */
  async getJob(jobId: string): Promise<TranscriptionJob> {
    const response = await fetch(`${this.baseUrl}/jobs/${jobId}`, {
      signal: AbortSignal.timeout(this.timeout),
    });
    if (!response.ok) {
      throw new Error(`Failed to get job: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Poll job until completion.
   */
  async waitForJob(
    jobId: string,
    options: {
      pollInterval?: number;
      timeout?: number;
      onProgress?: (job: TranscriptionJob) => void;
    } = {},
  ): Promise<TranscriptionJob> {
    const { pollInterval = 1000, timeout = 600000, onProgress } = options;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const job = await this.getJob(jobId);

      if (onProgress) {
        onProgress(job);
      }

      if (job.status === 'completed' || job.status === 'failed') {
        return job;
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error('Job polling timeout');
  }

  /**
   * List jobs.
   */
  async listJobs(options: { status?: string; limit?: number } = {}): Promise<TranscriptionJob[]> {
    const params = new URLSearchParams();
    if (options.status) params.append('status', options.status);
    if (options.limit) params.append('limit', String(options.limit));

    const response = await fetch(`${this.baseUrl}/jobs?${params}`, {
      signal: AbortSignal.timeout(this.timeout),
    });
    if (!response.ok) {
      throw new Error(`Failed to list jobs: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Delete a job.
   */
  async deleteJob(jobId: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/jobs/${jobId}`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(this.timeout),
    });
    return response.ok;
  }
}
