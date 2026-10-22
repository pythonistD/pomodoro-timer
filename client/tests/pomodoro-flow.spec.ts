import { test, expect } from '@playwright/test';

test.describe('Pomodoro Timer Telegram Mini App E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start fresh
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('1. Welcome screen loads with 7-day stats and session start button', async ({ page }) => {
    await expect(page).toHaveTitle(/Pomodoro Focus Timer/);

    // Verify Welcome Hub elements
    const greeting = page.locator('h1');
    await expect(greeting).toContainText('Привет');

    const historyCard = page.locator('#welcome-history-card');
    await expect(historyCard).toBeVisible();
    await expect(historyCard).toContainText('Последние 7 дней');

    // Start Day Session Button
    const startBtn = page.locator('#start-day-session-btn');
    await expect(startBtn).toBeVisible();
    await expect(startBtn).toContainText('Начать сессию');
  });

  test('2. Start session transitions to red screen with duration badge and power button', async ({ page }) => {
    await page.locator('#start-day-session-btn').click();

    // Verify container mode class
    const container = page.locator('#app-root-container');
    await expect(container).toHaveClass(/mode-work/);

    // Verify duration badge above power button
    const durationBadge = page.locator('#work-duration-badge');
    await expect(durationBadge).toBeVisible();
    await expect(durationBadge).toContainText(/Сессия фокуса: 30 мин/i);

    // Verify Power button exists
    const powerBtn = page.locator('#power-start-button');
    await expect(powerBtn).toBeVisible();

    // Header counter and End Day button
    await expect(page.locator('#today-counter-badge')).toContainText('0 томатов');
    await expect(page.locator('#end-day-button')).toBeVisible();
  });

  test('3. Power button click starts timer and hides power button', async ({ page }) => {
    await page.locator('#start-day-session-btn').click();

    // Click power button
    await page.locator('#power-start-button').click();

    // Power button should hide
    await expect(page.locator('#power-start-button')).not.toBeVisible();

    // Digital timer display should appear with MM:SS format
    const timerString = page.locator('#timer-display-string');
    await expect(timerString).toBeVisible();
    await expect(timerString).toHaveText(/^(29:5[8-9]|30:00)$/);

    // Cancel button should be present
    const cancelBtn = page.locator('#cancel-timer-btn');
    await expect(cancelBtn).toBeVisible();

    // Cancel timer returns to idle power button
    await cancelBtn.click();
    await expect(page.locator('#power-start-button')).toBeVisible();
  });

  test('4. Settings modal allows customizing work/break durations and toggling sound/vibration', async ({ page }) => {
    await page.locator('#start-day-session-btn').click();

    // Open settings
    await page.locator('#open-settings-btn').click();
    const modal = page.locator('#settings-modal');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('Настройки таймера');

    // Select 25m work duration
    await page.getByRole('button', { name: '25м', exact: true }).first().click();

    // Toggle sound off
    await page.locator('#sound-toggle-switch').click();

    // Toggle vibration off
    await page.locator('#vibration-toggle-switch').click();

    // Save settings
    await page.locator('#save-settings-btn').click();
    await expect(modal).not.toBeVisible();

    // Verify badge updated to 25 min
    const durationBadge = page.locator('#work-duration-badge');
    await expect(durationBadge).toContainText(/Сессия фокуса: 25 мин/i);

    // Verify header toggle buttons reflect muted state
    const soundBtn = page.locator('#toggle-sound-btn');
    await expect(soundBtn).toHaveAttribute('title', 'Звук выключен');

    const vibeBtn = page.locator('#toggle-vibration-btn');
    await expect(vibeBtn).toHaveAttribute('title', 'Вибрация выключена');
  });

  test('5. Complete work session switches to Green Break screen, and End Day shows confetti celebration', async ({ page }) => {
    await page.locator('#start-day-session-btn').click();

    // Verify End Day Session & Confetti Celebration
    await page.locator('#end-day-button').click();

    const celebrationModal = page.locator('#celebration-modal');
    await expect(celebrationModal).toBeVisible();
    await expect(celebrationModal).toContainText('Поздравляем!');
    await expect(celebrationModal).toContainText('Отличная работа сегодня!');

    // Close celebration
    await page.locator('#celebration-done-btn').click();
    await expect(celebrationModal).not.toBeVisible();

    // Should return to Welcome Hub
    await expect(page.locator('#welcome-history-card')).toBeVisible();
  });

  test('6. Timer can be paused and resumed during active focus session', async ({ page }) => {
    await page.locator('#start-day-session-btn').click();
    await page.locator('#power-start-button').click();

    // Verify Pause button is visible
    const pauseBtn = page.locator('#toggle-pause-btn');
    await expect(pauseBtn).toBeVisible();
    await expect(pauseBtn).toContainText('Пауза');

    // Click Pause
    await pauseBtn.click();

    // Paused badge appears and button changes to "Продолжить"
    await expect(page.locator('#timer-paused-badge')).toBeVisible();
    await expect(page.locator('#timer-paused-badge')).toContainText('Пауза');
    await expect(pauseBtn).toContainText('Продолжить');

    // Check timer does not decrement while paused
    const timeAtPause = await page.locator('#timer-display-string').innerText();
    await page.waitForTimeout(1000);
    const timeAfterWait = await page.locator('#timer-display-string').innerText();
    expect(timeAtPause).toBe(timeAfterWait);

    // Resume timer
    await pauseBtn.click();
    await expect(pauseBtn).toContainText('Пауза');
    await expect(page.locator('#timer-paused-badge')).not.toBeVisible();
  });

  test('7. Header fits cleanly on mobile viewport (360px) without overflow', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.locator('#start-day-session-btn').click();

    // All header elements should be visible
    await expect(page.locator('#today-counter-badge')).toBeVisible();
    await expect(page.locator('#end-day-button')).toBeVisible();
    await expect(page.locator('#toggle-sound-btn')).toBeVisible();
    await expect(page.locator('#toggle-vibration-btn')).toBeVisible();
    await expect(page.locator('#open-settings-btn')).toBeVisible();

    // Verify no horizontal overflow in root or header
    const hasHorizontalOverflow = await page.evaluate(() => {
      const header = document.querySelector('header');
      const doc = document.documentElement;
      return (header?.scrollWidth ?? 0) > doc.clientWidth || doc.scrollWidth > doc.clientWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);
  });

  test('8. Break prompt displays visual tomatoes row, counter underneath, and long break triggers on 4th (not 7th)', async ({ page }) => {
    await page.locator('#start-day-session-btn').click();
    await expect(page.locator('#power-start-button')).toBeVisible();

    // Simulate 4 completed pomodoros
    await page.evaluate(() => {
      (window as any).__POMODORO_DEBUG__.setTodayCount(4);
      (window as any).__POMODORO_DEBUG__.setTimerMode('idle_break');
    });

    // Verify 4th pomodoro break prompt
    const card = page.locator('#break-info-card');
    await expect(card).toBeVisible();

    // Visual row should have 4 tomato items
    const tomatoes = page.locator('#break-tomatoes-row > span');
    await expect(tomatoes).toHaveCount(4);

    // Counter underneath
    await expect(page.locator('#break-today-counter')).toContainText('4 помидора');

    // Long break duration badge (15m)
    await expect(page.locator('#break-duration-badge')).toContainText('Длинный перерыв: 15 мин');

    // Now test 7th pomodoro: should be SHORT break, not long!
    await page.evaluate(() => {
      (window as any).__POMODORO_DEBUG__.setTodayCount(7);
      (window as any).__POMODORO_DEBUG__.setTimerMode('idle_break');
    });

    const tomatoes7 = page.locator('#break-tomatoes-row > span');
    await expect(tomatoes7).toHaveCount(7);
    await expect(page.locator('#break-today-counter')).toContainText('7 помидоров');
    await expect(page.locator('#break-duration-badge')).toContainText('Короткий перерыв: 5 мин');
  });
});
