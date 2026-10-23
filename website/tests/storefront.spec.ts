import { test, expect } from '@playwright/test';

// UI checks do not claim to validate live channels or WhatsApp delivery.
test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    return ['127.0.0.1', 'localhost'].includes(url.hostname) ? route.continue() : route.abort();
  });
});

test('homepage renders the reference design and local hero imagery', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('h1')).toHaveText(/(شاهِد|تابِع|اكتشِف) كل ما تحب/);
  await expect(page.locator('header select')).toHaveValue('USD');
  await expect(page.locator('#pricing')).toContainText('20');
  await expect(page.locator('#pricing')).toContainText('25');
  await expect(page.locator('#pricing')).toContainText('35');
  await expect(page.locator('#pricing')).toContainText('45');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(250, 249, 246)');
  await expect.poll(() => page.locator('img[src*="slide-sports"]').first().evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBeTruthy();
  expect(errors).toEqual([]);
});

test('X plan card uses the XTV watermark, annual price, and hides device count and official-guide feature', async ({ page }) => {
  await page.goto('/store/');
  const logo = page.locator('#pricing img[src="/images/brand/xtv-ticket.png"]');
  await expect(logo).toHaveCount(1);
  await expect(logo).toBeVisible();
  const card = logo.locator('..');
  await expect(card).toContainText('20');
  await expect(card).toContainText('سيرفر X');
  await expect(card).not.toContainText('حتى 3 أجهزة');
  await expect(card).not.toContainText('دليل خيارات المشاهدة الرسمية');

  await card.getByRole('button', { name: /أضف إلى السلة/ }).click();
  const dialog = page.getByRole('dialog', { name: 'سلة المشتريات' });
  await expect(dialog).toContainText('سيرفر X');
  await expect(dialog).toContainText('20');
});

test('iStar and Moka cards show their logos and share the Nova/X dark lime style', async ({ page }) => {
  await page.goto('/store/');
  const novaClasses = await page.locator('#pricing img[src="/images/brand/nova-ticket.png"]').locator('..').getAttribute('class');
  const xClasses = await page.locator('#pricing img[src="/images/brand/xtv-ticket.png"]').locator('..').getAttribute('class');
  expect(novaClasses).toBe(xClasses);

  for (const logoPath of ['/images/brand/istar-ticket.png', '/images/brand/moka-ticket.png']) {
    const logo = page.locator(`#pricing img[src="${logoPath}"]`);
    await expect(logo).toHaveCount(1);
    await expect(logo).toBeVisible();
    await expect.poll(() => logo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBeTruthy();

    const card = logo.locator('..');
    await expect(card).toHaveAttribute('class', novaClasses!);
    await expect(card).toHaveCSS('background-color', 'rgb(11, 11, 15)');
    await expect(card).toHaveCSS('color', 'rgb(255, 255, 255)');
    await expect(card).not.toContainText('حتى جهازين');
    await expect(card).not.toContainText('دليل خيارات المشاهدة الرسمية');
  }

  for (const server of ['istar', 'moka']) {
    await page.goto(`/${server}/`);
    await expect(page.locator('main')).not.toContainText('حتى جهازين');
    await expect(page.locator('main')).toContainText('دليل خيارات المشاهدة الرسمية');
  }
});

test('each Arabic and English plan page shows its matching server watermark', async ({ page }) => {
  const servers = [
    { code: 'nova', logo: 'nova-ticket' },
    { code: 'istar', logo: 'istar-ticket' },
    { code: 'moka', logo: 'moka-ticket' },
    { code: 'x', logo: 'xtv-ticket' },
  ];

  for (const server of servers) {
    for (const route of [`/${server.code}/`, `/en/${server.code}/`]) {
      await page.goto(route);
      const logo = page.locator(`main img[src="/images/brand/${server.logo}.png"]`);
      await expect(logo).toHaveCount(1);
      await expect(logo).toBeVisible();
      await expect.poll(() => logo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBeTruthy();
      await expect(logo.locator('..')).toHaveCSS('background-color', 'rgb(11, 11, 15)');

      if (route.startsWith('/en/')) {
        const specsCard = page.getByRole('heading', { name: 'What the external provider announces' }).locator('xpath=../..');
        await expect(specsCard).not.toContainText(/Simultaneous devices|Up to [23] devices/);
      } else {
        const specs = page.locator('main dl').first();
        await expect(specs).not.toContainText('الأجهزة في نفس اللحظة');
        await expect(specs).not.toContainText(/حتى (?:3 أجهزة|جهازين)/);
        await expect(specs.locator('div')).toHaveCount(3);
        await expect(page.locator('#faq')).not.toContainText('هل يعمل الاشتراك على أكثر من جهاز؟');
        await expect(page.locator('#faq')).not.toContainText('ما الفرق بين سيرفر نوفا وإيستار برو وموكا وX؟');
      }
    }
  }
});

test('X purchase page offers only the confirmed 12-month term', async ({ page }) => {
  await page.goto('/x/');
  await expect(page.getByRole('button', { name: '12 شهر (سنة كاملة)', exact: true })).toHaveCount(1);
  for (const term of ['3 شهور', '6 شهور', '24 شهر (سنتان)']) {
    await expect(page.getByRole('button', { name: term, exact: true })).toHaveCount(0);
  }
  await expect(page.locator('main')).toContainText('20');
});

test('English catalog includes X at $20/year without exposing its device count on the card', async ({ page }) => {
  await page.goto('/en/');
  const heading = page.getByRole('heading', { level: 3, name: 'X Server' });
  await expect(heading).toBeVisible();
  const card = heading.locator('xpath=..');
  await expect(card).toContainText('$20');
  await expect(card).not.toContainText('Up to 3 devices');
  await expect(card.getByRole('link', { name: /X Server — details & activation/ })).toHaveAttribute('href', '/en/x/');

  await page.goto('/en/x/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('X Server');
});

test('trial modal is above navigation, supports keyboard dismissal, and uses existing contact', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'طلب كود تجريبي', exact: true }).first().click();
  const dialog = page.getByRole('dialog', { name: 'طلب تجربة مجانية' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('نوع جهازك:')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('a[href^="https://wa.me/201098950879"]').first()).toHaveAttribute('href', /201098950879/);
});

test('cart persists on refresh, recalculates currency, and removes items', async ({ page }) => {
  await page.goto('/store/');
  await page.getByRole('button', { name: /أضف إلى السلة/ }).first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('25');
  await page.keyboard.press('Escape');
  await page.reload();
  await page.getByRole('button', { name: 'سلة المشتريات', exact: true }).click();
  await expect(dialog).toContainText('نوفا');
  await page.keyboard.press('Escape');
  await page.getByLabel('اختر العملة', { exact: true }).selectOption('SAR');
  await page.getByRole('button', { name: 'سلة المشتريات', exact: true }).click();
  await expect(dialog).toContainText('ر.س');
  await dialog.getByRole('button', { name: /حذف|إزالة/ }).first().click();
  await expect(dialog).toContainText('فارغة');
});

test('old annual cart items migrate without changing the published dollar price', async ({ page }) => {
  // Seed before React initializes: writing into a loaded homepage can race
  // its initial empty-cart persistence effect on slower CI workers.
  await page.addInitScript(() => localStorage.setItem('stream-master-cart', JSON.stringify([{ id: 'nova-12m', quantity: 2, price: 25 }])));
  await page.goto('/cart/');
  await page.getByRole('button', { name: /عرض السلة/ }).click();
  await expect(page.getByRole('dialog')).toContainText('50');
});

for (const width of [320, 390, 768, 1440]) {
  test(`responsive layout and navigation at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const cart = page.getByRole('button', { name: 'سلة المشتريات', exact: true });
    await expect(cart).toBeInViewport();
    const box = await cart.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    const dimensions = await page.evaluate(() => [innerWidth, document.documentElement.scrollWidth]);
    expect(dimensions[1]).toBeLessThanOrEqual(dimensions[0] + 1);
    if (width < 1280) {
      await page.getByRole('button', { name: 'القائمة', exact: true }).click();
      await expect(page.locator('#storefront-mobile-nav')).toBeVisible();
      await page.locator('#storefront-mobile-nav').getByRole('link', { name: /^الباقات/ }).click();
      await expect(page.locator('#storefront-mobile-nav')).not.toBeVisible();
      await expect(page).toHaveURL(/#pricing/);
    }
  });
}

for (const url of ['/channels/', '/blog/', '/nova/', '/faq/', '/about/', '/privacy/', '/refund/', '/search/', '/live-free.html', '/world-cup-2026/', '/predictions/', '/blog/هل-iptv-آمن/']) {
  test(`preserved route works: ${url}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    const response = await page.goto(url);
    expect(response?.status()).toBe(200);
    await expect(page.locator('main').first()).toBeVisible();
    await expect(page.locator('header').first()).toBeVisible();
    await page.waitForTimeout(350);
    expect(errors).toEqual([]);
  });
}

test('legacy footer links perform real navigation instead of being swallowed by SPA routing', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'سياسة الخصوصية', exact: true }).click();
  await expect(page).toHaveURL(/\/privacy\//);
  await expect(page.locator('.sm-header')).toBeVisible();
  await page.locator('.sm-header').getByRole('link', { name: /ستريم ماستر/ }).click();
  await expect(page.locator('h1')).toHaveText(/(شاهِد|تابِع|اكتشِف) كل ما تحب/);
});

for (const width of [320, 390, 640, 768, 1440]) {
  test(`hero floating badges are fully visible without overlap at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const badges = page.locator('[data-hero-badge]');
    await expect(badges).toHaveCount(3);
    for (const badge of await badges.all()) {
      await badge.scrollIntoViewIfNeeded();
      await expect(badge).toBeVisible();
      const geometry = await badge.evaluate(el => {
        const rect = el.getBoundingClientRect();
        const clippedBy: string[] = [];
        for (let parent = el.parentElement; parent; parent = parent.parentElement) {
          const style = getComputedStyle(parent);
          const box = parent.getBoundingClientRect();
          if (['hidden', 'clip', 'auto', 'scroll'].includes(style.overflowX) && (rect.left < box.left - 1 || rect.right > box.right + 1)) clippedBy.push('horizontal');
          if (['hidden', 'clip', 'auto', 'scroll'].includes(style.overflowY) && (rect.top < box.top - 1 || rect.bottom > box.bottom + 1)) clippedBy.push('vertical');
        }
        return { left: rect.left, right: rect.right, clippedBy };
      });
      expect(geometry.left).toBeGreaterThanOrEqual(0);
      expect(geometry.right).toBeLessThanOrEqual(width);
      expect(geometry.clippedBy).toEqual([]);
    }
    const stability = await page.locator('[data-hero-badge="stability"]').boundingBox();
    const channels = await page.locator('[data-hero-badge="channels"]').boundingBox();
    expect(stability && channels).toBeTruthy();
    const overlap = stability!.x < channels!.x + channels!.width && stability!.x + stability!.width > channels!.x && stability!.y < channels!.y + channels!.height && stability!.y + stability!.height > channels!.y;
    expect(overlap).toBeFalsy();
    const dimensions = await page.evaluate(() => [innerWidth, document.documentElement.scrollWidth]);
    expect(dimensions[1]).toBeLessThanOrEqual(dimensions[0] + 1);
  });
}

/* صفّ تذاكر الهيرو: تذكرة المواعيد الرئيسية بالعرض نفسه الذي تحمله لوحة
   العرض الوسطى في الماكيت الكبير (نفس قالب شبكة TvMockup)، وعلى يمينها
   تذكرة مباريات اليوم، وعلى يسارها تذكرة آخر الأخبار — والمحتوى من مصادر
   الموقع (scoreboard.php وFEATURED_NEWS) لا من نصّ مكتوب هنا. */
test('hero ticket row mirrors the mockup center panel with today/news side tickets', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');

  const main = page.locator('.hero-ticket-row .home-matches-ticket');
  const panel = page.locator('[aria-label="مقارنة سيرفرات المشاهدة"] > div.grid > div').nth(1);
  await main.scrollIntoViewIfNeeded();

  const mainBox = await main.boundingBox();
  const panelBox = await panel.boundingBox();
  expect(mainBox && panelBox).toBeTruthy();
  /* نفس عرض لوحة العرض الوسطى (±4px: فروق الحدود الدقيقة بين الشبكتين) */
  expect(Math.abs(mainBox!.width - panelBox!.width)).toBeLessThanOrEqual(4);
  /* الرئيسية بعرض التذكرة نفسها (265px) وفي صفّ واحد مع لوحة العرض */
  expect(mainBox!.height).toBeCloseTo(265, 0);

  const sides = page.locator('.hero-side-ticket');
  await expect(sides).toHaveCount(2);
  const todayTicket = sides.filter({ hasText: 'مباريات اليوم' });
  const newsTicket = sides.filter({ hasText: 'آخر الأخبار' });
  const todayBox = await todayTicket.boundingBox();
  const newsBox = await newsTicket.boundingBox();
  expect(todayBox && newsBox).toBeTruthy();

  /* RTL: يمين التذكرة الرئيسية = مباريات اليوم، يسارها = الأخبار */
  expect(todayBox!.x).toBeGreaterThanOrEqual(mainBox!.x + mainBox!.width - 2);
  expect(newsBox!.x + newsBox!.width).toBeLessThanOrEqual(mainBox!.x + 2);
  /* الثلاث على استقامة واحدة بنفس الارتفاع */
  for (const box of [todayBox!, newsBox!]) {
    expect(Math.abs(box.y - mainBox!.y)).toBeLessThanOrEqual(2);
    expect(Math.abs(box.height - mainBox!.height)).toBeLessThanOrEqual(2);
  }

  /* المحتوى من مصدره: رابط صفحة المواعيد في تذكرة اليوم، ورابط الخبر
     الداخلي في تذكرة الأخبار */
  await expect(todayTicket.locator('a[href*="/matches/"]').first()).toBeVisible();
  await expect(newsTicket.locator('a[href*="/news/"]').first()).toHaveAttribute('href', /\/news\//);
});

test('hero side tickets stack under the main ticket on mobile without overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/');
  const main = await page.locator('.hero-ticket-row .home-matches-ticket').boundingBox();
  const today = await page.locator('.hero-side-ticket').filter({ hasText: 'مباريات اليوم' }).boundingBox();
  const news = await page.locator('.hero-side-ticket').filter({ hasText: 'آخر الأخبار' }).boundingBox();
  expect(main && today && news).toBeTruthy();
  /* الرئيسية أولاً ثم الجانبيتان تحتها — بلا تراكب */
  expect(main!.height).toBeCloseTo(265, 0);
  expect(today!.y).toBeGreaterThanOrEqual(main!.y + main!.height);
  expect(news!.y).toBeGreaterThanOrEqual(today!.y + today!.height);
  for (const box of [main!, today!, news!]) expect(box.width).toBeLessThanOrEqual(390);
  const dimensions = await page.evaluate(() => [innerWidth, document.documentElement.scrollWidth]);
  expect(dimensions[1]).toBeLessThanOrEqual(dimensions[0] + 1);
});
