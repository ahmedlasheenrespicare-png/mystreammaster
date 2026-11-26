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
  await trigger.locator('xpath=ancestor::details').locator('summary').click();
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


test('readable standings outside the world use live data, show staleness and recover after failure', async ({ page }) => {
  await page.route('**/standings.php?*', route => route.fulfill({ status: 503, json: { ok: false } }));
  await page.goto('/leagues/premier-league/standings/');
  const readable = page.locator('.league-readable');
  await expect(readable.locator('.league-data-status')).toContainText('تعذّر');
  await expect(readable.locator('.live-retry')).toBeVisible();
  await page.unroute('**/standings.php?*');
  await page.route('**/standings.php?*', route => route.fulfill({ json: { ...standings, stale: true } }));
  await readable.locator('.live-retry').click();
  await expect(readable.locator('tbody tr')).toHaveCount(20);
  await expect(readable).toContainText('Test Team 1');
  await expect(readable.locator('.league-data-status')).toContainText('قديمة');
});

test('last successful browser data remains visible if a later refresh fails', async ({ page }) => {
  let requests = 0;
  await page.route('**/standings.php?*', route => {
    requests++;
    return requests === 1 ? route.fulfill({ json: standings }) : route.fulfill({ status: 503, json: { ok: false } });
  });
  await page.goto('/leagues/premier-league/standings/');
  const readable = page.locator('.league-readable');
  await expect(readable.locator('tbody tr')).toHaveCount(20);
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(readable.locator('.league-data-status')).toContainText('قديمة');
  await expect(readable.locator('tbody tr')).toHaveCount(20);
  await expect(readable.locator('.live-retry')).toBeVisible();
});

test('server-rendered data stays visible and is marked when the browser refresh fails', async ({ page }) => {
  await page.route('**/leagues/premier-league/standings/', async route => {
    const response = await route.fetch();
    const html = await response.text();
    const fallback = '<!--SM_LEAGUE_DATA--><noscript><p>لا تتوفر البيانات المباشرة في النسخة الثابتة. أعد المحاولة لاحقًا.</p></noscript>';
    const rendered = '<div data-server-league-data="true"><p>آخر قراءة من المصدر</p><table><tbody><tr><td>Server Team</td></tr></tbody></table></div>';
    expect(html).toContain(fallback);
    await route.fulfill({ response, body: html.replace(fallback, rendered) });
  });
  await page.route('**/standings.php?*', route => route.fulfill({ status: 503, json: { ok: false } }));
  await page.goto('/leagues/premier-league/standings/');
  const readable = page.locator('.league-readable');
  await expect(readable.locator('.league-data-status')).toContainText('قديمة');
  await expect(readable.locator('tbody')).toContainText('Server Team');
});

test('readable rates and Saudi matches use the world source identifiers', async ({ page }) => {
  await page.route('**/standings.php?*', route => route.fulfill({ json: standings }));
  await page.goto('/leagues/premier-league/stats/');
  await expect(page.locator('.league-readable tbody tr')).toHaveCount(20);
  await expect(page.locator('.league-readable')).toContainText('2.00');
  let league = '';
  await page.route('**/scoreboard.php?*', route => { league = new URL(route.request().url()).searchParams.get('league') || ''; return route.fulfill({ json: { events: [] } }); });
  await page.goto('/leagues/saudi-pro-league/matches/');
  await expect(page.locator('.league-data-status')).toContainText('لا توجد مباريات مؤكدة');
  expect(league).toBe('sau.1');
});

for (const width of [390, 1440]) for (const javascriptEnabled of [false, true]) {
  test(`pricing link reaches visible server section at ${width}px (JavaScript ${javascriptEnabled})`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, viewport: { width, height: 844 }, javaScriptEnabled: javascriptEnabled, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.route('**/*.mp4*', route => route.abort());
    await page.goto('/nova/', { waitUntil: 'domcontentloaded' });
    await page.locator('a[href="/#pricing"]').first().click();
    await expect(page).toHaveURL(/\/#(?:pricing|works)$/, { timeout: 15000 });
    await expect(page.locator('#works #pricing')).toHaveCount(1);
    // Assert actual on-screen position, not merely the URL or element existence.
    await expect.poll(async () => page.locator('#works').evaluate(el => { const r = el.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; }), { timeout: 30000 }).toBe(true);
    await context.close();
  });
}

test.describe('league content without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('does not show an endless loading message or claim live data is present', async ({ page }) => {
    await page.goto('/leagues/premier-league/standings/');
    await expect(page.locator('.league-data-status')).toBeHidden();
    await expect(page.locator('.league-readable > noscript p')).toBeVisible();
    await expect(page.locator('.league-readable > noscript p')).toHaveText(/يلزم JavaScript لتحديث البيانات تلقائيًا/);
    await expect(page.locator('.league-readable tbody tr')).toHaveCount(0);
  });
});
