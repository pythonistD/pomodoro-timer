import { Router, Request, Response, NextFunction } from 'express';
import { GetSettingsQuerySchema, UpdateSettingsSchema } from '../schemas/validation.js';
import { settingsService } from '../services/settings.service.js';

export const settingsRouter = Router();

// GET /api/settings - Get settings for user
settingsRouter.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = GetSettingsQuerySchema.parse(req.query);
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
    const validatedData = UpdateSettingsSchema.parse(req.body);
    const updatedSettings = settingsService.updateSettings(validatedData);

    res.json({
      success: true,
      data: updatedSettings,
    });
  } catch (error) {
    next(error);
  }
});
