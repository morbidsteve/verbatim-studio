/**
 * Project state management with API integration.
 */

import { create } from 'zustand';
import { apiClient, type Project as ApiProject, type Recording as ApiRecording } from '../lib/api-client';

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'archived' | 'deleted';
  recordingCount: number;
  totalDuration: number; // seconds
  createdAt: string;
  updatedAt: string;
}

export interface Recording {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  sourceType: 'upload' | 'live';
  mediaType: 'audio' | 'video';
  format: string;
  duration: number; // seconds
  size: number; // bytes
  storagePath: string;
  transcriptionStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  transcriptionProgress: number;
  createdAt: string;
  updatedAt: string;
}

// Convert API response to local format
function mapApiProject(p: ApiProject): Project {
  return {
    id: p.id,
    name: p.name,
    description: p.description || undefined,
    status: p.status as Project['status'],
    recordingCount: p.recording_count,
    totalDuration: p.total_duration,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}

function mapApiRecording(r: ApiRecording): Recording {
  return {
    id: r.id,
    projectId: r.project_id,
    name: r.name,
    description: r.description || undefined,
    sourceType: r.source_type as Recording['sourceType'],
    mediaType: r.media_type as Recording['mediaType'],
    format: r.format,
    duration: r.duration,
    size: r.size,
    storagePath: r.storage_path,
    transcriptionStatus: r.transcription_status as Recording['transcriptionStatus'],
    transcriptionProgress: r.transcription_progress,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

interface ProjectState {
  // Data
  projects: Project[];
  recordings: Map<string, Recording[]>;
  selectedProjectId: string | null;
  selectedRecordingId: string | null;

  // Loading states
  projectsLoading: boolean;
  recordingsLoading: boolean;
  error: string | null;

  // Actions - API integrated
  fetchProjects: (params?: { status?: string; search?: string }) => Promise<void>;
  fetchRecordings: (projectId: string) => Promise<void>;
  createProject: (data: { name: string; description?: string }) => Promise<Project>;
  updateProject: (id: string, updates: { name?: string; description?: string; status?: string }) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  archiveProject: (id: string) => Promise<void>;
  restoreProject: (id: string) => Promise<void>;

  uploadRecording: (projectId: string, file: File, name?: string, description?: string) => Promise<Recording>;
  updateRecording: (id: string, updates: { name?: string; description?: string }) => Promise<void>;
  deleteRecording: (id: string) => Promise<void>;
  startTranscription: (recordingId: string, options?: { model?: string; language?: string; diarize?: boolean }) => Promise<void>;

  selectProject: (id: string | null) => void;
  selectRecording: (id: string | null) => void;
  clearError: () => void;
}

export const useProjectStore = create<ProjectState>()((set, get) => ({
  // Initial state
  projects: [],
  recordings: new Map(),
  selectedProjectId: null,
  selectedRecordingId: null,
  projectsLoading: false,
  recordingsLoading: false,
  error: null,

  // Fetch projects from API
  fetchProjects: async (params) => {
    set({ projectsLoading: true, error: null });
    try {
      const response = await apiClient.getProjects(params);
      set({ projects: response.items.map(mapApiProject), projectsLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to fetch projects', projectsLoading: false });
    }
  },

  // Fetch recordings for a project
  fetchRecordings: async (projectId) => {
    set({ recordingsLoading: true, error: null });
    try {
      const response = await apiClient.getRecordings(projectId);
      const recordings = response.items.map(mapApiRecording);
      set((state) => {
        const newRecordings = new Map(state.recordings);
        newRecordings.set(projectId, recordings);
        return { recordings: newRecordings, recordingsLoading: false };
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to fetch recordings', recordingsLoading: false });
    }
  },

  // Create a new project
  createProject: async (data) => {
    set({ error: null });
    try {
      const apiProject = await apiClient.createProject(data);
      const project = mapApiProject(apiProject);
      set((state) => ({ projects: [...state.projects, project] }));
      return project;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to create project';
      set({ error });
      throw new Error(error);
    }
  },

  // Update a project
  updateProject: async (id, updates) => {
    set({ error: null });
    try {
      const apiProject = await apiClient.updateProject(id, updates);
      const project = mapApiProject(apiProject);
      set((state) => ({
        projects: state.projects.map((p) => (p.id === id ? project : p)),
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to update project' });
      throw err;
    }
  },

  // Delete a project
  deleteProject: async (id) => {
    set({ error: null });
    try {
      await apiClient.deleteProject(id);
      set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
        selectedProjectId: state.selectedProjectId === id ? null : state.selectedProjectId,
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to delete project' });
      throw err;
    }
  },

  // Archive a project
  archiveProject: async (id) => {
    set({ error: null });
    try {
      await apiClient.archiveProject(id);
      set((state) => ({
        projects: state.projects.map((p) =>
          p.id === id ? { ...p, status: 'archived' as const, updatedAt: new Date().toISOString() } : p
        ),
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to archive project' });
      throw err;
    }
  },

  // Restore an archived project
  restoreProject: async (id) => {
    set({ error: null });
    try {
      await apiClient.restoreProject(id);
      set((state) => ({
        projects: state.projects.map((p) =>
          p.id === id ? { ...p, status: 'active' as const, updatedAt: new Date().toISOString() } : p
        ),
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to restore project' });
      throw err;
    }
  },

  // Upload a recording
  uploadRecording: async (projectId, file, name, description) => {
    set({ error: null });
    try {
      const apiRecording = await apiClient.uploadRecording(projectId, file, name, description);
      const recording = mapApiRecording(apiRecording);
      set((state) => {
        const newRecordings = new Map(state.recordings);
        const projectRecordings = newRecordings.get(projectId) || [];
        newRecordings.set(projectId, [...projectRecordings, recording]);
        return { recordings: newRecordings };
      });
      // Also refresh the project to get updated recording count
      get().fetchProjects();
      return recording;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to upload recording';
      set({ error });
      throw new Error(error);
    }
  },

  // Update a recording
  updateRecording: async (id, updates) => {
    set({ error: null });
    try {
      const apiRecording = await apiClient.updateRecording(id, updates);
      const recording = mapApiRecording(apiRecording);
      set((state) => {
        const newRecordings = new Map(state.recordings);
        for (const [projectId, recs] of newRecordings) {
          const index = recs.findIndex((r) => r.id === id);
          if (index !== -1) {
            const updated = [...recs];
            updated[index] = recording;
            newRecordings.set(projectId, updated);
            break;
          }
        }
        return { recordings: newRecordings };
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to update recording' });
      throw err;
    }
  },

  // Delete a recording
  deleteRecording: async (id) => {
    set({ error: null });
    try {
      await apiClient.deleteRecording(id);
      set((state) => {
        const newRecordings = new Map(state.recordings);
        for (const [projectId, recs] of newRecordings) {
          const filtered = recs.filter((r) => r.id !== id);
          if (filtered.length !== recs.length) {
            newRecordings.set(projectId, filtered);
            break;
          }
        }
        return {
          recordings: newRecordings,
          selectedRecordingId: state.selectedRecordingId === id ? null : state.selectedRecordingId,
        };
      });
      // Refresh projects to get updated recording count
      get().fetchProjects();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to delete recording' });
      throw err;
    }
  },

  // Start transcription
  startTranscription: async (recordingId, options) => {
    set({ error: null });
    try {
      await apiClient.startTranscription(recordingId, options);
      // Update local state to show processing
      set((state) => {
        const newRecordings = new Map(state.recordings);
        for (const [projectId, recs] of newRecordings) {
          const index = recs.findIndex((r) => r.id === recordingId);
          if (index !== -1) {
            const existingRecording = recs[index];
            if (existingRecording) {
              const updated = [...recs];
              updated[index] = {
                ...existingRecording,
                transcriptionStatus: 'processing' as const,
                transcriptionProgress: 0,
              };
              newRecordings.set(projectId, updated);
            }
            break;
          }
        }
        return { recordings: newRecordings };
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to start transcription' });
      throw err;
    }
  },

  selectProject: (id) => set({ selectedProjectId: id }),
  selectRecording: (id) => set({ selectedRecordingId: id }),
  clearError: () => set({ error: null }),
}));
