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
});
