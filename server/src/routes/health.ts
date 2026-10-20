import { Router, Request, Response } from 'express';
import { getDatabase } from '../db/index.js';

export const healthRouter = Router();

healthRouter.get('/', (_req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const check = db.pragma('quick_check') as Array<{ quick_check: string }>;
    const isDbOk = check && check.length > 0 && check[0].quick_check === 'ok';

    res.json({
      status: isDbOk ? 'healthy' : 'degraded',
      db: isDbOk ? 'ok' : 'check_failed',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
    });
  } catch (err: any) {
    res.status(503).json({
      status: 'unhealthy',
      db: 'error',
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});
