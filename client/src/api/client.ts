export interface UserSettings {
  userId: string;
  workDurationMin: number;
  shortBreakMin: number;
  longBreakMin: number;
  longBreakInterval: number;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

export interface TodayStats {
  todayCount: number;
  currentCycleIndex: number;
  totalFocusMinutesToday: number;
  lastSession: any | null;
}

export interface DailyBreakdownItem {
  date: string; // YYYY-MM-DD
  completedPomodoros: number;
  cancelledPomodoros: number;
  focusMinutes: number;
}

export interface WeeklySummary {
  period: 'day' | 'week' | 'month';
  totalCompletedWork: number;
  totalCancelledWork: number;
  completionRatePercent: number;
  totalFocusMinutes: number;
  averageDailyPomodoros: number;
  dailyBreakdown: DailyBreakdownItem[];
}

export interface DaySessionStatus {
  date: string;
  status: 'not_started' | 'active' | 'completed';
  startedAt: string | null;
  completedAt: string | null;
  pomodoroCount: number;
  focusMinutes: number;
}

const getTimezoneOffsetMin = (): number => {
  return new Date().getTimezoneOffset();
};

export async function fetchSettings(userId: string): Promise<UserSettings> {
  const res = await fetch(`/api/settings?userId=${encodeURIComponent(userId)}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to fetch settings');
  return json.data;
}

export async function updateSettings(settings: UserSettings): Promise<UserSettings> {
  const res = await fetch('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to update settings');
  return json.data;
}

export async function fetchTodayStats(userId: string): Promise<TodayStats> {
  const res = await fetch(
    `/api/sessions/today?userId=${encodeURIComponent(userId)}&timezoneOffsetMin=${getTimezoneOffsetMin()}`
  );
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to fetch today stats');
  return json.data;
}

export async function recordSession(payload: {
  userId: string;
  type: 'work' | 'short_break' | 'long_break';
  startedAt: string;
  endedAt: string;
  plannedDurationSec: number;
  actualDurationSec: number;
  status: 'completed' | 'cancelled';
  cycleIndex: number;
  metadata?: Record<string, any>;
}): Promise<any> {
  const res = await fetch('/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to record session');
  return json.data;
}

export async function fetchWeeklySummary(userId: string): Promise<WeeklySummary> {
  const res = await fetch(
    `/api/stats/summary?userId=${encodeURIComponent(userId)}&period=week&timezoneOffsetMin=${getTimezoneOffsetMin()}`
  );
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to fetch weekly summary');
  return json.data;
}

export async function getDaySessionStatus(userId: string): Promise<DaySessionStatus> {
  const res = await fetch(
    `/api/day-session/status?userId=${encodeURIComponent(userId)}&timezoneOffsetMin=${getTimezoneOffsetMin()}`
  );
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to fetch day session status');
  return json.data;
}

export async function startDaySession(userId: string): Promise<DaySessionStatus> {
  const res = await fetch('/api/day-session/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, timezoneOffsetMin: getTimezoneOffsetMin() }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to start day session');
  return json.data;
}

export async function completeDaySession(userId: string): Promise<DaySessionStatus> {
  const res = await fetch('/api/day-session/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, timezoneOffsetMin: getTimezoneOffsetMin() }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to complete day session');
  return json.data;
}
