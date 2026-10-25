import { test, expect, type Locator, type Page, type Route } from '@playwright/test';
import { fileURLToPath } from 'node:url';

// The league bar is a carousel (slider) over real landing-page links: it must
// page without hiding links from crawlers, keyboard users, or no-JS visitors.
const NOW = new Date('2026-10-13T12:00:00Z');

/* المصدر المؤقت لشعارات المتصدّرين هو نفسه مصدر بطاقات المباريات الحيّة
   (ESPN CDN). الاختبار لا يعتمد على الشبكة: يستجيب لطلبات ذلك المضيف وحده
   ببكسل محلي، ويترك أي مضيف آخر مقطوعاً. */
const LIVE_CREST = /^https:\/\/a\.espncdn\.com\/i\/teamlogos\/soccer\/500\/[1-9]\d{0,11}\.png$/;
const HIGHLIGHTLY_CREST = /^https:\/\/highlightly\.net\/soccer\/images\/teams\/[1-9]\d{0,11}\.png$/;
/** مضيفا شعارات المزوّدين المعتمدان في البانر */
const PROVIDER_CREST = [LIVE_CREST, HIGHLIGHTLY_CREST];
const CREST_PIXEL = fileURLToPath(new URL('../public/images/teams/paris-saint-germain-club-badge.webp', import.meta.url));

async function openHub(
  page: Page,
  viewport: { width: number; height: number },
  override?: (url: URL, route: Route) => boolean,
) {
  await page.clock.install({ time: NOW });
  // Upstream is unreachable in CI; the carousel must not depend on match data.
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (override?.(url, route)) return;
    if ((url.hostname === 'a.espncdn.com' && LIVE_CREST.test(url.href)) || (url.hostname === 'highlightly.net' && HIGHLIGHTLY_CREST.test(url.href))) {
      return route.fulfill({ status: 200, path: CREST_PIXEL, contentType: 'image/webp' });
    }
    if (!['localhost', '127.0.0.1'].includes(url.hostname)) return route.abort();
    if (url.pathname === '/scoreboard.php') {
      return route.fulfill({ status: 200, headers: { 'X-Matches-Cache': 'HIT', 'X-Cache-Age': '5', 'X-Diagnostic-Code': 'OK' }, json: { events: [] } });
    }
    return route.continue();
  });
  await page.setViewportSize(viewport);
  await page.goto('/matches/');
}


/* الصفحة تمرّر نفسها إلى التقويم بعد وصول البيانات، فتتحرّك العناصر تحت
   الإحداثيات المحسوبة. تُنتظر هنا استقرار موضع التمرير قبل أي سحب بالفأرة. */
async function settleScroll(page: Page) {
  let last = -1;
  for (let attempt = 0; attempt < 12; attempt++) {
    const y = await page.evaluate(() => window.scrollY);
    if (y === last) return;
    last = y;
    await page.waitForTimeout(150);
  }
}

const offset = (nav: Locator) =>
  nav.locator('.league-carousel-track').evaluate(el => {
    const matrix = new DOMMatrix(getComputedStyle(el).transform);
    return Math.round(matrix.m41);
  });

test('league bar pages by arrows and dots, keeps every link in the DOM, and grows the active dot', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await openHub(page, { width: 1440, height: 1000 });

  const nav = page.locator('.matches-league-links.league-carousel');
  await expect(nav).toHaveAttribute('data-ready', 'true');
  // All eight landing links stay in the document: the carousel offsets them,
  // it never swaps the list out.
  await expect(nav.locator('.league-carousel-item')).toHaveCount(8);
  for (const href of ['/matches/الدوري-الإنجليزي/', '/matches/دوري-أبطال-أوروبا/', '/matches/الدوري-السعودي/']) {
    await expect(nav.locator(`a[href="${href}"]`), href).toHaveCount(1);
  }
  // Desktop: four cards per page → two pages.
  await expect(nav.locator('.league-carousel-dot')).toHaveCount(2);
  // At the first page only "previous" is disabled; the first button in the DOM
  // is "next" (RTL: later pages sit to the left).
  await expect(nav.getByLabel('البطولات السابقة')).toBeDisabled();
  await expect(nav.getByLabel('البطولات التالية')).toBeEnabled();

  const first = nav.locator('.league-carousel-dot').first();
  const second = nav.locator('.league-carousel-dot').nth(1);
  await expect(first).toHaveClass(/is-active/);
  await expect(first).toHaveAttribute('aria-current', 'true');
  const activeWidth = (await first.boundingBox())!.width;
  const idleWidth = (await second.boundingBox())!.width;
  expect(activeWidth).toBeGreaterThan(idleWidth * 2);

  const start = await offset(nav);
  await nav.getByLabel('البطولات التالية').click();
  await expect(second).toHaveClass(/is-active/);
  await expect(first).not.toHaveAttribute('aria-current', 'true');
  expect(Math.abs((await offset(nav)) - start)).toBeGreaterThan(100);
  await expect(nav.locator('.league-carousel-viewport')).toHaveAttribute('aria-label', /صفحة 2 من 2/);

  await nav.getByLabel('البطولات السابقة').click();
  await expect(first).toHaveClass(/is-active/);
  expect(await offset(nav)).toBe(start);

  await second.click();
  await expect(second).toHaveClass(/is-active/);
  await expect(nav.getByLabel('البطولات التالية')).toBeDisabled();
  await nav.getByLabel('البطولات السابقة').click();
  await expect(first).toHaveClass(/is-active/);
  expect(errors).toEqual([]);
});

test('league bar re-measures on a narrow viewport: two cards per page and four pages', async ({ page }) => {
  await openHub(page, { width: 390, height: 900 });
  const nav = page.locator('.matches-league-links.league-carousel');
  await expect(nav).toHaveAttribute('data-ready', 'true');
  await expect(nav.locator('.league-carousel-dot')).toHaveCount(4);
  const items = nav.locator('.league-carousel-item');
  // Cards stay inside the viewport width: two fit side by side, none overflow.
  const [first, second] = [(await items.nth(0).boundingBox())!, (await items.nth(1).boundingBox())!];
  expect(Math.abs(first.y - second.y)).toBeLessThan(4);
  expect(Math.min(first.x, second.x) + first.width + second.width).toBeLessThan(391);
});

test('keyboard focus reaches a league link and the bar follows it into view', async ({ page }) => {
  await openHub(page, { width: 1440, height: 1000 });
  const nav = page.locator('.matches-league-links.league-carousel');
  const last = nav.locator('.league-carousel-item').last();
  await last.focus();
  await expect(last).toBeFocused();
  // The card that received focus is brought into the visible window.
  await expect.poll(async () => {
    const box = await last.boundingBox();
    const view = (await nav.locator('.league-carousel-viewport').boundingBox())!;
    return box ? box.x >= view.x - 4 && box.x + box.width <= view.x + view.width + 4 : false;
  }, { timeout: 3000 }).toBe(true);
});

test('dragging the bar never opens a league page, and a swipe advances the page', async ({ page }) => {
  await openHub(page, { width: 1440, height: 1000 });
  const nav = page.locator('.matches-league-links.league-carousel');
  /* يُثبَّت الشريط في منتصف الشاشة قبل حساب إحداثيات السحب: الهيدر مثبَّت
     أعلى الصفحة فيغطّي الشريط إن صار تحته، فلا تصل أحداث المؤشر أصلاً. */
  await page.evaluate(() =>
    document.querySelector('.matches-league-links.league-carousel')!.scrollIntoView({ block: 'center' }),
  );
  await settleScroll(page);
  await page.evaluate(() =>
    document.querySelector('.matches-league-links.league-carousel')!.scrollIntoView({ block: 'center' }),
  );
  await settleScroll(page);
  const box = (await nav.locator('.league-carousel-viewport').boundingBox())!;
  const y = box.y + box.height / 2;
  // RTL: dragging right reveals the cards waiting on the left.
  await page.mouse.move(box.x + box.width * 0.6, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.9, y, { steps: 12 });
  await page.mouse.up();
  await expect(page).toHaveURL(/\/matches\/$/);
  await expect(nav.locator('.league-carousel-dot').nth(1)).toHaveClass(/is-active/);
});

test('all eight leader banners use the live match-card crest source, with no other third-party logo host', async ({ page }) => {
  const crestRequests: string[] = [];
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.pathname.includes('/images/teams/') || url.pathname.includes('/i/teamlogos/')) crestRequests.push(request.url());
  });
  await openHub(page, { width: 1440, height: 1000 });
  const nav = page.locator('.matches-league-links.league-carousel');
  await expect(nav).toHaveAttribute('data-ready', 'true');
  await expect(nav.locator('.league-carousel-banner')).toHaveCount(8);

  // ترتيب الكروت يطابق ترتيب البطولات: UCL، إنجلترا، فرنسا، إسبانيا، ألمانيا، إيطاليا، السعودية، مصر.
  // المصري من Highlightly (معرّفه ليس ESPN) فيبقى على الشعار المحلي المعتمد.
  const expected: [string, string, string, string, string][] = [
    ['Paris Saint-Germain', 'PS', 'espn', 'https://a.espncdn.com/i/teamlogos/soccer/500/160.png', '/images/teams/paris-saint-germain-club-badge.webp'],
    ['Manchester City', 'MC', 'espn', 'https://a.espncdn.com/i/teamlogos/soccer/500/382.png', '/images/teams/manchester-city-club-badge.webp'],
    ['AS Monaco', 'AM', 'espn', 'https://a.espncdn.com/i/teamlogos/soccer/500/174.png', '/images/teams/as-monaco-club-badge.webp'],
    ['Barcelona', 'B', 'espn', 'https://a.espncdn.com/i/teamlogos/soccer/500/83.png', '/images/teams/barcelona-club-badge.webp'],
    ['SC Freiburg', 'SF', 'espn', 'https://a.espncdn.com/i/teamlogos/soccer/500/126.png', '/images/teams/sc-freiburg-club-badge.webp'],
    ['Internazionale', 'I', 'espn', 'https://a.espncdn.com/i/teamlogos/soccer/500/110.png', '/images/teams/internazionale-club-badge.webp'],
    ['Al Qadsiah', 'AQ', 'espn', 'https://a.espncdn.com/i/teamlogos/soccer/500/22022.png', '/images/teams/al-qadsiah-club-badge.webp'],
    ['Al Assiouty Sport', 'AA', 'highlightly', 'https://highlightly.net/soccer/images/teams/882420.png', '/images/teams/pyramids-fc-club-badge.webp'],
  ];
  const images = nav.locator('.league-carousel-banner img');
  await expect(images).toHaveCount(8);
  for (const [index, [name, initials, source, src, localFallback]] of expected.entries()) {
    const card = nav.locator('.league-carousel-item').nth(index);
    await expect(card.locator('.league-carousel-leader')).toContainText(name);
    const banner = card.locator('.league-carousel-banner');
    // البديل الحرفي دائم أسفل الصورة، لا يزول بتوفّر المسار.
    await expect(banner.locator('.league-carousel-monogram')).toContainText(initials);
    const image = banner.locator('img');
    await expect(image).toHaveAttribute('src', src);
    await expect(image).toHaveAttribute('data-crest-source', source);
    await expect(image).toHaveAttribute('alt', '');
    await expect(image).toHaveAttribute('aria-hidden', 'true');
    await expect(image).toHaveAttribute('loading', 'lazy');
    await expect(image).toHaveAttribute('draggable', 'false');
    // الشعار المحلي البديل معروف المسار (وجوده الفعلي يُفحَص أدناه).
    expect(localFallback).toMatch(/^\/images\/teams\/[a-z0-9-]+-club-badge\.webp$/);
  }

  // كل صورة في البانر تُفكّ فعلاً (لا صفحة HTML من fallback التوجيه).
  const decoded = await page.evaluate(async list => {
    const out: [string, number, number][] = [];
    for (const src of list) {
      const probe = new Image();
      probe.src = src;
      try {
        await probe.decode();
        out.push([src, probe.naturalWidth, probe.naturalHeight]);
      } catch {
        out.push([src, 0, 0]);
      }
    }
    return out;
  }, expected.map(([, , , src]) => src));
  for (const [src, width, height] of decoded) {
    expect(width, src).toBeGreaterThan(0);
    expect(height, src).toBeGreaterThan(0);
  }
  // كل شعار محلي بديل يُخدَم WebP صالحاً (المصدر الخارجي مُحاكى في هذا الاختبار).
  for (const fallback of new Set(expected.map(([, , , , localFallback]) => localFallback))) {
    const local = await page.request.get(fallback);
    expect(local.status(), fallback).toBe(200);
    expect(local.headers()['content-type'], fallback).toContain('image/webp');
    expect((await local.body()).subarray(0, 4).toString(), fallback).toBe('RIFF');
  }

  // لا مضيف شعارات ثالث: المحلي + مصدر بطاقات المباريات الحيّة فقط.
  expect(crestRequests.length).toBeGreaterThanOrEqual(8);
  for (const request of crestRequests) {
    const url = new URL(request);
    if (['localhost', '127.0.0.1'].includes(url.hostname)) {
      expect(url.pathname).toMatch(/^\/images\/teams\//);
    } else {
      expect(['a.espncdn.com', 'highlightly.net'], request).toContain(url.hostname);
      expect(PROVIDER_CREST.some(pattern => pattern.test(request)), request).toBe(true);
    }
  }
});

test('a failing live crest falls back to the local crest, then to the initials with the banner height intact', async ({ page }) => {
  const live = 'https://a.espncdn.com/i/teamlogos/soccer/500/174.png';
  /* الصيغة تفصيل تنفيذ: النشر يبدّل src إلى أخف نسخة حديثة (avif/webp)،
     فالحجب يجب أن يلتقط أي صيغة لنفس الشعار المحلي. */
  const local = /^\/images\/teams\/as-monaco-club-badge\.(?:png|webp|avif)$/;
  const blocked: string[] = [];
  await openHub(page, { width: 1440, height: 1000 }, (url, route) => {
    const isBrokenLive = url.href.startsWith(live);
    const isBrokenLocal = local.test(url.pathname);
    if (!isBrokenLive && !isBrokenLocal) return false;
    blocked.push(url.href);
    void route.fulfill({ status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' }, body: '<!doctype html><title>404</title>' });
    return true;
  });
  const nav = page.locator('.matches-league-links.league-carousel');
  await expect(nav).toHaveAttribute('data-ready', 'true');
  const card = nav.locator('.league-carousel-item').nth(2);
  await card.scrollIntoViewIfNeeded();
  await expect(card.locator('.league-carousel-leader')).toContainText('AS Monaco');
  const banner = card.locator('.league-carousel-banner');
  const image = banner.locator('img');
  const before = (await banner.boundingBox())!;
  expect(before.height).toBe(104);
  /* طلب جديد بمسار مختلف في الاستعلام يتجاوز ذاكرة الصور المشتركة بين
     التجارب، فيُمرَّر فعلاً عبر الاعتراض ويُستجاب له بالخطأ. */
  await image.evaluate(element => {
    element.setAttribute('src', `${element.getAttribute('src')}?missing=1`);
  });
  // الفشل الأول ينزل إلى الشعار المحلي (وهو مفقود هنا أيضاً) ثم تُخفى الصورة.
  await expect(image).toHaveCSS('visibility', 'hidden');
  await expect(banner.locator('.league-carousel-monogram')).toBeVisible();
  await expect(banner.locator('.league-carousel-monogram')).toContainText('AM');
  expect((await banner.boundingBox())!.height).toBe(before.height);
  expect(blocked.some(url => url.startsWith(live))).toBe(true);
  expect(blocked.some(url => local.test(new URL(url).pathname))).toBe(true);
});

for (const width of [1440, 390]) {
  test(`leader banners retain initials and geometry when crests fail (${width}px)`, async ({ page }) => {
    await openHub(page, { width, height: 1000 });
    const nav = page.locator('.matches-league-links.league-carousel');
    const card = nav.locator('.league-carousel-item').first();
    const banner = card.locator('.league-carousel-banner');
    const image = banner.locator('img');
    await card.scrollIntoViewIfNeeded();
    await expect(card.locator('.league-carousel-leader')).toContainText('Paris Saint-Germain');
    await expect(nav.locator('.league-carousel-banner')).toHaveCount(8);
    await expect(nav.locator('.league-carousel-leader-logo')).toHaveCount(8);
    await expect(image).toHaveAttribute('draggable', 'false');
    await expect(image).toHaveCSS('object-fit', 'contain');
    const before = (await banner.boundingBox())!;
    expect(before.height).toBe(104);
    expect(Math.abs(before.width - (await card.boundingBox())!.width)).toBeLessThanOrEqual(2);
    // خطأ صورة المصدر ينزل إلى الشعار المحلي بدل إظهار صورة مكسورة.
    await image.evaluate(element => element.dispatchEvent(new Event('error')));
    await expect(image).toHaveAttribute('data-crest-source', 'local');
    await expect(image).toHaveAttribute('src', '/images/teams/paris-saint-germain-club-badge.webp');
    await expect(image).toBeVisible();
    // وفشل البديل المحلي أيضاً يُخفي الصورة وحدها ويُبقي الأحرف.
    await image.evaluate(element => element.dispatchEvent(new Event('error')));
    await expect(image).toHaveCSS('visibility', 'hidden');
    await expect(banner.locator('.league-carousel-monogram')).toBeVisible();
    await expect(banner.locator('.league-carousel-monogram')).toContainText('PS');
    expect((await banner.boundingBox())!.height).toBe(before.height);
  });
}
