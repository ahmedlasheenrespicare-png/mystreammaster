import { test, expect } from '@playwright/test';

for (const url of ['/nova/', '/channels/', '/about/', '/status/', '/en/nova/']) {
  for (const width of [390, 1440]) {
    test(`unified shell works on ${url} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 850 });
      await page.route('https://**', route => route.abort());
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      const header = page.locator('[data-unified-shell]'), footer = page.locator('[data-unified-footer]');
      await expect(header).toBeVisible();
      await expect(footer).toHaveCount(1);
      await expect(header.locator('.us-logo')).toBeVisible();
      const toggle = header.locator('.us-menu-toggle');
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      await expect(header.locator('.us-menu-panel')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await header.locator('.us-currency').selectOption('SAR');
      expect(await page.evaluate(() => localStorage.getItem('sm-reference-currency'))).toBe('SAR');
      await expect(footer.locator('.us-contact-circle')).toHaveAttribute('href', /^https:\/\/wa\.me\/201090415657\?text=/);
      await expect(footer.locator('.us-mountain')).toHaveAttribute('src', '/_assets/unified/hills-plum.webp');
      await expect(footer).toContainText(url.startsWith('/en/') ? 'Explore' : 'استكشف');
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
      expect(errors).toEqual([]);
    });
  }
}

test('React cart is still usable and keeps the chosen currency', async ({ page }) => {
  await page.route('https://**', route => route.abort());
  await page.goto('/store/', { waitUntil: 'domcontentloaded' });
  await page.locator('.us-currency').selectOption('SAR');
  await page.getByRole('button', { name: /أضف إلى السلة/ }).first().click();
  await expect(page.getByRole('dialog', { name: 'سلة المشتريات' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-us-cart-count]')).toHaveText('1');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('.us-currency')).toHaveValue('SAR');
  await expect(page.locator('[data-us-cart-count]')).toHaveText('1');
});

test('legacy cart link takes the user to the real cart', async ({ page }) => {
  await page.route('https://**', route => route.abort());
  await page.goto('/about/', { waitUntil: 'domcontentloaded' });
  await page.locator('.us-cart').click();
  await expect(page).toHaveURL(/\/cart\/$/);
});

test('legacy motion setting persists and pauses footer animation', async ({ page }) => {
  await page.goto('/about/', { waitUntil: 'domcontentloaded' });
  const setting = page.locator('.us-motion select');
  await setting.selectOption('off');
  expect(await page.evaluate(() => localStorage.getItem('sm-motion-preference'))).toBe('off');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
  await expect(page.locator('.us-contact-hand')).toHaveCSS('animation-name', 'none');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(setting).toHaveValue('off');
});

test('standalone private player keeps its controls and fullscreen fallback with the shared shell', async ({ page }) => {
  await page.route('**/player/five_channels_full.html', route => route.fulfill({status:200, contentType:'text/html', body:'<!doctype html><title>Test player</title>'}));
  await page.goto('/player.html', {waitUntil:'domcontentloaded'});
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await expect(page.locator('[data-unified-shell]')).toBeVisible();
  await expect(page.locator('[data-unified-footer]')).toHaveCount(1);
  await expect(page.locator('#pp-frame')).toHaveAttribute('src', '/player/five_channels_full.html');
  await page.locator('#pp-reload').click();
  await expect(page.locator('#pp-frame')).toHaveAttribute('src', /five_channels_full\.html\?r=/);
  await page.evaluate(() => { document.querySelector<HTMLElement>('#pp-stage')!.requestFullscreen = () => Promise.reject(new Error('fullscreen unavailable')); });
  await page.locator('#pp-expand').click();
  await expect(page.locator('body')).toHaveClass(/pp-fullscreen/);
  await expect(page.locator('[data-unified-shell]')).toBeHidden();
  await expect(page.locator('#pp-frame')).toBeVisible();
});

for (const url of ['/about/', '/nova/']) {
  test(`footer reveal reverses and respects disabled motion on ${url}`, async ({ page }) => {
    await page.route('https://**', route => route.abort());
    await page.goto(url, {waitUntil: 'domcontentloaded'});
    const nav = page.locator('.us-footer-nav');
    const first = nav.locator(':scope > div').first();
    const positionNav = (top: number) => page.evaluate(y => { const nav = document.querySelector('.us-footer-nav')!; window.scrollTo(0, window.scrollY + nav.getBoundingClientRect().top - y); }, top);
    await positionNav(740);
    await expect.poll(() => first.evaluate(el => parseFloat((el as HTMLElement).style.getPropertyValue('--us-entry-y')))).toBeGreaterThan(0);
    const before = await first.evaluate(el => parseFloat((el as HTMLElement).style.getPropertyValue('--us-entry-y')));
    await positionNav(350);
    await expect.poll(() => first.evaluate(el => parseFloat((el as HTMLElement).style.getPropertyValue('--us-entry-y')))).toBeLessThan(before);
    await positionNav(740);
    await expect.poll(() => first.evaluate(el => parseFloat((el as HTMLElement).style.getPropertyValue('--us-entry-y')))).toBeGreaterThan(0);
    const setting = url === '/about/' ? page.locator('.us-motion select') : page.locator('.motion-settings select');
    await setting.selectOption('off');
    await expect(first).toHaveCSS('opacity', '1');
  });
}
