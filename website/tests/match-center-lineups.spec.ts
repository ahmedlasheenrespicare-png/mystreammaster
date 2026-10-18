import { test, expect, type Page } from '@playwright/test';
import { pitchLineupPayload } from './fixtures/pitch-lineups.mjs';

// Injected test data only: no new production endpoint or upstream request.
async function openMatch(page: Page, payload = pitchLineupPayload()) {
  await page.clock.install({ time: new Date('2026-10-17T15:20:00Z') });
  await page.context().route('**/*', route => {
    const url = new URL(route.request().url());
    if (!['localhost', '127.0.0.1'].includes(url.hostname)) return route.abort();
    if (url.pathname === '/match-center.php') return route.fulfill({
      status: 200, headers: { 'X-Matches-Cache': 'HIT', 'X-Cache-Age': '3' }, json: payload,
    });
    return route.continue();
  });
  await page.goto('/matches/الدوري-الإنجليزي/manchester-city-ipswich-town/');
  await expect(page.locator('.mc-score-order')).toHaveText('1–0');
}

test.use({ hasTouch: true });
for (const width of [320, 390, 768, 1200, 1440]) {
  test(`confirmed XI and linked SVG badges fit without overlap at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await openMatch(page);
    const pitch = page.locator('.mc-pitch-frame .mc-pitch-lineups');
    await expect(pitch).toBeVisible();
    const home = pitch.locator('.mc-lineup-squad[data-side="home"]');
    const away = pitch.locator('.mc-lineup-squad[data-side="away"]');
    await expect(home.locator('.mc-lineup-rows .mc-lineup-player')).toHaveCount(11);
    await expect(away.locator('.mc-lineup-rows .mc-lineup-player')).toHaveCount(11);
    const scorer = home.locator('.mc-lineup-rows [data-player-id="h10"]');
    await expect(scorer.locator('.mc-player-badge')).toHaveCount(5);
    await expect(away.locator('.mc-player-badge')).toHaveCount(0);
    await expect(pitch.locator('.mc-player-badge svg')).toHaveCount(7);
    const yellow = scorer.locator('[data-kind="yellow_card"]');
    await expect(yellow).toContainText('45+2′');
    await expect(yellow).toContainText('بطاقة صفراء');
    await expect(yellow).toHaveAttribute('aria-label', /Mock h Player Long Name 10/);
    const bench = home.locator('.mc-lineup-bench');
    await expect(bench).toContainText('خارج توزيع الأساسيين');
    await expect(bench.locator('[data-player-id="h11"] [data-kind="substitution"]')).toContainText('دخول');
    await expect(scorer.locator('[data-kind="substitution"]')).toContainText('خروج');
    await expect(bench.locator('[data-minute="90"]')).toContainText('90+3′');
    await expect(scorer.locator('[data-kind="cancelled"]')).toHaveCSS('text-decoration-line', 'line-through');
    await expect(page.locator('.mc-pitch-events')).toBeVisible();
    await expect(page.locator('.mc-pitch-lane--untimed .mc-pitch-marker')).toHaveCount(1);
    await expect(page.locator('.mc-pitch-marker[aria-label*="Delay"]')).toHaveCount(0);

    // Full bounds, containment and pairwise collision checks, including dense badges.
    const geometry = await pitch.evaluate(root => {
      const rect = (element: Element) => element.getBoundingClientRect();
      const nodes = [...root.querySelectorAll('.mc-lineup-player, .mc-player-badge')];
      const outside = nodes.filter(node => {
        const r = rect(node); const parent = rect(node.closest('.mc-lineup-player')!);
        return r.left < parent.left - 1 || r.right > parent.right + 1 || r.top < parent.top - 1 || r.bottom > parent.bottom + 1
          || r.left < -1 || r.right > innerWidth + 1;
      }).length;
      let collisions = 0;
      for (const group of root.querySelectorAll('.mc-lineup-row ul, .mc-player-badges')) {
        const children = [...group.children];
        for (let i = 0; i < children.length; i++) for (let j = i + 1; j < children.length; j++) {
          const a = rect(children[i]); const b = rect(children[j]);
          if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1
            && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) collisions++;
        }
      }
      return { outside, collisions, overflow: document.documentElement.scrollWidth > innerWidth + 1 };
    });
    expect(geometry).toEqual({ outside: 0, collisions: 0, overflow: false });

    await yellow.hover();
    await expect(page.locator('#mc-lineup-event-detail')).toContainText('45+2′');
    await yellow.focus();
    await page.keyboard.press('Enter');
    await expect(yellow).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.mc-pitch-marker[data-kind="yellow_card"]')).toHaveAttribute('data-active', 'true');
    await page.keyboard.press('Space');
    await expect(yellow).toHaveAttribute('aria-pressed', 'false');
    if (width === 390) {
      await yellow.tap();
      await expect(yellow).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('#mc-lineup-event-detail')).toContainText('بطاقة صفراء');
      await yellow.tap();
      await expect(yellow).toHaveAttribute('aria-pressed', 'false');
    }
  });
}

test('unavailable or foreign XI stays off the pitch; timeline survives', async ({ page }) => {
  const payload = pitchLineupPayload();
  payload.lineups.eventId = '401879258';
  await openMatch(page, payload);
  await expect(page.locator('.mc-pitch-lineups')).toHaveCount(0);
  await expect(page.locator('.mc-pitch-events')).toBeVisible();
});

test('print keeps the source XI and cancelled badge, with no interactive detail panel', async ({ page }) => {
  await openMatch(page);
  await expect(page.locator('.mc-pitch-lineups')).toBeVisible();
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.mc-pitch-lineups')).toBeVisible();
  await expect(page.locator('.mc-lineup-rows .mc-lineup-player')).toHaveCount(22);
  await expect(page.locator('#mc-lineup-event-detail')).toBeHidden();
  await expect(page.locator('.mc-player-badge[data-kind="cancelled"]')).toHaveCSS('text-decoration-line', 'line-through');
});
