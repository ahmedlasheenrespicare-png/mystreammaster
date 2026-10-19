import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { STAT_GROUPS, type StatPair } from '../src/lib/match-center.mjs';

/* The real page is hydrated with one intercepted match-center.php reading.
   The full 28-key set plus an unknown source row makes silent omissions visible. */
const MATCH = 'manchester-city-ipswich-town';
const HOME = 'مانشستر سيتي';
const AWAY = 'إيبسويتش تاون';
const SHOTS = fileURLToPath(new URL('../docs/match-center-shots/', import.meta.url));
const format = (value: number) => new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 2 }).format(value);
const labels: Record<string, string> = {
  possessionPct: 'الاستحواذ', passPct: 'دقة التمرير', totalShots: 'التسديدات',
  shotsOnTarget: 'على المرمى', wonCorners: 'الركنيات', saves: 'التصديات',
  foulsCommitted: 'الأخطاء', yellowCards: 'بطاقات صفراء', redCards: 'بطاقات حمراء',
};
const statistics: StatPair[] = [
  ...STAT_GROUPS.flatMap(group => group.keys).map((key, i) => ({
    key, label: labels[key] ?? `صف ${i + 1}`, unit: key.endsWith('Pct') ? '%' : '',
    home: i + 4, away: i + 2,
  })),
  { key: 'distanceKm', label: 'المسافة المقطوعة', unit: 'كم', home: 108.25, away: 104.5 },
  { key: 'notSent', label: 'صف بلا رقمين', unit: '', home: null, away: null },
].map(row => {
  const values: Record<string, [number | null, number | null]> = {
    possessionPct: [58.75, 40.25], passPct: [86.33, null],
    totalShots: [11, 7], shotsOnTarget: [5, 0], wonCorners: [6, 3],
    saves: [0, 0], foulsCommitted: [9, 14], yellowCards: [1, 3], redCards: [null, 1],
  };
  const pair = values[row.key];
  return pair ? { ...row, home: pair[0], away: pair[1] } : row;
});

function payload(phase: 'live' | 'post', readAt: string, rows: StatPair[] = statistics) {
  return {
    provider: 'espn', match: MATCH, event: '401879259', readAt, cache: 'HIT',
    status: phase === 'live'
      ? { type: { name: 'STATUS_IN_PROGRESS', state: 'in', completed: false }, displayClock: "67'" }
      : { type: { name: 'STATUS_FULL_TIME', state: 'post', completed: true }, displayClock: "90'" },
    score: { home: 1, away: 2 }, events: [], statistics: rows, lineups: null,
    ratings: null, h2h: [], form: null, venue: 'Etihad Stadium',
  };
}

test.beforeEach(() => test.setTimeout(90_000));

async function openMatch(page, getBody: () => ReturnType<typeof payload>) {
  await page.clock.install({ time: new Date('2026-10-17T15:20:00Z') });
  await page.context().route('**/match-center.php*', route => route.fulfill({
    status: 200,
    headers: { 'X-Matches-Cache': 'HIT', 'X-Cache-Age': '4', 'Content-Type': 'application/json' },
    json: getBody(),
  }));
  await page.goto(`/matches/الدوري-الإنجليزي/${MATCH}/`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.mc-pitch-statusline')).toBeVisible({ timeout: 30_000 });
}

// The live snapshot polls once a minute; exercise that timer instead of a
// manual refresh button so removing the button cannot stop updates unnoticed.
async function nextAutomaticRead(page: Page) {
  await page.clock.fastForward(60_000);
}

function sourceCard(page, tab: string, key: string) {
  return page.locator(`#mc-panel-${tab} .mc-stat-card[data-stat-key="${key}"]`);
}

async function boardValues(page, scope: string) {
  return page.locator(`${scope} .mc-indexboard-row`).evaluateAll(nodes => nodes.map(node => ({
    label: node.querySelector('.mc-stat-card-title')?.textContent?.trim(),
    home: node.querySelector('[data-side="home"] .mc-stat-card-number')?.textContent,
    away: node.querySelector('[data-side="away"] .mc-stat-card-number')?.textContent,
    widths: [...node.querySelectorAll('.mc-stat-card-fill')].map(el => (el as HTMLElement).style.inlineSize),
  })));
}

async function expectSameBoard(page, tab: string) {
  const onPitch = await boardValues(page, '.mc-pitch-index');
  const inTab = await boardValues(page, `#mc-panel-${tab} .mc-indexboard`);
  expect(onPitch).toEqual(inTab);
  return onPitch;
}

test('every received row has exactly one possession-style card in both phases', async ({ page }) => {
  for (const phase of ['live', 'post'] as const) {
    const tab = phase === 'live' ? 'live' : 'postmatch';
    const body = payload(phase, '2026-10-17T15:19:20Z');
    await openMatch(page, () => body);
    await expect(page.locator(`#mc-panel-${tab}`)).toBeVisible();
    await expect(page.locator('.mc-meta, .mc-read, .mc-refresh')).toHaveCount(0);
    await expect(page.locator('.mc-page').getByRole('button', { name: /تحديث الآن/ })).toHaveCount(0);
    await expect(page.locator('.mc-page')).not.toContainText('محدَّث الآن');
    await expect(page.locator('.mc-doc[data-doc="read"]')).not.toContainText('زر «تحديث الآن»');
    const rendered = page.locator(`#mc-panel-${tab} .mc-stat-card[data-stat-key]`);
    await expect(rendered).toHaveCount(statistics.length - 1); // only null/null is absent
    await expect(sourceCard(page, tab, 'notSent')).toHaveCount(0);
    await expect(sourceCard(page, tab, 'possessionPct')).toHaveCount(1); // no duplicate inside its group
    await expect(page.locator(`#mc-panel-${tab} .mc-stat-groups > .mc-possession`)).toBeVisible();

    for (const row of statistics.filter(row => row.key !== 'notSent')) {
      const card = sourceCard(page, tab, row.key);
      await expect(card, row.key).toHaveCount(1);
      await expect(card.locator('.mc-stat-card-title')).toHaveText(row.label);
      for (const side of ['home', 'away'] as const) {
        const value = row[side];
        const sideElement = card.locator(`.mc-stat-card-side[data-side="${side}"]`);
        if (value === null) {
          await expect(sideElement.locator('.mc-stat-card-none')).toHaveText('غير متاح');
          await expect(sideElement.locator('.mc-stat-card-number')).toHaveCount(0);
        } else {
          await expect(sideElement.locator('.mc-stat-card-number')).toHaveText(
            `${format(value)}${row.unit === '%' ? '%' : row.unit ? ` ${row.unit}` : ''}`,
          );
        }
      }
      await expect(card.locator('.mc-stat-card-bar')).toHaveCount(row.home !== null && row.away !== null ? 1 : 0);
      if (row.home !== null && row.away !== null) {
        await expect(card.locator('.mc-stat-card-bar')).toHaveAttribute('aria-hidden', 'true');
        await expect(card.locator('.mc-stat-card-fill')).toHaveCount(2);
      }
    }
    const shots = sourceCard(page, tab, 'totalShots');
    const widths = await shots.locator('.mc-stat-card-fill').evaluateAll(parts => parts.map(part => part.getBoundingClientRect().width));
    expect(widths[0] / (widths[0] + widths[1])).toBeCloseTo(11 / 18, 2);
    await expect(sourceCard(page, tab, 'possessionPct')).toContainText('الفارق ١٨٫٥ نقطة مئوية');
    await expect(sourceCard(page, tab, 'foulsCommitted')).toContainText(`الفارق ٥ — الأعلى رقمياً: ${AWAY}`);
    const words = (await rendered.allTextContents()).join(' ');
    expect(words).not.toMatch(/أفضل|سيطرة|أفضلية|يتفوق/);
    await expectSameBoard(page, tab);
    await page.context().unroute('**/match-center.php*');
  }
});

test('missing pairs never create cards, a single side never creates a split, real 0/0 is half and half', async ({ page }) => {
  const onlyMissing: StatPair[] = [{ key: 'possessionPct', label: 'الاستحواذ', unit: '%', home: null, away: null }];
  let body = payload('live', '2026-10-17T15:19:20Z', onlyMissing);
  await openMatch(page, () => body);
  await expect(page.locator('.mc-stat-groups, .mc-stat-card, .mc-pitch-index')).toHaveCount(0);

  body = payload('live', '2026-10-17T15:21:00Z', [
    { key: 'possessionPct', label: 'الاستحواذ', unit: '%', home: 0, away: null },
    { key: 'passPct', label: 'دقة التمرير', unit: '%', home: null, away: 79.5 },
    { key: 'redCards', label: 'بطاقات حمراء', unit: '', home: null, away: 0 },
    { key: 'saves', label: 'التصديات', unit: '', home: 0, away: 0 },
  ]);
  await nextAutomaticRead(page);
  const tab = '#mc-panel-live';
  await expect(page.locator(`${tab} .mc-stat-card[data-stat-key]`)).toHaveCount(4);
  for (const key of ['possessionPct', 'passPct', 'redCards']) {
    const card = sourceCard(page, 'live', key);
    await expect(card.locator('.mc-stat-card-bar, .mc-stat-card-fill')).toHaveCount(0);
    await expect(card.locator('.mc-stat-card-none')).toHaveCount(1);
    await expect(card.locator('.mc-stat-card-difference')).toHaveCount(0);
  }
  await expect(sourceCard(page, 'live', 'possessionPct').locator('.mc-stat-card-number')).toHaveText('٠%');
  await expect(sourceCard(page, 'live', 'passPct').locator('.mc-stat-card-number')).toHaveText('٧٩٫٥%');
  await expect(sourceCard(page, 'live', 'redCards').locator('.mc-stat-card-number')).toHaveText('٠');
  const saves = sourceCard(page, 'live', 'saves');
  await expect(saves.locator('.mc-stat-card-number')).toHaveText(['٠', '٠']);
  await expect(saves.locator('.mc-stat-card-difference')).toHaveText('متساويان');
  await expect(saves.locator('.mc-stat-card-fill')).toHaveCount(2);
  expect(await saves.locator('.mc-stat-card-fill').evaluateAll(nodes => nodes.map(n => (n as HTMLElement).style.inlineSize))).toEqual(['50%', '50%']);
  // Existing index arithmetic excludes single-sided rows; the goalkeeping 0/0 contributes 50/50.
  await expect(page.locator(`${tab} .mc-stat-index`)).toHaveCount(1);
  await expect(page.locator(`${tab} .mc-stat-index`)).toContainText('صفر/صفر');
  const board = await expectSameBoard(page, 'live');
  expect(board).toHaveLength(1);
  expect(board[0].home).toBe('٥٠%');
  await expect(page.locator('.mc-pitch-index .mc-stat-card-bar')).toHaveCount(1);
});

test('pitch cards refresh from the same live reading and keep the final numbers and links', async ({ page }) => {
  let body = payload('live', '2026-10-17T15:19:20Z');
  let requests = 0;
  await openMatch(page, () => { requests++; return body; });
  await expect(page.locator('.mc-pitch-index .mc-indexboard-row')).toHaveCount(7);
  const first = await expectSameBoard(page, 'live');
  await page.locator('.mc-pitch-index .mc-indexboard-row').first().locator('a').click();
  await expect(page).toHaveURL(/#live-statgroup-possession-passing$/);
  await expect(page.locator('#live-statgroup-possession-passing')).toBeVisible();

  const changed = statistics.map(row => row.key === 'possessionPct' ? { ...row, home: 30, away: 70 } : row);
  body = payload('live', '2026-10-17T15:21:00Z', changed);
  await nextAutomaticRead(page);
  await expect(sourceCard(page, 'live', 'possessionPct').locator('.mc-stat-card-number')).toHaveText(['٣٠%', '٧٠%']);
  const second = await expectSameBoard(page, 'live');
  expect(second[0].home).not.toBe(first[0].home);
  expect(requests).toBe(2); // one request per snapshot, not one request per card/board

  body = payload('post', '2026-10-17T15:22:00Z', changed);
  await nextAutomaticRead(page);
  await expect(page.locator('#mc-panel-postmatch')).toBeVisible();
  await expect(page.locator('#mc-tab-live')).toHaveCount(0);
  const final = await expectSameBoard(page, 'postmatch');
  expect(final).toEqual(second);
  await page.locator('.mc-pitch-index .mc-indexboard-row').last().locator('a').click();
  await expect(page).toHaveURL(/#analysis-statgroup-source-other$/);
  await expect(page.locator('#analysis-statgroup-source-other')).toBeVisible();
  expect(requests).toBe(3);
});

test('cards fit 320–1440px and print on white with the two specified ink colors', async ({ page }) => {
  const body = payload('live', '2026-10-17T15:19:20Z');
  await openMatch(page, () => body);
  for (const width of [320, 390, 768, 1200, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const overflow = await page.evaluate(() => {
      const viewport = document.documentElement.clientWidth;
      const elements = document.querySelectorAll('.mc-stat-card, .mc-stat-card-head, .mc-stat-card-bar, .mc-pitch-index, .mc-panel');
      return {
        page: document.documentElement.scrollWidth - viewport,
        outside: [...elements].filter(node => {
          const rect = node.getBoundingClientRect();
          return rect.width && (rect.left < -1 || rect.right > viewport + 1 || node.scrollWidth > node.clientWidth + 1);
        }).map(node => node.className),
      };
    });
    expect(overflow, `${width}px`).toEqual({ page: 0, outside: [] });
  }
  await page.emulateMedia({ media: 'print' });
  const styles = await sourceCard(page, 'live', 'totalShots').evaluate(card => {
    const side = (side: string) => card.querySelector<HTMLElement>(`.mc-stat-card-side[data-side="${side}"] .mc-stat-card-number`)!;
    const fill = (side: string) => card.querySelector<HTMLElement>(`.mc-stat-card-fill[data-side="${side}"]`)!;
    return {
      background: getComputedStyle(card).backgroundColor,
      home: getComputedStyle(side('home')).color, away: getComputedStyle(side('away')).color,
      homeBar: getComputedStyle(fill('home')).backgroundColor, awayBar: getComputedStyle(fill('away')).backgroundColor,
    };
  });
  expect(styles).toEqual({
    background: 'rgb(255, 255, 255)', home: 'rgb(59, 42, 122)', away: 'rgb(31, 107, 46)',
    homeBar: 'rgb(59, 42, 122)', awayBar: 'rgb(31, 107, 46)',
  });
  await expect(page.locator('.mc-pitch-index .mc-stat-card-fill[data-side="home"]').first()).toHaveCSS('background-color', 'rgb(59, 42, 122)');
});

test('verification screenshots: live, after the match and the pitch', async ({ page }) => {
  await mkdir(SHOTS, { recursive: true });
  // Fixed site navigation can overlay tall element screenshots after scrolling;
  // hide that chrome via a persistent test-only stylesheet while capturing.
  let body = payload('live', '2026-10-17T15:19:20Z');
  await openMatch(page, () => body);
  await page.addStyleTag({ content: '.storefront-header, .fixed.top-0, .mc-mini, .floating-actions { display: none !important; }' });
  await expect(page.locator('#mc-panel-live .mc-stat-card[data-stat-key]')).toHaveCount(statistics.length - 1);
  await page.locator('#mc-panel-live').screenshot({ path: `${SHOTS}/unified-stats-live.png` });
  await page.locator('.mc-pitch-frame').screenshot({ path: `${SHOTS}/unified-stats-pitch.png` });
  body = payload('post', '2026-10-17T15:21:00Z');
  await nextAutomaticRead(page);
  await expect(page.locator('#mc-panel-postmatch .mc-stat-card[data-stat-key]')).toHaveCount(statistics.length - 1);
  await page.locator('#mc-panel-postmatch').screenshot({ path: `${SHOTS}/unified-stats-postmatch.png` });
});

/** Chromium wraps/repeats pixels above ~8k px in a single capture. Stitch
    viewport-sized screenshots in a browser canvas instead; no added library or
    extra provider. The fixed site navigation appears only in the first tile. */
async function captureEntirePage(page: Page, filename: string) {
  const width = 1440;
  const step = 900;
  const height = await page.evaluate(() => Math.ceil(document.documentElement.scrollHeight));
  const tiles: { png: string; y: number; sourceY: number; height: number }[] = [];
  let hiddenChrome: Awaited<ReturnType<Page['addStyleTag']>> | null = null;
  for (let y = 0; y < height; y += step) {
    if (y === step) {
      hiddenChrome = await page.addStyleTag({ content: '.storefront-header, .fixed.top-0, .mc-mini, .floating-actions { visibility: hidden !important; }' });
    }
    const actualY = await page.evaluate(top => {
      document.documentElement.style.scrollBehavior = 'auto';
      window.scrollTo({ top, behavior: 'instant' });
      return window.scrollY;
    }, y);
    const png = await page.screenshot({ animations: 'disabled' });
    tiles.push({ png: png.toString('base64'), y, sourceY: y - actualY, height: Math.min(step, height - y) });
  }
  const base64 = await page.evaluate(async ({ width, height, tiles }) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Unable to stitch full-page screenshot');
    for (const tile of tiles) {
      const bytes = Uint8Array.from(atob(tile.png), char => char.charCodeAt(0));
      const image = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
      context.drawImage(image, 0, tile.sourceY, width, tile.height, 0, tile.y, width, tile.height);
      image.close();
    }
    return canvas.toDataURL('image/png').split(',')[1];
  }, { width, height, tiles });
  await writeFile(`${SHOTS}/${filename}`, Buffer.from(base64, 'base64'));
  if (hiddenChrome) await hiddenChrome.evaluate(el => el.remove());
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
}

test('full-page verification screenshots: live and after the match', async ({ page }) => {
  test.setTimeout(180_000);
  await mkdir(SHOTS, { recursive: true });
  let body = payload('live', '2026-10-17T15:19:20Z');
  await openMatch(page, () => body);
  await expect(page.locator('#mc-panel-live .mc-stat-card[data-stat-key]')).toHaveCount(statistics.length - 1);
  await captureEntirePage(page, 'unified-full-live.png');

  body = payload('post', '2026-10-17T15:21:00Z');
  await nextAutomaticRead(page);
  await expect(page.locator('#mc-panel-postmatch .mc-stat-card[data-stat-key]')).toHaveCount(statistics.length - 1);
  await captureEntirePage(page, 'unified-full-postmatch.png');
});
