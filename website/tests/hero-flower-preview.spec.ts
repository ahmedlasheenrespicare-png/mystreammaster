import {test,expect} from '@playwright/test';
for(const width of [320,390,768,1023])test(`flower is behind the title after the video at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:850});await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','on'));
 await page.route('**/main-D5MQsYQ6.js*',r=>r.fulfill({body:'',contentType:'text/javascript'}));await page.route('**/*.mp4*',r=>r.abort());await page.route('https://**',r=>r.abort());
 await page.goto('/home-preview/hero-flower-preview/',{waitUntil:'domcontentloaded'});
 const video=page.locator('.ban__oval .hero-film--mobile'),canvas=page.locator('#bannerCanvas');await expect(video).toBeVisible();await expect(canvas).toHaveCount(1);
 const data=await video.evaluate(el=>{const r=el.getBoundingClientRect(),p=el.parentElement!.getBoundingClientRect();return {width:r.width,viewport:document.documentElement.clientWidth,top:r.top,parentTop:p.top,z:getComputedStyle(el).zIndex,canvasZ:getComputedStyle(document.querySelector('#bannerCanvas')!).zIndex,scroll:document.documentElement.scrollWidth}});
 expect(Math.abs(data.width-data.viewport)).toBeLessThanOrEqual(1);expect(Math.abs(data.top-data.parentTop)).toBeLessThanOrEqual(1);expect(Number(data.z)).toBeLessThan(Number(data.canvasZ));expect(data.scroll).toBeLessThanOrEqual(data.viewport);
 await expect(page.locator('.ban > .hero-film--mobile')).toHaveCount(0);
 const placement=await page.evaluate(()=>{const video=document.querySelector('.hero-film--mobile')!.getBoundingClientRect(),flower=document.querySelector('#bannerCanvas')!.getBoundingClientRect(),desc=document.querySelector('.ban__desc')!.getBoundingClientRect();const title=document.querySelector('#sm-hero-copy')!.getBoundingClientRect();return {videoBottom:video.bottom,titleTop:title.top,titleBottom:title.bottom,flowerTop:flower.top,flowerBottom:flower.bottom,descTop:desc.top}});
 expect(placement.titleTop).toBeGreaterThanOrEqual(placement.videoBottom-1);expect(Math.abs(placement.flowerTop-placement.titleTop)).toBeLessThanOrEqual(1);expect(Math.abs(placement.flowerBottom-placement.titleBottom)).toBeLessThanOrEqual(1);expect(placement.descTop).toBeGreaterThanOrEqual(placement.titleBottom-1);
 for(const oval of await page.locator('.ban__oval .ban__oval__bg').all()) await expect(oval).toHaveCSS('visibility','hidden');
});
test('video plays in the flower preview',async({page})=>{
 await page.setViewportSize({width:390,height:850});await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','on'));
 await page.route('**/main-D5MQsYQ6.js*',r=>r.fulfill({body:'',contentType:'text/javascript'}));await page.route('https://**',r=>r.abort());
 await page.goto('/home-preview/hero-flower-preview/',{waitUntil:'domcontentloaded'});const video=page.locator('.ban__oval .hero-film--mobile video');
 await expect.poll(()=>video.evaluate((el:HTMLVideoElement)=>el.currentTime),{timeout:15000}).toBeGreaterThan(.1);await expect(video).toHaveClass(/is-playing/);
});
test('flower remains behind title when page animation scripts run',async({page})=>{
 await page.setViewportSize({width:390,height:850});await page.route('**/*.mp4*',r=>r.abort());await page.route('https://**',r=>r.abort());
 await page.goto('/home-preview/hero-flower-preview/',{waitUntil:'domcontentloaded'});await page.waitForTimeout(2000);
 const rect=await page.evaluate(()=>{const video=document.querySelector('.hero-film--mobile')!.getBoundingClientRect(),flower=document.querySelector('#bannerCanvas')!.getBoundingClientRect(),title=document.querySelector('#sm-hero-copy')!.getBoundingClientRect();return {bottom:video.bottom,top:flower.top,height:flower.height,titleTop:title.top,titleBottom:title.bottom,flowerBottom:flower.bottom,flowerZ:getComputedStyle(document.querySelector('#bannerCanvas')!).zIndex,titleZ:getComputedStyle(document.querySelector('#sm-hero-copy')!).zIndex}});
 expect(rect.height).toBeGreaterThan(300);expect(rect.top).toBeGreaterThanOrEqual(rect.bottom-1);expect(Math.abs(rect.top-rect.titleTop)).toBeLessThanOrEqual(1);expect(Math.abs(rect.flowerBottom-rect.titleBottom)).toBeLessThanOrEqual(1);expect(Number(rect.flowerZ)).toBeLessThan(Number(rect.titleZ));
});
test('title returns to desktop position after resizing',async({page})=>{
 await page.setViewportSize({width:390,height:850});await page.route('**/main-D5MQsYQ6.js*',r=>r.fulfill({body:'',contentType:'text/javascript'}));await page.route('**/*.mp4*',r=>r.abort());await page.route('https://**',r=>r.abort());await page.goto('/home-preview/hero-flower-preview/',{waitUntil:'domcontentloaded'});
 const order=()=>page.evaluate(()=>Array.from(document.querySelector('.ban')!.children).filter(el=>el.matches('#sm-hero-copy,.hero-flower-spacer,.ban__desc')).map(el=>el.className));
 expect((await order())[0]).toContain('sm-hero-copy');await page.setViewportSize({width:1200,height:850});await expect.poll(order).toEqual(['hero-flower-spacer','ban__desc','ban__title sm-hero-copy']);
 await page.setViewportSize({width:390,height:850});await expect.poll(order).toEqual(['ban__title sm-hero-copy','hero-flower-spacer','ban__desc']);
});
