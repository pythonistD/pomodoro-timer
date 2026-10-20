import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { setupTestDatabase, closeDatabase } from '../src/db/index.js';

describe('Day Session API (/api/day-session)', () => {
  const app = createApp();

  beforeEach(() => {
    setupTestDatabase();
  });

  afterAll(() => {
    closeDatabase();
  });

  it('should return not_started status for a new day', async () => {
    const res = await request(app).get('/api/day-session/status?userId=user_day_1');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('not_started');
    expect(res.body.data.pomodoroCount).toBe(0);
  });

  it('should start a daily session and switch status to active', async () => {
    const res = await request(app).post('/api/day-session/start').send({ userId: 'user_day_1' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('active');
    expect(res.body.data.startedAt).toBeDefined();
  });

  it('should complete a daily session and update completed stats', async () => {
    const userId = 'user_day_complete';

    // Start session
    await request(app).post('/api/day-session/start').send({ userId });

    // Log 2 completed pomodoros
    const now = new Date();
    for (let i = 1; i <= 2; i++) {
      await request(app).post('/api/sessions').send({
        userId,
        type: 'work',
        startedAt: now.toISOString(),
        endedAt: new Date(now.getTime() + 1800 * 1000).toISOString(),
        plannedDurationSec: 1800,
        actualDurationSec: 1800,
        status: 'completed',
        cycleIndex: i,
      });
    }

    // Complete day session
    const completeRes = await request(app).post('/api/day-session/complete').send({ userId });

    expect(completeRes.status).toBe(200);
    expect(completeRes.body.success).toBe(true);
    expect(completeRes.body.data.status).toBe('completed');
    expect(completeRes.body.data.pomodoroCount).toBe(2);
    expect(completeRes.body.data.focusMinutes).toBe(60);
    expect(completeRes.body.data.completedAt).toBeDefined();
  });
});
