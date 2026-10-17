import { test, expect, type Page } from '@playwright/test';

/* ==========================================================================
   اختبارات صفحات هبوط البطولات والمنتخبات
   --------------------------------------------------------------------------
   البيانات أدناه بيانات اختبار فقط (fixtures) — لا تُنشر ولا تمثّل مباريات حقيقية.
   ========================================================================== */

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
  await expect(page.getByText('الموقع لا يستضيف المحتوى', { exact: false }).first()).toBeVisible();

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
  const trigger = nav.getByRole('button', { name: 'البطولات والمنتخبات', exact: true });
  await trigger.click();
  await page.locator('#nav-panel-tournaments').getByRole('link', { name: /مباريات الدوري السعودي/ }).click();
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
      if (!/googletagmanager\.com|googlesyndication\.com/.test(url.hostname)) {
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
  await expect(ratesCard.locator('[data-rate-card="best-attack"] [data-rate-team]')).toHaveText(['Brighton & Hove Albion']);
  await expect(ratesCard.locator('[data-rate-card="best-attack"] [data-rate-value]')).toHaveText('3.00');
  await expect(ratesCard.locator('[data-rate-card="best-defence"] [data-rate-team]')).toHaveCount(4);

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
  await expect(details.locator('tbody tr')).toHaveCount(20);
  expect(unexpectedExternalRequests).toEqual([]);
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
  await expect(ratesCard.locator('[data-rate-card="best-attack"] [data-rate-team]')).toHaveText(['Arsenal']);
  await expect(ratesCard.locator('[data-rate-card="best-defence"] [data-rate-value]')).toHaveText('0.20');
  await expect(ratesCard.locator('[data-rates-stale-badge]')).toBeHidden();
});
