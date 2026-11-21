import { test, expect } from '@playwright/test';

for (const url of ['/', '/home-preview/saved-reference/']) {
  test(`mobile motion preference and stadium work on ${url}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(() => localStorage.setItem('sm-motion-preference', 'on'));
    await page.route('**/*.mp4*', route => route.abort());
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-motion-reduced', 'false');
    await expect(page.locator('.sm-section-motion')).toHaveCount(15);
    await expect(page.locator('#sports-news')).toHaveCount(1);
    expect(await page.locator('.editorial-hero-media video').count()).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await page.evaluate(() => window.scrollTo(0, 420));
    await expect.poll(() => page.locator('.editorial-field-visual').evaluate(el => parseFloat((el as HTMLElement).style.getPropertyValue('--field-tilt'))), { timeout: 15000 }).toBeGreaterThan(1);
    await expect(page.locator('.editorial-field-visual')).not.toHaveCSS('transform', 'none');
    await expect(page.locator('#sports-news h2')).toHaveCSS('opacity', '1');
    expect(await page.locator('#about').evaluate(el => (el as HTMLElement).style.getPropertyValue('--section-shift'))).not.toBe('');
    // Exercise the actual site setting, not just a simulated media preference.
    await page.locator('#sm-motion-setting').selectOption('off', { force: true });
    await expect(page.locator('html')).toHaveAttribute('data-motion-reduced', 'true');
    await expect(page.locator('.editorial-field-visual')).toHaveCSS('transform', 'none');
    await expect(page.locator('#about')).toHaveCSS('translate', 'none');
    await page.locator('#sm-motion-setting').selectOption('on', { force: true });
    await expect(page.locator('html')).toHaveAttribute('data-motion-reduced', 'false');
    await expect.poll(() => page.locator('.editorial-field-visual').evaluate(el => parseFloat((el as HTMLElement).style.getPropertyValue('--field-tilt'))), { timeout: 15000 }).toBeGreaterThan(1);
  });
}
