import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import styles from './CelebrationModal.module.css';

interface CelebrationModalProps {
  todayPomodoros: number;
  totalFocusMinutes: number;
  onClose: () => void;
}

export const CelebrationModal: React.FC<CelebrationModalProps> = ({
  todayPomodoros,
  totalFocusMinutes,
  onClose,
}) => {
  useEffect(() => {
    // Launch celebratory confetti fireworks
    const duration = 2.5 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: ['#e53935', '#43a047', '#ffeb3b', '#ffffff'],
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: ['#e53935', '#43a047', '#ffeb3b', '#ffffff'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  }, []);

  const hours = Math.floor(totalFocusMinutes / 60);
  const minutes = totalFocusMinutes % 60;
  const timeFormatted = hours > 0 ? `${hours} ч ${minutes} мин` : `${minutes} мин`;

  return (
    <div className={styles.backdrop} id="celebration-backdrop">
      <div className={styles.modal} id="celebration-modal">
        <span className={styles.iconWrapper}>🎉</span>
        <h2 className={styles.title}>Поздравляем!</h2>
        <p className={styles.subtitle}>
          Отличная работа сегодня! Дневная сессия успешно завершена.
        </p>

        <div className={styles.statsBox}>
          <div className={styles.statItem}>
            <span className={styles.statValue}>🍅 {todayPomodoros}</span>
            <span className={styles.statLabel}>Помидоров</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{timeFormatted}</span>
            <span className={styles.statLabel}>Чистый фокус</span>
          </div>
        </div>

        <button
          id="celebration-done-btn"
          className={styles.doneBtn}
          onClick={onClose}
          aria-label="Done"
        >
          Отлично, к отчету!
        </button>
      </div>
    </div>
  );
};
