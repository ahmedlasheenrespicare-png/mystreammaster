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

  /* شريط الكروت المتحرك (uiverse jolly-snail-62 المكيَّف): شريط واحد يرتب
     المباريات من الأقرب موعداً إلى الأبعد، وكل كرت بعناصر القالب كاملة
     (خطّ التقدّم النقطي، لوح النتيجة/الموعد، العلامة المائية) */
  await expect(page.locator('.match-race')).toHaveCount(1);
  await expect(page.locator('.match-card .match-dots')).toHaveCount(2);
  await expect(page.locator('.match-card .match-score')).toHaveCount(2);
  await expect(page.locator('.match-card .match-watermark')).toHaveCount(2);
  /* الترتيب: الأقرب موعداً أولاً (١٦:٠٠ أرسنال قبل ١٨:٣٠ ليفربول) */
  await expect(page.locator('.match-card').nth(1)).toContainText('Liverpool');

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

test('race strip: navigation arrows scroll the cards and verified match ids link to their match center', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  /* أربع مباريات في يوم الرياض الحالي → الشريط يفيض فتعمل الأسهم.
     المباراة الثالثة تحمل معرّف ESPN موثّقاً في عقد مراكز المباريات
     (مانشستر سيتي ضد إيبسويتش) → كرتها رابط، والبقية بلا مراكز. */
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh' }).format(new Date());
  const ev = (id: string, time: string, home: string, away: string, state = 'pre', score = '0') => ({
    id, date: `${day}T${time}:00Z`,
    competitions: [{ competitors: [
      { homeAway: 'home', score, team: { displayName: home } },
      { homeAway: 'away', score: '0', team: { displayName: away } },
    ], status: { displayClock: state === 'in' ? "67′" : '', type: { state, completed: state === 'post', name: state === 'in' ? 'STATUS_IN_PROGRESS' : state === 'post' ? 'STATUS_FULL_TIME' : 'STATUS_SCHEDULED' } } }],
  });
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (['localhost', '127.0.0.1'].includes(url.hostname) && url.pathname === '/scoreboard.php') {
      return route.fulfill({
        status: 200,
        headers: { 'X-Matches-Cache': 'HIT', 'X-Cache-Age': '5', 'X-Diagnostic-Code': 'OK' },
        json: { events: [
          ev('x1', '08:00', 'Arsenal', 'Chelsea'),
          ev('x2', '10:00', 'Liverpool', 'Everton'),
          ev('401879259', '12:00', 'Manchester City', 'Ipswich Town', 'in', '1'),
          ev('x4', '14:00', 'Tottenham Hotspur', 'Brighton & Hove Albion', 'post', '2'),
        ] },
      });
    }
    return ['localhost', '127.0.0.1'].includes(url.hostname) ? route.continue() : route.abort();
  });
  await page.goto('/matches/الدوري-الإنجليزي/');
  await page.waitForSelector('.match-card', { timeout: 15000 });

  /* اسم البطولة فوق الشريط مخفي بصرياً — يبقى في المحتوى للوصولية */
  await expect(page.locator('.match-league > header h3.visually-hidden')).toHaveCount(1);
  /* السطر التمهيدي للهيرو مخفي بصرياً */
  await expect(page.locator('.matches-eyebrow.visually-hidden')).toHaveCount(1);
  /* شريط الأدوات: الحالة وزر التحديث مخفيان — والمنطقة الزمنية باقية */
  await expect(page.locator('.matches-toolbar .matches-status.visually-hidden')).toHaveCount(1);
  await expect(page.locator('.matches-refresh')).toBeHidden();
  await expect(page.locator('.matches-toolbar select')).toBeVisible();

  /* حاوية التجميع (uiverse calm-bobcat-35 مكيَّفاً): هيكل الساعة وزجاجه
     فقط — التاج وزر الإجراء والسواران أُزيلت بطلب صريح */
  await expect(page.locator('.match-race-shell')).toHaveCount(1);
  await expect(page.locator('.match-race-crown')).toHaveCount(0);
  await expect(page.locator('.match-race-trigger')).toHaveCount(0);
  await expect(page.locator('.match-race-strap')).toHaveCount(0);
  /* بلا تمرير أفقي للصفحة رغم الأجزاء البارزة من التجميع */
  await expect(page.locator('.match-league').first()).toBeVisible();

  /* السهمان: زران بأدوار واضحة، والأبعد يحرّك الشريط فعلاً */
  await expect(page.locator('.match-race-nav-btn')).toHaveCount(2);
  const race = page.locator('.match-race');
  const before = await race.evaluate(el => Math.abs(el.scrollLeft));
  await page.getByRole('button', { name: 'انتقل إلى المباريات الأبعد موعداً' }).click();
  await page.waitForTimeout(700);
  const after = await race.evaluate(el => Math.abs(el.scrollLeft));
  expect(after, 'سهم «الأبعد» يحرّك الشريط').toBeGreaterThan(before);
  await page.getByRole('button', { name: 'انتقل إلى المباريات الأقرب موعداً' }).click();

  /* الربط بمعرّف المصدر فقط: كرت واحد رابط إلى مركزه، والبقية كروت عادية */
  const linked = page.locator('a.match-card');
  await expect(linked).toHaveCount(1);
  await expect(linked).toHaveAttribute('href', '/matches/الدوري-الإنجليزي/manchester-city-ipswich-town/');
  await expect(linked).toContainText('Manchester City');
  await expect(page.locator('.match-card:not(a)')).toHaveCount(3);
  await expect(page.locator('.match-center-chip')).toHaveCount(1);

  /* الضغط على الكرت يوصل فعلاً إلى صفحة مركز المباراة (المتصفح يرمّز
     الجزء العربي من المسار — نطابق المقطع اللاتيني الفريد ثم بعد فك الترميز) */
  await linked.click();
  await expect(page).toHaveURL(/manchester-city-ipswich-town\/$/);
  expect(decodeURIComponent(page.url())).toContain('/matches/الدوري-الإنجليزي/manchester-city-ipswich-town/');
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
    /* تذكرة البطولة عنصر واحد زخرفي بالكامل — اسم البطولة مكتوب في h1
       بجانبها. منصة المنزلقتين (بنية الكلاسيكو المعمّمة) تضيف شريحة
       «مواجهة الليلة» بنفس صنف الأساس داخل المسار نفسه، فنستثنيها من
       عدّ تذكرة البطولة ببادئة league-ticket--match */
    const ticket = page.locator('.matches-hero-title .league-ticket:not(.league-ticket--match)');
    await expect(ticket, url).toHaveCount(1);
    /* الزخرفية في البنيتين: التذكرة المباشرة تحمل aria-hidden ذاتها،
       وفي منصة المنزلقتين تحمِلها المسارة المحيطة (وراثة كاملة) */
    await expect(
      page.locator('.matches-hero-title .league-ticket[aria-hidden="true"], .matches-hero-title .league-ticket-track[aria-hidden="true"]'),
      url,
    ).toHaveCount(1);
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

/* شرائح المواجهات في تذاكر البطولات (الأبطال + الإسباني وأي تذكرة
   قادمة): النتيجة تُرسم بنفس اتجاه كرت صفحة المواعيد (RTL وراثة
   الصفحة) — رقم المضيف يلاصق جانب فريقه الحقيقي، لا LTR مفروض يقلب
   الرقمين. المرجعية: باريس (مضيف) 4×2 برشلونة، وريال (مضيف) 3×1
   برشلونة — قياس مواضع الحروف الفعلية */
const clashScoreCases: ReadonlyArray<{
  url: string;
  league: string;
  eyebrow: string;
  slideIndex: number;
  dots: number;
  home: string;
  away: string;
  homeName: string;
  awayName: string;
  homeScore: string;
  awayScore: string;
}> = [
  {
    url: '/matches/دوري-أبطال-أوروبا/',
    league: 'uefa.champions',
    eyebrow: 'قمة الجولة',
    slideIndex: 1,
    dots: 3,
    home: 'Paris Saint-Germain',
    away: 'Barcelona',
    homeName: 'باريس',
    awayName: 'برشلونة',
    homeScore: '4',
    awayScore: '2',
  },
  {
    /* الشريحة الثالثة: مباراة الليلة — بايرن (كين) × أرسنال (ساكا) */
    url: '/matches/دوري-أبطال-أوروبا/',
    league: 'uefa.champions',
    eyebrow: 'مباراة الليلة',
    slideIndex: 2,
    dots: 3,
    home: 'Bayern München',
    away: 'Arsenal',
    homeName: 'بايرن',
    awayName: 'أرسنال',
    homeScore: '2',
    awayScore: '1',
  },
  {
    url: '/matches/الدوري-الإسباني/',
    league: 'esp.1',
    eyebrow: 'مواجهة الكلاسيكو',
    slideIndex: 1,
    dots: 2,
    home: 'Real Madrid',
    away: 'Barcelona',
    homeName: 'ريال مدريد',
    awayName: 'برشلونة',
    homeScore: '3',
    awayScore: '1',
  },
  {
    /* الشريحة الثانية لتذكرة الإنجليزي: قمة الجولة — تشيلسي (بالمر) × توتنهام (مرموش) */
    url: '/matches/الدوري-الإنجليزي/',
    league: 'eng.1',
    eyebrow: 'قمة الجولة',
    slideIndex: 1,
    dots: 3,
    home: 'Chelsea',
    away: 'Tottenham Hotspur',
    homeName: 'تشيلسي',
    awayName: 'توتنهام',
    homeScore: '3',
    awayScore: '2',
  },
  {
    /* الشريحة الثالثة لتذكرة الإنجليزي: قمة الجولة الثانية — أرسنال (رايس) × إيفرتون (غريليش) */
    url: '/matches/الدوري-الإنجليزي/',
    league: 'eng.1',
    eyebrow: 'قمة الجولة',
    slideIndex: 2,
    dots: 3,
    home: 'Arsenal',
    away: 'Everton',
    homeName: 'أرسنال',
    awayName: 'إيفرتون',
    homeScore: '2',
    awayScore: '0',
  },
];
for (const c of clashScoreCases) {
  test(`${c.league} ticket clash slide ${c.eyebrow} #${c.slideIndex} renders the score rtl like the schedule card, home number beside house team`, async ({ page }) => {
    await mockSource(page, {
      [c.league]: [{
        id: `${c.league}-clash`,
        date: '2026-10-13T19:00:00Z',
        competitions: [{
          competitors: [
            { homeAway: 'home', score: c.homeScore, team: { displayName: c.home } },
            { homeAway: 'away', score: c.awayScore, team: { displayName: c.away } },
          ],
          status: { displayClock: '90', type: { state: 'post', completed: true, name: 'STATUS_FULL_TIME' } },
        }],
      }],
    });
    await page.goto(c.url);
    /* عدد النقاط = شرائح التذكرة (أساسية + كل المواجهات المعروفة للبطولة) */
    await expect(page.locator('.league-ticket-dot'), `${c.league} dots`).toHaveCount(c.dots);
    const slide = page.locator('.league-ticket-slide').nth(c.slideIndex);
    await expect(slide.locator('.league-ticket-eyebrow')).toHaveText(c.eyebrow);
    const goals = slide.locator('.league-ticket-goals');
    await expect(goals).toBeVisible();
    await expect(goals).toHaveText(new RegExp(`${c.homeScore}\\s*:\\s*${c.awayScore}`));
    /* الاتجاه وراثة عربية (rtl) لا ltr مفروض — خاصية كرت المواعيد نفسها */
    const dir = await goals.evaluate(el => getComputedStyle(el).direction);
    expect(dir).toBe('rtl');
    /* المضيف (بلوحته ESPn) يمين شبكة التذكرة — ورقمه يمين النقطتين — مطابقاً لقياس كرت /matches/ */
    const layout = await slide.evaluate(root => {
      const strong = root.querySelector('.league-ticket-goals')!;
      const rects: { ch: string; x: number }[] = [];
      const walk = document.createTreeWalker(strong, NodeFilter.SHOW_TEXT);
      let node: Node | null;
      while ((node = walk.nextNode())) {
        const text = node.textContent ?? '';
        for (let i = 0; i < text.length; i++) {
          const range = document.createRange();
          range.setStart(node, i);
          range.setEnd(node, i + 1);
          const r = range.getBoundingClientRect();
          if (r.width > 0) rects.push({ ch: text[i], x: r.x });
        }
      }
      const first = rects.find(r => r.ch.trim());
      const colon = rects.find(r => r.ch === ':');
      /* آخر حرف ظاهر في السطر — في RTL بعد النقطتين مباشرةً هو رقم الضيف */
      const last = [...rects].reverse().find(r => r.ch.trim());
      const teamXs = [...root.querySelectorAll('.league-ticket-clash-team')].map(t => ({
        name: (t as HTMLElement).textContent?.trim() ?? '',
        x: (t as HTMLElement).getBoundingClientRect().x,
      }));
      return { firstX: first?.x ?? -1, colonX: colon?.x ?? -1, lastX: last?.x ?? -1, teamXs };
    });
    const homeT = layout.teamXs.find(t => t.name.includes(c.homeName));
    const awayT = layout.teamXs.find(t => t.name.includes(c.awayName));
    expect(homeT, c.homeName).toBeTruthy();
    expect(awayT, c.awayName).toBeTruthy();
    expect(homeT!.x).toBeGreaterThan(awayT!.x);
    /* الرقم الأول (المضيف) يمين النقطتين؛ الأخير (الضيف) يسارها */
    expect(layout.firstX).toBeGreaterThan(layout.colonX);
    expect(layout.lastX).toBeLessThan(layout.colonX);
  });
}

/* ── التذكرة الجامعة في صفحة «مواعيد المباريات» الآن منزلقة: الأساسية
     + خمس شرائح قمم بخصائصها الحيّة كما في تذاكر بطولاتها (قمتا
     الأبطال + كلاسيكو الإسباني + قمتا الإنجليزي)، بجلب منفصل لكل بطولة ── */
const indexClashMock = (id: string, dateIso: string, home: string, away: string, homeScore: string, awayScore: string) => ({
  id,
  date: dateIso,
  competitions: [{
    competitors: [
      { homeAway: 'home', score: homeScore, team: { displayName: home } },
      { homeAway: 'away', score: awayScore, team: { displayName: away } },
    ],
    status: { displayClock: '90', type: { state: 'post', completed: true, name: 'STATUS_FULL_TIME' } },
  }],
});

test('matches index ticket hosts the five clash slides with their league features', async ({ page }) => {
  await mockSource(page, {
    'uefa.champions': [
      indexClashMock('ucl-psg-bar', '2026-10-13T19:00:00Z', 'Paris Saint-Germain', 'Barcelona', '4', '2'),
      indexClashMock('ucl-bay-ars', '2026-10-13T20:00:00Z', 'Bayern München', 'Arsenal', '2', '1'),
    ],
    'esp.1': [indexClashMock('esp-real-bar', '2026-10-13T18:30:00Z', 'Real Madrid', 'Barcelona', '3', '1')],
    'eng.1': [
      indexClashMock('eng-che-tot', '2026-10-13T16:30:00Z', 'Chelsea', 'Tottenham Hotspur', '3', '2'),
      indexClashMock('eng-ars-eve', '2026-10-13T15:00:00Z', 'Arsenal', 'Everton', '2', '0'),
    ],
  });
  await page.goto('/matches/');
  /* ست نقاط: الأساسية + القمم الخمس */
  await expect(page.locator('.league-ticket-dot'), 'index dots').toHaveCount(6);
  const indexSlides: ReadonlyArray<{
    n: number; eyebrow: string; homeName: string; awayName: string; homeScore: string; awayScore: string; fullCheck?: boolean;
  }> = [
    { n: 1, eyebrow: 'قمة الجولة', homeName: 'باريس', awayName: 'برشلونة', homeScore: '4', awayScore: '2', fullCheck: true },
    { n: 2, eyebrow: 'مباراة الليلة', homeName: 'بايرن', awayName: 'أرسنال', homeScore: '2', awayScore: '1' },
    { n: 3, eyebrow: 'مواجهة الكلاسيكو', homeName: 'ريال مدريد', awayName: 'برشلونة', homeScore: '3', awayScore: '1' },
    { n: 4, eyebrow: 'قمة الجولة', homeName: 'تشيلسي', awayName: 'توتنهام', homeScore: '3', awayScore: '2' },
    { n: 5, eyebrow: 'قمة الجولة', homeName: 'أرسنال', awayName: 'إيفرتون', homeScore: '2', awayScore: '0' },
  ];
  for (const c of indexSlides) {
    const slide = page.locator('.league-ticket-slide').nth(c.n);
    await expect(slide.locator('.league-ticket-eyebrow'), `slide ${c.n} eyebrow`).toHaveText(c.eyebrow);
    /* صور اللاعبين وأسماء الفريقين من خصائص الشريحة الأصلية نفسها */
    await expect(slide.locator('.league-ticket-player'), `slide ${c.n} players`).toHaveCount(2);
    await expect(slide.locator('.league-ticket-clash-team', { hasText: c.homeName })).toHaveCount(1);
    await expect(slide.locator('.league-ticket-clash-team', { hasText: c.awayName })).toHaveCount(1);
    const goals = slide.locator('.league-ticket-goals');
    await expect(goals).toBeVisible();
    await expect(goals).toHaveText(new RegExp(`${c.homeScore}\\s*:\\s*${c.awayScore}`));
    const dir = await goals.evaluate(el => getComputedStyle(el).direction);
    expect(dir).toBe('rtl');
    if (c.fullCheck) {
      /* قياس المواقع مرة واحدة يكفي: المضيف يمين والضيف يسار ورقم
         المضيف يمين النقطتين — نفس بنية كرت تذكرة البطولة الأم */
      const layout = await slide.evaluate(root => {
        const strong = root.querySelector('.league-ticket-goals')!;
        const rects: { ch: string; x: number }[] = [];
        const walk = document.createTreeWalker(strong, NodeFilter.SHOW_TEXT);
        let node: Node | null;
        while ((node = walk.nextNode())) {
          const text = node.textContent ?? '';
          for (let i = 0; i < text.length; i++) {
            const range = document.createRange();
            range.setStart(node, i);
            range.setEnd(node, i + 1);
            const r = range.getBoundingClientRect();
            if (r.width > 0) rects.push({ ch: text[i], x: r.x });
          }
        }
        const first = rects.find(r => r.ch.trim());
        const colon = rects.find(r => r.ch === ':');
        const last = [...rects].reverse().find(r => r.ch.trim());
        const teamXs = [...root.querySelectorAll('.league-ticket-clash-team')].map(t => ({
          name: (t as HTMLElement).textContent?.trim() ?? '',
          x: (t as HTMLElement).getBoundingClientRect().x,
        }));
        return { firstX: first?.x ?? -1, colonX: colon?.x ?? -1, lastX: last?.x ?? -1, teamXs };
      });
      const homeT = layout.teamXs.find(t => t.name.includes(c.homeName));
      const awayT = layout.teamXs.find(t => t.name.includes(c.awayName));
      expect(homeT!.x).toBeGreaterThan(awayT!.x);
      expect(layout.firstX).toBeGreaterThan(layout.colonX);
      expect(layout.lastX).toBeLessThan(layout.colonX);
    }
  }
});

/* ── الرئيسية: التذكرة الجامعة نفسها بشرائحها الحيّة واردة أيضاً في
     هيرو الصفحة بعد الشارة العلوية — الاختبار يقطع باتصالها بخصائصها ── */
test('home hero hosts the matches index ticket with all six live slides', async ({ page }) => {
  await mockSource(page, {
    'uefa.champions': [
      indexClashMock('h-ucl-psg-bar', '2026-10-13T19:00:00Z', 'Paris Saint-Germain', 'Barcelona', '4', '2'),
      indexClashMock('h-ucl-bay-ars', '2026-10-13T20:00:00Z', 'Bayern München', 'Arsenal', '2', '1'),
    ],
    'esp.1': [indexClashMock('h-esp-real-bar', '2026-10-13T18:30:00Z', 'Real Madrid', 'Barcelona', '3', '1')],
    'eng.1': [
      indexClashMock('h-eng-che-tot', '2026-10-13T16:30:00Z', 'Chelsea', 'Tottenham Hotspur', '3', '2'),
      indexClashMock('h-eng-ars-eve', '2026-10-13T15:00:00Z', 'Arsenal', 'Everton', '2', '0'),
    ],
  });
  await page.goto('/');
  const homeTicket = page.locator('#hero .league-ticket-carousel');
  await expect(homeTicket).toHaveCount(1);
  await expect(homeTicket.locator('.league-ticket-dot'), 'home hero dots').toHaveCount(6);
  /* الأساسية: عنوان «كل البطولات الكبرى» كما في صفحة المواعيد */
  const baseSlide = homeTicket.locator('.league-ticket-slide').first();
  await expect(baseSlide.locator('.league-ticket-body em')).toHaveText('كل البطولات الكبرى');
  /* وشريحة حيّه واحد بينها على الأقل تثبّت الخصائص: «قمة الجولة»
     الأبطال تُعرض بنتيجة المضيف يمين النقطتين RTL */
  const firstClash = homeTicket.locator('.league-ticket-slide').nth(1);
  await expect(firstClash.locator('.league-ticket-eyebrow')).toHaveText('قمة الجولة');
  const goals = firstClash.locator('.league-ticket-goals');
  await expect(goals).toBeVisible();
  await expect(goals).toHaveText(/4\s*:\s*2/);
  const dir = await goals.evaluate(el => getComputedStyle(el).direction);
  expect(dir).toBe('rtl');
});

/* ── عدّاد الفليب الجديد: مواجهة مثبتة بعد يومين وخمس ساعات ودقيقتين
     وسبع ثوانٍ من الساعة المجمدة — يُقرأ على الشرائح من صفحة المواعيد
     ومن الرئيسية بنفس البنية وبروح التذاكر ── */
test('ticket clash slides show the flip countdown in ticket spirit for scheduled clashes', async ({ page }) => {
  const preEvent = (id: string, dateIso: string, home: string, away: string) => ({
    id,
    date: dateIso,
    competitions: [{ competitors: [
      { homeAway: 'home', score: '', team: { displayName: home } },
      { homeAway: 'away', score: '', team: { displayName: away } },
    ], status: { displayClock: '', type: { state: 'pre', completed: false, name: 'STATUS_SCHEDULED' } } }],
  });
  await mockSource(page, {
    'eng.1': [preEvent('flip-ars-eve', '2026-10-15T17:03:07Z', 'Arsenal', 'Everton')],
  });
  await page.goto('/matches/الدوري-الإنجليزي/');
  const strip = page.locator('.league-ticket-slide').nth(2).locator('.league-ticket-countdown.ticket-flip');
  await expect(strip).toBeVisible();
  /* أربع خلايا بترتيب عربي: يوم ← ساعة ← دقيقة ← ثانية */
  const labels = await strip.locator('.ticket-flip__label').allTextContents();
  expect(labels).toEqual(['يوم', 'ساعة', 'دقيقة', 'ثانية']);
  /* القيم المجمدة محسوبة من فترق الموعد: 02 يوم / 05 ساعة / 03 دقيقة /
     07 ثانية — القراءة من الأنصاف العلوية لأن كل خانة تضاعف قيمتها
     في النصفين ما دامت ساكنة */
  const tops = await strip.locator('.ticket-flip__half--top').allTextContents();
  /* الثانية الواحدة قد تمر بين تجميد الساعة والعرض — تحمّل سعة دقيقة */
  expect(tops.slice(0, 6)).toEqual(['0', '2', '0', '5', '0', '3']);
  expect(tops.slice(6, 7)).toEqual(['0']);
  /* الثانية الواحدة قد تمر بين تجميد الساعة والعرض — تسامح رقمي على الوحدة */
  expect(tops[7]).toMatch(/^\d$/);
  await expect(strip.locator('.ticket-flip__digit')).toHaveCount(8);
});

test('french league ticket carries the small Nova brand in its physical top-left corner', async ({ page }) => {
  await mockSource(page, {});
  await page.goto('/matches/الدوري-الفرنسي/');
  /* تذكرة الفرنسي اليوم يقف وحدة قممها فارغة فتُرسَم بالمسار الساكن
     (تذكرة واحدة في الهيرو بلا منزلقة) — الحقنات الثلاث تغطي المسارين */
  const ticket = page.locator('.matches-hero-title .league-ticket');
  await expect(ticket).toHaveCount(1);
  const brand = ticket.locator('img.league-ticket-brand-nova');
  await expect(brand).toHaveCount(1);
  await expect(brand).toBeVisible();
  /* الصورة تُقدَّم فعلاً من الموقع لا مسار مكسور */
  await expect.poll(async () => brand.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBeTruthy();
  /* صغير كما طُلب: عرض بين 20 و44px مهما كبرت شاشة التذكرة */
  const box = await brand.boundingBox();
  expect(box).toBeTruthy();
  expect(box!.width).toBeGreaterThanOrEqual(20);
  expect(box!.width).toBeLessThanOrEqual(44);
  /* أعلى اليسار الفيزيائي: ضمن 30px من ركني التذكرة نفسها (الموضع
     left صريح لأن التذكرة RTL فلا يقفز مع inline-start). الصندوق
     في Playwright = {x, y, width, height} لا خصائص left/top له */
  const ticketBox = await ticket.boundingBox();
  expect(ticketBox).toBeTruthy();
  expect(box!.x - ticketBox!.x).toBeLessThanOrEqual(30);
  expect(box!.y - ticketBox!.y).toBeLessThanOrEqual(30);
  /* لوجو X المقصوص من IPTV بجانب نوفا: صورة واحدة، منبع حقيقي،
     ارتفاع مساوٍ لمساحة نوفا (14..26px)، ويجلس يمينها الفيزيائي
     ملاصقًا داخل 60px من الركن الأيسر — لا يعلوها ولا ينزاح عنها */
  const xtv = ticket.locator('img.league-ticket-brand-xtv');
  await expect(xtv).toHaveCount(1);
  await expect(xtv).toBeVisible();
  await expect.poll(async () => xtv.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBeTruthy();
  const xtvBox = await xtv.boundingBox();
  expect(xtvBox).toBeTruthy();
  expect(xtvBox!.height).toBeGreaterThanOrEqual(14);
  expect(xtvBox!.height).toBeLessThanOrEqual(26);
  expect(xtvBox!.y - ticketBox!.y).toBeLessThanOrEqual(30);
  expect(xtvBox!.x).toBeGreaterThan(box!.x + box!.width * 0.5);
  expect(xtvBox!.x - ticketBox!.x).toBeLessThanOrEqual(60);
});

test('nova brand is distributed by the owner rollout rule across every ticket', async ({ page }) => {
  await mockSource(page, {});
  /* 1) تذكرة مواعيد المباريات الجامعة: اللوجو على كل شرائحها —
     الأساس الجامع + شرائح القمم (= عدد النقاط نفسه) */
  await page.goto('/matches/');
  const indexCarousel = page.locator('.league-ticket-carousel');
  await expect(indexCarousel).toHaveCount(1);
  const dots = await indexCarousel.locator('button.league-ticket-dot').count();
  expect(dots).toBeGreaterThanOrEqual(6);
  await expect(indexCarousel.locator('img.league-ticket-brand-nova'), 'index: brand on every slide').toHaveCount(dots);
  await expect.poll(async () => indexCarousel.locator('img.league-ticket-brand-nova').first().evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBeTruthy();

  /* 2) الإنجليزي والإسباني وأبطال أوروبا: الشريحة الأولى (القاعدة)
     فقط — شرائح القمم بلا لوجو حتى لا تزاحم محتواها الغني */
  for (const slug of ['الدوري-الإنجليزي', 'الدوري-الإسباني', 'دوري-أبطال-أوروبا']) {
    await page.goto(`/matches/${slug}/`);
    const carousel = page.locator('.matches-hero-title .league-ticket-carousel');
    await expect(carousel).toHaveCount(1);
    const slideCount = await carousel.locator('.league-ticket-slide').count();
    expect(slideCount).toBeGreaterThanOrEqual(2);
    await expect(carousel.locator('img.league-ticket-brand-nova'), `${slug}: brand only on base`).toHaveCount(1);
    await expect(carousel.locator('.league-ticket-slide').first().locator('img.league-ticket-brand-nova'), `${slug}: brand on base slide`).toHaveCount(1);
    for (let i = 1; i < slideCount; i++) {
      await expect(carousel.locator('.league-ticket-slide').nth(i).locator('img.league-ticket-brand-nova'), `${slug}: clash slide ${i} brand-free`).toHaveCount(0);
    }
  }

  /* 3) الفرنسي والألماني والإيطالي والمصري والسعودي: كامل التذكرة —
     ساكنة اليوم (شريحة واحدة) فيُثبت عدد 1، مستقبل-احتمائي لو
     أُثرقت بالقمم */
  for (const slug of ['الدوري-الفرنسي', 'الدوري-الألماني', 'الدوري-الإيطالي', 'الدوري-المصري', 'الدوري-السعودي']) {
    await page.goto(`/matches/${slug}/`);
    const slideCount = await page.locator('.matches-hero-title .league-ticket-slide').count();
    const brand = page.locator('.matches-hero-title img.league-ticket-brand-nova');
    if (slideCount > 0) {
      await expect(brand, `${slug}: brand on all slides`).toHaveCount(slideCount);
    } else {
      await expect(page.locator('.matches-hero-title .league-ticket')).toHaveCount(1);
      await expect(brand, `${slug}: single brand`).toHaveCount(1);
    }
    await expect(brand.first(), `${slug}: brand visible`).toBeVisible();
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

  /* قسم أرشيف المباريات مخفي بطلب صريح — موجود في المحتوى وغير مرئي */
  await expect(page.locator('[data-league-archive]')).toBeHidden();
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
