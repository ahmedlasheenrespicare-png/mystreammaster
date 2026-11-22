import { test, expect } from '@playwright/test';

const standings = { ok: true, provider: 'ESPN', league: 'eng.1', phase: 'league', season: 2026, fetchedAt: '2026-11-21T12:00:00Z', stale: false, entries: Array.from({ length: 20 }, (_, i) => ({ teamId: String(i + 1), name: `Test Team ${i + 1}`, rank: i + 1, played: 10, wins: 5, draws: 2, losses: 3, goalsFor: 20, goalsAgainst: 10, goalDifference: 10, points: 17 })) };

test('world copy loads live standings and rates without historical data', async ({ page }) => {
  const oldRequests: string[] = [];
  page.on('request', request => { if (/league-archive-.*\.json|standings-snapshot\.json/.test(request.url())) oldRequests.push(request.url()); });
  await page.route('**/standings.php?*', route => route.fulfill({ json: standings }));
  for (const view of ['standings', 'stats']) {
    await page.goto(`/leagues/premier-league/${view}/`);
    const world = page.frameLocator('.world-copy iframe');
    await expect(world.locator('#overlay-title')).toHaveText('الدوري الإنجليزي');
    await expect(world.locator('.table-panel tbody tr')).toHaveCount(20, { timeout: 30000 });
    await expect(world.locator('.table-panel tbody')).toContainText('Test Team 1');
    if (view === 'stats') await expect(world.locator('.table-panel tbody')).toContainText('2.00');
  }
  expect(oldRequests).toEqual([]);
});

test('world copy reports unavailable and stale standings rather than archives', async ({ page }) => {
  await page.route('**/standings.php?*', route => route.fulfill({ status: 503, json: { ok: false } }));
  await page.goto('/leagues/premier-league/standings/');
  let world = page.frameLocator('.world-copy iframe');
  await expect(world.locator('.table-panel .empty')).toContainText('غير متاحة', { timeout: 30000 });
  await page.unroute('**/standings.php?*');
  await page.route('**/standings.php?*', route => route.fulfill({ json: { ...standings, stale: true } }));
  await page.reload();
  world = page.frameLocator('.world-copy iframe');
  await expect(world.locator('.table-panel tbody tr')).toHaveCount(20, { timeout: 30000 });
  await expect(world.locator('.table-note')).toContainText('قديمة');
});

test('world copy uses scoreboard and the Saudi match identifier', async ({ page }) => {
  let league = '';
  await page.route('**/scoreboard.php?*', route => { league = new URL(route.request().url()).searchParams.get('league') || ''; return route.fulfill({ json: { events: [] }, headers: { 'X-Matches-Cache': 'STALE' } }); });
  await page.goto('/leagues/saudi-pro-league/matches/');
  const world = page.frameLocator('.world-copy iframe');
  await expect(world.locator('.match-status')).toContainText('لا توجد مباريات مؤكدة', { timeout: 30000 });
  expect(league).toBe('sau.1');
});

test('the index opens the original world experience', async ({ page }) => {
  await page.goto('/leagues/');
  const world = page.frameLocator('.world-copy iframe');
  await expect(world.locator('.cards > .card')).toHaveCount(8);
  await expect(page.locator('.league-card')).toHaveCount(8);
});

for (const width of [390, 1440]) test(`original world buttons remain in the world at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 844 });
  await page.addInitScript(() => localStorage.setItem('sm-motion-preference', 'off'));
  await page.route('**/*.mp4*', route => route.abort());
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('a.world-index-link')).toHaveAttribute('href', '/leagues/');
  await page.locator('.world-launch').evaluate((el: HTMLElement) => el.click());
  const frame = page.frameLocator('#explore-world');
  await expect(frame.locator('.cards > .card').first()).toBeAttached();
  await frame.locator('.flip-hint').first().evaluate((el: HTMLElement) => el.click());
  await frame.locator('.card-open-details').first().evaluate((el: HTMLElement) => el.click());
  await expect(frame.locator('.league-overlay')).toBeVisible();
  await frame.locator('[data-overlay-view="standings"]').click();
  await expect(frame.locator('.league-screen')).toBeVisible();
  await expect(frame.locator('#league-screen-title')).toHaveText('الترتيب');
  await frame.locator('[data-screen-view="rates"]').click();
  await expect(frame.locator('#league-screen-title')).toHaveText('الإحصائيات');
  await frame.locator('[data-screen-view="matches"]').click();
  await expect(frame.locator('#league-screen-title')).toHaveText('المباريات');
  await expect(page).toHaveURL(/\/$/);
});

for (const width of [390, 1440]) test(`header league menu provides competition icons and page links at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 844 });
  await page.addInitScript(() => localStorage.setItem('sm-motion-preference', 'off'));
  await page.route('**/*.mp4*', route => route.abort());
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const trigger = width < 1024 ? page.locator('.league-mobile-trigger') : page.locator('.nav__links .league-menu-trigger');
  if (width < 1024) await page.locator('.nav__menu-btn').click();
  await trigger.click();
  const menu = page.locator('#league-header-panel');
  await expect(menu).toBeVisible();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(menu.locator('.league-menu-card')).toHaveCount(8);
  await expect(menu.locator('.league-menu-icon img')).toHaveCount(8);
  await expect(menu.locator('a[href="/leagues/premier-league/standings/"]')).toBeAttached();
  await expect(menu.locator('a[href="/leagues/premier-league/stats/"]')).toBeAttached();
  await expect(menu.locator('a[href="/leagues/premier-league/matches/"]')).toBeAttached();
  await expect.poll(() => menu.locator('img').first().evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await menu.locator('a[href="/leagues/premier-league/"]').click();
  await expect(page).toHaveURL(/\/leagues\/premier-league\/$/);
});
