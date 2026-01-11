import { pgTable, text, timestamp, uuid, jsonb, integer, bigint, index } from 'drizzle-orm/pg-core';
import { projects } from './projects';
import { users } from './users';

export const recordingStatuses = ['pending', 'processing', 'completed', 'failed', 'cancelled'] as const;
export type RecordingStatus = (typeof recordingStatuses)[number];

export const mediaTypes = ['audio', 'video'] as const;
export type MediaType = (typeof mediaTypes)[number];

export const recordings = pgTable(
  'recordings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    folderId: uuid('folder_id'),
    name: text('name').notNull(),
    description: text('description'),

    // Source info
    sourceType: text('source_type', { enum: ['upload', 'live', 'meeting-bot'] }).notNull(),
    sourceFilename: text('source_filename'),
    sourcePlatform: text('source_platform'),
    sourceMeetingId: text('source_meeting_id'),

    // Media info
    mediaType: text('media_type', { enum: mediaTypes }).notNull(),
    format: text('format').notNull(),
    codec: text('codec'),
    duration: integer('duration').notNull(), // milliseconds
    size: bigint('size', { mode: 'number' }).notNull(), // bytes
    sampleRate: integer('sample_rate'),
    channels: integer('channels'),
    bitrate: integer('bitrate'),
    width: integer('width'),
    height: integer('height'),
    storagePath: text('storage_path').notNull(),

    // Transcription status
    transcriptionStatus: text('transcription_status', { enum: recordingStatuses })
      .notNull()
      .default('pending'),
    transcriptionProgress: integer('transcription_progress').notNull().default(0),
    transcriptionModel: text('transcription_model'),
    transcriptionLanguage: text('transcription_language'),
    transcriptionStartedAt: timestamp('transcription_started_at', { withTimezone: true }),
    transcriptionCompletedAt: timestamp('transcription_completed_at', { withTimezone: true }),
    transcriptionError: text('transcription_error'),

    // Metadata
    metadata: jsonb('metadata').$type<RecordingMetadata>().default({}),
    createdById: uuid('created_by_id').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
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

export const recordingJobs = pgTable(
  'recording_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    recordingId: uuid('recording_id')
      .notNull()
      .references(() => recordings.id, { onDelete: 'cascade' }),
    type: text('type', { enum: ['transcription', 'diarization', 'analysis'] }).notNull(),
    status: text('status', { enum: recordingStatuses }).notNull().default('pending'),
    priority: integer('priority').notNull().default(0),
    progress: integer('progress').notNull().default(0),
    workerInfo: jsonb('worker_info'),
    error: text('error'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    recordingIdx: index('recording_jobs_recording_idx').on(table.recordingId),
    statusPriorityIdx: index('recording_jobs_status_priority_idx').on(table.status, table.priority),
  })
);
