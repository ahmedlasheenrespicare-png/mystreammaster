import { test, expect } from '@playwright/test';

const MATCH = 'manchester-city-ipswich-town';
const fixtureEvents = [
  { id: 'goal-home', type: 'Goal', minute: 12, extraMinute: null, period: 1, side: 'home', player: { id: 'h1', name: 'Home Scorer' }, team: { name: 'Home FC', homeAway: 'home' }, detail: null },
  { id: 'card-yellow', type: 'Yellow Card', minute: 31, extraMinute: null, period: 1, side: 'away', player: { id: 'a1', name: 'Away Player' }, team: { name: 'Away FC', homeAway: 'away' }, detail: null },
  { id: 'own-goal', type: 'Own Goal', minute: 45, extraMinute: 2, period: 1, side: 'away', player: { id: 'a2', name: 'Away Defender' }, team: { name: 'Away FC', homeAway: 'away' }, detail: 'Own Goal' },
  { id: 'var-review', type: 'VAR Confirmed', minute: 55, extraMinute: null, period: 2, side: 'home', player: { id: 'h2', name: 'Home Player' }, team: { name: 'Home FC', homeAway: 'home' }, detail: 'Goal confirmed' },
  { id: 'substitution', type: 'Substitution', minute: 60, extraMinute: null, period: 2, side: 'away', player: { id: 'a3', name: 'Incoming Player' }, assist: { id: 'a4', name: 'Outgoing Player' }, team: { name: 'Away FC', homeAway: 'away' }, detail: 'Substitution' },
  { id: 'card-red', type: 'Red Card', minute: 60, extraMinute: null, period: 2, side: 'home', player: { id: 'h3', name: 'Home Player Two' }, team: { name: 'Home FC', homeAway: 'home' }, detail: null },
  { id: 'goal-cancelled', type: 'Goal', minute: 66, extraMinute: null, period: 2, side: 'away', cancelled: true, player: { id: 'a6', name: 'Away Scorer' }, team: { name: 'Away FC', homeAway: 'away' }, detail: null },
  { id: 'unknown', type: 'Possession sequence', minute: 81, extraMinute: null, period: 2, side: 'away', player: { id: 'a5', name: 'Away Player Two' }, team: { name: 'Away FC', homeAway: 'away' }, detail: 'Possession sequence' },
  { id: 'untimed', type: 'Tactical review', minute: null, extraMinute: null, period: null, side: null, player: null, team: null, detail: 'Coach review' },
];

test('one shared snapshot renders an ordered, accessible event rail and stable home-away score at target widths', async ({ page }) => {
  const requests: string[] = [];
  await page.clock.install({ time: new Date('2026-10-17T15:00:00Z') });
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (!['localhost', '127.0.0.1'].includes(url.hostname)) return route.abort();
    if (url.pathname === '/match-center.php') {
      requests.push(url.pathname + url.search);
      return route.fulfill({
        status: 200,
        headers: { 'X-Matches-Cache': 'HIT', 'X-Cache-Age': '3' },
        json: {
          provider: 'espn', match: MATCH, event: '401879259', readAt: '2026-10-17T14:32:11Z', cache: 'HIT',
          status: { type: { name: 'STATUS_IN_PROGRESS', state: 'in', completed: false }, displayClock: '62:00' },
          score: { home: 1, away: 2 }, events: fixtureEvents,
          statistics: null, lineups: null, ratings: null, h2h: [], form: null, venue: null,
        },
      });
    }
    return route.continue();
  });

  await page.goto(`/matches/الدوري-الإنجليزي/${MATCH}/`);
  const rail = page.locator('.mc-event-rail');
  await expect(rail).toBeVisible();
  await expect(page.locator('.mc-pitch-score')).toHaveAttribute('aria-label', 'نتيجة المضيف 1، ثم الضيف 2');
  await expect(page.locator('.mc-score-order')).toHaveText('1–2');
  await expect(rail.locator('.mc-pitch-event')).toHaveCount(fixtureEvents.length);
  await expect(rail.getByText('بطاقة صفراء')).toBeVisible();
  await expect(rail.getByText('بطاقة حمراء')).toBeVisible();
  await expect(rail.getByText('هدف عكسي')).toBeVisible();
  await expect(rail.getByText(/مراجعة فيديو — تأكيد/)).toBeVisible();
  await expect(rail.getByText(/Possession sequence/)).toBeVisible();
  await expect(rail.getByText(/لاعب مرتبط: Outgoing Player/)).toBeVisible();
  await expect(rail.locator('.mc-pitch-event[data-kind="cancelled"]')).toContainText('ملغى من المصدر');
  await expect(rail.getByText(/Tactical review/)).toBeVisible();
  await expect(rail.getByText(/Coach review/)).toBeVisible();
  const untimed = rail.locator('.mc-pitch-event').filter({ hasText: 'Coach review' });
  await expect(untimed).not.toContainText('′');
  const labels = await rail.locator('.mc-pitch-event').evaluateAll(items => items.map(item => item.textContent || ''));
  expect(labels.findIndex(text => text.includes('12′'))).toBeLessThan(labels.findIndex(text => text.includes('31′')));
  expect(labels.findIndex(text => text.includes('45+2′'))).toBeLessThan(labels.findIndex(text => text.includes('55′')));
  expect(labels.filter(text => text.includes('60′'))).toHaveLength(2);
  expect(requests).toHaveLength(1);

  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(rail).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `no horizontal overflow at ${width}px`).toBe(true);
    const eventBox = await rail.boundingBox();
    expect(eventBox?.width).toBeLessThanOrEqual(width);
  }
});
