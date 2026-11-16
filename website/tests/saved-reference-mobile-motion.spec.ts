import { test, expect } from '@playwright/test';

for (const width of [320,390]) {
 test(`mobile motion responds to the footer setting and preserves touch scrolling at ${width}px`, async ({ browser }) => {
  const context=await browser.newContext({viewport:{width,height:780},hasTouch:true,isMobile:true,reducedMotion:'no-preference'});
  const page=await context.newPage();
  await page.route('**/main-D5MQsYQ6.js*',route=>route.abort());
  await page.route('https://**',route=>route.abort());
  await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});
  await page.addStyleTag({content:'.loader,.nav,canvas{display:none!important}'});
  const setting=page.locator('#sm-motion-setting');
  await setting.selectOption('on');
  const first=page.locator('.sm-servers .project').first();
  await page.evaluate(()=>window.scrollTo(0,window.scrollY+document.querySelector('.sm-servers .project')!.getBoundingClientRect().top-450));
  await expect.poll(()=>first.evaluate(e=>e.style.getPropertyValue('--mobile-project-scale'))).not.toBe('');
  const firstValue=await first.evaluate(e=>e.style.getPropertyValue('--mobile-project-scale'));
  await page.evaluate(()=>window.scrollBy(0,240));
  await expect.poll(()=>first.evaluate(e=>e.style.getPropertyValue('--mobile-project-scale'))).not.toBe(firstValue);
  await page.locator('.sm-blog__rail').scrollIntoViewIfNeeded();
  await expect(page.locator('.sm-blog__motion')).toBeVisible();
  const rail=page.locator('.sm-blog__rail');
  const before=await rail.evaluate(e=>e.scrollLeft);
  await expect.poll(()=>rail.evaluate(e=>e.scrollLeft),{timeout:4000}).not.toBe(before);
  const cdp=await context.newCDPSession(page);
  async function swipe(x1:number,y1:number,x2:number,y2:number){
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x1,y:y1}]});
   for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x1+(x2-x1)*i/8,y:y1+(y2-y1)*i/8}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(300);
  }
  const rect=await rail.boundingBox();
  expect(rect).not.toBeNull();
  const y=Math.min(700,Math.max(100,rect!.y+100));
  await swipe(width*.2,y,width*.8,y);
  await expect(page.locator('.sm-blog__motion')).toHaveText('تشغيل الحركة');
  expect(await page.evaluate(()=>[scrollX,document.documentElement.scrollWidth,innerWidth])).toEqual([0,width,width]);
  await page.locator('.sm-blog__motion').click();
  await setting.selectOption('off');
  await expect.poll(()=>first.evaluate(e=>e.style.getPropertyValue('--mobile-project-scale'))).toBe('');
  await expect(page.locator('.sm-blog__motion')).toBeHidden();
  await page.waitForTimeout(600);const stopped=await rail.evaluate(e=>e.scrollLeft);await page.waitForTimeout(500);
  expect(Math.abs(await rail.evaluate(e=>e.scrollLeft)-stopped)).toBeLessThanOrEqual(1);
  await setting.selectOption('on');
  await expect(page.locator('.sm-blog__motion')).toBeVisible();
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect.poll(()=>page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
  await expect(page.locator('.sm-blog__motion')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-motion-reduced','false');
  await expect(page.locator('.sm-footer__track')).not.toHaveCSS('animation-name','none');
  await setting.selectOption('auto');
  await expect(page.locator('.sm-blog__motion')).toBeHidden({timeout:10000});
  await expect(page.locator('.sm-footer__track')).toHaveCSS('animation-name','none');
  await expect.poll(()=>first.evaluate(e=>e.style.getPropertyValue('--mobile-project-scale'))).toBe('');
  await setting.selectOption('off');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await expect(page.locator('html')).toHaveAttribute('data-motion-reduced','true');
  await setting.selectOption('auto');
  await expect(page.locator('html')).toHaveAttribute('data-motion-reduced','false');
  await expect(page.locator('.sm-blog__motion')).toBeVisible();
  await context.close();
 });
}
