import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs/promises';

const SNAPSHOT = JSON.parse(await fs.readFile(new URL('../src/content/fixture-lineups-snapshot.json', import.meta.url), 'utf8'));
const PATH = '/manchester-united-atletico/';
const rootOf = (page: Page) => page.locator('#match-lineups');
async function localOnly(page: Page) {
  await page.route('**/*', route => {
    const u = new URL(route.request().url());
    if (!['localhost', '127.0.0.1'].includes(u.hostname)) return route.abort();
    if (u.pathname === '/scoreboard.php') return route.fulfill({ json: { events: [] } });
    return route.continue();
  });
}

test('lineups: all confirmed starters, substitutes and 31 scores exist without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage(); await localOnly(page);
    await page.goto(new URL(PATH, baseURL).href);
    const root = rootOf(page);
    await expect(root.locator('[data-starting-player]')).toHaveCount(22);
    await expect(root.locator('[data-substitute-player]')).toHaveCount(10);
    await expect(root.locator('[data-unused-player]')).toHaveCount(14);
    await expect(root.locator('[data-starting-player] [data-player-rating], [data-substitute-player] [data-player-rating]')).toHaveCount(31);
    await expect(root.locator('[data-lineup-formation]')).toHaveText(['4-4-2', '4-2-3-1']);
    await expect(root.locator('.fl-captain')).toHaveCount(2);
    await expect(root.locator('[data-lineups-reading]')).toContainText('التقييمات ليست لحظية ولا تُحدَّث آلياً');
    await expect(root.locator('[data-lineups-reading] time')).toHaveAttribute('datetime', SNAPSHOT.reviewedAt);
    await expect(page.locator('h1')).toHaveCount(1);
  } finally { await context.close(); }
});

test('lineups: official award and provider rating are distinct, with no fabricated score for Le Normand', async ({ page }) => {
  await localOnly(page); await page.goto(PATH);
  const root = rootOf(page);
  await expect(root.locator('[data-recognition="uefa"]')).toContainText('أليكس باينا');
  await expect(root.locator('[data-recognition="fotmob"]')).toContainText('بابلو باريوس');
  await expect(root.locator('[data-recognition="fotmob"] [data-player-rating]')).toHaveAttribute('data-player-rating', '8.3');
  const unrated = root.locator('[data-substitute-player="250112513"]');
  await expect(unrated).toContainText('88′');
  await expect(unrated.locator('[data-rating-unavailable]')).toHaveText('غير متاح');
  await expect(unrated.locator('[data-player-rating]')).toHaveCount(0);
  await expect(root.locator('[data-starting-player="250118908"] [data-player-rating]')).toHaveAttribute('data-player-rating', '7.1');
  await expect(root.locator('[data-starting-player="250189295"] [data-player-rating]')).toHaveAttribute('data-player-rating', '6.5');
});

test('lineups: UEFA substitutions, captains, and dismissal keep the official identities and minutes', async ({ page }) => {
  await localOnly(page); await page.goto(PATH);
  const root = rootOf(page);
  await expect(root.locator('[data-starting-player="250012069"] .fl-captain')).toHaveText('القائد');
  await expect(root.locator('[data-starting-player="250078886"] .fl-captain')).toHaveText('القائد');
  await expect(root.locator('[data-substitute-player="250076240"]')).toContainText('66′');
  await expect(root.locator('[data-starting-player="250188249"]')).toContainText('خرج 66′');
  await expect(root.locator('[data-starting-player="250165232"]')).toContainText('طرد 74′');
  await expect(root.locator('[data-starting-player="250165232"]')).not.toContainText('خرج');
  await expect(root.locator('[data-unused-player="250212698"]')).toContainText('ليتوبا');
});

test('lineups: visible content needs no new browser feed and stays unchanged when offline', async ({ page, context }) => {
  const requests: string[] = []; const errors: string[] = [];
  page.on('request', r => requests.push(r.url())); page.on('pageerror', e => errors.push(e.message));
  await localOnly(page); await page.goto(PATH);
  const root = rootOf(page); const before = await root.innerHTML();
  await context.setOffline(true);
  await expect(root.locator('[data-starting-player]')).toHaveCount(22);
  expect(await root.innerHTML()).toBe(before);
  expect(requests.filter(url => /fotmob\.com|uefa\.com|lineups\.php|lineups\.js/.test(url))).toEqual([]);
  expect(errors).toEqual([]);
});

test('lineups: trusted source references link to this specific match, not streams or predicted lineups', async ({ page }) => {
  await localOnly(page); await page.goto(PATH);
  const root = rootOf(page);
  const documentation = page.locator('#report-sources');
  const official = documentation.getByRole('link', { name: 'قائمة UEFA الرسمية للمباراة' });
  const ratings = documentation.getByRole('link', { name: 'تشكيل وتقييمات مواجهة 13 أكتوبر على FotMob' });
  await expect(root.locator('a[href^="http"]')).toHaveCount(0);
  await expect(official).toHaveAttribute('href', 'https://www.uefa.com/uefachampionsleague/match/2049573--atleti-vs-man-utd/lineups/');
  await expect(ratings).toHaveAttribute('href', 'https://www.fotmob.com/matches/atletico-madrid-vs-manchester-united/3d2krr#6106267');
  for (const link of [official, ratings]) { await expect(link).toHaveAttribute('rel', 'noopener noreferrer'); await expect(link).toHaveAttribute('target', '_blank'); }
  await expect(root.locator('iframe, video, script, img')).toHaveCount(0);
  await expect(root).toContainText('لا يُحسب متوسط للفريق محلياً');
});

test('lineups: section jump and source references are keyboard accessible with visible focus', async ({ page }) => {
  await localOnly(page); await page.goto(PATH);
  const jump = page.locator('.report-nav a[href="#match-lineups"]');
  await jump.focus(); await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#match-lineups$/);
  await expect(rootOf(page).getByRole('heading', { level: 2 })).toBeInViewport();
  const source = page.locator('#report-sources').getByRole('link', { name: 'قائمة UEFA الرسمية للمباراة' });
  await source.focus(); await expect(source).toBeFocused(); await expect(source).toHaveCSS('outline-width', '3px');
});

test('lineups: original RTL pitch fits 320–1440px and keeps attack above the goalkeeper without mirroring', async ({ page }) => {
  await localOnly(page); await page.goto(PATH);
  const root = rootOf(page);
  for (const width of [320, 390, 620, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1100 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const bounds = await root.boundingBox(); expect(bounds && bounds.x >= 0 && bounds.x + bounds.width <= width).toBe(true);
    const defence = root.locator('[data-lineup-team="atletico"] [data-formation-line="1"] [data-starting-player]');
    const rightBack = await defence.first().boundingBox(); const leftBack = await defence.last().boundingBox();
    expect(rightBack && leftBack && rightBack.x > leftBack.x).toBe(true);
    const striker = await root.locator('[data-starting-player="250172668"]').boundingBox();
    const keeper = await root.locator('[data-starting-player="250012069"]').boundingBox();
    expect(striker && keeper && striker.y < keeper.y).toBe(true);
    const allFit = await root.locator('[data-starting-player] .fl-rating').evaluateAll(elements => elements.every(el => { const p = el.parentElement!.getBoundingClientRect(); const b = el.getBoundingClientRect(); return b.left >= p.left - 1 && b.right <= p.right + 1; }));
    expect(allFit).toBe(true);
  }
  await expect(root.locator('h3').first()).toHaveCSS('color', 'rgb(244, 247, 255)');
  await expect(root.locator('[data-formation-line="1"] .fl-line-players').first()).toHaveCSS('direction', 'rtl');
});
