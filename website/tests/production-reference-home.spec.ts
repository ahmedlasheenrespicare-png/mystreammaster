import { test, expect } from '@playwright/test';

for (const width of [320, 390, 768, 1440]) test(`production home functions and remains separate from preview at ${width}px`, async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width, height: 800 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const leaked: string[] = []; const errors: string[] = [];
  page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/home-preview/')) leaked.push(request.url()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('sm-motion-preference', 'off'));
  await page.route('https://**', r => r.abort());
  await page.route('**/*.mp4*', r => r.abort());
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.loader')).toBeHidden({ timeout: 60000 });
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /^index, follow/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://streammasterstore.com/');
  await expect(page.locator('#sm-currency')).toBeVisible();
  await page.locator('#sm-currency').selectOption('EGP');
  await page.evaluate(() => { const el = document.querySelector('#works')!; (window as any).smScrollToSection ? (window as any).smScrollToSection(el) : el.scrollIntoView(); });
  await page.waitForTimeout(2500);
  await page.locator('.league-carousel-item[data-ring-pos="front"] .sm-cart-add').click();
  await expect(page.locator('#sm-cart-dialog')).toBeVisible();
  await expect(page.locator('.sm-cart-item')).toHaveCount(1);
  await page.locator('.sm-cart-plus').click();
  await expect(page.locator('.sm-cart-quantity-value')).toHaveText('2');
  await page.locator('.sm-cart-close').click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator('#sm-language').click();
  await expect(page.locator('.sm-faq__answer p').first()).toContainText('Server performance varies');
  await page.evaluate(() => { const el = document.querySelector('#league-strip')!; (window as any).smScrollToSection ? (window as any).smScrollToSection(el) : el.scrollIntoView(); });
  await page.waitForTimeout(2500);
  await page.locator('.world-launch').click();
  await expect(page.locator('#explore-world')).toHaveAttribute('src', /\/_assets\/reference-home\/[a-f0-9]{40}\/league-world\/world\.html/);
  const frame = page.frameLocator('#explore-world');
  await expect(frame.locator('.card-values__values')).toHaveCount(8, { timeout: 60000 });
  await frame.locator('.go-back').click();
  await expect(page.locator('#explore-world')).toBeHidden();
  expect(leaked).toEqual([]);
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  await context.close();
});

test('production language pages work without JS; reference remains noindex', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('#sm-language')).toHaveAttribute('href', '/en/');
  await page.locator('#sm-language').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://streammasterstore.com/en/');
  await expect(page.locator('.sm-faq__answer p').first()).toContainText('Server performance varies');
  await expect(page.locator('#sm-language')).toHaveAttribute('href', '/');
  await page.goto('/home-preview/saved-reference/');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await context.close();
});

test('production embedded M3U player loads local playlist', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('sm-motion-preference', 'off'));
  await page.route('https://**', r => r.abort()); await page.route('**/*.mp4*', r => r.abort());
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.loader')).toBeHidden({ timeout: 60000 });
  await page.evaluate(() => { const el = document.querySelector('#m3u-player')!; (window as any).smScrollToSection ? (window as any).smScrollToSection(el) : el.scrollIntoView(); });
  const frame = page.frameLocator('#m3u-player iframe');
  await expect(frame.locator('.sm-player-upload')).toBeVisible({ timeout: 60000 });
  await frame.locator('input[type=file]').setInputFiles({ name: 'channels.m3u', mimeType: 'text/plain', buffer: Buffer.from('#EXTM3U\n#EXTINF:-1 group-title="Test",Test Channel\nhttps://example.com/live/test.m3u8\n') });
  await expect(frame.getByText('Test Channel', { exact: true }).first()).toBeVisible({ timeout: 30000 });
});

test('legacy trial links still open the existing request form', async ({ page }) => {
  await page.route('https://**', r => r.abort());
  await page.goto('/?trial=1', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/trial\/\?trial=1$/);
  await expect(page.getByRole('dialog', { name: 'طلب تجربة مجانية' })).toBeVisible({ timeout: 30000 });
});

test('existing homepage section and player links keep working', async ({ page }) => {
  await page.route('https://**', r => r.abort()); await page.route('**/*.mp4*', r => r.abort());
  await page.goto('/#pricing', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/#works$/);
  await expect(page.locator('#works')).toHaveCount(1);
  await page.goto('/#xtream', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/xtream-player\.html$/, { timeout: 30000 });
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await expect(page.getByRole('form', { name: 'تسجيل دخول المشتركين' })).toBeVisible({ timeout: 30000 });
});

for (const width of [320, 390, 1440]) for (const motion of ['off', 'on']) {
  test(`production menu reaches reviews at ${width}px with motion ${motion}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 850 });
    await page.addInitScript(value => localStorage.setItem('sm-motion-preference', value), motion);
    await page.route('https://**', r => r.abort());
    await page.route('**/*.mp4*', r => r.abort());
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.loader')).toBeHidden({ timeout: 60000 });
    const menu = page.locator('.nav__menu');
    await page.locator('.nav__menu-btn').click();
    await expect(menu).toHaveClass(/open/);
    await menu.locator('a[href="#reviews"]').click();
    await expect(menu).not.toHaveClass(/open/);
    await expect(page).toHaveURL(/#reviews$/);
    await expect(page.locator('#reviews')).toBeInViewport({ timeout: 15000 });
  });
}

for (const path of ['/', '/en/']) for (const width of [390, 1440]) {
  test(`deferred home images load while scrolling ${path} at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.addInitScript(() => localStorage.setItem('sm-motion-preference', 'on'));
    await page.route('https://**', r => r.abort());
    await page.route('**/*.mp4*', r => r.abort());
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.loader')).toBeHidden({ timeout: 60000 });
    const image = page.locator('#path-section .sm-fan--sport > img');
    await expect(image).toHaveAttribute('loading', 'lazy');
    await page.evaluate(() => { const el = document.querySelector('#path-section')!; (window as any).smScrollToSection ? (window as any).smScrollToSection(el) : el.scrollIntoView(); });
    await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0), { timeout: 30000 }).toBe(true);
  });
}
