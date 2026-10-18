import { test, expect } from '@playwright/test';

const MATCH = 'manchester-city-ipswich-town';
const fixtureEvents = [
  { id: 'goal-home', type: 'Goal', minute: 12, extraMinute: null, period: 1, side: 'home', player: { id: 'h1', name: 'Home Scorer' }, team: { name: 'Home FC', homeAway: 'home' }, detail: null },
  { id: 'card-yellow', type: 'Yellow Card', minute: 31, extraMinute: null, period: 1, side: 'away', player: { id: 'a1', name: 'Away Player' }, team: { name: 'Away FC', homeAway: 'away' }, detail: null },
  { id: 'own-goal', type: 'Own Goal', minute: 45, extraMinute: 2, period: 1, side: 'away', player: { id: 'a2', name: 'Away Defender' }, team: { name: 'Away FC', homeAway: 'away' }, detail: 'Own Goal' },
  // ESPN logs each stoppage twice (one per team) and then its end. They must
  // never reach the timeline, not even as an English «other» row.
  { id: 'delay-start-home', type: 'Start Delay', minute: 49, extraMinute: null, period: 2, side: 'home', player: null, team: null, detail: null },
  { id: 'delay-start-away', type: 'Start Delay', minute: 49, extraMinute: null, period: 2, side: 'away', player: null, team: null, detail: null },
  { id: 'delay-end', type: 'End Delay', minute: 50, extraMinute: null, period: 2, side: 'home', player: null, team: null, detail: null },
  { id: 'var-review', type: 'VAR Confirmed', minute: 55, extraMinute: null, period: 2, side: 'home', player: { id: 'h2', name: 'Home Player' }, team: { name: 'Home FC', homeAway: 'home' }, detail: 'Goal confirmed' },
  { id: 'substitution', type: 'Substitution', minute: 60, extraMinute: null, period: 2, side: 'away', player: { id: 'a3', name: 'Incoming Player' }, assist: { id: 'a4', name: 'Outgoing Player' }, team: { name: 'Away FC', homeAway: 'away' }, detail: 'Substitution' },
  { id: 'card-red', type: 'Red Card', minute: 60, extraMinute: null, period: 2, side: 'home', player: { id: 'h3', name: 'Home Player Two' }, team: { name: 'Home FC', homeAway: 'home' }, detail: null },
  { id: 'goal-cancelled', type: 'Goal', minute: 66, extraMinute: null, period: 2, side: 'away', cancelled: true, player: { id: 'a6', name: 'Away Scorer' }, team: { name: 'Away FC', homeAway: 'away' }, detail: null },
  { id: 'unknown', type: 'Possession sequence', minute: 81, extraMinute: null, period: 2, side: 'away', player: { id: 'a5', name: 'Away Player Two' }, team: { name: 'Away FC', homeAway: 'away' }, detail: 'Possession sequence' },
  { id: 'untimed', type: 'Tactical review', minute: null, extraMinute: null, period: null, side: null, player: null, team: null, detail: 'Coach review' },
];
const drawnEvents = fixtureEvents.filter(event => !String(event.type).toLowerCase().includes('delay'));

test('events sit on the pitch as symbols by minute and team, with delays filtered and details on focus', async ({ page }) => {
  /* مهلة الاختبار أوسع من مهلة الانتظار: على آلة مثقلة يسبق الترطيبُ القراءة،
     والفحص قبل هبوطها يُسقط اختباراً بواجهة سليمة (كما في
     `match-center-analysis.spec.ts` الذي يضبط 90 ثانية). */
  test.setTimeout(90_000);
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
  /* لا فحص قبل هبوط القراءة: الشريط لا يُرسم إلا بعد الترطيب، ومهلة الخمس
     ثوان الافتراضية تُسقط الاختبار على آلة مثقلة وواجهةٌ سليمة — كما في
     `match-center-analysis.spec.ts` الذي ينتظر علامة القراءة نفسها. */
  await expect(page.locator('.mc-pitch-statusline')).toBeVisible({ timeout: 30_000 });
  const timeline = page.locator('.mc-pitch-events');
  await expect(timeline).toBeVisible();
  // The band lives inside the pitch frame, not in a separate list below it.
  await expect(page.locator('.mc-pitch-frame .mc-pitch-events')).toHaveCount(1);
  await expect(page.locator('.mc-event-rail')).toHaveCount(0);
  await expect(page.locator('.mc-pitch-score')).toHaveAttribute('aria-label', 'نتيجة المضيف 1، ثم الضيف 2');
  await expect(page.locator('.mc-score-order')).toHaveText('1–2');

  // Delays are filtered before rendering: no marker, no English text anywhere.
  await expect(timeline.locator('.mc-pitch-marker')).toHaveCount(drawnEvents.length);
  await expect(page.locator('.mc-pitch-marker[aria-label*="Delay"]')).toHaveCount(0);
  await expect(page.getByText('Start Delay')).toHaveCount(0);
  await expect(page.getByText('End Delay')).toHaveCount(0);

  // Symbols are shapes by meaning, not text labels or colour alone.
  await expect(page.locator('.mc-pitch-marker[data-kind="goal"][data-symbol="ball"]')).toHaveCount(1);
  await expect(page.locator('.mc-pitch-marker[data-kind="yellow_card"][data-symbol="yellow-card"]')).toHaveCount(1);
  await expect(page.locator('.mc-pitch-marker[data-kind="red_card"][data-symbol="red-card"]')).toHaveCount(1);
  await expect(page.locator('.mc-pitch-marker[data-kind="substitution"][data-symbol="substitution"]')).toHaveCount(1);
  await expect(page.locator('.mc-pitch-marker[data-kind="var_confirmed"][data-symbol="var"]')).toHaveCount(1);
  await expect(page.locator('.mc-pitch-marker[data-symbol="own-goal"]')).toHaveCount(1);
  await expect(page.locator('.mc-pitch-lane--away .mc-pitch-marker[data-symbol="other"]')).toHaveCount(1);
  await expect(page.locator('.mc-pitch-marker[data-kind="cancelled"]')).toHaveAttribute('aria-label', /ملغى من المصدر/);
  await expect(page.locator('.mc-pitch-axis .mc-pitch-tick')).toHaveCount(7);

  // Every marker carries the full sentence for screen readers.
  for (const label of await timeline.locator('.mc-pitch-marker').evaluateAll(items => items.map(item => item.getAttribute('aria-label') || ''))) {
    expect(label.trim().length).toBeGreaterThan(0);
  }

  // Hovering a card shows its minute, type and player in the detail line.
  await page.locator('.mc-pitch-marker[data-kind="yellow_card"]').hover();
  await expect(page.locator('.mc-pitch-event-detail')).toContainText('بطاقة صفراء');
  await expect(page.locator('.mc-pitch-event-detail')).toContainText('31′');
  await expect(page.locator('.mc-pitch-event-detail')).toContainText('Away Player');

  // Keyboard focus exposes the substitution's related player.
  await page.locator('.mc-pitch-marker[data-kind="substitution"]').focus();
  await expect(page.locator('.mc-pitch-event-detail')).toContainText('لاعب مرتبط: Outgoing Player');

  // An event with no minute stays outside the timeline, still tappable/focusable.
  const untimed = page.locator('.mc-pitch-lane--untimed .mc-pitch-marker');
  await expect(untimed).toHaveCount(1);
  await untimed.focus();
  await expect(page.locator('.mc-pitch-event-detail')).toContainText('Coach review');
  await expect(page.locator('.mc-pitch-event-detail')).not.toContainText('′');

  // RTL: minute 12 is to the right of minute 31, which is to the right of 45+2.
  const x12 = await page.locator('.mc-pitch-marker[data-minute="12"]').boundingBox();
  const x31 = await page.locator('.mc-pitch-marker[data-minute="31"]').boundingBox();
  const x45 = await page.locator('.mc-pitch-marker[data-minute="45"]').boundingBox();
  if (x12 && x31 && x45) {
    expect(x12.x).toBeGreaterThan(x31.x);
    expect(x31.x).toBeGreaterThan(x45.x);
  }
  expect(requests).toHaveLength(1);

  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(timeline).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `no horizontal overflow at ${width}px`).toBe(true);
    const eventBox = await timeline.boundingBox();
    expect(eventBox?.width).toBeLessThanOrEqual(width);

    // Home still sits on the right of the scoreboard (RTL), away on the left.
    const homeTeamBox = await page.locator('.mc-pitch-team--home').boundingBox();
    const awayTeamBox = await page.locator('.mc-pitch-team--away').boundingBox();
    if (homeTeamBox && awayTeamBox) {
      expect(homeTeamBox.x).toBeGreaterThan(awayTeamBox.x);
    }
  }
});
