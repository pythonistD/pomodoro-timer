import { createApp } from './app.js';
import { getDatabase, closeDatabase } from './db/index.js';
import { logger } from './utils/logger.js';

const PORT = Number(process.env.PORT) || 3001;

async function startServer(): Promise<void> {
  try {
    // Initialize database
    getDatabase();

    const app = createApp();

    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.success(`🚀 Pomodoro Backend Server running on http://0.0.0.0:${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/api/health`);
    });

    const shutdown = (signal: string) => {
      logger.info(`Received ${signal}. Gracefully shutting down...`);
      server.close(() => {
        closeDatabase();
        logger.success('Server closed successfully.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
