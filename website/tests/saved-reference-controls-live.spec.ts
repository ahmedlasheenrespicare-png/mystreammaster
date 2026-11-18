import {test,expect} from '@playwright/test';
test('actual mobile preview plays, then responds to touch and resumes',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:850},isMobile:true,hasTouch:true});const page=await context.newPage();
 await page.route('https://**',r=>r.abort());await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});
 const video=page.locator('.hero-film--mobile video'),arrows=page.locator('.preview-controls--hero');
 await expect(arrows).toBeHidden();await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.currentTime),{timeout:30000}).toBeGreaterThan(.3);
 await expect(page.locator('.loader')).toBeHidden({timeout:25000});await page.locator('.preview-touch--hero').tap({position:{x:150,y:120}});
 await expect(arrows).toBeVisible();await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.paused)).toBe(true);
 await expect(arrows).toBeHidden({timeout:9000});await expect.poll(()=>video.evaluate((v:HTMLVideoElement)=>v.paused),{timeout:8000}).toBe(false);
 const stage=page.locator('#cinema-library .smcin-stage'),controls=stage.locator('.preview-controls--cinema');await stage.scrollIntoViewIfNeeded();await expect(controls).toBeHidden();await expect(stage.locator('.smcin-active')).toHaveCount(1,{timeout:25000});
 await stage.locator('.preview-touch--cinema').scrollIntoViewIfNeeded();await page.waitForTimeout(2000);
 await stage.locator('.preview-touch--cinema').tap({position:{x:150,y:100}});await expect(controls).toBeVisible();const film=await stage.locator('.smcin-active').getAttribute('data-scene-id');await expect(controls).toBeHidden({timeout:9000});await expect.poll(()=>stage.locator('.smcin-active').getAttribute('data-scene-id'),{timeout:16000}).not.toBe(film);
 await context.close();
});
