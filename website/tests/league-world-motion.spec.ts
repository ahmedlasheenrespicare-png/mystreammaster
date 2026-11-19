import { test, expect } from '@playwright/test';

const world = '/home-preview/saved-reference/assets/league-world/world.html';

test('world honours the site motion setting even when the device requests reduced motion', async ({ page }) => {
  await page.setViewportSize({width: 320, height: 568});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.addInitScript(() => localStorage.setItem('sm-motion-preference', 'on'));
  await page.goto(world);
  const cue=page.locator('.flip-hint svg').first();
  await expect(page.locator('html')).toHaveAttribute('data-motion-reduced','false');
  await expect(cue).toHaveCSS('animation-name','flip-cue');
  await expect(page.locator('.card-decor-ball').first()).toHaveCSS('animation-name','world-spin');
  await expect(page.locator('.world .shapes')).toBeVisible();
  await page.locator('.flip-hint').first().click();
  await expect(page.locator('.cards > .card').first()).toHaveClass(/is-flipped/);
  await page.locator('.card-open-details').first().click();
  await expect(page.locator('.league-overlay__background-trophy')).toHaveCSS('animation-name','trophy-entrance');
});

for (const preference of ['off','auto']) test(`world respects ${preference} with device reduced motion`,async ({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.addInitScript(value=>localStorage.setItem('sm-motion-preference',value),preference);
  await page.goto(world);
  await expect(page.locator('html')).toHaveAttribute('data-motion-reduced','true');
  await expect(page.locator('.flip-hint svg').first()).toHaveCSS('animation-name','none');
  await page.locator('.flip-hint').first().click();
  await expect(page.locator('.cards > .card').first()).toHaveClass(/is-flipped/);
  await page.locator('.card-open-details').first().click();
  await expect(page.locator('.league-overlay__background-trophy')).toHaveCSS('animation-name','none');
});

for (const width of [320,390,768]) test(`all league backs keep stats separated at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:700});
  await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','off'));
  await page.goto(world);
  for(let i=0;i<8;i++){
    const card=page.locator('.cards > .card').nth(i);
    await card.locator('.flip-hint').evaluate(e=>(e as HTMLElement).click());
    await expect(card).toHaveClass(/is-flipped/);
    const geometry=await card.locator('.back').evaluate(back=>{
      const overlaps=(a:Element,b:Element)=>{const x=a.getBoundingClientRect(),y=b.getBoundingClientRect();return x.width>0&&y.width>0&&x.left<y.right-1&&x.right>y.left+1&&x.top<y.bottom-1&&x.bottom>y.top+1};
      const rows=[...back.querySelectorAll('[data-stat]')];
      return {overflow:back.scrollHeight>back.clientHeight,collision:rows.some(row=>{const cells=[...row.children].filter(el=>getComputedStyle(el).display!=='none');return cells.some((cell,i)=>cells.slice(i+1).some(other=>overlaps(cell,other)))}),clipped:rows.some(row=>row.scrollWidth>row.clientWidth+1)};
    });
    expect(geometry).toEqual({overflow:false,collision:false,clipped:false});
    await card.locator('.card-flip-return').evaluate(e=>(e as HTMLElement).click());
    await expect(card).not.toHaveClass(/is-centered/);
  }
});

for (const width of [320,390,768]) test(`navigation and sort arrows remain visible and functional at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:800});
  await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','off'));
  await page.goto('/home-preview/saved-reference/');
  const launch=page.locator('.world-launch');
  await expect(launch.locator('svg')).toBeVisible();
  await expect(launch.locator('svg')).toHaveCSS('width','12px');
  const server=page.locator('#works');
  await expect(server.locator('.league-carousel-nav svg')).toHaveCount(2);
  await expect(server.locator('.server-action-arrow')).toHaveCount(4);
  await launch.click();
  const frame=page.frameLocator('#explore-world');
  await frame.locator('.flip-hint').first().click();
  await expect(frame.locator('.card-flip-return svg').first()).toBeVisible();
  await frame.locator('.card-open-details').first().click();
  await frame.locator('[data-overlay-view=rates]').click();
  const sort=frame.locator('.league-screen .sort-button').first();
  await expect(sort.locator('.sort-arrows')).toBeAttached();
  await sort.click();
  await expect(frame.locator('.league-screen th[aria-sort=descending] .sort-arrows .sort-down')).toHaveCSS('opacity','1');
  await frame.locator('.league-screen .sort-button').first().click();
  await expect(frame.locator('.league-screen th[aria-sort=ascending] .sort-arrows .sort-up')).toHaveCSS('opacity','1');
  await frame.locator('[data-screen-view=standings]').click();
  const standings=frame.locator('.league-screen .standings-sort').last();
  await expect(standings.locator('svg')).toBeAttached();
  await standings.click();
  await expect(frame.locator('.league-screen th[aria-sort=ascending] .sort-up')).toHaveCSS('opacity','1');
});

test('slanted destination panels enter once and then stay still',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','on'));
  await page.goto(world);
  await page.locator('.flip-hint').first().click();
  await expect(page.locator('.cards > .card').first()).toHaveClass(/is-flipped/);
  await page.locator('.card-open-details').first().click();
  const tabs=page.locator('.league-overlay__tabs button');
  await expect(tabs.first()).toHaveCSS('animation-name','league-strip-enter');
  await expect(tabs.nth(1)).toHaveCSS('animation-delay','0.04s');
  await page.waitForTimeout(1300);
  const before=await tabs.first().boundingBox();
  await page.waitForTimeout(250);
  const after=await tabs.first().boundingBox();
  expect(Math.abs(before!.x-after!.x)).toBeLessThan(1);
  await tabs.first().click();
  await expect(page.locator('.league-screen')).toHaveAttribute('data-view','standings');
});

test('reduced motion displays destination panels immediately',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','off'));
  await page.goto(world);
  await page.locator('.flip-hint').first().click();
  await page.locator('.card-open-details').first().click();
  await expect(page.locator('.league-overlay__tabs button').first()).toHaveCSS('animation-name','none');
  await expect(page.locator('.league-overlay__tabs button').first()).toBeVisible();
});

test('card backs and standings and rates omit the reading information',async({page})=>{
  await page.setViewportSize({width:320,height:700});
  await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','off'));
  await page.goto(world);
  const card=page.locator('.cards > .card').first();
  await card.locator('.flip-hint').click();
  await expect(card.locator('.back [data-stat]')).toHaveCount(4);
  await expect(card.locator('.card-back__source')).toHaveCount(0);
  await card.locator('.card-open-details').click();
  for(const view of ['standings','rates']){
    await page.locator(`[data-overlay-view=${view}]`).click();
    await expect(page.locator('.league-screen table tbody tr').first()).toBeVisible();
    await expect(page.locator('.league-screen .table-note')).toHaveCount(0);
    const sort=page.locator(view==='rates'?'.league-screen .sort-button':'.league-screen .standings-sort').first();
    await sort.click();
    await expect(page.locator('.league-screen .table-note')).toHaveCount(0);
    await page.locator('.league-screen__back').click();
    await expect(page.locator('.league-screen')).toBeHidden();
  }
});

test('data screens omit the repeated league breadcrumb',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','off'));
  await page.goto(world+'?league=1&view=standings');
  await expect(page.locator('.league-screen')).toBeVisible();
  for(const [view,title] of [['standings','الترتيب'],['rates','الإحصائيات'],['matches','المباريات']]){
    await page.locator(`[data-screen-view=${view}]`).click();
    await expect(page.locator('#league-screen-title')).toHaveText(title);
    await expect(page.locator('.league-screen__eyebrow')).toHaveCount(0);
  }
});
