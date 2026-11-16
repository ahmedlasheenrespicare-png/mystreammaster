import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
const snapshot = JSON.parse(fs.readFileSync(path.resolve('src/content/standings-snapshot.json'), 'utf8'));

// These fixtures are intercepted only inside the test; they are never published.
const pagePath = '/home-preview/saved-reference/';
async function prepare(page: import('@playwright/test').Page) {
  await page.route('**/main-D5MQsYQ6.js*', route => route.abort());
  await page.route('https://**', route => route.abort());
  await page.goto(pagePath, { waitUntil: 'domcontentloaded' });
  await page.addStyleTag({ content: '.loader,.nav,canvas{display:none!important}' });
}
function event(id: string, day: string, live: boolean) {
  const date = `${day.slice(0,4)}-${day.slice(4,6)}-${day.slice(6,8)}T12:00:00Z`;
  return { id, date, competitions: [{ date, status: { type: { state: live ? 'in' : 'pre', completed: false }, displayClock: '42:00' }, competitors: [
    { homeAway: 'home', team: { displayName: 'Test Home' }, score: '1' },
    { homeAway: 'away', team: { displayName: 'Test Away' }, score: '0' },
  ] }] };
}

for (const width of [390, 1280]) {
  test(`reference preview shows standings and all match tabs using site proxies at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 850 });
    const standingsRequests: string[] = [];
    const scoreboardRequests: string[] = [];
    await page.route('**/standings.php?*', async route => {
      const league = new URL(route.request().url()).searchParams.get('league')!;
      standingsRequests.push(league);
      const table = snapshot.tables.find((t: {league: string}) => t.league === league)!;
      // A validated newer response proves the UI is using the live proxy.
      const data = structuredClone(table);
      data.fetchedAt = '2027-01-01T00:00:00.000Z';
      data.entries[0].name = 'Live Source Leader';
      await route.fulfill({ json: data });
    });
    await page.route('**/scoreboard.php?*', async route => {
      const url = new URL(route.request().url());
      const league = url.searchParams.get('league')!;
      const dates = url.searchParams.get('dates')!;
      scoreboardRequests.push(`${league}:${dates}`);
      const start = dates.split('-')[0];
      const d = new Date(`${start.slice(0,4)}-${start.slice(4,6)}-${start.slice(6,8)}T12:00:00Z`);
      d.setUTCDate(d.getUTCDate() + 1);
      const middle = d.toISOString().slice(0,10).replaceAll('-','');
      const events = league === 'eng.1' ? [event(`scheduled-${middle}`, middle, false), event(`live-${middle}`, middle, true)] : [];
      await route.fulfill({ json: { events } });
    });
    await prepare(page);
    await page.locator('.sm-leagues__stage').scrollIntoViewIfNeeded();
    await expect(page.locator('[data-stat="leader"] strong')).toContainText('Live Source Leader');
    await expect(page.locator('.sm-leagues__stat-source')).toContainText('آخر قراءة');
    for (const key of ['leader', 'attack', 'defence', 'goals']) await expect(page.locator(`[data-stat="${key}"] strong`)).not.toHaveText('غير متاح');
    expect(standingsRequests).toContain('uefa.champions');
    await page.locator('#featured-matches').scrollIntoViewIfNeeded();
    for (const tab of ['today','yesterday','tomorrow','live']) {
      await page.locator(`[data-day="${tab}"]`).click();
      await expect(page.locator(`[data-day="${tab}"]`)).toHaveAttribute('aria-pressed','true');
      await expect(page.locator('.sm-match')).toHaveCount(tab === 'live' ? 1 : 2);
      if (tab === 'live') await expect(page.locator('.sm-match')).toHaveAttribute('data-state','live');
    }
    expect(new Set(scoreboardRequests.filter(v=>v.startsWith('eng.1:'))).size).toBe(3);
    expect(scoreboardRequests.some(v=>v.startsWith('egy.1:'))).toBe(true);
  });
}

test('proxy failure keeps documented standings snapshot and offers match retry without fabricated cards', async ({ page }) => {
  let fail = true;
  await page.route('**/standings.php?*', route => route.fulfill({ status: 503, json: { ok:false } }));
  await page.route('**/scoreboard.php?*', route => route.fulfill(fail ? {status:503, json:{ok:false}} : {json:{events:[]}}));
  await prepare(page);
  await page.locator('.sm-leagues__stage').scrollIntoViewIfNeeded();
  await expect(page.locator('[data-stat="leader"] strong')).toContainText(snapshot.tables[0].entries[0].name);
  await expect(page.locator('.sm-leagues__stat-source')).toContainText('لقطة محفوظة');
  await page.locator('#featured-matches').scrollIntoViewIfNeeded();
  await expect(page.locator('.sm-matches__retry')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('.sm-match')).toHaveCount(0);
  fail = false;
  await page.locator('.sm-matches__retry').click();
  await expect(page.locator('.sm-matches__status')).toContainText('لا توجد مباريات مؤكدة');
  await expect(page.locator('.sm-match')).toHaveCount(0);
});

test('each of the eight selected leagues updates from the standings proxy', async ({ page }) => {
  const requested: string[] = [];
  await page.route('**/standings.php?*', async route => {
    const league = new URL(route.request().url()).searchParams.get('league')!;
    requested.push(league);
    const data = structuredClone(snapshot.tables.find((t: {league: string}) => t.league === league));
    data.fetchedAt = '2027-01-01T00:00:00.000Z';
    data.entries[0].name = `Live ${league}`;
    await route.fulfill({ json: data });
  });
  await prepare(page);
  await page.locator('.sm-leagues__stage').scrollIntoViewIfNeeded();
  const ids = ['uefa.champions','eng.1','fra.1','esp.1','ger.1','ita.1','ksa.1','egy.1'];
  for (let i = 0; i < ids.length; i++) {
    // Selection is driven by the gallery; change the same ARIA state it publishes.
    await page.locator('.sm-leagues__mini button').evaluateAll((buttons, index) => {
      buttons.forEach((button, n) => button.setAttribute('aria-pressed', String(n === index)));
    }, i);
    await expect(page.locator('[data-stat="leader"] strong')).toContainText(`Live ${ids[i]}`);
    await expect(page.locator('.sm-leagues__stat-source')).toContainText('آخر قراءة');
  }
  expect(new Set(requested)).toEqual(new Set(ids));
});
