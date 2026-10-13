import { test, expect, type Page } from '@playwright/test';

// لا تُطلب أي بيانات من الشبكة في هذه الصفحات؛ الوسيط يُحاكى ببيانات اختبار فقط.
async function mockScoreboard(page: Page) {
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (['localhost', '127.0.0.1'].includes(url.hostname) && url.pathname === '/scoreboard.php') {
      return route.fulfill({ status: 200, headers: { 'X-Matches-Cache': 'HIT', 'X-Cache-Age': '5' }, json: { events: [] } });
    }
    return ['localhost', '127.0.0.1'].includes(url.hostname) ? route.continue() : route.abort();
  });
}

test('watch button on the fixture page is an internal follow-page link, with no stream destination left', async ({ page }) => {
  await mockScoreboard(page);
  await page.goto('/manchester-united-atletico/');

  const primary = page.locator('article a.watch-button');
  const closing = page.locator('.watch-reminder a.watch-button');
  await expect(primary).toHaveAttribute('href', '/manchester-united-atletico/watch/');
  await expect(closing).toHaveAttribute('href', '/manchester-united-atletico/watch/');
  await expect(primary).not.toHaveAttribute('target', '_blank');
  await expect(closing).not.toHaveAttribute('target', '_blank');

  // لا يبقى أي رابط بث خارجي في الصفحة الرئيسية للمواجهة.
  const html = await page.content();
  expect(html).not.toContain('ngrok');
  const streamLinks = await page.locator('main a[href^="http"]').evaluateAll(anchors =>
    anchors.map(a => a.getAttribute('href')).filter(href => /m3u8|\.html\?|five_channels|restream|espn|site\.api/i.test(href || '')));
  expect(streamLinks).toEqual([]);

  await expect(page.locator('p.watch-note')).toContainText('صفحة متابعة داخل الموقع');
});

test('the watch link opens the internal page that announces the match is over', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await mockScoreboard(page);
  await page.goto('/manchester-united-atletico/');
  await page.locator('article a.watch-button').click();

  await expect(page).toHaveURL(/\/manchester-united-atletico\/watch\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('انتهت');
  await expect(page.getByRole('heading', { level: 2, name: 'لا يوجد بث مباشر داخل الموقع لهذا اللقاء' })).toBeVisible();
  await expect(page.locator('.follow-eyebrow')).toContainText('صافرة النهاية');

  // الصفحة الداخلية لا تعرض بثًا ولا تفتح وجهات خارجية للبث.
  await expect(page.locator('iframe, video, audio')).toHaveCount(0);
  const content = await page.content();
  expect(content).not.toContain('ngrok');
  // التبويبات الخارجية الوحيدة المسموحة: تواصل واتساب وإسناد ملفات الشعارات — لا وجهات بث.
  const whatsapp = 'https://wa.me/201098950879?text=%D9%85%D8%B1%D8%AD%D8%A8%D9%8B%D8%A7%20%D8%B3%D8%AA%D8%B1%D9%8A%D9%85%20%D9%85%D8%A7%D8%B3%D8%AA%D8%B1%D8%8C%20%D8%A3%D8%B1%D9%8A%D8%AF%20%D8%AA%D8%AC%D8%B1%D8%A8%D8%A9%20%D9%85%D8%AC%D8%A7%D9%86%D9%8A%D8%A9%20%D9%84%D9%85%D8%AA%D8%A7%D8%A8%D8%B9%D8%A9%20%D8%A7%D9%84%D9%85%D8%A8%D8%A7%D8%B1%D9%8A%D8%A7%D8%AA%20%D8%A7%D9%84%D9%82%D8%A7%D8%AF%D9%85%D8%A9';
  const externalTabs = await page.locator('main a[target="_blank"]').evaluateAll(anchors => anchors.map(a => a.getAttribute('href') || ''));
  expect(externalTabs.sort()).toEqual([whatsapp, 'https://football-logos.cc/'].sort());

  // توجيه داخلي لمتابعة المباريات القادمة: المواعيد والباقات والنتيجة.
  const internal = await page.locator('main a[href^="/"]').evaluateAll(anchors => anchors.map(a => a.getAttribute('href')));
  for (const href of ['/matches/', '/store/', '/servers/', '/channels/', '/world-cup-2026/', '/predictions/', '/watch-legal.html', '/manchester-united-atletico/']) {
    expect(internal).toContain(href);
  }
  expect(errors).toEqual([]);
});

test('follow page keeps a single canonical heading, dark chrome and mobile layout', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockScoreboard(page);
  await page.goto('/manchester-united-atletico/watch/');
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://streammasterstore.com/manchester-united-atletico/watch/');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#080b12');
  // الهيدر والفوتر العامان موجودان، والصفحة داخل العرض دون تمرير أفقي.
  await expect(page.locator('header.sm-header')).toBeVisible();
  await expect(page.locator('footer.sm-footer')).toBeVisible();
  await expect(page.getByRole('link', { name: /مواعيد المباريات القادمة/ }).first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('the fixture page links to the follow page from its FAQ and closing note', async ({ page }) => {
  await mockScoreboard(page);
  await page.goto('/manchester-united-atletico/');
  await expect(page.locator('.faq-list a[href="/manchester-united-atletico/watch/"]')).toHaveCount(1);
  await expect(page.locator('.watch-reminder')).toContainText('تابع ستريم ماستر لمزيد من المباريات');
  await expect(page.locator('p.rights-note')).toContainText('لا تعرض أي بث مباشر');
});
