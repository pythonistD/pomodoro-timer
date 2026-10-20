import React from 'react';
import { X } from 'lucide-react';
import styles from './TimerDisplay.module.css';

interface TimerDisplayProps {
  secondsRemaining: number;
  totalDurationSeconds: number;
  mode: 'work' | 'short_break' | 'long_break';
  cycleIndex: number;
  onCancel: () => void;
}

export const TimerDisplay: React.FC<TimerDisplayProps> = ({
  secondsRemaining,
  totalDurationSeconds,
  mode,
  cycleIndex,
  onCancel,
}) => {
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // SVG circle calculations
  const radius = 110;
  const circumference = 2 * Math.PI * radius;
  const progressRatio = totalDurationSeconds > 0 ? secondsRemaining / totalDurationSeconds : 0;
  const strokeDashoffset = circumference - progressRatio * circumference;

  const modeTitle = mode === 'work' ? 'Фокус' : mode === 'long_break' ? 'Длинный отдых' : 'Перерыв';

  return (
    <div className={styles.container}>
      <div className={styles.timerRingWrapper}>
        <svg className={styles.svgRing} viewBox="0 0 260 260">
          <circle
            className={styles.ringBackground}
            cx="130"
            cy="130"
            r={radius}
          />
          <circle
            className={styles.ringProgress}
            cx="130"
            cy="130"
            r={radius}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
          />
        </svg>

        <div className={styles.centerContent}>
          <span className={styles.modeLabel}>{modeTitle}</span>
          <span className={styles.timeString} id="timer-display-string">{formattedTime}</span>
          {mode === 'work' && (
            <span className={styles.cycleBadge}>Помидор {cycleIndex} из 4</span>
          )}
        </div>
      </div>

      <button
        id="cancel-timer-btn"
        className={styles.cancelBtn}
        onClick={onCancel}
        aria-label="Cancel Session"
      >
        <X size={18} />
        <span>Сбросить</span>
      </button>
    </div>
  );
};
