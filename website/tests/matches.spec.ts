import { test, expect, type Page } from '@playwright/test';

// All upstream responses below are explicit test fixtures, never published data.
const NOW = new Date('2026-10-13T12:00:00Z');
function event(id: string, date: string, state = 'pre', score = '0') {
  return { id, date, competitions: [{ competitors: [
    { homeAway: 'home', score, team: { displayName: 'Home United' } },
    { homeAway: 'away', score: '0', team: { displayName: 'Away City' } },
  ], status: { displayClock: "67′", type: { state, completed: state === 'post', name: state === 'in' ? 'STATUS_IN_PROGRESS' : state === 'post' ? 'STATUS_FULL_TIME' : 'STATUS_SCHEDULED' } } }] };
}
async function mockSource(page: Page, options: { fail?: boolean; partial?: boolean; empty?: boolean; stale?: boolean; code?: string } = {}) {
  await page.clock.install({ time: NOW });
  let score = 1;
  let calls = 0;
  let fail = !!options.fail;
  let code = options.code || 'UPSTREAM_HTTP_503';
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (['localhost', '127.0.0.1'].includes(url.hostname) && url.pathname === '/scoreboard.php') {
      const league = url.searchParams.get('league') || '';
      calls++;
      if (fail || options.partial && league === 'sau.1') {
        return route.fulfill({
          status: 503,
          headers: { 'X-Diagnostic-Code': code, 'X-Matches-Cache': 'BYPASS' },
          json: { ok: false, code, message: 'رفض المصدر الاتصال أو تعذر استجابته' },
        });
      }
      const events = options.empty || league !== 'eng.1' ? [] : [event('1', '2026-10-13T16:00:00Z', 'pre'), event('2', '2026-10-13T11:00:00Z', 'in', String(score)), event('3', '2026-10-13T22:30:00Z', 'post'), event('4', '2026-10-14T01:00:00Z', 'pre')];
      if (options.stale && league === 'eng.1') {
        return route.fulfill({
          status: 200,
          headers: { 'X-Matches-Cache': 'STALE', 'X-Cache-Age': '120', 'X-Diagnostic-Code': 'UPSTREAM_TIMEOUT' },
          json: { events },
        });
      }
      return route.fulfill({
        status: 200,
        headers: { 'X-Matches-Cache': 'HIT', 'X-Cache-Age': '5', 'X-Diagnostic-Code': 'OK' },
        json: { events },
      });
    }
    return ['localhost', '127.0.0.1'].includes(url.hostname) ? route.continue() : route.abort();
  });
  return { get calls() { return calls; }, setScore: (next: number) => { score = next; }, setFailure: (next: boolean, nextCode = code) => { fail = next; code = nextCode; } };
}

test('calendar has 15 actual dates, localized times, midnight boundaries, filters and persistent zone', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await mockSource(page);
  await page.goto('/matches/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('مواعيد المباريات');
  await expect(page.locator('.matches-calendar button')).toHaveCount(15);
  await expect(page.locator('.calendar-iso').first()).toHaveText('2026-10-06');
  await expect(page.locator('.calendar-iso').last()).toHaveText('2026-10-20');
  await expect(page.locator('.match-card')).toHaveCount(2);
  const scheduled = page.locator('.match-card').filter({ hasText: 'لم تبدأ' });
  await expect(scheduled.locator('.match-times')).toContainText('مكة');
  await expect(scheduled.locator('.match-times')).toContainText('مصر');
  await expect(scheduled.locator('.match-times')).toContainText('UTC');
  await expect(scheduled.locator('.match-times time').first()).toHaveText('١٩:٠٠');
  await expect(scheduled.locator('.match-times time').last()).toHaveText('١٦:٠٠');
  await page.getByRole('group', { name: 'حالة المباريات' }).getByRole('button', { name: 'مباشر', exact: true }).click();
  await expect(page.locator('.match-card')).toHaveCount(1);
  await expect(page.locator('.match-score')).toHaveText('1 : 0');
  await page.getByRole('button', { name: 'الكل', exact: true }).click();
  await page.getByLabel('ابحث عن فريق').fill('NoSuchTeam');
  await expect(page.getByText('لا توجد مباريات تطابق البحث أو التصفية')).toBeVisible();
  await page.getByLabel('ابحث عن فريق').fill('');
  await page.getByLabel('المنطقة الزمنية').selectOption('UTC');
  await expect(page.locator('.match-card')).toHaveCount(3);
  await page.getByRole('button', { name: 'الأربعاء، ١٤ أكتوبر ٢٠٢٦' }).click();
  await expect(page.locator('.match-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'العودة إلى اليوم' }).click();
  await expect(page.locator('.match-card')).toHaveCount(3);
  await page.reload();
  await expect(page.getByLabel('المنطقة الزمنية')).toHaveValue('UTC');
  await expect(page.locator('.match-card')).toHaveCount(3);
  expect(errors).toEqual([]);
});

test('polling stays automatic with no off switch, and manual refresh retains stale data on failure', async ({ page }) => {
  const source = await mockSource(page);
  await page.goto('/matches/');
  await expect(page.locator('.is-live .match-score')).toHaveText('1 : 0');
  // التحديث التلقائي مفعّل دائمًا: لا يوجد مفتاح إيقاف في الواجهة.
  await expect(page.getByLabel('تفعيل التحديث التلقائي')).toHaveCount(0);
  await expect(page.locator('.matches-auto-toggle')).toHaveCount(0);
  await expect(page.locator('.matches-status-text strong')).toHaveText('تحديث تلقائي كل دقيقة');
  source.setScore(2);
  await page.clock.fastForward(60_000);
  await expect(page.locator('.is-live .match-score')).toHaveText('2 : 0');
  source.setScore(3);
  await page.clock.fastForward(60_000);
  await expect(page.locator('.is-live .match-score')).toHaveText('3 : 0');
  source.setFailure(true, 'UPSTREAM_TIMEOUT');
  await page.getByRole('button', { name: 'تحديث الآن' }).click();
  await expect(page.getByText('قد تكون بياناتها السابقة قديمة', { exact: false })).toBeVisible();
  await expect(page.locator('.matches-diagnostic code')).toHaveText('UPSTREAM_TIMEOUT');
  await expect(page.locator('.is-live .match-score')).toHaveText('3 : 0');
  source.setFailure(false);
  source.setScore(4);
  await page.getByRole('button', { name: 'تحديث الآن' }).click();
  await expect(page.locator('.is-live .match-score')).toHaveText('4 : 0');
});

test('upstream failure is not reported as no matches, surfaces diagnostic code, and retry recovers', async ({ page }) => {
  const source = await mockSource(page, { fail: true, code: 'UPSTREAM_HTTP_503' });
  await page.goto('/matches/');
  await expect(page.getByText('تعذر الاتصال بمصدر المباريات.', { exact: false })).toBeVisible();
  await expect(page.locator('.matches-diagnostic code')).toHaveText('UPSTREAM_HTTP_503');
  await expect(page.locator('.matches-empty')).toHaveCount(0);
  source.setFailure(false);
  await page.getByRole('button', { name: 'تحديث الآن' }).click();
  await expect(page.locator('.match-card')).toHaveCount(2);
});

test('partial coverage, stale server cache, and a genuinely empty day have distinct explanations', async ({ page }) => {
  await mockSource(page, { partial: true, stale: true, code: 'UPSTREAM_HTTP_503' });
  await page.goto('/matches/');
  await expect(page.getByText('تعذر تحديث: الدوري الإنجليزي، الدوري السعودي.', { exact: false })).toBeVisible();
  await expect(page.locator('.matches-diagnostic code')).toContainText('UPSTREAM_TIMEOUT');
  await expect(page.locator('.matches-diagnostic code')).toContainText('UPSTREAM_HTTP_503');
  await expect(page.locator('.match-card')).toHaveCount(2);
  await page.getByRole('combobox', { name: 'البطولة', exact: true }).selectOption('sau.1');
  await expect(page.getByText('لا توجد مباريات مؤكدة للعرض')).toBeVisible();
  await expect(page.locator('.matches-diagnostic code')).toHaveText('UPSTREAM_HTTP_503');
  await page.getByRole('combobox', { name: 'البطولة', exact: true }).selectOption('ita.1');
  await expect(page.getByText('لا توجد مباريات في هذا اليوم ضمن التغطية المتاحة')).toBeVisible();
});

test('mobile page stays within viewport and calendar remains horizontally scrollable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockSource(page);
  await page.goto('/matches/');
  await expect(page.locator('.match-card')).toHaveCount(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(await page.locator('.matches-calendar').evaluate(el => el.scrollWidth > el.clientWidth)).toBe(true);
  await expect(page.getByLabel('المنطقة الزمنية')).toBeVisible();
});

test('matches link exists in both modern and retained page navigation, with correct canonical', async ({ page }) => {
  await mockSource(page);
  await page.goto('/matches/');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://streammasterstore.com/matches/');
  await page.getByRole('button', { name: 'القنوات والبث', exact: true }).click();
  await expect(page.locator('header a[href="/matches/"]').first()).toContainText('مواعيد المباريات');
  await page.goto('/predictions/');
  await expect(page.locator('header a[href="/matches/"]').first()).toContainText('مواعيد المباريات');
});

test('calendar rolls forward at local midnight while historical selections remain selected', async ({ page }) => {
  await mockSource(page);
  await page.clock.setSystemTime(new Date('2026-10-13T20:59:45Z')); // Mecca 23:59:45
  await page.goto('/matches/');
  await expect(page.locator('.matches-calendar button[aria-pressed="true"] .calendar-iso')).toHaveText('2026-10-13');
  await page.clock.fastForward(30_000);
  await expect(page.locator('.matches-calendar button[aria-pressed="true"] .calendar-iso')).toHaveText('2026-10-14');
  await expect(page.locator('.calendar-iso').first()).toHaveText('2026-10-07');
  await page.getByRole('button', { name: 'الاثنين، ١٢ أكتوبر ٢٠٢٦' }).click();
  await page.clock.setSystemTime(new Date('2026-10-14T20:59:45Z'));
  await page.clock.fastForward(30_000);
  await expect(page.locator('.matches-calendar button[aria-pressed="true"] .calendar-iso')).toHaveText('2026-10-12');
  await expect(page.locator('.calendar-iso').last()).toHaveText('2026-10-22');
});

test('delayed requests from a previous day cannot overwrite the selected day', async ({ page }) => {
  await mockSource(page);
  let release: () => void = () => {};
  const delayed = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/scoreboard.php?**', async route => {
    const url = new URL(route.request().url());
    if (url.searchParams.get('league') !== 'eng.1') return route.fallback();
    const dates = url.searchParams.get('dates');
    if (dates === '20261012-20261014') await delayed;
    await route.fulfill({ json: { events: [event('current', '2026-10-14T12:00:00Z')] } }).catch(() => {});
  });
  await page.goto('/matches/');
  await page.getByRole('button', { name: 'الأربعاء، ١٤ أكتوبر ٢٠٢٦' }).click();
  await expect(page.locator('.match-card')).toHaveCount(1);
  release();
  await expect(page.locator('.matches-calendar button[aria-pressed="true"] .calendar-iso')).toHaveText('2026-10-14');
  await expect(page.locator('.match-card')).toHaveCount(1);
});
