/**
 * Project state management.
 */

import { create } from 'zustand';

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'archived' | 'deleted';
  recordingCount: number;
  totalDuration: number; // milliseconds
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
  duration: number; // milliseconds
  size: number; // bytes
  storagePath: string;
  transcriptionStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  transcriptionProgress: number;
  createdAt: string;
  updatedAt: string;
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

  // Actions
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  selectProject: (id: string | null) => void;

  setRecordings: (projectId: string, recordings: Recording[]) => void;
  addRecording: (recording: Recording) => void;
  updateRecording: (id: string, updates: Partial<Recording>) => void;
  deleteRecording: (id: string) => void;
  selectRecording: (id: string | null) => void;

  setProjectsLoading: (loading: boolean) => void;
  setRecordingsLoading: (loading: boolean) => void;

  // Mock data for demo
  loadMockData: () => void;
}

export const useProjectStore = create<ProjectState>()((set) => ({
  // Initial state
  projects: [],
  recordings: new Map(),
  selectedProjectId: null,
  selectedRecordingId: null,
  projectsLoading: false,
  recordingsLoading: false,

  // Actions
  setProjects: (projects) => set({ projects }),

  addProject: (project) =>
    set((state) => ({ projects: [...state.projects, project] })),

  updateProject: (id, updates) =>
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
      ),
    })),

  deleteProject: (id) =>
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      selectedProjectId: state.selectedProjectId === id ? null : state.selectedProjectId,
    })),

  selectProject: (id) => set({ selectedProjectId: id }),

  setRecordings: (projectId, recordings) =>
    set((state) => {
      const newRecordings = new Map(state.recordings);
      newRecordings.set(projectId, recordings);
      return { recordings: newRecordings };
    }),

  addRecording: (recording) =>
    set((state) => {
      const newRecordings = new Map(state.recordings);
      const projectRecordings = newRecordings.get(recording.projectId) || [];
      newRecordings.set(recording.projectId, [...projectRecordings, recording]);
      return { recordings: newRecordings };
    }),

  updateRecording: (id, updates) =>
    set((state) => {
      const newRecordings = new Map(state.recordings);
      for (const [projectId, recs] of newRecordings) {
        const index = recs.findIndex((r) => r.id === id);
        if (index !== -1) {
          const updated = [...recs];
          const existingRecording = updated[index];
          updated[index] = {
            ...existingRecording,
            ...updates,
            updatedAt: new Date().toISOString(),
          } as Recording;
          newRecordings.set(projectId, updated);
          break;
        }
      }
      return { recordings: newRecordings };
    }),

  deleteRecording: (id) =>
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
    }),

  selectRecording: (id) => set({ selectedRecordingId: id }),

  setProjectsLoading: (loading) => set({ projectsLoading: loading }),
  setRecordingsLoading: (loading) => set({ recordingsLoading: loading }),

  // Load mock data for demonstration
  loadMockData: () => {
    const mockProjects: Project[] = [
      {
        id: 'proj-1',
        name: 'Deposition - Smith v. Jones',
        description: 'Plaintiff deposition transcript',
        status: 'active',
        recordingCount: 3,
        totalDuration: 7200000, // 2 hours
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T14:30:00Z',
      },
      {
        id: 'proj-2',
        name: 'Client Interview - Johnson',
        description: 'Initial consultation recording',
        status: 'active',
        recordingCount: 1,
        totalDuration: 2700000, // 45 minutes
        createdAt: '2024-01-14T09:00:00Z',
        updatedAt: '2024-01-14T10:00:00Z',
      },
      {
        id: 'proj-3',
        name: 'Board Meeting Q4 2023',
        description: 'Quarterly board meeting minutes',
        status: 'archived',
        recordingCount: 2,
        totalDuration: 5400000, // 1.5 hours
        createdAt: '2023-12-20T14:00:00Z',
        updatedAt: '2023-12-20T16:00:00Z',
      },
    ];

    const mockRecordings: Recording[] = [
      {
        id: 'rec-1',
        projectId: 'proj-1',
        name: 'Session 1 - Morning',
        sourceType: 'upload',
        mediaType: 'audio',
        format: 'wav',
        duration: 3600000,
        size: 345678901,
        storagePath: '/recordings/rec-1.wav',
        transcriptionStatus: 'completed',
        transcriptionProgress: 100,
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T11:30:00Z',
      },
      {
        id: 'rec-2',
        projectId: 'proj-1',
        name: 'Session 2 - Afternoon',
        sourceType: 'upload',
        mediaType: 'audio',
        format: 'wav',
        duration: 2400000,
        size: 234567890,
        storagePath: '/recordings/rec-2.wav',
        transcriptionStatus: 'processing',
        transcriptionProgress: 65,
        createdAt: '2024-01-15T13:00:00Z',
        updatedAt: '2024-01-15T14:00:00Z',
      },
      {
        id: 'rec-3',
        projectId: 'proj-1',
        name: 'Session 3 - Follow-up',
        sourceType: 'live',
        mediaType: 'audio',
        format: 'wav',
        duration: 1200000,
        size: 123456789,
        storagePath: '/recordings/rec-3.wav',
        transcriptionStatus: 'pending',
        transcriptionProgress: 0,
        createdAt: '2024-01-15T15:00:00Z',
        updatedAt: '2024-01-15T15:00:00Z',
      },
      {
        id: 'rec-4',
        projectId: 'proj-2',
        name: 'Consultation Recording',
        sourceType: 'live',
        mediaType: 'video',
        format: 'mp4',
        duration: 2700000,
        size: 567890123,
        storagePath: '/recordings/rec-4.mp4',
        transcriptionStatus: 'completed',
        transcriptionProgress: 100,
        createdAt: '2024-01-14T09:00:00Z',
        updatedAt: '2024-01-14T10:00:00Z',
      },
    ];

    const recordingsMap = new Map<string, Recording[]>();
    recordingsMap.set('proj-1', mockRecordings.filter((r) => r.projectId === 'proj-1'));
    recordingsMap.set('proj-2', mockRecordings.filter((r) => r.projectId === 'proj-2'));

    set({
      projects: mockProjects,
      recordings: recordingsMap,
    });
  },
}));
