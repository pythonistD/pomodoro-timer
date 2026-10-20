import { Database as DatabaseType } from 'better-sqlite3';
import { getDatabase } from '../db/index.js';
import { SessionRow } from '../db/schema.js';
import { logger } from '../utils/logger.js';

export interface DailyStatItem {
  date: string; // YYYY-MM-DD
  completedPomodoros: number;
  cancelledPomodoros: number;
  focusMinutes: number;
}

export interface SummaryStats {
  period: 'day' | 'week' | 'month';
  totalCompletedWork: number;
  totalCancelledWork: number;
  completionRatePercent: number;
  totalFocusMinutes: number;
  averageDailyPomodoros: number;
  dailyBreakdown: DailyStatItem[];
}

export interface HourlyDistributionItem {
  hour: number; // 0..23
  completedPomodoros: number;
  focusMinutes: number;
}

export interface DensityStats {
  targetDate: string; // YYYY-MM-DD
  totalSessionsOnDate: number;
  totalFocusMinutesOnDate: number;
  firstSessionStartedAt: string | null;
  lastSessionEndedAt: string | null;
  averageGapMinutes: number;
  densityScorePercent: number; // Focus duration relative to total span of the day
  hourlyDistribution: HourlyDistributionItem[];
}

export class AnalyticsService {
  private get db(): DatabaseType {
    return getDatabase();
  }

  /**
   * Calculate summary statistics for day / week / month
   */
  getSummary(userId: string, period: 'day' | 'week' | 'month' = 'week', timezoneOffsetMin = 0): SummaryStats {
    const now = new Date();
    const daysBack = period === 'day' ? 1 : period === 'week' ? 7 : 30;

    const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000).toISOString();

    const stmt = this.db.prepare<[string, string], SessionRow>(`
      SELECT * FROM sessions
      WHERE user_id = ? 
        AND type = 'work'
        AND started_at >= ?
      ORDER BY started_at ASC
    `);

    const sessions = stmt.all(userId, startDate);

    let totalCompleted = 0;
    let totalCancelled = 0;
    let totalFocusSec = 0;
    const dailyMap = new Map<string, { completed: number; cancelled: number; focusSec: number }>();

    for (const s of sessions) {
      // Adjust session timestamp for user's timezone to get YYYY-MM-DD
      const sessionDate = new Date(new Date(s.started_at).getTime() - timezoneOffsetMin * 60 * 1000);
      const dateKey = sessionDate.toISOString().slice(0, 10);

      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, { completed: 0, cancelled: 0, focusSec: 0 });
      }
      const dayEntry = dailyMap.get(dateKey)!;

      if (s.status === 'completed') {
        totalCompleted++;
        totalFocusSec += s.actual_duration_sec;
        dayEntry.completed++;
        dayEntry.focusSec += s.actual_duration_sec;
      } else {
        totalCancelled++;
        dayEntry.cancelled++;
      }
    }

    const totalWorkAttempts = totalCompleted + totalCancelled;
    const completionRatePercent =
      totalWorkAttempts > 0 ? Math.round((totalCompleted / totalWorkAttempts) * 100) : 0;
    const totalFocusMinutes = Math.round(totalFocusSec / 60);

    // Build day breakdown list
    const dailyBreakdown: DailyStatItem[] = [];
    // Generate dates for the period to include 0-session days
    for (let i = daysBack - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000 - timezoneOffsetMin * 60 * 1000);
      const dateKey = d.toISOString().slice(0, 10);
      const entry = dailyMap.get(dateKey) || { completed: 0, cancelled: 0, focusSec: 0 };
      dailyBreakdown.push({
        date: dateKey,
        completedPomodoros: entry.completed,
        cancelledPomodoros: entry.cancelled,
        focusMinutes: Math.round(entry.focusSec / 60),
      });
    }

    const activeDaysCount = dailyBreakdown.filter((d) => d.completedPomodoros > 0).length || 1;
    const averageDailyPomodoros = Number((totalCompleted / (daysBack === 1 ? 1 : activeDaysCount)).toFixed(1));

    logger.info(`Summary stats computed for user=${userId} period=${period}: completed=${totalCompleted} focusMin=${totalFocusMinutes}`);

    return {
      period,
      totalCompletedWork: totalCompleted,
      totalCancelledWork: totalCancelled,
      completionRatePercent,
      totalFocusMinutes,
      averageDailyPomodoros,
      dailyBreakdown,
    };
  }

  /**
   * Analyze focus density and hourly distribution on a specific day
   */
  getDensity(userId: string, targetDateStr?: string, timezoneOffsetMin = 0): DensityStats {
    const now = new Date();
    const dateStr =
      targetDateStr ||
      new Date(now.getTime() - timezoneOffsetMin * 60 * 1000).toISOString().slice(0, 10);

    // Start and end of the specified date in user's timezone converted to UTC ISO strings
    const startOfDayUtc = new Date(
      new Date(`${dateStr}T00:00:00.000Z`).getTime() + timezoneOffsetMin * 60 * 1000
    ).toISOString();
    const endOfDayUtc = new Date(
      new Date(`${dateStr}T23:59:59.999Z`).getTime() + timezoneOffsetMin * 60 * 1000
    ).toISOString();

    const stmt = this.db.prepare<[string, string, string], SessionRow>(`
      SELECT * FROM sessions
      WHERE user_id = ?
        AND type = 'work'
        AND started_at >= ?
        AND started_at <= ?
      ORDER BY started_at ASC
    `);

    const sessions = stmt.all(userId, startOfDayUtc, endOfDayUtc);

    // Initialize 24 hourly slots
    const hourlyDistribution: HourlyDistributionItem[] = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      completedPomodoros: 0,
      focusMinutes: 0,
    }));

    let totalFocusSec = 0;
    const gapsSec: number[] = [];

    for (let i = 0; i < sessions.length; i++) {
      const s = sessions[i];
      if (s.status === 'completed') {
        totalFocusSec += s.actual_duration_sec;

        // Determine user local hour
        const localSessionDate = new Date(new Date(s.started_at).getTime() - timezoneOffsetMin * 60 * 1000);
        const hour = localSessionDate.getUTCHours();
        if (hour >= 0 && hour < 24) {
          hourlyDistribution[hour].completedPomodoros += 1;
          hourlyDistribution[hour].focusMinutes += Math.round(s.actual_duration_sec / 60);
        }
      }

      // Check gap to subsequent work session on the same day
      if (i > 0) {
        const prevSession = sessions[i - 1];
        const gap = Math.max(
          0,
          Math.floor((new Date(s.started_at).getTime() - new Date(prevSession.ended_at).getTime()) / 1000)
        );
        gapsSec.push(gap);
      }
    }

    const firstSessionStartedAt = sessions.length > 0 ? sessions[0].started_at : null;
    const lastSessionEndedAt = sessions.length > 0 ? sessions[sessions.length - 1].ended_at : null;

    let averageGapMinutes = 0;
    if (gapsSec.length > 0) {
      const sumGaps = gapsSec.reduce((a, b) => a + b, 0);
      averageGapMinutes = Math.round((sumGaps / gapsSec.length) / 60);
    }

    // Density Score: ratio of actual focus time to the total active span from first session to last
    let densityScorePercent = 0;
    if (firstSessionStartedAt && lastSessionEndedAt) {
      const spanSec = Math.max(
        1,
        Math.floor((new Date(lastSessionEndedAt).getTime() - new Date(firstSessionStartedAt).getTime()) / 1000)
      );
      densityScorePercent = Math.min(100, Math.round((totalFocusSec / spanSec) * 100));
    }

    logger.info(
      `Density stats computed for user=${userId} date=${dateStr}: count=${sessions.length} avgGap=${averageGapMinutes}min densityScore=${densityScorePercent}%`
    );

    return {
      targetDate: dateStr,
      totalSessionsOnDate: sessions.length,
      totalFocusMinutesOnDate: Math.round(totalFocusSec / 60),
      firstSessionStartedAt,
      lastSessionEndedAt,
      averageGapMinutes,
      densityScorePercent,
      hourlyDistribution,
    };
  }
}

export const analyticsService = new AnalyticsService();
