import { Database as DatabaseType } from 'better-sqlite3';
import { getDatabase } from '../db/index.js';
import { SettingsRow } from '../db/schema.js';
import { UpdateSettingsInput } from '../schemas/validation.js';
import { logger } from '../utils/logger.js';

export interface UserSettings {
  userId: string;
  workDurationMin: number;
  shortBreakMin: number;
  longBreakMin: number;
  longBreakInterval: number;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  updatedAt: string;
}

const DEFAULT_SETTINGS = {
  workDurationMin: 30,
  shortBreakMin: 5,
  longBreakMin: 15,
  longBreakInterval: 4,
  soundEnabled: true,
  vibrationEnabled: true,
};

function mapRowToSettings(row: SettingsRow): UserSettings {
  return {
    userId: row.user_id,
    workDurationMin: row.work_duration_min,
    shortBreakMin: row.short_break_min,
    longBreakMin: row.long_break_min,
    longBreakInterval: row.long_break_interval,
    soundEnabled: row.sound_enabled === 1,
    vibrationEnabled: row.vibration_enabled === 1,
    updatedAt: row.updated_at,
  };
}

export class SettingsService {
  private get db(): DatabaseType {
    return getDatabase();
  }

  getSettings(userId: string): UserSettings {
    const stmt = this.db.prepare<[string], SettingsRow>(`
      SELECT * FROM settings WHERE user_id = ?
    `);
    const row = stmt.get(userId);

    if (row) {
      return mapRowToSettings(row);
    }

    // Default settings if user hasn't customized yet
    return {
      userId,
      ...DEFAULT_SETTINGS,
      updatedAt: new Date().toISOString(),
    };
  }

  updateSettings(input: UpdateSettingsInput): UserSettings {
    const now = new Date().toISOString();
    const upsertStmt = this.db.prepare(`
      INSERT INTO settings (
        user_id, work_duration_min, short_break_min, long_break_min, long_break_interval,
        sound_enabled, vibration_enabled, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        work_duration_min = excluded.work_duration_min,
        short_break_min = excluded.short_break_min,
        long_break_min = excluded.long_break_min,
        long_break_interval = excluded.long_break_interval,
        sound_enabled = excluded.sound_enabled,
        vibration_enabled = excluded.vibration_enabled,
        updated_at = excluded.updated_at
    `);

    upsertStmt.run(
      input.userId,
      input.workDurationMin,
      input.shortBreakMin,
      input.longBreakMin,
      input.longBreakInterval,
      input.soundEnabled ? 1 : 0,
      input.vibrationEnabled ? 1 : 0,
      now
    );

    logger.success(
      `Settings updated for user=${input.userId}: work=${input.workDurationMin}m short=${input.shortBreakMin}m sound=${input.soundEnabled} vibration=${input.vibrationEnabled}`
    );

    return this.getSettings(input.userId);
  }
}

export const settingsService = new SettingsService();
