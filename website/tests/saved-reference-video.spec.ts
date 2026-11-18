import {test,expect} from '@playwright/test';

test('preview serves video with a seekable MP4 response',async({request})=>{
 const url='/home-preview/saved-reference/assets/images/video-streammaster-hero-montage-1080.mp4';
 const head=await request.head(url);expect(head.status()).toBe(200);expect(head.headers()['content-type']).toBe('video/mp4');expect(head.headers()['accept-ranges']).toBe('bytes');
 const range=await request.get(url,{headers:{Range:'bytes=0-31'}});expect(range.status()).toBe(206);expect(range.headers()['content-range']).toMatch(/^bytes 0-31\/\d+$/);expect((await range.body()).length).toBe(32);
 const invalid=await request.get(url,{headers:{Range:'bytes=999999999-'}});expect(invalid.status()).toBe(416);
});

test('about video follows the motion preference and allows deliberate play',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:800},reducedMotion:'reduce'});
 const page=await context.newPage();
 await page.addInitScript(()=>{
  localStorage.setItem('sm-motion-preference','off');
  document.addEventListener('error',e=>{if(e.target instanceof HTMLMediaElement)e.stopImmediatePropagation()},true);
  const states=new WeakMap<HTMLMediaElement,boolean>();
  Object.defineProperty(HTMLMediaElement.prototype,'paused',{get(){return !states.get(this)}});
  HTMLMediaElement.prototype.play=function(){states.set(this,true);this.dispatchEvent(new Event('playing'));return Promise.resolve()};
  HTMLMediaElement.prototype.pause=function(){states.set(this,false);this.dispatchEvent(new Event('pause'))};
 });
 await page.route('**/main-D5MQsYQ6.js*',r=>r.abort());await page.route('**/*.mp4*',r=>r.abort());await page.route('https://**',r=>r.abort());
 await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});await page.addStyleTag({content:'.loader,.nav{display:none!important}'});
 const video=page.locator('.abt__video video'),button=page.locator('.video-play-fallback');
 await video.scrollIntoViewIfNeeded();await expect(button).toContainText('تشغيل');
 await button.click();await expect(button).toContainText('إيقاف');await expect(page.locator('.abt__video')).toHaveClass(/is-playing/);
 await button.click();await expect(button).toContainText('تشغيل');
 async function setting(value:string){await page.evaluate(value=>{const el=document.querySelector<HTMLSelectElement>('#sm-motion-setting')!;el.value=value;el.dispatchEvent(new Event('change'))},value)}
 await setting('on');await expect(button).toContainText('تشغيل');
 await button.click();await expect(button).toContainText('إيقاف');
 await setting('off');await expect(button).toContainText('تشغيل');
 await button.click();await expect(button).toContainText('إيقاف');
 await page.evaluate(()=>window.scrollTo(0,0));await expect(button).toContainText('تشغيل');
 await video.scrollIntoViewIfNeeded();await expect(button).toContainText('تشغيل');
 await context.close();
});

test('1080p video loads and plays in the browser',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:850},reducedMotion:'no-preference'});
 const page=await context.newPage();
 await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','on'));
 await page.route('**/main-D5MQsYQ6.js*',route=>route.abort());await page.route('https://**',route=>route.abort());
 await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});
 await page.addStyleTag({content:'.loader,.nav{display:none!important}'});
 const video=page.locator('.abt__video video');await video.scrollIntoViewIfNeeded();
 await expect.poll(()=>video.evaluate((element:HTMLVideoElement)=>[element.videoWidth,element.videoHeight]),{timeout:15000}).toEqual([1920,1080]);
 await expect.poll(()=>video.evaluate((element:HTMLVideoElement)=>element.currentTime),{timeout:15000}).toBeGreaterThan(0);
 await expect.poll(()=>video.evaluate((element:HTMLVideoElement)=>element.duration),{timeout:15000}).toBeGreaterThan(140);
 await video.evaluate((element:HTMLVideoElement)=>{element.currentTime=75});await expect.poll(()=>video.evaluate((element:HTMLVideoElement)=>element.currentTime),{timeout:15000}).toBeGreaterThan(75);
 await context.close();
});
