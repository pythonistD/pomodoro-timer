/**
 * Wrapper for Telegram WebApp SDK features (Haptics, User Info, Theme)
 * Works gracefully in both real Telegram clients and standalone browser dev.
 */

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        /** Подписанные данные инициализации: сервер проверяет их HMAC по токену бота. */
        initData?: string;
        initDataUnsafe?: {
          user?: {
            id?: number;
            first_name?: string;
            last_name?: string;
            username?: string;
          };
        };
        HapticFeedback?: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
        expand?: () => void;
        ready?: () => void;
        setHeaderColor?: (color: string) => void;
        setBackgroundColor?: (color: string) => void;
      };
    };
  }
}

class TelegramService {
  private get tg() {
    return typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;
  }

  init(): void {
    if (this.tg) {
      try {
        this.tg.ready?.();
        this.tg.expand?.();
      } catch (e) {
        console.warn('Telegram WebApp init warning:', e);
      }
    }
  }

  getUserId(): string {
    const tgUser = this.tg?.initDataUnsafe?.user;
    if (tgUser?.id) {
      return String(tgUser.id);
    }
    // Fallback for browser testing
    const stored = localStorage.getItem('pomodoro_user_id');
    if (stored) return stored;
    const newId = `user_${Math.random().toString(36).substring(2, 10)}`;
    localStorage.setItem('pomodoro_user_id', newId);
    return newId;
  }

  getUserName(): string {
    const tgUser = this.tg?.initDataUnsafe?.user;
    if (tgUser?.first_name) {
      return tgUser.first_name;
    }
    return 'Друг';
  }

  hapticImpact(style: 'light' | 'medium' | 'heavy' = 'medium', enabled = true): void {
    if (!enabled) return;
    try {
      this.tg?.HapticFeedback?.impactOccurred(style);
      // Fallback for standard mobile browsers (navigator.vibrate)
      if (!this.tg?.HapticFeedback && navigator.vibrate) {
        navigator.vibrate(style === 'heavy' ? 40 : style === 'medium' ? 25 : 15);
      }
    } catch {
      // Ignored
    }
  }

  hapticNotification(type: 'error' | 'success' | 'warning', enabled = true): void {
    if (!enabled) return;
    try {
      this.tg?.HapticFeedback?.notificationOccurred(type);
      if (!this.tg?.HapticFeedback && navigator.vibrate) {
        navigator.vibrate([30, 50, 30]);
      }
    } catch {
      // Ignored
    }
  }
}

export const telegramService = new TelegramService();
