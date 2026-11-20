import {test,expect} from '@playwright/test';

for(const width of [320,390,768,1440,2560]) test(`section entries stagger, reverse and respect motion at ${width}px`,async({browser})=>{
 const context=await browser.newContext({viewport:{width,height:900},isMobile:width<600,hasTouch:width<600,reducedMotion:'no-preference'}),page=await context.newPage();
 await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','on'));
 // Exercise the native page engine on phones; desktop deterministic scroll checks isolate ScrollSmoother.
 if(width>=600)await page.route('**/main-D5MQsYQ6.js*',route=>route.fulfill({body:'',contentType:'text/javascript'}));
 await page.route('**/*.mp4*',route=>route.abort());await page.route('https://**',route=>route.abort());
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});await page.addStyleTag({content:'.loader{display:none!important}'});
 const move=async(top:number)=>{await page.evaluate(top=>{const el=document.querySelector('#supported-devices')!;window.scrollTo({top:window.scrollY+el.getBoundingClientRect().top-top,behavior:'instant'})},top);await page.waitForTimeout(500)};
 const get=()=>page.locator('#supported-devices .sm-device').evaluateAll(els=>els.map(el=>Number((el as HTMLElement).dataset.flowProgress)));
 await move(650);const start=await get();expect(start[0]).toBeGreaterThan(start[1]);expect(start[1]).toBeGreaterThan(start[2]);
 const directions=await page.locator('#supported-devices .sm-device').evaluateAll(els=>els.map(el=>[(el as HTMLElement).style.getPropertyValue('--entry-x'),(el as HTMLElement).style.getPropertyValue('--entry-y')]));
 expect(parseFloat(directions[0][0])).toBeGreaterThan(0);expect(parseFloat(directions[1][1])).toBeGreaterThan(0);expect(parseFloat(directions[2][0])).toBeLessThan(0);
 await move(200);expect(await get()).toEqual([1,1,1]);await move(650);const reverse=await get();for(let i=0;i<3;i++)expect(reverse[i]).toBeCloseTo(start[i],1);
 await move(200);const phone=page.locator('.sm-device--phone button');await phone.click();await expect(phone).toHaveAttribute('aria-pressed','true');
 expect(await page.locator('.world-launch').evaluate(el=>el.classList.contains('flow-entry'))).toBe(false);
 await page.locator('#sm-motion-setting').selectOption('off',{force:true});await expect.poll(()=>page.locator('.sm-device').first().evaluate(el=>getComputedStyle(el).translate)).toBe('none');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);expect(errors).toEqual([]);await context.close();
});
