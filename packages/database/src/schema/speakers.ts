import { pgTable, text, timestamp, uuid, jsonb, integer, real, index } from 'drizzle-orm/pg-core';
import { transcripts } from './transcripts';
import { users } from './users';
import { organizations } from './organizations';

export const speakers = pgTable(
  'speakers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    transcriptId: uuid('transcript_id')
      .notNull()
      .references(() => transcripts.id, { onDelete: 'cascade' }),
    speakerId: text('speaker_id').notNull(), // e.g., "speaker_0", "speaker_1"
    name: text('name'),
    color: text('color').notNull(),
    profileId: uuid('profile_id'), // Link to saved speaker profile

    // Stats
    totalSpeakingTime: integer('total_speaking_time').notNull().default(0), // ms
    turnCount: integer('turn_count').notNull().default(0),
    wordCount: integer('word_count').notNull().default(0),

    metadata: jsonb('metadata').$type<SpeakerMetadata>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    transcriptIdx: index('speakers_transcript_idx').on(table.transcriptId),
    speakerIdIdx: index('speakers_speaker_id_idx').on(table.speakerId),
  })
);

export interface SpeakerMetadata {
  role?: string;
  organization?: string;
  notes?: string;
  customFields?: Record<string, unknown>;
}

export const speakerProfiles = pgTable(
  'speaker_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').references(() => organizations.id),
    createdById: uuid('created_by_id').references(() => users.id),
    name: text('name').notNull(),
    voiceprint: jsonb('voiceprint').$type<VoicePrint>(),
    metadata: jsonb('metadata').$type<SpeakerMetadata>(),
    sampleCount: integer('sample_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    orgIdx: index('speaker_profiles_org_idx').on(table.organizationId),
    nameIdx: index('speaker_profiles_name_idx').on(table.name),
  })
);

export interface VoicePrint {
  embedding: number[];
  model: string;
  createdAt: string;
}

export const diarizationResults = pgTable('diarization_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  transcriptId: uuid('transcript_id')
    .notNull()
    .unique()
    .references(() => transcripts.id, { onDelete: 'cascade' }),
  speakerCount: integer('speaker_count').notNull(),
  overlapDuration: integer('overlap_duration').notNull().default(0), // ms
  overlapPercentage: real('overlap_percentage').notNull().default(0),
  silenceDuration: integer('silence_duration').notNull().default(0), // ms
  silencePercentage: real('silence_percentage').notNull().default(0),
  model: text('model').notNull(),
  processingTime: integer('processing_time'), // ms
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
