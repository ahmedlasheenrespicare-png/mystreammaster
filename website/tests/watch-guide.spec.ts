import { test, expect } from '@playwright/test';

// Validate the local directory UI, not availability of third-party services.
test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    return ['127.0.0.1', 'localhost'].includes(url.hostname) ? route.continue() : route.abort();
  });
  await page.goto('/#live-player');
});

test('official directory replaces the public player and preserves its anchor', async ({ page }) => {
  const section = page.locator('#live-player');
  await expect(section.getByRole('heading', { name: 'دليلك إلى المشاهدة الرسمية' })).toBeVisible();
  await expect(section.locator('video, audio, iframe')).toHaveCount(0);
  await expect(section.locator('.wg-item')).toHaveCount(117);
  await expect(section.locator('.wg-sidebar')).toHaveCSS('height', '560px');
  await expect(section.locator('.wg-official')).toHaveAttribute('href', 'https://www.france24.com/ar/');
  await expect(section.locator('.wg-official')).toHaveAttribute('target', '_blank');
  await expect(section.locator('.wg-official')).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(section).toContainText('لا يدل على شراكة أو اعتماد');
  await expect(section).not.toContainText('قد نحصل على عمولة');
});

test('search selects paid and network destinations without loading a stream', async ({ page }) => {
  const section = page.locator('#live-player');
  const search = section.getByRole('searchbox');
  await search.fill('Netflix');
  await expect(section.locator('.wg-item')).toHaveCount(1);
  await section.locator('.wg-item').click();
  await expect(section.locator('#watch-guide-selected-name')).toHaveText('Netflix');
  // بوابة الإحالة /go.php تحوّل الزائر إلى الوجهة الرسمية، ويبقى النطاق الرسمي ظاهراً في البطاقة.
  await expect(section.locator('.wg-official')).toHaveAttribute('href', '/go.php?p=netflix&src=watch-guide');
  await expect(section.locator('.wg-domain')).toContainText('netflix.com');
  await expect(section.locator('.wg-screen-label')).toContainText('خدمة مدفوعة');
  await search.fill('إم بي سي');
  await expect(section.locator('.wg-item')).toHaveCount(14);
  await section.locator('.wg-item').first().click();
  await expect(section.locator('.wg-official')).toHaveAttribute('href', 'https://www.mbc.net/');
  await expect(section.locator('.wg-description')).toContainText('موقع الشبكة الرسمي');
  await search.fill('لا توجد هذه القناة');
  await expect(section.getByRole('status')).toHaveText('لا توجد نتائج مطابقة لبحثك.');
  await search.fill('');
  await section.getByRole('button', { name: 'منصات', exact: true }).click();
  await expect(section.locator('.wg-item')).toHaveCount(14);
  await section.getByRole('button', { name: 'الكل', exact: true }).click();
  await expect(section.locator('.wg-item')).toHaveCount(117);
});

test('help dialog supports keyboard dismissal and focus restoration', async ({ page }) => {
  const button = page.getByRole('button', { name: 'كيف يعمل الدليل؟ ↗', exact: true });
  await button.click();
  await expect(page.getByRole('dialog', { name: 'وجهتك تبدأ من هنا' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'وجهتك تبدأ من هنا' })).not.toBeVisible();
  await expect(button).toBeFocused();
});

for (const width of [320, 390, 768, 1440]) {
  test(`guide fits ${width}px and keeps external action usable`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const section = page.locator('#live-player');
    await section.getByRole('searchbox').fill('National Geographic');
    await section.locator('.wg-item').click();
    await expect(section.locator('.wg-official')).toBeVisible();
    const size = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
    expect(size.document).toBeLessThanOrEqual(size.viewport + 1);
    const card = await section.locator('.wg-card').boundingBox();
    expect(card!.x).toBeGreaterThanOrEqual(0);
    expect(card!.x + card!.width).toBeLessThanOrEqual(width + 1);
  });
}
