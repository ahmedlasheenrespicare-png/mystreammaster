import { test, expect } from '@playwright/test';
for (const viewport of [{width:390,height:500},{width:390,height:850},{width:1280,height:850}]) {
  test(`fullscreen sections and free scrolling ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/home-preview/');
    await expect(page.locator('.hero')).toHaveCSS('height', `${viewport.height}px`);
    for (const [section, stage] of [['#hero','.hero-pin'],['#league-strip','.league-stage'],['#path-section','.path-stage'],['#server-comparison','.server-stage'],['#setup-draft','.setup-stage']]) {
      const box = await page.locator(section).locator(stage).boundingBox();
      expect(box).not.toBeNull();
      expect(Math.abs(box!.height - viewport.height)).toBeLessThan(2);
      await page.locator(section).locator(stage).evaluate(el => window.scrollTo({top: window.scrollY + el.getBoundingClientRect().top + 20, behavior:'instant'}));
      await page.waitForTimeout(100);
      const pinned = await page.locator(section).locator(stage).boundingBox();
      if (section !== '#hero') expect(Math.abs(pinned!.y)).toBeLessThan(2);
    }
    expect(await page.locator('.review').evaluate(el=>el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(viewport.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);

  });
}
