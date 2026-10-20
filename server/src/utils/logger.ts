import { Request, Response, NextFunction } from 'express';

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | 'SUCCESS';

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

class Logger {
  private formatTime(): string {
    return new Date().toISOString();
  }

  private print(level: LogLevel, color: string, message: string, meta?: any): void {
    const time = `${COLORS.dim}[${this.formatTime()}]${COLORS.reset}`;
    const badge = `${color}${COLORS.bright}[${level.padEnd(7)}]${COLORS.reset}`;
    if (meta !== undefined) {
      console.log(`${time} ${badge} ${message}`, typeof meta === 'object' ? JSON.stringify(meta, null, 2) : meta);
    } else {
      console.log(`${time} ${badge} ${message}`);
    }
  }

  info(message: string, meta?: any): void {
    this.print('INFO', COLORS.blue, message, meta);
  }

  success(message: string, meta?: any): void {
    this.print('SUCCESS', COLORS.green, message, meta);
  }

  warn(message: string, meta?: any): void {
    this.print('WARN', COLORS.yellow, message, meta);
  }

  error(message: string, meta?: any): void {
    this.print('ERROR', COLORS.red, message, meta);
  }

  debug(message: string, meta?: any): void {
    if (process.env.DEBUG === 'true' || process.env.NODE_ENV !== 'production') {
      this.print('DEBUG', COLORS.magenta, message, meta);
    }
  }
}

export const logger = new Logger();

/**
 * Express middleware for logging incoming HTTP requests and response status with timing
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const { method, originalUrl, ip } = req;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    const statusColor =
      statusCode >= 500
        ? COLORS.red
        : statusCode >= 400
        ? COLORS.yellow
        : statusCode >= 300
        ? COLORS.cyan
        : COLORS.green;

    const logMsg = `${COLORS.bright}${method.padEnd(6)}${COLORS.reset} ${originalUrl} ${statusColor}${statusCode}${COLORS.reset} in ${duration}ms`;
    logger.info(logMsg);
  });

  next();
}
