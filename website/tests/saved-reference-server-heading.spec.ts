import {test,expect} from '@playwright/test';
for(const width of [320,390,768,1024,1440])test(`reference-inspired server heading fits at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:850});
 await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','off'));
 await page.route('**/main-D5MQsYQ6.js*',route=>route.abort());await page.route('**/*.mp4*',route=>route.abort());await page.route('https://**',route=>route.abort());
 await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});await page.addStyleTag({content:'.loader,.nav{display:none!important}'});await page.evaluate(()=>document.fonts.ready);
 const intro=page.locator('.sm-servers__intro'),title=intro.locator('h2'),motif=intro.locator('.sm-servers__motif');
 await expect(title).toHaveText('اختر سيرفرك');await expect(title).toHaveCSS('color','rgb(232, 188, 107)');
 await expect(motif).toBeVisible();await expect.poll(()=>motif.evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBe(true);
 expect(await title.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
 const bounds=await intro.evaluate(el=>{const h=el.querySelector('h2')!.getBoundingClientRect(),m=el.querySelector('img')!.getBoundingClientRect(),p=el.querySelector('.sm-servers__summary')!.getBoundingClientRect();return {left:h.left,right:h.right,hBottom:h.bottom,mTop:m.top,mBottom:m.bottom,pTop:p.top}});
 expect(bounds.left).toBeGreaterThanOrEqual(0);expect(bounds.right).toBeLessThanOrEqual(width);expect(bounds.mTop).toBeGreaterThanOrEqual(bounds.hBottom);expect(bounds.pTop).toBeGreaterThanOrEqual(bounds.mBottom);
 const ghost=page.locator('.sm-servers > .float');await expect(ghost).toHaveAttribute('aria-hidden','true');
 expect(await ghost.evaluate(el=>{const r=el.getBoundingClientRect(),style=getComputedStyle(el),ctx=document.createElement('canvas').getContext('2d')!;ctx.font=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;return r.left>=-1&&r.right<=innerWidth+1&&ctx.measureText(el.textContent||'').width<=r.width})).toBe(true);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
});

test('background title remains responsive with the reference scroll engine enabled',async({browser})=>{
 const fs=await import('node:fs'),path=await import('node:path');
 let source=fs.readFileSync(path.resolve('../home-preview/saved-reference/assets/main-D5MQsYQ6.js'),'utf8');
 let start=source.indexOf(',function(t){var e;const n=.0015'),end=source.indexOf(';const Ay=document.querySelectorAll',start);
 if(start<0||end<0)throw new Error('Reference WebGL block not found');source=source.slice(0,start)+source.slice(end);
 start=source.indexOf('window.addEventListener("load",()=>{My()&&function({patternSize:');end=source.indexOf('document.addEventListener("DOMContentLoaded",()=>{const t=document.title',start);if(start>=0&&end>=0)source=source.slice(0,start)+source.slice(end);
 const context=await browser.newContext({viewport:{width:1440,height:850},reducedMotion:'no-preference'}),page=await context.newPage();
 await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','on'));
 await page.route('**/main-D5MQsYQ6.js*',route=>route.fulfill({body:source,contentType:'text/javascript'}));await page.route('**/*.mp4*',route=>route.abort());await page.route('https://**',route=>route.abort());
 await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});await page.addStyleTag({content:'.loader,.nav{display:none!important}'});
 await page.locator('#servers-title').scrollIntoViewIfNeeded();await expect(page.locator('#servers-title')).toBeVisible();
 await expect(page.locator('.sm-servers .float')).toHaveCount(1);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(1440);await context.close();
});

for(const width of [390,1440])test(`background lettering follows scroll both ways and motion preference at ${width}px`,async({browser})=>{
 const fs=await import('node:fs'),path=await import('node:path');
 let source=fs.readFileSync(path.resolve('../home-preview/saved-reference/assets/main-D5MQsYQ6.js'),'utf8');
 let start=source.indexOf(',function(t){var e;const n=.0015'),end=source.indexOf(';const Ay=document.querySelectorAll',start);
 if(start<0||end<0)throw new Error('Reference WebGL block not found');source=source.slice(0,start)+source.slice(end);
 start=source.indexOf('window.addEventListener("load",()=>{My()&&function({patternSize:');end=source.indexOf('document.addEventListener("DOMContentLoaded",()=>{const t=document.title',start);if(start>=0&&end>=0)source=source.slice(0,start)+source.slice(end);
 const context=await browser.newContext({viewport:{width,height:850},hasTouch:width===390,isMobile:width===390,reducedMotion:'reduce'}),page=await context.newPage();
 await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','on'));
 await page.route('**/main-D5MQsYQ6.js*',route=>route.fulfill({body:source,contentType:'text/javascript'}));await page.route('**/*.mp4*',route=>route.abort());await page.route('https://**',route=>route.abort());
 await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});await page.addStyleTag({content:'.loader,.nav{display:none!important}'});
 const section=page.locator('#works'),label=section.locator('.float');
 const go=async(offset:number)=>{await page.evaluate(offset=>{const el=document.querySelector('#works')!;const top=window.scrollY+el.getBoundingClientRect().top;window.scrollTo(0,top+offset)},offset);await page.waitForTimeout(1400)};
 const shift=()=>label.evaluate(el=>new DOMMatrixReadOnly(getComputedStyle(el).transform).m42);
 await go(200);await expect.poll(shift).toBeGreaterThan(50);const first=await shift();
 await go(900);await expect.poll(shift).toBeGreaterThan(first+300);const second=await shift();
 await go(300);await expect.poll(shift).toBeLessThan(second-300);
 await page.locator('#sm-motion-setting').evaluate((el:HTMLSelectElement)=>{el.value='off';el.dispatchEvent(new Event('change',{bubbles:true}))});await expect(label).toHaveCSS('transform','none');
 await page.locator('#sm-motion-setting').evaluate((el:HTMLSelectElement)=>{el.value='auto';el.dispatchEvent(new Event('change',{bubbles:true}))});await expect(label).toHaveCSS('transform','none');
 await page.locator('#sm-motion-setting').evaluate((el:HTMLSelectElement)=>{el.value='on';el.dispatchEvent(new Event('change',{bubbles:true}))});await expect.poll(shift).toBeGreaterThan(50);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);await context.close();
});
