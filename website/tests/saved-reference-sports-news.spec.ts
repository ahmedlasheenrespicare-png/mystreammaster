import { test, expect } from '@playwright/test';

for (const width of [390, 1440]) {
  test(`saved news tickets render and navigate at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 850 });
    await page.clock.setFixedTime(new Date('2026-11-12T12:00:00Z'));
    await page.route('https://**', route => route.abort());
    await page.route('**/*.mp4*', route => route.abort());
    await page.goto('/home-preview/saved-reference/', { waitUntil: 'domcontentloaded' });
    const section = page.locator('#sports-news');
    await expect(section.locator('.sm-news__ticket')).toHaveCount(70);
    await expect(section.locator('.sm-news__age', { hasText: 'حديث' })).toHaveCount(0);
    await expect(section.locator('.sm-news__age', { hasText: 'أرشيف' })).toHaveCount(0);
    await expect(section.locator('.sm-news__credit')).toHaveCount(0);
    await expect(section.locator('.sm-news__ticket').first()).toContainText('الدوريات الأوروبية');
    await expect(section.locator('.sm-news__ticket').first()).toContainText('تاريخ مستقبلي');
    await expect(section.locator('.sm-news__ticket').first()).toHaveAttribute('href', '/home-preview/saved-reference/news/european-leagues-return-21-november-2026/');
    await expect(section.locator('.sm-news__status')).toBeEmpty();
    await expect(section.locator('.sm-news__visual--multi img')).toHaveCount(6);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const before = await section.locator('.sm-news__rail').evaluate(el => el.scrollLeft);
    await section.locator('[data-news-direction="next"]').click();
    await expect.poll(() => section.locator('.sm-news__rail').evaluate(el => el.scrollLeft)).toBeLessThan(before);
    await section.screenshot({ path: `/tmp/sports-news-${width}.png`, animations: 'disabled' });
  });
}

test('preview keeps historical stories without recency badges', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-12-01T12:00:00Z'));
  await page.route('https://**', route => route.abort());
  await page.route('**/*.mp4*', route => route.abort());
  await page.goto('/home-preview/saved-reference/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#sports-news .sm-news__status')).toBeEmpty();
  await expect(page.locator('#sports-news .sm-news__ticket')).toHaveCount(70);
  await expect(page.locator('#sports-news .sm-news__age')).toHaveCount(0);
});

test('future and undated stories are clearly labelled in the preview', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-12T12:00:00Z'));
  await page.route('**/sports-news.json*', route => route.fulfill({ json: [
    { title: 'مستقبلي', category: 'اختبار', description: '', href: 'news/future/', dateLabel: '13 نوفمبر 2026', images: [] },
    { title: 'بلا تاريخ', category: 'اختبار', description: '', href: 'news/undated/', dateLabel: '', images: [] },
    { title: 'خبر حديث', category: 'اختبار', description: '', href: 'news/current/', dateLabel: '12 نوفمبر 2026', images: [] },
  ] }));
  await page.route('https://**', route => route.abort());
  await page.route('**/*.mp4*', route => route.abort());
  await page.goto('/home-preview/saved-reference/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#sports-news .sm-news__ticket')).toHaveCount(3);
  await expect(page.locator('#sports-news .sm-news__ticket').nth(0)).toContainText('تاريخ مستقبلي');
  await expect(page.locator('#sports-news .sm-news__ticket').nth(1).locator('.sm-news__age')).toHaveCount(0);
  await expect(page.locator('#sports-news .sm-news__ticket').nth(2)).toContainText('تاريخ غير متاح');
});

 test('new preview stories have local pages, images and credit', async ({ page, request }) => {
  const response = await request.get('/home-preview/saved-reference/assets/sports-news-extra.json');
  const items = await response.json();
  expect(items).toHaveLength(14);
  expect(new Set(items.map((item: { dateLabel: string }) => item.dateLabel)).size).toBe(8);
  for (const item of items) {
    const story = await request.get('/home-preview/saved-reference/' + item.href);
    expect(story.ok()).toBeTruthy();
    const html = await story.text();
    expect(html).toContain(item.title);
    if (item.images.length) {
      expect(html).toContain('creativecommons.org');
      expect((await request.get('/' + item.images[0].src)).ok()).toBeTruthy();
    } else {
      expect(['news/tom-brady-chelsea-investment-2026/', 'news/fifa-presidential-election-nominations-2027/', 'news/morocco-fifa-ranking-fifth-november-2026/', 'news/messi-mls-salary-report-2026/', 'news/ivan-toney-saudi-top-scorer-november-2026/', 'news/european-leagues-return-21-november-2026/']).toContain(item.href);
    }
  }
 });

test('news autoplay moves one ticket, pauses on interaction, and respects reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.route('**/sports-news.json*', route => route.fulfill({ json: Array.from({ length: 5 }, (_, i) => ({ title: `خبر ${i}`, category: 'رياضة', description: '', href: `news/story-${i}/`, dateLabel: '11 نوفمبر 2026', images: [] })) }));
  await page.route('**/news-test-fixture', route => route.fulfill({ contentType: 'text/html', body: `<meta charset="utf-8"><link rel="stylesheet" href="/home-preview/saved-reference/assets/sports-news.css?v=5"><div style="height:40px"></div><section id="sports-news" class="sm-news" dir="rtl"><p class="sm-news__status"></p><div class="sm-news__rail"></div><div class="sm-news__bottom" hidden></div></section><script src="/home-preview/saved-reference/assets/sports-news.js?v=16"></script>` }));
  await page.goto('/news-test-fixture');
  const section = page.locator('#sports-news');
  await expect(section.locator('.sm-news__ticket')).toHaveCount(5);
  await section.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  const rail = section.locator('.sm-news__rail');
  const start = await rail.evaluate(el => el.scrollLeft);
  await expect.poll(() => rail.evaluate(el => el.scrollLeft), { timeout: 12000 }).toBeLessThan(start - 100);
  await page.waitForTimeout(1000);
  const after = await rail.evaluate(el => ({ left: el.scrollLeft, step: el.querySelector('.sm-news__ticket')!.getBoundingClientRect().width + 18 }));
  expect(Math.abs(after.left + after.step)).toBeLessThan(4);
  await section.hover();
  const pausedAt = await rail.evaluate(el => el.scrollLeft);
  await page.waitForTimeout(6000);
  expect(await rail.evaluate(el => el.scrollLeft)).toBeCloseTo(pausedAt, 0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
  await expect(section.locator('[data-news-pause]')).toHaveCount(0);
});

test('production home has the news section in place and production links', async ({ page, request }) => {
  await page.route('https://**', route => route.abort());
  await page.route('**/*.mp4*', route => route.abort());
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const section = page.locator('#sports-news');
  await expect(section.locator('.sm-news__ticket')).toHaveCount(70);
  await expect(section.locator('.sm-news__hint, [data-news-pause]')).toHaveCount(0);
  const order = await page.evaluate(() => ['featured-matches', 'sports-news', 'cinema-library'].map(id => document.getElementById(id)?.getBoundingClientRect().top));
  expect(order.every(x => typeof x === 'number')).toBeTruthy();
  expect(order[0]!).toBeLessThan(order[1]!);
  expect(order[1]!).toBeLessThan(order[2]!);
  await expect(section.locator('.sm-news__ticket').first()).toHaveAttribute('href', '/news/european-leagues-return-21-november-2026/');
  const data = await (await request.get('/_assets/sports-news/sports-news.json')).json();
  for (const item of data) {
    expect((await request.get('/' + item.href)).ok(), item.href).toBeTruthy();
    for (const image of item.images || []) expect((await request.get('/' + image.src)).ok(), image.src).toBeTruthy();
  }
});
