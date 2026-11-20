import {test,expect} from '@playwright/test';

const pagePath='/home-preview/saved-reference/';
async function setup(page: import('@playwright/test').Page){
 await page.addInitScript(()=>{
  localStorage.setItem('sm-motion-preference','on');
  const raf=window.requestAnimationFrame.bind(window);
  (window as any).scrollFrames={path:0,journey:0};
  window.requestAnimationFrame=(callback)=>{
   const stack=new Error().stack||'';
   const kind=stack.includes('path-section.js')?'path':stack.includes('about-motion.js')?'journey':null;
   return raf(time=>{if(kind)(window as any).scrollFrames[kind]++;callback(time)});
  };
 });
 await page.route('**/main-D5MQsYQ6.js*',route=>route.fulfill({body:'',contentType:'text/javascript'}));
 await page.route('**/*.mp4*',route=>route.abort());
 await page.route('https://**',route=>route.abort());
 await page.goto(pagePath,{waitUntil:'domcontentloaded'});
 await page.addStyleTag({content:'.loader,.nav{display:none!important}'});
}

test('mobile path follows scrolling but stops scheduling frames when still',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:850},hasTouch:true,isMobile:true});const page=await context.newPage();await setup(page);
 const heading=page.locator('.sm-path__heading'),phrase=heading.locator('.sm-path__script');
 async function go(fraction:number){await heading.evaluate((el,f)=>{const r=el.getBoundingClientRect();scrollTo(0,scrollY+r.top+r.height/2-innerHeight*f)},fraction);}
 await go(.75);await expect.poll(()=>phrase.evaluate(e=>parseFloat((e as HTMLElement).style.getPropertyValue('--sm-path-script-y')))).toBeLessThan(-3);
 const first=await phrase.evaluate(e=>parseFloat((e as HTMLElement).style.getPropertyValue('--sm-path-script-y')));
 await go(.25);await expect.poll(()=>phrase.evaluate(e=>parseFloat((e as HTMLElement).style.getPropertyValue('--sm-path-script-y')))).toBeGreaterThan(first+20);
 await page.waitForTimeout(500);await page.evaluate(()=>{(window as any).scrollFrames.path=0});await page.waitForTimeout(600);
 expect(await page.evaluate(()=>(window as any).scrollFrames.path)).toBeLessThanOrEqual(2);
 await context.close();
});

test('mobile journey rests between updates and retains scroll and idle progression',async({browser})=>{
 test.setTimeout(30000);const context=await browser.newContext({viewport:{width:390,height:850},hasTouch:true,isMobile:true});const page=await context.newPage();await setup(page);
 const stage=page.locator('.sm-journey__stage'),cards=stage.locator('.sm-journey__steps li');
 await expect(stage).toHaveAttribute('data-scroll-active','true');
 async function go(fraction:number){await stage.evaluate((el,f)=>{const view=el.querySelector('.sm-journey__stage-view')!,r=el.getBoundingClientRect();scrollTo(0,scrollY+r.top+(r.height-view.getBoundingClientRect().height)*f)},fraction)}
 await go(.4);await expect(cards.nth(1)).toHaveAttribute('data-current','true');
 await page.waitForTimeout(1000);await page.evaluate(()=>{(window as any).scrollFrames.journey=0});await page.waitForTimeout(650);
 expect(await page.evaluate(()=>(window as any).scrollFrames.journey)).toBeLessThanOrEqual(3);
 await expect(cards.nth(0)).toHaveAttribute('data-current','true',{timeout:3500});
 await expect(cards.nth(1)).toHaveAttribute('data-current','true',{timeout:4500});
 await go(.6);await expect(cards.nth(2)).toHaveAttribute('data-current','true');
 await go(.12);await expect(cards.nth(0)).toHaveAttribute('data-current','true');
 await context.close();
});

test('mobile smooth scrolling uses native touch while the motion setting stays enabled',async({browser})=>{
 test.setTimeout(60000);const context=await browser.newContext({viewport:{width:390,height:850},hasTouch:true,isMobile:true});const page=await context.newPage();
 await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','on'));await page.route('**/*.mp4*',route=>route.abort());await page.route('https://**',route=>route.abort());
 await page.goto(pagePath,{waitUntil:'domcontentloaded'});await page.addStyleTag({content:'.loader,.nav{display:none!important}'});
 await expect(page.locator('html')).toHaveAttribute('data-motion-reduced','false');
 await expect.poll(()=>page.locator('#smooth-wrapper').evaluate(e=>getComputedStyle(e).position)).not.toBe('fixed');
 await page.evaluate(()=>scrollTo(0,1200));await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(1100);
 const offset=await page.locator('#smooth-content').evaluate(el=>{const value=getComputedStyle(el).transform;return value==='none'?0:new DOMMatrix(value).m42});
 expect(Math.abs(offset)).toBeLessThan(2);
 await expect(page.locator('.sm-journey__stage')).toHaveAttribute('data-scroll-active','true');
 await context.close();
});

test('desktop journey keeps its idle preview and reacts to scrolling after resting',async({browser})=>{
 test.setTimeout(30000);const context=await browser.newContext({viewport:{width:1440,height:1000}});const page=await context.newPage();await setup(page);
 const stage=page.locator('.sm-journey__stage'),cards=stage.locator('.sm-journey__steps li');await expect(stage).toHaveAttribute('data-scroll-active','true');
 async function go(fraction:number){await stage.evaluate((el,f)=>{const view=el.querySelector('.sm-journey__stage-view')!,r=el.getBoundingClientRect();scrollTo(0,scrollY+r.top+(r.height-view.getBoundingClientRect().height)*f)},fraction)}
 await go(.4);await expect(cards.nth(1)).toHaveAttribute('data-current','true');
 await page.waitForTimeout(1000);await page.evaluate(()=>{(window as any).scrollFrames.journey=0});await page.waitForTimeout(650);
 expect(await page.evaluate(()=>(window as any).scrollFrames.journey)).toBeLessThanOrEqual(3);
 await expect(cards.nth(0)).toHaveAttribute('data-current','true',{timeout:3500});
 await expect(cards.nth(1)).toHaveAttribute('data-current','true',{timeout:4500});
 await go(.6);await expect(cards.nth(2)).toHaveAttribute('data-current','true');
 await go(.12);await expect(cards.nth(0)).toHaveAttribute('data-current','true');await context.close();
});
