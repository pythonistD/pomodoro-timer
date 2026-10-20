import { Database as DatabaseType } from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { getDatabase } from '../db/index.js';
import { SessionRow } from '../db/schema.js';
import { CreateSessionInput } from '../schemas/validation.js';
import { logger } from '../utils/logger.js';

/**
 * Вход сервиса: userId обязателен. В схеме он опционален, потому что в
 * продакшене приходит из проверенного Telegram initData, а не из тела запроса.
 */
type CreateSessionCommand = Omit<CreateSessionInput, 'userId'> & { userId: string };

export interface FormattedSession {
  id: string;
  userId: string;
  type: 'work' | 'short_break' | 'long_break';
  startedAt: string;
  endedAt: string;
  plannedDurationSec: number;
  actualDurationSec: number;
  status: 'completed' | 'cancelled';
  cycleIndex: number;
  gapFromPreviousSec: number | null;
  metadata: Record<string, any>;
  createdAt: string;
}

function mapRowToSession(row: SessionRow): FormattedSession {
  let metadata = {};
  try {
    metadata = JSON.parse(row.metadata || '{}');
  } catch {
    metadata = {};
  }

  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    plannedDurationSec: row.planned_duration_sec,
    actualDurationSec: row.actual_duration_sec,
    status: row.status,
    cycleIndex: row.cycle_index,
    gapFromPreviousSec: row.gap_from_previous_sec,
    metadata,
    createdAt: row.created_at,
  };
}

export class SessionService {
  private get db(): DatabaseType {
    return getDatabase();
  }

  /**
   * Save a completed or cancelled pomodoro work/break session
   */
  createSession(input: CreateSessionCommand): FormattedSession {
    const id = input.id || randomUUID();
    const startDate = new Date(input.startedAt);

    // Compute hour of day and day of week for easy heatmap indexing
    const enrichedMetadata = {
      ...input.metadata,
      hourOfDay: startDate.getUTCHours(),
      dayOfWeek: startDate.getUTCDay(), // 0 = Sunday, 1 = Monday, etc.
    };

    // Calculate gap from previous session for this user
    let gapFromPreviousSec: number | null = null;
    const prevStmt = this.db.prepare<[string], SessionRow>(`
      SELECT * FROM sessions
      WHERE user_id = ?
      ORDER BY ended_at DESC
      LIMIT 1
    `);
    const prevSession = prevStmt.get(input.userId);

    if (prevSession) {
      const prevEnded = new Date(prevSession.ended_at).getTime();
      const currentStarted = startDate.getTime();
      const diffSec = Math.floor((currentStarted - prevEnded) / 1000);
      gapFromPreviousSec = diffSec >= 0 ? diffSec : 0;
    }

    const insertStmt = this.db.prepare(`
      INSERT INTO sessions (
        id, user_id, type, started_at, ended_at, planned_duration_sec,
        actual_duration_sec, status, cycle_index, gap_from_previous_sec, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(
      id,
      input.userId,
      input.type,
      input.startedAt,
      input.endedAt,
      input.plannedDurationSec,
      input.actualDurationSec,
      input.status,
      input.cycleIndex,
      gapFromPreviousSec,
      JSON.stringify(enrichedMetadata)
    );

    logger.success(
      `Session recorded: [${input.type.toUpperCase()}] user=${input.userId} cycle=${input.cycleIndex} status=${input.status} actual=${input.actualDurationSec}s gap=${gapFromPreviousSec ?? 0}s`
    );

    const selectStmt = this.db.prepare<[string], SessionRow>('SELECT * FROM sessions WHERE id = ?');
    const createdRow = selectStmt.get(id);

    if (!createdRow) {
      throw new Error(`Failed to retrieve newly created session with id ${id}`);
    }

    return mapRowToSession(createdRow);
  }

  /**
   * Get stats for today (count of completed work pomodoros, total focus minutes, cycle position)
   */
  getTodayStats(userId: string, timezoneOffsetMin = 0): {
    todayCount: number;
    currentCycleIndex: number;
    totalFocusMinutesToday: number;
    lastSession: FormattedSession | null;
  } {
    // Calculate start of today in UTC adjusting for user timezone offset
    // timezoneOffsetMin: client's getTimezoneOffset() (e.g. -180 for UTC+3)
    const now = new Date();
    const localNow = new Date(now.getTime() - timezoneOffsetMin * 60 * 1000);
    const startOfLocalDay = new Date(
      Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate(), 0, 0, 0, 0)
    );
    const startOfDayUtc = new Date(startOfLocalDay.getTime() + timezoneOffsetMin * 60 * 1000).toISOString();

    const statsStmt = this.db.prepare<[string, string], { count: number; total_focus_sec: number | null }>(`
      SELECT 
        COUNT(*) as count, 
        SUM(actual_duration_sec) as total_focus_sec
      FROM sessions
      WHERE user_id = ? 
        AND type = 'work' 
        AND status = 'completed' 
        AND started_at >= ?
    `);

    const stats = statsStmt.get(userId, startOfDayUtc) || { count: 0, total_focus_sec: 0 };
    const todayCount = stats.count || 0;
    const totalFocusMinutesToday = Math.round((stats.total_focus_sec || 0) / 60);

    // Current cycle index (1..4) based on today's count:
    // If todayCount is 0 -> next is 1
    // If todayCount is 1 -> next is 2
    // If todayCount is 3 -> next is 4 (triggers long break next!)
    // If todayCount is 4 -> 4th was done, next is 1
    const currentCycleIndex = (todayCount % 4) === 0 && todayCount > 0 ? 4 : (todayCount % 4);

    const lastStmt = this.db.prepare<[string], SessionRow>(`
      SELECT * FROM sessions
      WHERE user_id = ?
      ORDER BY ended_at DESC
      LIMIT 1
    `);
    const lastRow = lastStmt.get(userId);

    return {
      todayCount,
      currentCycleIndex: currentCycleIndex || 1,
      totalFocusMinutesToday,
      lastSession: lastRow ? mapRowToSession(lastRow) : null,
    };
  }

  /**
   * Get recent sessions history for a user
   */
  getRecentSessions(userId: string, limit = 50): FormattedSession[] {
    const stmt = this.db.prepare<[string, number], SessionRow>(`
      SELECT * FROM sessions
      WHERE user_id = ?
      ORDER BY started_at DESC
      LIMIT ?
    `);
    return stmt.all(userId, limit).map(mapRowToSession);
  }
}

export const sessionService = new SessionService();
