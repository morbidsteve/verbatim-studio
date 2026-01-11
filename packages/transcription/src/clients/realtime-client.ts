/**
 * Real-time transcription WebSocket client.
 */

import type {
  FinalResult,
  PartialResult,
  RealtimeConfig,
  RealtimeError,
  RealtimeMessage,
  RealtimeSessionOptions,
  RealtimeStatus,
} from '../types/realtime';

export type RealtimeClientState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface RealtimeClientEvents {
  onStateChange?: (state: RealtimeClientState) => void;
  onPartial?: (result: PartialResult) => void;
  onFinal?: (result: FinalResult) => void;
  onError?: (error: RealtimeError) => void;
  onStatus?: (status: RealtimeStatus) => void;
}

export class RealtimeTranscriptionClient {
  private ws: WebSocket | null = null;
  private url: string;
  private state: RealtimeClientState = 'disconnected';
  private events: RealtimeClientEvents;
  private sessionId: string | null = null;

  constructor(url: string, events: RealtimeClientEvents = {}) {
    this.url = url;
    this.events = events;
  }

  /**
   * Get current connection state.
   */
  getState(): RealtimeClientState {
    return this.state;
  }

  /**
   * Get session ID if connected.
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Connect to the transcription service.
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      this.setState('connecting');

      try {
        this.ws = new WebSocket(this.url);
        this.ws.binaryType = 'arraybuffer';

        this.ws.onopen = () => {
          this.setState('connected');
          resolve();
        };

        this.ws.onclose = () => {
          this.setState('disconnected');
          this.sessionId = null;
        };

        this.ws.onerror = (error) => {
          this.setState('error');
          reject(error);
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };
      } catch (error) {
        this.setState('error');
        reject(error);
      }
    });
  }

  /**
   * Disconnect from the service.
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setState('disconnected');
    this.sessionId = null;
  }

  /**
   * Configure the transcription session.
   */
  configure(config: Partial<Omit<RealtimeConfig, 'type'>>): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected');
    }

    const message: RealtimeConfig = {
      type: 'config',
      model: config.model ?? 'small',
      language: config.language,
      vadEnabled: config.vadEnabled ?? true,
      beamSize: config.beamSize ?? 5,
    };

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Send audio data for transcription.
   * Audio should be 16kHz, mono, 16-bit PCM.
   */
  sendAudio(audioData: ArrayBuffer | Int16Array | Float32Array): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected');
    }

    let buffer: ArrayBuffer | ArrayBufferLike;

    if (audioData instanceof ArrayBuffer) {
      buffer = audioData;
    } else if (audioData instanceof Int16Array) {
      buffer = audioData.buffer;
    } else if (audioData instanceof Float32Array) {
      // Convert Float32 to Int16
      const int16 = new Int16Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) {
        const s = Math.max(-1, Math.min(1, audioData[i]!));
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      buffer = int16.buffer;
    } else {
      throw new Error('Invalid audio data format');
    }

    this.ws.send(buffer);
  }

  /**
   * Send ping to keep connection alive.
   */
  ping(): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      return;
    }
    this.ws.send(JSON.stringify({ type: 'ping' }));
  }

  private setState(state: RealtimeClientState): void {
    this.state = state;
    this.events.onStateChange?.(state);
  }

  private handleMessage(data: string | ArrayBuffer): void {
    if (typeof data !== 'string') {
      return;
    }

    try {
      const message = JSON.parse(data) as RealtimeMessage | { type: 'pong' };

      switch (message.type) {
        case 'partial':
          this.events.onPartial?.(message as PartialResult);
          break;

        case 'final':
          this.events.onFinal?.(message as FinalResult);
          break;

        case 'error':
          this.events.onError?.(message as RealtimeError);
          break;

        case 'status':
          const status = message as RealtimeStatus;
          if (status.sessionId) {
            this.sessionId = status.sessionId;
          }
          this.events.onStatus?.(status);
          break;

        case 'pong':
          // Keep-alive response, ignore
          break;
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }
}

/**
 * Create a real-time transcription session.
 * Helper function for simpler API.
 */
export function createRealtimeSession(options: RealtimeSessionOptions): RealtimeTranscriptionClient {
  const client = new RealtimeTranscriptionClient(options.url, {
    onPartial: options.onPartial,
    onFinal: options.onFinal,
    onError: options.onError,
    onStatus: options.onStatus,
  });

  return client;
}
