import { useState, useEffect, useRef, useCallback } from 'react';
import {
  fetchSettings,
  updateSettings,
  fetchTodayStats,
  recordSession,
  fetchWeeklySummary,
  getDaySessionStatus,
  startDaySession,
  completeDaySession,
  type UserSettings,
  type DailyBreakdownItem,
} from './api/client';
import { telegramService } from './utils/telegram';
import { soundManager } from './utils/sound';
import { Header } from './components/Header/Header';
import { PowerButton } from './components/PowerButton/PowerButton';
import { TimerDisplay } from './components/TimerDisplay/TimerDisplay';
import { BreakPrompt } from './components/BreakPrompt/BreakPrompt';
import { WelcomeHub } from './components/WelcomeHub/WelcomeHub';
import { CelebrationModal } from './components/CelebrationModal/CelebrationModal';
import { SettingsModal } from './components/SettingsModal/SettingsModal';

type AppScreen = 'hub' | 'timer';
type TimerMode = 'idle_work' | 'running_work' | 'idle_break' | 'running_break';

export function App() {
  const userId = telegramService.getUserId();
  const userName = telegramService.getUserName();

  // Settings State
  const [settings, setSettings] = useState<UserSettings>({
    userId,
    workDurationMin: 30,
    shortBreakMin: 5,
    longBreakMin: 15,
    longBreakInterval: 4,
    soundEnabled: true,
    vibrationEnabled: true,
  });

  // App Navigation & Session State
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('hub');
  const [timerMode, setTimerMode] = useState<TimerMode>('idle_work');
  const [isDayCompleted, setIsDayCompleted] = useState(false);

  // Stats State
  const [todayCount, setTodayCount] = useState(0);
  const [currentCycle, setCurrentCycle] = useState(1);
  const [totalFocusMinutesToday, setTotalFocusMinutesToday] = useState(0);
  const [weeklyBreakdown, setWeeklyBreakdown] = useState<DailyBreakdownItem[]>([]);
  const [weeklyFocusMinutes, setWeeklyFocusMinutes] = useState(0);
  const [weeklyPomodoros, setWeeklyPomodoros] = useState(0);

  // Timer State
  const [secondsRemaining, setSecondsRemaining] = useState(30 * 60);
  const [totalDurationSeconds, setTotalDurationSeconds] = useState(30 * 60);
  const targetEndTimeRef = useRef<number | null>(null);
  const sessionStartTimeRef = useRef<string | null>(null);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // 1. Initial Load & Sync
  useEffect(() => {
    telegramService.init();

    const loadData = async () => {
      try {
        const [loadedSettings, todayStats, weeklyData, dayStatus] = await Promise.all([
          fetchSettings(userId),
          fetchTodayStats(userId),
          fetchWeeklySummary(userId),
          getDaySessionStatus(userId),
        ]);

        setSettings(loadedSettings);
        setTodayCount(todayStats.todayCount);
        setCurrentCycle(todayStats.currentCycleIndex || 1);
        setTotalFocusMinutesToday(todayStats.totalFocusMinutesToday);

        setWeeklyBreakdown(weeklyData.dailyBreakdown);
        setWeeklyFocusMinutes(weeklyData.totalFocusMinutes);
        setWeeklyPomodoros(weeklyData.totalCompletedWork);

        if (dayStatus.status === 'completed') {
          setIsDayCompleted(true);
          setCurrentScreen('hub');
        } else if (dayStatus.status === 'active') {
          setCurrentScreen('timer');
          setTimerMode('idle_work');
        } else {
          setCurrentScreen('hub');
        }
      } catch (err) {
        console.warn('Initial data load warning:', err);
      }
    };

    loadData();
  }, [userId]);

  // Determine current active break duration (long break on every 4th)
  const isNextBreakLong = (todayCount + 1) % settings.longBreakInterval === 0;
  const currentBreakDurationMin = isNextBreakLong ? settings.longBreakMin : settings.shortBreakMin;

  // 2. Timer Loop (Delta Time with Date.now() for accurate background handling)
  const handleSessionComplete = useCallback(async () => {
    const isWorkSession = timerMode === 'running_work';
    const nowIso = new Date().toISOString();
    const startIso = sessionStartTimeRef.current || nowIso;

    soundManager.playCompletionChime(settings.soundEnabled);
    telegramService.hapticNotification('success', settings.vibrationEnabled);

    if (isWorkSession) {
      const newTodayCount = todayCount + 1;
      setTodayCount(newTodayCount);
      setTotalFocusMinutesToday((prev) => prev + settings.workDurationMin);

      // Transition to Green screen: idle_break
      setTimerMode('idle_break');

      // Record work session
      try {
        await recordSession({
          userId,
          type: 'work',
          startedAt: startIso,
          endedAt: nowIso,
          plannedDurationSec: settings.workDurationMin * 60,
          actualDurationSec: settings.workDurationMin * 60,
          status: 'completed',
          cycleIndex: ((todayCount) % 4) + 1,
        });
      } catch (e) {
        console.warn('Session recording error:', e);
      }
    } else {
      // Break session completed -> Transition back to Red screen: idle_work
      setTimerMode('idle_work');
      setCurrentCycle((prev) => (prev % 4) + 1);

      try {
        await recordSession({
          userId,
          type: isNextBreakLong ? 'long_break' : 'short_break',
          startedAt: startIso,
          endedAt: nowIso,
          plannedDurationSec: currentBreakDurationMin * 60,
          actualDurationSec: currentBreakDurationMin * 60,
          status: 'completed',
          cycleIndex: currentCycle,
        });
      } catch (e) {
        console.warn('Break recording error:', e);
      }
    }

    targetEndTimeRef.current = null;
    sessionStartTimeRef.current = null;
  }, [
    timerMode,
    settings,
    todayCount,
    userId,
    isNextBreakLong,
    currentBreakDurationMin,
    currentCycle,
  ]);

  useEffect(() => {
    if (timerMode !== 'running_work' && timerMode !== 'running_break') {
      return;
    }

    const interval = setInterval(() => {
      if (!targetEndTimeRef.current) return;
      const remainingMs = targetEndTimeRef.current - Date.now();
      const remainingSec = Math.max(0, Math.round(remainingMs / 1000));

      setSecondsRemaining(remainingSec);

      if (remainingSec <= 0) {
        clearInterval(interval);
        handleSessionComplete();
      }
    }, 250);

    return () => clearInterval(interval);
  }, [timerMode, handleSessionComplete]);

  // 3. Start Work Pomodoro
  const startWorkTimer = () => {
    const durationSec = settings.workDurationMin * 60;
    setTotalDurationSeconds(durationSec);
    setSecondsRemaining(durationSec);
    targetEndTimeRef.current = Date.now() + durationSec * 1000;
    sessionStartTimeRef.current = new Date().toISOString();

    soundManager.playClickSound(settings.soundEnabled);
    telegramService.hapticImpact('medium', settings.vibrationEnabled);

    setTimerMode('running_work');
  };

  // 4. Start Break Timer
  const startBreakTimer = () => {
    const durationSec = currentBreakDurationMin * 60;
    setTotalDurationSeconds(durationSec);
    setSecondsRemaining(durationSec);
    targetEndTimeRef.current = Date.now() + durationSec * 1000;
    sessionStartTimeRef.current = new Date().toISOString();

    soundManager.playClickSound(settings.soundEnabled);
    telegramService.hapticImpact('medium', settings.vibrationEnabled);

    setTimerMode('running_break');
  };

  // 5. Cancel Active Timer
  const cancelActiveTimer = () => {
    telegramService.hapticImpact('light', settings.vibrationEnabled);
    targetEndTimeRef.current = null;
    sessionStartTimeRef.current = null;

    if (timerMode === 'running_work') {
      setTimerMode('idle_work');
    } else {
      setTimerMode('idle_work');
    }
  };

  // 6. Day Session Actions
  const handleStartDaySession = async () => {
    telegramService.hapticImpact('heavy', settings.vibrationEnabled);
    soundManager.playClickSound(settings.soundEnabled);

    try {
      await startDaySession(userId);
    } catch {
      // Ignored
    }
    setCurrentScreen('timer');
    setTimerMode('idle_work');
  };

  const handleEndDaySession = async () => {
    telegramService.hapticNotification('success', settings.vibrationEnabled);
    try {
      await completeDaySession(userId);
      setIsDayCompleted(true);
    } catch (e) {
      console.warn('Day completion error:', e);
    }
    setShowCelebration(true);
  };

  const handleCelebrationDone = async () => {
    setShowCelebration(false);
    setCurrentScreen('hub');

    // Refresh weekly stats
    try {
      const summary = await fetchWeeklySummary(userId);
      setWeeklyBreakdown(summary.dailyBreakdown);
      setWeeklyFocusMinutes(summary.totalFocusMinutes);
      setWeeklyPomodoros(summary.totalCompletedWork);
    } catch {
      // Ignored
    }
  };

  // 7. Settings Toggles & Updates
  const handleToggleSound = async () => {
    const newSettings = { ...settings, soundEnabled: !settings.soundEnabled };
    setSettings(newSettings);
    telegramService.hapticImpact('light', newSettings.vibrationEnabled);
    try {
      await updateSettings(newSettings);
    } catch {
      // Ignored
    }
  };

  const handleToggleVibration = async () => {
    const newSettings = { ...settings, vibrationEnabled: !settings.vibrationEnabled };
    setSettings(newSettings);
    telegramService.hapticImpact('light', newSettings.vibrationEnabled);
    try {
      await updateSettings(newSettings);
    } catch {
      // Ignored
    }
  };

  const handleSaveSettings = async (newSettings: UserSettings) => {
    setSettings(newSettings);
    try {
      await updateSettings(newSettings);
    } catch {
      // Ignored
    }
  };

  // Compute CSS Theme Class
  let modeClass = 'mode-work';
  if (currentScreen === 'hub') {
    modeClass = 'mode-hub';
  } else if (timerMode === 'idle_break' || timerMode === 'running_break') {
    modeClass = 'mode-break';
  }

  return (
    <div className={`app-container ${modeClass}`} id="app-root-container">
      <Header
        todayCount={todayCount}
        soundEnabled={settings.soundEnabled}
        vibrationEnabled={settings.vibrationEnabled}
        onToggleSound={handleToggleSound}
        onToggleVibration={handleToggleVibration}
        onOpenSettings={() => setIsSettingsOpen(true)}
        showEndDay={currentScreen === 'timer'}
        onEndDay={handleEndDaySession}
      />

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', position: 'relative' }}>
        {currentScreen === 'hub' ? (
          <WelcomeHub
            userName={userName}
            isDayCompleted={isDayCompleted}
            dailyBreakdown={weeklyBreakdown}
            totalWeekFocusMinutes={weeklyFocusMinutes}
            totalWeekPomodoros={weeklyPomodoros}
            onStartSession={handleStartDaySession}
          />
        ) : (
          <>
            {timerMode === 'idle_work' && (
              <PowerButton
                workDurationMin={settings.workDurationMin}
                onStart={startWorkTimer}
              />
            )}

            {timerMode === 'running_work' && (
              <TimerDisplay
                secondsRemaining={secondsRemaining}
                totalDurationSeconds={totalDurationSeconds}
                mode="work"
                cycleIndex={currentCycle}
                onCancel={cancelActiveTimer}
              />
            )}

            {timerMode === 'idle_break' && (
              <BreakPrompt
                todayCount={todayCount}
                breakDurationMin={currentBreakDurationMin}
                isLongBreak={isNextBreakLong}
                onStartBreak={startBreakTimer}
              />
            )}

            {timerMode === 'running_break' && (
              <TimerDisplay
                secondsRemaining={secondsRemaining}
                totalDurationSeconds={totalDurationSeconds}
                mode={isNextBreakLong ? 'long_break' : 'short_break'}
                cycleIndex={currentCycle}
                onCancel={cancelActiveTimer}
              />
            )}
          </>
        )}
      </main>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal
          currentSettings={settings}
          onSave={handleSaveSettings}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {/* Celebration Modal on End Day */}
      {showCelebration && (
        <CelebrationModal
          todayPomodoros={todayCount}
          totalFocusMinutes={totalFocusMinutesToday}
          onClose={handleCelebrationDone}
        />
      )}
    </div>
  );
}

export default App;
