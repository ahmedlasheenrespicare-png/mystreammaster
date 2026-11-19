import {test,expect} from '@playwright/test';
const world='/home-preview/saved-reference/assets/league-world/world.html';
for(const size of [{width:320,height:700},{width:390,height:844},{width:768,height:900},{width:1440,height:900}])test(`static stadium appears below destination buttons for all leagues at ${size.width}px`,async({browser})=>{
 test.setTimeout(120000);const context=await browser.newContext({viewport:size,isMobile:size.width<768,hasTouch:size.width<768});const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','off'));await page.route('https://**',r=>r.abort());await page.goto(world);
 const cards=page.locator('.cards > .card'),overlay=page.locator('.league-overlay'),stadium=page.locator('.league-overlay__stadium img');
 for(let i=0;i<8;i++){
  const card=cards.nth(i);await card.locator('.flip-hint').evaluate(e=>(e as HTMLElement).click());await expect(card).toHaveClass(/is-flipped/);await card.locator('.card-open-details').evaluate(e=>(e as HTMLElement).click());
  await expect(overlay).toBeVisible();await expect(stadium).toBeVisible();await expect.poll(()=>stadium.evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBeGreaterThan(0);
  const metrics=await stadium.evaluate(el=>{const image=el.getBoundingClientRect(),tabs=document.querySelector('.league-overlay__tabs')!.getBoundingClientRect(),buttons=[...document.querySelectorAll('.league-overlay__tabs button')];return {top:image.top,buttonsBottom:Math.max(...buttons.map(e=>e.getBoundingClientRect().bottom)),left:image.left,right:image.right,viewport:innerWidth,tabCount:buttons.length,animation:getComputedStyle(el).animationName}});
  expect(metrics.top).toBeGreaterThanOrEqual(metrics.buttonsBottom-1);expect(metrics.left).toBeGreaterThanOrEqual(-1);expect(metrics.right).toBeLessThanOrEqual(metrics.viewport+1);expect(metrics.tabCount).toBe(3);expect(metrics.animation).toBe('none');
  await page.locator('.league-overlay__close').evaluate(e=>(e as HTMLElement).click());await expect(overlay).toBeHidden();await card.locator('.card-flip-return').evaluate(e=>(e as HTMLElement).click());await expect(card).not.toHaveClass(/is-flipped/);
 }
 expect(errors).toEqual([]);await context.close();
});

for(const size of [{width:320,height:568},{width:360,height:640},{width:390,height:844},{width:414,height:700},{width:600,height:400},{width:750,height:600}])test(`stadium keeps mobile scrolling within the original bounds at ${size.width}px`,async({browser})=>{
 const context=await browser.newContext({viewport:size,isMobile:true,hasTouch:true,reducedMotion:'reduce'});const page=await context.newPage();await page.route('https://**',r=>r.abort());await page.goto(world);
 const card=page.locator('.cards > .card').first();await card.locator('.flip-hint').evaluate(e=>(e as HTMLElement).click());await card.locator('.card-open-details').evaluate(e=>(e as HTMLElement).click());await expect(page.locator('.league-overlay__stadium img')).toBeVisible();await expect(page.locator('.league-overlay')).toHaveClass(/is-open/);await page.waitForTimeout(1200);
 const scroller=page.locator('.league-overlay__scroller');const bounds=()=>scroller.evaluate(e=>{e.scrollLeft=1000;const right=e.scrollLeft;e.scrollLeft=-1000;return {height:e.scrollHeight,width:e.scrollWidth,client:e.clientWidth,right,left:e.scrollLeft}});
 const withStadium=await bounds();expect(withStadium.width).toBe(withStadium.client);expect(withStadium.right).toBe(0);expect(withStadium.left).toBe(0);
 await page.addStyleTag({content:'.league-overlay__stadium{display:none!important}.league-overlay .league-overlay__card .card{--width:min(44vw,185px)!important}.league-overlay .league-overlay__tabs{margin:19px auto 22px!important}.league-overlay .league-overlay__tabs button{aspect-ratio:1.12!important}'});
 const original=await bounds();expect(withStadium.height).toBeLessThanOrEqual(original.height);await context.close();
});
