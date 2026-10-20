import React from 'react';
import { Calendar, Play, CheckCircle } from 'lucide-react';
import type { DailyBreakdownItem } from '../../api/client';
import styles from './WelcomeHub.module.css';

interface WelcomeHubProps {
  userName: string;
  isDayCompleted: boolean;
  dailyBreakdown: DailyBreakdownItem[];
  totalWeekFocusMinutes: number;
  totalWeekPomodoros: number;
  onStartSession: () => void;
}

const WEEKDAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const MONTHS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

export const WelcomeHub: React.FC<WelcomeHubProps> = ({
  userName,
  isDayCompleted,
  dailyBreakdown,
  totalWeekFocusMinutes,
  totalWeekPomodoros,
  onStartSession,
}) => {
  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className={styles.container}>
      <div className={styles.greetingBlock}>
        <h1 className={styles.greetingTitle}>Привет, {userName}! 👋</h1>
        <p className={styles.greetingSubtitle}>Готовы к продуктивному фокусу сегодня?</p>
      </div>

      <div className={styles.historyCard} id="welcome-history-card">
        <div className={styles.historyHeader}>
          <span className={styles.historyTitle}>
            <Calendar size={18} />
            Последние 7 дней
          </span>
          <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
            Недельный отчет
          </span>
        </div>

        <div className={styles.weekGrid}>
          {dailyBreakdown.map((item) => {
            const dateObj = new Date(`${item.date}T00:00:00`);
            const isToday = item.date === todayStr;
            const weekday = WEEKDAYS[dateObj.getDay()];
            const dayNum = dateObj.getDate();
            const monthName = MONTHS[dateObj.getMonth()];

            return (
              <div
                key={item.date}
                className={`${styles.dayColumn} ${isToday ? styles.dayColumnToday : ''}`}
              >
                <span className={styles.dayWeekday}>{weekday}</span>
                <span className={styles.dayDate}>{dayNum} {monthName}</span>

                {item.completedPomodoros > 0 ? (
                  <div className={styles.dayTomatoBadge}>
                    <span className={styles.dayTomatoIcon}>🍅</span>
                    <span className={styles.dayTomatoCount}>{item.completedPomodoros}</span>
                  </div>
                ) : (
                  <span className={styles.dayEmpty}>-</span>
                )}
              </div>
            );
          })}
        </div>

        <div className={styles.summaryRow}>
          <div className={styles.summaryItem}>
            <span className={styles.summaryValue}>{totalWeekPomodoros} 🍅</span>
            <span className={styles.summaryLabel}>Всего томатов</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryValue}>{Math.round(totalWeekFocusMinutes / 60 * 10) / 10} ч</span>
            <span className={styles.summaryLabel}>Чистый фокус</span>
          </div>
        </div>
      </div>

      {isDayCompleted ? (
        <div className={styles.completedBadge} id="day-completed-notice">
          <CheckCircle size={18} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 6 }} />
          Дневная норма закрыта! Отличный результат сегодня.
        </div>
      ) : null}

      <button
        id="start-day-session-btn"
        className={styles.startDayBtn}
        onClick={onStartSession}
        aria-label="Start Daily Session"
      >
        <Play size={22} fill="#ffffff" />
        <span>{isDayCompleted ? 'Продолжить работу' : 'Начать сессию'}</span>
      </button>
    </div>
  );
};
