import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs/promises';

// Isolated mock responses. Mutations below are regression fixtures, never published data.
const SNAPSHOT = JSON.parse(await fs.readFile(new URL('../src/content/fixture-standings-snapshot.json', import.meta.url), 'utf8'));
const NOW = new Date('2026-10-16T10:00:00Z');
const PATH = '/manchester-united-atletico/';
const LEAGUES = ['uefa.champions', 'eng.1', 'esp.1'];
type Mode = 'ok' | 'error' | 'stale' | 'partial' | 'older' | 'missing-values';

async function mockStandings(page: Page, initial: Mode = 'ok') {
  await page.clock.install({ time: NOW });
  // Freeze before navigation so the 299,999ms/300,000ms boundary is measured
  // from module initialization, not from variable real navigation elapsed time.
  await page.clock.pauseAt(NOW);
  const calls = new Map(LEAGUES.map(id => [id, 0]));
  const modes = new Map(LEAGUES.map(id => [id, initial]));
  const seasons = new Map(LEAGUES.map(id => [id, 2026]));
  let unitedPoints: number | null = null;
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (!['localhost', '127.0.0.1'].includes(url.hostname)) return route.abort();
    if (url.pathname === '/scoreboard.php') return route.fulfill({ status: 200, json: { events: [] } });
    if (url.pathname !== '/standings.php') return route.continue();
    const league = url.searchParams.get('league') || '';
    expect(LEAGUES).toContain(league);
    calls.set(league, (calls.get(league) || 0) + 1);
    const mode = modes.get(league);
    if (mode === 'error') return route.fulfill({ status: 503, json: { ok: false, code: 'UPSTREAM_TIMEOUT' } });
    const data = structuredClone(SNAPSHOT.tables.find((table: { league: string }) => table.league === league));
    data.stale = mode === 'stale';
    data.season = seasons.get(league);
    data.fetchedAt = mode === 'older' ? '2026-10-14T10:00:00Z' : new Date(NOW.getTime() + ((calls.get(league) || 1) - 1) * 300_000).toISOString();
    if (mode === 'partial') data.entries.pop();
    if (mode === 'missing-values') { data.entries[0].points = null; data.entries[1].points = 0; }
    if (unitedPoints !== null && league === 'eng.1') data.entries.find((row: { teamId: string }) => row.teamId === '360').points = unitedPoints;
    return route.fulfill({ status: 200, headers: { 'X-Standings-Cache': mode === 'stale' ? 'STALE' : 'HIT' }, json: data });
  });
  return {
    calls: (id?: string) => id ? calls.get(id) || 0 : [...calls.values()].reduce((a, b) => a + b, 0),
    mode: (id: string, mode: Mode) => modes.set(id, mode),
    season: (id: string, season: number) => seasons.set(id, season),
    points: (points: number) => { unitedPoints = points; },
  };
}
const card = (page: Page, league: string) => page.locator(`#competition-standings [data-standing-league="${league}"]`);
const points = (page: Page, league: string, team: string) => card(page, league).locator(`[data-standing-team="${team}"] [data-standing-field="points"]`);
async function openStandings(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(PATH);
  await expect(page.locator('#competition-standings')).toHaveAttribute('data-enhanced', 'true');
  await expect(page.locator('#competition-standings [aria-busy="true"]')).toHaveCount(0);
  return errors;
}

test('standings: all 76 real snapshot rows, focus ranks and source dates exist without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.route('**/*', route => ['localhost', '127.0.0.1'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
    await page.goto(new URL(PATH, baseURL).href);
    const root = page.locator('#competition-standings');
    await expect(root.locator('tbody tr')).toHaveCount(76);
    await expect(card(page, 'uefa.champions').locator('tbody tr')).toHaveCount(36);
    await expect(card(page, 'eng.1').locator('tbody tr')).toHaveCount(20);
    await expect(card(page, 'esp.1').locator('tbody tr')).toHaveCount(20);
    await expect(card(page, 'uefa.champions').locator('[data-summary-team="360"] [data-summary-rank]')).toHaveText('13');
    await expect(card(page, 'uefa.champions').locator('[data-summary-team="1068"] [data-summary-rank]')).toHaveText('15');
    await expect(card(page, 'eng.1').locator('[data-summary-rank]')).toHaveText('13');
    await expect(card(page, 'esp.1').locator('[data-summary-rank]')).toHaveText('2');
    await expect(root.locator('[data-standings-static-note]')).toBeVisible();
    await expect(root.locator('[data-standing-status]').first()).toContainText('لقطة مراجعة');
    await expect(root).toContainText('وليس مجموعات منفصلة');
    await expect(page.locator('h1')).toHaveCount(1);
  } finally { await context.close(); }
});

test('standings: all three same-origin tables refresh automatically without changing UEFA match data', async ({ page }) => {
  const source = await mockStandings(page);
  const errors = await openStandings(page);
  for (const league of LEAGUES) await expect(card(page, league)).toHaveAttribute('data-feed-state', 'updated');
  expect(source.calls()).toBe(3);
  await expect(points(page, 'eng.1', '360')).toHaveText('6');
  const firstStamp = await card(page, 'eng.1').getAttribute('data-fetched-at');
  const narrative = await page.locator('.preview-grid--report').innerText();
  source.points(9);
  await page.clock.fastForward(299_999);
  expect(source.calls()).toBe(3);
  await page.clock.fastForward(1);
  await expect(points(page, 'eng.1', '360')).toHaveText('9');
  expect(source.calls()).toBe(6);
  expect(await card(page, 'eng.1').getAttribute('data-fetched-at')).not.toBe(firstStamp);
  await expect(page.locator('#uefa-stats [data-stat="possession"] td').first()).toHaveText('57%');
  await expect(page.locator('#analysis-charts [data-metric="attempts"] [data-chart-value="home"]')).toHaveText('11');
  expect(await page.locator('.preview-grid--report').innerText()).toBe(narrative);
  expect(errors).toEqual([]);
});

test('standings: one failing league keeps its own previous table and timestamp, others continue', async ({ page }) => {
  const source = await mockStandings(page);
  await openStandings(page);
  await expect(card(page, 'eng.1')).toHaveAttribute('data-feed-state', 'updated');
  const firstStamp = await card(page, 'eng.1').getAttribute('data-fetched-at');
  source.mode('eng.1', 'error');
  await page.clock.fastForward(300_000);
  await expect(card(page, 'eng.1')).toHaveAttribute('data-feed-state', 'stale');
  await expect(card(page, 'eng.1').locator('tbody tr')).toHaveCount(20);
  await expect(points(page, 'eng.1', '360')).toHaveText('6');
  expect(await card(page, 'eng.1').getAttribute('data-fetched-at')).toBe(firstStamp);
  await expect(card(page, 'eng.1').locator('[data-standing-status]')).toContainText('قد يكون قديماً');
  for (const league of ['uefa.champions', 'esp.1']) await expect(card(page, league)).toHaveAttribute('data-feed-state', 'updated');
  await expect(page.locator('[data-standings-global-status]')).toContainText('2 من 3');
});

test('standings: server stale cache is labelled with its actual reading time, never as a fresh update', async ({ page }) => {
  await mockStandings(page, 'stale');
  await openStandings(page);
  for (const league of LEAGUES) {
    await expect(card(page, league)).toHaveAttribute('data-feed-state', 'stale');
    await expect(card(page, league).locator('[data-standing-status]')).toContainText('نسخة الوسيط المخزّنة');
    await expect(card(page, league).locator('[data-standing-status]')).toContainText('بتوقيت القاهرة');
    expect(await card(page, league).getAttribute('data-fetched-at')).toBe(NOW.toISOString());
  }
});

test('standings: partial or older responses cannot erase, replace or redate the last confirmed table', async ({ page }) => {
  const source = await mockStandings(page);
  await openStandings(page);
  await expect(card(page, 'uefa.champions')).toHaveAttribute('data-feed-state', 'updated');
  const firstStamp = await card(page, 'uefa.champions').getAttribute('data-fetched-at');
  for (const mode of ['partial', 'older'] as const) {
    source.mode('uefa.champions', mode);
    await page.clock.fastForward(300_000);
    await expect(card(page, 'uefa.champions')).toHaveAttribute('data-feed-state', 'stale');
    await expect(card(page, 'uefa.champions').locator('tbody tr')).toHaveCount(36);
    expect(await card(page, 'uefa.champions').getAttribute('data-fetched-at')).toBe(firstStamp);
    await expect(points(page, 'uefa.champions', '360')).toHaveText('3');
  }
  await expect(card(page, 'uefa.champions').locator('[data-standing-status]')).toContainText('قراءة أقدم');
});

test('standings: missing points and published zero are distinct and never calculated from wins', async ({ page }) => {
  await mockStandings(page, 'missing-values');
  await openStandings(page);
  await expect(card(page, 'uefa.champions')).toHaveAttribute('data-feed-state', 'updated');
  await expect(points(page, 'uefa.champions', '160')).toHaveText('غير متاح');
  await expect(points(page, 'uefa.champions', '83')).toHaveText('0');
  await expect(card(page, 'uefa.champions').locator('[data-standing-team="160"] [data-standing-field="wins"]')).toHaveText('2');
});

test('standings: going offline preserves all three readings and reconnecting resumes automatically', async ({ page, context }) => {
  const source = await mockStandings(page);
  await openStandings(page);
  await expect(card(page, 'eng.1')).toHaveAttribute('data-feed-state', 'updated');
  const stamp = await card(page, 'eng.1').getAttribute('data-fetched-at');
  await context.setOffline(true);
  await expect(card(page, 'eng.1').locator('[data-standing-status]')).toContainText('لا يوجد اتصال');
  await page.clock.fastForward(300_000);
  expect(source.calls()).toBe(3);
  expect(await card(page, 'eng.1').getAttribute('data-fetched-at')).toBe(stamp);
  source.points(10);
  await context.setOffline(false);
  await expect(points(page, 'eng.1', '360')).toHaveText('10');
  expect(source.calls()).toBe(6);
  await expect(card(page, 'eng.1')).toHaveAttribute('data-feed-state', 'updated');
});

test('standings: hidden tabs do not poll and becoming visible checks overdue tables', async ({ page }) => {
  const source = await mockStandings(page);
  await openStandings(page);
  await expect(card(page, 'eng.1')).toHaveAttribute('data-feed-state', 'updated');
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.clock.fastForward(300_000);
  expect(source.calls()).toBe(3);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect.poll(() => source.calls()).toBe(6);
});

test('standings: the displayed source season can advance but an older season cannot roll it back', async ({ page }) => {
  const source = await mockStandings(page);
  source.season('eng.1', 2027);
  await openStandings(page);
  await expect(card(page, 'eng.1').locator('[data-standing-season]')).toContainText('2027/28');
  await expect(card(page, 'eng.1').locator('caption')).toContainText('2027/28');
  source.season('eng.1', 2026);
  await page.clock.fastForward(300_000);
  await expect(card(page, 'eng.1')).toHaveAttribute('data-feed-state', 'stale');
  await expect(card(page, 'eng.1').locator('[data-standing-season]')).toContainText('2027/28');
});

test('standings: blocking the enhancement still leaves all tables and the static explanation visible', async ({ page }) => {
  const source = await mockStandings(page);
  await page.route('**/fixture-standings.js?*', route => route.abort());
  await page.goto(PATH);
  await expect(page.locator('#competition-standings tbody tr')).toHaveCount(76);
  await expect(page.locator('[data-standings-static-note]')).toBeVisible();
  expect(source.calls()).toBe(0);
});

test('standings: RTL tables are keyboard-scrollable and fit 320–1440px without page overflow', async ({ page }) => {
  await mockStandings(page);
  await openStandings(page);
  for (const width of [320, 360, 390, 620, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 960 });
    const root = page.locator('#competition-standings');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const bounds = await root.boundingBox();
    expect(bounds && bounds.x >= 0 && bounds.x + bounds.width <= width).toBe(true);
  }
  await page.setViewportSize({ width: 320, height: 960 });
  // Native keyboard scrolling runs on Chromium's compositor clock, not the
  // paused JavaScript clock used to test the exact polling deadline above.
  await page.clock.resume();
  const scroller = card(page, 'uefa.champions').getByRole('region');
  await scroller.focus();
  await expect(scroller).toHaveCSS('outline-width', '3px');
  const before = await scroller.evaluate(el => el.scrollTop);
  await page.keyboard.press('ArrowDown');
  await page.clock.runFor(150);
  await expect.poll(() => scroller.evaluate(el => el.scrollTop)).toBeGreaterThan(before);
  await expect(card(page, 'uefa.champions').locator('thead th').first()).toHaveCSS('position', 'sticky');
  await expect(card(page, 'uefa.champions').locator('h3')).toHaveCSS('color', 'rgb(244, 247, 255)');
});
