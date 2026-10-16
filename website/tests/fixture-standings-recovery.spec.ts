import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';

const snapshot = JSON.parse(await fs.readFile(new URL('../src/content/fixture-standings-snapshot.json', import.meta.url), 'utf8'));

test('standings: reconnecting in a hidden tab refreshes on return before the next scheduled poll', async ({ page, context }) => {
  const now = new Date('2026-10-16T10:00:00Z');
  await page.clock.install({ time: now });
  await page.clock.pauseAt(now);
  let calls = 0;
  let reading = now.toISOString();
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (!['localhost', '127.0.0.1'].includes(url.hostname)) return route.abort();
    if (url.pathname === '/scoreboard.php') return route.fulfill({ json: { events: [] } });
    if (url.pathname !== '/standings.php') return route.continue();
    calls++;
    const data = structuredClone(snapshot.tables.find((item: { league: string }) => item.league === url.searchParams.get('league')));
    data.stale = false;
    data.fetchedAt = reading;
    return route.fulfill({ json: data });
  });
  await page.goto('/manchester-united-atletico/');
  const cards = page.locator('#competition-standings [data-standing-league]');
  await expect(page.locator('#competition-standings [data-feed-state="updated"]')).toHaveCount(3);
  expect(calls).toBe(3);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await context.setOffline(true);
  await expect(cards.first()).toHaveAttribute('data-diagnostic', 'OFFLINE');
  await page.clock.fastForward(60_000);
  reading = new Date(now.getTime() + 60_000).toISOString();
  await context.setOffline(false);
  expect(calls).toBe(3); // No background traffic while the page is hidden.
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(page.locator('#competition-standings [data-feed-state="updated"]')).toHaveCount(3);
  expect(calls).toBe(6);
  await expect(cards.first()).toHaveAttribute('data-fetched-at', reading);
  await expect(cards.first()).toHaveAttribute('data-diagnostic', '');
});
