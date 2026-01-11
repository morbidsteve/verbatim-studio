/**
 * SQLite schemas for Basic tier (standalone desktop app).
 *
 * Note: Basic tier does not include multi-user, organization, or workspace features.
 * Those are Enterprise-only and use PostgreSQL.
 */

import {
  sqliteTable,
  text,
  integer,
  real,
  blob,
  index,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

// ============================================================================
// Projects
// ============================================================================

export const projects = sqliteTable(
  'projects',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    parentId: text('parent_id'), // For folders/hierarchy
    templateId: text('template_id'),
    status: text('status', { enum: ['active', 'archived', 'deleted'] })
      .notNull()
      .default('active'),
    settings: text('settings', { mode: 'json' }).$type<ProjectSettings>(),
    metadata: text('metadata', { mode: 'json' }).$type<ProjectMetadata>(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => ({
    parentIdx: index('projects_parent_idx').on(table.parentId),
    statusIdx: index('projects_status_idx').on(table.status),
  })
);

export interface ProjectSettings {
  defaultLanguage?: string;
  defaultModel?: string;
  autoTranscribe?: boolean;
  retentionDays?: number;
}

export interface ProjectMetadata {
  recordingCount?: number;
  totalDuration?: number;
  totalSize?: number;
  customFields?: Record<string, unknown>;
}

// ============================================================================
// Recordings
// ============================================================================

export const recordings = sqliteTable(
  'recordings',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    folderId: text('folder_id'),
    name: text('name').notNull(),
    description: text('description'),

    // Source info
    sourceType: text('source_type', { enum: ['upload', 'live'] }).notNull(),
    sourceFilename: text('source_filename'),

    // Media info
    mediaType: text('media_type', { enum: ['audio', 'video'] }).notNull(),
    format: text('format').notNull(),
    codec: text('codec'),
    duration: integer('duration').notNull(), // milliseconds
    size: integer('size').notNull(), // bytes
    sampleRate: integer('sample_rate'),
    channels: integer('channels'),
    bitrate: integer('bitrate'),
    width: integer('width'),
    height: integer('height'),
    storagePath: text('storage_path').notNull(),

    // Transcription status
    transcriptionStatus: text('transcription_status', {
      enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    })
      .notNull()
      .default('pending'),
    transcriptionProgress: integer('transcription_progress').notNull().default(0),
    transcriptionModel: text('transcription_model'),
    transcriptionLanguage: text('transcription_language'),
    transcriptionStartedAt: integer('transcription_started_at', { mode: 'timestamp' }),
    transcriptionCompletedAt: integer('transcription_completed_at', { mode: 'timestamp' }),
    transcriptionError: text('transcription_error'),

    // Metadata
    metadata: text('metadata', { mode: 'json' }).$type<RecordingMetadata>(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => ({
    projectIdx: index('recordings_project_idx').on(table.projectId),
    statusIdx: index('recordings_status_idx').on(table.transcriptionStatus),
    createdAtIdx: index('recordings_created_at_idx').on(table.createdAt),
  })
);

export interface RecordingMetadata {
  tags?: string[];
  notes?: string;
  customFields?: Record<string, unknown>;
}

// ============================================================================
// Transcripts
// ============================================================================

export const transcripts = sqliteTable(
  'transcripts',
  {
    id: text('id').primaryKey(),
    recordingId: text('recording_id')
      .notNull()
      .unique()
      .references(() => recordings.id, { onDelete: 'cascade' }),
    language: text('language').notNull(),
    model: text('model').notNull(),
    modelVersion: text('model_version'),
    processingTime: integer('processing_time'), // milliseconds
    wordCount: integer('word_count').notNull().default(0),
    characterCount: integer('character_count').notNull().default(0),
    averageConfidence: real('average_confidence'),
    languageConfidence: real('language_confidence'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => ({
    recordingIdx: index('transcripts_recording_idx').on(table.recordingId),
  })
);

export const transcriptSegments = sqliteTable(
  'transcript_segments',
  {
    id: text('id').primaryKey(),
    transcriptId: text('transcript_id')
      .notNull()
      .references(() => transcripts.id, { onDelete: 'cascade' }),
    index: integer('index').notNull(),
    speakerId: text('speaker_id').notNull(),
    text: text('text').notNull(),
    startTime: integer('start_time').notNull(), // milliseconds
    endTime: integer('end_time').notNull(), // milliseconds
    confidence: real('confidence').notNull(),
    words: text('words', { mode: 'json' }).$type<WordTimestamp[]>(),
    inflection: text('inflection', { mode: 'json' }).$type<InflectionData>(),
    isEdited: integer('is_edited', { mode: 'boolean' }).notNull().default(false),
    editedAt: integer('edited_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => ({
    transcriptIdx: index('transcript_segments_transcript_idx').on(table.transcriptId),
    speakerIdx: index('transcript_segments_speaker_idx').on(table.speakerId),
    timeIdx: index('transcript_segments_time_idx').on(table.startTime, table.endTime),
  })
);

export interface WordTimestamp {
  word: string;
  startTime: number;
  endTime: number;
  confidence: number;
}

export interface InflectionData {
  prosody: {
    pitchMean: number;
    pitchMin: number;
    pitchMax: number;
    pitchVariance: number;
    pitchTrend: 'rising' | 'falling' | 'flat' | 'varied';
    speechRate: number;
    volume: number;
    pauseDuration: number;
  };
  emotion?: {
    primary: string;
    confidence: number;
    scores: Record<string, number>;
  };
}

// ============================================================================
// Speakers
// ============================================================================

export const speakerProfiles = sqliteTable(
  'speaker_profiles',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    avatarPath: text('avatar_path'),
    voiceSignature: blob('voice_signature'), // Speaker embedding
    metadata: text('metadata', { mode: 'json' }).$type<SpeakerMetadata>(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => ({
    nameIdx: index('speaker_profiles_name_idx').on(table.name),
  })
);

export interface SpeakerMetadata {
  role?: string;
  organization?: string;
  email?: string;
  phone?: string;
  notes?: string;
  customFields?: Record<string, unknown>;
}

export const speakerMappings = sqliteTable(
  'speaker_mappings',
  {
    id: text('id').primaryKey(),
    recordingId: text('recording_id')
      .notNull()
      .references(() => recordings.id, { onDelete: 'cascade' }),
    speakerId: text('speaker_id').notNull(), // Diarization ID (e.g., "SPEAKER_00")
    profileId: text('profile_id').references(() => speakerProfiles.id, {
      onDelete: 'set null',
    }),
    displayName: text('display_name'),
    confidence: real('confidence'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => ({
    recordingSpeakerIdx: uniqueIndex('speaker_mappings_recording_speaker_idx').on(
      table.recordingId,
      table.speakerId
    ),
    profileIdx: index('speaker_mappings_profile_idx').on(table.profileId),
  })
);

// ============================================================================
// Annotations
// ============================================================================

export const transcriptAnnotations = sqliteTable(
  'transcript_annotations',
  {
    id: text('id').primaryKey(),
    transcriptId: text('transcript_id')
      .notNull()
      .references(() => transcripts.id, { onDelete: 'cascade' }),
    segmentId: text('segment_id').references(() => transcriptSegments.id, {
      onDelete: 'cascade',
    }),
    type: text('type', { enum: ['highlight', 'comment', 'bookmark', 'action-item'] }).notNull(),
    startTime: integer('start_time').notNull(),
    endTime: integer('end_time').notNull(),
    content: text('content').notNull(),
    color: text('color'),
    isCompleted: integer('is_completed', { mode: 'boolean' }).default(false),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => ({
    transcriptIdx: index('transcript_annotations_transcript_idx').on(table.transcriptId),
    typeIdx: index('transcript_annotations_type_idx').on(table.type),
  })
);

// ============================================================================
// Summaries
// ============================================================================

export const transcriptSummaries = sqliteTable('transcript_summaries', {
  id: text('id').primaryKey(),
  transcriptId: text('transcript_id')
    .notNull()
    .references(() => transcripts.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['brief', 'detailed', 'bullet-points', 'executive'] }).notNull(),
  content: text('content').notNull(),
  keyPoints: text('key_points', { mode: 'json' }).$type<string[]>(),
  actionItems: text('action_items', { mode: 'json' }).$type<ActionItem[]>(),
  topics: text('topics', { mode: 'json' }).$type<Topic[]>(),
  model: text('model').notNull(),
  generatedAt: integer('generated_at', { mode: 'timestamp' }).notNull(),
});

export interface ActionItem {
  id: string;
  text: string;
  assignee?: string;
  dueDate?: string;
  speakerId?: string;
  segmentId?: string;
  isCompleted: boolean;
}

export interface Topic {
  name: string;
  confidence: number;
  segments: string[];
  keywords: string[];
}

// ============================================================================
// Exports
// ============================================================================

export const exports = sqliteTable(
  'exports',
  {
    id: text('id').primaryKey(),
    transcriptId: text('transcript_id')
      .notNull()
      .references(() => transcripts.id, { onDelete: 'cascade' }),
    recordingId: text('recording_id')
      .notNull()
      .references(() => recordings.id, { onDelete: 'cascade' }),
    format: text('format', {
      enum: ['json', 'srt', 'vtt', 'txt', 'docx', 'pdf', 'csv', 'xml'],
    }).notNull(),
    templateId: text('template_id'),
    options: text('options', { mode: 'json' }).$type<ExportOptions>(),
    filename: text('filename').notNull(),
    storagePath: text('storage_path'),
    size: integer('size'),
    status: text('status', { enum: ['pending', 'processing', 'completed', 'failed'] })
      .notNull()
      .default('pending'),
    error: text('error'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    completedAt: integer('completed_at', { mode: 'timestamp' }),
  },
  (table) => ({
    transcriptIdx: index('exports_transcript_idx').on(table.transcriptId),
    recordingIdx: index('exports_recording_idx').on(table.recordingId),
  })
);

export interface ExportOptions {
  includeSpeakerNames?: boolean;
  includeTimestamps?: boolean;
  includeConfidenceScores?: boolean;
  includeWordTimestamps?: boolean;
  includeAnnotations?: boolean;
  includeSummary?: boolean;
  includeInflection?: boolean;
  timestampFormat?: 'hh:mm:ss' | 'hh:mm:ss.mmm' | 'seconds' | 'milliseconds';
  speakerFormat?: 'name' | 'label' | 'both';
  paragraphByPause?: number;
  maxLineLength?: number;
  pageSize?: 'letter' | 'a4' | 'legal';
  orientation?: 'portrait' | 'landscape';
  fontSize?: number;
  fontFamily?: string;
}

// ============================================================================
// Templates
// ============================================================================

export const projectTemplates = sqliteTable('project_templates', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  settings: text('settings', { mode: 'json' }).$type<ProjectSettings>(),
  isDefault: integer('is_default', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const exportTemplates = sqliteTable('export_templates', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  format: text('format', {
    enum: ['json', 'srt', 'vtt', 'txt', 'docx', 'pdf', 'csv', 'xml'],
  }).notNull(),
  options: text('options', { mode: 'json' }).$type<ExportOptions>().notNull(),
  isDefault: integer('is_default', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// ============================================================================
// Settings
// ============================================================================

export const appSettings = sqliteTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value', { mode: 'json' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// ============================================================================
// Custom Fields (for local use)
// ============================================================================

export const customFields = sqliteTable(
  'custom_fields',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    label: text('label').notNull(),
    description: text('description'),
    type: text('type', {
      enum: ['text', 'number', 'date', 'datetime', 'boolean', 'select', 'multiselect', 'url'],
    }).notNull(),
    entityType: text('entity_type', { enum: ['project', 'recording'] }).notNull(),
    isRequired: integer('is_required', { mode: 'boolean' }).notNull().default(false),
    displayOrder: integer('display_order').notNull().default(0),
    config: text('config', { mode: 'json' }).$type<CustomFieldConfig>(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => ({
    entityIdx: index('custom_fields_entity_idx').on(table.entityType),
    nameUnique: uniqueIndex('custom_fields_name_entity_unique').on(table.name, table.entityType),
  })
);

export interface CustomFieldConfig {
  options?: Array<{ value: string; label: string; color?: string }>;
  maxLength?: number;
  pattern?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  defaultValue?: unknown;
}

export const projectFieldValues = sqliteTable(
  'project_field_values',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    fieldId: text('field_id')
      .notNull()
      .references(() => customFields.id, { onDelete: 'cascade' }),
    value: text('value', { mode: 'json' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => ({
    projectFieldIdx: uniqueIndex('project_field_values_project_field_idx').on(
      table.projectId,
      table.fieldId
    ),
  })
);

export const recordingFieldValues = sqliteTable(
  'recording_field_values',
  {
    id: text('id').primaryKey(),
    recordingId: text('recording_id')
      .notNull()
      .references(() => recordings.id, { onDelete: 'cascade' }),
    fieldId: text('field_id')
      .notNull()
      .references(() => customFields.id, { onDelete: 'cascade' }),
    value: text('value', { mode: 'json' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => ({
    recordingFieldIdx: uniqueIndex('recording_field_values_recording_field_idx').on(
      table.recordingId,
      table.fieldId
    ),
  })
);

// ============================================================================
// Tags
// ============================================================================

export const tags = sqliteTable(
  'tags',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull().unique(),
    color: text('color'),
    description: text('description'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  }
);

export const projectTags = sqliteTable(
  'project_tags',
  {
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    tagId: text('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => ({
    pk: uniqueIndex('project_tags_pk').on(table.projectId, table.tagId),
  })
);

export const recordingTags = sqliteTable(
  'recording_tags',
  {
    recordingId: text('recording_id')
      .notNull()
      .references(() => recordings.id, { onDelete: 'cascade' }),
    tagId: text('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => ({
    pk: uniqueIndex('recording_tags_pk').on(table.recordingId, table.tagId),
  })
);
