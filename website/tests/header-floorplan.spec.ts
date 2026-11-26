import { test, expect } from '@playwright/test';

const groups = ['السيرفرات والباقات', 'البطولات والمباريات', 'القنوات والمشاهدة', 'المقالات والأخبار', 'المساعدة'];
for (const route of ['/', '/store/', '/about/']) for (const width of [390, 1440]) {
  test(`organized header on ${route} at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.addInitScript(() => localStorage.setItem('sm-motion-preference', 'off'));
    await page.route('**/*.mp4*', r => r.abort());
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    const home = route === '/';
    if (width < 1280) await page.locator(home ? '.nav__menu-btn' : '.us-menu-toggle').click();
    const nav = page.locator(width < 1280 ? '.floor-nav--mobile' : '.floor-nav--desktop');
    await expect(nav).toBeVisible();
    for (const label of groups) await expect(nav.locator('summary', { hasText: label })).toHaveCount(1);
    await nav.locator('summary', { hasText: 'البطولات والمباريات' }).click();
    const section = nav.locator('details').filter({ has: page.locator('summary', { hasText: 'البطولات والمباريات' }) });
    await expect(section.locator('a[href="/leagues/premier-league/"]')).toBeVisible();
    await expect(section.locator('a[href="/#league-strip"]')).toBeVisible();
    await expect(section.locator('a[href^="/leagues/"]')).toHaveCount(9);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
    await section.locator('a[href="/leagues/premier-league/"]').click();
    await expect(page).toHaveURL(/\/leagues\/premier-league\/$/);
  });
}

test('navigation remains available without JavaScript on an internal page', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto('/about/');
  const nav = page.locator('.us-noscript');
  await nav.locator('summary').click();
  await expect(nav.locator('a[href="/channels/"]').first()).toBeVisible();
  await context.close();
});

test('homepage navigation remains usable without JavaScript on mobile', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto('/');
  const nav = page.locator('.floor-noscript');
  await nav.locator(':scope > summary').click();
  await nav.locator('summary', { hasText: 'البطولات والمباريات' }).click();
  await expect(nav.locator('a[href="/leagues/premier-league/"]')).toBeVisible();
  await context.close();
});

for (const width of [390, 1440]) test(`league readable header uses the same navigation at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 844 });
  await page.goto('/leagues/premier-league/');
  const header = page.locator('.site-head');
  await header.scrollIntoViewIfNeeded();
  if (width < 1280) await header.locator('.floor-league-mobile > summary').click();
  const nav = header.locator(width < 1280 ? '.floor-nav--mobile' : '.floor-nav--desktop');
  await expect(nav).toBeVisible();
  await nav.locator('summary', { hasText: 'السيرفرات والباقات' }).click();
  await expect(nav.locator('a[href="/nova/"]')).toBeVisible();
  await nav.locator('a[href="/nova/"]').click();
  await expect(page).toHaveURL(/\/nova\/$/);
});

for (const route of ['/', '/nova/', '/leagues/premier-league/']) for (const width of [320, 768, 1101, 1280, 1440]) {
  test(`header stays inside viewport without overlapping on ${route} at ${width}`, async ({ page }) => {
    await page.setViewportSize({width, height:800});
    await page.addInitScript(() => localStorage.setItem('sm-motion-preference', 'off'));
    await page.route('**/*.mp4*', r => r.abort());
    await page.goto(route,{waitUntil:'domcontentloaded'});
    const isHome = route === '/', league = route.startsWith('/leagues/');
    const bar = page.locator(isHome ? '.nav' : league ? '.site-head' : '.us-header-bar');
    const elements = bar.locator(isHome ? ':scope > .nav__logo, :scope > .nav__links, :scope > .sm-cart-tools, :scope > .nav__menu-btn' : league ? ':scope > a, :scope > .floor-nav--desktop, :scope > .floor-league-mobile' : ':scope > .us-logo, :scope > .floor-nav--desktop, :scope > .us-tools, :scope > .us-menu-toggle');
    const boxes = await elements.evaluateAll(els => els.filter(el => {const r=el.getBoundingClientRect(); return r.width>0 && r.height>0 && getComputedStyle(el).visibility==='visible'}).map(el => {const r=el.getBoundingClientRect();return {left:r.left,right:r.right}}).sort((a,b)=>a.left-b.left));
    for (const [index, box] of boxes.entries()) {
      expect(box.left).toBeGreaterThanOrEqual(-1);
      expect(box.right).toBeLessThanOrEqual(width+1);
      if (index) expect(box.left).toBeGreaterThanOrEqual(boxes[index-1].right-1);
    }
    if (width < 1280) {
      const button = bar.locator(isHome ? '.nav__menu-btn' : league ? '.floor-league-mobile > summary' : '.us-menu-toggle');
      await button.click();
      const nav = league ? bar.locator('.floor-nav--mobile') : page.locator('.floor-nav--mobile').filter({visible:true});
      await expect(nav).toBeVisible();
      const rect = await nav.boundingBox();
      expect(rect!.x).toBeGreaterThanOrEqual(-1);
      expect(rect!.x+rect!.width).toBeLessThanOrEqual(width+1);
    }
  });
}
