import { test, expect, type Page } from '@playwright/test';

// كل استجابات المصدر أدناه بيانات اختبار محاكاة، وليست بيانات منشورة.
const KICKOFF = Date.parse('2026-10-13T19:00:00Z');
const STREAM_URL = 'https://passive-rotunda-deduct.ngrok-free.dev/five_channels_full.html';
const FOLLOW_HREF = '/manchester-united-atletico/watch/';

function event(state: 'pre' | 'in' | 'post') {
  return {
    id: '900002',
    date: '2026-10-13T19:00:00Z',
    competitions: [{
      date: '2026-10-13T19:00:00Z',
      competitors: [
        { homeAway: 'home', score: '0', team: { displayName: 'Atlético Madrid' } },
        { homeAway: 'away', score: '0', team: { displayName: 'Manchester United' } },
      ],
      status: {
        displayClock: state === 'in' ? "20'" : '',
        type: { state, completed: state === 'post', name: state === 'in' ? 'STATUS_IN_PROGRESS' : state === 'post' ? 'STATUS_FULL_TIME' : 'STATUS_SCHEDULED' },
      },
    }],
  };
}

async function open(page: Page, time: number, sourceState: 'pre' | 'in' | 'post' = 'pre') {
  await page.clock.install({ time });
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (['localhost', '127.0.0.1'].includes(url.hostname) && url.pathname === '/scoreboard.php') {
      return route.fulfill({ status: 200, headers: { 'X-Matches-Cache': 'HIT', 'X-Cache-Age': '5' }, json: { events: [event(sourceState)] } });
    }
    return ['localhost', '127.0.0.1'].includes(url.hostname) ? route.continue() : route.abort();
  });
  await page.goto('/manchester-united-atletico/');
}

test('before kick-off the watch button opens the configured stream link in a new tab', async ({ page }) => {
  await open(page, KICKOFF - 3 * 60 * 60 * 1000, 'pre');
  const button = page.locator('#primary-watch');
  await expect(button).toHaveAttribute('href', STREAM_URL);
  await expect(button).toHaveAttribute('target', '_blank');
  await expect(button).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(button).toHaveAttribute('data-watch-mode', 'stream');
  await expect(page.locator('#primary-watch-label')).toHaveText('مشاهدة المباراة الآن');
  await expect(page.locator('#primary-watch-note')).toContainText('رابط البث الخارجي');
});

test('during the match the button keeps the stream link while the source reports it live', async ({ page }) => {
  await open(page, KICKOFF + 20 * 60 * 1000, 'in');
  const button = page.locator('#primary-watch');
  await expect(button).toHaveAttribute('data-watch-mode', 'stream');
  await expect(button).toHaveAttribute('href', STREAM_URL);
  await expect(page.locator('#fixture-scoreboard')).toHaveAttribute('data-state', 'live');
});

test('after the final whistle the button switches itself to the internal follow page', async ({ page }) => {
  await open(page, KICKOFF + 3 * 60 * 60 * 1000, 'in');
  const button = page.locator('#primary-watch');
  await expect(button).toHaveAttribute('href', FOLLOW_HREF);
  await expect(button).not.toHaveAttribute('target', '_blank');
  await expect(button).toHaveAttribute('data-watch-mode', 'follow');
  await expect(page.locator('#primary-watch-label')).toHaveText('صفحة المتابعة');
  await expect(page.locator('#primary-watch-note')).toContainText('صفحة متابعة داخل الموقع');
});

test('the switch happens live between two clock moments without a reload', async ({ page }) => {
  await open(page, KICKOFF + 149 * 60 * 1000, 'in');
  const button = page.locator('#primary-watch');
  await expect(button).toHaveAttribute('data-watch-mode', 'stream');
  // 30 ثانية تكفي لتجاوز حد الـ150 دقيقة، ويُعاد التقييم كل 30 ثانية.
  await page.clock.fastForward(120_000);
  await expect(button).toHaveAttribute('data-watch-mode', 'follow');
  await expect(button).toHaveAttribute('href', FOLLOW_HREF);
});

test('a finished result from the source overrides an in-play clock', async ({ page }) => {
  await open(page, KICKOFF + 20 * 60 * 1000, 'post');
  const button = page.locator('#primary-watch');
  await expect(button).toHaveAttribute('data-watch-mode', 'follow');
  await expect(page.locator('#fixture-scoreboard')).toHaveAttribute('data-state', 'finished');
});

test('disabling the configured link keeps the button internal even before kick-off', async ({ page }) => {
  await open(page, KICKOFF - 60 * 60 * 1000, 'pre');
  const button = page.locator('#primary-watch');
  await expect(button).toHaveAttribute('data-watch-mode', 'stream');
  await page.evaluate(() => {
    const el = document.getElementById('primary-watch');
    el.dataset.watchEnabled = 'false';
    window.__smFixtureWatch();
  });
  await expect(button).toHaveAttribute('data-watch-mode', 'follow');
  await expect(button).toHaveAttribute('href', FOLLOW_HREF);
  await expect(button).not.toHaveAttribute('target', '_blank');
});

test('with JavaScript disabled the button stays on the internal page', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/manchester-united-atletico/');
  await expect(page.locator('#primary-watch')).toHaveAttribute('href', FOLLOW_HREF);
  await expect(page.locator('#primary-watch')).not.toHaveAttribute('target', '_blank');
  await context.close();
});
