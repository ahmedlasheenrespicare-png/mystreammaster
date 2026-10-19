import { test, expect, type Locator, type Page } from '@playwright/test';

// The league bar is a carousel (slider) over real landing-page links: it must
// page without hiding links from crawlers, keyboard users, or no-JS visitors.
const NOW = new Date('2026-10-13T12:00:00Z');

async function openHub(page: Page, viewport: { width: number; height: number }) {
  await page.clock.install({ time: NOW });
  // Upstream is unreachable in CI; the carousel must not depend on match data.
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (!['localhost', '127.0.0.1'].includes(url.hostname)) return route.abort();
    if (url.pathname === '/scoreboard.php') {
      return route.fulfill({ status: 200, headers: { 'X-Matches-Cache': 'HIT', 'X-Cache-Age': '5', 'X-Diagnostic-Code': 'OK' }, json: { events: [] } });
    }
    return route.continue();
  });
  await page.setViewportSize(viewport);
  await page.goto('/matches/');
}


/* الصفحة تمرّر نفسها إلى التقويم بعد وصول البيانات، فتتحرّك العناصر تحت
   الإحداثيات المحسوبة. تُنتظر هنا استقرار موضع التمرير قبل أي سحب بالفأرة. */
async function settleScroll(page: Page) {
  let last = -1;
  for (let attempt = 0; attempt < 12; attempt++) {
    const y = await page.evaluate(() => window.scrollY);
    if (y === last) return;
    last = y;
    await page.waitForTimeout(150);
  }
}

const offset = (nav: Locator) =>
  nav.locator('.league-carousel-track').evaluate(el => {
    const matrix = new DOMMatrix(getComputedStyle(el).transform);
    return Math.round(matrix.m41);
  });

test('league bar pages by arrows and dots, keeps every link in the DOM, and grows the active dot', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await openHub(page, { width: 1440, height: 1000 });

  const nav = page.locator('.matches-league-links.league-carousel');
  await expect(nav).toHaveAttribute('data-ready', 'true');
  // All eight landing links stay in the document: the carousel offsets them,
  // it never swaps the list out.
  await expect(nav.locator('.league-carousel-item')).toHaveCount(8);
  for (const href of ['/matches/الدوري-الإنجليزي/', '/matches/دوري-أبطال-أوروبا/', '/matches/الدوري-السعودي/']) {
    await expect(nav.locator(`a[href="${href}"]`), href).toHaveCount(1);
  }
  // Desktop: four cards per page → two pages.
  await expect(nav.locator('.league-carousel-dot')).toHaveCount(2);
  // At the first page only "previous" is disabled; the first button in the DOM
  // is "next" (RTL: later pages sit to the left).
  await expect(nav.getByLabel('البطولات السابقة')).toBeDisabled();
  await expect(nav.getByLabel('البطولات التالية')).toBeEnabled();

  const first = nav.locator('.league-carousel-dot').first();
  const second = nav.locator('.league-carousel-dot').nth(1);
  await expect(first).toHaveClass(/is-active/);
  await expect(first).toHaveAttribute('aria-current', 'true');
  const activeWidth = (await first.boundingBox())!.width;
  const idleWidth = (await second.boundingBox())!.width;
  expect(activeWidth).toBeGreaterThan(idleWidth * 2);

  const start = await offset(nav);
  await nav.getByLabel('البطولات التالية').click();
  await expect(second).toHaveClass(/is-active/);
  await expect(first).not.toHaveAttribute('aria-current', 'true');
  expect(Math.abs((await offset(nav)) - start)).toBeGreaterThan(100);
  await expect(nav.locator('.league-carousel-viewport')).toHaveAttribute('aria-label', /صفحة 2 من 2/);

  await nav.getByLabel('البطولات السابقة').click();
  await expect(first).toHaveClass(/is-active/);
  expect(await offset(nav)).toBe(start);

  await second.click();
  await expect(second).toHaveClass(/is-active/);
  await expect(nav.getByLabel('البطولات التالية')).toBeDisabled();
  await nav.getByLabel('البطولات السابقة').click();
  await expect(first).toHaveClass(/is-active/);
  expect(errors).toEqual([]);
});

test('league bar re-measures on a narrow viewport: two cards per page and four pages', async ({ page }) => {
  await openHub(page, { width: 390, height: 900 });
  const nav = page.locator('.matches-league-links.league-carousel');
  await expect(nav).toHaveAttribute('data-ready', 'true');
  await expect(nav.locator('.league-carousel-dot')).toHaveCount(4);
  const items = nav.locator('.league-carousel-item');
  // Cards stay inside the viewport width: two fit side by side, none overflow.
  const [first, second] = [(await items.nth(0).boundingBox())!, (await items.nth(1).boundingBox())!];
  expect(Math.abs(first.y - second.y)).toBeLessThan(4);
  expect(Math.min(first.x, second.x) + first.width + second.width).toBeLessThan(391);
});

test('keyboard focus reaches a league link and the bar follows it into view', async ({ page }) => {
  await openHub(page, { width: 1440, height: 1000 });
  const nav = page.locator('.matches-league-links.league-carousel');
  const last = nav.locator('.league-carousel-item').last();
  await last.focus();
  await expect(last).toBeFocused();
  // The card that received focus is brought into the visible window.
  await expect.poll(async () => {
    const box = await last.boundingBox();
    const view = (await nav.locator('.league-carousel-viewport').boundingBox())!;
    return box ? box.x >= view.x - 4 && box.x + box.width <= view.x + view.width + 4 : false;
  }, { timeout: 3000 }).toBe(true);
});

test('dragging the bar never opens a league page, and a swipe advances the page', async ({ page }) => {
  await openHub(page, { width: 1440, height: 1000 });
  const nav = page.locator('.matches-league-links.league-carousel');
  /* يُثبَّت الشريط في منتصف الشاشة قبل حساب إحداثيات السحب: الهيدر مثبَّت
     أعلى الصفحة فيغطّي الشريط إن صار تحته، فلا تصل أحداث المؤشر أصلاً. */
  await page.evaluate(() =>
    document.querySelector('.matches-league-links.league-carousel')!.scrollIntoView({ block: 'center' }),
  );
  await settleScroll(page);
  await page.evaluate(() =>
    document.querySelector('.matches-league-links.league-carousel')!.scrollIntoView({ block: 'center' }),
  );
  await settleScroll(page);
  const box = (await nav.locator('.league-carousel-viewport').boundingBox())!;
  const y = box.y + box.height / 2;
  // RTL: dragging right reveals the cards waiting on the left.
  await page.mouse.move(box.x + box.width * 0.6, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.9, y, { steps: 12 });
  await page.mouse.up();
  await expect(page).toHaveURL(/\/matches\/$/);
  await expect(nav.locator('.league-carousel-dot').nth(1)).toHaveClass(/is-active/);
});

for (const width of [1440, 390]) {
  test(`leader banners retain initials and geometry when crests fail (${width}px)`, async ({ page }) => {
    await openHub(page, { width, height: 1000 });
    const nav = page.locator('.matches-league-links.league-carousel');
    const card = nav.locator('.league-carousel-item').first();
    const banner = card.locator('.league-carousel-banner');
    const image = banner.locator('img');
    await card.scrollIntoViewIfNeeded();
    await expect(card.locator('.league-carousel-leader')).toContainText('Paris Saint-Germain');
    await expect(nav.locator('.league-carousel-banner')).toHaveCount(8);
    await expect(nav.locator('.league-carousel-leader-logo')).toHaveCount(3);
    await expect(image).toHaveAttribute('draggable', 'false');
    await expect(image).toHaveCSS('object-fit', 'contain');
    const before = (await banner.boundingBox())!;
    expect(before.height).toBe(104);
    expect(Math.abs(before.width - (await card.boundingBox())!.width)).toBeLessThanOrEqual(2);
    await image.evaluate(element => element.dispatchEvent(new Event('error')));
    await expect(image).toHaveCSS('visibility', 'hidden');
    await expect(banner.locator('.league-carousel-monogram')).toBeVisible();
    await expect(banner.locator('.league-carousel-monogram')).toContainText('PS');
    expect((await banner.boundingBox())!.height).toBe(before.height);
  });
}
