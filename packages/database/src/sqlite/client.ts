/**
 * SQLite database client for Basic tier (Electron desktop app).
 */

import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import { migrate } from './migrations';

export interface SQLiteClientOptions {
  /** Path to the database file */
  path: string;
  /** Enable verbose logging */
  verbose?: boolean;
  /** Enable WAL mode for better concurrency */
  walMode?: boolean;
  /** Run migrations on connection */
  runMigrations?: boolean;
}

export interface SQLiteClient {
  db: ReturnType<typeof drizzle>;
  raw: Database.Database;
  close: () => void;
  backup: (destPath: string) => void;
  vacuum: () => void;
}

/**
 * Create a SQLite database connection for the desktop app.
 */
export function createSQLiteClient(options: SQLiteClientOptions): SQLiteClient {
  const { path, verbose = false, walMode = true, runMigrations = true } = options;

  // Create the database connection
  const sqlite = new Database(path, {
    verbose: verbose ? console.log : undefined,
  });

  // Enable WAL mode for better concurrent access
  if (walMode) {
    sqlite.pragma('journal_mode = WAL');
  }

  // Enable foreign keys
  sqlite.pragma('foreign_keys = ON');

  // Performance optimizations
  sqlite.pragma('synchronous = NORMAL');
  sqlite.pragma('cache_size = -64000'); // 64MB cache
  sqlite.pragma('temp_store = MEMORY');

  // Create drizzle instance
  const db = drizzle(sqlite, { schema });

  // Run migrations if requested
  if (runMigrations) {
    migrate(sqlite);
  }

  return {
    db,
    raw: sqlite,

    close() {
      sqlite.close();
    },

    backup(destPath: string) {
      sqlite.backup(destPath);
    },

    vacuum() {
      // Run SQLite VACUUM command to reclaim space
      sqlite.prepare('VACUUM').run();
    },
  };
}

/**
 * Generate a UUID for SQLite (since it doesn't have native UUID support).
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Get current timestamp for SQLite.
 */
export function now(): Date {
  return new Date();
}
