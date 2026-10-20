import fs from 'fs';
import path from 'path';
import { createApp } from '../src/app.js';
import { getDatabase, closeDatabase } from '../src/db/index.js';
import Database from 'better-sqlite3';

const TEST_PORT = 3099;
const TEST_DB_PATH = path.join(process.cwd(), 'data', 'smoke_test.db');
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
const USER_ID = `tg_user_${Date.now()}`;

// Clean previous smoke test db if exists
if (fs.existsSync(TEST_DB_PATH)) {
  fs.unlinkSync(TEST_DB_PATH);
}
process.env.DATABASE_PATH = TEST_DB_PATH;

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

function pass(name: string, info?: string) {
  console.log(`${GREEN}✔ PASS:${RESET} ${BOLD}${name}${RESET} ${info ? `(${info})` : ''}`);
}

function fail(name: string, error: any) {
  console.error(`${RED}✖ FAIL:${RESET} ${BOLD}${name}${RESET}`, error);
  process.exit(1);
}

async function runSmokeTests() {
  console.log(`\n${CYAN}======================================================${RESET}`);
  console.log(`${BOLD}       STARTING LIVE FULL SMOKE TEST SUITE            ${RESET}`);
  console.log(`${CYAN}======================================================${RESET}\n`);

  // 1. Initialize DB and Server
  getDatabase(TEST_DB_PATH);
  const app = createApp();
  const server = app.listen(TEST_PORT, '127.0.0.1');

  try {
    // 2. Health check
    console.log(`${CYAN}--- Step 1: Healthcheck Endpoint ---${RESET}`);
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    const healthJson = await healthRes.json() as any;
    if (healthRes.status === 200 && healthJson.status === 'healthy' && healthJson.db === 'ok') {
      pass('GET /api/health', `uptime: ${healthJson.uptimeSeconds}s, db: ${healthJson.db}`);
    } else {
      fail('GET /api/health', healthJson);
    }

    // 3. User Settings - Default Check
    console.log(`\n${CYAN}--- Step 2: Settings Defaults ---${RESET}`);
    const settingsGetRes = await fetch(`${BASE_URL}/api/settings?userId=${USER_ID}`);
    const settingsGetJson = await settingsGetRes.json() as any;
    if (
      settingsGetRes.status === 200 &&
      settingsGetJson.data.workDurationMin === 30 &&
      settingsGetJson.data.shortBreakMin === 5 &&
      settingsGetJson.data.longBreakMin === 15 &&
      settingsGetJson.data.longBreakInterval === 4 &&
      settingsGetJson.data.soundEnabled === true &&
      settingsGetJson.data.vibrationEnabled === true
    ) {
      pass('GET /api/settings (Defaults)', `30m work, 5m short, 15m long, sound: on, vib: on`);
    } else {
      fail('GET /api/settings defaults', settingsGetJson);
    }

    // 4. Update Settings
    console.log(`\n${CYAN}--- Step 3: Update Settings ---${RESET}`);
    const updateSettingsRes = await fetch(`${BASE_URL}/api/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: USER_ID,
        workDurationMin: 25,
        shortBreakMin: 5,
        longBreakMin: 20,
        longBreakInterval: 4,
        soundEnabled: false,
        vibrationEnabled: false,
      }),
    });
    const updateSettingsJson = await updateSettingsRes.json() as any;
    if (
      updateSettingsRes.status === 200 &&
      updateSettingsJson.data.workDurationMin === 25 &&
      updateSettingsJson.data.soundEnabled === false &&
      updateSettingsJson.data.vibrationEnabled === false
    ) {
      pass('PUT /api/settings', `Updated work duration to 25m, sound: off, vibration: off`);
    } else {
      fail('PUT /api/settings', updateSettingsJson);
    }

    // 5. Pomodoro Cycle Simulation (1 to 4 pomodoros with breaks)
    console.log(`\n${CYAN}--- Step 4: Simulating 4 Full Pomodoro Cycles ---${RESET}`);
    const now = Date.now();
    let prevEndedAt = now - 3 * 3600 * 1000; // 3 hours ago

    for (let cycle = 1; cycle <= 4; cycle++) {
      // Work Session
      const workStart = new Date(prevEndedAt + 60 * 1000).toISOString();
      const workEnd = new Date(new Date(workStart).getTime() + 25 * 60 * 1000).toISOString();
      const workRes = await fetch(`${BASE_URL}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: USER_ID,
          type: 'work',
          startedAt: workStart,
          endedAt: workEnd,
          plannedDurationSec: 1500,
          actualDurationSec: 1500,
          status: 'completed',
          cycleIndex: cycle,
          metadata: { tag: `feature-part-${cycle}` },
        }),
      });
      const workJson = await workRes.json() as any;
      if (workRes.status === 201 && workJson.data.cycleIndex === cycle) {
        pass(`POST /api/sessions: Pomodoro #${cycle} completed`, `gap: ${workJson.data.gapFromPreviousSec ?? 0}s`);
      } else {
        fail(`POST /api/sessions Pomodoro #${cycle}`, workJson);
      }

      // Break Session
      const isLongBreak = cycle === 4;
      const breakDuration = isLongBreak ? 20 : 5;
      const breakStart = new Date(new Date(workEnd).getTime() + 10 * 1000).toISOString();
      const breakEnd = new Date(new Date(breakStart).getTime() + breakDuration * 60 * 1000).toISOString();
      prevEndedAt = new Date(breakEnd).getTime();

      const breakRes = await fetch(`${BASE_URL}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: USER_ID,
          type: isLongBreak ? 'long_break' : 'short_break',
          startedAt: breakStart,
          endedAt: breakEnd,
          plannedDurationSec: breakDuration * 60,
          actualDurationSec: breakDuration * 60,
          status: 'completed',
          cycleIndex: cycle,
        }),
      });
      const breakJson = await breakRes.json() as any;
      if (breakRes.status === 201) {
        pass(`POST /api/sessions: Break #${cycle} (${isLongBreak ? 'LONG 20m' : 'SHORT 5m'}) completed`);
      } else {
        fail(`POST /api/sessions Break #${cycle}`, breakJson);
      }
    }

    // 6. Check Today's Count
    console.log(`\n${CYAN}--- Step 5: Check Today's Stats ---${RESET}`);
    const todayRes = await fetch(`${BASE_URL}/api/sessions/today?userId=${USER_ID}`);
    const todayJson = await todayRes.json() as any;
    if (todayRes.status === 200 && todayJson.data.todayCount === 4 && todayJson.data.totalFocusMinutesToday === 100) {
      pass('GET /api/sessions/today', `todayCount: ${todayJson.data.todayCount}, focusMinutes: ${todayJson.data.totalFocusMinutesToday}m`);
    } else {
      fail('GET /api/sessions/today count mismatch', todayJson);
    }

    // 7. Check Weekly Summary Stats
    console.log(`\n${CYAN}--- Step 6: Weekly Analytics Summary ---${RESET}`);
    const summaryRes = await fetch(`${BASE_URL}/api/stats/summary?userId=${USER_ID}&period=week`);
    const summaryJson = await summaryRes.json() as any;
    if (
      summaryRes.status === 200 &&
      summaryJson.data.totalCompletedWork === 4 &&
      summaryJson.data.completionRatePercent === 100 &&
      summaryJson.data.totalFocusMinutes === 100 &&
      summaryJson.data.dailyBreakdown.length === 7
    ) {
      pass(
        'GET /api/stats/summary',
        `4 completed, 100% completion rate, 100 min focus, 7-day breakdown verified`
      );
    } else {
      fail('GET /api/stats/summary', summaryJson);
    }

    // 8. Check Density and Hourly Breakdown
    console.log(`\n${CYAN}--- Step 7: Focus Density and Hourly Distribution ---${RESET}`);
    const densityRes = await fetch(`${BASE_URL}/api/stats/density?userId=${USER_ID}`);
    const densityJson = await densityRes.json() as any;
    if (
      densityRes.status === 200 &&
      densityJson.data.totalSessionsOnDate === 4 &&
      densityJson.data.hourlyDistribution.length === 24 &&
      densityJson.data.densityScorePercent > 0
    ) {
      pass(
        'GET /api/stats/density',
        `24 hour buckets present, densityScore: ${densityJson.data.densityScorePercent}%, avgGap: ${densityJson.data.averageGapMinutes}m`
      );
    } else {
      fail('GET /api/stats/density', densityJson);
    }

    // 9. Negative Testing: Input Validation
    console.log(`\n${CYAN}--- Step 8: Negative Testing (Validation & 404) ---${RESET}`);
    const badSessionRes = await fetch(`${BASE_URL}/api/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: USER_ID,
        type: 'invalid_type',
        startedAt: 'not-a-date',
        plannedDurationSec: -50,
      }),
    });
    const badSessionJson = await badSessionRes.json() as any;
    if (badSessionRes.status === 400 && badSessionJson.error === 'Validation Error') {
      pass('Validation guard (400 Bad Request)', `${badSessionJson.details.length} validation errors caught`);
    } else {
      fail('Validation guard test', badSessionJson);
    }

    const notFoundRes = await fetch(`${BASE_URL}/api/unknown-route-12345`);
    if (notFoundRes.status === 404) {
      pass('404 Not Found handler', 'Properly returned 404 for unknown endpoint');
    } else {
      fail('404 Not Found test', notFoundRes.status);
    }

    // 10. Database Integrity Verification
    console.log(`\n${CYAN}--- Step 9: SQLite Database Integrity Check ---${RESET}`);
    closeDatabase();
    const diskDb = new Database(TEST_DB_PATH);
    const integrityCheck = diskDb.pragma('integrity_check') as Array<{ integrity_check: string }>;
    if (integrityCheck[0]?.integrity_check === 'ok') {
      pass('PRAGMA integrity_check', 'Database file is fully intact, 0 corruptions');
    } else {
      fail('SQLite integrity check', integrityCheck);
    }
    diskDb.close();

    console.log(`\n${GREEN}======================================================${RESET}`);
    console.log(`${BOLD}${GREEN}  ALL SMOKE TESTS COMPLETED SUCCESSFULLY! (100% OK)   ${RESET}`);
    console.log(`${GREEN}======================================================${RESET}\n`);
  } finally {
    server.close();
    closeDatabase();
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  }
}

runSmokeTests().catch((err) => {
  console.error('Smoke test crashed:', err);
  process.exit(1);
});
