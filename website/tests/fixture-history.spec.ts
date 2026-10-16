import { test, expect, type Page } from '@playwright/test';

const PATH = '/manchester-united-atletico/';
const root = (page: Page) => page.locator('#head-to-head');
const expected = [
  { date:'2026-10-13', year:'2026', atleti:'2', united:'0', title:'دوري أبطال أوروبا', friendly:'false' },
  { date:'2026-08-01', year:'2026', atleti:'1', united:'2', title:'كأس سنابدراجون', friendly:'true' },
  { date:'2022-07-30', year:'2022', atleti:'1', united:'0', title:'ودية للأندية', friendly:'true' },
];
async function localOnly(page: Page) {
  await page.route('**/*', route => {
    const u = new URL(route.request().url());
    if (!['localhost','127.0.0.1'].includes(u.hostname)) return route.abort();
    if (u.pathname === '/scoreboard.php') return route.fulfill({ json:{ events:[] } });
    return route.continue();
  });
}

test('history: all three correct results, competitions and years exist without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled:false });
  try {
    const page = await context.newPage(); await localOnly(page); await page.goto(new URL(PATH,baseURL).href);
    await expect(root(page).locator('[data-history-match]')).toHaveCount(3);
    for (const row of expected) {
      const match = root(page).locator(`[data-history-match="${row.date}"]`);
      await expect(match.locator('h3')).toHaveText(row.title);
      await expect(match.locator('time')).toHaveAttribute('datetime',row.date);
      await expect(match.locator('[data-history-calendar-year]')).toHaveText(row.year);
      await expect(match.locator('[data-history-team="atletico"] .fh-goals')).toHaveText(row.atleti);
      await expect(match.locator('[data-history-team="united"] .fh-goals')).toHaveText(row.united);
      await expect(match).toHaveAttribute('data-history-friendly',row.friendly);
    }
    await expect(root(page)).toContainText('تشمل مباراة هذا التقرير');
    await expect(root(page).locator('.fh-current')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveCount(1);
  } finally { await context.close(); }
});

test('history: attribution remains centralized and no browser feed is added for the archived results', async ({ page, context }) => {
  const calls:string[]=[]; const errors:string[]=[];
  page.on('request', r => calls.push(r.url())); page.on('pageerror', e => errors.push(e.message));
  await localOnly(page); await page.goto(PATH);
  const history = root(page); const before = await history.innerHTML();
  await expect(history.locator('a,cite,script,iframe,img,video')).toHaveCount(0);
  await expect(page.locator('#source-head-to-head a[href^="https:"]')).toHaveCount(2);
  await expect(page.locator('#source-head-to-head a').first()).toHaveAttribute('href','https://www.bbc.com/sport/football/live/cm0j013q35dqt#previous-scores');
  await context.setOffline(true);
  expect(await history.innerHTML()).toBe(before);
  expect(calls.filter(u => /bbc\.com|manutd\.com|history\.php|fixture-history\.js/i.test(u))).toEqual([]);
  expect(errors).toEqual([]);
});

test('history: keyboard section jump is visible and preserves the previous match widgets', async ({ page }) => {
  await localOnly(page); await page.goto(PATH);
  const jump = page.locator('.report-nav a[href="#head-to-head"]');
  await jump.focus(); await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#head-to-head$/);
  await expect(root(page).getByRole('heading',{ level:2 })).toBeInViewport();
  await expect(page.locator('#uefa-stats [data-stat]')).toHaveCount(24);
  await expect(page.locator('#competition-standings tbody tr')).toHaveCount(76);
  await expect(page.locator('#match-lineups [data-starting-player]')).toHaveCount(22);
  await expect(page.locator('#analysis-charts [data-metric="attempts"] [data-chart-value="home"]')).toHaveText('11');
});

test('history: RTL goals stay under the right club and every card fits 320–1440px', async ({ page }) => {
  await localOnly(page); await page.goto(PATH);
  for (const width of [320,390,620,768,900,1024,1440]) {
    await page.setViewportSize({ width,height:1100 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const bounds = await root(page).boundingBox(); expect(bounds && bounds.x >= 0 && bounds.x+bounds.width <= width).toBe(true);
    expect(await root(page).locator('.fh-card').evaluateAll(cards => cards.every(el => el.scrollWidth <= el.clientWidth))).toBe(true);
    for (const row of expected) {
      const match = root(page).locator(`[data-history-match="${row.date}"]`);
      const a = await match.locator('[data-history-team="atletico"]').boundingBox();
      const u = await match.locator('[data-history-team="united"]').boundingBox();
      expect(a && u && a.x > u.x).toBe(true);
      await expect(match.locator('[data-history-team="atletico"] .fh-goals')).toHaveText(row.atleti);
      await expect(match.locator('[data-history-team="united"] .fh-goals')).toHaveText(row.united);
    }
  }
  await expect(root(page).locator('h3').first()).toHaveCSS('color','rgb(244, 247, 255)');
  await expect(root(page).locator('.fh-goals').first()).toHaveCSS('color','rgb(244, 247, 255)');
});
