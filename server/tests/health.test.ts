import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { setupTestDatabase, closeDatabase } from '../src/db/index.js';

describe('GET /api/health', () => {
  const app = createApp();

  beforeEach(() => {
    setupTestDatabase();
  });

  afterAll(() => {
    closeDatabase();
  });

  it('should return 200 with healthy status and db check', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.db).toBe('ok');
    expect(typeof res.body.uptimeSeconds).toBe('number');
    expect(typeof res.body.timestamp).toBe('string');
  });
});
