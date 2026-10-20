import { Router, Request, Response, NextFunction } from 'express';
import { CreateSessionSchema, TodayQuerySchema } from '../schemas/validation.js';
import { sessionService } from '../services/session.service.js';

export const sessionsRouter = Router();

// POST /api/sessions - Record completed or cancelled session
sessionsRouter.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = CreateSessionSchema.parse(req.body);
    const session = sessionService.createSession(validatedData);
    res.status(201).json({
      success: true,
      data: session,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/sessions/today - Today's count, cycle, focus time
sessionsRouter.get('/today', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = TodayQuerySchema.parse(req.query);
    const timezoneOffsetMin = req.query.timezoneOffsetMin
      ? Number(req.query.timezoneOffsetMin)
      : 0;

    const stats = sessionService.getTodayStats(userId, timezoneOffsetMin);
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/sessions/history - Recent session history
sessionsRouter.get('/history', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = TodayQuerySchema.parse(req.query);
    const limit = req.query.limit ? Math.min(100, Math.max(1, Number(req.query.limit))) : 50;

    const history = sessionService.getRecentSessions(userId, limit);
    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    next(error);
  }
});
