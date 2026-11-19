import { test, expect } from '@playwright/test';
const world='/home-preview/saved-reference/assets/league-world/world.html';
for(const width of [320,390,768]) for(const motion of ['on','off']) test(`only one face is visible on ${width}px with motion ${motion}`,async({page})=>{
  test.setTimeout(90000);
  await page.setViewportSize({width,height:width===320?568:800});
  await page.addInitScript(value=>localStorage.setItem('sm-motion-preference',value),motion);
  await page.goto(world);
  const cards=page.locator('.world .cards > .card');
  for(let index=0;index<8;index++){
    const card=cards.nth(index),front=card.locator('.card-values__inner'),back=card.locator('.back');
    await expect(front).toHaveCSS('visibility','visible');
    await expect(back).toHaveCSS('visibility','hidden');
    await card.locator('.flip-hint').evaluate(el=>(el as HTMLElement).click());
    await expect(card).toHaveClass(/is-flipped/);
    await expect(front).toHaveCSS('visibility','hidden');
    await expect(back).toHaveCSS('visibility','visible');
    await expect(front).toHaveCSS('backface-visibility','hidden');
    await expect(back).toHaveCSS('backface-visibility','hidden');
    await expect(card.locator('.card-open-details')).toBeFocused();
    await card.locator('.card-flip-return').evaluate(el=>(el as HTMLElement).click());
    await expect(card).not.toHaveClass(/is-flipped/);
    await expect(front).toHaveCSS('visibility','visible');
    await expect(back).toHaveCSS('visibility','hidden');
    await expect(card).not.toHaveClass(/is-centered/);
  }
});
