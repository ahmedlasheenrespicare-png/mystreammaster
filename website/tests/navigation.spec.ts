import { test, expect } from '@playwright/test';
import { HOME_SECTIONS, NAV_GROUPS, SERVER_PAGES } from '../src/navigation.mjs';

// Every page reachable from the header (React and legacy headers share src/navigation.mjs).
const ALL_PAGES = [
  ...NAV_GROUPS.flatMap(g => [...g.links, ...(g.legal ?? [])].map(l => `/${l.href}`)),
  ...SERVER_PAGES.map(s => `/${s.code}/`),
];

test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    return ['127.0.0.1', 'localhost'].includes(url.hostname) ? route.continue() : route.abort();
  });
});

test('every home section listed in the header exists on the homepage', async ({ page }) => {
  await page.goto('/');
  for (const s of HOME_SECTIONS) await expect(page.locator(`#${s.id}`), s.id).toHaveCount(1);
});

test('every page linked from the header responds', async ({ request }) => {
  for (const url of new Set(ALL_PAGES)) {
    const res = await request.get(encodeURI(url));
    expect(res.status(), url).toBe(200);
  }
});

for (const url of ['/', '/channels/', '/privacy/']) {
  test(`desktop header on ${url} groups all pages in five dropdowns`, async ({ page }) => {
    await page.goto(url);
    const nav = page.locator('header nav').first();
    const triggers = nav.locator('button[aria-expanded]:visible');
    await expect(triggers).toHaveCount(NAV_GROUPS.length);
    const hrefs = new Set<string>();
    for (const group of NAV_GROUPS) {
      const trigger = nav.getByRole('button', { name: group.label, exact: true });
      await trigger.click();
      await expect(trigger).toHaveAttribute('aria-expanded', 'true');
      const panel = page.locator(`#${await trigger.getAttribute('aria-controls')}`);
      await expect(panel).toBeVisible();
      for (const href of await panel.locator('a').evaluateAll(as => as.map(a => new URL((a as HTMLAnchorElement).href).pathname + new URL((a as HTMLAnchorElement).href).hash))) hrefs.add(decodeURI(href));
      await page.keyboard.press('Escape');
      await expect(panel).toBeHidden();
    }
    for (const p of ALL_PAGES) expect(hrefs, p).toContain(p);
    for (const s of HOME_SECTIONS) expect(hrefs, s.id).toContain(`/#${s.id}`);
  });
}

test('home section link in the dropdown scrolls from another page', async ({ page }) => {
  await page.goto('/channels/');
  await page.getByRole('button', { name: 'الرئيسية', exact: true }).click();
  await page.locator('#nav-panel-home').getByRole('link', { name: /الأسئلة الشائعة/ }).click();
  await expect(page).toHaveURL(/\/#faq$/);
  await expect(page.locator('#faq')).toBeInViewport();
});

test('legacy mobile menu opens the current page group', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/about/');
  await page.locator('.sm-menu-toggle').click();
  const menu = page.locator('#sm-mobile-nav');
  await expect(menu).toBeVisible();
  await expect(menu.locator('details[data-group="help"]')).toHaveAttribute('open', '');
  await menu.locator('details[data-group="matches"] summary').click();
  await menu.getByRole('link', { name: 'مكتبة القنوات' }).click();
  await expect(page).toHaveURL(/\/channels\/$/);
});
