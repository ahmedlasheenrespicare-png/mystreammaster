import { test, expect, type Page } from '@playwright/test';
// Independent expectations: importing the browser catalog requires Vite's import.meta.env.
const CURRENCIES = { USD: { symbol: '$' }, SAR: { symbol: 'ر.س' } };
const PRICING_PLANS = [
  { id: 'plan-nova', serverName: 'سيرفر نوفا (Nova Server)', prices: { '12': { USD: 25, SAR: 92.59 } } },
  { id: 'plan-istar', serverName: 'سيرفر إيستار برو (iStar Pro Server)', prices: { '12': { USD: 35, SAR: 129.63 } } },
  { id: 'plan-moka', serverName: 'سيرفر موكا (Moka Server)', prices: { '12': { USD: 45, SAR: 166.67 } } },
];

// Inspect generated URLs only; do not contact WhatsApp or submit real requests.
test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    return ['127.0.0.1', 'localhost'].includes(url.hostname) ? route.continue() : route.abort();
  });
});

function messageFrom(href: string) {
  const url = new URL(href);
  expect(url.origin + url.pathname).toBe('https://wa.me/201098950879');
  return url.searchParams.get('text');
}

async function captureWhatsApp(page: Page) {
  await page.evaluate(() => {
    window.open = url => {
      document.documentElement.dataset.whatsappUrl = String(url);
      return null;
    };
  });
}

async function capturedMessage(page: Page) {
  const href = await page.locator('html').getAttribute('data-whatsapp-url');
  expect(href).toBeTruthy();
  return messageFrom(href!);
}

test('homepage activation and trial CTAs use technical-service wording', async ({ page }) => {
  await page.goto('/');
  const activation = page.getByRole('link', { name: 'اطلب التفعيل — من $25', exact: true });
  await expect(activation).toBeVisible();
  expect(messageFrom((await activation.getAttribute('href'))!)).toBe('مرحبًا ستريم ماستر، أود الاستفسار عن باقات التفعيل التقني لدى المزود');
  await expect(page.getByText('خصومات على باقات التفعيل التقني', { exact: true })).toBeVisible();
  await expect(page.getByText('فحص تجريبي مجاني', { exact: true })).toBeVisible();
  await expect(page.locator('footer').getByRole('button', { name: 'انضم الآن', exact: true })).toBeVisible();
  await page.locator('footer').getByRole('button', { name: 'طلب كود فحص تجريبي (6 ساعات)', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'طلب تجربة مجانية', exact: true })).toBeVisible();
});

test('pricing WhatsApp messages preserve every plan, annual duration and selected currency', async ({ page }) => {
  await page.goto('/store/');
  const pricing = page.locator('#pricing');
  for (const currency of ['USD', 'SAR'] as const) {
    await pricing.getByLabel('العملة', { exact: true }).selectOption(currency);
    const links = pricing.getByRole('link', { name: 'اطلب كود التفعيل عبر واتساب', exact: true });
    await expect(links).toHaveCount(PRICING_PLANS.length);
    for (const [index, plan] of PRICING_PLANS.entries()) {
      expect(messageFrom((await links.nth(index).getAttribute('href'))!)).toBe(
        `مرحبًا ستريم ماستر، أود طلب كود تفعيل تقني لدى المزود لـ ${plan.serverName} لمدة 12 شهر (سنة) بسعر ${plan.prices['12'][currency]} ${CURRENCIES[currency].symbol}`,
      );
    }
  }
});

for (const plan of PRICING_PLANS) {
  test(`plan ${plan.id} requests a provider activation code`, async ({ page }) => {
    await page.goto(`/${plan.id.replace('plan-', '')}/`);
    for (const currency of ['USD', 'SAR'] as const) {
      await page.locator('main').getByLabel('اختر العملة', { exact: true }).selectOption(currency);
      const link = page.getByRole('link', { name: 'اطلب كود التفعيل عبر واتساب', exact: true });
      expect(messageFrom((await link.getAttribute('href'))!)).toBe(
        `مرحبًا ستريم ماستر، أود طلب كود تفعيل تقني لدى المزود لـ ${plan.serverName} لمدة 12 شهر (سنة كاملة) بسعر ${plan.prices['12'][currency]} ${CURRENCIES[currency].symbol}`,
      );
    }
    await page.locator('main').getByRole('button', { name: 'طلب كود تجريبي', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'طلب تجربة مجانية', exact: true })).toBeVisible();
  });
}

for (const custom of [false, true]) {
  test(`trial sends technical compatibility wording with ${custom ? 'custom' : 'default'} selections`, async ({ page }) => {
    await page.goto('/');
    await captureWhatsApp(page);
    await page.getByRole('button', { name: 'طلب كود تجريبي', exact: true }).first().click();
    const dialog = page.getByRole('dialog', { name: 'طلب تجربة مجانية', exact: true });
    await expect(dialog.getByRole('heading')).toHaveText('طلب كود فحص وتجربة من المزود (6 ساعات)');
    await expect(dialog).toContainText('اختبر توافق التطبيق على جهازك واستقرار اتصال سيرفر المزود قبل طلب التفعيل.');
    await expect(dialog).toContainText('يتم إصدار كود التجربة من المزود مع إرشادات إعداد التطبيق خلال أقل من 5 دقائق عبر واتساب.');
    await expect(dialog.getByRole('option', { name: 'سيرفر نوفا (Nova) — الأعلى ثباتاً وقت الذروة ⚡', exact: true })).toHaveCount(1);
    await expect(dialog.getByRole('option', { name: 'سيرفر إيستار (iStar) — المتوازن للأجهزة الذكية 📺', exact: true })).toHaveCount(1);
    if (custom) {
      await dialog.getByLabel('نوع جهازك:').selectOption('جوال أندرويد');
      await dialog.getByLabel('السيرفر المراد تجربته:').selectOption('سيرفر إيستار (iStar Pro) — المتوازن للأجهزة الذكية');
      await dialog.locator('input[type="tel"]').fill('0500000000');
    }
    await dialog.getByRole('button', { name: 'طلب كود الفحص التجريبي عبر واتساب', exact: true }).click();
    expect(await capturedMessage(page)).toBe(
      `مرحبًا ستريم ماستر، أود طلب كود تجربة تقنية من المزود لفحص التوافق على جهازي:\n- نوع الجهاز: ${custom ? 'جوال أندرويد' : 'شاشة سامسونج أو LG Smart TV'}\n- السيرفر المطلوب: ${custom ? 'سيرفر إيستار (iStar Pro) — المتوازن للأجهزة الذكية' : 'سيرفر نوفا (Nova Server) — الأعلى ثباتاً وقت الذروة'}\n- رقم الواتساب: ${custom ? '0500000000' : 'نفس الرقم الحالي'}`,
    );
    await expect(dialog).not.toBeVisible();
  });
}

test('cart checkout requests technical activation packages and preserves item details and total', async ({ page }) => {
  await page.goto('/store/');
  await captureWhatsApp(page);
  for (const index of [0, 1]) {
    await page.getByRole('button', { name: /أضف إلى السلة/ }).nth(index).click();
    await expect(page.getByRole('dialog', { name: 'سلة المشتريات' })).toBeVisible();
    await page.keyboard.press('Escape');
  }
  await page.getByRole('button', { name: 'سلة المشتريات', exact: true }).click();
  await page.getByRole('button', { name: 'إتمام طلب التفعيل عبر واتساب', exact: true }).click();
  expect(await capturedMessage(page)).toBe(
    `مرحبًا ستريم ماستر، أود إتمام طلب باقات التفعيل التقني التالية لدى المزود:\n\n1. ${PRICING_PLANS[0].serverName} — المدة: سنة (12 شهر) — السعر: 25 $\n2. ${PRICING_PLANS[1].serverName} — المدة: سنة (12 شهر) — السعر: 35 $\n\nالإجمالي المطلوب: 60 $\nأرجو تزويدي ببيانات الدفع وإصدار الكود.`,
  );
  await page.goto('/cart/');
  await expect(page.getByText('طلب التفعيل التقني يبدأ هنا', { exact: true })).toBeVisible();
});

test('channels trial link requests a provider compatibility check', async ({ page }) => {
  await page.goto('/channels/');
  const link = page.locator('main').getByRole('link', { name: 'طلب كود تجريبي', exact: true });
  expect(messageFrom((await link.getAttribute('href'))!)).toBe('مرحبًا، أود طلب كود فحص تجريبي من المزود لاختبار التوافق على جهازي');
});
