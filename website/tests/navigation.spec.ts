import { test, expect } from '@playwright/test';
import { HOME_SECTIONS, NAV_GROUPS, SERVER_PAGES, homeSectionPath } from '../src/navigation.mjs';

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

test('home menu destinations exist without relying on legacy hash redirects', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  for (const s of HOME_SECTIONS) {
    const target = homeSectionPath(s.id);
    if (target.startsWith('#')) await expect(page.locator(target), s.id).toHaveCount(1);
    else expect((await page.request.get(`/${target}`)).status(), s.id).toBe(200);
  }
});

for (const url of ['/about/']) {
  test(`header destinations work without JavaScript on ${url}`, async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    for (const section of HOME_SECTIONS) {
      const href = `/${homeSectionPath(section.id)}`;
      await expect(page.locator('header').getByRole('link', { name: new RegExp(section.label), includeHidden: true }).first(), section.id).toHaveAttribute('href', href);
    }
    await context.close();
  });
}

test('reference homepage menu exposes its current navigation groups', async ({ page }) => {
  await page.route('**/*.mp4*', route => route.abort());
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.loader')).toBeHidden({ timeout: 60000 });
  await page.locator('.nav__menu-btn').click();
  const menu = page.locator('.nav__menu');
  await expect(menu).toHaveClass(/open/);
  await expect(menu.locator('.preview-menu-group h2')).toHaveText(['اكتشف', 'ابدأ المشاهدة', 'المساعدة والمزيد']);
  for (const id of ['journey', 'reviews', 'faq']) await expect(menu.locator(`a[href="#${id}"]`)).toHaveCount(1);
});

test('every page linked from the header responds', async ({ request }) => {
  for (const url of new Set(ALL_PAGES)) {
    const res = await request.get(encodeURI(url));
    expect(res.status(), url).toBe(200);
  }
});

for (const url of ['/channels/', '/privacy/']) {
  test(`unified desktop menu on ${url} exposes the current groups and all destinations`, async ({ page }) => {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.locator('.us-menu-toggle').click();
    const menu = page.locator('.us-menu-panel');
    await expect(menu.locator('section h2')).toHaveText(['اكتشف', 'ابدأ المشاهدة', 'المساعدة والمزيد']);
    await menu.locator('.us-more summary').click();
    const hrefs = new Set(await page.locator('header a').evaluateAll(as => as.map(a => new URL((a as HTMLAnchorElement).href).pathname + new URL((a as HTMLAnchorElement).href).hash).map(decodeURI)));
    for (const p of ALL_PAGES) expect(hrefs, p).toContain(p);
    for (const s of HOME_SECTIONS) expect(hrefs, s.id).toContain(`/${homeSectionPath(s.id)}`);
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
  });
}

test('home section link in the menu reaches the approved homepage', async ({ page }) => {
  await page.goto('/channels/', { waitUntil: 'domcontentloaded' });
  await page.locator('.us-menu-toggle').click();
  await page.locator('.us-menu-panel').getByRole('link', { name: 'الأسئلة الشائعة', exact: true }).click();
  await expect(page).toHaveURL(/\/faq\/$/);
});

test('legacy mobile menu opens and navigates between pages', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/about/', { waitUntil: 'domcontentloaded' });
  await page.locator('.us-menu-toggle').click();
  const menu = page.locator('.us-menu-panel');
  await expect(menu).toBeVisible();
  await menu.locator('.us-more summary').click();
  await menu.getByRole('link', { name: 'مكتبة القنوات', exact: true }).click();
  await expect(page).toHaveURL(/\/channels\/$/);
});
