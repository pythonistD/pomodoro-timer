import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { setupTestDatabase, closeDatabase } from '../src/db/index.js';

describe('Sessions API (/api/sessions)', () => {
  const app = createApp();

  beforeEach(() => {
    setupTestDatabase();
  });

  afterAll(() => {
    closeDatabase();
  });

  it('should successfully record a completed work session', async () => {
    const payload = {
      userId: 'user_123',
      type: 'work',
      startedAt: '2026-10-20T08:00:00.000Z',
      endedAt: '2026-10-20T08:30:00.000Z',
      plannedDurationSec: 1800,
      actualDurationSec: 1800,
      status: 'completed',
      cycleIndex: 1,
      metadata: { pauseCount: 0, tag: 'coding' },
    };

    const res = await request(app).post('/api/sessions').send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.userId).toBe('user_123');
    expect(res.body.data.type).toBe('work');
    expect(res.body.data.status).toBe('completed');
    expect(res.body.data.plannedDurationSec).toBe(1800);
    expect(res.body.data.actualDurationSec).toBe(1800);
    expect(res.body.data.gapFromPreviousSec).toBeNull(); // First session has no gap
    expect(res.body.data.metadata.tag).toBe('coding');
    expect(res.body.data.metadata.hourOfDay).toBe(8);
  });

  it('should calculate gapFromPreviousSec between consecutive sessions', async () => {
    // Session 1: 08:00 to 08:30
    await request(app).post('/api/sessions').send({
      userId: 'user_123',
      type: 'work',
      startedAt: '2026-10-20T08:00:00.000Z',
      endedAt: '2026-10-20T08:30:00.000Z',
      plannedDurationSec: 1800,
      actualDurationSec: 1800,
      status: 'completed',
      cycleIndex: 1,
    });

    // Session 2: 08:35 to 09:05 (gap of 5 min = 300 sec)
    const res2 = await request(app).post('/api/sessions').send({
      userId: 'user_123',
      type: 'work',
      startedAt: '2026-10-20T08:35:00.000Z',
      endedAt: '2026-10-20T09:05:00.000Z',
      plannedDurationSec: 1800,
      actualDurationSec: 1800,
      status: 'completed',
      cycleIndex: 2,
    });

    expect(res2.status).toBe(201);
    expect(res2.body.data.gapFromPreviousSec).toBe(300);
  });

  it('should return 400 on invalid payload (missing userId, negative duration)', async () => {
    const invalidPayload = {
      type: 'work',
      startedAt: 'invalid-date',
      endedAt: '2026-10-20T08:30:00.000Z',
      plannedDurationSec: -100,
      actualDurationSec: -10,
      status: 'unknown_status',
      cycleIndex: 5, // Must be 1..4
    };

    const res = await request(app).post('/api/sessions').send(invalidPayload);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Validation Error');
    expect(res.body.details).toBeDefined();
    expect(res.body.details.length).toBeGreaterThan(0);
  });

  it('should accurately compute today stats for a user', async () => {
    const now = new Date();
    const todayIsoStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 9, 0, 0)).toISOString();
    const todayIsoEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 9, 30, 0)).toISOString();

    // Work session 1 completed today
    await request(app).post('/api/sessions').send({
      userId: 'user_stats',
      type: 'work',
      startedAt: todayIsoStart,
      endedAt: todayIsoEnd,
      plannedDurationSec: 1800,
      actualDurationSec: 1800,
      status: 'completed',
      cycleIndex: 1,
    });

    // Work session 2 cancelled today (should NOT count towards completed todayCount)
    await request(app).post('/api/sessions').send({
      userId: 'user_stats',
      type: 'work',
      startedAt: todayIsoStart,
      endedAt: todayIsoEnd,
      plannedDurationSec: 1800,
      actualDurationSec: 300,
      status: 'cancelled',
      cycleIndex: 2,
    });

    // Short break session completed today (should NOT count towards work todayCount)
    await request(app).post('/api/sessions').send({
      userId: 'user_stats',
      type: 'short_break',
      startedAt: todayIsoStart,
      endedAt: todayIsoEnd,
      plannedDurationSec: 300,
      actualDurationSec: 300,
      status: 'completed',
      cycleIndex: 1,
    });

    // Another completed work session
    await request(app).post('/api/sessions').send({
      userId: 'user_stats',
      type: 'work',
      startedAt: todayIsoStart,
      endedAt: todayIsoEnd,
      plannedDurationSec: 1800,
      actualDurationSec: 1800,
      status: 'completed',
      cycleIndex: 2,
    });

    const res = await request(app).get('/api/sessions/today?userId=user_stats');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.todayCount).toBe(2);
    expect(res.body.data.currentCycleIndex).toBe(2);
    expect(res.body.data.totalFocusMinutesToday).toBe(60); // 1800s + 1800s = 3600s = 60 min
    expect(res.body.data.lastSession).toBeDefined();
  });

  it('should return recent sessions history', async () => {
    for (let i = 1; i <= 3; i++) {
      await request(app).post('/api/sessions').send({
        userId: 'user_hist',
        type: 'work',
        startedAt: `2026-10-20T0${i}:00:00.000Z`,
        endedAt: `2026-10-20T0${i}:30:00.000Z`,
        plannedDurationSec: 1800,
        actualDurationSec: 1800,
        status: 'completed',
        cycleIndex: i,
      });
    }

    const res = await request(app).get('/api/sessions/history?userId=user_hist&limit=2');

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    expect(res.body.data[0].cycleIndex).toBe(3); // Most recent first
  });
});
