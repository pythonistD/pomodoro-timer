import Database, { Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { SCHEMA_SQL } from './schema.js';
import { logger } from '../utils/logger.js';

let dbInstance: DatabaseType | null = null;

export function getDatabase(dbPath?: string): DatabaseType {
  if (dbInstance) {
    return dbInstance;
  }

  const resolvedPath = dbPath || process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'pomodoro.db');

  if (resolvedPath !== ':memory:') {
    const dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  logger.info(`Connecting to SQLite database at: ${resolvedPath}`);
  const db = new Database(resolvedPath);

  // Performance and integrity pragmas
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');

  // Initialize schema
  db.exec(SCHEMA_SQL);
  logger.success('Database schema initialized and verified.');

  dbInstance = db;
  return dbInstance;
}

export function closeDatabase(): void {
  if (dbInstance) {
    try {
      dbInstance.close();
      logger.info('Database connection closed.');
    } catch (err) {
      logger.error('Error closing database connection:', err);
    } finally {
      dbInstance = null;
    }
  }
}

/**
 * Useful for tests: sets up a clean in-memory database
 */
export function setupTestDatabase(): DatabaseType {
  closeDatabase();
  const db = getDatabase(':memory:');
  return db;
}
