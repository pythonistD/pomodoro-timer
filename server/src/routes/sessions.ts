import { Router, Request, Response, NextFunction } from 'express';
import { CreateSessionSchema, TodayQuerySchema } from '../schemas/validation.js';
import { sessionService } from '../services/session.service.js';
import { requireUserId } from '../middleware/telegram-auth.js';

export const sessionsRouter = Router();

// POST /api/sessions - Record completed or cancelled session
sessionsRouter.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId: bodyUserId, ...rest } = CreateSessionSchema.parse(req.body);
    const userId = requireUserId(req, bodyUserId);
    const session = sessionService.createSession({ ...rest, userId } as any);
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
    const { userId: queryUserId } = TodayQuerySchema.parse(req.query);
    const userId = requireUserId(req, queryUserId);
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
    const { userId: queryUserId } = TodayQuerySchema.parse(req.query);
    const userId = requireUserId(req, queryUserId);
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
