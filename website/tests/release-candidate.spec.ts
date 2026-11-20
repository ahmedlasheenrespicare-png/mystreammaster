import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';

test.beforeAll(() => {
  execFileSync(process.execPath, ['scripts/stage-reference-home.mjs'], { cwd: process.cwd(), stdio: 'pipe' });
});

for (const width of [390, 1440]) test(`isolated noindex home candidate works at ${width}px`, async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width, height: 800 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const leaks: string[] = [];
  page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/home-preview/saved-reference/')) leaks.push(request.url()); });
  await page.addInitScript(() => localStorage.setItem('sm-motion-preference', 'off'));
  await page.route('https://**', r => r.abort());
  await page.route('**/*.mp4*', r => r.abort());
  await page.goto('/home-preview/release-candidate/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.loader')).toBeHidden({ timeout: 60000 });
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await expect(page.locator('#sm-currency')).toBeVisible();
  await page.locator('#sm-currency').selectOption('EGP');
  await page.evaluate(() => { const el = document.querySelector('#works')!; (window as any).smScrollToSection ? (window as any).smScrollToSection(el) : el.scrollIntoView(); });
  await page.waitForTimeout(2500);
  await page.locator('.league-carousel-item[data-ring-pos="front"] .sm-cart-add').click();
  await expect(page.locator('#sm-cart-dialog')).toBeVisible();
  await expect(page.locator('.sm-cart-item')).toHaveCount(1);
  await page.locator('.sm-cart-close').click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator('#sm-language').click();
  await expect(page.locator('.sm-faq__answer p').first()).toContainText('Server performance varies');
  expect(leaks).toEqual([]);
  await context.close();
});

test('candidate language links work without JavaScript and remain isolated', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/home-preview/release-candidate/');
  await expect(page.locator('#sm-language')).toHaveAttribute('href', '/home-preview/release-candidate/en/');
  await page.locator('#sm-language').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await expect(page.locator('#sm-language')).toHaveAttribute('href', '/home-preview/release-candidate/');
  await context.close();
});

test('candidate league iframe uses isolated assets and remains interactive', async ({ page }) => {
  const previewRequests: string[] = [];
  page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/home-preview/saved-reference/')) previewRequests.push(request.url()); });
  await page.addInitScript(() => localStorage.setItem('sm-motion-preference', 'off'));
  await page.route('https://**', r => r.abort());
  await page.route('**/*.mp4*', r => r.abort());
  await page.goto('/home-preview/release-candidate/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.loader')).toBeHidden({ timeout: 60000 });
  await page.locator('.world-launch').click();
  await expect(page.locator('#explore-world')).toHaveAttribute('src', /\/home-preview\/release-candidate\/assets\/league-world\/world\.html/);
  const frame = page.frameLocator('#explore-world');
  await expect(frame.locator('.card-values__values')).toHaveCount(8, { timeout: 60000 });
  await frame.locator('.flip-hint').first().click();
  await frame.locator('.card-open-details').first().click();
  await frame.locator('[data-overlay-view="standings"]').click();
  await expect(frame.locator('.league-screen')).toHaveAttribute('data-view', 'standings');
  const sort = frame.locator('.league-screen .standings-sort').last();
  await expect(sort).toBeVisible({ timeout: 60000 });
  await sort.click();
  await expect(frame.locator('.league-screen th[aria-sort="ascending"]')).toHaveCount(1);
  expect(previewRequests).toEqual([]);
});

test('candidate M3U player loads a local playlist', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('sm-motion-preference', 'off'));
  await page.route('https://**', r => r.abort());
  await page.route('**/*.mp4*', r => r.abort());
  await page.goto('/home-preview/release-candidate/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.loader')).toBeHidden({ timeout: 60000 });
  await page.evaluate(() => { const el = document.querySelector('#m3u-player')!; (window as any).smScrollToSection ? (window as any).smScrollToSection(el) : el.scrollIntoView(); });
  const frame = page.frameLocator('#m3u-player iframe');
  await expect(frame.locator('.sm-player-upload')).toBeVisible({ timeout: 60000 });
  await frame.locator('input[type=file]').setInputFiles({ name: 'channels.m3u', mimeType: 'text/plain', buffer: Buffer.from('#EXTM3U\n#EXTINF:-1 group-title="Test",Test Channel\nhttps://example.com/live/test.m3u8\n') });
  await expect(frame.getByText('Test Channel', { exact: true }).first()).toBeVisible({ timeout: 30000 });
});
