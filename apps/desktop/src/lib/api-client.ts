/**
 * API client for communicating with the Verbatim Studio backend.
 */

// In browser/dev mode, use relative URL (goes through Vite proxy)
// In Electron, use the full URL
const isElectron = typeof window !== 'undefined' && window.navigator.userAgent.includes('Electron');
// @ts-expect-error - Vite env is available at runtime
const API_BASE_URL: string = import.meta.env?.VITE_API_URL || (isElectron ? 'http://localhost:8000' : '');

// Debug logging
console.log('[API Client] isElectron:', isElectron, 'API_BASE_URL:', API_BASE_URL);

interface ApiError {
  detail: string;
}

class ApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    // Load tokens from localStorage on init
    this.accessToken = localStorage.getItem('access_token');
    this.refreshToken = localStorage.getItem('refresh_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    // Add auth header if we have a token
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    // Add content-type for JSON requests
    if (options.body && typeof options.body === 'string') {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401 && this.refreshToken) {
      // Try to refresh the token
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        // Retry the request with new token
        headers['Authorization'] = `Bearer ${this.accessToken}`;
        const retryResponse = await fetch(url, { ...options, headers });
        if (!retryResponse.ok) {
          const error: ApiError = await retryResponse.json();
          throw new Error(error.detail || 'Request failed');
        }
        return retryResponse.json();
      }
    }

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || 'Request failed');
    }

    // Handle empty responses
    const text = await response.text();
    return text ? JSON.parse(text) : ({} as T);
  }

  private async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) return false;

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/refresh?refresh_token=${this.refreshToken}`, {
        method: 'POST',
      });

      if (!response.ok) {
        this.logout();
        return false;
      }

      const data = await response.json();
      this.setTokens(data.access_token, data.refresh_token);
      return true;
    } catch {
      this.logout();
      return false;
    }
  }

  setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
  }

  logout() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  // Auth endpoints
  async register(email: string, password: string, name: string) {
    const response = await this.request<{
      user: User;
      access_token: string;
      refresh_token: string;
    }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    this.setTokens(response.access_token, response.refresh_token);
    return response.user;
  }

  async login(email: string, password: string) {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }

    const data = await response.json();
    this.setTokens(data.access_token, data.refresh_token);
    return data.user as User;
  }

  async getCurrentUser() {
    return this.request<User>('/api/auth/me');
  }

  // Project endpoints
  async getProjects(params?: { status?: string; search?: string; page?: number; page_size?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.page_size) searchParams.set('page_size', String(params.page_size));

    const query = searchParams.toString();
    return this.request<ProjectListResponse>(`/api/projects/${query ? `?${query}` : ''}`);
  }

  async getProject(projectId: string) {
    return this.request<Project>(`/api/projects/${projectId}`);
  }

  async createProject(data: { name: string; description?: string }) {
    return this.request<Project>('/api/projects/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProject(projectId: string, data: { name?: string; description?: string; status?: string }) {
    return this.request<Project>(`/api/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteProject(projectId: string) {
    return this.request<{ message: string }>(`/api/projects/${projectId}`, {
      method: 'DELETE',
    });
  }

  async archiveProject(projectId: string) {
    return this.request<{ message: string }>(`/api/projects/${projectId}/archive`, {
      method: 'POST',
    });
  }

  async restoreProject(projectId: string) {
    return this.request<{ message: string }>(`/api/projects/${projectId}/restore`, {
      method: 'POST',
    });
  }

  // Recording endpoints
  async getRecordings(projectId: string, params?: { status?: string; page?: number; page_size?: number }) {
    const searchParams = new URLSearchParams();
    searchParams.set('project_id', projectId);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.page_size) searchParams.set('page_size', String(params.page_size));

    return this.request<RecordingListResponse>(`/api/recordings/?${searchParams.toString()}`);
  }

  async getRecording(recordingId: string) {
    return this.request<Recording>(`/api/recordings/${recordingId}`);
  }

  async uploadRecording(projectId: string, file: File, name?: string, description?: string) {
    const formData = new FormData();
    formData.append('project_id', projectId);
    formData.append('file', file);
    if (name) formData.append('name', name);
    if (description) formData.append('description', description);

    const response = await fetch(`${API_BASE_URL}/api/recordings/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Upload failed');
    }

    return response.json() as Promise<Recording>;
  }

  async updateRecording(recordingId: string, data: { name?: string; description?: string }) {
    return this.request<Recording>(`/api/recordings/${recordingId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteRecording(recordingId: string) {
    return this.request<{ message: string }>(`/api/recordings/${recordingId}`, {
      method: 'DELETE',
    });
  }

  async startTranscription(recordingId: string, options?: { model?: string; language?: string; diarize?: boolean }) {
    const params = new URLSearchParams();
    if (options?.model) params.set('model', options.model);
    if (options?.language) params.set('language', options.language);
    if (options?.diarize !== undefined) params.set('diarize', String(options.diarize));

    return this.request<{ message: string; recording_id: string }>(`/api/recordings/${recordingId}/transcribe?${params.toString()}`, {
      method: 'POST',
    });
  }

  async getTranscriptionStatus(recordingId: string) {
    return this.request<{ recording_id: string; status: string; progress: number }>(`/api/recordings/${recordingId}/status`);
  }

  // Transcript endpoints
  async getTranscript(recordingId: string) {
    return this.request<TranscriptResponse>(`/api/recordings/${recordingId}/transcript`);
  }

  async updateSegment(transcriptId: string, segmentId: string, data: { text: string }) {
    return this.request<TranscriptSegmentResponse>(`/api/transcripts/${transcriptId}/segments/${segmentId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async updateSpeaker(transcriptId: string, speakerId: string, data: { name: string }) {
    return this.request<SpeakerResponse>(`/api/transcripts/${transcriptId}/speakers/${speakerId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Export transcript
  async exportTranscript(
    recordingId: string,
    options: { format: string; include_speaker_labels?: boolean; include_timestamps?: boolean }
  ): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/api/transcripts/${recordingId}/export`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        format: options.format,
        include_speaker_labels: options.include_speaker_labels ?? true,
        include_timestamps: options.include_timestamps ?? true,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Export failed' }));
      throw new Error(error.detail || 'Export failed');
    }

    return response.blob();
  }

  // Get media URL for streaming
  getMediaUrl(recordingId: string): string {
    const token = this.accessToken;
    return `${API_BASE_URL}/api/recordings/${recordingId}/media${token ? `?token=${token}` : ''}`;
  }

  // Health check
  async healthCheck() {
    return this.request<{ status: string; version: string }>('/api/health');
  }
}

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  status: string;
  recording_count: number;
  total_duration: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectListResponse {
  items: Project[];
  total: number;
  page: number;
  page_size: number;
}

export interface Recording {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  source_type: string;
  media_type: string;
  format: string;
  duration: number;
  size: number;
  storage_path: string;
  transcription_status: string;
  transcription_progress: number;
  created_at: string;
  updated_at: string;
}

export interface RecordingListResponse {
  items: Recording[];
  total: number;
  page: number;
  page_size: number;
}

export interface TranscriptSegmentResponse {
  id: string;
  index: number;
  speaker_id: string;
  text: string;
  start_time: number;
  end_time: number;
  confidence: number;
  words: Array<{
    word: string;
    start_time: number;
    end_time: number;
    confidence: number;
  }>;
  is_edited: boolean;
}

export interface SpeakerResponse {
  id: string;
  name: string | null;
  color: string;
}

export interface TranscriptResponse {
  id: string;
  recording_id: string;
  language: string;
  segments: TranscriptSegmentResponse[];
  speakers: SpeakerResponse[];
  model: string;
  model_version: string;
  processing_time: number;
  word_count: number;
  character_count: number;
  average_confidence: number;
  created_at: string;
  updated_at: string;
}

// Export singleton instance
export const apiClient = new ApiClient();
