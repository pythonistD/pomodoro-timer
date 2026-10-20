import { Router, Request, Response, NextFunction } from 'express';
import { GetSettingsQuerySchema, UpdateSettingsSchema } from '../schemas/validation.js';
import { settingsService } from '../services/settings.service.js';
import { requireUserId } from '../middleware/telegram-auth.js';

export const settingsRouter = Router();

// GET /api/settings - Get settings for user
settingsRouter.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId: queryUserId } = GetSettingsQuerySchema.parse(req.query);
    const userId = requireUserId(req, queryUserId);
    const settings = settingsService.getSettings(userId);

    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/settings - Update settings for user
settingsRouter.put('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId: bodyUserId, ...rest } = UpdateSettingsSchema.parse(req.body);
    const userId = requireUserId(req, bodyUserId);
    const updatedSettings = settingsService.updateSettings({ ...rest, userId });

    res.json({
      success: true,
      data: updatedSettings,
    });
  } catch (error) {
    next(error);
  }
});
