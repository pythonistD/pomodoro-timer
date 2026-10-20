import { Database as DatabaseType } from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { getDatabase } from '../db/index.js';
import { DaySessionRow } from '../db/schema.js';
import { sessionService } from './session.service.js';
import { logger } from '../utils/logger.js';

export interface DaySessionStatus {
  date: string;
  status: 'not_started' | 'active' | 'completed';
  startedAt: string | null;
  completedAt: string | null;
  pomodoroCount: number;
  focusMinutes: number;
}

export class DaySessionService {
  private get db(): DatabaseType {
    return getDatabase();
  }

  private getLocalDateStr(timezoneOffsetMin = 0): string {
    const now = new Date();
    const localNow = new Date(now.getTime() - timezoneOffsetMin * 60 * 1000);
    return localNow.toISOString().slice(0, 10);
  }

  getStatus(userId: string, timezoneOffsetMin = 0): DaySessionStatus {
    const todayDate = this.getLocalDateStr(timezoneOffsetMin);
    const stmt = this.db.prepare<[string, string], DaySessionRow>(`
      SELECT * FROM day_sessions WHERE user_id = ? AND date = ?
    `);
    const row = stmt.get(userId, todayDate);

    // Also get live today count
    const todayStats = sessionService.getTodayStats(userId, timezoneOffsetMin);

    if (!row) {
      // If user already logged pomodoros today without explicit start, it's considered active
      if (todayStats.todayCount > 0) {
        return {
          date: todayDate,
          status: 'active',
          startedAt: todayStats.lastSession ? todayStats.lastSession.startedAt : new Date().toISOString(),
          completedAt: null,
          pomodoroCount: todayStats.todayCount,
          focusMinutes: todayStats.totalFocusMinutesToday,
        };
      }

      return {
        date: todayDate,
        status: 'not_started',
        startedAt: null,
        completedAt: null,
        pomodoroCount: 0,
        focusMinutes: 0,
      };
    }

    return {
      date: row.date,
      status: row.status,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      pomodoroCount: Math.max(row.pomodoro_count, todayStats.todayCount),
      focusMinutes: Math.max(row.focus_minutes, todayStats.totalFocusMinutesToday),
    };
  }

  startSession(userId: string, timezoneOffsetMin = 0): DaySessionStatus {
    const todayDate = this.getLocalDateStr(timezoneOffsetMin);
    const now = new Date().toISOString();

    const upsertStmt = this.db.prepare(`
      INSERT INTO day_sessions (id, user_id, date, status, started_at, completed_at, pomodoro_count, focus_minutes)
      VALUES (?, ?, ?, 'active', ?, NULL, 0, 0)
      ON CONFLICT(user_id, date) DO UPDATE SET
        status = 'active',
        completed_at = NULL
    `);

    upsertStmt.run(randomUUID(), userId, todayDate, now);
    logger.success(`Daily focus session started for user=${userId} date=${todayDate}`);

    return this.getStatus(userId, timezoneOffsetMin);
  }

  completeSession(userId: string, timezoneOffsetMin = 0): DaySessionStatus {
    const todayDate = this.getLocalDateStr(timezoneOffsetMin);
    const now = new Date().toISOString();
    const todayStats = sessionService.getTodayStats(userId, timezoneOffsetMin);

    const upsertStmt = this.db.prepare(`
      INSERT INTO day_sessions (id, user_id, date, status, started_at, completed_at, pomodoro_count, focus_minutes)
      VALUES (?, ?, ?, 'completed', ?, ?, ?, ?)
      ON CONFLICT(user_id, date) DO UPDATE SET
        status = 'completed',
        completed_at = excluded.completed_at,
        pomodoro_count = excluded.pomodoro_count,
        focus_minutes = excluded.focus_minutes
    `);

    upsertStmt.run(
      randomUUID(),
      userId,
      todayDate,
      now,
      now,
      todayStats.todayCount,
      todayStats.totalFocusMinutesToday
    );

    logger.success(
      `Daily focus session completed for user=${userId} date=${todayDate}: count=${todayStats.todayCount} focusMin=${todayStats.totalFocusMinutesToday}`
    );

    return this.getStatus(userId, timezoneOffsetMin);
  }
}

export const daySessionService = new DaySessionService();
