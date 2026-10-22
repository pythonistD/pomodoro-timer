import React from 'react';
import { Settings, Volume2, VolumeX, Vibrate, VibrateOff, Flag } from 'lucide-react';
import { formatTomatoCount } from '../../utils/format';
import { TomatoIcon } from '../common/TomatoIcon';
import styles from './Header.module.css';

interface HeaderProps {
  todayCount: number;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  onToggleSound: () => void;
  onToggleVibration: () => void;
  onOpenSettings: () => void;
  onEndDay?: () => void;
  showEndDay?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  todayCount,
  soundEnabled,
  vibrationEnabled,
  onToggleSound,
  onToggleVibration,
  onOpenSettings,
  onEndDay,
  showEndDay = false,
}) => {
  return (
    <header className={styles.header}>
      <div className={styles.topRow}>
        <div className={styles.counterBadge} id="today-counter-badge">
          <TomatoIcon size={19} className={styles.tomatoIcon} />
          <span>{formatTomatoCount(todayCount, 'томат')}</span>
        </div>

        <div className={styles.controlsGroup}>
          <button
            id="toggle-sound-btn"
            className={`${styles.iconBtn} ${!soundEnabled ? styles.iconBtnMuted : ''}`}
            onClick={onToggleSound}
            title={soundEnabled ? 'Звук включен' : 'Звук выключен'}
            aria-label="Toggle Sound"
          >
            {soundEnabled ? <Volume2 size={19} /> : <VolumeX size={19} />}
          </button>

          <button
            id="toggle-vibration-btn"
            className={`${styles.iconBtn} ${!vibrationEnabled ? styles.iconBtnMuted : ''}`}
            onClick={onToggleVibration}
            title={vibrationEnabled ? 'Вибрация включена' : 'Вибрация выключена'}
            aria-label="Toggle Vibration"
          >
            {vibrationEnabled ? <Vibrate size={19} /> : <VibrateOff size={19} />}
          </button>

          <button
            id="open-settings-btn"
            className={styles.iconBtn}
            onClick={onOpenSettings}
            title="Настройки"
            aria-label="Settings"
          >
            <Settings size={19} />
          </button>
        </div>
      </div>

      {showEndDay && onEndDay && (
        <div className={styles.endDayContainer}>
          <button
            id="end-day-button"
            className={styles.endDayBtn}
            onClick={onEndDay}
            title="Завершить день"
          >
            <Flag size={14} />
            <span>Закончить день</span>
          </button>
        </div>
      )}
    </header>
  );
};
