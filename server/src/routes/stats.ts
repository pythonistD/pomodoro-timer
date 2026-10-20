import { Router, Request, Response, NextFunction } from 'express';
import { StatsSummaryQuerySchema, StatsDensityQuerySchema } from '../schemas/validation.js';
import { analyticsService } from '../services/analytics.service.js';
import { requireUserId } from '../middleware/telegram-auth.js';

export const statsRouter = Router();

// GET /api/stats/summary - Summary statistics for day/week/month
statsRouter.get('/summary', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId: queryUserId, period, timezoneOffsetMin } = StatsSummaryQuerySchema.parse(req.query);
    const userId = requireUserId(req, queryUserId);
    const summary = analyticsService.getSummary(userId, period, timezoneOffsetMin);

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/stats/density - Hourly distribution and density score for date
statsRouter.get('/density', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId: queryUserId, date, timezoneOffsetMin } = StatsDensityQuerySchema.parse(req.query);
    const userId = requireUserId(req, queryUserId);
    const density = analyticsService.getDensity(userId, date, timezoneOffsetMin);

    res.json({
      success: true,
      data: density,
    });
  } catch (error) {
    next(error);
  }
});
