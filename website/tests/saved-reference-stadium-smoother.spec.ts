import {test,expect} from '@playwright/test';
for(const size of [{width:390,height:844},{width:1440,height:900}])test(`stadium runs alongside actual page motion at ${size.width}px`,async({browser})=>{
 test.setTimeout(120000);const context=await browser.newContext({viewport:size,isMobile:size.width<500,hasTouch:size.width<500,reducedMotion:'no-preference'});const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','on'));await page.route('https://**',r=>r.abort());await page.route('**/*.mp4*',r=>r.request().url().includes('featured-stadium.mp4')?r.continue():r.abort());await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});await page.addStyleTag({content:'.loader{display:none!important}'});
 const video=page.locator('.sm-matches__stadium video');await page.locator('.sm-matches__stadium').evaluate(el=>el.scrollIntoView({block:'center'}));await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.currentTime),{timeout:45000}).toBeGreaterThan(.1);expect(errors).toEqual([]);await context.close();
});
