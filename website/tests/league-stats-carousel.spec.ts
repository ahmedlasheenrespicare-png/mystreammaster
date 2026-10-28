import { test, expect, type Page } from '@playwright/test';

// Tournament stats (أقوى هجوم · أقوى دفاع · إجمالي الأهداف) live inside each
// card's upper dropdown (.lc-top-drawer) on .matches-league-links, while the
// standalone .league-stats section below is removed to avoid duplication.
const NOW = new Date('2026-10-13T12:00:00Z');

const LEAGUES: { id: string; count: number; provider: string }[] = [
  { id: 'uefa.champions', count: 36, provider: 'ESPN' },
  { id: 'eng.1', count: 20, provider: 'ESPN' },
  { id: 'fra.1', count: 18, provider: 'ESPN' },
  { id: 'esp.1', count: 20, provider: 'ESPN' },
  { id: 'ger.1', count: 18, provider: 'ESPN' },
  { id: 'ita.1', count: 20, provider: 'ESPN' },
  { id: 'ksa.1', count: 18, provider: 'ESPN' },
  { id: 'egy.1', count: 20, provider: 'Highlightly' },
];

/** جدول مزروع ثابت: الفريق الأول وحده يسجّل 8 أهداف في مباراتين ويستقبل 0 */
function table(league: { id: string; count: number; provider: string }, fetchedAt: string, stale = false) {
  const entries = Array.from({ length: league.count }, (_, index) => ({
    teamId: String(300 + index),
    name: index === 0 ? 'Test Leader' : `Test Club ${index + 1}`,
    rank: index + 1,
    played: 2,
    wins: index === 0 ? 2 : 0,
    draws: 0,
    losses: index === 0 ? 0 : 2,
    goalsFor: index === 0 ? 8 : 1,
    goalsAgainst: index === 0 ? 0 : 6,
    goalDifference: index === 0 ? 8 : -5,
    points: index === 0 ? 6 : 0,
  }));
  return {
    ok: true,
    provider: league.provider,
    league: league.id,
    phase: 'league',
    season: 2026,
    seasonDisplay: '2026-27',
    fetchedAt,
    stale,
    entries,
  };
}

async function openHub(page: Page, viewport: { width: number; height: number }) {
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
      const league = LEAGUES.find(entry => entry.id === url.searchParams.get('league'));
      if (!league) return route.fulfill({ status: 400, json: { ok: false, code: 'INVALID_LEAGUE' } });
      return route.fulfill({ status: 200, json: table(league, '2026-10-18T10:00:00Z') });
    }
    return route.continue();
  });
  await page.setViewportSize(viewport);
  await page.goto('/matches/');
}

test('hides the separate stats bar below and embeds المقترح (د) stats with club crests in each card upper dropdown', async ({ page }) => {
  await openHub(page, { width: 1440, height: 1000 });
  await expect(page.locator('.league-stats')).toHaveCount(0);
  await expect(page.locator('.lc-proposals-lab')).toHaveCount(0);

  const bar = page.locator('.matches-league-links.league-carousel');
  await expect(bar).toHaveAttribute('data-ready', 'true');
  const cards = bar.locator('.league-carousel-item');
  await expect(cards).toHaveCount(8);
  await expect(bar.locator('.lc-top-drawer.lc-top-drawer--twin')).toHaveCount(8);
  await expect(bar.locator('.lc-top-drawer .lc-top-club-crest')).toHaveCount(16);

  // Every card links to its landing page and carries 3 prerendered stat values.
  await expect(bar.locator('a[href="/matches/الدوري-الإنجليزي/"]')).toHaveCount(1);
  await expect(bar.locator('a[href="/matches/دوري-أبطال-أوروبا/"]')).toHaveCount(1);
  const values = bar.locator('.lc-top-drawer [data-stat-value]');
  await expect(values).toHaveCount(24);
  await expect(values.filter({ hasText: 'غير متاح' })).toHaveCount(0);
});

test('المقترح (د) upper and lower dropdowns open automatically on the active front card with club crests and zero text clipping', async ({ page }) => {
  for (const width of [1440, 390]) {
    await openHub(page, { width, height: 1000 });
    const bar = page.locator('.matches-league-links.league-carousel');
    await expect(bar).toHaveAttribute('data-ready', 'true');
    await bar.scrollIntoViewIfNeeded();

    const scene = bar.locator('.lc-ring-scene');
    const frontCard = bar.locator('.league-carousel-item[data-ring-pos="front"]');
    const nearCard = bar.locator('.league-carousel-item[data-ring-pos="near"]').first();
    const topDrawer = frontCard.locator('.lc-top-drawer.lc-top-drawer--twin');
    const detail = frontCard.locator('.lc-detail');
    const outline = frontCard.locator('.lc-outline');

    // Automatically open on the front card in rotation; tucked closed on non-front cards
    await expect.poll(async () => Number(await topDrawer.evaluate(el => getComputedStyle(el).opacity))).toBeGreaterThan(0.95);
    await expect.poll(async () => Number(await detail.evaluate(el => getComputedStyle(el).opacity))).toBeGreaterThan(0.95);
    await expect.poll(async () => Number(await nearCard.locator('.lc-top-drawer').evaluate(el => getComputedStyle(el).opacity))).toBe(0);
    await expect.poll(async () => Number(await nearCard.locator('.lc-detail').evaluate(el => getComputedStyle(el).opacity))).toBe(0);

    // Confirm upper & lower dropdowns physically frame the card outline without clipping outside .lc-ring-scene
    const [sceneBox, drawerBox, outlineBox, detailBox] = await Promise.all([
      scene.boundingBox(),
      topDrawer.boundingBox(),
      outline.boundingBox(),
      detail.boundingBox(),
    ]);
    expect(sceneBox).not.toBeNull();
    expect(drawerBox).not.toBeNull();
    expect(outlineBox).not.toBeNull();
    expect(detailBox).not.toBeNull();
    expect(drawerBox!.y).toBeGreaterThanOrEqual(sceneBox!.y);
    expect(drawerBox!.y).toBeLessThan(outlineBox!.y - 60);
    expect(drawerBox!.y + drawerBox!.height).toBeLessThanOrEqual(outlineBox!.y + 22);
    expect(detailBox!.y + detailBox!.height).toBeLessThanOrEqual(sceneBox!.y + sceneBox!.height);
    expect(Math.abs(drawerBox!.width - outlineBox!.width)).toBeLessThanOrEqual(8);

    // Symmetrical twin duel wings (أقوى هجوم + أقوى دفاع) with club crests, above total-goals capsule
    const wings = topDrawer.locator('.lc-top-twin-side');
    await expect(wings).toHaveCount(2);
    await expect(topDrawer.locator('.lc-top-club-crest')).toHaveCount(2);
    await expect(topDrawer.locator('.lc-duel-diamond')).toHaveCount(1);
    await expect(topDrawer.locator('.lc-top-twin-goals[data-stat-metric="total-goals"]')).toHaveCount(1);

    const wingBoxes = await wings.evaluateAll(elements => elements.map(element => {
      const rect = element.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    }));
    expect(Math.abs(wingBoxes[0].y - wingBoxes[1].y), `duel wings share one row at ${width}px`).toBeLessThan(3);
    const sorted = [...wingBoxes].sort((a, b) => a.x - b.x);
    expect(sorted[0].x + sorted[0].width).toBeLessThanOrEqual(sorted[1].x + 1);
    expect(Math.min(...wingBoxes.map(box => box.width))).toBeGreaterThanOrEqual(width === 390 ? 78 : 96);

    const textNodes = topDrawer.locator(
      '.lc-top-metric-label, .lc-top-metric-val, .lc-top-metric-unit, .lc-top-metric-team, .lc-top-twin-goals-label, .lc-top-twin-goals-val',
    );
    const clipping = await textNodes.evaluateAll(elements => elements.map(element => ({
      text: element.textContent?.trim(),
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    })).filter(item => item.scrollWidth > item.clientWidth + 1));
    expect(clipping, `no clipped metric text at ${width}px`).toEqual([]);

    // Rotating the ring smoothly folds the previous card's drawers and unfolds the newly active card's drawers
    const card0 = bar.locator('.league-carousel-item').first();
    const card1 = bar.locator('.league-carousel-item').nth(1);
    await bar.getByLabel('البطولات التالية').click();
    await expect(card1).toHaveAttribute('data-ring-pos', 'front');
    await expect.poll(async () => Number(await card0.locator('.lc-top-drawer').evaluate(el => getComputedStyle(el).opacity))).toBe(0);
    await expect.poll(async () => Number(await card0.locator('.lc-detail').evaluate(el => getComputedStyle(el).opacity))).toBe(0);
    await expect.poll(async () => Number(await card1.locator('.lc-top-drawer').evaluate(el => getComputedStyle(el).opacity))).toBeGreaterThan(0.95);
    await expect.poll(async () => Number(await card1.locator('.lc-detail').evaluate(el => getComputedStyle(el).opacity))).toBeGreaterThan(0.95);
  }
});

test('standings are requested only after the carousel reaches the viewport', async ({ page }) => {
  const calls: string[] = [];
  await page.addInitScript(() => {
    const Real = window.IntersectionObserver;
    const pending: { cb: IntersectionObserverCallback; el: Element; observer: unknown }[] = [];
    (window as unknown as Record<string, unknown>).__revealStats = () => {
      for (const entry of pending.splice(0)) {
        entry.cb(
          [{ isIntersecting: true, intersectionRatio: 1, target: entry.el } as IntersectionObserverEntry],
          entry.observer as IntersectionObserver,
        );
      }
    };
    window.IntersectionObserver = class {
      private real: IntersectionObserver;
      constructor(private cb: IntersectionObserverCallback, private options?: IntersectionObserverInit) {
        this.real = new Real(() => {}, options);
      }
      observe(el: Element) {
        if (el instanceof Element && el.classList.contains('matches-league-links')) {
          pending.push({ cb: this.cb, el, observer: this });
          return;
        }
        this.real.disconnect();
        this.real = new Real(this.cb, this.options);
        this.real.observe(el);
      }
      unobserve(el: Element) {
        this.real.unobserve(el);
      }
      disconnect() {
        this.real.disconnect();
      }
      takeRecords() {
        return [];
      }
    } as unknown as typeof IntersectionObserver;
  });
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
      calls.push(url.searchParams.get('league') ?? '');
      const league = LEAGUES.find(entry => entry.id === url.searchParams.get('league'));
      if (!league) return route.fulfill({ status: 400, json: { ok: false, code: 'INVALID_LEAGUE' } });
      return route.fulfill({ status: 200, json: table(league, '2026-10-18T10:00:00Z') });
    }
    return route.continue();
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/matches/');
  const bar = page.locator('.matches-league-links.league-carousel');
  await expect(bar).toHaveAttribute('data-ready', 'true');
  expect(calls, 'no standings request before the carousel is reached').toEqual([]);

  await page.evaluate(() => (window as unknown as { __revealStats: () => void }).__revealStats());
  await expect(bar).toHaveAttribute('data-fetched', 'true');
  await expect.poll(() => calls.length, { timeout: 5000 }).toBe(8);
  expect(new Set(calls).size).toBe(8);
});

test('a fresh standings reading updates the upper dropdown metrics and leading team', async ({ page }) => {
  await openHub(page, { width: 1440, height: 1000 });
  const bar = page.locator('.matches-league-links.league-carousel');
  await expect(bar).toHaveAttribute('data-ready', 'true');
  await page.evaluate(() =>
    document.querySelector('.matches-league-links.league-carousel')!.scrollIntoView({ block: 'center' }),
  );
  await expect(bar).toHaveAttribute('data-fetched', 'true');

  // Test Leader scores 8 in 2 -> 4.00 per match, concedes 0 -> 0.00, total goals = 8 + 19*1 = 27
  const card = bar.locator('.league-carousel-item[data-league="eng.1"]');
  const attack = card.locator('[data-stat-metric="best-attack"]');
  await expect(attack.locator('[data-stat-value]')).toContainText('4.00');
  await expect(attack.locator('[data-stat-team]')).toHaveText('Test Leader');

  const defence = card.locator('[data-stat-metric="best-defence"]');
  await expect(defence.locator('[data-stat-value]')).toContainText('0.00');

  await expect(card.locator('[data-stat-metric="total-goals"] [data-stat-value]')).toContainText('27');
});

test('a failing standings reading keeps the last confirmed numbers and marks them stale', async ({ page }) => {
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
        status: 503,
        headers: { 'X-Standings-Cache': 'BYPASS' },
        json: { ok: false, code: 'UPSTREAM_TIMEOUT' },
      });
    }
    return route.continue();
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/matches/');
  const bar = page.locator('.matches-league-links.league-carousel');
  await expect(bar).toHaveAttribute('data-ready', 'true');
  await page.evaluate(() =>
    document.querySelector('.matches-league-links.league-carousel')!.scrollIntoView({ block: 'center' }),
  );
  await expect(bar).toHaveAttribute('data-fetched', 'true');

  const card = bar.locator('.league-carousel-item[data-league="eng.1"]');
  await expect(card.locator('[data-stat-metric="best-attack"] [data-stat-value]')).not.toHaveText('غير متاح');
  await expect(card).toHaveAttribute('data-stat-stale', 'true');
});
