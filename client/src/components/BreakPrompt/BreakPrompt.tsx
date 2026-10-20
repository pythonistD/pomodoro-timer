import React from 'react';
import { Coffee, Sparkles, Play } from 'lucide-react';
import styles from './BreakPrompt.module.css';

interface BreakPromptProps {
  todayCount: number;
  breakDurationMin: number;
  isLongBreak: boolean;
  onStartBreak: () => void;
}

export const BreakPrompt: React.FC<BreakPromptProps> = ({
  todayCount,
  breakDurationMin,
  isLongBreak,
  onStartBreak,
}) => {
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>
        {isLongBreak ? '🎉 4-й томат закрыт!' : '🍅 Помидор завершен!'}
      </h2>

      <div className={styles.statsCard} id="break-info-card">
        <div className={styles.todayDone}>
          Сегодня сделано: <strong>{todayCount} {todayCount === 1 ? 'томат' : todayCount >= 2 && todayCount <= 4 ? 'томата' : 'томатов'}</strong>
        </div>
        <div className={styles.breakTypeInfo} id="break-duration-badge">
          {isLongBreak ? <Sparkles size={18} /> : <Coffee size={18} />}
          <span>
            {isLongBreak ? `Длинный перерыв: ${breakDurationMin} мин` : `Короткий перерыв: ${breakDurationMin} мин`}
          </span>
        </div>
      </div>

      <button
        id="start-break-btn"
        className={styles.startBreakBtn}
        onClick={onStartBreak}
        aria-label="Start Break"
      >
        <Play size={22} fill="#ffffff" />
        <span>Начать перерыв</span>
      </button>
    </div>
  );
};
