import { test, expect, type Page } from '@playwright/test';

// The stats bar reuses the links bar mechanics: same dots, same arrows, but its
// numbers come from /standings.php only once the section reaches the viewport.
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

/** جدول مزروع ثابت: الفريق الأول وحده يسجّل 4 أهداف في مباراتين ويستقبل 0 */
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
      return route.fulfill({ status: 200, headers: { 'X-Matches-Cache': 'HIT', 'X-Cache-Age': '5', 'X-Diagnostic-Code': 'OK' }, json: { events: [] } });
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

test('stats bar renders a card per league with numbers already in the HTML', async ({ page }) => {
  await openHub(page, { width: 1440, height: 1000 });
  const bar = page.locator('.league-stats');
  await expect(bar).toHaveAttribute('data-ready', 'true');
  const cards = bar.locator('.league-stats-card');
  await expect(cards).toHaveCount(8);
  // Every card names its league and links to its landing page.
  await expect(bar.locator('a[href="/matches/الدوري-الإنجليزي/"]')).toHaveCount(1);
  await expect(bar.locator('a[href="/matches/دوري-أبطال-أوروبا/"]')).toHaveCount(1);
  // Snapshot values are prerendered: no empty metric, no "غير متاح" on arrival.
  const values = bar.locator('[data-stat-value]');
  await expect(values).toHaveCount(24);
  await expect(values.filter({ hasText: 'غير متاح' })).toHaveCount(0);
  // Same paging controls as the links bar above it.
  await expect(bar.locator('.league-carousel-dot')).toHaveCount(3);
  await expect(bar.locator('.league-carousel-dot').first()).toHaveClass(/is-active/);
  await bar.getByLabel('البطولات التالية').click();
  await expect(bar.locator('.league-carousel-dot').nth(1)).toHaveClass(/is-active/);
});

test('three stat cells stay side by side without horizontal text clipping', async ({ page }) => {
  for (const width of [1440, 390]) {
    await openHub(page, { width, height: 1000 });
    const card = page.locator('.league-stats-card').first();
    const metrics = card.locator('.league-stats-metric');
    await expect(metrics).toHaveCount(3);
    const boxes = await metrics.evaluateAll(elements => elements.map(element => {
      const rect = element.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width };
    }));
    expect(boxes.every(box => Math.abs(box.y - boxes[0].y) < 1), `metrics share one row at ${width}px`).toBe(true);
    const sorted = [...boxes].sort((a, b) => a.x - b.x);
    expect(sorted[0].x + sorted[0].width).toBeLessThanOrEqual(sorted[1].x + 1);
    expect(sorted[1].x + sorted[1].width).toBeLessThanOrEqual(sorted[2].x + 1);
    expect(Math.min(...boxes.map(box => box.width)), JSON.stringify({ width, boxes })).toBeGreaterThanOrEqual(60);
    const textNodes = card.locator('.league-stats-metric dt, .league-stats-value, .league-stats-unit, .league-stats-team');
    const clipping = await textNodes.evaluateAll(elements => elements.map(element => ({
      text: element.textContent?.trim(),
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    })).filter(item => item.scrollWidth > item.clientWidth + 1));
    expect(clipping, `no clipped metric text at ${width}px`).toEqual([]);
  }
});

test('standings are requested only after the bar reaches the viewport', async ({ page }) => {
  const calls: string[] = [];
  /* المراقِب الحقيقي يعتمد على تمرير الصفحة (وسياق هذه الصفحة يمرّرها تلقائياً
     إلى التقويم بعد التحميل)، فيُربَط المراقِب الخاص بالقسم وحده هنا ويُطلَق
     يدوياً: بذلك يُختبَر العقد نفسه — لا طلب قبل أن يصل القسم إلى الشاشة —
     بلا ارتهان لموضع التمرير. بقية المراقِبين تعمل كما هي. */
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
        if (el instanceof Element && el.classList.contains('league-stats')) {
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
      return route.fulfill({ status: 200, headers: { 'X-Matches-Cache': 'HIT', 'X-Cache-Age': '5', 'X-Diagnostic-Code': 'OK' }, json: { events: [] } });
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
  await expect(page.locator('.league-stats')).toHaveAttribute('data-ready', 'true');
  expect(calls, 'no standings request before the bar is reached').toEqual([]);

  await page.evaluate(() => (window as unknown as { __revealStats: () => void }).__revealStats());
  await expect(page.locator('.league-stats')).toHaveAttribute('data-fetched', 'true');
  await expect.poll(() => calls.length, { timeout: 5000 }).toBe(8);
  expect(new Set(calls).size).toBe(8);
});

test('a fresh standings reading replaces the prerendered numbers and names the leading team', async ({ page }) => {
  await openHub(page, { width: 1440, height: 1000 });
  const bar = page.locator('.league-stats');
  // The prerendered snapshot is replaced by the mocked live reading:
  // Test Leader scores 8 in 2 → 4.00 per match, concedes 0 → 0.00.
  const attack = bar.locator('[data-league="eng.1"] [data-stat-metric="best-attack"]');
  await expect(attack.locator('[data-stat-value]')).toContainText('4.00');
  await expect(attack.locator('[data-stat-team]')).toHaveText('Test Leader');
  const defence = bar.locator('[data-league="eng.1"] [data-stat-metric="best-defence"]');
  await expect(defence.locator('[data-stat-value]')).toContainText('0.00');
  // Total goals: 8 + 19 × 1 = 27
  await expect(bar.locator('[data-league="eng.1"] [data-stat-metric="total-goals"] [data-stat-value]')).toContainText('27');
  // No reading line under the card: the numbers carry the value, nothing else.
  await expect(bar.locator('.league-stats-foot')).toHaveCount(0);
});

test('a failing standings reading keeps the last confirmed numbers and marks them stale', async ({ page }) => {
  await page.clock.install({ time: NOW });
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (!['localhost', '127.0.0.1'].includes(url.hostname)) return route.abort();
    if (url.pathname === '/scoreboard.php') {
      return route.fulfill({ status: 200, headers: { 'X-Matches-Cache': 'HIT', 'X-Cache-Age': '5', 'X-Diagnostic-Code': 'OK' }, json: { events: [] } });
    }
    if (url.pathname === '/standings.php') {
      return route.fulfill({ status: 503, headers: { 'X-Standings-Cache': 'BYPASS' }, json: { ok: false, code: 'UPSTREAM_TIMEOUT' } });
    }
    return route.continue();
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/matches/');
  const card = page.locator('.league-stats-card[data-league="eng.1"]');
  // The prerendered numbers survive a failed refresh; "stale" is carried on the
  // card as an attribute, not spelled out in a line under the numbers.
  await expect(card.locator('[data-stat-metric="best-attack"] [data-stat-value]')).not.toHaveText('غير متاح');
  await expect(card).toHaveAttribute('data-stat-stale', 'true');
  await expect(card.locator('.league-stats-foot')).toHaveCount(0);
});
