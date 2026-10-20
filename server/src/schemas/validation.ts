import { z } from 'zod';

export const SessionTypeEnum = z.enum(['work', 'short_break', 'long_break']);
export const SessionStatusEnum = z.enum(['completed', 'cancelled']);

// userId необязателен на уровне схемы: в продакшене идентификатор берётся из
// проверенного Telegram initData, а из тела/query он нужен только в dev-режиме.
export const CreateSessionSchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string().min(1, 'userId is required').optional(),
  type: SessionTypeEnum,
  startedAt: z.string().datetime({ message: 'startedAt must be a valid ISO-8601 string' }),
  endedAt: z.string().datetime({ message: 'endedAt must be a valid ISO-8601 string' }),
  plannedDurationSec: z.number().int().positive('plannedDurationSec must be > 0'),
  actualDurationSec: z.number().int().nonnegative('actualDurationSec must be >= 0'),
  status: SessionStatusEnum,
  cycleIndex: z.number().int().min(1).max(4, 'cycleIndex must be between 1 and 4'),
  metadata: z.record(z.any()).optional().default({}),
});

export type CreateSessionInput = z.infer<typeof CreateSessionSchema>;

export const TodayQuerySchema = z.object({
  userId: z.string().min(1, 'userId query parameter is required').optional(),
});

export const StatsSummaryQuerySchema = z.object({
  userId: z.string().min(1, 'userId query parameter is required').optional(),
  period: z.enum(['day', 'week', 'month']).default('week'),
  timezoneOffsetMin: z.coerce.number().optional().default(0), // Offset in minutes (e.g. -180 for UTC+3)
});

export const StatsDensityQuerySchema = z.object({
  userId: z.string().min(1, 'userId query parameter is required').optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be in YYYY-MM-DD format')
    .optional(),
  timezoneOffsetMin: z.coerce.number().optional().default(0),
});

export const UpdateSettingsSchema = z.object({
  userId: z.string().min(1, 'userId is required').optional(),
  workDurationMin: z.number().int().min(1).max(180, 'workDurationMin must be between 1 and 180'),
  shortBreakMin: z.number().int().min(1).max(60, 'shortBreakMin must be between 1 and 60'),
  longBreakMin: z.number().int().min(1).max(90, 'longBreakMin must be between 1 and 90'),
  longBreakInterval: z.number().int().min(1).max(12, 'longBreakInterval must be between 1 and 12').default(4),
  soundEnabled: z.boolean().default(true),
  vibrationEnabled: z.boolean().default(true),
});

export type UpdateSettingsInput = z.infer<typeof UpdateSettingsSchema>;

export const GetSettingsQuerySchema = z.object({
  userId: z.string().min(1, 'userId query parameter is required').optional(),
});
