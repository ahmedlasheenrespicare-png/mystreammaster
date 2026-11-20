import { test, expect } from '@playwright/test';

test('preview presents unverified terms neutrally in Arabic and English', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('sm-motion-preference', 'off'));
  await page.route('https://**', route => route.abort());
  await page.route('**/*.mp4*', route => route.abort());
  await page.goto('/home-preview/saved-reference/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.loader')).toBeHidden({ timeout: 60000 });
  const answers = page.locator('.sm-faq__answer p');
  await expect(answers.nth(0)).toContainText('يختلف أداء السيرفر');
  await expect(answers.nth(2)).toContainText('مدتها وشروطها');
  await expect(answers.nth(4)).toContainText('حسب الباقة والمزود');
  await expect(answers.nth(5)).toContainText('تختلف طرق الدفع');
  await expect(page.locator('.league-carousel-item .server-spec-content dd')).toHaveCount(24);
  await expect(page.locator('.league-carousel-item .server-spec-content dd').first()).toHaveText('تُؤكَّد لدى المزود');
  const trial = page.locator('.league-carousel-item[data-index="0"] .actions a').nth(1);
  expect(new URL((await trial.getAttribute('href'))!).searchParams.get('text')).not.toContain('٦ ساعات');
  await page.locator('#sm-language').click();
  await expect(answers.nth(0)).toContainText('Server performance varies');
  await expect(answers.nth(2)).toContainText('duration and terms');
  await expect(answers.nth(4)).toContainText('vary by plan and provider');
  await expect(answers.nth(5)).toContainText('Payment options vary');
  await expect(page.locator('.league-carousel-item .server-spec-content dd').first()).toHaveText('Confirm with the provider');
});

test('standalone English preview retains neutral answers without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/home-preview/saved-reference/en/', { waitUntil: 'domcontentloaded' });
  const answers = page.locator('.sm-faq__answer p');
  await expect(answers.nth(0)).toContainText('Server performance varies');
  await expect(answers.nth(2)).toContainText('duration and terms');
  await expect(answers.nth(4)).toContainText('vary by plan and provider');
  await expect(answers.nth(5)).toContainText('Payment options vary');
  await context.close();
});
