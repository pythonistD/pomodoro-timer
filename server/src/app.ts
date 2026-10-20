import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { ZodError } from 'zod';
import path from 'path';
import fs from 'fs';
import { requestLogger, logger } from './utils/logger.js';
import { healthRouter } from './routes/health.js';
import { sessionsRouter } from './routes/sessions.js';
import { statsRouter } from './routes/stats.js';
import { settingsRouter } from './routes/settings.js';
import { daySessionRouter } from './routes/day-session.js';
import { telegramAuth } from './middleware/telegram-auth.js';

export function createApp(): express.Application {
  const app = express();

  // Basic security and parsing middleware.
  // CORS выключен по умолчанию: клиент и API отдаются с одного origin.
  // Разрешить отдельный origin (например, dev-сервер Vite на :5173) — через CORS_ORIGIN.
  const corsOrigin = process.env.CORS_ORIGIN?.trim();
  app.use(cors(corsOrigin ? { origin: corsOrigin } : { origin: false }));
  app.use(express.json());

  // Logging middleware
  app.use(requestLogger);

  // Mount API routers.
  // Healthcheck публичный, все остальные API-роуты требуют валидный Telegram initData.
  app.use('/api/health', healthRouter);
  app.use('/api', telegramAuth);
  app.use('/api/sessions', sessionsRouter);
  app.use('/api/stats', statsRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/day-session', daySessionRouter);

  // Serve static client frontend if dist exists
  const candidatePaths = [
    process.env.CLIENT_DIST_PATH,
    path.resolve(process.cwd(), '../client/dist'),
    path.resolve(process.cwd(), 'client/dist'),
    path.resolve(process.cwd(), 'public'),
  ].filter(Boolean) as string[];

  const clientDist = candidatePaths.find((p) => fs.existsSync(p));
  if (clientDist) {
    logger.info(`Serving static frontend from: ${clientDist}`);
    app.use(express.static(clientDist));
    app.get('*', (req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith('/api/')) {
        return next();
      }
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  // 404 handler for unknown routes
  app.use((req: Request, res: Response) => {
    logger.warn(`404 Not Found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
      success: false,
      error: 'Not Found',
      path: req.originalUrl,
    });
  });

  // Central error handling middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ZodError) {
      logger.warn('Zod validation error:', err.errors);
      res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
      return;
    }

    logger.error('Unhandled server error:', err);
    res.status(err.status || 500).json({
      success: false,
      error: err.message || 'Internal Server Error',
    });
  });

  return app;
}
