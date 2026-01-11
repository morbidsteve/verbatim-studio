import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  integer,
  real,
  boolean,
  index,
} from 'drizzle-orm/pg-core';
import { recordings } from './recordings';
import { users } from './users';

export const transcripts = pgTable(
  'transcripts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    recordingId: uuid('recording_id')
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
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    recordingIdx: index('transcripts_recording_idx').on(table.recordingId),
  })
);

export const transcriptSegments = pgTable(
  'transcript_segments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    transcriptId: uuid('transcript_id')
      .notNull()
      .references(() => transcripts.id, { onDelete: 'cascade' }),
    index: integer('index').notNull(),
    speakerId: text('speaker_id').notNull(),
    text: text('text').notNull(),
    startTime: integer('start_time').notNull(), // milliseconds
    endTime: integer('end_time').notNull(), // milliseconds
    confidence: real('confidence').notNull(),
    words: jsonb('words').$type<WordTimestamp[]>().default([]),
    inflection: jsonb('inflection').$type<InflectionData>(),
    isEdited: boolean('is_edited').notNull().default(false),
    editedById: uuid('edited_by_id').references(() => users.id),
    editedAt: timestamp('edited_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
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

export const transcriptAnnotations = pgTable(
  'transcript_annotations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    transcriptId: uuid('transcript_id')
      .notNull()
      .references(() => transcripts.id, { onDelete: 'cascade' }),
    segmentId: uuid('segment_id').references(() => transcriptSegments.id, { onDelete: 'cascade' }),
    type: text('type', { enum: ['highlight', 'comment', 'bookmark', 'action-item'] }).notNull(),
    startTime: integer('start_time').notNull(),
    endTime: integer('end_time').notNull(),
    content: text('content').notNull(),
    color: text('color'),
    isCompleted: boolean('is_completed').default(false),
    createdById: uuid('created_by_id').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    transcriptIdx: index('transcript_annotations_transcript_idx').on(table.transcriptId),
    typeIdx: index('transcript_annotations_type_idx').on(table.type),
  })
);

export const transcriptSummaries = pgTable('transcript_summaries', {
  id: uuid('id').primaryKey().defaultRandom(),
  transcriptId: uuid('transcript_id')
    .notNull()
    .references(() => transcripts.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['brief', 'detailed', 'bullet-points', 'executive'] }).notNull(),
  content: text('content').notNull(),
  keyPoints: jsonb('key_points').$type<string[]>().default([]),
  actionItems: jsonb('action_items').$type<ActionItem[]>().default([]),
  topics: jsonb('topics').$type<Topic[]>().default([]),
  model: text('model').notNull(),
  generatedAt: timestamp('generated_at', { withTimezone: true }).notNull().defaultNow(),
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
