import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs/promises';

const PATH = '/manchester-united-atletico/';
const NOW = new Date('2026-10-16T10:00:00Z');
const SNAPSHOT = JSON.parse(await fs.readFile(new URL('../src/content/fixture-standings-snapshot.json', import.meta.url), 'utf8'));
const BRANDS = /UEFA|ESPN|FotMob|BBC|YouTube|يوتيوب|الاتحاد الأوروبي لكرة القدم|سيلفي سبورت|Mamdouh NasrAllah/i;
async function assertCentralized(page: Page) {
  const content = await page.locator('main').evaluate(el => {
    const clone = el.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('#report-sources,script,style').forEach(e => e.remove());
    return { text: clone.textContent || '', labels: [...clone.querySelectorAll('[aria-label],[title]')].flatMap(e => [e.getAttribute('aria-label') || '', e.getAttribute('title') || '']), citations: clone.querySelectorAll('cite').length, links: [...clone.querySelectorAll<HTMLAnchorElement>('a[href^="http"]')].map(a => a.href) };
  });
  expect(content.text).not.toMatch(BRANDS);
  for (const label of content.labels) expect(label).not.toMatch(BRANDS);
  expect(content.citations).toBe(0);
  expect(content.links).toEqual(['https://football-logos.cc/']); // User explicitly preserved this legal exception.
  await expect(page.locator('#report-sources .report-source')).toHaveCount(11);
  await expect(page.locator('#report-sources a[href^="https:"]')).toHaveCount(13);
}
async function localOnly(page: Page) {
  await page.route('**/*', route => {
    const u = new URL(route.request().url());
    return ['localhost', '127.0.0.1'].includes(u.hostname) ? route.continue() : route.abort();
  });
}

test('documentation: all references are centralized without JavaScript and the two approved exceptions remain', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage(); await localOnly(page); await page.goto(new URL(PATH, baseURL).href);
    await assertCentralized(page);
    await expect(page.locator('#report-sources h2')).toHaveText('التوثيق والمراجعة');
    await expect(page.locator('#arabic-reviews h3')).toHaveText(['محمد عواد', 'ممدوح نصرالله']);
    await expect(page.locator('#match-lineups [data-starting-player]')).toHaveCount(22);
    await expect(page.locator('#competition-standings tbody tr')).toHaveCount(76);
    await expect(page.locator('#uefa-stats [data-stat]')).toHaveCount(24);
    await expect(page.locator('p.rights-note')).toContainText('مصدر ملفات الشعارات:');
  } finally { await context.close(); }
});

test('documentation: final, cached, unavailable and scheduled chart states never reintroduce provider credits', async ({ page }) => {
  await page.clock.install({ time: NOW });
  let mode = 'ok';
  const stat = (name: string, value: number) => ({ name, displayValue: String(value) });
  await page.route('**/*', route => {
    const u = new URL(route.request().url());
    if (!['localhost', '127.0.0.1'].includes(u.hostname)) return route.abort();
    if (u.pathname === '/standings.php') {
      const table = structuredClone(SNAPSHOT.tables.find((t: { league: string }) => t.league === u.searchParams.get('league')));
      table.fetchedAt = new Date().toISOString(); table.stale = false;
      return route.fulfill({ json: table });
    }
    if (u.pathname !== '/scoreboard.php') return route.continue();
    if (mode === 'error') return route.fulfill({ status: 503, json: { code: 'UPSTREAM_UNAVAILABLE' } });
    const statistics = mode === 'empty' ? [] : [stat('possessionPct', 50), stat('totalShots', 10), stat('shotsOnTarget', 4)];
    return route.fulfill({ headers: { 'X-Matches-Cache': mode === 'cached' ? 'STALE' : 'HIT', 'X-Cache-Age': mode === 'cached' ? '1' : '0' }, json: { events: [{ date: '2026-10-13T19:00:00Z', competitions: [{ date: '2026-10-13T19:00:00Z', competitors: [{ homeAway: 'home', score: '2', team: { displayName: 'Atlético Madrid' }, statistics }, { homeAway: 'away', score: '0', team: { displayName: 'Manchester United' }, statistics }], status: { type: { state: mode === 'scheduled' ? 'pre' : 'post', completed: mode !== 'scheduled', name: mode === 'scheduled' ? 'STATUS_SCHEDULED' : 'STATUS_FULL_TIME' } } }] }] } });
  });
  await page.goto(PATH);
  await expect(page.locator('#analysis-charts')).toHaveAttribute('data-enhanced', 'true');
  await page.locator('[data-chart-source="espn"]').click();
  await expect(page.locator('[data-chart-status]')).toContainText('انتهت المباراة');
  await assertCentralized(page);
  for (const [state, message] of [['cached','بيانات مخزنة قد تتأخر'],['error','تعذر تحديث الأرقام'],['empty','لم ترد أرقام إحصائية أحدث'],['scheduled','لم تنطلق المباراة بعد']]) {
    mode = state; await page.clock.fastForward(60_000);
    await expect(page.locator('[data-chart-status]')).toContainText(message);
    await assertCentralized(page);
  }
  mode = 'ok'; await page.clock.fastForward(300_000);
  await expect(page.locator('#competition-standings [data-feed-state="updated"]')).toHaveCount(3);
  await assertCentralized(page);
  await page.locator('[data-chart-source="uefa"]').click();
  await expect(page.locator('[data-chart-badge]')).toHaveText('أرقام نهائية');
  await expect(page.locator('#analysis-charts [data-metric="attempts"] [data-chart-value="home"]')).toHaveText('11');
  await assertCentralized(page);
});

test('documentation: links and source explanations stay readable and keyboard accessible from 320px to desktop', async ({ page }) => {
  await localOnly(page); await page.goto(PATH);
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1100 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.locator('#report-sources .report-source').evaluateAll(cards => cards.every(el => el.scrollWidth <= el.clientWidth))).toBe(true);
  }
  const nav = page.locator('.report-nav a[href="#report-sources"]');
  await nav.focus(); await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#report-sources$/);
  await expect(page.locator('#report-sources h2')).toBeInViewport();
  const reference = page.locator('#source-uefa-lineups a');
  await reference.focus(); await expect(reference).toBeFocused(); await expect(reference).toHaveCSS('outline-width','3px');
});

test('documentation: preview failures and offline recovery preserve dates and keep brands out of the widgets', async ({ page, context }) => {
  await localOnly(page); await page.goto(PATH);
  await expect(page.locator('#competition-standings')).toHaveAttribute('data-enhanced', 'true');
  await expect(page.locator('#competition-standings [aria-busy="true"]')).toHaveCount(0);
  const times = await page.locator('#competition-standings [data-fetched-at]').evaluateAll(cards => cards.map(el => el.getAttribute('data-fetched-at')));
  await page.locator('[data-chart-source="espn"]').click();
  await assertCentralized(page);
  await context.setOffline(true);
  await expect(page.locator('#analysis-charts [data-chart-status]')).toContainText('لا يوجد اتصال');
  await assertCentralized(page);
  expect(await page.locator('#competition-standings [data-fetched-at]').evaluateAll(cards => cards.map(el => el.getAttribute('data-fetched-at')))).toEqual(times);
  await context.setOffline(false);
  await expect(page.locator('#competition-standings [aria-busy="true"]')).toHaveCount(0);
  await assertCentralized(page);
});
