import React, { useState } from 'react';
import { X, Volume2, Vibrate } from 'lucide-react';
import type { UserSettings } from '../../api/client';
import styles from './SettingsModal.module.css';

interface SettingsModalProps {
  currentSettings: UserSettings;
  onSave: (settings: UserSettings) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  currentSettings,
  onSave,
  onClose,
}) => {
  const [workDuration, setWorkDuration] = useState(currentSettings.workDurationMin);
  const [shortBreak, setShortBreak] = useState(currentSettings.shortBreakMin);
  const [longBreak, setLongBreak] = useState(currentSettings.longBreakMin);
  const [sound, setSound] = useState(currentSettings.soundEnabled);
  const [vibration, setVibration] = useState(currentSettings.vibrationEnabled);

  const handleSave = () => {
    onSave({
      ...currentSettings,
      workDurationMin: workDuration,
      shortBreakMin: shortBreak,
      longBreakMin: longBreak,
      soundEnabled: sound,
      vibrationEnabled: vibration,
    });
    onClose();
  };

  return (
    <div className={styles.backdrop} id="settings-backdrop" onClick={onClose}>
      <div className={styles.sheet} id="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Настройки таймера</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close Settings">
            <X size={20} />
          </button>
        </div>

        {/* Work Duration */}
        <div className={styles.section}>
          <div className={styles.sectionLabel}>
            <span>Длительность фокуса</span>
            <span className={styles.sectionValue}>{workDuration} мин</span>
          </div>
          <div className={styles.pillsRow}>
            {[15, 20, 25, 30, 45, 60].map((mins) => (
              <button
                key={mins}
                className={`${styles.pillBtn} ${workDuration === mins ? styles.pillBtnActive : ''}`}
                onClick={() => setWorkDuration(mins)}
              >
                {mins}м
              </button>
            ))}
          </div>
        </div>

        {/* Short Break Duration */}
        <div className={styles.section}>
          <div className={styles.sectionLabel}>
            <span>Короткий перерыв</span>
            <span className={styles.sectionValue} style={{ color: '#43a047' }}>{shortBreak} мин</span>
          </div>
          <div className={styles.pillsRow}>
            {[3, 5, 8, 10, 15].map((mins) => (
              <button
                key={mins}
                className={`${styles.pillBtn} ${shortBreak === mins ? styles.pillBtnActive : ''}`}
                onClick={() => setShortBreak(mins)}
              >
                {mins}м
              </button>
            ))}
          </div>
        </div>

        {/* Long Break Duration */}
        <div className={styles.section}>
          <div className={styles.sectionLabel}>
            <span>Длинный перерыв (каждые 4 томата)</span>
            <span className={styles.sectionValue} style={{ color: '#43a047' }}>{longBreak} мин</span>
          </div>
          <div className={styles.pillsRow}>
            {[10, 15, 20, 25, 30].map((mins) => (
              <button
                key={mins}
                className={`${styles.pillBtn} ${longBreak === mins ? styles.pillBtnActive : ''}`}
                onClick={() => setLongBreak(mins)}
              >
                {mins}м
              </button>
            ))}
          </div>
        </div>

        {/* Sound Toggle */}
        <div className={styles.toggleRow}>
          <span className={styles.toggleLabel}>
            <Volume2 size={20} />
            Звуковой сигнал
          </span>
          <div
            id="sound-toggle-switch"
            className={`${styles.switch} ${sound ? styles.switchActive : ''}`}
            onClick={() => setSound(!sound)}
          >
            <div className={styles.switchKnob} />
          </div>
        </div>

        {/* Vibration Toggle */}
        <div className={styles.toggleRow}>
          <span className={styles.toggleLabel}>
            <Vibrate size={20} />
            Вибрация (Haptic)
          </span>
          <div
            id="vibration-toggle-switch"
            className={`${styles.switch} ${vibration ? styles.switchActive : ''}`}
            onClick={() => setVibration(!vibration)}
          >
            <div className={styles.switchKnob} />
          </div>
        </div>

        <button id="save-settings-btn" className={styles.saveBtn} onClick={handleSave}>
          Сохранить настройки
        </button>
      </div>
    </div>
  );
};
