import { test, expect } from '@playwright/test';
for (const size of [{width:320,height:600},{width:390,height:500},{width:390,height:850},{width:700,height:850},{width:1280,height:850}]) {
  test(`controls hidden and layout ${size.width}x${size.height}`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.addInitScript(() => localStorage.setItem('sm-motion-preference', 'off'));
    await page.goto('/home-preview/');
    await expect(page.locator('.live-link')).toBeHidden();
    await expect(page.locator('.motion-settings')).toBeHidden();
    await expect(page.locator('.hero .scene.is-on')).toHaveCount(4);
    await page.waitForTimeout(500);
    const box = await page.locator('#heroScenes').boundingBox();
    const title = await page.locator('.scene-copy .sub').boundingBox();
    const tv = await page.locator('.scene[data-scene="1"]').boundingBox();
    if(size.width<=700){
      expect(Math.abs(tv!.x + tv!.width/2 - box!.x-box!.width/2)).toBeLessThan(2);
      expect(tv!.y).toBeGreaterThan(title!.y + title!.height - 5);
      const phone = await page.locator('.original-phone').boundingBox();
      const foot = await page.locator('.hero-foot').boundingBox();
      expect(phone!.y + phone!.height).toBeLessThanOrEqual(foot!.y + 2);
    }else{
      expect(tv!.x + tv!.width/2).toBeLessThan((await page.locator('.scene-copy').boundingBox())!.x);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(size.width);
    await page.screenshot({path:`/tmp/devices-${size.width}-${size.height}.png`});
  });
}
