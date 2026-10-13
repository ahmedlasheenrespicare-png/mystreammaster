import { test, expect, type Page } from '@playwright/test';

// كل الأرقام أدناه بيانات اختبار صريحة (محاكاة لاستجابة الوسيط) وليست بيانات منشورة.
const NOW = new Date('2026-10-13T19:34:00Z');

const HOME_STATISTICS = [
  { name: 'possessionPct', abbreviation: 'PP', displayValue: '58' },
  { name: 'totalShots', abbreviation: 'SHOT', displayValue: '11' },
  { name: 'shotsOnTarget', abbreviation: 'SOG', displayValue: '5' },
  { name: 'wonCorners', abbreviation: 'CW', displayValue: '6' },
  { name: 'foulsCommitted', abbreviation: 'FC', displayValue: '9' },
  { name: 'offsides', abbreviation: 'OFF', displayValue: '2' },
  { name: 'saves', abbreviation: 'SV', displayValue: '3' },
  { name: 'yellowCards', abbreviation: 'YC', displayValue: '1' },
];
// لا يحتوي بطاقات حمراء ولا دقة تمرير: يجب ألّا تُعرض صفوف لهما إطلاقًا.
const AWAY_STATISTICS = [
  { name: 'possessionPct', abbreviation: 'PP', displayValue: '42' },
  { name: 'totalShots', abbreviation: 'SHOT', displayValue: '7' },
  { name: 'shotsOnTarget', abbreviation: 'SOG', displayValue: '2' },
  { name: 'wonCorners', abbreviation: 'CW', displayValue: '3' },
  { name: 'foulsCommitted', abbreviation: 'FC', displayValue: '14' },
  { name: 'offsides', abbreviation: 'OFF', displayValue: '1' },
  { name: 'saves', abbreviation: 'SV', displayValue: '4' },
  { name: 'yellowCards', abbreviation: 'YC', displayValue: '3' },
];

function fixtureEvent(state: 'pre' | 'in' | 'post', options: { statistics?: boolean } = {}) {
  const withStatistics = options.statistics !== false;
  const home = { homeAway: 'home', score: state === 'pre' ? '0' : '2', team: { displayName: 'Atlético Madrid' } };
  const away = { homeAway: 'away', score: state === 'pre' ? '0' : '1', team: { displayName: 'Manchester United' } };
  if (withStatistics) {
    Object.assign(home, { statistics: HOME_STATISTICS });
    Object.assign(away, { statistics: AWAY_STATISTICS });
  }
  return {
    id: '900001',
    date: '2026-10-13T19:00:00Z',
    competitions: [{
      id: '900001',
      date: '2026-10-13T19:00:00Z',
      venue: { fullName: 'Riyadh Air Metropolitano' },
      competitors: [home, away],
      status: {
        displayClock: state === 'in' ? "34'" : '',
        type: {
          state,
          completed: state === 'post',
          name: state === 'in' ? 'STATUS_IN_PROGRESS' : state === 'post' ? 'STATUS_FULL_TIME' : 'STATUS_SCHEDULED',
        },
      },
    }],
  };
}

async function mockScoreboard(page: Page, options: { state?: 'pre' | 'in' | 'post'; statistics?: boolean; fail?: boolean } = {}) {
  await page.clock.install({ time: NOW });
  let fail = !!options.fail;
  let calls = 0;
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (['localhost', '127.0.0.1'].includes(url.hostname) && url.pathname === '/scoreboard.php') {
      calls++;
      if (fail) {
        return route.fulfill({
          status: 503,
          headers: { 'X-Diagnostic-Code': 'UPSTREAM_HTTP_503', 'X-Matches-Cache': 'BYPASS' },
          json: { ok: false, code: 'UPSTREAM_HTTP_503', message: 'رفض المصدر الاتصال أو تعذر استجابته' },
        });
      }
      return route.fulfill({
        status: 200,
        headers: { 'X-Matches-Cache': 'HIT', 'X-Cache-Age': '5', 'X-Diagnostic-Code': 'OK' },
        json: { events: [fixtureEvent(options.state || 'in', { statistics: options.statistics })] },
      });
    }
    return ['localhost', '127.0.0.1'].includes(url.hostname) ? route.continue() : route.abort();
  });
  return { get calls() { return calls; }, setFailure: (next: boolean) => { fail = next; } };
}

test('match page renders source statistics with correct values, bars and RTL sides', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await mockScoreboard(page, { state: 'in' });
  await page.goto('/manchester-united-atletico/');

  const panel = page.locator('#fixture-stats');
  await expect(panel.getByRole('heading', { name: 'إحصائيات المباراة' })).toBeVisible();
  await expect(page.locator('#stats-status')).toContainText('مباشر');
  await expect(page.locator('#stats-status')).toContainText('بتوقيت القاهرة');

  // الصفوف المعروضة هي المفاتيح المتوفرة في المصدر فقط: 8 صفوف.
  await expect(panel.locator('.stat-row')).toHaveCount(8);
  await expect(panel.locator('.stat-name')).toHaveCount(8);
  await expect(panel.getByText('بطاقات حمراء')).toHaveCount(0);
  await expect(panel.getByText('دقة التمرير')).toHaveCount(0);

  const possession = panel.locator('.stat-row').filter({ hasText: 'الاستحواذ' });
  await expect(possession.locator('.stat-value--home')).toHaveText('58%');
  await expect(possession.locator('.stat-value--away')).toHaveText('42%');
  expect(await possession.locator('.stat-bar-part').evaluateAll(parts => parts.map(p => (p as HTMLElement).style.width)))
    .toEqual(['58%', '42%']);

  // الفريق صاحب الأرض (أتلتيكو مدريد) على اليمين دائمًا في الصفحة العربية.
  const homeBox = await possession.locator('.stat-value--home').boundingBox();
  const awayBox = await possession.locator('.stat-value--away').boundingBox();
  expect(homeBox && awayBox && homeBox.x > awayBox.x).toBe(true);
  await expect(possession.locator('.stat-bar-part--home')).toHaveCSS('background-color', 'rgb(124, 92, 255)');

  // الأرقام تُقرأ كما أرسلها المصدر بلا استنتاج أو تصحيح.
  const shots = panel.locator('.stat-row').filter({ hasText: 'التسديدات' }).first();
  await expect(shots.locator('.stat-value--home')).toHaveText('11');
  await expect(shots.locator('.stat-value--away')).toHaveText('7');
  const fouls = panel.locator('.stat-row').filter({ hasText: 'الأخطاء' });
  await expect(fouls.locator('.stat-value--home')).toHaveText('9');
  await expect(fouls.locator('.stat-value--away')).toHaveText('14');
  await expect(page.locator('#fixture-stats')).toHaveAttribute('data-state', 'live');

  expect(errors).toEqual([]);
});

test('before kick-off no numbers are shown, only the pending explanation', async ({ page }) => {
  await mockScoreboard(page, { state: 'pre' });
  await page.goto('/manchester-united-atletico/');
  const panel = page.locator('#fixture-stats');
  await expect(panel.locator('.stat-row')).toHaveCount(0);
  await expect(panel.locator('.stat-value')).toHaveCount(0);
  await expect(panel.locator('.stats-empty')).toContainText('مع انطلاق اللقاء');
  await expect(page.locator('#stats-status')).toContainText('لم تنطلق المباراة بعد');
  await expect(panel).toHaveAttribute('data-state', 'pending');
});

test('a live match without published statistics is reported as unavailable, never invented', async ({ page }) => {
  await mockScoreboard(page, { state: 'in', statistics: false });
  await page.goto('/manchester-united-atletico/');
  const panel = page.locator('#fixture-stats');
  await expect(panel.locator('.stat-row')).toHaveCount(0);
  await expect(panel.locator('.stats-empty')).toContainText('لم يرسل مصدر النتائج أي أرقام إحصائية');
  await expect(page.locator('#stats-status')).toContainText('لا تتوفر إحصائيات من المصدر');
  await expect(panel.locator('.stat-bar')).toHaveCount(0);
});

test('an upstream failure keeps the last confirmed numbers and flags them as stale', async ({ page }) => {
  const source = await mockScoreboard(page, { state: 'in' });
  await page.goto('/manchester-united-atletico/');
  const panel = page.locator('#fixture-stats');
  await expect(panel.locator('.stat-row')).toHaveCount(8);
  source.setFailure(true);
  await page.clock.fastForward(60_000);
  await expect(panel.locator('.stat-row')).toHaveCount(8);
  await expect(page.locator('#stats-status')).toContainText('تعذر التحديث');
  await expect(panel).toHaveAttribute('data-state', 'stale');
  await expect(panel.locator('.stat-row').filter({ hasText: 'الاستحواذ' }).locator('.stat-value--home')).toHaveText('58%');
});

test('stats panel never exceeds the viewport width on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockScoreboard(page, { state: 'in' });
  await page.goto('/manchester-united-atletico/');
  await expect(page.locator('#fixture-stats .stat-row')).toHaveCount(8);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const panelBox = await page.locator('#fixture-stats').boundingBox();
  expect(panelBox && panelBox.x >= 0 && panelBox.x + panelBox.width <= 390).toBe(true);
});
