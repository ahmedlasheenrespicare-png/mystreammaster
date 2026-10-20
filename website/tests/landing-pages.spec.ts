import { test, expect, type Page } from '@playwright/test';

/* ==========================================================================
   اختبارات صفحات هبوط البطولات والمنتخبات
   --------------------------------------------------------------------------
   البيانات أدناه بيانات اختبار فقط (fixtures) — لا تُنشر ولا تمثّل مباريات حقيقية.
   ========================================================================== */

test.use({ serviceWorkers: 'block' });

const NOW = new Date('2026-10-13T12:00:00Z');

function event(id: string, date: string, homeName: string, awayName: string, state = 'pre', score = '0') {
  return {
    id,
    date,
    competitions: [{
      competitors: [
        { homeAway: 'home', score, team: { displayName: homeName } },
        { homeAway: 'away', score: '0', team: { displayName: awayName } },
      ],
      status: {
        displayClock: "67′",
        type: { state, completed: state === 'post', name: state === 'in' ? 'STATUS_IN_PROGRESS' : state === 'post' ? 'STATUS_FULL_TIME' : 'STATUS_SCHEDULED' },
      },
    }],
  };
}

async function mockSource(page: Page, eventsByLeague: Record<string, unknown[]>) {
  await page.clock.install({ time: NOW });
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (['localhost', '127.0.0.1'].includes(url.hostname) && url.pathname === '/scoreboard.php') {
      const league = url.searchParams.get('league') || '';
      return route.fulfill({
        status: 200,
        headers: { 'X-Matches-Cache': 'HIT', 'X-Cache-Age': '5', 'X-Diagnostic-Code': 'OK' },
        json: { events: eventsByLeague[league] ?? [] },
      });
    }
    return ['localhost', '127.0.0.1'].includes(url.hostname) ? route.continue() : route.abort();
  });
}

test('league landing page: static guide, live table, official broadcasters and FAQ', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await mockSource(page, {
    'eng.1': [event('1', '2026-10-13T16:00:00Z', 'Arsenal', 'Chelsea'), event('2', '2026-10-13T18:30:00Z', 'Liverpool', 'Everton', 'post', '2')],
  });
  await page.goto('/matches/الدوري-الإنجليزي/');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('مباريات الدوري الإنجليزي');
  /* مسار التصفح الظاهر */
  const crumb = page.locator('nav[aria-label="مسار التصفح"]');
  await expect(crumb).toContainText('الرئيسية');
  await expect(crumb).toContainText('مواعيد المباريات');
  await expect(crumb).toContainText('مباريات الدوري الإنجليزي');

  /* الجدول الحيّ — بيانات الاختبار فقط */
  await expect(page.locator('.match-card')).toHaveCount(2);
  await expect(page.locator('.match-card').first()).toContainText('Arsenal');

  /* الناقل الرسمي + التنويه + الخدمة المعتمدة */
  await expect(page.locator('#broadcasters-title')).toContainText('القنوات الناقلة رسمياً');
  await expect(page.getByText('beIN SPORTS', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('حقوق البث تختلف بحسب الدولة', { exact: false }).first()).toBeVisible();
  await expect(page.locator('.landing-service').getByText('الموقع لا يستضيف المحتوى', { exact: false })).toBeVisible();

  /* الأسئلة ظاهرة فعلاً (مطابقة لـ FAQPage) */
  await expect(page.locator('.landing-faq details')).toHaveCount(4);

  /* لا عبارات ملكية أو وعود مخالفة */
  const body = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
  for (const forbidden of ['سيرفرنا', 'سيرفراتنا', 'قنواتنا', 'شاهد كل المباريات', 'بث مباشر مجان']) {
    expect(body, forbidden).not.toContain(forbidden);
  }
  expect(errors).toEqual([]);
});

test('team landing page: group facts, team-filtered live table and official broadcaster', async ({ page }) => {
  await mockSource(page, {
    'fifa.friendly': [
      event('1', '2026-10-13T16:00:00Z', 'Egypt', 'Brazil'),
      event('2', '2026-10-13T18:00:00Z', 'Germany', 'France'),
    ],
    'fifa.worldq.caf': [event('3', '2026-10-13T20:00:00Z', 'Tunisia', 'Morocco')],
  });
  await page.goto('/world-cup-2026/مصر/');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('مباريات منتخب مصر وتوقيتاتها');
  /* المجموعة من مقال المنتخبات العربية — بلا مواعيد مونديال مكتوبة */
  await expect(page.locator('#world-cup-group-title')).toBeVisible();
  await expect(page.getByText('المجموعة السابعة', { exact: false }).first()).toBeVisible();
  await expect(page.getByText('بلجيكا، إيران، نيوزيلندا', { exact: false }).first()).toBeVisible();

  /* اللوحة تفلتر باسم المنتخب: مباراة مصر فقط، بلا ألمانيا/فرنسا ولا تونس/المغرب */
  await expect(page.locator('.match-card')).toHaveCount(1);
  await expect(page.locator('.match-card')).toContainText('Egypt');

  await expect(page.getByText('FIFA+', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('الملخصات والأهداف', { exact: false }).first()).toBeVisible();

  const body = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
  for (const forbidden of ['سيرفرنا', 'سيرفراتنا', 'قنواتنا', 'مشاهدة مجان', 'بث مباشر مجان']) {
    expect(body, forbidden).not.toContain(forbidden);
  }
});

const WIDTHS = [320, 390, 768, 1440];
for (const width of WIDTHS) {
  test(`landing pages stay within the viewport at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await mockSource(page, { 'eng.1': [] });
    for (const url of ['/matches/الدوري-الإنجليزي/', '/world-cup-2026/المغرب/']) {
      await page.goto(url);
      const [inner, scroll] = await page.evaluate(() => [innerWidth, document.documentElement.scrollWidth]);
      expect(scroll, url).toBeLessThanOrEqual(inner + 1);
    }
  });
}

/* أيقونة البطولة داخل كرت التذكرة في رأس صفحة الهبوط — الشعار من الخريطة
   الموثّقة نفسها (LEAGUE_ICONS) التي يغرف منها شريط /matches/، والكرت تذكرة
   هولوغرافية مقتبسة من uiverse.io/dexter-st/slippery-bird-76 (MIT) مكیّفة
   لكرة القدم. الفحص بنيوي لا يعتمد نجاح تحميل الصورة: بيئة الاختبار تحجب
   الشبكة الخارجية، فالمطلوب عناصر التذكرة + الرابط الصحيح + بديل الكأس تحت
   الشعار + alt="" الزخرفية + تحميل فوري فوق الطية بأبعاد صريحة. */
const HERO_ICONS: ReadonlyArray<readonly [url: string, icon: string]> = [
  ['/matches/دوري-أبطال-أوروبا/', 'https://a.espncdn.com/i/leaguelogos/soccer/500/2.png'],
  ['/matches/الدوري-الإنجليزي/', 'https://a.espncdn.com/i/leaguelogos/soccer/500/23.png'],
  ['/matches/الدوري-الإسباني/', 'https://a.espncdn.com/i/leaguelogos/soccer/500/15.png'],
  ['/matches/الدوري-الألماني/', 'https://a.espncdn.com/i/leaguelogos/soccer/500/10.png'],
  ['/matches/الدوري-الإيطالي/', 'https://a.espncdn.com/i/leaguelogos/soccer/500/12.png'],
  ['/matches/الدوري-الفرنسي/', 'https://a.espncdn.com/i/leaguelogos/soccer/500/9.png'],
  /* السعودي: الشعار يُحلّ بمعرّف المباريات sau.1 — لا معرّف الترتيب ksa.1 */
  ['/matches/الدوري-السعودي/', 'https://a.espncdn.com/i/leaguelogos/soccer/500/2488.png'],
];

test('league landing heroes carry the ticket card with the league icon beside the h1', async ({ page }) => {
  await mockSource(page, {});
  for (const [url, icon] of HERO_ICONS) {
    await page.goto(url);
    /* التذكرة عنصر واحد زخرفي بالكامل — اسم البطولة مكتوب في h1 بجانبها */
    const ticket = page.locator('.matches-hero-title .league-ticket');
    await expect(ticket, url).toHaveCount(1);
    await expect(ticket, url).toHaveAttribute('aria-hidden', 'true');
    /* عناصر شكل التذكرة: اللوح الداكن بنقطة الضوء والشعاع (بلا باركود ولا رمز تقني) */
    await expect(ticket.locator('.league-ticket-bg.league-ticket-holographic'), url).toHaveCount(1);
    await expect(ticket.locator('.league-ticket-symbol'), url).toHaveCount(1);
    /* الكرت يملأ عرض حاوية الرأس كاملاً (تفاوت ≤1px) وبارتفاع ثابت صريح (265px) */
    const heroTitle = page.locator('.matches-hero-title');
    const [ticketBox, titleBox] = await Promise.all([ticket.boundingBox(), heroTitle.boundingBox()]);
    expect(ticketBox, url).not.toBeNull();
    expect(titleBox, url).not.toBeNull();
    expect(Math.abs(ticketBox!.width - titleBox!.width), url).toBeLessThanOrEqual(1);
    await expect(ticket, url).toHaveCSS('height', '265px');
    /* التذكرة والعنوان في حاوية الرأس — العنوان لم يتكرر ولم يخرج من الرأس */
    await expect(page.locator('.matches-hero-title h1#landing-title'), url).toHaveCount(1);

    /* الأيقونة داخل رأس التذكرة: مكوّن الشارة نفسه بمقاس أكبر (60px) يصل
       عبر --league-badge-size إلى لوح الشريط — نفس الخلفية بنمط واحد */
    const badge = ticket.locator('.league-ticket-header .league-carousel-badge');
    await expect(badge, url).toHaveCount(1);
    await expect(badge, url).toHaveCSS('width', '60px');
    await expect(badge, url).toHaveCSS('height', '60px');
    await expect(badge, url).toHaveCSS('background-color', 'rgb(246, 244, 236)');

    const image = badge.locator('img.league-carousel-logo');
    await expect(image, url).toHaveCount(1);
    await expect(image, url).toHaveAttribute('src', icon);
    await expect(image, url).toHaveAttribute('alt', '');
    /* فوق الطية: eager لا lazy، وأبعاد صريحة تمنع قفز التخطيط */
    await expect(image, url).toHaveAttribute('loading', 'eager');
    await expect(image, url).toHaveAttribute('decoding', 'async');
    await expect(image, url).toHaveAttribute('width', '52');
    await expect(image, url).toHaveAttribute('height', '52');
    /* البديل المحايد مرسوم تحت الشعار — يظهر وحده إن تعذّر التحميل */
    await expect(badge.locator('.league-carousel-fallback'), url).toHaveCount(1);
  }
});

test('Egyptian league hero shows the neutral trophy fallback with no image', async ({ page }) => {
  await mockSource(page, {});
  await page.goto('/matches/الدوري-المصري/');
  const ticket = page.locator('.matches-hero-title .league-ticket');
  await expect(ticket).toHaveCount(1);
  const badge = ticket.locator('.league-ticket-header .league-carousel-badge');
  await expect(badge).toHaveCount(1);
  await expect(badge.locator('.league-carousel-fallback')).toBeVisible();
  await expect(badge.locator('img')).toHaveCount(0);
});

test('team landing pages carry no league ticket or badge at all', async ({ page }) => {
  await mockSource(page, {});
  for (const url of ['/world-cup-2026/مصر/', '/world-cup-2026/المغرب/']) {
    await page.goto(url);
    await expect(page.locator('.league-ticket'), url).toHaveCount(0);
    await expect(page.locator('.league-carousel-badge'), url).toHaveCount(0);
    await expect(page.locator('.matches-hero-title'), url).toHaveCount(0);
  }
});

test('league hero hides h1 visually and hides intro while /matches/ and team landings keep both visible', async ({ page }) => {
  await mockSource(page, {});

  await page.goto('/matches/الدوري-الإنجليزي/');
  const leagueH1 = page.locator('h1#landing-title');
  await expect(leagueH1).toHaveCount(1);
  await expect(leagueH1).toHaveClass(/\bvisually-hidden\b/);
  await expect(leagueH1).toHaveCSS('width', '1px');
  await expect(leagueH1).toHaveCSS('height', '1px');
  await expect(leagueH1).toHaveCSS('clip-path', 'inset(50%)');
  const leagueH1Box = await leagueH1.boundingBox();
  expect(leagueH1Box?.width).toBeLessThanOrEqual(1);
  expect(leagueH1Box?.height).toBeLessThanOrEqual(1);
  await expect(page.getByRole('heading', { level: 1, name: 'مباريات الدوري الإنجليزي' })).toHaveCount(1);
  await expect(page.locator('section.matches-page')).toHaveAccessibleName('مباريات الدوري الإنجليزي');
  await expect(page.locator('.matches-intro')).toHaveCount(1);
  await expect(page.locator('.matches-intro')).toBeHidden();

  for (const url of ['/matches/', '/world-cup-2026/المغرب/']) {
    await page.goto(url);
    const heroH1 = page.locator('.matches-hero h1');
    await expect(heroH1, url).toHaveCount(1);
    await expect(heroH1, url).toBeVisible();
    await expect(heroH1, url).not.toHaveClass(/\bvisually-hidden\b/);
    const heroH1Box = await heroH1.boundingBox();
    expect(heroH1Box!.height, url).toBeGreaterThan(20);
    await expect(page.locator('.matches-intro'), url).toBeVisible();
  }
});

test('FAQ items are keyboard operable', async ({ page }) => {
  await mockSource(page, {});
  await page.goto('/matches/الدوري-السعودي/');
  const first = page.locator('.landing-faq details').first();
  await expect(first).not.toHaveAttribute('open', '');
  const summary = first.locator('summary');
  await summary.focus();
  await page.keyboard.press('Enter');
  await expect(first).toHaveAttribute('open', '');
  await page.keyboard.press('Enter');
  await expect(first).not.toHaveAttribute('open', '');
});

test('header dropdown navigates to Arabic-slug landing pages (SPA + direct)', async ({ page }) => {
  await page.goto('/');
  const nav = page.locator('header nav').first();
  const trigger = nav.getByRole('button', { name: 'المباريات', exact: true });
  await trigger.click();
  await page.locator('#nav-panel-matches').getByRole('link', { name: /مباريات الدوري السعودي/ }).click();
  await expect(page).toHaveURL(/\/matches\//);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('مباريات الدوري السعودي');
});

test('all eleven landing pages respond with unique titles and one h1', async ({ request }) => {
  const urls = [
    '/matches/الدوري-الإنجليزي/', '/matches/دوري-أبطال-أوروبا/', '/matches/الدوري-السعودي/',
    '/world-cup-2026/المغرب/', '/world-cup-2026/مصر/', '/world-cup-2026/الجزائر/', '/world-cup-2026/تونس/',
    '/world-cup-2026/السعودية/', '/world-cup-2026/قطر/', '/world-cup-2026/العراق/', '/world-cup-2026/الأردن/',
  ];
  const titles = new Set<string>();
  for (const url of urls) {
    const res = await request.get(encodeURI(url));
    expect(res.status(), url).toBe(200);
    const html = await res.text();
    const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]?.replace(/\s+/g, ' ').trim();
    expect(title, url).toBeTruthy();
    expect(titles.has(title!), `${url}: title مكرر`).toBe(false);
    titles.add(title!);
    expect([...html.matchAll(/<h1\b/gi)].length, url).toBe(1);
  }
});

test('hub pages link to their cluster pages', async ({ page }) => {
  await mockSource(page, {});
  await page.goto('/matches/');
  for (const href of ['/matches/الدوري-الإنجليزي/', '/matches/دوري-أبطال-أوروبا/', '/matches/الدوري-السعودي/']) {
    await expect(page.locator(`.matches-league-links a[href="${href}"]`), href).toHaveCount(1);
  }
  await page.goto('/world-cup-2026/');
  for (const slug of ['المغرب', 'مصر', 'الجزائر', 'تونس', 'السعودية', 'قطر', 'العراق', 'الأردن']) {
    await expect(page.locator(`main a[href="/world-cup-2026/${slug}/"]`), slug).toHaveCount(1);
  }
});

test('attack & defence rates card: responsive 4/2/1 layout, no truncation, and collapsible table', async ({ page }) => {
  const unexpectedExternalRequests: string[] = [];

  await page.clock.install({ time: NOW });
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (!['localhost', '127.0.0.1'].includes(url.hostname)) {
      /* شعار البطولة في الرأس (LEAGUE_ICONS) وشعارات الفرق في بطاقة المعدلات
         (leader-logo.mjs: teamlogos من ESPN، وHighlightly للدوري المصري) أصول
         صور موثّقة ومقصودة من مخازن مزوّدي البيانات أنفسهم — ليست طلبات بيانات
         خارجية مفاجئة (تُبتر الشبكة هنا فتتحول الشارة لدورع المونوغرام تلقائياً) */
      const isLeagueIcon = /^https:\/\/a\.espncdn\.com\/i\/leaguelogos\//.test(url.href);
      const isTeamCrest = /^https:\/\/a\.espncdn\.com\/i\/teamlogos\//.test(url.href)
        || /^https:\/\/highlightly\.net\/soccer\/images\/teams\//.test(url.href);
      if (!/googletagmanager\.com|googlesyndication\.com/.test(url.hostname) && !isLeagueIcon && !isTeamCrest) {
        unexpectedExternalRequests.push(url.href);
      }
      return route.abort();
    }
    if (url.pathname === '/scoreboard.php') {
      return route.fulfill({
        status: 200,
        headers: { 'X-Matches-Cache': 'HIT', 'X-Cache-Age': '5', 'X-Diagnostic-Code': 'OK' },
        json: { events: [] },
      });
    }
    return route.continue();
  });

  // 1) Desktop 1440px: 4 cards in one row
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/matches/الدوري-الإنجليزي/');
  const ratesCard = page.locator('[data-standings-rates="eng.1"]');
  await expect(ratesCard).toBeVisible();
  await expect(ratesCard.locator('h3')).toHaveText('الهجوم والدفاع — معدلات أهداف الموسم');
  await expect(ratesCard.locator('[data-rate-card="best-attack"] [data-rate-team-name]')).toHaveText(['Brighton & Hove Albion']);
  await expect(ratesCard.locator('[data-rate-card="best-attack"] [data-rate-value]')).toHaveText('3.00');
  await expect(ratesCard.locator('[data-rate-card="best-defence"] [data-rate-team]')).toHaveCount(4);

  /* الشارة الأولى لشباك المتعادل تحمل المركز وإجمالي الأهداف والمباريات —
     والاسم كاملاً بلا قصّ (لا ellipsis ولا تمرير أفقي داخل الشارة) */
  const bestAttackTeam = ratesCard.locator('[data-rate-card="best-attack"] [data-rate-team]').first();
  await expect(bestAttackTeam.locator('[data-rate-team-rank]')).toHaveText('#3');
  await expect(bestAttackTeam.locator('[data-rate-team-goals]')).toHaveText(/18 هدفاً/);
  await expect(bestAttackTeam.locator('[data-rate-team-mp]')).toHaveText(/6 مباريات/);
  const nameNotClipped = await bestAttackTeam.evaluate(el => el.scrollWidth <= el.clientWidth + 1);
  expect(nameNotClipped).toBe(true);

  /* الرقم الرئيسي بمحاذاة رقمية + شارة مقارنة بمتوسط الدوري (179 ÷ 122 = 1.4672…) */
  const heroStyle = await ratesCard.locator('[data-rate-card="best-attack"] [data-rate-value]').evaluate(el =>
    getComputedStyle(el).fontVariantNumeric,
  );
  expect(heroStyle).toContain('tabular-nums');
  await expect(ratesCard.locator('[data-rate-card="best-attack"] [data-rate-delta]')).toContainText('+1.53');
  await expect(ratesCard.locator('[data-rate-card="best-defence"] [data-rate-delta]')).toContainText('-0.63');
  await expect(ratesCard.locator('[data-rate-card="best-attack"] [data-rate-sample]')).toContainText('18 هدفاً في 6 مباريات');
  await expect(ratesCard.locator('[data-rate-bench]')).toHaveCount(4);
  await expect(ratesCard.locator('[data-rate-bench-avg]')).toHaveCount(4);

  /* شريط الملخص التحليلي للمسابقة: 4 مؤشرات مرسومة مسبقاً */
  await expect(ratesCard.locator('[data-rates-kpis] [data-rates-kpi]')).toHaveCount(4);
  await expect(ratesCard.locator('[data-rates-kpi="total-goals"]')).toContainText('179');
  await expect(ratesCard.locator('[data-rates-kpi="avg-per-team"]')).toContainText('1.47');
  await expect(ratesCard.locator('[data-rates-kpi="top-gd-per-match"]')).toContainText('+2.17');
  await expect(ratesCard.locator('[data-rates-kpi="top-gd-per-match"]')).toContainText('Brighton & Hove Albion');
  await expect(ratesCard.locator('[data-rates-kpi="top-ppm"]')).toContainText('3.00');
  await expect(ratesCard.locator('[data-rates-kpi="top-ppm"]')).toContainText('Manchester City');

  const desktopTops = await ratesCard.locator('[data-rate-card]').evaluateAll(els =>
    els.map(el => Math.round(el.getBoundingClientRect().top)),
  );
  expect(new Set(desktopTops).size).toBe(1);

  // 2) Tablet 768px: 2 cards per row (2 rows)
  await page.setViewportSize({ width: 768, height: 1000 });
  const tabletTops = await ratesCard.locator('[data-rate-card]').evaluateAll(els =>
    els.map(el => Math.round(el.getBoundingClientRect().top)),
  );
  expect(new Set(tabletTops).size).toBe(2);

  // 3) Mobile 390px: 1 card per row (4 rows) and no badge truncation
  await page.setViewportSize({ width: 390, height: 1000 });
  const mobileTops = await ratesCard.locator('[data-rate-card]').evaluateAll(els =>
    els.map(el => Math.round(el.getBoundingClientRect().top)),
  );
  expect(new Set(mobileTops).size).toBe(4);
  const badgeTruncated = await ratesCard.locator('[data-rate-team]').evaluateAll(els =>
    els.some(el => el.scrollWidth > el.clientWidth + 1),
  );
  expect(badgeTruncated).toBe(false);

  // 4) Collapsible <details> section («عرض معدلات جميع الفرق»)
  const details = ratesCard.locator('details[data-rates-details]');
  await expect(details).not.toHaveAttribute('open', '');
  await details.locator('summary').click();
  await expect(details).toHaveAttribute('open', '');
  const rows = details.locator('tbody tr[data-rate-row]');
  await expect(rows).toHaveCount(20);

  /* الجدول التحليلي: أعمدة MP/GF/GA/GD + معدلات مع Mini Bar + تصنيف تكتيكي */
  await expect(details.locator('[data-rate-sort]')).toHaveCount(9);
  await expect(details.locator('[data-rate-tactic]')).toHaveCount(20);
  await expect(details.locator('[data-rate-tactic="elite-balanced"]')).not.toHaveCount(0);
  await expect(details.locator('.ls-minibar')).not.toHaveCount(0);

  /* الفرز: أقوى هجوماً أولاً (Brighton 3.00)، ثم عكس الاتجاه (Tottenham 0.50) */
  const attackSort = details.locator('[data-rate-sort="attack"]');
  await attackSort.click();
  await expect(attackSort).toHaveText(/هجوم\/م/);
  await expect(details.locator('th[aria-sort="descending"] [data-rate-sort="attack"]')).toHaveCount(1);
  await expect(rows.first().locator('.ls-an-name')).toHaveText('Brighton & Hove Albion');
  await attackSort.click();
  await expect(details.locator('th[aria-sort="ascending"] [data-rate-sort="attack"]')).toHaveCount(1);
  await expect(rows.first().locator('.ls-an-name')).toHaveText('Tottenham Hotspur');

  /* الفرز حسب نقاط/م: Manchester City (3.00) في الصدارة */
  await details.locator('[data-rate-sort="ppm"]').click();
  await expect(rows.first().locator('.ls-an-name')).toHaveText('Manchester City');
  expect(unexpectedExternalRequests).toEqual([]);
});

test('attack & defence rates card: analyst summary uses league-wide totals, sample size and tactics chip semantics', async ({ page }) => {
  await page.clock.install({ time: NOW });
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (!['localhost', '127.0.0.1'].includes(url.hostname)) return route.abort();
    if (url.pathname === '/scoreboard.php') {
      return route.fulfill({ status: 200, json: { events: [] } });
    }
    return route.continue();
  });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/matches/الدوري-الإنجليزي/');
  const ratesCard = page.locator('[data-standings-rates="eng.1"]');
  await expect(ratesCard).toBeVisible();

  /* التصنيف التكتيكي: كل شريحة من الأربعة مبنية على مقارنة بمتوسط الدوري (179÷122) */
  const tacticCounts: Record<string, number> = {};
  for (const code of ['elite-balanced', 'offensive', 'defensive', 'struggling', 'na']) {
    tacticCounts[code] = await ratesCard.locator(`[data-rate-tactic="${code}"]`).count();
  }
  expect(tacticCounts.na).toBe(0, 'جدول كامل لا يُنتج تصنيفاً «غير متاح»');
  expect(tacticCounts['elite-balanced'] + tacticCounts.offensive + tacticCounts.defensive + tacticCounts.struggling).toBe(20);

  /* شريط المعيار المرجعي: امتداد التعبئة ≤ 100% وعلامة المتوسط ضمن المسار */
  const benchGeometry = await ratesCard.locator('[data-rate-bench]').evaluateAll(els =>
    els.map(el => {
      const fill = el.querySelector('[data-rate-bench-fill]') as HTMLElement;
      const avg = el.querySelector('[data-rate-bench-avg]') as HTMLElement;
      const track = el.querySelector('.ls-rate-bench-track') as HTMLElement;
      const fillWidth = parseFloat(fill.style.width);
      const avgLeft = parseFloat(avg.style.insetInlineStart);
      return {
        fillValid: Number.isFinite(fillWidth) && fillWidth >= 0 && fillWidth <= 100.001,
        avgValid: Number.isFinite(avgLeft) && avgLeft >= 0 && avgLeft <= 100.001,
        trackVisible: track.getBoundingClientRect().width > 0,
      };
    }),
  );
  expect(benchGeometry.every(g => g.fillValid && g.avgValid && g.trackVisible)).toBe(true);

  /* الأرشيف المحلي لـ eng.1 موجود (49 مباراة) → عمود الشباك النظيفة يظهر لكل فريق */
  await expect(ratesCard.locator('[data-rate-clean-sheets]')).toHaveCount(20);
});

test('attack & defence rates card updates reactively when /standings.php returns fresh standings', async ({ page }) => {
  const entries = Array.from({ length: 20 }, (_, idx) => ({
    rank: idx + 1,
    teamId: idx === 0 ? '359' : String(1000 + idx),
    name: idx === 0 ? 'Arsenal' : `Club ${idx + 1}`,
    played: 5,
    wins: idx === 0 ? 5 : 2,
    draws: 0,
    losses: idx === 0 ? 0 : 3,
    goalsFor: idx === 0 ? 20 : 5,
    goalsAgainst: idx === 0 ? 1 : 6,
    goalDifference: idx === 0 ? 19 : -1,
    points: idx === 0 ? 15 : 6,
  }));

  await page.clock.install({ time: NOW });
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (!['localhost', '127.0.0.1'].includes(url.hostname)) return route.abort();
    if (url.pathname === '/scoreboard.php') {
      return route.fulfill({
        status: 200,
        headers: { 'X-Matches-Cache': 'HIT', 'X-Cache-Age': '5', 'X-Diagnostic-Code': 'OK' },
        json: { events: [] },
      });
    }
    if (url.pathname === '/standings.php') {
      return route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        json: {
          ok: true,
          provider: 'ESPN',
          league: 'eng.1',
          phase: 'league',
          season: 2026,
          seasonDisplay: '2026-27',
          fetchedAt: '2026-10-17T15:00:00Z',
          stale: false,
          entries,
        },
      });
    }
    return route.continue();
  });

  await page.goto('/matches/الدوري-الإنجليزي/');
  const ratesCard = page.locator('[data-standings-rates="eng.1"]');
  await expect(ratesCard.locator('[data-rate-card="best-attack"] [data-rate-value]')).toHaveText('4.00');
  await expect(ratesCard.locator('[data-rate-card="best-attack"] [data-rate-team-name]')).toHaveText(['Arsenal']);
  await expect(ratesCard.locator('[data-rate-card="best-defence"] [data-rate-value]')).toHaveText('0.20');
  await expect(ratesCard.locator('[data-rates-stale-badge]')).toBeHidden();

  /* المشتقات تُعاد حسابها من القراءة الجديدة:
     متوسط الدوري = (20 + 19×5) ÷ (20×5) = 115 ÷ 100 = 1.15 */
  await expect(ratesCard.locator('[data-rate-card="best-attack"] [data-rate-delta]')).toContainText('+2.85');
  await expect(ratesCard.locator('[data-rate-card="best-defence"] [data-rate-delta]')).toContainText('-0.95');
  await expect(ratesCard.locator('[data-rate-card="best-attack"] [data-rate-sample]')).toContainText('20 هدفاً في 5 مباريات');
  await expect(ratesCard.locator('[data-rates-kpi="total-goals"]')).toContainText('115');
  await expect(ratesCard.locator('[data-rates-kpi="avg-per-team"]')).toContainText('1.15');
  await expect(ratesCard.locator('[data-rates-kpi="top-gd-per-match"]')).toContainText('+3.80');
  await expect(ratesCard.locator('[data-rates-kpi="top-gd-per-match"]')).toContainText('Arsenal');
  await expect(ratesCard.locator('[data-rates-kpi="top-ppm"]')).toContainText('3.00');
  /* Arsenal: هجوم 4.00 > 1.15 ودفاع 0.20 < 1.15 → متوازن النخبة */
  const arsenalTactic = ratesCard
    .locator('tr[data-rate-row="359"]')
    .locator('[data-rate-tactic]');
  await expect(arsenalTactic).toHaveAttribute('data-rate-tactic', 'elite-balanced');
  await expect(arsenalTactic).toHaveText('متوازن النخبة');
});
