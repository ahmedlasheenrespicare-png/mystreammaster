import {test,expect} from '@playwright/test';
for(const mode of ['during','after'] as const){
 test(`scrolling down leaves only the scroll-entry path ${mode}`,async({page})=>{
  await page.setViewportSize({width:390,height:850});await page.addInitScript(mode=>localStorage.setItem('sm-motion-preference',mode==='after'?'off':'on'),mode);await page.goto('/home-preview/');
  await page.locator('.path-sequence').evaluate(el=>window.scrollTo({top:scrollY+el.getBoundingClientRect().top+80,behavior:'instant'}));const layer=page.locator('.path-demo-layer');await expect(layer).toBeVisible();
  if(mode==='after')await expect(layer).toHaveClass(/is-done/);else await expect(layer).not.toHaveClass(/is-done/);
  await page.mouse.move(20,200);await page.mouse.wheel(0,100);await expect.poll(()=>page.locator('#server-comparison').evaluate(el=>Math.abs(Math.round(el.getBoundingClientRect().top)))).toBeLessThan(2);await expect(layer).toBeHidden();
 });
}
test('hero-button path and other sections retain their normal scrolling',async({page})=>{
 await page.setViewportSize({width:390,height:850});await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','off'));await page.goto('/home-preview/');
 await page.mouse.move(20,200);await page.mouse.wheel(0,100);await page.waitForTimeout(250);expect(await page.evaluate(()=>scrollY)).toBeLessThan(400);
 await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await page.locator('.hero-path-link').focus();await page.keyboard.press('Enter');await expect(page.locator('.path-demo-layer')).toBeHidden();await page.waitForTimeout(300);await page.mouse.move(20,200);await page.mouse.wheel(0,100);await page.waitForTimeout(250);expect(await page.locator('#server-comparison').evaluate(el=>el.getBoundingClientRect().top)).toBeGreaterThan(850);
});
test('an upward swipe exits scroll-entry path but horizontal gestures do not',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:850},hasTouch:true,isMobile:true});const page=await context.newPage();await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','off'));await page.goto('/home-preview/');
 await page.locator('.path-sequence').evaluate(el=>window.scrollTo({top:scrollY+el.getBoundingClientRect().top+80,behavior:'instant'}));await expect(page.locator('.path-demo-layer')).toBeVisible();
 const client=await context.newCDPSession(page);async function swipe(x1:number,y1:number,x2:number,y2:number){await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x1,y:y1}]});await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x2,y:y2}]});await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})}
 await swipe(230,500,90,495);await expect(page.locator('.path-demo-layer')).toBeVisible();await swipe(25,600,25,430);await expect.poll(()=>page.locator('#server-comparison').evaluate(el=>Math.abs(Math.round(el.getBoundingClientRect().top)))).toBeLessThan(2);await context.close();
});
