import {test,expect} from '@playwright/test';
for(const size of [{width:320,height:700},{width:390,height:844},{width:768,height:900},{width:1440,height:900}]) {
 test(`featured stadium plays only while visible at ${size.width}px`,async({browser})=>{
  test.setTimeout(90000);
  const context=await browser.newContext({viewport:size,isMobile:size.width<768,hasTouch:size.width<1024,reducedMotion:'reduce'});const page=await context.newPage();
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','on'));
  await page.route('**/main-D5MQsYQ6.js*',route=>route.fulfill({body:'',contentType:'text/javascript'}));
  await page.route('https://**',route=>route.abort());
  await page.route('**/*.mp4*',route=>route.request().url().includes('featured-stadium.mp4')?route.continue():route.abort());
  await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});
  const model=page.locator('.sm-matches__stadium'),video=model.locator('video'),title=page.locator('#featured-matches-title');
  await expect(video).not.toHaveAttribute('src');
  await model.scrollIntoViewIfNeeded();
  await expect(video).toHaveAttribute('src',/featured-stadium\.mp4/,{timeout:15000});
  await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.currentTime),{timeout:20000}).toBeGreaterThan(.1);
  await expect(model).toHaveClass(/is-playing/);
  const bounds=await Promise.all([title.boundingBox(),model.boundingBox()]);
  expect(bounds[0]).not.toBeNull();expect(bounds[1]).not.toBeNull();
  expect(bounds[1]!.x+bounds[1]!.width).toBeLessThanOrEqual(bounds[0]!.x+2);
  const edges=await page.evaluate(()=>{const heading=document.querySelector('#featured-matches-title')!,accent=document.querySelector('.sm-matches__script')!,model=document.querySelector('.sm-matches__stadium')!;const range=document.createRange();range.selectNodeContents(heading);return {heading:range.getBoundingClientRect().left,accent:accent.getBoundingClientRect().left,model:model.getBoundingClientRect().right}});
  expect(edges.heading).toBeGreaterThanOrEqual(edges.model-1);expect(edges.accent).toBeGreaterThanOrEqual(edges.model-1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
  await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.paused),{timeout:15000}).toBe(true);
  const paused=await video.evaluate((v:HTMLVideoElement)=>v.currentTime);
  await model.scrollIntoViewIfNeeded();await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>!v.paused),{timeout:15000}).toBe(true);
  expect(await video.evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThanOrEqual(paused-.1);
  await page.locator('#sm-motion-setting').selectOption('off');await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.paused),{timeout:15000}).toBe(true);await expect(model).not.toHaveClass(/is-playing/);
  await page.locator('#sm-motion-setting').selectOption('on');await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>!v.paused),{timeout:15000}).toBe(true);
  expect(errors).toEqual([]);await context.close();
 });
}
