export const SCHEMA_SQL = `
-- Table for completed and cancelled Pomodoro work and break sessions
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('work', 'short_break', 'long_break')),
    started_at TEXT NOT NULL,
    ended_at TEXT NOT NULL,
    planned_duration_sec INTEGER NOT NULL,
    actual_duration_sec INTEGER NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('completed', 'cancelled')),
    cycle_index INTEGER NOT NULL CHECK(cycle_index BETWEEN 1 AND 4),
    gap_from_previous_sec INTEGER,
    metadata TEXT DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_started ON sessions(user_id, started_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user_type_status ON sessions(user_id, type, status);

-- Table for user preferences and timer settings
CREATE TABLE IF NOT EXISTS settings (
    user_id TEXT PRIMARY KEY,
    work_duration_min INTEGER NOT NULL DEFAULT 30,
    short_break_min INTEGER NOT NULL DEFAULT 5,
    long_break_min INTEGER NOT NULL DEFAULT 15,
    long_break_interval INTEGER NOT NULL DEFAULT 4,
    sound_enabled INTEGER NOT NULL DEFAULT 1,
    vibration_enabled INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Table for daily focus sessions (tracks whether user started/completed their work day)
CREATE TABLE IF NOT EXISTS day_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('active', 'completed')),
    started_at TEXT NOT NULL,
    completed_at TEXT,
    pomodoro_count INTEGER NOT NULL DEFAULT 0,
    focus_minutes INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_day_sessions_user_date ON day_sessions(user_id, date);
`;

export interface DaySessionRow {
  id: string;
  user_id: string;
  date: string;
  status: 'active' | 'completed';
  started_at: string;
  completed_at: string | null;
  pomodoro_count: number;
  focus_minutes: number;
  created_at: string;
}

export interface SessionRow {
  id: string;
  user_id: string;
  type: 'work' | 'short_break' | 'long_break';
  started_at: string;
  ended_at: string;
  planned_duration_sec: number;
  actual_duration_sec: number;
  status: 'completed' | 'cancelled';
  cycle_index: number;
  gap_from_previous_sec: number | null;
  metadata: string;
  created_at: string;
}

export interface SettingsRow {
  user_id: string;
  work_duration_min: number;
  short_break_min: number;
  long_break_min: number;
  long_break_interval: number;
  sound_enabled: number;
  vibration_enabled: number;
  updated_at: string;
}
