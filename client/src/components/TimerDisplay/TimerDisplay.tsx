import React from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import styles from './TimerDisplay.module.css';

interface TimerDisplayProps {
  secondsRemaining: number;
  totalDurationSeconds: number;
  mode: 'work' | 'short_break' | 'long_break';
  cycleIndex: number;
  isPaused: boolean;
  onTogglePause: () => void;
  onCancel: () => void;
}

export const TimerDisplay: React.FC<TimerDisplayProps> = ({
  secondsRemaining,
  totalDurationSeconds,
  mode,
  cycleIndex,
  isPaused,
  onTogglePause,
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
      <div className={`${styles.timerRingWrapper} ${isPaused ? styles.ringWrapperPaused : ''}`}>
        <svg className={styles.svgRing} viewBox="0 0 260 260">
          <circle
            className={styles.ringBackground}
            cx="130"
            cy="130"
            r={radius}
          />
          <circle
            className={`${styles.ringProgress} ${isPaused ? styles.progressPaused : ''}`}
            cx="130"
            cy="130"
            r={radius}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
          />
        </svg>

        <div className={styles.centerContent}>
          <span className={styles.modeLabel}>{modeTitle}</span>
          <span className={`${styles.timeString} ${isPaused ? styles.timePaused : ''}`} id="timer-display-string">
            {formattedTime}
          </span>
          {isPaused ? (
            <span className={styles.pausedBadge} id="timer-paused-badge">
              ⏸ Пауза
            </span>
          ) : mode === 'work' ? (
            <span className={styles.cycleBadge}>Помидор {cycleIndex} из 4</span>
          ) : (
            <span className={styles.cycleBadge}>
              {mode === 'long_break' ? 'Большой отдых' : 'Короткий отдых'}
            </span>
          )}
        </div>
      </div>

      <div className={styles.controlsRow}>
        <button
          id="toggle-pause-btn"
          className={`${styles.actionBtn} ${isPaused ? styles.resumeBtn : styles.pauseBtn}`}
          onClick={onTogglePause}
          aria-label={isPaused ? 'Продолжить таймер' : 'Поставить таймер на паузу'}
        >
          {isPaused ? <Play size={20} fill="currentColor" /> : <Pause size={20} fill="currentColor" />}
          <span>{isPaused ? 'Продолжить' : 'Пауза'}</span>
        </button>

        <button
          id="cancel-timer-btn"
          className={`${styles.actionBtn} ${styles.cancelBtn}`}
          onClick={onCancel}
          aria-label="Сбросить сессию"
        >
          <RotateCcw size={18} />
          <span>Сбросить</span>
        </button>
      </div>
    </div>
  );
};
