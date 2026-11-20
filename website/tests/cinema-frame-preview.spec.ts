import {test,expect} from '@playwright/test';
for(const width of [390,1440])test(`text choices preview the moving reel at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:850});await page.emulateMedia({reducedMotion:'no-preference'});
 await page.goto('/home-preview/cinema-frame-preview/');await expect(page.locator('.choice')).toHaveCount(4);
 for(let i=0;i<4;i++){
  const card=page.locator('.choice').nth(i),iframe=card.locator('iframe');await card.scrollIntoViewIfNeeded();await expect(card.locator('button')).toBeVisible();
  const frame=iframe.contentFrame(),active=frame.locator('.smcin-active');await expect(active).toHaveCount(1,{timeout:15000});await expect(frame.locator('.smcin-track > .smcin-panel')).toHaveCount(123);
  await expect(active.locator('.smcin-overlay')).toHaveCSS('background-color','rgba(0, 0, 0, 0)');await expect.poll(()=>active.locator('.smcin-overlay').evaluate(el=>getComputedStyle(el).opacity),{timeout:5000}).not.toBe('0');
  expect(await active.evaluate(el=>getComputedStyle(el,'::before').content)).toBe('none');
 }
 await page.locator('[data-choice="2"]').click();await expect(page.locator('[data-choice="2"]')).toHaveAttribute('aria-pressed','true');await expect(page.locator('.status')).toContainText('2');expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
});
