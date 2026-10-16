import { test, expect, type Page } from '@playwright/test';

const PATH = '/manchester-united-atletico/';
const section = (page: Page) => page.locator('#arabic-reviews');
const docs = (page: Page) => page.locator('#report-sources');
async function localOnly(page: Page) {
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (!['localhost', '127.0.0.1'].includes(url.hostname)) return route.abort();
    if (url.pathname === '/scoreboard.php') return route.fulfill({ json: { events: [] } });
    return route.continue();
  });
}

test('analyst reviews: authors and summaries stay visible without JS; exact video metadata moves to documentation', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage(); await localOnly(page); await page.goto(new URL(PATH, baseURL).href);
    const root = section(page); const references = docs(page);
    await expect(root.locator('[data-analyst-review]')).toHaveCount(2);
    await expect(root.locator('h3')).toHaveText(['محمد عواد', 'ممدوح نصرالله']);
    await expect(root.locator('.fr-summary')).toHaveCount(2);
    await expect(root.locator('cite, a[href^="http"]')).toHaveCount(0);
    await expect(references.locator('[data-review-source] .fd-original-title')).toHaveCount(2);
    await expect(references.locator('[data-review-source] .fd-video-date time').first()).toHaveAttribute('datetime', '2026-10-13');
    await expect(references.locator('[data-review-source] .fd-video-date time').last()).toHaveAttribute('datetime', '2026-10-15');
    await expect(references.locator('.fd-reviewed time')).toHaveAttribute('datetime', '2026-10-16');
    for (const link of await root.locator('.fr-open-video').all()) await expect(link).toBeVisible();
    await expect(page.locator('h1')).toHaveCount(1);
  } finally { await context.close(); }
});

test('analyst reviews: scope stays explicit and original secure destinations are only in documentation', async ({ page }) => {
  await localOnly(page); await page.goto(PATH);
  const root = section(page); const references = docs(page);
  await expect(root.locator('[data-review-scope="roundup"] .fr-summary')).toContainText('ليس في حلقة مخصّصة بالكامل');
  await expect(root.locator('[data-review-scope="aftermath"] .fr-summary')).toContainText('ليس تحليلاً تفصيلياً لكل لقطة');
  await expect(root.locator('[data-analyst-review="yibbAkJUu78"] .fr-open-video')).toHaveAttribute('href', '#source-awaad-review');
  await expect(references.locator('[data-review-source="yibbAkJUu78"] [data-doc-video]')).toHaveAttribute('href', 'https://www.youtube.com/watch?v=yibbAkJUu78');
  await expect(references.locator('[data-review-source="MYbD3-0BvoA"] [data-doc-channel]')).toHaveAttribute('href', 'https://www.youtube.com/@MamdouhNasrAllah');
  for (const link of await references.locator('[data-review-source] a[href^="https:"]').all()) {
    await expect(link).toHaveAttribute('target', '_blank'); await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  }
  await expect(root.locator('iframe, video, audio, img, script')).toHaveCount(0);
  await expect(root.locator('.fr-editorial-note')).toContainText('ليست اقتباساً حرفياً');
});

test('analyst reviews: no YouTube request before intent and all editorial content stays available offline', async ({ page, context }) => {
  const requests: string[] = []; const errors: string[] = [];
  page.on('request', r => requests.push(r.url())); page.on('pageerror', e => errors.push(e.message));
  await localOnly(page); await page.goto(PATH);
  const root = section(page); const before = await root.innerHTML();
  await context.setOffline(true);
  await expect(root.locator('.fr-summary')).toHaveCount(2);
  expect(await root.innerHTML()).toBe(before);
  expect(requests.filter(url => /youtube|ytimg|googlevideo|fixture-reviews\.js|reviews\.php/i.test(url))).toEqual([]);
  expect(errors).toEqual([]);
});

test('analyst reviews: details jump to documentation before the original video opens externally', async ({ page, context }) => {
  // Controlled stand-in: verifies navigation, never claims live playback.
  let externalRequests = 0;
  await context.route('https://www.youtube.com/**', async route => {
    externalRequests++;
    return route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head><title>Source navigation test</title></head><body>External source test</body></html>' });
  });
  await localOnly(page); await page.goto(PATH); expect(externalRequests).toBe(0);
  await section(page).locator('[data-analyst-review="yibbAkJUu78"] .fr-open-video').click();
  await expect(page).toHaveURL(/#source-awaad-review$/);
  await expect(docs(page).locator('#source-awaad-review h3')).toBeInViewport();
  expect(externalRequests).toBe(0);
  const original = page.url(); const popupPromise = page.waitForEvent('popup');
  await docs(page).locator('[data-review-source="yibbAkJUu78"] [data-doc-video]').click();
  const popup = await popupPromise;
  try {
    await expect(popup).toHaveURL('https://www.youtube.com/watch?v=yibbAkJUu78');
    await expect(popup).toHaveTitle('Source navigation test');
    expect(externalRequests).toBe(1); expect(page.url()).toBe(original);
    await expect(section(page).locator('iframe, video')).toHaveCount(0);
  } finally { await popup.close(); }
});

test('analyst reviews: keyboard reaches summaries, centralized references and visible video-link focus', async ({ page }) => {
  await localOnly(page); await page.goto(PATH);
  const jump = page.locator('.report-nav a[href="#arabic-reviews"]');
  await jump.focus(); await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#arabic-reviews$/);
  await expect(section(page).getByRole('heading', { level: 2 })).toBeInViewport();
  const link = section(page).getByRole('link', { name: 'تفاصيل مراجعة ممدوح نصرالله والفيديو في قسم التوثيق والمراجعة', exact: true });
  await link.focus(); await expect(link).toBeFocused(); await expect(link).toHaveCSS('outline-width', '3px');
  await page.keyboard.press('Enter'); await expect(page).toHaveURL(/#source-nasrallah-review$/);
  const external = docs(page).getByRole('link', { name: 'مراجعة ممدوح نصرالله على يوتيوب (تبويب جديد)', exact: true });
  await external.focus(); await expect(external).toBeFocused(); await expect(external).toHaveCSS('outline-width', '3px');
});

test('analyst reviews: RTL cards and centralized references fit 320–1440px without changing the match data', async ({ page }) => {
  await localOnly(page); await page.goto(PATH);
  const root = section(page);
  for (const width of [320, 390, 620, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1100 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const region of [root, docs(page)]) {
      const box = await region.boundingBox(); expect(box && box.x >= 0 && box.x + box.width <= width).toBe(true);
    }
    const fit = await root.locator('.fr-open-video').evaluateAll(links => links.every(el => { const p = el.parentElement!.getBoundingClientRect(); const b = el.getBoundingClientRect(); return b.left >= p.left - 1 && b.right <= p.right + 1; }));
    expect(fit).toBe(true);
  }
  await expect(root.locator('h3').first()).toHaveCSS('color', 'rgb(244, 247, 255)');
  await expect(root.locator('.fr-summary-label').first()).toHaveCSS('color', 'rgb(237, 243, 255)');
  await expect(page.locator('#competition-standings tbody tr')).toHaveCount(76);
  await expect(page.locator('#match-lineups [data-starting-player]')).toHaveCount(22);
  await expect(page.locator('#uefa-stats [data-stat="possession"] td').first()).toHaveText('57%');
  await expect(page.locator('#analysis-charts [data-metric="attempts"] [data-chart-value="home"]')).toHaveText('11');
});
