import { test, expect, type Page } from '@playwright/test';

async function selectCrownSlide(page: Page, target: number | RegExp) {
  const strip = page.locator('[data-hero-league-strip]');
  const cards = strip.locator('[data-crown-card]');
  const index = typeof target === 'number' ? target : (await cards.allTextContents()).findIndex(text => target.test(text));
  expect(index).toBeGreaterThanOrEqual(0);
  const key = await cards.nth(index).getAttribute('data-crown-card');
  for (let i = 0; i < await cards.count(); i++) {
    if (await strip.locator('[data-crown-offset="0"]').getAttribute('data-crown-card') === key) break;
    await strip.locator('.hs-crown-arrow').first().click();
  }
  await page.mouse.move(0, 0);
  await expect(strip.locator('[data-crown-offset="0"]')).toHaveAttribute('data-crown-card', key!);
}

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

test('approved Uiverse server cards are limited to the Arabic homepage', async ({ page }) => {
  await page.goto('/');
  const homeCards = page.locator('#pricing article.homepage-uiverse-card[data-server]');
  await expect(homeCards).toHaveCount(4);
  await expect(page.locator('#pricing article.srv-card')).toHaveCount(0);

  const nova = page.locator('#pricing article.homepage-uiverse-card[data-server="nova"]');
  await expect(nova.locator('.homepage-uiverse-card__logo')).toHaveAttribute('src', /\/images\/brand\/nova-ticket\.(?:png|webp|avif)$/);
  await expect(nova.locator('.homepage-uiverse-card__price-ribbon')).toHaveCSS('background-color', 'rgb(253, 189, 74)');
  await expect(nova).toHaveCSS('border-bottom-color', 'rgb(0, 4, 70)');
  await expect(nova).toContainText('مواصفات يعلنها المزود');
  await expect(nova).toContainText('ما تشمله خدمتنا');
  await expect(nova).toContainText('تفعيل بيانات الاشتراك الصادرة من المزود');
  await expect(nova).not.toContainText('دليل خيارات المشاهدة الرسمية');
  await expect(nova).not.toContainText('حتى 3 أجهزة');
  await expect(nova.getByRole('link', { name: /اطلب كود التفعيل/ })).toBeVisible();
  await expect(nova.getByRole('button', { name: /أضف إلى السلة/ })).toBeVisible();

  const x = page.locator('#pricing article.homepage-uiverse-card[data-server="x"]');
  await expect(x).toContainText('$20');
  await expect(x.locator('.homepage-uiverse-card__logo')).toHaveAttribute('src', /\/images\/brand\/xtv-mark\.(?:png|webp|avif)$/);

  await page.goto('/store/');
  await expect(page.locator('#pricing article.srv-card[data-server]')).toHaveCount(4);
  await expect(page.locator('#pricing article.homepage-uiverse-card')).toHaveCount(0);
});

/* الصيغة امتداد تنفيذ: النشر يبدّل src إلى أخف نسخة حديثة (avif/webp)،
   فيُطابَق المسار بجزئه الثابت لا بامتداد الأصل. */
test('X plan card uses the XTV watermark, annual price, and hides device count and official-guide feature', async ({ page }) => {
  await page.goto('/store/');
  /* ربط البطاقة بمعرّفها الثابت (data-server) بدل الابن المباشر للشعار:
     بنية أيقونة الشعار قد تُغلَّف بغلاف، والصيغة تُبدَّل عند النشر. */
  const card = page.locator('#pricing article[data-server="x"]');
  await expect(card).toHaveCount(1);
  const logo = card.locator('img[src*="/images/brand/xtv-ticket"]');
  await expect(logo).toHaveCount(1);
  await expect(logo).toBeVisible();
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
  const cardOf = (server: string) => page.locator(`#pricing article[data-server="${server}"]`);
  const novaClasses = await cardOf('nova').locator('.srv-card-inner').getAttribute('class');
  const xClasses = await cardOf('x').locator('.srv-card-inner').getAttribute('class');
  expect(novaClasses).toBe(xClasses);

  for (const [logoPath, server] of [['/images/brand/istar-ticket', 'istar'], ['/images/brand/moka-ticket', 'moka']]) {
    const card = cardOf(server);
    const logo = card.locator(`img[src*="${logoPath}"]`);
    await expect(logo).toHaveCount(1);
    await expect(logo).toBeVisible();
    await expect.poll(() => logo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBeTruthy();
    await expect(card.locator('.srv-card-inner')).toHaveAttribute('class', novaClasses!);
    await expect(card.locator('.srv-card-inner')).toHaveCSS('background-color', 'rgba(11, 11, 15, 0.95)');
    await expect(card.locator('.srv-card-inner')).toHaveCSS('color', 'rgb(255, 255, 255)');
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
      /* العلامة المائية وحدها تحمل صنف mix-blend-screen في صفحات الباقات */
      const logo = page.locator('main img.mix-blend-screen');
      await expect(logo).toHaveAttribute('src', new RegExp(`/images/brand/${server.logo}\\.(?:png|webp|avif)$`));
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
  await page.locator('footer').getByRole('button', { name: 'طلب كود فحص تجريبي (6 ساعات)', exact: true }).click();
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
  expect(watermark.opacity).toBeGreaterThanOrEqual(0.12);
  expect(watermark.opacity).toBeLessThanOrEqual(0.2);
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

test('matches ticket uses the white and lime reference frame with accessible dark text', async ({ page }) => {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    const ticket = page.locator('[data-hero-side="matches"]');
    await ticket.scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);
    const frame = await ticket.evaluate(el => {
      const style = getComputedStyle(el);
      return { radius: parseFloat(style.borderRadius), color: style.borderTopColor,
        border: parseFloat(style.borderTopWidth), shadow: style.boxShadow,
        glow: getComputedStyle(el, '::before').content };
    });
    expect(frame.radius).toBeCloseTo(6.4, 0);
    expect(frame.color).toBe('rgb(250, 250, 250)');
    expect(frame.border).toBeGreaterThanOrEqual(3);
    expect(frame.shadow).not.toBe('none');
    expect(frame.glow).toBe('none');
    await ticket.hover();
    await expect(ticket).toHaveCSS('border-top-color', 'rgb(216, 255, 62)');
    await page.mouse.move(0, 0);
    await ticket.getByRole('tab', { name: 'اليوم', exact: true }).focus();
    await expect(ticket).toHaveCSS('border-top-color', 'rgb(216, 255, 62)');
    await expect(ticket).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(ticket).toHaveCSS('color', 'rgb(11, 11, 15)');
    await expect(ticket.locator('.league-ticket-holographic')).toHaveCount(0);
    await expect(ticket.locator('.league-ticket-ray')).toHaveCount(0);
    await expect(ticket.locator('.league-ticket-line')).toHaveCount(0);
    await expect(ticket.getByRole('tab')).toHaveCount(3);
  }
});

test('hero phone demo sits between the headline and stars and supports touch and keyboard', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const phone = page.getByRole('button', { name: 'عرض تطبيقات نموذج الهاتف', exact: true });
  await phone.scrollIntoViewIfNeeded();
  await expect(phone).toHaveAttribute('aria-pressed', 'false');
  const headline = await page.locator('#hero h1').boundingBox();
  const device = await phone.boundingBox();
  const stars = await page.getByText('على شاشتك وجوالك', { exact: true }).boundingBox();
  expect(headline && device && stars).toBeTruthy();
  expect(device!.y).toBeGreaterThan(headline!.y + headline!.height);
  expect(device!.y + device!.height).toBeLessThan(stars!.y);
  expect(device!.width).toBe(180);
  expect(device!.height).toBe(350);
  await phone.click();
  await expect(phone).toHaveAttribute('aria-pressed', 'true');
  await expect(phone.locator('.hero-phone-apps')).toHaveCSS('opacity', '1');
  await phone.press('Enter');
  await expect(phone).toHaveAttribute('aria-pressed', 'false');
  await phone.press('Space');
  await expect(phone).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(phone).toBeVisible();
});

test('phone lock and apps screens share the four official server logos without white plates', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/');
  const phone = page.locator('[data-hero-phone]');
  await phone.scrollIntoViewIfNeeded();
  for (const screen of ['.hero-phone-lock', '.hero-phone-apps']) {
    const servers = phone.locator(`${screen} [data-phone-server]`);
    await expect(servers).toHaveCount(4);
    for (const code of ['nova', 'istar', 'moka', 'x']) {
      const server = phone.locator(`${screen} [data-phone-server="${code}"]`);
      await expect(server.locator('img')).toHaveCount(1);
      await expect(server).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
      const lockSrc = await phone.locator(`.hero-phone-lock [data-phone-server="${code}"] img`).getAttribute('src');
      await expect(server.locator('img')).toHaveAttribute('src', lockSrc!);
    }
  }
  await expect(phone.locator('.hero-phone-lock')).toHaveCSS('opacity', '1');
  await phone.click();
  await expect(phone.locator('.hero-phone-apps')).toHaveCSS('opacity', '1');
  await expect(phone).toHaveAttribute('aria-pressed', 'true');
});

test('phone contains branded service notification and restores apps above server logos', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/');
  const phone = page.locator('[data-hero-phone]');
  await phone.scrollIntoViewIfNeeded();
  const notification = phone.locator('.hero-phone-notification');
  await expect(notification).toContainText('ستريم ماستر');
  await expect(notification).toContainText('استكشف خيارات المشاهدة');
  await expect(notification.locator('.hero-phone-notification-logo svg')).toHaveCount(1);
  await expect(page.locator('#hero > div p').filter({ hasText: 'استكشف خيارات المشاهدة' })).toHaveCount(0);
  const box = await notification.boundingBox();
  const shortcuts = await phone.locator('.hero-phone-shortcuts').boundingBox();
  expect(box!.y + box!.height).toBeLessThanOrEqual(shortcuts!.y);
  await phone.click();
  const apps = phone.locator('.hero-phone-apps');
  await expect(apps.locator('.hero-phone-grid > .hero-phone-app')).toHaveCount(4);
  await expect(apps.locator('[data-phone-server]')).toHaveCount(4);
  const grid = await apps.locator('.hero-phone-grid').boundingBox();
  const servers = await apps.locator('.hero-phone-servers').boundingBox();
  expect(grid!.y + grid!.height).toBeLessThan(servers!.y);
});

test('phone Cairo clock updates automatically including the date at midnight', async ({ page }) => {
  const start = new Date('2026-10-25T20:59:30Z');
  await page.clock.install({ time: start });
  await page.goto('/');
  const phone = page.locator('[data-hero-phone]');
  const time = (at: Date) => new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(at);
  const date = (at: Date) => new Intl.DateTimeFormat('ar-EG', {
    timeZone: 'Africa/Cairo', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(at);
  await expect(phone.locator('.hero-phone-time')).toHaveText(time(start));
  await expect(phone.locator('.hero-phone-date')).toHaveText(date(start));
  await expect(phone.locator('[data-phone-status-time]')).toHaveText(time(start));
  await page.clock.fastForward(60_000);
  const next = new Date(start.getTime() + 60_000);
  await expect(phone.locator('.hero-phone-time')).toHaveText(time(next));
  await expect(phone.locator('[data-phone-status-time]')).toHaveText(time(next));
  await expect(phone.locator('.hero-phone-date')).toHaveText(date(next));
  expect(date(next)).not.toBe(date(start));
});

test('angled television sits behind the phone and supports touch and keyboard without overflow', async ({ page }) => {
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    const stage = page.locator('.hero-phone-stage');
    await stage.scrollIntoViewIfNeeded();
    const tv = stage.locator('[data-hero-tv]');
    const phone = stage.locator('[data-hero-phone]');
    await expect(tv).toBeVisible();
    await expect(phone).toBeVisible();
    expect(await tv.evaluate(el => getComputedStyle(el).transform)).not.toBe('none');
    const box = await tv.boundingBox();
    const device = await phone.boundingBox();
    expect(box!.x).toBeLessThan(device!.x);
    // Overlap is intentional; the phone is painted above the TV.
    expect(box!.x + box!.width).toBeGreaterThan(device!.x);
    expect(await phone.evaluate(el => Number(getComputedStyle(el).zIndex))).toBeGreaterThan(await tv.evaluate(el => Number(getComputedStyle(el).zIndex)));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const screen = tv.getByRole('button', { name: 'عرض السيرفرات في نموذج التلفاز' });
    await expect(screen).toHaveAttribute('aria-pressed', 'false');
    await screen.focus();
    await screen.press('Enter');
    await expect(screen).toHaveAttribute('aria-pressed', 'true');
    await expect(screen.locator('[data-tv-server]')).toHaveCount(4);
    await expect(screen.locator('.hero-tv-apps')).toHaveCSS('opacity', '1');
    await screen.press('Space');
    await expect(screen).toHaveAttribute('aria-pressed', 'false');
    // The exposed left edge remains clickable even with the phone in front.
    await screen.click({ position: { x: 70, y: 80 } });
    await expect(screen).toHaveAttribute('aria-pressed', 'true');
  }
});

test('small screens show a miniature tilted television behind the full-size phone', async ({ page }) => {
  // السكون مطلوب هنا: القياسات مواضع، وأنيميشن الكشف .rv يقلب فارق 7px إلى
  // −22px إن هوُ التقط في منتصفه (خصوصًا بعد أن طال الشريط وزاد التمرير).
  await page.addInitScript(() => localStorage.setItem('sm-motion-preference', 'off'));
  for (const width of [320, 390, 600, 767]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    const stage = page.locator('.hero-phone-stage');
    await stage.scrollIntoViewIfNeeded();
    await page.waitForTimeout(250);
    const phone = stage.locator('[data-hero-phone]');
    const tv = stage.locator('[data-hero-tv]');
    const device = await phone.boundingBox();
    const frame = await tv.locator('.hero-tv-frame').boundingBox();
    const television = await tv.boundingBox();
    const container = await stage.boundingBox();
    expect(television!.width).toBeLessThan(280);
    expect(television!.height).toBeLessThan(device!.height);
    // The compact TV is taller now, proportionate to the full-height phone.
    expect(frame!.height).toBeGreaterThan(device!.height * 0.6);
    expect(television!.y).toBeGreaterThan(device!.y);
    expect(television!.y).toBeLessThan(device!.y + device!.height);
    expect(television!.x).toBeLessThan(device!.x);
    expect(television!.x + television!.width).toBeGreaterThan(device!.x);
    expect(device!.width).toBe(180);
    expect(device!.x).toBeGreaterThanOrEqual(0);
    expect(frame!.x).toBeGreaterThanOrEqual(0);
    expect(frame!.x + frame!.width).toBeLessThanOrEqual(width);
    expect(device!.y + device!.height).toBeLessThanOrEqual(container!.y + container!.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test('hero top promotional badge is hidden while the tickets and headline remain', async ({ page }) => {
  await page.goto('/');
  const hero = page.locator('#hero');
  await expect(hero.getByText('متعة المشاهدة تبدأ هنا', { exact: true })).toHaveCount(0);
  await expect(hero.locator('.hero-ticket-row')).toBeVisible();
  await expect(hero.locator('h1')).toBeVisible();
});

test('television welcome places archived cinema artwork left of its text and hides it with the welcome screen', async ({ page }) => {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    const tv = page.locator('[data-hero-tv]');
    await tv.scrollIntoViewIfNeeded();
    const art = tv.locator('.hero-tv-welcome-art');
    await expect(art).toHaveAttribute('src', /images\/cinema\/superman-batman-stark\.(?:png|webp|avif)$/);
    await expect.poll(() => art.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBeTruthy();
    const positions = await tv.evaluate(el => {
      const art = el.querySelector('.hero-tv-welcome-art') as HTMLElement;
      const copy = el.querySelector('.hero-tv-welcome-copy') as HTMLElement;
      return { art: art.offsetLeft + art.offsetWidth, copy: copy.offsetLeft };
    });
    expect(positions.art).toBeLessThanOrEqual(positions.copy);
    const button = tv.getByRole('button');
    await button.focus();
    await button.press('Enter');
    await expect(tv.locator('.hero-tv-welcome')).toHaveCSS('opacity', '0');
    await expect(tv.locator('.hero-tv-apps')).toHaveCSS('opacity', '1');
  }
});

test('TV portrait ensemble keeps the same proportions and layer order on small screens', async ({ page }) => {
  const layouts: number[][] = [];
  for (const width of [320, 390, 767, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    const gallery = page.locator('.hero-tv-welcome-gallery');
    await expect(gallery.locator('.hero-tv-football-art img')).toHaveCount(5);
    layouts.push(await gallery.evaluate(el => {
      const box = el as HTMLElement;
      const normalized = [box.offsetWidth / box.offsetHeight];
      for (const img of box.querySelectorAll('img')) {
        normalized.push(img.offsetLeft / box.offsetWidth, img.offsetTop / box.offsetHeight,
          img.offsetWidth / box.offsetWidth, img.offsetHeight / box.offsetHeight,
          Number(getComputedStyle(img).zIndex) || 0);
      }
      return normalized;
    }));
  }
  for (const layout of layouts) {
    expect(layout[0]).toBeCloseTo(0.75, 1);
    layout.forEach((value, i) => expect(Math.abs(value - layouts[0][i])).toBeLessThan(0.04));
  }
});

test('animated hero word has inline holographic layers without resizing its typography', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    const word = page.locator('#hero h1 .hero-title-holo').first();
    await page.locator('#hero h1').scrollIntoViewIfNeeded();
    await expect(word.locator('.hero-title-holo__layer')).toHaveCount(3);
    await expect(word.locator('[aria-hidden="true"]')).toHaveCount(2);
    const sizes = await word.evaluate(el => {
      const title = el.closest('h1')!;
      const front = el.querySelector('.hero-title-holo__layer--front')!;
      return { title: getComputedStyle(title).fontSize, word: getComputedStyle(front).fontSize,
        animation: getComputedStyle(el.querySelector('.hero-title-holo__stack')!).animationName };
    });
    expect(sizes.word).toBe(sizes.title);
    expect(sizes.animation).toBe('none');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});


test('hero 4K uses the same three-layer effect at the existing headline size', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const quality = page.locator('#hero h1 .hero-title-holo--quality');
  await expect(quality).toHaveAttribute('dir', 'ltr');
  await expect(quality.locator('.hero-title-holo__layer')).toHaveCount(3);
  await expect(quality.locator('.hero-title-holo__layer--front')).toHaveText('4K');
  const sizes = await quality.evaluate(el => ({
    title: getComputedStyle(el.closest('h1')!).fontSize,
    quality: getComputedStyle(el.querySelector('.hero-title-holo__layer--front')!).fontSize,
  }));
  expect(sizes.quality).toBe(sizes.title);
});

test('holographic word and 4K animate automatically on touch phones', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'no-preference' });
  const page = await context.newPage();
  await page.goto('/');
  await page.locator('#hero h1').scrollIntoViewIfNeeded();
  for (const selector of ['.hero-title-holo:not(.hero-title-holo--quality)', '.hero-title-holo--quality']) {
    const stack = page.locator(`#hero h1 ${selector} .hero-title-holo__stack`);
    await expect(stack).toHaveCSS('animation-name', 'hero-title-holo-mobile');
    await expect(stack).toHaveCSS('animation-play-state', 'running');
  }
  const quality = page.locator('.hero-title-holo--quality .hero-title-holo__stack');
  const before = await quality.evaluate(el => getComputedStyle(el).transform);
  await page.waitForTimeout(400);
  expect(await quality.evaluate(el => getComputedStyle(el).transform)).not.toBe(before);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(quality).toHaveCSS('animation-name', 'none');
  await context.close();
});

test('clicking devices brings TV forward straight and restores the tilted TV behind the phone', async ({ page }) => {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    const stage = page.locator('.hero-phone-stage');
    await stage.scrollIntoViewIfNeeded();
    const tv = stage.locator('[data-hero-tv]');
    const tvButton = tv.getByRole('button');
    const phone = stage.locator('[data-hero-phone]');
    await expect(stage).toHaveAttribute('data-front-device', 'phone');
    const original = await tv.evaluate(el => getComputedStyle(el).transform);
    await tvButton.click({ position: { x: 70, y: 80 } });
    await expect(stage).toHaveAttribute('data-front-device', 'tv');
    await expect(tv).toHaveCSS('transform', width < 768 ? 'matrix(0.75, 0, 0, 0.75, 0, 0)' : 'none');
    expect(await tv.evaluate(el => Number(getComputedStyle(el).zIndex))).toBeGreaterThan(await phone.evaluate(el => Number(getComputedStyle(el).zIndex)));
    // An exposed lower part remains tappable to restore the phone.
    await phone.click({ position: { x: 150, y: 320 } });
    await expect(stage).toHaveAttribute('data-front-device', 'phone');
    await expect(tv).toHaveCSS('transform', original);
    expect(await phone.evaluate(el => Number(getComputedStyle(el).zIndex))).toBeGreaterThan(await tv.evaluate(el => Number(getComputedStyle(el).zIndex)));
    // The same controls work through the keyboard.
    await tvButton.focus();
    await tvButton.press('Enter');
    await expect(stage).toHaveAttribute('data-front-device', 'tv');
    await phone.focus();
    await phone.press('Space');
    await expect(stage).toHaveAttribute('data-front-device', 'phone');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test('preview headline appears inside the TV welcome with animated word and 4K', async ({ page }) => {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    const tv = page.locator('[data-hero-tv]');
    await tv.scrollIntoViewIfNeeded();
    const title = tv.locator('.hero-tv-headline');
    await expect(title).toBeVisible();
    await expect(title).toContainText('كل ما تحب');
    await expect(title).toContainText('وبلا تقطيع');
    await expect(title.locator('.hero-title-holo__layer--front')).toHaveCount(2);
    await expect(title.locator('.hero-title-holo--quality .hero-title-holo__layer--front')).toHaveText('4K');
    await expect(page.locator('#hero h1')).toHaveCount(1);
    await expect(tv.locator('.hero-tv-welcome-gallery')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test('Arabic header renders the approved popular-crab-39 Stream Master periodic brand mark', async ({ page }) => {
  for (const route of ['/', '/about/']) {
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route);
      const brandLink = page.locator('header a[aria-label="ستريم ماستر — الصفحة الرئيسية"]').first();
      await expect(brandLink).toBeVisible();
      const mark = brandLink.locator('.sm-crab39');
      await expect(mark).toBeVisible();
      await expect(mark.locator('.sm-crab39__tile')).toHaveCount(2);
      await expect(mark.locator('.sm-crab39__sup').nth(0)).toHaveText('4K');
      await expect(mark.locator('.sm-crab39__sup').nth(1)).toHaveText('99');
      await expect(mark.locator('.sm-crab39__sym').nth(0)).toHaveText('ست');
      await expect(mark.locator('.sm-crab39__rest').nth(0)).toHaveText('ريم');
      await expect(mark.locator('.sm-crab39__sym').nth(1)).toHaveText('ما');
      await expect(mark.locator('.sm-crab39__rest').nth(1)).toHaveText('ستر');
      await expect(mark.locator('.sm-crab39__sup').nth(0)).toHaveCSS('color', 'rgb(216, 255, 62)');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
});

test('Google Search favicon and PWA brand icons are crawlable URLs at 48px multiples across routes', async ({ page, request }) => {
  for (const route of ['/', '/about/', '/blog/http-protocols/']) {
    await page.goto(route);
    const icons = await page.evaluate(() =>
      Array.from(document.querySelectorAll('head link[rel="icon"], head link[rel="apple-touch-icon"]')).map((el) => ({
        rel: el.getAttribute('rel'),
        href: el.getAttribute('href') || '',
        sizes: el.getAttribute('sizes') || '',
      }))
    );
    expect(icons.length).toBeGreaterThanOrEqual(7);
    for (const icon of icons) {
      expect(icon.href.startsWith('data:')).toBe(false);
      expect(icon.href.startsWith('/')).toBe(true);
    }
    expect(icons.some((i) => i.href === '/favicon.ico' && i.sizes === '48x48')).toBe(true);
    expect(icons.some((i) => i.href === '/favicon-48x48.png' && i.sizes === '48x48')).toBe(true);
    expect(icons.some((i) => i.href === '/favicon-96x96.png' && i.sizes === '96x96')).toBe(true);
    expect(icons.some((i) => i.href === '/icon-192.png' && i.sizes === '192x192')).toBe(true);
    expect(icons.some((i) => i.href === '/icon-512.png' && i.sizes === '512x512')).toBe(true);
    expect(icons.some((i) => i.rel === 'apple-touch-icon' && i.href === '/apple-touch-icon.png')).toBe(true);
  }

  for (const [asset, expectedType] of [
    ['/favicon.ico', 'image/x-icon'],
    ['/favicon-48x48.png', 'image/png'],
    ['/favicon-96x96.png', 'image/png'],
    ['/icon-192.png', 'image/png'],
    ['/icon-512.png', 'image/png'],
    ['/apple-touch-icon.png', 'image/png'],
  ]) {
    const res = await request.get(asset);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain(expectedType);
    expect((await res.body()).byteLength).toBeGreaterThan(1000);
  }
});

test('laptop stays left of the phone without preview controls or horizontal overflow', async ({ page }) => {
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    const stage = page.locator('.hero-phone-stage--laptop');
    await stage.scrollIntoViewIfNeeded();
    await expect(stage).toHaveAttribute('data-laptop-placement', 'left');
    await expect(page.getByRole('group', { name: 'موضع اللابتوب في المعاينة' })).toHaveCount(0);
    const laptop = stage.locator('[data-hero-laptop]');
    await expect(laptop).toBeVisible();
    const laptopBox = await laptop.boundingBox();
    const phoneBox = await stage.locator('[data-hero-phone]').boundingBox();
    expect(laptopBox!.x).toBeLessThan(phoneBox!.x);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test('mobile laptop base aligns with the phone base', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('sm-motion-preference', 'off'));
  for (const width of [320, 390, 600, 767]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    const stage = page.locator('.hero-phone-stage--laptop');
    await stage.scrollIntoViewIfNeeded();
    await page.waitForTimeout(250);
    const laptop = await stage.locator('[data-hero-laptop]').boundingBox();
    const phone = await stage.locator('[data-hero-phone]').boundingBox();
    expect(laptop!.x).toBeLessThan(phone!.x);
    expect(Math.abs(laptop!.y + laptop!.height - phone!.y - phone!.height)).toBeLessThanOrEqual(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test('classic lime television keeps content and interactions without preview controls', async ({ page }) => {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    const tv = page.locator('[data-hero-tv]');
    await tv.scrollIntoViewIfNeeded();
    await expect(page.getByRole('group', { name: 'اقتراحات تصميم التلفاز في المعاينة' })).toHaveCount(0);
    await expect(tv).toHaveAttribute('data-tv-design', 'lime');
    await expect(tv.locator('.hero-tv-retro-dial')).toHaveCount(2);
    await expect(tv.locator('.hero-tv-headline')).toContainText('كل ما تحب');
    await expect(tv.locator('.hero-tv-welcome-gallery img')).toHaveCount(6);
    await expect(tv.locator('[data-tv-server]')).toHaveCount(4);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const button = tv.getByRole('button');
    await button.focus();
    await button.press('Enter');
    await expect(page.locator('.hero-phone-stage')).toHaveAttribute('data-front-device', 'tv');
    await expect(button).toHaveAttribute('aria-pressed', 'true');
  }
});

test.describe('league strip player backgrounds and mobile rotation', () => {
  test.use({ viewport: { width: 390, height: 900 }, hasTouch: true, isMobile: true });

  test('uses the ticket artwork for all leagues and auto-rotates after touch', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    const strip = page.locator('[data-hero-league-strip]');
    await strip.scrollIntoViewIfNeeded();
    const { LEAGUE_TICKET_PLAYERS } = await import('../src/content/league-ticket-players');
    expect(await strip.locator('[data-crown-kind="league"]').count()).toBeGreaterThanOrEqual(8);
    for (const [league, players] of Object.entries(LEAGUE_TICKET_PLAYERS)) {
      const card = strip.locator(`[data-crown-card="${league}"]`);
      expect(await card.locator('.hs-crown-player').evaluateAll(imgs => imgs.map(img => img.getAttribute('src')))).toEqual(players);
    }
    // Touch a navigation dot: synthetic hover/focus must not leave autoplay paused.
    await selectCrownSlide(page, 2);
    const front = strip.locator('[data-crown-offset="0"]');
    const selected = await front.getAttribute('data-crown-card');
    await expect.poll(() => front.getAttribute('data-crown-card'), { timeout: 8500 }).not.toBe(selected);
    const active = await front.getAttribute('data-crown-league');
    await expect(page.locator('[data-crown-stats-league]')).toHaveAttribute('data-crown-stats-league', active!);
    await expect.poll(() => front.locator('.hs-crown-player').evaluateAll(imgs => imgs.every(img => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0))).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await strip.screenshot({ path: '/home/user/league-strip-mobile.png' });
  });

  test('respects reduced motion while keeping manual league selection', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('sm-motion-preference', 'auto'));
    await page.goto('/');
    const strip = page.locator('[data-hero-league-strip]');
    await strip.scrollIntoViewIfNeeded();
    await selectCrownSlide(page, 3);
    const selected = await strip.locator('[data-crown-offset="0"]').getAttribute('data-crown-card');
    await page.waitForTimeout(5500);
    await expect(strip.locator('[data-crown-offset="0"]')).toHaveAttribute('data-crown-card', selected!);
    await strip.locator('.hs-crown-arrow').first().tap();
    await expect(strip.locator('[data-crown-offset="0"]')).not.toHaveAttribute('data-crown-card', selected!);
  });
});

test.describe('site-wide animation preferences', () => {
  test.use({ viewport: { width: 390, height: 900 }, hasTouch: true, isMobile: true });
  test('explicit on overrides device reduction, persists and supports strip pause', async ({ page }) => {
    await page.goto('/');
    const settings = page.getByRole('combobox', { name: 'حركات الموقع' });
    await expect(settings).toHaveValue('on');
    await settings.selectOption('on');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
    const strip = page.locator('[data-hero-league-strip]');
    await strip.scrollIntoViewIfNeeded();
    const front = strip.locator('[data-crown-offset="0"]');
    let league = await front.getAttribute('data-crown-card');
    await expect.poll(() => front.getAttribute('data-crown-card'), { timeout: 8500 }).not.toBe(league);
    // A CSS effect is really enabled, not only the JS carousel.
    expect(await page.locator('.hero-title-holo__stack').first().evaluate(el => getComputedStyle(el).animationName)).not.toBe('none');
    await strip.getByRole('button', { name: 'إيقاف الشريط', exact: true }).tap();
    league = await front.getAttribute('data-crown-card');
    await page.waitForTimeout(5500);
    await expect(front).toHaveAttribute('data-crown-card', league!);
    await strip.getByRole('button', { name: 'تشغيل الشريط', exact: true }).tap();
    await expect.poll(() => front.getAttribute('data-crown-card'), { timeout: 8500 }).not.toBe(league);
    await page.reload();
    await expect(settings).toHaveValue('on');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
  });

  test('off stops CSS and carousel motion, auto returns to system preference', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    const settings = page.getByRole('combobox', { name: 'حركات الموقع' });
    await settings.selectOption('off');
    const strip = page.locator('[data-hero-league-strip]');
    await strip.scrollIntoViewIfNeeded();
    const front = strip.locator('[data-crown-offset="0"]');
    const league = await front.getAttribute('data-crown-card');
    await page.waitForTimeout(5500);
    await expect(front).toHaveAttribute('data-crown-card', league!);
    expect(await page.locator('.hero-title-holo__stack').first().evaluate(el => getComputedStyle(el).animationName)).toBe('none');
    await settings.selectOption('auto');
    await expect.poll(() => front.getAttribute('data-crown-card'), { timeout: 8500 }).not.toBe(league);
  });
});

test('crown keeps all match and league cards with league identities after match slides', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-02T10:00:00Z'));
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    const strip = page.locator('[data-hero-league-strip]');
    await strip.scrollIntoViewIfNeeded();
    await expect(strip.locator('[data-crown-kind="match"]')).toHaveCount(16);
    await expect(strip.locator('[data-crown-kind="league"]')).toHaveCount(11);
    const sequence = await strip.locator('[data-crown-card]').evaluateAll(cards => cards.map(card => ({ league: card.getAttribute('data-crown-league'), kind: card.getAttribute('data-crown-kind') })));
    const firstLeague = sequence.findIndex(slide => slide.kind === 'league');
    expect(sequence.slice(firstLeague).every(slide => slide.kind === 'league')).toBe(true);
    await expect(strip.locator('[data-crown-kind="league"] .hs-mini-trophy')).toHaveCount(11);
    await expect(strip.locator('[data-crown-kind="league"] .hs-crown-player')).toHaveCount(16);
    await expect(page.locator('.home-matches-ticket .league-ticket-body--clash')).toHaveCount(0);
    await selectCrownSlide(page, /فالنسيا.*ريال مدريد/s);
    const front = strip.locator('[data-crown-offset="0"]');
    await expect(front).toHaveAttribute('data-crown-kind', 'match');
    await expect(strip.locator('[data-crown-offset="0"]')).toHaveAttribute('data-crown-league', 'esp.1');
    await expect(front.locator('.hs-crown-match-team')).toHaveCount(2);
    await expect(front.locator('.hs-crown-match-status')).toBeVisible();
    await expect(front.locator('.hs-crown-match-brands img')).toHaveCount(4);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await strip.screenshot({ path: `/home/user/crown-matches-${width}.png` });
  }
});

test('crown match content preserves live RTL scores and scheduled countdown from the same ticket feed', async ({ page }) => {
  // يوم المباراة نفسه: الشريحة المباشرة في الدقيقة 67، ثم تُقلَّب إلى موعد قادم للعدّاد
  await page.clock.setFixedTime(new Date('2026-11-07T10:00:00Z'));
  // التدوير التلقائي يبدّل الشريحة الأمامية أثناء الفحوص: يُطفأ بتفضيل الزائر
  await page.addInitScript(() => localStorage.setItem('sm-motion-preference', 'off'));
  let scheduled = false;
  // المصدر يعكس ترتيب الفريقين (أرضه في المصدر ≠ أرض الاختيار) للتأكد أن الشريحة
  // تعرض الأسماء والنتيجة بالاتجاه الصحيح من نفس تغذية التذكرة.
  await page.route('**/scoreboard.php*', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, events: new URL(route.request().url()).searchParams.get('league') === 'esp.1' ? [{
    id: 'crown-test-valencia', date: '2026-11-07T20:00:00Z', competitions: [{
      status: { displayClock: '67′', type: { state: scheduled ? 'pre' : 'in', name: scheduled ? 'STATUS_SCHEDULED' : 'STATUS_IN_PROGRESS', completed: false } },
      competitors: [
        { homeAway: 'home', score: scheduled ? undefined : '3', team: { displayName: 'Real Madrid' } },
        { homeAway: 'away', score: scheduled ? undefined : '1', team: { displayName: 'Valencia' } },
      ],
    }],
  }] : [] }) }));
  await page.goto('/');
  const strip = page.locator('[data-hero-league-strip]');
  await selectCrownSlide(page, /فالنسيا.*ريال مدريد/s);
  const front = strip.locator('[data-crown-offset="0"]');
  // المباشر بطلب المالك: مكان سطر التفصيل عدّاد الدقائق لا نصًا صافيًا — والدقيقة
  // من displayClock نفسه، فلا يزال «٦٧» هو المقروء وإن تغيّر وعاء العرض.
  const bandClock = (await front.locator('.hs-crown-slide-band--top .league-ticket-countdown').textContent()) ?? '';
  expect(bandClock).toContain('٦٧');
  expect(await front.locator('.hs-crown-match-status').count()).toBe(0);
  await expect(front.locator('.hs-crown-match-team').first()).toContainText('ريال مدريد');
  await expect(front.locator('.hs-crown-match-team').last()).toContainText('فالنسيا');
  await expect(front.locator('.hs-crown-match-score b').first()).toHaveText('3');
  await expect(front.locator('.hs-crown-match-score b').last()).toHaveText('1');
  // بطاقات صف التذكرة مخفية بطلب المالك، وتُغطى أحداث المواجهة في اختبار الملء الشاشة
  scheduled = true;
  await page.reload();
  await selectCrownSlide(page, /فالنسيا.*ريال مدريد/s);
  await expect(front.locator('.league-ticket-countdown')).toBeVisible();
  await expect(front.locator('.hs-crown-match-score')).toHaveCount(0);
  for (const width of [320, 390, 767, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await strip.scrollIntoViewIfNeeded();
    const rows = await front.locator('.hs-crown-match').evaluate(el => {
      const box = el.getBoundingClientRect();
      const children = Array.from(el.children)
        .filter(child => !child.classList.contains('hs-crown-match-art'))
        /* الوضع الثلاثي يخفي اسم البطولة داخل الجسم (صار في الدرج العلوي) —
           عنصر مخفي لا صفّ يُرصّ، فلا يُحسب في تسلسل الصفوف. */
        .filter(child => getComputedStyle(child).display !== 'none')
        .map(child => {
        const rect = child.getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right };
      });
      return { top: box.top, bottom: box.bottom, left: box.left, right: box.right, height: box.height, children };
    });
    expect(rows.height).toBeLessThanOrEqual(168);
    for (let i = 0; i < rows.children.length; i++) {
      const row = rows.children[i];
      expect(row.top).toBeGreaterThanOrEqual(rows.top);
      expect(row.bottom).toBeLessThanOrEqual(rows.bottom);
      expect(row.left).toBeGreaterThanOrEqual(rows.left);
      expect(row.right).toBeLessThanOrEqual(rows.right);
      if (i) expect(row.top).toBeGreaterThanOrEqual(rows.children[i - 1].bottom - 1);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await strip.screenshot({ path: '/home/user/crown-countdown.png' });
});

test('crown drawer follows the match state: postponed wording, countdown above, live clock, league mark after', async ({ page }) => {
  test.setTimeout(120000);
  /* الحالات الأربع مُجهَّزة بـroute يمرّ عبر parseScoreboard نفسه (لا JSX مُحرَّف):
     الفيڈ الحي لا يضمن مؤجَّلًا ولا منتهيًا في نافذة الاختبار. الوقت مُثبَّت على
     صافرة البداية + ٦٧:٠٩ لتُقاس الثواني بلا سباق، وكل تاريخ مضبوط ليُعطي عدّادًا
     معروفًا. الانحراف المُصلَّح: «مؤجلة» كانت تُنعَت «لم تبدأ»، والدرج كان يُعيد
     نص شارته في سطر ثانٍ، والعدّاد كان يسكن الدرج السفلي. */
  await page.clock.setFixedTime(new Date('2026-11-07T20:00:00Z'));
  await page.addInitScript(() => localStorage.setItem('sm-motion-preference', 'off'));
  let mode: 'postponed' | 'scheduled' | 'live' | 'finished' = 'postponed';
  const kickoffOf = () => (mode === 'scheduled' ? '2026-11-07T22:13:41Z' : mode === 'live' ? '2026-11-07T18:52:51Z' : '2026-11-07T20:00:00Z');
  await page.route('**/scoreboard.php*', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({
    ok: true,
    events: new URL(route.request().url()).searchParams.get('league') === 'esp.1' ? [{
      id: 'crown-test-valencia', date: kickoffOf(), competitions: [{
        // الملعب من المصدر: هو ما يحل محل سطر التفصيل حين يوازي الشارة، وغيابه يعني
        // حذف السطر لا وضع شرطة بديلة.
        venue: mode === 'postponed' ? { fullName: 'المستايا' } : undefined,
        status: {
          displayClock: mode === 'live' ? '67′' : undefined,
          type: {
            state: mode === 'live' ? 'in' : 'pre',
            name: mode === 'postponed' ? 'STATUS_POSTPONED' : mode === 'finished' ? 'STATUS_FULL_TIME' : 'STATUS_SCHEDULED',
            completed: mode === 'finished',
          },
        },
        competitors: [
          { homeAway: 'home', score: mode === 'finished' ? '3' : undefined, team: { displayName: 'Real Madrid' } },
          { homeAway: 'away', score: mode === 'finished' ? '1' : undefined, team: { displayName: 'Valencia' } },
        ],
      }],
    }] : [],
  }) }));
  const strip = page.locator('[data-hero-league-strip]');
  const open = async (want: 'postponed' | 'scheduled' | 'live' | 'finished') => {
    mode = want;
    await page.goto('/');
    await selectCrownSlide(page, /فالنسيا.*ريال مدريد/s);
    const front = strip.locator('[data-crown-offset="0"]');
    return { front, band: front.locator('.hs-crown-slide-band--top'), bottom: front.locator('.hs-crown-slide-band--bottom') };
  };

  const checkBottomLayout = async (bottom: ReturnType<typeof page.locator>) => {
    for (const width of [1440, 390]) {
      const top = bottom.locator('..').locator('.hs-crown-slide-band--top');
      for (const drawer of [top, bottom]) {
        await expect(drawer).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
        await expect(drawer).toHaveCSS('background-image', 'none');
        await expect(drawer).toHaveCSS('box-shadow', 'none');
        await expect(drawer).toHaveCSS('border-top-width', '0px');
        await expect(drawer).toHaveCSS('border-bottom-width', '0px');
        // نحاكي تداخل الدرج مع جسم التذكرة لنتحقق من ترتيب الرسم فعليًا.
        const aboveCore = await drawer.evaluate(el => {
          const drawer = el as HTMLElement;
          const card = drawer.parentElement!;
          const core = card.querySelector<HTMLElement>('.hs-crown-match')!;
          const previous = drawer.getAttribute('style');
          try {
            Object.assign(drawer.style, { top: '0px', transform: 'none', pointerEvents: 'auto', opacity: '1', visibility: 'visible' });
            const rect = core.getBoundingClientRect();
            const stack = document.elementsFromPoint(rect.left + rect.width / 2, rect.top + 10);
            return stack.indexOf(drawer) >= 0 && stack.indexOf(core) > stack.indexOf(drawer);
          } finally {
            if (previous === null) drawer.removeAttribute('style');
            else drawer.setAttribute('style', previous);
          }
        });
        expect(aboveCore).toBe(true);
      }
      await page.setViewportSize({ width, height: 1000 });
      const when = bottom.locator('.hs-crown-slide-when');
      const brands = bottom.locator('.hs-crown-match-brands');
      await expect(when).toBeVisible();
      await expect(brands).toBeVisible();
      await expect(brands.locator('img')).toHaveCount(4);
      const drawerBox = (await bottom.boundingBox())!;
      const whenBox = (await when.boundingBox())!;
      const brandsBox = (await brands.boundingBox())!;
      const center = drawerBox.x + drawerBox.width / 2;
      expect(Math.abs(whenBox.x + whenBox.width / 2 - center)).toBeLessThan(2);
      expect(Math.abs(brandsBox.x + brandsBox.width / 2 - center)).toBeLessThan(2);
      expect(whenBox.y + whenBox.height).toBeLessThanOrEqual(brandsBox.y);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
  };

  const checkTopCenter = async (band: ReturnType<typeof page.locator>) => {
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      const drawer = (await band.boundingBox())!;
      const chip = (await band.locator('.hs-crown-slide-chip').boundingBox())!;
      const timer = (await band.locator('.league-ticket-countdown').boundingBox())!;
      const center = drawer.x + drawer.width / 2;
      expect(Math.abs(chip.x + chip.width / 2 - center)).toBeLessThan(2);
      expect(Math.abs(timer.x + timer.width / 2 - center)).toBeLessThan(2);
      expect(chip.y + chip.height).toBeLessThanOrEqual(timer.y);
      const league = (await band.locator('.hs-crown-slide-league').boundingBox())!;
      expect(league.y + league.height).toBeLessThanOrEqual(chip.y + 1);
      expect(timer.x).toBeGreaterThanOrEqual(drawer.x);
      expect(timer.x + timer.width).toBeLessThanOrEqual(drawer.x + drawer.width + 1);
      const groups = await band.locator('.ticket-flip__group').all();
      const boxes = await Promise.all(groups.map(group => group.boundingBox()));
      const sorted = boxes.filter((box): box is NonNullable<typeof box> => box !== null).sort((a, b) => a.x - b.x);
      for (let i = 1; i < sorted.length; i++) expect(sorted[i - 1].x + sorted[i - 1].width).toBeLessThanOrEqual(sorted[i].x + 1);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
  };

  // ١) مؤجَّلة: لفظ المصدر في الشارة، والملعب في سطر الدرج — لا «لم تبدأ» ولا ازدواج.
  {
    const { front, band, bottom } = await open('postponed');
    await expect(front).toHaveAttribute('data-crown-state', 'other');
    await expect(band.locator('.hs-crown-slide-chip')).toHaveText('مؤجلة');
    await expect(band.locator('.hs-crown-match-status')).toHaveText('المستايا');
    expect(await band.locator('.league-ticket-countdown').count()).toBe(0);
    expect(await front.locator('.hs-crown-match .hs-crown-match-status').count()).toBe(0);
    await band.screenshot({ path: '/home/user/crown-postponed-drawer.png' });
    expect(await bottom.locator('.league-ticket-countdown').count()).toBe(0);
  }

  // ٢) قبل المباراة: عدّاد البداية صعد إلى الدرج العلوي، ورحل عن السفلي بطلب المالك.
  {
    const { front, band, bottom } = await open('scheduled');
    await expect(front).toHaveAttribute('data-crown-state', 'scheduled');
    await expect(band.locator('.hs-crown-slide-chip')).toHaveText('لم تبدأ');
    await expect(band.locator('.league-ticket-countdown')).toBeVisible();
    // الظل للنص فقط؛ الدرجان يظلان شفافين بلا ظل صندوق.
    for (const drawer of [band, bottom]) {
      await expect(drawer).toHaveCSS('box-shadow', 'none');
      await expect(drawer).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    }
    await expect(band.locator('.hs-crown-slide-league')).not.toHaveCSS('text-shadow', 'none');
    await expect(bottom.locator('.hs-crown-slide-when')).not.toHaveCSS('text-shadow', 'none');
    await expect(band.locator('.ticket-flip__txt').first()).toHaveCSS('text-shadow', 'rgba(0, 0, 0, 0.45) 0px 1px 1px');
    expect(await band.locator('.ticket-flip__label').allTextContents()).toEqual(['ساعات', 'دقائق', 'ثوانٍ']);
    const clock = (await band.locator('.league-ticket-countdown').textContent()) ?? '';
    for (const part of ['٠٢', '١٣', '٤١']) expect(clock).toContain(part); // ٢:١٣:٤١ حتى الصافرة
    expect(await bottom.locator('.league-ticket-countdown').count()).toBe(0);
    expect(await band.locator('.hs-crown-match-status').count()).toBe(0); // لا نص يُعيد الشارة
    expect(await front.locator('.hs-crown-match .hs-crown-match-status').count()).toBe(0);
    // والاسم والتاريخ بقيا في موضعهما: سطر الاسم في الأعلى، و«متى» في الأسفل.
    await expect(band.locator('.hs-crown-slide-league')).toContainText('الدوري الإسباني');
    const coin = band.locator('.hs-crown-slide-league .hs-crown-league-coin');
    await expect(coin).toBeVisible();
    await expect(coin.locator('.league-carousel-badge')).toHaveCount(2);
    await expect(coin.locator('.hs-crown-league-coin-rotor')).toHaveCSS('animation-name', 'none'); // تقليل الحركة
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.evaluate(() => document.documentElement.removeAttribute('data-motion'));
    await expect(coin.locator('.hs-crown-league-coin-rotor')).toHaveCSS('animation-name', 'hs-crown-coin-turn');
    await page.evaluate(() => document.documentElement.setAttribute('data-motion', 'off'));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(bottom.locator('.hs-crown-slide-when')).toBeVisible();
    await checkBottomLayout(bottom);
    await checkTopCenter(band);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      const measurements = await band.evaluate(el => {
        const timer = el.querySelector<HTMLElement>('.league-ticket-countdown')!;
        const style = getComputedStyle(el);
        const cells = [...timer.querySelectorAll<HTMLElement>('.ticket-flip__group')].map(cell => cell.getBoundingClientRect());
        return {
          available: el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
          width: timer.getBoundingClientRect().width,
          centers: cells.map(cell => cell.x + cell.width / 2).sort((a, b) => a - b),
        };
      });
      expect(Math.abs(measurements.width - measurements.available)).toBeLessThan(2);
      const [first, middle, last] = measurements.centers;
      expect(Math.abs((middle - first) - (last - middle))).toBeLessThan(2);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await band.screenshot({ path: '/home/user/crown-topcountdown-drawer.png' });
  }

  // ٣) أثناء المباراة: دقائق وثواني بنفس تصميم العدّاد، والدقيقة من الفيڈ لا من الساعة.
  {
    const { band, bottom } = await open('live');
    await expect(band.locator('.hs-crown-slide-chip')).toHaveText('مباشر الآن');
    await expect(band.locator('.ticket-flip__label').first()).toHaveText('دقائق');
    expect(await band.locator('.ticket-flip__label').allTextContents()).toEqual(['دقائق', 'ثوانٍ']);
    const clock = (await band.locator('.league-ticket-countdown').textContent()) ?? '';
    expect(clock).toContain('٦٧'); // الدقيقة كما أرسلها المصدر
    expect(clock).toContain('٠٩'); // الثواني محلية مستقلة عن دقيقة المصدر
    expect(await band.locator('.hs-crown-match-status').count()).toBe(0);
    expect(await bottom.locator('.league-ticket-countdown').count()).toBe(0);
    await checkBottomLayout(bottom);
    await checkTopCenter(band);
    await band.screenshot({ path: '/home/user/crown-liveclock-drawer.png' });
  }

  // ٤) بعد المباراة: ماركة الدوري (شارة + اسم) في مكان السطر، والاسم لا يُطبع مرتين.
  {
    const { front, band, bottom } = await open('finished');
    await checkBottomLayout(bottom);
    await expect(front).toHaveAttribute('data-crown-state', 'finished');
    await expect(band.locator('.hs-crown-slide-chip')).toHaveText('انتهت');
    const mark = band.locator('.hs-crown-drawer-league');
    await expect(mark).toBeVisible();
    await expect(mark.locator('.hs-crown-drawer-league-name')).toHaveText('الدوري الإسباني');
    await expect(mark.locator('.hs-crown-league-coin')).toBeVisible();
    expect(await mark.locator('.league-carousel-badge').count()).toBe(2); // وجهان للعملة
    await expect(mark.locator('.hs-crown-league-coin-rotor')).toHaveCSS('animation-name', 'none');
    expect(await band.locator('.hs-crown-slide-league').count()).toBe(0); // لا تكرار للاسم
    expect(await band.locator('.league-ticket-countdown').count()).toBe(0);
    await expect(front.locator('.hs-crown-match-score b').first()).toHaveText('3');
    await band.screenshot({ path: '/home/user/crown-league-mark-drawer.png' });
  }
});

test('background crown and ticket slides pause decorative animations without hiding content', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-02T10:00:00Z'));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const strip = page.locator('[data-hero-league-strip]');
  await strip.scrollIntoViewIfNeeded();
  const hiddenBadge = strip.locator('[data-crown-kind="match"]:not([data-crown-offset="0"]) .hs-crown-match-heading').first();
  await expect(hiddenBadge).toHaveCSS('animation-play-state', 'paused');
  await selectCrownSlide(page, /فالنسيا.*ريال مدريد/s);
  await expect(strip.locator('[data-crown-offset="0"] .hs-crown-match-heading')).toHaveCSS('animation-play-state', 'running');
  await expect(strip.locator('[data-crown-kind="match"]')).toHaveCount(16);
  // بطاقات مواجهات صف التذكرة مخفية بطلب المالك: تبقى شرائح الأخبار ظاهرة بلا إخفاء للمحتوى
  await expect(page.locator('.home-matches-ticket .league-ticket-slide').first()).toBeVisible();
});


test('crown numeric counter replaces pagination dots and follows arrows', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('sm-motion-preference', 'off'));
  await page.goto('/');
  const strip = page.locator('[data-hero-league-strip]');
  await strip.scrollIntoViewIfNeeded();
  await expect(strip.locator('.hs-crown-dot')).toHaveCount(0);
  const total = await strip.locator('[data-crown-card]').count();
  await expect(strip.locator('.hs-crown-counter')).toHaveText(`1/${total}`);
  await strip.locator('.hs-crown-arrow').first().click();
  await expect(strip.locator('.hs-crown-counter')).toHaveText(`2/${total}`);
  await strip.locator('.hs-crown-arrow').last().click();
  await expect(strip.locator('.hs-crown-counter')).toHaveText(`1/${total}`);
  await strip.locator('.hs-crown-arrow').last().click();
  await expect(strip.locator('.hs-crown-counter')).toHaveText(`${total}/${total}`);
  await page.setViewportSize({ width: 320, height: 900 });
  await expect(strip.locator('.hs-crown-counter')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('mobile paint reductions remain active with animations off and preserve desktop glass', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/');
  await page.getByRole('combobox', { name: 'حركات الموقع' }).selectOption('off');
  const headerGlass = page.locator('header [class*="backdrop-blur"]').first();
  await expect(headerGlass).toHaveCSS('backdrop-filter', 'none');
  for (const selector of ['.hero-phone-dock', '.hero-phone-notification']) {
    await expect(page.locator(selector)).toHaveCSS('backdrop-filter', 'none');
  }
  await expect(page.locator('.hero-phone-orb').first()).toHaveCSS('filter', 'none');
  const stage = page.locator('.hero-phone-stage');
  await stage.scrollIntoViewIfNeeded();
  await expect(page.locator('.hero-title-holo__stack').first()).toHaveCSS('will-change', 'auto');
  await expect(page.locator('.hero-title-holo__stack').first()).toHaveCSS('transform-style', 'flat');
  await expect(page.locator('.rv.rv-in').first()).toHaveCSS('will-change', 'auto');
  const phone = page.getByRole('button', { name: 'عرض تطبيقات نموذج الهاتف', exact: true });
  await phone.click();
  await expect(phone).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(headerGlass).not.toHaveCSS('backdrop-filter', 'none');
  expect(errors).toEqual([]);
});


test('first visit defaults animations on while preserving a saved visitor preference', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const settings = page.getByRole('combobox', { name: 'حركات الموقع' });
  await expect(settings).toHaveValue('on');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
  expect(await page.locator('.hero-title-holo__stack').first().evaluate(el => getComputedStyle(el).animationName)).not.toBe('none');
  // Paint-cost savings remain active even when motion is enabled by default.
  await page.setViewportSize({ width: 390, height: 900 });
  await expect(page.locator('.hero-phone-dock')).toHaveCSS('backdrop-filter', 'none');
  for (const value of ['off', 'auto', 'on']) {
    await settings.selectOption(value);
    await page.reload();
    await expect(settings).toHaveValue(value);
    await expect(page.locator('html')).toHaveAttribute('data-motion', value);
  }
});


test('crown match cards use their league emblem as background without site branding', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-02T10:00:00Z'));
  // الشريط يطول هذا الأسبوع إلى 27 بطاقة: بلا إطفاء التدوير يتنافس النقر مع التبديل التلقائي
  await page.addInitScript(() => localStorage.setItem('sm-motion-preference', 'off'));
  await page.goto('/');
  const strip = page.locator('[data-hero-league-strip]');
  const cards = strip.locator('[data-crown-kind="match"]');
  await expect(strip.locator('.hs-crown-tint')).toHaveCSS('background-image', 'none');
  await expect(strip.locator('.hs-crown-tint')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(cards).toHaveCount(16);
  await expect(cards.locator('.league-ticket-wordmark')).toHaveCount(0);
  await expect(cards).not.toContainText(['ستريم ماستر']);
  for (const card of await cards.all()) {
    const league = await card.getAttribute('data-crown-league');
    await expect(card.locator('[data-match-league-background]')).toHaveAttribute('data-match-league-background', league!);
    await expect(card.locator('.hs-crown-match-art .league-carousel-badge')).toHaveCount(1);
    const logos: Record<string, string> = { 'esp.1': '15', 'eng.1': '23', 'ger.1': '10', 'ita.1': '12', 'fra.1': '9' };
    expect(league && logos[league], `شعار موثّق للبطولة ${league}`).toBeTruthy();
    await expect(card.locator('.hs-crown-match-art img')).toHaveAttribute('src', `https://a.espncdn.com/i/leaguelogos/soccer/500/${logos[league!]}.png`);
    expect(await card.locator('.hs-crown-match').evaluate(el => getComputedStyle(el).backgroundImage)).not.toContain('radial-gradient');
    await expect(card.locator('.hs-crown-match-team')).toHaveCount(2);
    await expect(card.locator('.hs-crown-match-brands img')).toHaveCount(4);
  }
  // تبقى صور اللاعبين والعلامة الأصلية، وتحمل كل بطاقة بطولة شعارها في الخلفية.
  await expect(page.locator('.home-matches-ticket .league-ticket-wordmark').first()).toBeAttached();
  await expect(strip.locator('[data-crown-kind="league"] .hs-crown-player')).toHaveCount(16);
  for (const card of await strip.locator('[data-crown-kind="league"]').all()) {
    const league = await card.getAttribute('data-crown-league');
    await expect(card.locator('[data-league-card-background]')).toHaveAttribute('data-league-card-background', league!);
    await expect(card.locator('.hs-crown-league-background .league-carousel-badge')).toHaveCount(1);
    expect(await card.locator('.hs-crown-card-top').evaluate(el => getComputedStyle(el).backgroundImage)).not.toContain('radial-gradient');
  }
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await selectCrownSlide(page, /فالنسيا.*ريال مدريد/s);
    await expect(strip.locator('[data-crown-offset="0"] .hs-crown-match-status')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test('league background emblems preserve source colors and load eagerly on active match slides', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-02T10:00:00Z'));
  // بلا إطفاء التدوير تنزلق الشريحة الأمامية أثناء الفحص فتُقرأ بطاقة أخرى
  await page.addInitScript(() => localStorage.setItem('sm-motion-preference', 'off'));
  // صورة اختبار ملونة لعزل حالة التحميل والتأكد من عدم تحويل ألوان الشعار للأبيض.
  await page.route('https://a.espncdn.com/i/leaguelogos/soccer/500/*', route => route.fulfill({
    contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path fill="#e32020" d="M20 10h60v55L50 95 20 65z"/></svg>',
  }));
  await page.goto('/');
  const strip = page.locator('[data-hero-league-strip]');
  for (const [league, pairing, logoId] of [
    ['esp.1', /فالنسيا.*ريال مدريد/s, '15'],
    ['eng.1', /أرسنال.*هول سيتي/s, '23'],
    ['ger.1', /ماينز.*بايرن ميونخ/s, '10'],
    ['ita.1', /روما.*ساسولو/s, '12'],
    ['fra.1', /باريس سان جيرمان.*تروا/s, '9'],
  ] as const) {
    await selectCrownSlide(page, pairing);
    const background = strip.locator(`[data-crown-offset="0"] [data-match-league-background="${league}"]`);
    const image = background.locator('img');
    await expect(image).toHaveAttribute('src', `https://a.espncdn.com/i/leaguelogos/soccer/500/${logoId}.png`);
    await expect(image).toHaveAttribute('data-loaded', 'true');
    await expect(image).toHaveAttribute('loading', 'eager');
    const filter = await image.evaluate(el => getComputedStyle(el).filter);
    expect(filter).not.toMatch(/brightness\(0\)|invert\(|grayscale\(/);
    await expect(background).toHaveCSS('opacity', '0.32');
    await expect(background.locator('.league-carousel-fallback')).toHaveCSS('visibility', 'hidden');
  }
  const originalLogo = strip.locator('[data-crown-card="eng.1"] .league-carousel-logo').first();
  await expect(originalLogo).not.toHaveCSS('filter', 'brightness(0) invert(1)');
});

test('crown previews distinctive silver League Cup and Asian Elite trophies only in the strip', async ({ page }) => {
  test.setTimeout(180000);
  await page.addInitScript(() => localStorage.setItem('sm-motion-preference', 'off'));
  await page.clock.setFixedTime(new Date('2026-11-02T10:00:00Z'));
  await page.goto('/');
  const strip = page.locator('[data-hero-league-strip]');
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const [league, cup] of [['eng.league_cup', 'league-cup'], ['afc.champions', 'elite-cup']]) {
      const keys = await strip.locator('[data-crown-card]').evaluateAll(cards => cards.map(card => card.getAttribute('data-crown-card')));
      const index = keys.indexOf(league);
      await selectCrownSlide(page, index);
      const trophy = strip.locator(`[data-crown-offset="0"] [data-crown-cup="${cup}"]`);
      await expect(trophy).toBeVisible();
      await expect(trophy).toHaveAttribute('data-trophy-metal', 'silver');
      // قسم الإحصاءات المضمّن تحت صف التذكرة مخفي بطلب المالك (#350)، فتبقى الكأس في بطاقة الشريط
      await expect(page.locator('[data-hero-league-stats]')).toHaveCount(0);
      const defs = await page.locator('[data-crown-cup] svg defs [id]').evaluateAll(els => els.map(el => el.id));
      expect(new Set(defs).size).toBe(defs.length);
      await strip.screenshot({ path: `/home/user/${cup}-${width}.png` });
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await expect(strip.locator('[data-crown-card="eng.1"] [data-trophy-variant="authentic"]')).toHaveCount(1);
});

test('crown uses the full English League Cup name and verified cup background logos', async ({ page }) => {
  test.setTimeout(120000);
  await page.clock.setFixedTime(new Date('2026-11-02T10:00:00Z'));
  await page.addInitScript(() => localStorage.setItem('sm-motion-preference', 'off'));
  // External assets are isolated in UI tests; verify the production URL and
  // loaded/fallback behaviour separately rather than claiming an external fetch.
  await page.route('https://a.espncdn.com/i/leaguelogos/soccer/500/*', route => route.fulfill({
    contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#f6f4ec"/></svg>',
  }));
  await page.goto('/');
  const strip = page.locator('[data-hero-league-strip]');
  const cupCard = strip.locator('[data-crown-card="eng.league_cup"]');
  await expect(cupCard.locator('.hs-crown-league-name')).toHaveText('كأس الرابطة الإنجليزي');
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    // مواجهتا البطولتين الفضيتين خرجتا من الشريط بطلب المالك، فتُتحقَّق الشعارات
    // الموثّقة من بطاقة البطولة نفسها: نفس المصدر ونفس طبقة الخلفية الباهتة.
    for (const [league, logo] of [['eng.league_cup', '41'], ['afc.champions', '2200']]) {
      const card = strip.locator(`[data-crown-card="${league}"]`);
      const background = card.locator(`[data-league-card-background="${league}"]`);
      const image = background.locator('img');
      await expect(image).toHaveAttribute('src', `https://a.espncdn.com/i/leaguelogos/soccer/500/${logo}.png`);
      await expect(background.locator('.league-carousel-fallback')).toHaveCSS('visibility', 'hidden');
      await expect(image).toHaveCSS('filter', 'none');
      if (league === 'eng.league_cup') {
        await expect(card.locator('.hs-crown-league-name')).toHaveText('كأس الرابطة الإنجليزي');
      }
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await expect(strip.locator('[data-crown-card="eng.league_cup"]')).toBeVisible();
});


test('cup league identity cards also show faint competition logos without replacing their trophies', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-02T10:00:00Z'));
  await page.addInitScript(() => localStorage.setItem('sm-motion-preference', 'off'));
  await page.goto('/');
  const strip = page.locator('[data-hero-league-strip]');
  await expect(strip.locator('[data-league-card-background]')).toHaveCount(2);
  for (const [league, logo] of [['eng.league_cup', '41'], ['afc.champions', '2200']]) {
    const card = strip.locator(`[data-crown-card="${league}"]`);
    const background = card.locator(`[data-league-card-background="${league}"]`);
    await expect(background.locator('img')).toHaveAttribute('src', `https://a.espncdn.com/i/leaguelogos/soccer/500/${logo}.png`);
    await expect(background).toHaveCSS('opacity', '0.24');
    await expect(card.locator('[data-crown-cup]')).toHaveCount(1);
    await expect(card.locator('.hs-crown-league-name')).not.toBeEmpty();
  }
  await expect(strip.locator('[data-crown-card="eng.1"] [data-league-card-background]')).toHaveCount(0);
});


test('home match slides remain exclusive to crown when ticket-row matches are hidden', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-02T10:00:00Z'));
  await page.addInitScript(() => localStorage.setItem('sm-motion-preference', 'off'));
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    const strip = page.locator('[data-hero-league-strip]');
    await expect(strip.locator('[data-crown-kind="match"]')).toHaveCount(16);
    await expect(page.locator('.home-matches-ticket .league-ticket-body--clash')).toHaveCount(0);
    await expect(page.locator('.home-matches-ticket .league-ticket-carousel')).toBeVisible();
    const sequence = await strip.locator('[data-crown-card]').evaluateAll(cards => cards.map(card => ({ league: card.getAttribute('data-crown-league'), kind: card.getAttribute('data-crown-kind') })));
    const firstLeague = sequence.findIndex(slide => slide.kind === 'league');
    expect(sequence.slice(firstLeague).every(slide => slide.kind === 'league')).toBe(true);
    await selectCrownSlide(page, /فالنسيا.*ريال مدريد/s);
    await expect(strip.locator('[data-crown-offset="0"]')).toHaveAttribute('data-crown-league', 'esp.1');
    await expect(strip.locator('[data-crown-offset="0"]')).toHaveAttribute('data-crown-kind', 'match');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test('crown match opens as an edge-to-edge modal above the header and restores focus on close', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-02T10:00:00Z'));
  await page.addInitScript(() => localStorage.setItem('sm-motion-preference', 'off'));
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await selectCrownSlide(page, /فالنسيا.*ريال مدريد/s);
    const card = page.locator('[data-hero-league-strip] [data-crown-offset="0"]');
    const originalUrl = page.url();
    await card.focus();
    const originalScroll = await page.evaluate(() => scrollY);
    await card.press('Enter');
    const dialog = page.getByRole('dialog', { name: /عرض المواجهة/ });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('.hs-crown-match-team')).toHaveCount(2);
    await expect(dialog.locator('.hs-crown-match-status')).toBeVisible();
    await dialog.screenshot({ path: `/home/user/crown-fullscreen-${width}.png` });
    const bounds = await dialog.boundingBox();
    expect(bounds!.x).toBe(0); expect(bounds!.y).toBe(0);
    expect(bounds!.width).toBe(width); expect(bounds!.height).toBe(900);
    expect(await page.evaluate(() => document.elementFromPoint(10, 20)?.closest('dialog') !== null)).toBe(true);
    expect(await page.evaluate(() => document.body.style.position)).toBe('fixed');
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
    expect(page.url()).toBe(originalUrl);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(card).toBeFocused();
    expect(Math.abs(await page.evaluate(() => scrollY) - originalScroll)).toBeLessThanOrEqual(2);
    await card.click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'إغلاق عرض المواجهة' }).click();
    await expect(dialog).toHaveCount(0);
    expect(await page.evaluate(() => document.body.style.position)).not.toBe('fixed');
  }
});

test('league cards open their own statistics fullscreen without navigation or fabricated cup data', async ({ page }) => {
  test.setTimeout(120000);
  await page.clock.setFixedTime(new Date('2026-11-02T10:00:00Z'));
  await page.addInitScript(() => localStorage.setItem('sm-motion-preference', 'off'));
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const strip = page.locator('[data-hero-league-strip]');
    for (const league of ['eng.1', 'eng.league_cup']) {
      const keys = await strip.locator('[data-crown-card]').evaluateAll(els => els.map(el => el.getAttribute('data-crown-card')));
      await selectCrownSlide(page, keys.indexOf(league));
      const card = strip.locator('[data-crown-offset="0"]');
      const title = await card.locator('.hs-crown-league-name').innerText();
      const leader = await card.locator('.hs-crown-leader-name').allTextContents();
      const beforeUrl = page.url();
      await card.focus();
      await card.press('Enter');
      const dialog = page.getByRole('dialog', { name: `إحصائيات بطولة ${title}` });
      await expect(dialog).toBeVisible();
      await expect(dialog.locator('[data-fullscreen-league]')).toHaveAttribute('data-fullscreen-league', league);
      await expect(dialog.getByRole('heading', { name: title, exact: true })).toBeVisible();
      await expect(dialog.locator('.hs-stats-identity')).toBeVisible();
      await expect(dialog.locator('[data-crown-wing="leader"]')).toBeVisible();
      await expect(dialog.locator('[data-crown-wing="stats"]')).toBeVisible();
      if (leader.length) {
        await expect(dialog.locator('[data-crown-wing="leader"]')).toContainText(leader[0]);
        const sourceStats = page.locator('[data-hero-league-stats]');
        for (const metric of ['best-attack', 'best-defence', 'total-goals']) {
          const source = sourceStats.locator(`[data-crown-metric="${metric}"]`);
          if (await source.count()) await expect(dialog.locator(`[data-crown-metric="${metric}"]`)).toHaveText((await source.textContent())!);
        }
      }
      if (league === 'eng.league_cup') {
        await expect(dialog.locator('[data-crown-wing="leader"]')).toContainText('غير متاحة');
        await expect(dialog.locator('dd')).toHaveCount(0);
      }
      const box = await dialog.boundingBox();
      expect(box!.x).toBe(0); expect(box!.y).toBe(0); expect(box!.width).toBe(width); expect(box!.height).toBe(900);
      expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
      expect(page.url()).toBe(beforeUrl);
      await dialog.screenshot({ path: `/home/user/crown-league-${league}-${width}.png` });
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
      await expect(card).toBeFocused();
    }
  }
});


test('inline league statistics are hidden while crown fullscreen statistics remain available', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('sm-motion-preference', 'off'));
  await page.goto('/');
  await expect(page.locator('[data-hero-league-stats]')).toHaveCount(0);
  const card = page.locator('[data-crown-card="eng.1"]');
  const keys = await page.locator('[data-hero-league-strip] [data-crown-card]').evaluateAll(els => els.map(el => el.getAttribute('data-crown-card')));
  await selectCrownSlide(page, keys.indexOf('eng.1'));
  await card.press('Enter');
  const dialog = page.getByRole('dialog', { name: /إحصائيات بطولة/ });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('[data-fullscreen-stats="eng.1"]')).toBeVisible();
  await expect(dialog.locator('.hs-stats-identity')).toBeVisible();
  await expect(dialog.locator('[data-crown-wing="leader"]')).toBeVisible();
  await expect(dialog.locator('[data-crown-wing="stats"]')).toBeVisible();
  await dialog.getByRole('button', { name: 'إغلاق إحصائيات البطولة' }).click();
  await expect(dialog).toHaveCount(0);
});

test('fullscreen league identity is transparent while both statistics wings retain their backgrounds', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('sm-motion-preference', 'off'));
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const strip = page.locator('[data-hero-league-strip]');
    const keys = await strip.locator('[data-crown-card]').evaluateAll(els => els.map(el => el.getAttribute('data-crown-card')));
    await selectCrownSlide(page, keys.indexOf('eng.1'));
    await strip.locator('[data-crown-offset="0"]').press('Enter');
    const dialog = page.getByRole('dialog', { name: /إحصائيات بطولة/ });
    const identity = dialog.locator('.hs-stats-identity');
    await expect(identity).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(identity).toHaveCSS('background-image', 'none');
    await expect(identity).toHaveCSS('box-shadow', 'none');
    await expect(identity.locator('.hs-stats-identity-title')).toBeVisible();
    await expect(identity.locator('.hs-stats-identity-trophy')).toBeVisible();
    for (const kind of ['leader', 'stats']) {
      const wing = dialog.locator(`[data-crown-wing="${kind}"]`);
      await expect(wing).toBeVisible();
      await expect(wing).toHaveCSS('background-image', 'linear-gradient(rgb(252, 251, 247) 0%, rgb(243, 239, 227) 100%)');
    }
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  }
});

test('crown order sorts confirmed live upcoming and finished matches stably', async () => {
  const { orderCrownMatches } = await import('../src/components/crown-slide-order');
  const rows = [
    null,
    { state: 'finished', date: '2026-11-01T12:00Z' },
    { state: 'scheduled', date: '2026-11-04T12:00Z' },
    { state: 'live', date: '2026-11-03T12:00Z' },
    { state: 'finished', date: '2026-11-02T12:00Z' },
    { state: 'scheduled', date: '2026-11-03T12:00Z' },
    { state: 'other', date: '2020-01-01' },
    { state: 'live', date: '2026-11-03T12:00Z' },
  ];
  expect(orderCrownMatches(rows)).toEqual([3, 7, 5, 2, 4, 1, 0, 6]);
  expect(orderCrownMatches([null, null])).toEqual([0, 1]);
  expect(orderCrownMatches([])).toEqual([]);
  expect(orderCrownMatches([{ state: 'scheduled' }, { state: 'scheduled', date: 'invalid' }])).toEqual([0, 1]);
});

test('crown preview prioritises live then upcoming then finished before all league cards', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-02T10:00:00Z'));
  await page.addInitScript(() => localStorage.setItem('sm-motion-preference', 'off'));
  const event = (id: string, home: string, away: string, state: string, date: string) => ({
    id, date, competitions: [{ date, status: { displayClock: '67′', type: { state, completed: state === 'post', name: state === 'post' ? 'STATUS_FULL_TIME' : state === 'in' ? 'STATUS_IN_PROGRESS' : 'STATUS_SCHEDULED' } },
      competitors: [{ homeAway: 'home', score: '2', team: { displayName: home } }, { homeAway: 'away', score: '1', team: { displayName: away } }],
    }],
  });
  await page.route('**/scoreboard.php*', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, events: new URL(route.request().url()).searchParams.get('league') === 'eng.1' ? [
    event('crown-live', 'Nottingham Forest', 'Manchester City', 'in', '2026-11-07T17:30:00Z'),
    event('crown-next', 'Arsenal', 'Hull City', 'pre', '2026-11-07T15:00:00Z'),
    event('crown-done', 'Leeds United', 'Tottenham Hotspur', 'post', '2026-11-07T12:30:00Z'),
  ] : [] }) }));
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    const strip = page.locator('[data-hero-league-strip]');
    await strip.scrollIntoViewIfNeeded();
    const cards = strip.locator('[data-crown-card]');
    await expect(cards.first()).toHaveAttribute('data-crown-state', 'live');
    await expect(cards.nth(1)).toHaveAttribute('data-crown-state', 'scheduled');
    await expect(cards.nth(2)).toHaveAttribute('data-crown-state', 'finished');
    await expect(strip.locator('[data-crown-kind="match"]')).toHaveCount(16);
    await expect(strip.locator('[data-crown-kind="league"]')).toHaveCount(11);
    const kinds = await cards.evaluateAll(els => els.map(el => el.getAttribute('data-crown-kind')));
    expect(kinds).toEqual([...Array(16).fill('match'), ...Array(11).fill('league')]);
    await expect(strip.locator('[data-crown-offset="0"]')).toHaveAttribute('data-crown-state', 'live');
    await strip.locator('[data-crown-offset="0"]').press('Enter');
    const dialog = page.getByRole('dialog', { name: /عرض المواجهة/ });
    await expect(dialog).toContainText('67');
    await page.keyboard.press('Escape');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test('fullscreen match shows sourced goals and cards beside the correct teams only', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-02T10:00:00Z'));
  await page.addInitScript(() => localStorage.setItem('sm-motion-preference', 'off'));
  let includeDetails = true;
  const incident = (team: string, player: string, minute: string, flag: string) => ({ team: { id: team }, athletesInvolved: [{ displayName: player }], clock: { displayValue: minute }, [flag]: true });
  await page.route('**/scoreboard.php*', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, events: new URL(route.request().url()).searchParams.get('league') === 'esp.1' ? [{
    id: 'crown-incidents', date: '2026-11-07T20:00:00Z', competitions: [{
      status: { displayClock: '67′', type: { state: 'in', completed: false, name: 'STATUS_IN_PROGRESS' } },
      competitors: [{ id: '86', homeAway: 'home', score: '1', team: { displayName: 'Real Madrid' } }, { id: '82', homeAway: 'away', score: '0', team: { displayName: 'Valencia' } }],
      ...(includeDetails ? { details: [incident('86', 'Source Scorer', "45'+2'", 'scoringPlay'), incident('86', 'Source Yellow', "53'", 'yellowCard'), incident('82', 'Source Red', "61'", 'redCard'), { scoringPlay: true, team: { id: '86' } }] } : {}),
    }],
  }] : [] }) }));
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page.locator('[data-hero-league-strip]').scrollIntoViewIfNeeded();
    const front = page.locator('[data-hero-league-strip] [data-crown-offset="0"]');
    await expect(front).toHaveAttribute('data-crown-state', 'live', { timeout: 15000 });
    await expect(front.locator('.crown-team-incidents')).toHaveCount(0);
    await front.press('Enter');
    const dialog = page.getByRole('dialog', { name: /عرض المواجهة/ });
    const teams = dialog.locator('.hs-crown-match-team');
    await expect(teams.first()).toContainText('ريال مدريد');
    await expect(teams.last()).toContainText('فالنسيا');
    await expect(teams.first().locator('[data-incident-kind="goal"]')).toContainText('Source Scorer');
    await expect(teams.first().locator('[data-incident-kind="goal"]')).toContainText("45'+2'");
    await expect(teams.first().locator('[data-incident-kind="yellow"]')).toContainText('Source Yellow');
    await expect(teams.last().locator('[data-incident-kind="red"]')).toContainText('Source Red');
    await expect(dialog.locator('.crown-team-incident')).toHaveCount(3);
    expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.keyboard.press('Escape');
  }
  includeDetails = false;
  await page.reload();
  const front = page.locator('[data-hero-league-strip] [data-crown-offset="0"]');
  await expect(front).toHaveAttribute('data-crown-state', 'live', { timeout: 15000 });
  await front.press('Enter');
  await expect(page.getByRole('dialog').locator('.crown-team-incidents')).toHaveCount(0);
});

test('weekend crown slate carries Saturday marquee fixtures and Sunday summits, hiding the 4-5 November slides', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-06T12:00:00Z'));
  await page.addInitScript(() => localStorage.setItem('sm-motion-preference', 'off'));
  await page.route('**/scoreboard.php*', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ events: [] }) }));
  await page.goto('/');
  const strip = page.locator('[data-hero-league-strip]');
  await strip.scrollIntoViewIfNeeded();
  const names = await strip.locator('[data-crown-card]').allTextContents();
  const matchNames = await strip.locator('.hs-crown-match').allTextContents();
  const weekend = [
    ['فالنسيا', 'ريال مدريد', 'الدوري الإسباني', '2026-11-07'],
    ['نوتنغهام فورست', 'مانشستر سيتي', 'الدوري الإنجليزي', '2026-11-07'],
    ['أرسنال', 'هول سيتي', 'الدوري الإنجليزي', '2026-11-07'],
    ['ليدز يونايتد', 'توتنهام هوتسبير', 'الدوري الإنجليزي', '2026-11-07'],
    ['ماينز', 'بايرن ميونخ', 'الدوري الألماني', '2026-11-07'],
    ['بوروسيا دورتموند', 'إلفرسبرج', 'الدوري الألماني', '2026-11-07'],
    ['روما', 'ساسولو', 'الدوري الإيطالي', '2026-11-07'],
    ['باريس سان جيرمان', 'تروا', 'الدوري الفرنسي', '2026-11-07'],
    ['أتلتيكو مدريد', 'برشلونة', 'الدوري الإسباني', '2026-11-08'],
    ['فيورنتينا', 'يوفنتوس', 'الدوري الإيطالي', '2026-11-08'],
    ['إنتر ميلان', 'كومو', 'الدوري الإيطالي', '2026-11-08'],
    ['نابولي', 'لاتسيو', 'الدوري الإيطالي', '2026-11-08'],
    ['مانشستر يونايتد', 'أستون فيلا', 'الدوري الإنجليزي', '2026-11-08'],
    ['كريستال بالاس', 'ليفربول', 'الدوري الإنجليزي', '2026-11-08'],
    ['سندرلاند', 'تشيلسي', 'الدوري الإنجليزي', '2026-11-08'],
    ['لانس', 'مرسيليا', 'الدوري الفرنسي', '2026-11-08'],
  ];
  for (const [home, away, league, date] of weekend) {
    const slide = matchNames.find(text => text.includes(home) && text.includes(away));
    expect(slide, `${home} × ${away}`).toBeDefined();
    expect(slide).toContain(league);
    expect(slide).toContain(date);
  }
  await expect(strip.locator('.hs-crown-match')).toHaveCount(16);
  // شرائح 4 و5 نوفمبر خرجت من الشريط بطلب المالك — يُفحص اقتران الفريقين لا اسم النادي مفرداً
  expect(names.join(' ')).not.toMatch(/بين ميلان وفرينسفاروش|بين آزد ألكمار ويوفنتوس|بين باير ليفركوزن ومرسيليا|بين أيك أثينا وريال مدريد|بين بوروسيا دورتموند وريال بيتيس|بين سندرلاند ودينامو زغرب|بين فيكينغ وصباح/);
  // وصفّ تذكرة الرئيسية تبقى بلا بطاقات مواجهات (نيوكاسل × إيفرتون مثالا)
  expect(names.join(' ')).not.toMatch(/نيوكاسل|أتلتيكو مدريد وبايرن ميونخ|مانشستر يونايتد وروما/);
  // كل شريحة تُسمّي بطولتها من مصدرها، والتوزيع كما في جدول نهاية الأسبوع
  expect(matchNames.filter(text => text.includes('الدوري الإنجليزي'))).toHaveLength(6);
  expect(matchNames.filter(text => text.includes('الدوري الإيطالي'))).toHaveLength(4);
  expect(matchNames.filter(text => text.includes('الدوري الألماني'))).toHaveLength(2);
  expect(matchNames.filter(text => text.includes('الدوري الإسباني'))).toHaveLength(2);
  expect(matchNames.filter(text => text.includes('الدوري الفرنسي'))).toHaveLength(2);
  // إخفاء المواجهات لا يخفي بطاقات البطولات: الكأسان الفضيتان والدوري الأوروبي باقون
  for (const league of ['eng.league_cup', 'afc.champions', 'uefa.europa']) {
    await expect(strip.locator(`[data-crown-card="${league}"]`)).toBeAttached();
  }
  await expect(page.locator('.hero-matches-ticket .league-ticket-clash')).toHaveCount(0);
});


test('enlarged league drawer statistics fit on narrow screens', async ({ page }) => {
  test.setTimeout(90000);
  await page.addInitScript(() => localStorage.setItem('sm-motion-preference', 'off'));
  await page.goto('/');
  const strip = page.locator('[data-hero-league-strip]');
  const keys = await strip.locator('[data-crown-card]').evaluateAll(els => els.map(el => el.getAttribute('data-crown-card')));
  await selectCrownSlide(page, keys.indexOf('eng.1'));
  const front = strip.locator('[data-crown-offset="0"]');
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const top = front.locator('.hs-crown-slide-band--top');
    const bottom = front.locator('.hs-crown-slide-band--bottom');
    const measurements = await top.evaluate(el => {
      const rect = (selector: string) => el.querySelector(selector)!.getBoundingClientRect();
      const sides = [...el.querySelectorAll('.lc-top-twin-side')].map(side => side.getBoundingClientRect()).sort((a, b) => a.x - b.x);
      return { drawer: el.getBoundingClientRect().toJSON(), duel: rect('.lc-top-twin-duel').toJSON(), goals: rect('.lc-top-twin-goals').toJSON(), sides: sides.map(side => side.toJSON()) };
    });
    expect(measurements.sides[0].right).toBeLessThanOrEqual(measurements.sides[1].left);
    expect(measurements.duel.bottom).toBeLessThanOrEqual(measurements.goals.top + 1);
    expect(measurements.goals.bottom).toBeLessThanOrEqual(measurements.drawer.bottom + 1);
    expect(await bottom.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await expect(top.locator('.lc-top-metric-val').first()).not.toHaveCSS('text-shadow', 'none');
    await expect(bottom.locator('.lc-grades-num')).not.toHaveCSS('text-shadow', 'none');
  }
});

test('crown strip uses a CSS grass pitch with visible field lines behind its cards', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('sm-motion-preference', 'off'));
  await page.goto('/');
  const shell = page.locator('.hero-crown-strip .hs-crown-shell');
  await shell.scrollIntoViewIfNeeded();

  // النمط بتدرجات CSS وحبيبات SVG، وليس صورة خارجية.
  const grass = shell.locator(':scope > .hs-crown-grass');
  await expect(grass).toHaveAttribute('aria-hidden', 'true');
  await expect(grass).toHaveCSS('pointer-events', 'none');
  await expect(grass.locator('.hs-crown-grass-grain')).toHaveCount(1);
  await expect(grass.locator('feTurbulence')).toHaveCount(1);
  const background = await shell.evaluate(el => getComputedStyle(el).backgroundImage);
  expect(background).toContain('repeating-linear-gradient(45deg');
  expect(background).toContain('linear-gradient(135deg');
  expect(background).not.toContain('url(');
  await expect(shell.locator(':scope > .hs-crown-brand')).toHaveCount(0);
  await expect(shell.locator(':scope > .hs-crown-film')).toHaveCount(0);
  await expect(shell.locator('.sm-newt35')).toHaveCount(0);

  // طبقتا الزينة: خلف المحتوى، لا تستقبلان أي مؤشر، ومخفيتان عن قارئ الشاشة
  const tint = shell.locator(':scope > .hs-crown-tint');
  const pitch = shell.locator(':scope > .hs-crown-pitch');
  await expect(tint).toHaveCount(1);
  await expect(pitch).toHaveCount(1);
  for (const layer of [tint, pitch]) {
    await expect(layer).toHaveCSS('position', 'absolute');
    await expect(layer).toHaveCSS('z-index', '0');
    await expect(layer).toHaveCSS('pointer-events', 'none');
  }
  await expect(tint).toHaveAttribute('aria-hidden', 'true');
  await expect(shell.locator(':scope > .hs-crown-center')).toHaveCSS('z-index', '1');
  for (const part of ['boundary', 'line', 'center-circle', 'area', 'goal-area', 'penalty-arc']) {
    await expect(pitch.locator(`.hs-crown-pitch-${part}`)).toHaveCount(1);
  }
  await expect(pitch.locator('.hs-crown-pitch-spots circle')).toHaveCount(3);
  await expect(pitch.locator('.hs-crown-pitch-line')).toHaveCSS('stroke', 'rgba(255, 255, 255, 0.88)');

  // التلوين هو لون هالة الشريحة النشطة نفسها (بطاقة مواجهة أو بطاقة بطولة)،
  // ومعرّف البطولة على الغلاف يرافقها. الطرفان يمرّان على نفس مُطبِّع ألوان.
  const glowOf = () =>
    shell.evaluate((el) => {
      const front = el.querySelector('[data-crown-offset="0"]') as HTMLElement;
      const norm = (value: string) => {
        const previous = el.style.color;
        el.style.color = value;
        const out = getComputedStyle(el).color;
        el.style.color = previous;
        return out;
      };
      return {
        tint: norm(getComputedStyle(el).getPropertyValue('--hs-shell-glow').trim()),
        front: norm(getComputedStyle(front).getPropertyValue('--hs-glow').trim()),
        league: el.getAttribute('data-crown-league') || '',
        card: front.getAttribute('data-crown-card') || '',
      };
    });
  const before = await glowOf();
  expect(before.tint).toMatch(/^rgba\(/);
  expect(before.front).toBe(before.tint);
  // بطاقة البطولة على الغلاف هي مفتاح الشريحة الأمامية (المباريات تُرمَّز «الدوري:فريق:فريق:تاريخ»)
  expect(before.card === before.league || before.card.startsWith(`${before.league}:`)).toBe(true);

  // بعد التبديل يبقى التلوين ملتصقاً بالشريحة الأمامية الجديدة
  await shell.locator('.hs-crown-arrow').first().click();
  await page.waitForTimeout(900);
  const after = await glowOf();
  expect(after.front).toBe(after.tint);
  expect(after.card === after.league || after.card.startsWith(`${after.league}:`)).toBe(true);

  // خطوط الملعب لا تتحرك إلا بمقدار يد الزائر: السحب يبدأ من منطقة البطاقات
  // نفسها (|dx| > 8 بكسل)، وقيمته محصورة في ±48 بكسل.
  const center = shell.locator(".hs-crown-center");
  const centerBox = await center.boundingBox();
  expect(centerBox).not.toBeNull();
  const idle = await pitch.evaluate((el) => getComputedStyle(el).transform);
  expect(idle).toBe("matrix(1, 0, 0, 1, 0, 0)");
  await page.mouse.move(centerBox!.x + centerBox!.width / 2, centerBox!.y + centerBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(centerBox!.x + centerBox!.width / 2 - 120, centerBox!.y + centerBox!.height / 2, {
    steps: 12,
  });
  await expect
    .poll(async () => await pitch.evaluate((el) => getComputedStyle(el).transform), { timeout: 4000 })
    .not.toBe(idle);
  // الإزاحة معاكسة للسحب ومحصورة في ±48 → أدنى قيمة ممكنة -48px
  // الإزاحة معاكسة للسحب وأصغر منها (×0.4) ومحصورة في ±48 → 19.2px
  expect(await pitch.evaluate((el) => getComputedStyle(el).transform)).toBe("matrix(1, 0, 0, 1, 19.2, 0)");
  await page.mouse.up();

  // الطبقة المتمدّدة خارج الإطار لا تسبّب أي تجاوز أفقي
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
});

test('crown strip slides carry the reference-sized three parts, open only while in front', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('sm-motion-preference', 'off'));

  /* القياس المرجعي: شرائح «أسفل التذكرة» في صفحة مواعيد المباريات — المنسدلة
     العلوية والجسم والسفلية. الشريط لازم يطابق نفس المقاسات، لا نسخة مصغّرة. */
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/matches/');
  await page.waitForSelector('.league-carousel-item[data-ring-pos="front"]', { timeout: 20000 });
  await page.waitForTimeout(900);
  // المرجع يُقاس من بطاقة المقدمة نفسها: البطاقات الجانبية أدراجها مغلقة
  const ref = await page.evaluate(() => {
    const front = document.querySelector('.league-carousel-item[data-ring-pos="front"]') as HTMLElement;
    const h = (sel: string) => Math.round((front.querySelector(sel) as HTMLElement).getBoundingClientRect().height);
    return { top: h('.lc-top-drawer'), outline: h('.lc-outline'), detail: h('.lc-detail') };
  });
  expect(ref.top).toBeGreaterThan(100);
  expect(ref.detail).toBeGreaterThan(60);

  const parts = async (width: number) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    const shell = page.locator('.hero-crown-strip .hs-crown-shell');
    await shell.scrollIntoViewIfNeeded();
    await page.waitForTimeout(700);
    return { shell, front: shell.locator('[data-crown-offset="0"]') };
  };

  const { shell, front } = await parts(1440);

  /* كل الشرائح تحمل القطع الثلاث، لا الأمامية وحدها */
  const counter = (await shell.locator('.hs-crown-counter').textContent()) || '';
  const total = Number(counter.split('/')[1]);
  expect(total).toBeGreaterThan(10);
  await expect(shell.locator('.hs-crown-card .hs-crown-slide-band')).toHaveCount(total * 2);
  const cards = await shell.locator('.hs-crown-card').all();
  expect(cards.length).toBe(total);
  for (const card of cards) {
    await expect(card.locator('.hs-crown-slide-band--top')).toHaveCount(1);
    await expect(card.locator('.hs-crown-slide-band--bottom')).toHaveCount(1);
  }

  /* المقاسات = مقاسات بطاقة المقدمة المرجعية. الدرج السفلي وحده يُسمح له
     أن يزيد: المرجع نفسه يطوّله بسطر «نقاط/م · هجوم/م» عند توفّر المعدّلات،
     فمداه [+12، −3]. العلوي والجسم مطابقان. */
  const sizes = (locator: ReturnType<typeof shell.locator>) => locator.evaluate((el: Element) => {
    const H = (sel: string) => Math.round((el.querySelector(sel) as HTMLElement).getBoundingClientRect().height);
    const card = el.getBoundingClientRect();
    const top = (el.querySelector('.hs-crown-slide-band--top') as HTMLElement).getBoundingClientRect();
    const bottom = (el.querySelector('.hs-crown-slide-band--bottom') as HTMLElement).getBoundingClientRect();
    return {
      top: H('.hs-crown-slide-band--top'), bottom: H('.hs-crown-slide-band--bottom'), core: H('.hs-crown-match, .hs-crown-card-top'),
      peekTop: Math.round(top.bottom - card.top), peekBottom: Math.round(card.bottom - bottom.top),
      spill: Array.from(el.querySelectorAll<HTMLElement>('.hs-crown-slide-band')).reduce(
        (n, b) => n
          + Math.max(0, b.scrollHeight - b.clientHeight)
          + Math.max(0, b.scrollWidth - b.clientWidth)
          /* كل سطر داخل الدرج يُقاس وحده: بتر «الدوري الإسبا…» لم يكن ليُرى
             لو قِسنا الدرج كأب فقط */
          + Array.from(b.querySelectorAll<HTMLElement>('*'))
            .reduce((k, t) => k + (t.clientWidth > 0 && t.scrollWidth > t.clientWidth + 1 ? 1 : 0), 0),
        0),
    };
  });
  const onDesk = await sizes(front);
  expect(Math.abs(onDesk.top - ref.top)).toBeLessThanOrEqual(3);
  expect(onDesk.bottom).toBeGreaterThanOrEqual(ref.detail - 3);
  expect(onDesk.bottom).toBeLessThanOrEqual(ref.detail + 12);
  expect(Math.abs(onDesk.core - ref.outline)).toBeLessThanOrEqual(8);
  // الدرجان يبرز 18px داخل الكارت فقط، كما في المرجع
  expect(onDesk.peekTop).toBeLessThanOrEqual(20);
  expect(onDesk.peekBottom).toBeLessThanOrEqual(20);
  expect(onDesk.spill).toBe(0);

  /* ولا درج يلامس صفّ التحكّم تحت الشريحة — الحجز محسوب من البروز لا من الحشو */
  const drawerClear = await front.evaluate(el => {
    const card = el.closest('.hs-crown-shell')!.querySelector('.hs-crown-card[data-crown-offset=\"0\"]') as HTMLElement;
    const b = (card.querySelector('.hs-crown-slide-band--bottom') as HTMLElement).getBoundingClientRect();
    const c = (el.closest('.hs-crown-shell')!.querySelector('.hs-crown-controls') as HTMLElement).getBoundingClientRect();
    return { gap: Math.round(c.top - b.bottom), cardClips: getComputedStyle(card).overflow };
  });
  expect(drawerClear.gap).toBeGreaterThanOrEqual(0);
  // الكرت نفسه لا يقصّ: لو رجع overflow:hidden بطل الدرج يبان (علة صُحّحت)
  expect(drawerClear.cardClips).not.toBe('hidden');

  /* لا درج يُقصّه إطار الشريط: الحشو الداخلي يحجز مساحة المرجعين كاملة */
  const shellBox = await shell.boundingBox();
  for (const sel of ['.hs-crown-slide-band--top', '.hs-crown-slide-band--bottom']) {
    const b = await front.locator(sel).boundingBox();
    expect(b!.y).toBeGreaterThanOrEqual(shellBox!.y - 1);
    expect(b!.y + b!.height).toBeLessThanOrEqual(shellBox!.y + shellBox!.height + 1);
  }

  /* الفتح على الشريحة الأمامية، والقفل لما تمرّ — وبياناتها ترجع لجسمها */
  const key = await front.getAttribute('data-crown-card');
  expect(await front.locator('.hs-crown-slide-band--top').evaluate(el => getComputedStyle(el).visibility)).toBe('visible');
  expect(await front.locator('.hs-crown-slide-band--top').evaluate(el => getComputedStyle(el).opacity)).toBe('1');
  /* الشارة تسكن الدرج دائمًا. سطر التفصيل اختيارٌ مش فرض: حين لا يقول شيئًا
     غير الشارة يُحذف، فالمعيار الحقيقي هو «لا ازدواج» — لا «يوجد سطر». */
  const chip = front.locator('.hs-crown-slide-band--top .hs-crown-slide-chip');
  const chipText = (await chip.count()) ? (await chip.textContent())?.trim() ?? '' : '';
  if (chipText) {
    expect(((await front.locator('.hs-crown-slide-band--top').textContent()) ?? '')).toContain(chipText);
    const bandStatus = front.locator('.hs-crown-slide-band--top .hs-crown-match-status');
    if (await bandStatus.count()) {
      expect((await bandStatus.textContent())?.trim()).not.toBe(chipText);
    }
    // لا نسخة من السطر في الجسم أثناء الفتح — النقل وليس التكرار.
    expect(await front.locator('.hs-crown-match .hs-crown-match-status').count()).toBe(0);
  }
  expect(await front.locator('.hs-crown-slide-band--top .lc-top-drawer-crown, .hs-crown-slide-band--top [data-stat-metric], .hs-crown-slide-band--top .lc-grades-box').count()).toBeGreaterThan(0);
  await shell.locator('.hs-crown-arrow').first().click();
  await page.waitForTimeout(900);
  const passed = shell.locator(`.hs-crown-card[data-crown-card="${key}"]`);
  await expect(passed).toHaveCount(1);
  expect(await passed.locator('.hs-crown-slide-band--top').evaluate(el => getComputedStyle(el).visibility)).toBe('hidden');
  expect(await passed.locator('.hs-crown-slide-band--top').evaluate(el => getComputedStyle(el).opacity)).toBe('0');
  // الشريحة اللي مرّت تحتفظ بجسمها الكامل: الاسم وسطر الحالة رجعا لجوه
  expect(await passed.locator('.hs-crown-match .hs-crown-match-status').count()).toBe(1);
  expect(await passed.locator('.hs-crown-match .hs-crown-match-heading').evaluate(el => getComputedStyle(el).display)).not.toBe('none');
  // الجديدة صارت أمامية ومفتوحة
  const next = shell.locator('[data-crown-offset="0"]');
  expect(await next.locator('.hs-crown-slide-band--top').evaluate(el => getComputedStyle(el).visibility)).toBe('visible');

  /* الموبايل: نفس البنية بمقاسات الموبايل المرجعية، من غير بتر ولا تجاوز أفقي */
  const onPhone = await sizes((await parts(390)).front);
  expect(onPhone.top).toBeGreaterThanOrEqual(100);
  expect(onPhone.bottom).toBeGreaterThanOrEqual(70);
  expect(onPhone.core).toBeGreaterThanOrEqual(120);
  expect(onPhone.spill).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
});

test('crown drawer tabs open source standings, stats and the selected match', async ({ page }) => {
  test.setTimeout(90000);
  await page.addInitScript(() => localStorage.setItem('sm-motion-preference', 'off'));
  await page.goto('/');
  const strip = page.locator('[data-hero-league-strip]');
  const tabs = strip.locator('.hs-crown-tabs');
  await expect(tabs.locator('button .hs-crown-tab-icon[aria-hidden="true"]')).toHaveCount(4);
  const keys = await strip.locator('[data-crown-card]').evaluateAll(els => els.map(el => el.getAttribute('data-crown-card')));
  await selectCrownSlide(page, keys.indexOf('eng.1'));
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const bounds = await tabs.boundingBox();
    const line = await strip.locator('[data-crown-offset="0"] .hs-crown-slide-band--top .lc-top-drawer-crown').boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(line!.y + 2);
    const buttons = await tabs.locator('button').all();
    const boxes = (await Promise.all(buttons.map(button => button.boundingBox()))).filter((b): b is NonNullable<typeof b> => !!b).sort((a,b) => a.x-b.x);
    for (let i=1; i<boxes.length; i++) expect(boxes[i-1].x + boxes[i-1].width).toBeLessThanOrEqual(boxes[i].x + 1);
  }
  await tabs.getByRole('button', { name: 'المباراة' }).click();
  let dialog = page.getByRole('dialog', { name: /المباراة -/ });
  await expect(dialog).toContainText('لا توجد مباراة محددة لهذه البطاقة');
  await dialog.getByRole('button', { name: 'إغلاق المباراة' }).click();
  await expect(tabs.getByRole('button', { name: 'المباراة' })).toBeFocused();
  await tabs.getByRole('button', { name: 'جدول الترتيب' }).click();
  dialog = page.getByRole('dialog', { name: /جدول ترتيب/ });
  await expect(dialog.locator('tbody tr')).not.toHaveCount(0);
  await expect(dialog.locator('.crown-standings-source')).toContainText('ESPN');
  await dialog.getByRole('button', { name: 'إغلاق جدول الترتيب' }).click();
  await tabs.getByRole('button', { name: 'إحصائيات' }).click();
  dialog = page.getByRole('dialog', { name: /إحصائيات بطولة/ });
  await expect(dialog.locator('[data-crown-wing="stats"]')).toBeVisible();
  await page.keyboard.press('Escape');
  await selectCrownSlide(page, /فالنسيا.*ريال مدريد/s);
  await tabs.getByRole('button', { name: 'المباراة' }).click();
  await expect(page.getByRole('dialog', { name: /عرض المواجهة/ })).toBeVisible();
});

test('news tab moves the existing home ticket into the crown and back', async ({ page }) => {
  test.setTimeout(90000);
  await page.clock.setFixedTime(new Date('2026-11-08T12:00:00Z'));
  await page.addInitScript(() => localStorage.setItem('sm-motion-preference', 'off'));
  await page.goto('/');
  const strip = page.locator('[data-hero-league-strip]');
  const ticket = page.locator('[data-home-news-ticket]');
  await expect(ticket).toHaveCount(1);
  await expect(page.locator('.hero-ticket-row [data-home-news-ticket]')).toBeVisible();
  const initialHrefs = await ticket.locator('.league-ticket-slide a[href*="/news/"]').evaluateAll(els => els.map(el => el.getAttribute('href')));
  expect(initialHrefs.length).toBeGreaterThan(0);
  const selected = await strip.locator('[data-crown-offset="0"]').getAttribute('data-crown-card');
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await strip.getByRole('button', { name: 'الأخبار', exact: true }).click();
    await expect(ticket).toHaveCount(1);
    await expect(strip.locator('[data-home-news-ticket]')).toBeVisible();
    await expect(strip.locator('.hs-crown-grass')).toBeHidden();
    await expect(strip.locator('.hs-crown-pitch')).toBeHidden();
    await expect(strip.locator('.hs-crown-shell')).toHaveCSS('background-image', 'none');
    await expect(page.locator('.hero-ticket-row [data-home-news-ticket]')).toHaveCount(0);
    expect(await ticket.locator('.league-ticket-slide a[href*="/news/"]').evaluateAll(els => els.map(el => el.getAttribute('href')))).toEqual(initialHrefs);
    await expect(strip.getByRole('button', { name: 'العودة إلى البطولات' })).toBeFocused();
    const panel = strip.locator('.hs-crown-news-panel');
    const panelBox = (await panel.boundingBox())!;
    expect(panelBox.x).toBeGreaterThanOrEqual(0);
    expect(panelBox.x + panelBox.width).toBeLessThanOrEqual(width);
    const dots = ticket.locator('.league-ticket-dot');
    if (await dots.count() > 1) {
      const first = await dots.evaluateAll(els => els.findIndex(el => el.getAttribute('aria-pressed') === 'true'));
      await panel.getByRole('button', { name: 'الخبر التالي' }).click();
      expect(await dots.evaluateAll(els => els.findIndex(el => el.getAttribute('aria-pressed') === 'true'))).not.toBe(first);
    }
    await strip.getByRole('button', { name: 'العودة إلى البطولات' }).click();
    await expect(page.locator('.hero-ticket-row [data-home-news-ticket]')).toBeVisible();
    await expect(strip.locator('.hs-crown-pitch')).toBeVisible();
    await expect(strip.locator('.hs-crown-grass')).toBeVisible();
    await expect(strip.locator('.hs-crown-shell')).not.toHaveCSS('background-image', 'none');
    await expect(strip.locator('[data-crown-offset="0"]')).toHaveAttribute('data-crown-card', selected!);
    await expect(strip.getByRole('button', { name: 'الأخبار', exact: true })).toBeFocused();
  }
});
