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
  for (const width of [320, 390, 600, 767]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    const stage = page.locator('.hero-phone-stage');
    await stage.scrollIntoViewIfNeeded();
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
