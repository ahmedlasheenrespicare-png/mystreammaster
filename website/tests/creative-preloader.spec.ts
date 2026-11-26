import { test, expect } from '@playwright/test';

for (const width of [390, 1440]) for (const route of ['/', '/en/']) {
  test(`creative preloader finishes when page is ready on ${route} at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.addInitScript(() => {
      // Delay only the readiness promise; the deadline must still guarantee exit.
      Object.defineProperty(document, 'fonts', { configurable: true, value: { ready: new Promise(() => {}) } });
    });
    await page.route('**/*.mp4*', r => r.abort());
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    const loader = page.locator('.sm-preloader');
    await expect(loader).toBeVisible();
    await expect(loader).toContainText(route === '/' ? 'نجهّز تجربتك' : 'Getting things ready');
    await expect(loader.locator('.sm-preloader__brand .sm-crab39')).toHaveCount(1);
    await expect(loader.locator('.sm-preloader__brand .sm-crab39__tile')).toHaveCount(2);
    await expect(loader.locator('.sm-preloader__card')).toHaveCount(4);
    for (const name of ['NOVA', 'iSTAR', 'MOKA', 'X']) await expect(loader.locator('.sm-preloader__card', { hasText: name }).first()).toHaveCount(1);
    await expect(loader).toBeHidden({ timeout: 5000 });
    await expect(page.locator('.ban')).toBeVisible();
    await expect(page.locator('html')).not.toHaveClass(/sm-preloading|sm-preloader-exit/);
  });
}

test('creative preloader never blocks the page without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('.sm-preloader')).toBeHidden();
  await expect(page.locator('.ban')).toBeVisible();
  await context.close();
});

test('reduced motion disables the loading animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => Object.defineProperty(document, 'fonts', { configurable: true, value: { ready: new Promise(() => {}) } }));
  await page.route('**/*.mp4*', r => r.abort());
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.sm-preloader__card').first()).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.sm-preloader')).toBeHidden({ timeout: 5000 });
});
