/**
 * Transcript state management with playback and editing.
 */

import { create } from 'zustand';
import { apiClient } from '../lib/api-client';

// Types matching @verbatim/core but kept local for simplicity
export interface TranscriptSegment {
  id: string;
  index: number;
  speakerId: string;
  text: string;
  startTime: number; // milliseconds
  endTime: number; // milliseconds
  confidence: number;
  words: WordTimestamp[];
  isEdited: boolean;
}

export interface WordTimestamp {
  word: string;
  startTime: number;
  endTime: number;
  confidence: number;
}

export interface SpeakerProfile {
  id: string;
  name?: string;
  color: string;
}

export interface Transcript {
  id: string;
  recordingId: string;
  language: string;
  segments: TranscriptSegment[];
  speakers: SpeakerProfile[];
  metadata: {
    model: string;
    modelVersion: string;
    processingTime: number;
    wordCount: number;
    characterCount: number;
    averageConfidence: number;
  };
  createdAt: string;
  updatedAt: string;
}

// API response types (snake_case from backend)
interface ApiTranscriptSegment {
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

interface ApiSpeaker {
  id: string;
  name: string | null;
  color: string;
}

interface ApiTranscript {
  id: string;
  recording_id: string;
  language: string;
  segments: ApiTranscriptSegment[];
  speakers: ApiSpeaker[];
  model: string;
  model_version: string;
  processing_time: number;
  word_count: number;
  character_count: number;
  average_confidence: number;
  created_at: string;
  updated_at: string;
}

// Map API response to local format
function mapApiSegment(s: ApiTranscriptSegment): TranscriptSegment {
  return {
    id: s.id,
    index: s.index,
    speakerId: s.speaker_id,
    text: s.text,
    startTime: s.start_time,
    endTime: s.end_time,
    confidence: s.confidence,
    words: s.words.map((w) => ({
      word: w.word,
      startTime: w.start_time,
      endTime: w.end_time,
      confidence: w.confidence,
    })),
    isEdited: s.is_edited,
  };
}

function mapApiSpeaker(s: ApiSpeaker): SpeakerProfile {
  return {
    id: s.id,
    name: s.name || undefined,
    color: s.color,
  };
}

function mapApiTranscript(t: ApiTranscript): Transcript {
  return {
    id: t.id,
    recordingId: t.recording_id,
    language: t.language,
    segments: t.segments.map(mapApiSegment),
    speakers: t.speakers.map(mapApiSpeaker),
    metadata: {
      model: t.model,
      modelVersion: t.model_version,
      processingTime: t.processing_time,
      wordCount: t.word_count,
      characterCount: t.character_count,
      averageConfidence: t.average_confidence,
    },
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  };
}

// Pending edit for debounced saving
interface PendingEdit {
  segmentId: string;
  text: string;
  originalText: string;
}

interface TranscriptState {
  // Data
  transcript: Transcript | null;
  recordingId: string | null;
  mediaUrl: string | null;

  // Playback state
  currentTime: number; // milliseconds
  duration: number; // milliseconds
  isPlaying: boolean;
  playbackSpeed: number;
  volume: number;
  isMuted: boolean;

  // Editor state
  activeSegmentIndex: number | null;
  editingSegmentId: string | null;
  pendingEdits: Map<string, PendingEdit>;
  unsavedChanges: boolean;

  // UI state
  isLoading: boolean;
  error: string | null;
  autoScroll: boolean;

  // Actions
  loadTranscript: (recordingId: string) => Promise<void>;
  unloadTranscript: () => void;

  // Playback actions
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  play: () => void;
  pause: () => void;
  togglePlayPause: () => void;
  seek: (time: number) => void;
  skipForward: (seconds?: number) => void;
  skipBackward: (seconds?: number) => void;
  setPlaybackSpeed: (speed: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;

  // Segment sync
  updateActiveSegment: () => void;
  seekToSegment: (segmentIndex: number) => void;

  // Editing actions
  startEditing: (segmentId: string) => void;
  stopEditing: () => void;
  updateSegmentText: (segmentId: string, text: string) => void;
  saveChanges: () => Promise<void>;
  discardChanges: () => void;

  // Speaker actions
  updateSpeakerName: (speakerId: string, name: string) => void;

  // UI actions
  setAutoScroll: (enabled: boolean) => void;
  clearError: () => void;
}

export const useTranscriptStore = create<TranscriptState>()((set, get) => ({
  // Initial state
  transcript: null,
  recordingId: null,
  mediaUrl: null,

  currentTime: 0,
  duration: 0,
  isPlaying: false,
  playbackSpeed: 1,
  volume: 1,
  isMuted: false,

  activeSegmentIndex: null,
  editingSegmentId: null,
  pendingEdits: new Map(),
  unsavedChanges: false,

  isLoading: false,
  error: null,
  autoScroll: true,

  // Load transcript for a recording
  loadTranscript: async (recordingId: string) => {
    set({ isLoading: true, error: null, recordingId });

    try {
      // Fetch transcript from API
      const response = await apiClient.getTranscript(recordingId);
      const transcript = mapApiTranscript(response);

      // Get media URL
      const mediaUrl = apiClient.getMediaUrl(recordingId);

      set({
        transcript,
        mediaUrl,
        isLoading: false,
        currentTime: 0,
        activeSegmentIndex: transcript.segments.length > 0 ? 0 : null,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load transcript',
        isLoading: false,
      });
    }
  },

  // Unload transcript and reset state
  unloadTranscript: () => {
    set({
      transcript: null,
      recordingId: null,
      mediaUrl: null,
      currentTime: 0,
      duration: 0,
      isPlaying: false,
      activeSegmentIndex: null,
      editingSegmentId: null,
      pendingEdits: new Map(),
      unsavedChanges: false,
      error: null,
    });
  },

  // Playback actions
  setCurrentTime: (time: number) => {
    set({ currentTime: time });
    get().updateActiveSegment();
  },

  setDuration: (duration: number) => {
    set({ duration });
  },

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  togglePlayPause: () => set((state) => ({ isPlaying: !state.isPlaying })),

  seek: (time: number) => {
    set({ currentTime: Math.max(0, Math.min(time, get().duration)) });
    get().updateActiveSegment();
  },

  skipForward: (seconds = 5) => {
    const { currentTime, duration } = get();
    set({ currentTime: Math.min(currentTime + seconds * 1000, duration) });
    get().updateActiveSegment();
  },

  skipBackward: (seconds = 5) => {
    const { currentTime } = get();
    set({ currentTime: Math.max(currentTime - seconds * 1000, 0) });
    get().updateActiveSegment();
  },

  setPlaybackSpeed: (speed: number) => {
    set({ playbackSpeed: Math.max(0.25, Math.min(speed, 3)) });
  },

  setVolume: (volume: number) => {
    set({ volume: Math.max(0, Math.min(volume, 1)), isMuted: volume === 0 });
  },

  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),

  // Find and set the active segment based on current playback time
  updateActiveSegment: () => {
    const { transcript, currentTime } = get();
    if (!transcript) return;

    const index = transcript.segments.findIndex(
      (seg) => currentTime >= seg.startTime && currentTime < seg.endTime
    );

    if (index !== -1) {
      set({ activeSegmentIndex: index });
    }
  },

  // Seek to a specific segment
  seekToSegment: (segmentIndex: number) => {
    const { transcript } = get();
    if (!transcript || segmentIndex < 0 || segmentIndex >= transcript.segments.length) return;

    const segment = transcript.segments[segmentIndex];
    if (segment) {
      set({ currentTime: segment.startTime, activeSegmentIndex: segmentIndex });
    }
  },

  // Editing actions
  startEditing: (segmentId: string) => {
    set({ editingSegmentId: segmentId });
  },

  stopEditing: () => {
    set({ editingSegmentId: null });
  },

  updateSegmentText: (segmentId: string, text: string) => {
    const { transcript, pendingEdits } = get();
    if (!transcript) return;

    const segment = transcript.segments.find((s) => s.id === segmentId);
    if (!segment) return;

    const newPendingEdits = new Map(pendingEdits);
    const existing = newPendingEdits.get(segmentId);

    if (text === segment.text && !segment.isEdited) {
      // Text reverted to original, remove pending edit
      newPendingEdits.delete(segmentId);
    } else {
      newPendingEdits.set(segmentId, {
        segmentId,
        text,
        originalText: existing?.originalText ?? segment.text,
      });
    }

    // Update local state immediately for responsive UI
    const updatedSegments = transcript.segments.map((s) =>
      s.id === segmentId ? { ...s, text } : s
    );

    set({
      transcript: { ...transcript, segments: updatedSegments },
      pendingEdits: newPendingEdits,
      unsavedChanges: newPendingEdits.size > 0,
    });
  },

  saveChanges: async () => {
    const { transcript, pendingEdits, recordingId } = get();
    if (!transcript || !recordingId || pendingEdits.size === 0) return;

    set({ isLoading: true, error: null });

    try {
      // Save each pending edit to the API
      for (const [segmentId, edit] of pendingEdits) {
        await apiClient.updateSegment(transcript.id, segmentId, { text: edit.text });
      }

      // Mark segments as edited
      const updatedSegments = transcript.segments.map((s) => {
        if (pendingEdits.has(s.id)) {
          return { ...s, isEdited: true };
        }
        return s;
      });

      set({
        transcript: { ...transcript, segments: updatedSegments },
        pendingEdits: new Map(),
        unsavedChanges: false,
        isLoading: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to save changes',
        isLoading: false,
      });
    }
  },

  discardChanges: () => {
    const { transcript, pendingEdits } = get();
    if (!transcript || pendingEdits.size === 0) return;

    // Revert all pending edits
    const updatedSegments = transcript.segments.map((s) => {
      const pending = pendingEdits.get(s.id);
      if (pending) {
        return { ...s, text: pending.originalText };
      }
      return s;
    });

    set({
      transcript: { ...transcript, segments: updatedSegments },
      pendingEdits: new Map(),
      unsavedChanges: false,
      editingSegmentId: null,
    });
  },

  // Speaker actions
  updateSpeakerName: (speakerId: string, name: string) => {
    const { transcript } = get();
    if (!transcript) return;

    const updatedSpeakers = transcript.speakers.map((s) =>
      s.id === speakerId ? { ...s, name } : s
    );

    set({
      transcript: { ...transcript, speakers: updatedSpeakers },
      unsavedChanges: true,
    });
  },

  // UI actions
  setAutoScroll: (enabled: boolean) => {
    set({ autoScroll: enabled });
  },

  clearError: () => {
    set({ error: null });
  },
}));

// Utility functions for time formatting
export function formatTime(ms: number, includeMs = false): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = Math.floor(ms % 1000);

  if (hours > 0) {
    const base = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    return includeMs ? `${base}.${milliseconds.toString().padStart(3, '0')}` : base;
  }

  const base = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  return includeMs ? `${base}.${milliseconds.toString().padStart(3, '0')}` : base;
}

export function parseTime(timeStr: string): number {
  const parts = timeStr.split(':').map(Number);
  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return ((hours ?? 0) * 3600 + (minutes ?? 0) * 60 + (seconds ?? 0)) * 1000;
  } else if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return ((minutes ?? 0) * 60 + (seconds ?? 0)) * 1000;
  }
  return 0;
}
