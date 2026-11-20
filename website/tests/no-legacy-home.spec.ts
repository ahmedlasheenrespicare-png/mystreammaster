import { test, expect } from '@playwright/test';

for (const [source, target, language] of [
  ['/store/', '/', 'ar'],
  ['/en/nova/', '/en/', 'en'],
] as const) {
  test(`navigation from ${source} loads the approved ${language} homepage document`, async ({ page }) => {
    await page.route('https://**', route => route.abort());
    await page.route('**/*.mp4*', route => route.abort());
    await page.goto(source, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => { (window as Window & { oldDocument?: boolean }).oldDocument = true; });
    await page.locator(`header a[href="${target}"]`).first().click();
    await expect(page).toHaveURL(new RegExp(`${target.replaceAll('/', '\\/')}$`));
    await expect(page.locator('.nav__menu-btn')).toHaveCount(1);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /^index, follow/);
    expect(await page.evaluate(() => (window as Window & { oldDocument?: boolean }).oldDocument)).toBeUndefined();
    await expect(page.locator('html')).toHaveAttribute('lang', language);
  });
}

test('a legacy home anchor navigates to the standalone approved homepage', async ({ page }) => {
  await page.route('https://**', route => route.abort());
  await page.route('**/*.mp4*', route => route.abort());
  await page.goto('/store/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { (window as Window & { oldDocument?: boolean }).oldDocument = true; });
  await page.locator('footer a[href="/#works"]').first().evaluate((link: HTMLAnchorElement) => link.click());
  await expect(page).toHaveURL(/\/#works$/);
  await expect(page.locator('#works')).toHaveCount(1);
  expect(await page.evaluate(() => (window as Window & { oldDocument?: boolean }).oldDocument)).toBeUndefined();
});
