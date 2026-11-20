import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    return ['127.0.0.1', 'localhost'].includes(url.hostname) ? route.continue() : route.abort();
  });
});

test('حاسبة الدليل تحسب الشاشات وتبدّل المراجع وتوضح حدود النتيجة على الجوال', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/blog/internet-speed-for-video-streaming/');
  const calculator = page.locator('#bandwidth-calculator');
  await expect(calculator).toContainText('6.3 Mbps');
  await calculator.getByRole('spinbutton', { name: 'عدد شاشات 4K · 2160p' }).fill('1');
  await calculator.getByRole('spinbutton', { name: 'سرعة الأنشطة الأخرى التقديرية (Mbps)' }).fill('3');
  await calculator.getByRole('spinbutton', { name: 'سرعة التنزيل المقاسة (Mbps) · اختياري' }).fill('30');
  await expect(calculator).toContainText('35 Mbps');
  await expect(calculator).toContainText('دون هامش');
  await calculator.getByLabel('توصيات الخدمة المستخدمة للحساب').selectOption('netflix');
  await expect(calculator).toContainText('28.8 Mbps');
  await expect(calculator).toContainText('لا يضمن ثبات المشاهدة');
  await calculator.getByRole('spinbutton', { name: 'عدد شاشات Full HD · 1080p' }).fill('0');
  await calculator.getByRole('spinbutton', { name: 'عدد شاشات 4K · 2160p' }).fill('0');
  await expect(calculator).toContainText('اختر شاشة واحدة على الأقل');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('الانتقال من فهرس المباريات إلى التفاصيل يعيد تحميل مستند بلا إعلانات، والرجوع يعيد صفحة الفهرس', async ({ page }) => {
  await page.goto('/match-center/');
  await expect(page.locator('script[src*="adsbygoogle.js"]')).toHaveCount(1);
  await page.evaluate(() => { (window as Window & { documentMarker?: string }).documentMarker = 'hub'; });
  const match = page.locator('main a[href*="la-liga-alaves-vs-malaga"]').first();
  await expect(match).toHaveCount(1);
  await match.click();
  await expect(page).toHaveURL(/la-liga-alaves-vs-malaga/);
  await expect(page.locator('script[src*="adsbygoogle.js"]')).toHaveCount(0);
  expect(await page.evaluate(() => (window as Window & { documentMarker?: string }).documentMarker)).toBeUndefined();
  await page.goBack();
  await expect(page).toHaveURL(/\/match-center\/$/);
  await expect(page.locator('script[src*="adsbygoogle.js"]')).toHaveCount(1);
});

test('روابط السياسات في نافذتي التجربة والسلة تشير للموقع نفسه', async ({ page }) => {
  await page.goto('/trial/?trial=1', { waitUntil: 'domcontentloaded' });
  let dialog = page.getByRole('dialog', { name: 'طلب تجربة مجانية' });
  await expect(dialog.getByRole('link', { name: 'شروط الاستخدام وإخلاء المسؤولية' })).toHaveAttribute('href', '/terms/');
  await expect(dialog.getByRole('link', { name: 'سياسة الاسترجاع' })).toHaveAttribute('href', '/refund/');
  await page.keyboard.press('Escape');
  await page.goto('/store/');
  await page.getByRole('button', { name: /أضف إلى السلة/ }).first().click();
  dialog = page.getByRole('dialog', { name: 'سلة المشتريات' });
  await expect(dialog.getByRole('link', { name: 'شروط الاستخدام وإخلاء المسؤولية' })).toHaveAttribute('href', '/terms/');
  await expect(dialog.getByRole('link', { name: 'سياسة الاسترجاع' })).toHaveAttribute('href', '/refund/');
});

test.describe('المحتوى الأساسي دون JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('الدليل والمراجع وصفحة الحالة تبقى مقروءة دون تظاهر بالقياس المباشر', async ({ page }) => {
    await page.goto('/blog/internet-speed-for-video-streaming/');
    const fallback = page.locator('#bandwidth-calculator noscript p');
    await expect(fallback).toBeVisible();
    await expect(fallback).toHaveText(/لتغيير مدخلات الحاسبة يلزم تفعيل JavaScript/);
    await expect(page.getByRole('spinbutton', { name: 'عدد شاشات Full HD · 1080p' })).toBeDisabled();
    await expect(page.getByRole('heading', { name: 'المراجع' })).toBeVisible();
    await page.goto('/status/');
    await expect(page.locator('main')).toContainText('لا تتوفر على هذه الصفحة حالياً قراءات مباشرة');
    await expect(page.locator('main')).not.toContainText('99.9%');
  });

  test('روابط أقسام الرئيسية تعمل كرابط حقيقي من الصفحات الأخرى', async ({ page }) => {
    const links = [
      ['الباقات والأسعار', '/#works'],
      ['مساعد الاختيار', '/#path-section'],
      ['مقارنة السيرفرات', '/servers/'],
      ['مكتبة القنوات', '/channels/'],
      ['دليل التشغيل', '/#journey'],
      ['دليل المشاهدة الرسمية', '/channels/'],
    ];
    await page.goto('/blog/internet-speed-for-video-streaming/');
    for (const [label, href] of links) {
      await expect(page.locator('footer').getByRole('link', { name: label, exact: true })).toHaveAttribute('href', href);
    }
    await page.locator('footer').getByRole('link', { name: 'الباقات والأسعار', exact: true }).click();
    await expect(page).toHaveURL(/\/#works$/);
    for (const [, href] of links.filter(([, href]) => href.startsWith('/#'))) {
      await expect(page.locator(href.slice(1))).toHaveCount(1);
    }
    for (const href of ['/servers/', '/channels/']) expect((await page.request.get(href)).status()).toBe(200);
  });
});
