import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { daySessionService } from '../services/day-session.service.js';
import { requireUserId } from '../middleware/telegram-auth.js';

export const daySessionRouter = Router();

const UserQuerySchema = z.object({
  userId: z.string().min(1, 'userId is required').optional(),
  timezoneOffsetMin: z.coerce.number().optional().default(0),
});

const ActionBodySchema = z.object({
  userId: z.string().min(1, 'userId is required').optional(),
  timezoneOffsetMin: z.number().optional().default(0),
});

// GET /api/day-session/status
daySessionRouter.get('/status', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId: queryUserId, timezoneOffsetMin } = UserQuerySchema.parse(req.query);
    const userId = requireUserId(req, queryUserId);
    const status = daySessionService.getStatus(userId, timezoneOffsetMin);

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/day-session/start
daySessionRouter.post('/start', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId: bodyUserId, timezoneOffsetMin } = ActionBodySchema.parse(req.body);
    const userId = requireUserId(req, bodyUserId);
    const status = daySessionService.startSession(userId, timezoneOffsetMin);

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/day-session/complete
daySessionRouter.post('/complete', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId: bodyUserId, timezoneOffsetMin } = ActionBodySchema.parse(req.body);
    const userId = requireUserId(req, bodyUserId);
    const status = daySessionService.completeSession(userId, timezoneOffsetMin);

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    next(error);
  }
});
