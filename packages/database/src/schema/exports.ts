import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  bigint,
  index,
} from 'drizzle-orm/pg-core';
import { recordings } from './recordings';
import { transcripts } from './transcripts';
import { users } from './users';

export const exportFormats = [
  'json',
  'srt',
  'vtt',
  'txt',
  'docx',
  'pdf',
  'csv',
  'xml',
] as const;
export type ExportFormat = (typeof exportFormats)[number];

export const exportStatuses = ['pending', 'processing', 'completed', 'failed'] as const;
export type ExportStatus = (typeof exportStatuses)[number];

export const exports = pgTable(
  'exports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    transcriptId: uuid('transcript_id')
      .notNull()
      .references(() => transcripts.id, { onDelete: 'cascade' }),
    recordingId: uuid('recording_id')
      .notNull()
      .references(() => recordings.id, { onDelete: 'cascade' }),

    // Export configuration
    format: text('format', { enum: exportFormats }).notNull(),
    templateId: uuid('template_id'),
    options: jsonb('options').$type<ExportOptions>().default({}),

    // Output
    filename: text('filename').notNull(),
    storagePath: text('storage_path'),
    size: bigint('size', { mode: 'number' }),
    downloadUrl: text('download_url'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),

    // Status
    status: text('status', { enum: exportStatuses }).notNull().default('pending'),
    error: text('error'),

    // Tracking
    createdById: uuid('created_by_id').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => ({
    transcriptIdx: index('exports_transcript_idx').on(table.transcriptId),
    recordingIdx: index('exports_recording_idx').on(table.recordingId),
    statusIdx: index('exports_status_idx').on(table.status),
    createdByIdx: index('exports_created_by_idx').on(table.createdById),
  })
);

export interface ExportOptions {
  // Content options
  includeSpeakerNames?: boolean;
  includeTimestamps?: boolean;
  includeConfidenceScores?: boolean;
  includeWordTimestamps?: boolean;
  includeAnnotations?: boolean;
  includeSummary?: boolean;
  includeInflection?: boolean;

  // Formatting options
  timestampFormat?: 'hh:mm:ss' | 'hh:mm:ss.mmm' | 'seconds' | 'milliseconds';
  speakerFormat?: 'name' | 'label' | 'both';
  paragraphByPause?: number; // Pause duration in ms to split paragraphs
  maxLineLength?: number;

  // Document options (DOCX/PDF)
  pageSize?: 'letter' | 'a4' | 'legal';
  orientation?: 'portrait' | 'landscape';
  fontSize?: number;
  fontFamily?: string;
  includeHeader?: boolean;
  includeFooter?: boolean;
  includePageNumbers?: boolean;
  headerText?: string;
  footerText?: string;
  logoPath?: string;

  // Filter options
  speakerIds?: string[];
  startTime?: number;
  endTime?: number;
  confidenceThreshold?: number;
}

export const exportTemplates = pgTable(
  'export_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    description: text('description'),
    format: text('format', { enum: exportFormats }).notNull(),
    options: jsonb('options').$type<ExportOptions>().notNull(),
    isDefault: text('is_default').default('false'),
    isSystem: text('is_system').default('false'),
    createdById: uuid('created_by_id').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    formatIdx: index('export_templates_format_idx').on(table.format),
  })
);
