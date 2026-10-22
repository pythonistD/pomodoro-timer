import React from 'react';
import { Coffee, Sparkles, Play } from 'lucide-react';
import { formatTomatoCount } from '../../utils/format';
import { TomatoIcon } from '../common/TomatoIcon';
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
      <div className={styles.titleWrapper}>
        {isLongBreak ? (
          <h2 className={styles.title}>
            <Sparkles size={24} className={styles.titleIcon} />
            <span>{todayCount}-й помидор закрыт!</span>
          </h2>
        ) : (
          <h2 className={styles.title}>
            <TomatoIcon size={24} className={styles.titleIcon} />
            <span>Помидор завершен!</span>
          </h2>
        )}
      </div>

      <div className={styles.statsCard} id="break-info-card">
        <div className={styles.sectionHeader}>Сегодня сделано:</div>

        {/* Visual row of tomatoes completed today */}
        <div className={styles.tomatoesRow} id="break-tomatoes-row">
          {todayCount > 0 ? (
            Array.from({ length: todayCount }).map((_, idx) => (
              <span
                key={idx}
                className={styles.tomatoIconItem}
                style={{ animationDelay: `${Math.min(idx * 0.05, 0.6)}s` }}
                title={`Помидор #${idx + 1}`}
              >
                <TomatoIcon size={28} />
              </span>
            ))
          ) : (
            <span className={styles.emptyTomatoes}>Нет завершенных помидоров</span>
          )}
        </div>

        {/* Counter under the row of tomatoes */}
        <div className={styles.tomatoesCounter} id="break-today-counter">
          {formatTomatoCount(todayCount, 'помидор')}
        </div>

        <div className={styles.divider} />

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
