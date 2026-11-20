import { test, expect } from '@playwright/test';

for (const width of [320, 390, 768, 1440]) {
  test(`unified shell preview preserves reference navigation and cart at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 850 });
    await page.route('https://**', route => route.abort());
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/home-preview/unified-site-preview/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,nofollow');
    await expect(page.locator('.nav__logo')).toBeVisible();
    const toggle = page.locator('.nav__menu-btn');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('.nav__menu .preview-menu-group h2')).toHaveText(['اكتشف', 'ابدأ المشاهدة', 'المساعدة والمزيد']);
    await expect(page.locator('.nav__menu a[href="/#reviews"]')).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await page.locator('#sm-currency').selectOption('SAR');
    await page.locator('.sm-cart-open').click();
    await expect(page.locator('#sm-cart-dialog')).toBeVisible();
    await page.locator('.sm-cart-close').click();
    await expect(page.locator('.sm-contact h2')).toContainText('المشاهدة');
    await expect(page.locator('footer.sm-footer')).toContainText('استكشف');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
    expect(errors).toEqual([]);
  });
}
