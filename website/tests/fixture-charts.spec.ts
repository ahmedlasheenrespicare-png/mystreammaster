import { test, expect, type Page } from '@playwright/test';

// Synthetic provider responses for regression tests only; never published as match data.
const NOW = new Date('2026-10-16T10:00:00Z');
const PATH = '/manchester-united-atletico/';
type Mode = 'ok' | 'error' | 'not-found' | 'no-stats' | 'scheduled' | 'stale' | 'older';

async function mockSource(page: Page, initial: Mode = 'ok', reversed = false) {
  await page.clock.install({ time: NOW });
  let mode = initial;
  let calls = 0;
  let shots = 14;
  const statistics = (values: Record<string, number | string>) => Object.entries(values).map(([name, value]) => ({ name, displayValue: String(value) }));
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    const local = ['localhost', '127.0.0.1'].includes(url.hostname);
    if (!local) return route.abort();
    if (url.pathname !== '/scoreboard.php') return route.continue();
    calls++;
    if (mode === 'error') return route.fulfill({ status: 503, json: { code: 'UPSTREAM_UNAVAILABLE' } });
    const home = {
      homeAway: reversed ? 'away' : 'home', score: '2', team: { displayName: 'Atlético Madrid' },
      statistics: mode === 'no-stats' ? [] : statistics({ possessionPct: 62, totalShots: shots, shotsOnTarget: 7, wonCorners: 4, passCompletionPct: 91, saves: 2, foulsCommitted: 9, redCards: 0 }),
    };
    const away = {
      homeAway: reversed ? 'home' : 'away', score: '0', team: { displayName: 'Manchester United' },
      // Deliberately missing completed passes, pass accuracy and red cards.
      statistics: mode === 'no-stats' ? [] : statistics({ possessionPct: 38, totalShots: 6, shotsOnTarget: 2, wonCorners: 3, saves: 5, foulsCommitted: 12 }),
    };
    const event = {
      date: '2026-10-13T19:00:00Z',
      competitions: [{
        date: '2026-10-13T19:00:00Z', competitors: reversed ? [away, home] : [home, away],
        status: { type: { state: mode === 'scheduled' ? 'pre' : 'post', completed: mode !== 'scheduled', name: mode === 'scheduled' ? 'STATUS_SCHEDULED' : 'STATUS_FULL_TIME' } },
      }],
    };
    return route.fulfill({
      status: 200,
      headers: { 'X-Matches-Cache': mode === 'stale' || mode === 'older' ? 'STALE' : 'HIT', 'X-Cache-Age': mode === 'older' ? '7200' : '120' },
      json: { events: mode === 'not-found' ? [] : [event] },
    });
  });
  return { get calls() { return calls; }, setMode: (next: Mode) => { mode = next; }, setShots: (next: number) => { shots = next; } };
}

async function openCharts(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(PATH);
  await expect(page.locator('#analysis-charts')).toHaveAttribute('data-enhanced', 'true');
  await expect(page.locator('#scoreboard-status')).toContainText('انتهت المباراة');
  return errors;
}
const chart = (page: Page, metric: string) => page.locator(`#analysis-charts [data-metric="${metric}"]`);
const value = (page: Page, metric: string, team: 'home' | 'away') => chart(page, metric).locator(`[data-chart-value="${team}"]`);
const selectEspn = (page: Page) => page.locator('[data-chart-source="espn"]').click();
const stamp = async (page: Page) => (await page.locator('[data-chart-status]').innerText()).split('آخر قراءة إحصائية:')[1];

test('official SVG charts and all final values exist without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.route('**/*', route => ['localhost', '127.0.0.1'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
    await page.goto(new URL(PATH, baseURL).href);
    const root = page.locator('#analysis-charts');
    await expect(root.locator('.fc-card')).toHaveCount(9);
    await expect(root.locator('[data-chart-controls]')).toBeHidden();
    await expect(value(page, 'possession', 'home')).toHaveText('57%');
    await expect(value(page, 'possession', 'away')).toHaveText('43%');
    await expect(value(page, 'passes-completed', 'home')).toHaveText('595');
    await expect(value(page, 'red-cards', 'home')).toHaveText('0');
    await expect(chart(page, 'possession').locator('.fc-ring--home')).toHaveAttribute('stroke-dasharray', '57 43');
    await expect(root.locator('.fc-card[data-complete="false"]')).toHaveCount(0);
    await expect(page.locator('#uefa-stats [data-stat]')).toHaveCount(24);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(root.getByText('الرسوم والأرقام النهائية ظاهرة دون JavaScript.', { exact: false })).toBeVisible();
  } finally { await context.close(); }
});

test('provider selection preserves UEFA analysis, maps teams correctly, and never fills missing ESPN values', async ({ page }) => {
  const source = await mockSource(page, 'ok', true);
  const errors = await openCharts(page);
  const narrative = await page.locator('.preview-grid--report').innerText();
  await expect(value(page, 'attempts', 'home')).toHaveText('11');
  await selectEspn(page);
  await expect(value(page, 'attempts', 'home')).toHaveText('14');
  await expect(value(page, 'attempts', 'away')).toHaveText('6');
  await expect(value(page, 'possession', 'home')).toHaveText('62%');
  await expect(chart(page, 'possession').locator('.fc-ring--home')).toHaveAttribute('stroke-dasharray', '62 38');
  await expect(value(page, 'red-cards', 'home')).toHaveText('0');
  await expect(value(page, 'red-cards', 'away')).toHaveText('غير متاح');
  await expect(chart(page, 'red-cards').locator('.fc-bar-fill')).toHaveCount(0);
  await expect(value(page, 'passes-completed', 'home')).toHaveText('غير متاح');
  await expect(value(page, 'passing-accuracy', 'away')).toHaveText('غير متاح');
  await expect(page.locator('[data-chart-status]')).toContainText('انتهت المباراة');
  await expect(page.locator('[data-chart-status]')).not.toContainText('مباشر');
  await expect(page.locator('#uefa-stats [data-stat="attempts"] td').first()).toHaveText('11');
  expect(await page.locator('.preview-grid--report').innerText()).toBe(narrative);
  await page.locator('[data-chart-source="uefa"]').click();
  await expect(value(page, 'attempts', 'home')).toHaveText('11');
  await expect(value(page, 'passes-completed', 'home')).toHaveText('595');
  expect(source.calls).toBe(1);
  expect(errors).toEqual([]);
});

test('automatic chart refresh shares exactly one existing scoreboard request each minute', async ({ page }) => {
  const source = await mockSource(page);
  await openCharts(page);
  await selectEspn(page);
  const firstStamp = await stamp(page);
  source.setShots(17);
  await page.clock.fastForward(60_000);
  await expect(value(page, 'attempts', 'home')).toHaveText('17');
  expect(source.calls).toBe(2);
  expect(await stamp(page)).not.toBe(firstStamp);
  await page.locator('[data-chart-filter="attack"]').click();
  await page.locator('[data-chart-highlight="away"]').click();
  await page.locator('[data-chart-source="uefa"]').click();
  await page.locator('[data-chart-source="espn"]').click();
  expect(source.calls).toBe(2);
});

test('an upstream failure preserves confirmed chart values and their original timestamp', async ({ page }) => {
  const source = await mockSource(page);
  await openCharts(page);
  await selectEspn(page);
  const firstStamp = await stamp(page);
  source.setMode('error');
  await page.clock.fastForward(60_000);
  await expect(page.locator('#analysis-charts')).toHaveAttribute('data-feed-state', 'stale');
  await expect(value(page, 'attempts', 'home')).toHaveText('14');
  await expect(page.locator('[data-chart-status]')).toContainText('آخر أرقام مؤكدة وقد تكون قديمة');
  expect(await stamp(page)).toBe(firstStamp);
  expect(source.calls).toBe(2);
});

test('missing event or missing statistics do not erase or redate the last confirmed chart snapshot', async ({ page }) => {
  const source = await mockSource(page);
  await openCharts(page);
  await selectEspn(page);
  const firstStamp = await stamp(page);
  for (const mode of ['not-found', 'no-stats'] as const) {
    source.setMode(mode);
    await page.clock.fastForward(60_000);
    await expect(page.locator('#analysis-charts')).toHaveAttribute('data-feed-state', 'stale');
    await expect(value(page, 'attempts', 'home')).toHaveText('14');
    await expect(page.locator('[data-chart-status]')).toContainText('قد تكون قديمة');
    expect(await stamp(page)).toBe(firstStamp);
  }
  expect(source.calls).toBe(3);
});

test('cached source data is labelled and an older cache cannot overwrite a newer reading', async ({ page }) => {
  const source = await mockSource(page, 'stale');
  await openCharts(page);
  await selectEspn(page);
  await expect(page.locator('#analysis-charts')).toHaveAttribute('data-feed-state', 'stale');
  await expect(page.locator('[data-chart-status]')).toContainText('بيانات مخزنة قد تتأخر');
  const firstStamp = await stamp(page);
  source.setMode('older');
  source.setShots(1);
  await page.clock.fastForward(60_000);
  await expect(page.locator('[data-chart-status]')).toContainText('نسخة أقدم');
  await expect(value(page, 'attempts', 'home')).toHaveText('14');
  expect(await stamp(page)).toBe(firstStamp);
});

test('offline state preserves figures and going online reuses the scoreboard refresh', async ({ page, context }) => {
  const source = await mockSource(page);
  await openCharts(page);
  await selectEspn(page);
  const firstStamp = await stamp(page);
  await context.setOffline(true);
  await expect(page.locator('[data-chart-status]')).toContainText('لا يوجد اتصال');
  await page.clock.fastForward(60_000);
  await expect(value(page, 'attempts', 'home')).toHaveText('14');
  expect(await stamp(page)).toBe(firstStamp);
  expect(source.calls).toBe(1);
  source.setShots(19);
  await context.setOffline(false);
  await expect(value(page, 'attempts', 'home')).toHaveText('19');
  await expect(page.locator('#analysis-charts')).toHaveAttribute('data-feed-state', 'finished');
  expect(source.calls).toBe(2);
});

test('a deferred chart module replays the already-completed scoreboard snapshot', async ({ page }) => {
  const source = await mockSource(page);
  await page.route('**/fixture-charts.js?*', async route => {
    await page.waitForFunction(() => (window as Window & { __smFixtureChartSnapshot?: { state: string } }).__smFixtureChartSnapshot?.state === 'finished');
    await route.continue();
  });
  await openCharts(page);
  await selectEspn(page);
  await expect(value(page, 'attempts', 'home')).toHaveText('14');
  expect(source.calls).toBe(1);
});

test('source selection, filtering and highlighting support the keyboard and reduced motion', async ({ page }) => {
  await mockSource(page);
  await openCharts(page);
  const root = page.locator('#analysis-charts');
  const official = root.locator('[data-chart-source="uefa"]');
  await official.focus();
  await expect(official).toHaveCSS('outline-width', '3px');
  await page.keyboard.press('Tab');
  await expect(root.locator('[data-chart-source="espn"]')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(root).toHaveAttribute('data-source', 'espn');
  await expect(root.locator('[data-chart-source="espn"]')).toBeFocused();
  const filter = root.locator('[data-chart-filter="passing"]');
  await filter.focus();
  await page.keyboard.press('Space');
  await expect(filter).toHaveAttribute('aria-pressed', 'true');
  await expect(root.locator('.fc-card:not([hidden])')).toHaveCount(3);
  const highlight = root.locator('[data-chart-highlight="away"]');
  await highlight.focus();
  await page.keyboard.press('Space');
  await expect(highlight).toHaveAttribute('aria-pressed', 'true');
  await expect(root.locator('.fc-ring--home')).toHaveCSS('opacity', '0.22');
  await page.keyboard.press('Space');
  await expect(highlight).toHaveAttribute('aria-pressed', 'false');
  await expect(root.locator('.fc-ring--home')).toHaveCSS('opacity', '1');
  await expect(root.locator('.fc-bar-fill').first()).toHaveCSS('animation-name', 'none');
});

test('chart animation is available only when reduced motion is not requested', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await mockSource(page);
  await openCharts(page);
  await page.locator('[data-chart-filter="attack"]').click();
  await page.clock.runFor(80);
  await expect(chart(page, 'attempts').locator('.fc-bar-fill').first()).toHaveCSS('animation-name', 'fc-bar-enter');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(chart(page, 'attempts').locator('.fc-bar-fill').first()).toHaveCSS('animation-name', 'none');
});

test('unavailable initial ESPN data and scheduled events never create fake zero values', async ({ page }) => {
  const source = await mockSource(page, 'error');
  await page.goto(PATH);
  await expect(page.locator('#analysis-charts')).toHaveAttribute('data-enhanced', 'true');
  await expect(page.locator('#scoreboard-status')).toContainText('تعذر');
  await selectEspn(page);
  await expect(page.locator('#analysis-charts [data-chart-value]')).toHaveText(Array(18).fill('غير متاح'));
  await expect(page.locator('#analysis-charts .fc-bar-fill, #analysis-charts .fc-ring')).toHaveCount(0);
  source.setMode('scheduled');
  await page.clock.fastForward(60_000);
  await expect(page.locator('#analysis-charts')).toHaveAttribute('data-feed-state', 'scheduled');
  await expect(page.locator('#analysis-charts [data-chart-value]')).toHaveText(Array(18).fill('غير متاح'));
});

test('official and auto-refresh charts fit RTL viewports from 320px to 1440px', async ({ page }) => {
  await mockSource(page);
  await openCharts(page);
  for (const width of [320, 360, 390, 620, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 960 });
    for (const provider of ['uefa', 'espn']) {
      await page.locator(`[data-chart-source="${provider}"]`).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      const bounds = await page.locator('#analysis-charts').boundingBox();
      expect(bounds && bounds.x >= 0 && bounds.x + bounds.width <= width).toBe(true);
      expect(await page.locator('#analysis-charts .fc-card').evaluateAll(cards => cards.every(card => card.scrollWidth <= card.clientWidth))).toBe(true);
    }
  }
});
