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
   تذكرة مباريات أمس/اليوم/غد، وعلى يسارها تذكرة آخر الأخبار — والمحتوى من
   مصادر الموقع (scoreboard.php وFEATURED_NEWS) لا من نصّ مكتوب هنا. */
test('hero main ticket fills the hidden news space beside the matches ticket', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');

  const main = page.locator('.hero-ticket-row .home-matches-ticket');
  const row = page.locator('.hero-ticket-row');
  await main.scrollIntoViewIfNeeded();

  const mainBox = await main.boundingBox();
  const rowBox = await row.boundingBox();
  expect(mainBox && rowBox).toBeTruthy();
  // No empty news column: main fills the entire remaining desktop width.
  expect(Math.abs(mainBox!.width - (rowBox!.width - 190))).toBeLessThanOrEqual(2);
  expect(Math.abs(mainBox!.x - rowBox!.x)).toBeLessThanOrEqual(2);
  /* الرئيسية بعرض التذكرة نفسها (265px) */
  expect(mainBox!.height).toBeCloseTo(265, 0);

  const matchesTicket = page.locator('[data-hero-side="matches"]');
  const newsTicket = page.locator('[data-hero-side="news"]');
  await expect(matchesTicket).toHaveCount(1);
  await expect(newsTicket).toHaveCount(0);
  const matchesBox = await matchesTicket.boundingBox();
  expect(matchesBox).toBeTruthy();

  /* RTL: يمين التذكرة الرئيسية = المباريات، يسارها = الأخبار */
  expect(matchesBox!.x).toBeGreaterThanOrEqual(mainBox!.x + mainBox!.width - 2);
  /* الثلاث على استقامة واحدة بنفس الارتفاع */
  for (const box of [matchesBox!]) {
    expect(Math.abs(box.y - mainBox!.y)).toBeLessThanOrEqual(2);
    expect(Math.abs(box.height - mainBox!.height)).toBeLessThanOrEqual(2);
  }

  /* المحتوى من مصدره: رابط صفحة المواعيد في تذكرة المباريات، ورابط الخبر
     الداخلي في تذكرة الأخبار */
  await expect(matchesTicket.locator('a[href*="/matches/"]').first()).toBeVisible();
});

/* التبويبات الثلاثة (أمس/اليوم/غد) وشرائح المباريات بسهمَيها: الشعارات من
   المصدر، والتقليب يعمل يدوياً وتلقائياً. تُموَّل استجابات scoreboard.php هنا
   لأن الخادم الثابت لا يخدم PHP — والمصدر نفسه هو ما يُختبر شكله وسلوكه. */
test('hero matches ticket has yesterday/today/tomorrow tabs, club logos and arrows', async ({ page }) => {
  /* تواريخ اليوم الحقيقي بتوقيت القاهرة — فلا يتقادم الاختبار مع الأيام */
  const cairoDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const shift = (day: string, offset: number) => {
    const date = new Date(`${day}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + offset);
    return date.toISOString().slice(0, 10);
  };
  const event = (id: string, day: string, hour: string, home: string, away: string, score: [number, number] | null) => ({
    id,
    date: `${day}T${hour}:00Z`,
    competitions: [{
      date: `${day}T${hour}:00Z`,
      status: { type: { name: score ? 'STATUS_FULL_TIME' : 'STATUS_SCHEDULED', state: score ? 'post' : 'pre', completed: Boolean(score) } },
      competitors: [
        { homeAway: 'home', score: score ? String(score[0]) : undefined, team: { displayName: home, logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/1.png' } },
        { homeAway: 'away', score: score ? String(score[1]) : undefined, team: { displayName: away, logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/2.png' } },
      ],
    }],
  });
  /* بطولة لكل يوم — كل طلب يحمل نطاق ثلاثة أيام حول يومه، وmatchesForDay
     تنتقي يوم التبويب نفسه، فتظهر في كل تبويب مبارياته وحدها */
  const byLeague: Record<string, unknown[]> = {
    'esp.1': [event('h1', shift(cairoDay, -1), '16', 'الأهلي', 'الزمالك', [2, 1])],
    'eng.1': [event('t1', cairoDay, '18', 'مانشستر سيتي', 'ليفربول', null), event('t2', cairoDay, '20', 'ريال مدريد', 'برشلونة', null)],
    'ger.1': [event('f1', shift(cairoDay, 1), '19', 'بايرن ميونخ', 'دورتموند', null)],
  };
  await page.route('**/scoreboard.php*', route => {
    const league = new URL(route.request().url()).searchParams.get('league') ?? '';
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, events: byLeague[league] ?? [] }) });
  });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');

  const ticket = page.locator('[data-hero-side="matches"]');
  const tabs = ticket.getByRole('tab');
  await expect(tabs).toHaveCount(3);
  await expect(ticket.getByRole('tab', { name: 'اليوم' })).toHaveAttribute('aria-selected', 'true');
  await expect(ticket.getByRole('tab', { name: 'أمس' })).toHaveAttribute('aria-selected', 'false');

  /* شرائح اليوم: شعار للناديَّين في كل من نسختَي الشريحة (الجوال والمكتب)
     + عدّاد 1/2 + سهمان */
  await expect(ticket.locator('img[data-club-logo]')).toHaveCount(4);
  await expect(ticket.locator('text=1/2')).toBeVisible();
  const next = ticket.getByRole('button', { name: 'المباراة التالية' });
  const prev = ticket.getByRole('button', { name: 'المباراة السابقة' });
  await expect(next).toBeEnabled();
  await next.click();
  await expect(ticket.locator('text=2/2')).toBeVisible();
  await prev.click();
  await expect(ticket.locator('text=1/2')).toBeVisible();

  /* التبويبات تبدّل يوم الشرائح: أمس فيه مباراة واحدة، وغد كذلك */
  await ticket.getByRole('tab', { name: 'أمس' }).click();
  await expect(ticket.getByRole('tab', { name: 'أمس' })).toHaveAttribute('aria-selected', 'true');
  await expect(ticket.getByRole('link', { name: /الأهلي/ })).toBeVisible();
  await expect(ticket.locator('text=1/1')).toBeVisible();
  await expect(next).toBeDisabled();

  await ticket.getByRole('tab', { name: 'غد' }).click();
  await expect(ticket.getByRole('link', { name: /بايرن ميونخ/ })).toBeVisible();

  /* التقليب التلقائي: يعود إلى تبويب اليوم ثم ينتقل من 1/2 إلى 2/2 وحده */
  await ticket.getByRole('tab', { name: 'اليوم' }).click();
  await expect(ticket.locator('text=1/2')).toBeVisible();
  await expect.poll(async () => ticket.locator('text=2/2').isVisible(), { timeout: 25000, intervals: [500] }).toBeTruthy();
});

/* شعار البطولة في خلفية الشريحة: من الخريطة الموثّقة LEAGUE_ICONS بحسب
   بطولة المباراة نفسها، ولا شعار للبطولة التي لا شعار موثّق لها (الدوري
   المصري عند المصدر). */
test('hero slide shows the competition logo of its own league in the background', async ({ page }) => {
  const cairoDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const event = (id: string, hour: string, home: string, away: string) => ({
    id,
    date: `${cairoDay}T${hour}:00Z`,
    competitions: [{
      date: `${cairoDay}T${hour}:00Z`,
      status: { type: { name: 'STATUS_SCHEDULED', state: 'pre', completed: false } },
      competitors: [
        { homeAway: 'home', team: { displayName: home } },
        { homeAway: 'away', team: { displayName: away } },
      ],
    }],
  });
  const byLeague: Record<string, unknown[]> = {
    'eng.1': [event('eng1', '18', 'مانشستر سيتي', 'ليفربول')],
    'egy.1': [event('egy1', '20', 'الأهلي', 'الزمالك')],
  };
  await page.route('**/scoreboard.php*', route => {
    const league = new URL(route.request().url()).searchParams.get('league') ?? '';
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, events: byLeague[league] ?? [] }) });
  });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  const ticket = page.locator('[data-hero-side="matches"]');
  await expect(ticket.locator('text=1/2')).toBeVisible();

  /* البطولة الأولى (الإنجليزي) لها شعار موثّق في الخلفية */
  await expect(ticket.locator('.hero-match-slide')).toHaveAttribute('href', '/matches/');
  const logo = ticket.locator('img[data-league-logo]');
  await expect(logo).toHaveCount(1);
  await expect(logo).toHaveAttribute('src', /\/23\.png$/);
  await expect(logo).toHaveAttribute('aria-hidden', 'true');
  const watermark = await logo.evaluate(el => {
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const card = el.closest('a')!.getBoundingClientRect();
    return { filter: style.filter, opacity: Number(style.opacity),
      dx: Math.abs(rect.x + rect.width / 2 - card.x - card.width / 2),
      dy: Math.abs(rect.y + rect.height / 2 - card.y - card.height / 2) };
  });
  expect(watermark.filter).not.toMatch(/invert|brightness|grayscale/);
  expect(watermark.opacity).toBeGreaterThanOrEqual(0.3);
  expect(watermark.dx).toBeLessThanOrEqual(2);
  expect(watermark.dy).toBeLessThanOrEqual(2);

  /* الثانية (المصري) بلا شعار موثّق — لا صورة ولا شعار مخترع */
  await ticket.getByRole('button', { name: 'المباراة التالية' }).click();
  await expect(ticket.locator('text=2/2')).toBeVisible();
  await expect(ticket.getByRole('link', { name: /الأهلي/ })).toBeVisible();
  await expect(ticket.locator('img[data-league-logo]')).toHaveCount(0);
});

/* تذكرة الأخبار: كل خبر في شريحة مستقلة تُقلَّب بسهمين وتلقائياً — من
   FEATURED_NEWS وحدها، وكل شريحة رابط إلى صفحة الخبر الداخلية. */
test('hero side news ticket is temporarily hidden on desktop and mobile', async ({ page }) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    await expect(page.locator('[data-hero-side="news"]')).toHaveCount(0);
    await expect(page.locator('.home-matches-ticket')).toBeVisible();
  }
});

test('hero matches ticket sits above the main ticket on mobile at half its height', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/');
  const matches = await page.locator('[data-hero-side="matches"]').boundingBox();
  const main = await page.locator('.hero-ticket-row .home-matches-ticket').boundingBox();
  expect(matches && main).toBeTruthy();
  /* فوق التذكرة الرئيسية، وبنصف طولها */
  expect(matches!.y + matches!.height).toBeLessThanOrEqual(main!.y);
  expect(Math.abs(matches!.height - main!.height / 2)).toBeLessThanOrEqual(4);
  for (const box of [matches!, main!]) expect(box.width).toBeLessThanOrEqual(390);
  const dimensions = await page.evaluate(() => [innerWidth, document.documentElement.scrollWidth]);
  expect(dimensions[1]).toBeLessThanOrEqual(dimensions[0] + 1);
});

test('hero live match shows source minute and links only to its registered match center', async ({ page }) => {
  const { matchByExternalId, matchCenterPath } = await import('../src/content/match-center.mjs');
  const fixture = matchByExternalId('espn', '401879259')!;
  await page.route('**/scoreboard.php*', route => {
    const url = new URL(route.request().url());
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, events: url.searchParams.get('league') === 'eng.1' ? [{
      id: '401879259', date: `${date}T14:00:00Z`,
      competitions: [{ status: { displayClock: "67′", type: { state: 'in', completed: false } }, competitors: [
        { homeAway: 'home', score: '1', team: { displayName: 'مانشستر سيتي' } },
        { homeAway: 'away', score: '0', team: { displayName: 'إيبسويتش تاون' } },
      ] }],
    }] : [] }) });
  });
  await page.goto('/');
  const slide = page.locator('[data-hero-side="matches"] .hero-match-slide');
  await expect(slide).toContainText('مباشر');
  await expect(slide).toContainText('67′');
  await expect(slide).toHaveAttribute('href', matchCenterPath(fixture));
  // Arabic mobile row: home team and its score are on the right.
  await page.setViewportSize({ width: 390, height: 900 });
  const score = slide.locator('[data-match-score]');
  await expect(score).toHaveAttribute('dir', 'rtl');
  await expect(score.locator('[data-score-home]')).toHaveText('1');
  await expect(score.locator('[data-score-away]')).toHaveText('0');
  const home = await score.locator('[data-score-home]').boundingBox();
  const away = await score.locator('[data-score-away]').boundingBox();
  expect(home!.x).toBeGreaterThan(away!.x);

});

test('ticket touch gestures reach finished matches beyond twelve in every day tab and change main slides', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.route('**/scoreboard.php*', route => {
    const league = new URL(route.request().url()).searchParams.get('league');
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const events = [-1, 0, 1].flatMap(offset => {
      const date = new Date(`${today}T12:00:00Z`);
      date.setUTCDate(date.getUTCDate() + offset);
      return Array.from({ length: 13 }, (_, i) => ({ id: `${offset}-${i}`, date: date.toISOString(), competitions: [{
        status: { type: { state: i === 12 ? 'post' : 'pre', completed: i === 12 } },
        competitors: [
          { homeAway: 'home', score: '3', team: { displayName: `مضيف ${i}` } },
          { homeAway: 'away', score: '1', team: { displayName: `ضيف ${i}` } },
        ],
      }] }));
    });
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, events: league === 'eng.1' ? events : [] }) });
  });
  await page.goto('/');
  const ticket = page.locator('[data-hero-side="matches"]');
  const swipe = async (locator: ReturnType<typeof page.locator>, dx: number, dy = 0) => {
    await locator.evaluate((el, { dx, dy }) => {
      const touch = (x: number, y: number) => new Touch({ identifier: 1, target: el, clientX: x, clientY: y });
      el.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [touch(100, 100)] }));
      el.dispatchEvent(new TouchEvent('touchend', { bubbles: true, changedTouches: [touch(100 + dx, 100 + dy)] }));
    }, { dx, dy });
  };
  for (const day of ['اليوم', 'أمس', 'غد']) {
    await ticket.getByRole('tab', { name: day, exact: true }).click();
    await expect(ticket.getByText('1/13', { exact: true })).toBeVisible();
    await swipe(ticket.locator('.hero-match-slide'), -90);
    await expect(ticket.getByText('13/13', { exact: true })).toBeVisible();
    await expect(ticket.locator('.hero-match-slide')).toContainText('انتهت');
    await swipe(ticket.locator('.hero-match-slide'), 90);
    await expect(ticket.getByText('1/13', { exact: true })).toBeVisible();
    await swipe(ticket.locator('.hero-match-slide'), 5, 100);
    await expect(ticket.getByText('1/13', { exact: true })).toBeVisible();
  }
  const track = page.locator('.home-matches-ticket .league-ticket-track');
  const activeIndex = () => track.locator('.league-ticket-slide').evaluateAll(els => els.findIndex(el => el.classList.contains('is-active')));
  const before = await activeIndex();
  await swipe(track, 90);
  await expect.poll(activeIndex).toBe((before + 1) % 6);
  await swipe(track, -90);
  await expect.poll(activeIndex).toBe(before);
});
