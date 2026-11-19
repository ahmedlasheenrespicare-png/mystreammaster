import {test,expect} from '@playwright/test';
for(const width of [320,390,768,1440,2560])test(`path ends after trial on ${width}px`,async({browser})=>{
 const context=await browser.newContext({viewport:{width,height:900},isMobile:width<600,hasTouch:width<600,reducedMotion:'reduce'});const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','off'));if(width>=600)await page.route('**/main-D5MQsYQ6.js*',r=>r.fulfill({body:'',contentType:'text/javascript'}));
 await page.route('https://**',r=>r.abort());await page.route('**/*.mp4*',r=>r.abort());await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});await page.addStyleTag({content:'.loader{display:none!important}'});
 const section=page.locator('#path-section');await expect(section.locator('.sm-fan-card')).toHaveCount(3);await expect(section.locator('.sm-path__trial')).toHaveAttribute('href',/^https:\/\/wa\.me\/201090415657\?text=/);
 await expect(section.locator('.sm-path__trial-after-fan')).toBeVisible();await expect(section.locator('.sm-path__choices-heading,.sm-path__shared,.sm-path__compare,.sm-path__note,.sm-path__disclaimer')).toHaveCount(0);
 await expect(page.locator('#works')).toHaveCount(1);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);await context.close();
});
