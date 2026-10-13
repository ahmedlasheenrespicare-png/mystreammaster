import { test, expect } from '@playwright/test';

/* فحص صفحات المقالات: البنية والعناوين والصور والبيانات المنظّمة.
   لا يتحقق من أي مصدر خارجي — كل الطلبات غير المحلية تُمنع. */
test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    return ['127.0.0.1', 'localhost'].includes(url.hostname) ? route.continue() : route.abort();
  });
});

const ARTICLES = [
  { slug: 'http-protocols', heading: 'بروتوكول HTTP' },
  { slug: 'test-iptv-server-stability', heading: 'كيف تختبر ثبات سيرفر IPTV' },
  { slug: 'iptv-samsung-lg-setup', heading: 'تشغيل اشتراك IPTV' },
  { slug: 'choose-iptv-server', heading: 'نوفا أم إيستار' },
];

test('article page renders Arabic prose with LTR code blocks and responsive imagery', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));

  await page.goto('/blog/http-protocols/');

  await expect(page.getByRole('heading', { level: 1 })).toContainText('بروتوكول HTTP');
  await expect(page.locator('h1')).toHaveCount(1);

  /* فهرس المحتويات يربط بعناوين موجودة فعلاً */
  const toc = page.locator('nav[aria-label="محتويات المقال"] a');
  expect(await toc.count()).toBeGreaterThan(10);
  for (const id of ['#section-1', '#section-5']) {
    await expect(page.locator(`nav[aria-label="محتويات المقال"] a[href="${id}"]`)).toHaveCount(1);
    await expect(page.locator(id)).toHaveCount(1);
  }

  /* كتل الكود تظهر LTR فلا يتبعثر ترتيب الأسطر داخل صفحة عربية */
  const pre = page.locator('article pre').first();
  await expect(pre).toBeVisible();
  await expect(pre).toHaveCSS('direction', 'ltr');
  await expect(pre).toContainText('HTTP Request');

  /* لا بقايا من صيغة Markdown الخام في النص */
  await expect(page.locator('article')).not.toContainText('**');

  /* الصور: بديل avif ثم webp، وأبعاد صريحة تمنع اهتزاز التصميم */
  const figure = page.locator('article figure').first();
  await expect(figure.locator('source[type="image/avif"]')).toHaveCount(1);
  await expect(figure.locator('source[type="image/webp"]')).toHaveCount(1);
  await expect(figure.locator('figcaption')).not.toBeEmpty();
  const img = figure.locator('img');
  await expect(img).toHaveAttribute('width', '1408');
  await expect(img).toHaveAttribute('height', '768');
  await expect
    .poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0))
    .toBeTruthy();

  /* الجدول والأسئلة الشائعة داخل المقال */
  await expect(page.locator('article table')).toHaveCount(1);
  await expect(page.locator('article details')).toHaveCount(3);

  expect(errors).toEqual([]);
});

test('every published article keeps one main heading, canonical URL and BlogPosting data', async ({ page }) => {
  for (const article of ARTICLES) {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));

    await page.goto(`/blog/${article.slug}/`);

    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(article.heading);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `https://streammasterstore.com/blog/${article.slug}/`,
    );
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article');

    const types = await page
      .locator('script[type="application/ld+json"]')
      .evaluateAll(nodes =>
        nodes.flatMap(node => {
          const data = JSON.parse(node.textContent || '{}');
          const graph = Array.isArray(data['@graph']) ? data['@graph'] : [data];
          return graph.map((entry: { '@type'?: string }) => entry['@type']);
        }),
      );
    expect(types).toContain('BlogPosting');
    expect(types).toContain('BreadcrumbList');

    /* روابط داخلية تُعيد الزائر إلى بقية الموقع */
    expect(await page.locator('a[href="/blog/"]').count()).toBeGreaterThanOrEqual(2);
    expect(await page.locator('a[href="/channels/"]').count()).toBeGreaterThanOrEqual(2);

    expect(errors).toEqual([]);
  }
});
