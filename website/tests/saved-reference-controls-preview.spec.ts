import {test,expect} from '@playwright/test';
for(const width of [390,1440]) test(`touch reveals arrows and resumes automatically at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','on'));await page.route('**/main-D5MQsYQ6.js*',r=>r.fulfill({body:'',contentType:'text/javascript'}));await page.route('https://**',r=>r.abort());
 await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});await page.addStyleTag({content:'.loader,.nav,.control-preview-banner{display:none!important}'});
 const hero=page.locator(width<1024?'.hero-film--mobile video':'.hero-film--desktop video'),heroArrows=page.locator('.preview-controls--hero');
 await expect.poll(()=>hero.evaluate((v:HTMLVideoElement)=>v.currentTime),{timeout:20000}).toBeGreaterThan(.1);await expect(heroArrows).toBeHidden();
 await page.locator('.preview-touch--hero').click({position:{x:120,y:120}});await expect(heroArrows).toBeVisible();await expect.poll(()=>hero.evaluate((v:HTMLVideoElement)=>v.paused)).toBe(true);
 const before=await hero.evaluate((v:HTMLVideoElement)=>v.currentTime);await page.locator('[data-hero-step="1"]').click();await expect.poll(()=>hero.evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(before+.2);const at=await hero.evaluate((v:HTMLVideoElement)=>v.currentTime);
 await expect(heroArrows).toBeHidden({timeout:8000});await expect.poll(()=>hero.evaluate((v:HTMLVideoElement)=>v.currentTime),{timeout:5000}).toBeGreaterThan(at+.1);
 const stage=page.locator('#cinema-library .smcin-stage'),arrows=stage.locator('.preview-controls--cinema');await stage.scrollIntoViewIfNeeded();await expect(stage.locator('.smcin-active')).toHaveCount(1,{timeout:15000});await expect(arrows).toBeHidden();
 await stage.locator('.preview-touch--cinema').click({position:{x:120,y:80}});await expect(arrows).toBeVisible();const film=await stage.locator('.smcin-active').getAttribute('data-scene-id');await stage.locator('[data-cinema-step="1"]').click();await expect.poll(()=>stage.locator('.smcin-active').getAttribute('data-scene-id')).not.toBe(film);
 const current=await stage.locator('.smcin-active').getAttribute('data-scene-id');await page.waitForTimeout(1000);await expect(stage.locator('.smcin-active')).toHaveAttribute('data-scene-id',current!);
 await stage.locator('[data-cinema-step="-1"]').click();await expect(stage.locator('.smcin-active')).toHaveAttribute('data-scene-id',film!);await expect(arrows).toBeHidden({timeout:8000});await expect.poll(()=>stage.locator('.smcin-active').getAttribute('data-scene-id'),{timeout:12000}).not.toBe(film);
});
