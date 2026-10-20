import crypto from 'node:crypto';
import { Request, Response, NextFunction } from 'express';

/**
 * Валидация подписи Telegram Mini App.
 *
 * Telegram подписывает initData строкой initData (HMAC-SHA256 от data-check-string
 * ключом, который сам является HMAC-SHA256 от токена бота с ключом "WebAppData").
 * Клиент присылает initData в заголовке X-Telegram-Init-Data; сервер проверяет
 * подпись и берёт user.id ИЗ ПРОВЕРЕННЫХ ДАННЫХ, а не из query-параметра.
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN?.trim();
const MAX_AUTH_AGE_SEC = Number(process.env.TELEGRAM_AUTH_MAX_AGE_SEC || 86400);
const REQUIRE_AUTH = process.env.REQUIRE_TELEGRAM_AUTH
  ? process.env.REQUIRE_TELEGRAM_AUTH === 'true'
  : Boolean(BOT_TOKEN);

export interface TelegramUser {
  id: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  authDate: number;
}

type VerifyResult = { ok: true; user: TelegramUser } | { ok: false; reason: string };

export function verifyInitData(initData: string, botToken: string): VerifyResult {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return { ok: false, reason: 'hash parameter is missing' };

  params.delete('hash');
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  if (computedHash !== hash) return { ok: false, reason: 'hash mismatch' };

  const authDate = Number(params.get('auth_date') || 0);
  if (authDate > 0 && MAX_AUTH_AGE_SEC > 0 && Date.now() / 1000 - authDate > MAX_AUTH_AGE_SEC) {
    return { ok: false, reason: 'initData is expired' };
  }

  let user: Record<string, unknown>;
  try {
    user = JSON.parse(params.get('user') || '{}');
  } catch {
    return { ok: false, reason: 'user field is not valid JSON' };
  }
  if (!user.id) return { ok: false, reason: 'user id is missing' };

  return {
    ok: true,
    user: {
      id: String(user.id),
      firstName: user.first_name as string | undefined,
      lastName: user.last_name as string | undefined,
      username: user.username as string | undefined,
      authDate,
    },
  };
}

function extractInitData(req: Request): string | undefined {
  const header = req.headers['x-telegram-init-data'];
  if (typeof header === 'string' && header.length > 0) return header;

  const body = req.body as Record<string, unknown> | undefined;
  if (body && typeof body.initData === 'string' && body.initData.length > 0) return body.initData;

  const query = req.query as Record<string, unknown> | undefined;
  if (query && typeof query.initData === 'string' && query.initData.length > 0) return query.initData;

  return undefined;
}

type RequestWithTelegram = Request & { telegramUser?: TelegramUser };

export function getTelegramUser(req: Request): TelegramUser | undefined {
  return (req as RequestWithTelegram).telegramUser;
}

/**
 * Идентификатор пользователя: приоритет у проверенного initData,
 * иначе (dev-режим без токена) — значение из запроса.
 */
export function resolveUserId(req: Request, fallback?: string): string {
  return getTelegramUser(req)?.id ?? fallback ?? '';
}

/**
 * Идентификатор пользователя для бизнес-логики. Если нет ни проверенного
 * initData, ни значения из запроса — 400: запрос без идентификатора бессмыслен.
 */
export function requireUserId(req: Request, fallback?: string): string {
  const id = resolveUserId(req, fallback);
  if (!id) {
    const error = new Error('userId is required') as Error & { status?: number };
    error.status = 400;
    throw error;
  }
  return id;
}

export function telegramAuth(req: Request, res: Response, next: NextFunction): void {
  const initData = extractInitData(req);

  if (!initData) {
    if (REQUIRE_AUTH) {
      res.status(401).json({ success: false, error: 'Telegram initData is required' });
      return;
    }
    next();
    return;
  }

  if (!BOT_TOKEN) {
    res.status(500).json({ success: false, error: 'TELEGRAM_BOT_TOKEN is not configured' });
    return;
  }

  const result = verifyInitData(initData, BOT_TOKEN);
  if (!result.ok) {
    res.status(401).json({ success: false, error: `Invalid Telegram initData: ${result.reason}` });
    return;
  }

  (req as RequestWithTelegram).telegramUser = result.user;
  next();
}
