import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { setupTestDatabase, closeDatabase } from '../src/db/index.js';

describe('Stats API (/api/stats)', () => {
  const app = createApp();

  beforeEach(() => {
    setupTestDatabase();
  });

  afterAll(() => {
    closeDatabase();
  });

  it('should compute weekly summary statistics accurately', async () => {
    const userId = 'stats_user_1';
    const now = new Date();

    // Completed work 1 (yesterday)
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    await request(app).post('/api/sessions').send({
      userId,
      type: 'work',
      startedAt: yesterday.toISOString(),
      endedAt: new Date(yesterday.getTime() + 1800 * 1000).toISOString(),
      plannedDurationSec: 1800,
      actualDurationSec: 1800,
      status: 'completed',
      cycleIndex: 1,
    });

    // Completed work 2 (today)
    await request(app).post('/api/sessions').send({
      userId,
      type: 'work',
      startedAt: now.toISOString(),
      endedAt: new Date(now.getTime() + 1800 * 1000).toISOString(),
      plannedDurationSec: 1800,
      actualDurationSec: 1800,
      status: 'completed',
      cycleIndex: 2,
    });

    // Cancelled work 3 (today)
    await request(app).post('/api/sessions').send({
      userId,
      type: 'work',
      startedAt: now.toISOString(),
      endedAt: new Date(now.getTime() + 600 * 1000).toISOString(),
      plannedDurationSec: 1800,
      actualDurationSec: 600,
      status: 'cancelled',
      cycleIndex: 3,
    });

    const res = await request(app).get(`/api/stats/summary?userId=${userId}&period=week`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.period).toBe('week');
    expect(res.body.data.totalCompletedWork).toBe(2);
    expect(res.body.data.totalCancelledWork).toBe(1);
    expect(res.body.data.completionRatePercent).toBe(67); // 2 / 3 = 66.6% -> 67%
    expect(res.body.data.totalFocusMinutes).toBe(60); // 1800 + 1800 = 3600s = 60m
    expect(res.body.data.dailyBreakdown.length).toBe(7);
  });

  it('should compute density and hourly distribution for a given date', async () => {
    const userId = 'density_user_1';
    const targetDate = '2026-10-20';

    // Morning session 1: 08:00 - 08:30 (30 min)
    await request(app).post('/api/sessions').send({
      userId,
      type: 'work',
      startedAt: `${targetDate}T08:00:00.000Z`,
      endedAt: `${targetDate}T08:30:00.000Z`,
      plannedDurationSec: 1800,
      actualDurationSec: 1800,
      status: 'completed',
      cycleIndex: 1,
    });

    // Morning session 2: 08:35 - 09:05 (30 min, gap 5 min)
    await request(app).post('/api/sessions').send({
      userId,
      type: 'work',
      startedAt: `${targetDate}T08:35:00.000Z`,
      endedAt: `${targetDate}T09:05:00.000Z`,
      plannedDurationSec: 1800,
      actualDurationSec: 1800,
      status: 'completed',
      cycleIndex: 2,
    });

    // Afternoon session 3: 14:00 - 14:30 (30 min, gap ~5 hours)
    await request(app).post('/api/sessions').send({
      userId,
      type: 'work',
      startedAt: `${targetDate}T14:00:00.000Z`,
      endedAt: `${targetDate}T14:30:00.000Z`,
      plannedDurationSec: 1800,
      actualDurationSec: 1800,
      status: 'completed',
      cycleIndex: 3,
    });

    const res = await request(app).get(`/api/stats/density?userId=${userId}&date=${targetDate}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.targetDate).toBe(targetDate);
    expect(res.body.data.totalSessionsOnDate).toBe(3);
    expect(res.body.data.totalFocusMinutesOnDate).toBe(90);
    expect(res.body.data.firstSessionStartedAt).toBe(`${targetDate}T08:00:00.000Z`);
    expect(res.body.data.lastSessionEndedAt).toBe(`${targetDate}T14:30:00.000Z`);
    expect(res.body.data.hourlyDistribution.length).toBe(24);

    // Check specific hourly buckets
    const hour8 = res.body.data.hourlyDistribution.find((h: any) => h.hour === 8);
    const hour14 = res.body.data.hourlyDistribution.find((h: any) => h.hour === 14);
    const hour20 = res.body.data.hourlyDistribution.find((h: any) => h.hour === 20);

    expect(hour8.completedPomodoros).toBe(2);
    expect(hour14.completedPomodoros).toBe(1);
    expect(hour20.completedPomodoros).toBe(0);
    expect(res.body.data.averageGapMinutes).toBeGreaterThan(0);
  });
});
