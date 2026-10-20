import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { setupTestDatabase, closeDatabase } from '../src/db/index.js';

describe('Settings API (/api/settings)', () => {
  const app = createApp();

  beforeEach(() => {
    setupTestDatabase();
  });

  afterAll(() => {
    closeDatabase();
  });

  it('should return default settings for a new user', async () => {
    const res = await request(app).get('/api/settings?userId=new_user');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.userId).toBe('new_user');
    expect(res.body.data.workDurationMin).toBe(30);
    expect(res.body.data.shortBreakMin).toBe(5);
    expect(res.body.data.longBreakMin).toBe(15);
    expect(res.body.data.longBreakInterval).toBe(4);
    expect(res.body.data.soundEnabled).toBe(true);
    expect(res.body.data.vibrationEnabled).toBe(true);
  });

  it('should update and persist user settings', async () => {
    const updatePayload = {
      userId: 'custom_user',
      workDurationMin: 45,
      shortBreakMin: 10,
      longBreakMin: 25,
      longBreakInterval: 4,
      soundEnabled: false,
      vibrationEnabled: false,
    };

    const putRes = await request(app).put('/api/settings').send(updatePayload);

    expect(putRes.status).toBe(200);
    expect(putRes.body.success).toBe(true);
    expect(putRes.body.data.workDurationMin).toBe(45);
    expect(putRes.body.data.shortBreakMin).toBe(10);
    expect(putRes.body.data.longBreakMin).toBe(25);
    expect(putRes.body.data.soundEnabled).toBe(false);
    expect(putRes.body.data.vibrationEnabled).toBe(false);

    // Verify subsequent GET returns updated settings
    const getRes = await request(app).get('/api/settings?userId=custom_user');
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.workDurationMin).toBe(45);
    expect(getRes.body.data.soundEnabled).toBe(false);
    expect(getRes.body.data.vibrationEnabled).toBe(false);
  });

  it('should reject invalid settings parameters', async () => {
    const invalidPayload = {
      userId: 'custom_user',
      workDurationMin: 500, // Exceeds max 180 min
      shortBreakMin: -5,
      longBreakMin: 0,
      longBreakInterval: 20, // Exceeds max 12
    };

    const res = await request(app).put('/api/settings').send(invalidPayload);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Validation Error');
  });
});
