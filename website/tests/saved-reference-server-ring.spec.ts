import { test, expect } from '@playwright/test';

for (const width of [390, 1200]) test(`server ring preserves plans and controls at ${width}px`, async ({ page }) => {
  await page.setViewportSize({width, height:850});
  await page.addInitScript(() => localStorage.setItem('sm-motion-preference','off'));
  await page.goto('/home-preview/saved-reference/');
  const section=page.locator('#works');
  const cards=section.locator('.league-carousel-item');
  await expect(cards).toHaveCount(4);
  const names=['نوفا','إيستار برو','موكا','X'];
  const prices=['$25','$35','$45','$20'];
  const links=['nova','istar','moka','x'];
  for(let i=0;i<4;i++) {
    const card=cards.nth(i);
    await expect(card).toHaveAttribute('aria-label',`سيرفر ${names[i]}`);
    await expect(card.locator('.price')).toContainText(prices[i]);
    await expect(card.locator('.actions a').first()).toHaveAttribute('href',`/${links[i]}/`);
    await expect(card.locator('.actions a').nth(1)).toHaveAttribute('href','/trial/');
  }
  await section.locator('.next').evaluate((button: HTMLElement)=>button.click());
  await expect(cards.nth(1)).toHaveAttribute('data-ring-pos','front');
  await expect(cards.nth(1).locator('.lc-detail')).toBeVisible();
  await expect(page.locator('.rose-strip__group').first().locator('img')).toHaveCount(41);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
