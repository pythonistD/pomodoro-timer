import React from 'react';
import { Power, Timer } from 'lucide-react';
import styles from './PowerButton.module.css';

interface PowerButtonProps {
  workDurationMin: number;
  onStart: () => void;
}

export const PowerButton: React.FC<PowerButtonProps> = ({ workDurationMin, onStart }) => {
  return (
    <div className={styles.container}>
      <div className={styles.durationBadge} id="work-duration-badge">
        <Timer size={18} />
        <span>Сессия фокуса: {workDurationMin} мин</span>
      </div>

      <div className={styles.buttonWrapper}>
        <div className={styles.glowRing} />
        <button
          id="power-start-button"
          className={styles.powerButton}
          onClick={onStart}
          aria-label="Start Pomodoro Timer"
        >
          <Power size={76} className={styles.icon} />
        </button>
      </div>

      <span className={styles.hint}>Нажмите кнопку, чтобы начать</span>
    </div>
  );
};
