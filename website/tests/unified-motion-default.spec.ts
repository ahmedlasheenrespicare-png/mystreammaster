import { test, expect } from '@playwright/test';

for (const route of ['/', '/en/', '/nova/', '/about/']) {
  test(`motion defaults to on for ${route}, including when the device requests reduced motion`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: {width: 390, height: 780}, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.route('https://**', route => route.abort());
    await page.goto(route, {waitUntil:'domcontentloaded'});
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
    const setting = route === '/' || route === '/en/' ? page.locator('#sm-motion-setting') : route === '/about/' ? page.locator('.us-motion select') : page.locator('.motion-settings select');
    await expect(setting).toHaveValue('on');
    const hand = route === '/' || route === '/en/' ? page.locator('.footer-hand img') : page.locator('.us-contact-hand');
    await expect(hand).not.toHaveCSS('animation-name', 'none');
    await setting.selectOption('auto');
    await expect(hand).toHaveCSS('animation-name', 'none');
    await setting.selectOption('on');
    await expect(hand).not.toHaveCSS('animation-name', 'none');
    await setting.selectOption('off');
    await page.reload({waitUntil:'domcontentloaded'});
    await expect(setting).toHaveValue('off');
    await expect(hand).toHaveCSS('animation-name', 'none');
    await context.close();
  });
}

test('motion preference carries across the homepage, React, and legacy pages', async ({ page }) => {
  await page.route('https://**', route => route.abort());
  await page.goto('/about/', {waitUntil:'domcontentloaded'});
  await page.locator('.us-motion select').selectOption('off');
  await page.goto('/nova/', {waitUntil:'domcontentloaded'});
  await expect(page.locator('.motion-settings select')).toHaveValue('off');
  await page.goto('/', {waitUntil:'domcontentloaded'});
  await expect(page.locator('#sm-motion-setting')).toHaveValue('off');
  await page.locator('#sm-motion-setting').selectOption('on');
  await page.goto('/about/', {waitUntil:'domcontentloaded'});
  await expect(page.locator('.us-motion select')).toHaveValue('on');
});

for (const [url, selector] of [['/player.html', '.pp-spinner'], ['/live-free.html', '.wp-scene']] as const) {
  test(`standalone player content defaults to motion on at ${url}`, async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.route('**/player/five_channels_full.html', route => route.fulfill({status:200, body:'ok'}));
    await page.goto(url, {waitUntil:'domcontentloaded'});
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
    const element = page.locator(selector).first();
    await expect(element).not.toHaveCSS('animation-name', 'none');
    await page.locator('.us-motion select').selectOption('auto');
    await expect(element).toHaveCSS('animation-name', 'none');
    await context.close();
  });
}
