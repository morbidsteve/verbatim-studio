/**
 * SQLite migrations for Basic tier.
 *
 * Migrations are embedded in the app and run automatically on startup.
 */

import type Database from 'better-sqlite3';

interface Migration {
  version: number;
  name: string;
  statements: string[];
}

/**
 * List of migrations in order.
 * Each migration should be idempotent where possible.
 */
const migrations: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    statements: [
      // Projects
      `CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        parent_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
        template_id TEXT,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
        settings TEXT,
        metadata TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS projects_parent_idx ON projects(parent_id)`,
      `CREATE INDEX IF NOT EXISTS projects_status_idx ON projects(status)`,

      // Recordings
      `CREATE TABLE IF NOT EXISTS recordings (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        folder_id TEXT,
        name TEXT NOT NULL,
        description TEXT,
        source_type TEXT NOT NULL CHECK (source_type IN ('upload', 'live')),
        source_filename TEXT,
        media_type TEXT NOT NULL CHECK (media_type IN ('audio', 'video')),
        format TEXT NOT NULL,
        codec TEXT,
        duration INTEGER NOT NULL,
        size INTEGER NOT NULL,
        sample_rate INTEGER,
        channels INTEGER,
        bitrate INTEGER,
        width INTEGER,
        height INTEGER,
        storage_path TEXT NOT NULL,
        transcription_status TEXT NOT NULL DEFAULT 'pending' CHECK (transcription_status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
        transcription_progress INTEGER NOT NULL DEFAULT 0,
        transcription_model TEXT,
        transcription_language TEXT,
        transcription_started_at INTEGER,
        transcription_completed_at INTEGER,
        transcription_error TEXT,
        metadata TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS recordings_project_idx ON recordings(project_id)`,
      `CREATE INDEX IF NOT EXISTS recordings_status_idx ON recordings(transcription_status)`,
      `CREATE INDEX IF NOT EXISTS recordings_created_at_idx ON recordings(created_at)`,

      // Transcripts
      `CREATE TABLE IF NOT EXISTS transcripts (
        id TEXT PRIMARY KEY,
        recording_id TEXT NOT NULL UNIQUE REFERENCES recordings(id) ON DELETE CASCADE,
        language TEXT NOT NULL,
        model TEXT NOT NULL,
        model_version TEXT,
        processing_time INTEGER,
        word_count INTEGER NOT NULL DEFAULT 0,
        character_count INTEGER NOT NULL DEFAULT 0,
        average_confidence REAL,
        language_confidence REAL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS transcripts_recording_idx ON transcripts(recording_id)`,

      // Transcript Segments
      `CREATE TABLE IF NOT EXISTS transcript_segments (
        id TEXT PRIMARY KEY,
        transcript_id TEXT NOT NULL REFERENCES transcripts(id) ON DELETE CASCADE,
        "index" INTEGER NOT NULL,
        speaker_id TEXT NOT NULL,
        text TEXT NOT NULL,
        start_time INTEGER NOT NULL,
        end_time INTEGER NOT NULL,
        confidence REAL NOT NULL,
        words TEXT,
        inflection TEXT,
        is_edited INTEGER NOT NULL DEFAULT 0,
        edited_at INTEGER,
        created_at INTEGER NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS transcript_segments_transcript_idx ON transcript_segments(transcript_id)`,
      `CREATE INDEX IF NOT EXISTS transcript_segments_speaker_idx ON transcript_segments(speaker_id)`,
      `CREATE INDEX IF NOT EXISTS transcript_segments_time_idx ON transcript_segments(start_time, end_time)`,

      // Speaker Profiles
      `CREATE TABLE IF NOT EXISTS speaker_profiles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        avatar_path TEXT,
        voice_signature BLOB,
        metadata TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS speaker_profiles_name_idx ON speaker_profiles(name)`,

      // Speaker Mappings
      `CREATE TABLE IF NOT EXISTS speaker_mappings (
        id TEXT PRIMARY KEY,
        recording_id TEXT NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
        speaker_id TEXT NOT NULL,
        profile_id TEXT REFERENCES speaker_profiles(id) ON DELETE SET NULL,
        display_name TEXT,
        confidence REAL,
        created_at INTEGER NOT NULL,
        UNIQUE(recording_id, speaker_id)
      )`,
      `CREATE INDEX IF NOT EXISTS speaker_mappings_profile_idx ON speaker_mappings(profile_id)`,

      // Transcript Annotations
      `CREATE TABLE IF NOT EXISTS transcript_annotations (
        id TEXT PRIMARY KEY,
        transcript_id TEXT NOT NULL REFERENCES transcripts(id) ON DELETE CASCADE,
        segment_id TEXT REFERENCES transcript_segments(id) ON DELETE CASCADE,
        type TEXT NOT NULL CHECK (type IN ('highlight', 'comment', 'bookmark', 'action-item')),
        start_time INTEGER NOT NULL,
        end_time INTEGER NOT NULL,
        content TEXT NOT NULL,
        color TEXT,
        is_completed INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS transcript_annotations_transcript_idx ON transcript_annotations(transcript_id)`,
      `CREATE INDEX IF NOT EXISTS transcript_annotations_type_idx ON transcript_annotations(type)`,

      // Transcript Summaries
      `CREATE TABLE IF NOT EXISTS transcript_summaries (
        id TEXT PRIMARY KEY,
        transcript_id TEXT NOT NULL REFERENCES transcripts(id) ON DELETE CASCADE,
        type TEXT NOT NULL CHECK (type IN ('brief', 'detailed', 'bullet-points', 'executive')),
        content TEXT NOT NULL,
        key_points TEXT,
        action_items TEXT,
        topics TEXT,
        model TEXT NOT NULL,
        generated_at INTEGER NOT NULL
      )`,

      // Exports
      `CREATE TABLE IF NOT EXISTS exports (
        id TEXT PRIMARY KEY,
        transcript_id TEXT NOT NULL REFERENCES transcripts(id) ON DELETE CASCADE,
        recording_id TEXT NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
        format TEXT NOT NULL CHECK (format IN ('json', 'srt', 'vtt', 'txt', 'docx', 'pdf', 'csv', 'xml')),
        template_id TEXT,
        options TEXT,
        filename TEXT NOT NULL,
        storage_path TEXT,
        size INTEGER,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
        error TEXT,
        created_at INTEGER NOT NULL,
        completed_at INTEGER
      )`,
      `CREATE INDEX IF NOT EXISTS exports_transcript_idx ON exports(transcript_id)`,
      `CREATE INDEX IF NOT EXISTS exports_recording_idx ON exports(recording_id)`,

      // Templates
      `CREATE TABLE IF NOT EXISTS project_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        settings TEXT,
        is_default INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,

      `CREATE TABLE IF NOT EXISTS export_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        format TEXT NOT NULL CHECK (format IN ('json', 'srt', 'vtt', 'txt', 'docx', 'pdf', 'csv', 'xml')),
        options TEXT NOT NULL,
        is_default INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,

      // App Settings
      `CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )`,

      // Custom Fields
      `CREATE TABLE IF NOT EXISTS custom_fields (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        label TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL CHECK (type IN ('text', 'number', 'date', 'datetime', 'boolean', 'select', 'multiselect', 'url')),
        entity_type TEXT NOT NULL CHECK (entity_type IN ('project', 'recording')),
        is_required INTEGER NOT NULL DEFAULT 0,
        display_order INTEGER NOT NULL DEFAULT 0,
        config TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        UNIQUE(name, entity_type)
      )`,
      `CREATE INDEX IF NOT EXISTS custom_fields_entity_idx ON custom_fields(entity_type)`,

      `CREATE TABLE IF NOT EXISTS project_field_values (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        field_id TEXT NOT NULL REFERENCES custom_fields(id) ON DELETE CASCADE,
        value TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        UNIQUE(project_id, field_id)
      )`,

      `CREATE TABLE IF NOT EXISTS recording_field_values (
        id TEXT PRIMARY KEY,
        recording_id TEXT NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
        field_id TEXT NOT NULL REFERENCES custom_fields(id) ON DELETE CASCADE,
        value TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        UNIQUE(recording_id, field_id)
      )`,

      // Tags
      `CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        color TEXT,
        description TEXT,
        created_at INTEGER NOT NULL
      )`,

      `CREATE TABLE IF NOT EXISTS project_tags (
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        created_at INTEGER NOT NULL,
        PRIMARY KEY (project_id, tag_id)
      )`,

      `CREATE TABLE IF NOT EXISTS recording_tags (
        recording_id TEXT NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
        tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        created_at INTEGER NOT NULL,
        PRIMARY KEY (recording_id, tag_id)
      )`,
    ],
  },
  // Add future migrations here with incrementing version numbers
];

/**
 * Run all pending migrations.
 */
export function migrate(db: Database.Database): void {
  // Create migrations table if it doesn't exist
  db.prepare(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at INTEGER NOT NULL
    )
  `).run();

  // Get current version
  const currentVersion = db
    .prepare('SELECT MAX(version) as version FROM _migrations')
    .get() as { version: number | null };

  const appliedVersion = currentVersion?.version ?? 0;

  // Apply pending migrations
  for (const migration of migrations) {
    if (migration.version > appliedVersion) {
      console.log(`Applying migration ${migration.version}: ${migration.name}`);

      const transaction = db.transaction(() => {
        // Run each statement in the migration
        for (const statement of migration.statements) {
          db.prepare(statement).run();
        }

        // Record migration
        db.prepare(
          'INSERT INTO _migrations (version, name, applied_at) VALUES (?, ?, ?)'
        ).run(migration.version, migration.name, Date.now());
      });

      transaction();

      console.log(`Migration ${migration.version} applied successfully`);
    }
  }
}

/**
 * Get migration status.
 */
export function getMigrationStatus(db: Database.Database): {
  currentVersion: number;
  pendingMigrations: Migration[];
} {
  try {
    const currentVersion = db
      .prepare('SELECT MAX(version) as version FROM _migrations')
      .get() as { version: number | null };

    const appliedVersion = currentVersion?.version ?? 0;
    const pendingMigrations = migrations.filter((m) => m.version > appliedVersion);

    return {
      currentVersion: appliedVersion,
      pendingMigrations,
    };
  } catch {
    // Table doesn't exist yet
    return {
      currentVersion: 0,
      pendingMigrations: migrations,
    };
  }
}
