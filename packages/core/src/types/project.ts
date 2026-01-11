/**
 * Project and folder types
 */

import type { UUID, Timestamp } from './common';

export interface Project {
  id: UUID;
  name: string;
  description?: string;
  ownerId: UUID;
  workspaceId?: UUID;
  parentId?: UUID; // For folder hierarchy
  templateId?: UUID;
  metadata: ProjectMetadata;
  settings: ProjectSettings;
  status: ProjectStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type ProjectStatus = 'active' | 'archived' | 'deleted';

export interface ProjectMetadata {
  recordingCount: number;
  totalDuration: number; // milliseconds
  totalSize: number; // bytes
  customFields: CustomFieldValue[];
}

export interface ProjectSettings {
  defaultLanguage: string;
  defaultModel: TranscriptionModel;
  autoTranscribe: boolean;
  retentionDays?: number;
}

export type TranscriptionModel =
  | 'whisper-tiny'
  | 'whisper-base'
  | 'whisper-small'
  | 'whisper-medium'
  | 'whisper-large-v3';

export interface ProjectTemplate {
  id: UUID;
  name: string;
  description?: string;
  settings: ProjectSettings;
  customFields: CustomFieldDefinition[];
  recordingTemplate?: RecordingTemplateId;
  isDefault: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

type RecordingTemplateId = UUID;

export interface CustomFieldDefinition {
  id: UUID;
  name: string;
  type: CustomFieldType;
  required: boolean;
  options?: string[]; // For select/multi-select
  defaultValue?: unknown;
}

export type CustomFieldType = 'text' | 'number' | 'date' | 'select' | 'multi-select' | 'boolean';

export interface CustomFieldValue {
  fieldId: UUID;
  value: unknown;
}

export interface Folder {
  id: UUID;
  name: string;
  parentId?: UUID;
  projectId: UUID;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ProjectStats {
  projectId: UUID;
  recordingCount: number;
  transcribedCount: number;
  pendingCount: number;
  failedCount: number;
  totalDuration: number;
  totalSize: number;
  speakerCount: number;
}
