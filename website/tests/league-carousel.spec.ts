import { test, expect, type Page, type Route } from '@playwright/test';
import { fileURLToPath } from 'node:url';

// شريط البطولات حلقة دائرية ثلاثية الأبعاد (ilkhoeri/swift-panda-38) فوق روابط
// صفحات الهبوط الحقيقية: تدور كل 5 ثوانٍ وتُحرَّك باللمس والفأرة ولوحة المفاتيح.
const NOW = new Date('2026-10-13T12:00:00Z');

const LIVE_CREST = /^https:\/\/a\.espncdn\.com\/i\/teamlogos\/soccer\/500\/[1-9]\d{0,11}\.png$/;
const HIGHLIGHTLY_CREST = /^https:\/\/highlightly\.net\/soccer\/images\/teams\/[1-9]\d{0,11}\.png$/;
const PROVIDER_CREST = [LIVE_CREST, HIGHLIGHTLY_CREST];
const CREST_PIXEL = fileURLToPath(new URL('../public/images/teams/paris-saint-germain-club-badge.webp', import.meta.url));

async function openHub(
  page: Page,
  viewport: { width: number; height: number },
  override?: (url: URL, route: Route) => boolean,
) {
  await page.clock.install({ time: NOW });
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

async function settleScroll(page: Page) {
  let last = -1;
  for (let attempt = 0; attempt < 12; attempt++) {
    const y = await page.evaluate(() => window.scrollY);
    if (y === last) return;
    last = y;
    await page.waitForTimeout(150);
  }
}

test('3D circular ring steps by arrows and dots, wraps continuously, and keeps all eight links in the DOM', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await openHub(page, { width: 1440, height: 1000 });

  const nav = page.locator('.matches-league-links.league-carousel.lc-ring-carousel');
  await expect(nav).toHaveAttribute('data-ready', 'true');
  await expect(nav.locator('.league-carousel-item')).toHaveCount(8);
  for (const href of ['/matches/الدوري-الإنجليزي/', '/matches/دوري-أبطال-أوروبا/', '/matches/الدوري-السعودي/']) {
    await expect(nav.locator(`a[href="${href}"]`), href).toHaveCount(1);
  }

  // ثماني بطولات حول الدائرة (360° / 8 = 45°) وسهمان يعملان بالالتفاف المستمر.
  await expect(nav.locator('.league-carousel-dot')).toHaveCount(8);
  await expect(nav.getByLabel('البطولات السابقة')).toBeEnabled();
  await expect(nav.getByLabel('البطولات التالية')).toBeEnabled();

  const first = nav.locator('.league-carousel-dot').first();
  const second = nav.locator('.league-carousel-dot').nth(1);
  await expect(first).toHaveClass(/is-active/);
  await expect(first).toHaveAttribute('aria-current', 'true');
  const activeWidth = (await first.boundingBox())!.width;
  const idleWidth = (await second.boundingBox())!.width;
  expect(activeWidth).toBeGreaterThan(idleWidth * 2);

  await expect(nav.locator('.league-carousel-item').first()).toHaveAttribute('data-ring-pos', 'front');
  await nav.getByLabel('البطولات التالية').click();
  await expect(second).toHaveClass(/is-active/);
  await expect(nav).toHaveAttribute('data-active-index', '1');
  await expect(nav.locator('.league-carousel-item').nth(1)).toHaveAttribute('data-ring-pos', 'front');
  await expect(nav.locator('.lc-ring-inner')).toHaveAttribute('style', /--ring-angle:\s*45deg/);

  // الرجوع خطوتين يلتفّ بسلاسة حول الحلقة إلى البطاقة الثامنة (index 7).
  await nav.getByLabel('البطولات السابقة').click();
  await expect(first).toHaveClass(/is-active/);
  await nav.getByLabel('البطولات السابقة').click();
  await expect(nav).toHaveAttribute('data-active-index', '7');
  await expect(nav.locator('.league-carousel-dot').nth(7)).toHaveClass(/is-active/);

  await second.click();
  await expect(second).toHaveClass(/is-active/);
  expect(errors).toEqual([]);
});

test('3D ring auto-advances every 5 seconds and pauses while hovered or under reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await openHub(page, { width: 1440, height: 1000 });
  const nav = page.locator('.matches-league-links.league-carousel');
  await expect(nav).toHaveAttribute('data-ready', 'true');
  await expect(nav).toHaveAttribute('data-active-index', '0');

  await page.clock.runFor(5100);
  await expect(nav).toHaveAttribute('data-active-index', '1');
  await page.clock.runFor(5000);
  await expect(nav).toHaveAttribute('data-active-index', '2');

  // التحويم بالفأرة يوقف المؤقّت لقراءة بيانات المتصدّر بهدوء.
  await page.evaluate(() =>
    document.querySelector('.matches-league-links.league-carousel')!.scrollIntoView({ block: 'center' }),
  );
  await settleScroll(page);
  await nav.locator('.league-carousel-item[data-ring-pos="front"]').hover();
  await page.clock.runFor(6000);
  await expect(nav).toHaveAttribute('data-active-index', '2');

  // ومع تفضيل تقليل الحركة يتوقف الدوران التلقائي احتراماً لتفضيل الزائر.
  await page.mouse.move(5, 5);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(async () => {
    await page.clock.runFor(5200);
    return nav.getAttribute('data-active-index');
  }).toBe('2');
});

test('3D circular ring fits cleanly on a narrow mobile viewport without horizontal page overflow', async ({ page }) => {
  await openHub(page, { width: 390, height: 900 });
  const nav = page.locator('.matches-league-links.league-carousel');
  await expect(nav).toHaveAttribute('data-ready', 'true');
  await expect(nav.locator('.league-carousel-dot')).toHaveCount(8);

  const front = nav.locator('.league-carousel-item[data-ring-pos="front"]');
  const frontBox = (await front.boundingBox())!;
  expect(frontBox.x).toBeGreaterThanOrEqual(0);
  expect(frontBox.x + frontBox.width).toBeLessThanOrEqual(390);
  const docWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(docWidth).toBeLessThanOrEqual(390);
});

test('keyboard focus reaches any league link and rotates the 3D ring to bring it front and center', async ({ page }) => {
  await openHub(page, { width: 1440, height: 1000 });
  const nav = page.locator('.matches-league-links.league-carousel');
  const last = nav.locator('.league-carousel-item').last();
  await last.focus();
  await expect(last).toBeFocused();
  await expect(last).toHaveAttribute('data-ring-pos', 'front');
  await expect.poll(async () => {
    const box = await last.boundingBox();
    const view = (await nav.locator('.league-carousel-viewport').boundingBox())!;
    return box ? box.x >= view.x && box.x + box.width <= view.x + view.width : false;
  }, { timeout: 3000 }).toBe(true);
});

test('dragging the 3D ring never opens a league page, and a swipe rotates the ring', async ({ page }) => {
  await openHub(page, { width: 1440, height: 1000 });
  const nav = page.locator('.matches-league-links.league-carousel');
  await page.evaluate(() =>
    document.querySelector('.matches-league-links.league-carousel')!.scrollIntoView({ block: 'center' }),
  );
  await settleScroll(page);
  await page.evaluate(() =>
    document.querySelector('.matches-league-links.league-carousel')!.scrollIntoView({ block: 'center' }),
  );
  await settleScroll(page);
  const box = (await nav.locator('.league-carousel-viewport').boundingBox())!;
  const y = box.y + box.height * 0.45;
  await page.mouse.move(box.x + box.width * 0.35, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.65, y, { steps: 12 });
  await page.mouse.up();
  await expect(page).toHaveURL(/\/matches\/$/);
  await expect(nav).not.toHaveAttribute('data-active-index', '0');
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
    await expect(banner.locator('.league-carousel-monogram')).toContainText(initials);
    const image = banner.locator('img');
    await expect(image).toHaveAttribute('src', src);
    await expect(image).toHaveAttribute('data-crest-source', source);
    await expect(image).toHaveAttribute('alt', '');
    await expect(image).toHaveAttribute('aria-hidden', 'true');
    await expect(image).toHaveAttribute('loading', 'lazy');
    await expect(image).toHaveAttribute('draggable', 'false');
    expect(localFallback).toMatch(/^\/images\/teams\/[a-z0-9-]+-club-badge\.webp$/);
  }

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
  for (const fallback of new Set(expected.map(([, , , , localFallback]) => localFallback))) {
    const local = await page.request.get(fallback);
    expect(local.status(), fallback).toBe(200);
    expect(local.headers()['content-type'], fallback).toContain('image/webp');
    expect((await local.body()).subarray(0, 4).toString(), fallback).toBe('RIFF');
  }

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
  const local = '/images/teams/as-monaco-club-badge.webp';
  const blocked: string[] = [];
  await openHub(page, { width: 1440, height: 1000 }, (url, route) => {
    const isBrokenLive = url.href.startsWith(live);
    const isBrokenLocal = url.pathname === local;
    if (!isBrokenLive && !isBrokenLocal) return false;
    blocked.push(url.href);
    void route.fulfill({ status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' }, body: '<!doctype html><title>404</title>' });
    return true;
  });
  const nav = page.locator('.matches-league-links.league-carousel');
  await expect(nav).toHaveAttribute('data-ready', 'true');
  // نلفّ الحلقة إلى البطاقة الثالثة (AS Monaco) لتكون في المقدمة.
  await nav.locator('.league-carousel-dot').nth(2).click();
  const card = nav.locator('.league-carousel-item').nth(2);
  await expect(card).toHaveAttribute('data-ring-pos', 'front');
  await card.scrollIntoViewIfNeeded();
  await expect(card.locator('.league-carousel-leader')).toContainText('AS Monaco');
  const banner = card.locator('.league-carousel-banner');
  const image = banner.locator('img');
  const before = (await banner.boundingBox())!;
  expect(before.width).toBeGreaterThanOrEqual(30);
  expect(before.height).toBeGreaterThanOrEqual(30);
  await expect(image).toHaveAttribute('data-crest-source', 'local');
  await image.evaluate(element => element.dispatchEvent(new Event('error')));
  await expect(image).toHaveCSS('visibility', 'hidden');
  await expect(banner.locator('.league-carousel-monogram')).toBeVisible();
  await expect(banner.locator('.league-carousel-monogram')).toContainText('AM');
  expect(Math.abs((await banner.boundingBox())!.height - before.height)).toBeLessThanOrEqual(1);
  expect(blocked.some(url => url.startsWith(live))).toBe(true);
});

for (const width of [1440, 390]) {
  test(`leader banners retain initials and geometry when crests fail (${width}px)`, async ({ page }) => {
    await openHub(page, { width, height: 1000 });
    const nav = page.locator('.matches-league-links.league-carousel');
    const card = nav.locator('.league-carousel-item').first();
    const outline = card.locator('.lc-outline');
    const banner = card.locator('.league-carousel-banner');
    const image = banner.locator('img');
    await card.scrollIntoViewIfNeeded();
    await expect(card.locator('.league-carousel-leader')).toContainText('Paris Saint-Germain');
    await expect(nav.locator('.league-carousel-banner')).toHaveCount(8);
    await expect(nav.locator('.league-carousel-leader-logo')).toHaveCount(8);
    await expect(image).toHaveAttribute('draggable', 'false');
    await expect(image).toHaveCSS('object-fit', 'contain');
    const before = (await banner.boundingBox())!;
    const expectedAvatar = width === 390 ? 26 : 32;
    expect(before.width).toBeGreaterThanOrEqual(expectedAvatar - 2);
    expect(before.height).toBeGreaterThanOrEqual(expectedAvatar - 2);
    expect(Math.abs((await outline.boundingBox())!.width - (await card.boundingBox())!.width)).toBeLessThanOrEqual(6);
    await image.evaluate(element => element.dispatchEvent(new Event('error')));
    await expect(image).toHaveAttribute('data-crest-source', 'local');
    await expect(image).toHaveAttribute('src', '/images/teams/paris-saint-germain-club-badge.webp');
    await expect(image).toBeVisible();
    await image.evaluate(element => element.dispatchEvent(new Event('error')));
    await expect(image).toHaveCSS('visibility', 'hidden');
    await expect(banner.locator('.league-carousel-monogram')).toBeVisible();
    await expect(banner.locator('.league-carousel-monogram')).toContainText('PS');
    expect(Math.abs((await banner.boundingBox())!.height - before.height)).toBeLessThanOrEqual(1);
  });
}

test('transparent trophy emblem sits over the cup and both dropdowns unfold automatically as each card rotates to the front', async ({ page }) => {
  await openHub(page, { width: 1440, height: 1000 });
  const nav = page.locator('.matches-league-links.league-carousel');
  await expect(nav).toHaveAttribute('data-ready', 'true');
  await page.evaluate(() =>
    document.querySelector('.matches-league-links.league-carousel')!.scrollIntoView({ block: 'center' }),
  );
  await settleScroll(page);
  const firstCard = nav.locator('.league-carousel-item').first();
  const secondCard = nav.locator('.league-carousel-item').nth(1);
  await expect(firstCard).toHaveAttribute('data-ring-pos', 'front');
  await expect(secondCard).toHaveAttribute('data-ring-pos', 'near');

  const trophyBox = (await firstCard.locator('.lc-trophy-wrap').boundingBox())!;
  const emblemBox = (await firstCard.locator('.lc-trophy-emblem .league-carousel-badge').boundingBox())!;
  expect(Math.abs((emblemBox.x + emblemBox.width / 2) - (trophyBox.x + trophyBox.width / 2))).toBeLessThanOrEqual(3);
  expect(emblemBox.y).toBeGreaterThan(trophyBox.y);
  expect(emblemBox.y + emblemBox.height).toBeLessThan(trophyBox.y + trophyBox.height * 0.72);

  // التحقّق من عدم وجود خلفية بيضاء خلف أيقونة البطولة فوق الكأس.
  await expect(firstCard.locator('.lc-trophy-emblem .league-carousel-badge')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');

  // البطاقة التي عليها الدور في المقدمة تفتح قائمتيها العلوية والسفلية تلقائياً، بينما البطاقات الجانبية مطوية.
  const firstTop = firstCard.locator('.lc-top-drawer');
  const firstDetail = firstCard.locator('.lc-detail');
  await expect(firstTop).toHaveCSS('opacity', '1');
  await expect(firstDetail).toHaveCSS('opacity', '1');
  expect((await firstDetail.boundingBox())!.height).toBeGreaterThan(60);
  await expect(firstDetail.locator('[data-leader-points]')).toContainText('6');
  await expect(firstDetail.locator('[data-leader-meta]')).toContainText('لعب 2');
  await expect(firstDetail.locator('[data-leader-rates]')).toContainText('نقاط/م 3.00');
  await expect(firstDetail.locator('[data-leader-rates]')).toContainText('هجوم/م 5.00');

  await expect(secondCard.locator('.lc-top-drawer')).toHaveCSS('opacity', '0');
  await expect(secondCard.locator('.lc-detail')).toHaveCSS('opacity', '0');

  // عند دوران الحلقة إلى البطاقة الثانية تنطوي قائمتا الأولى وتنفتح قائمتا الثانية تلقائياً.
  await nav.getByLabel('البطولات التالية').click();
  await expect(secondCard).toHaveAttribute('data-ring-pos', 'front');
  await expect(firstTop).toHaveCSS('opacity', '0');
  await expect(firstDetail).toHaveCSS('opacity', '0');
  await expect(secondCard.locator('.lc-top-drawer')).toHaveCSS('opacity', '1');
  await expect(secondCard.locator('.lc-detail')).toHaveCSS('opacity', '1');
  await expect(secondCard.locator('.lc-detail [data-leader-points]')).toContainText('18');
});
