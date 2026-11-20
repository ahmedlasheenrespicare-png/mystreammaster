import {test,expect} from '@playwright/test';

for (const width of [320,390,768,1440,2560]) test(`ribbons sit behind the about introduction at ${width}px`,async({browser})=>{
 test.setTimeout(90000);
 const context=await browser.newContext({viewport:{width,height:900},isMobile:width<600,hasTouch:width<600,reducedMotion:'no-preference'});
 await context.addInitScript(()=>localStorage.setItem('sm-motion-preference','on'));
 const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 if(width>=600)await page.route('**/main-D5MQsYQ6.js*',r=>r.fulfill({body:'',contentType:'text/javascript'}));
 await page.route('https://**',r=>r.abort());await page.route('**/*.mp4*',r=>r.abort());
 await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});await page.addStyleTag({content:'.loader{display:none!important}'});
 await expect(page.locator('.ban .rose-strip')).toHaveCount(0);
 const scene=page.locator('.about-ribbons-scene');await scene.scrollIntoViewIfNeeded();
 await expect(scene.locator('.rose-strip')).toHaveCount(1);await expect(scene.locator('.rose-strip__card')).not.toHaveCount(0);
 await expect(scene.locator('.hero-brand-row')).toHaveCount(2);await expect(scene.locator('.abt__top__text > p')).toHaveCount(2);
 for(const text of await scene.locator('.abt__top__text > p').all())await expect(text).toBeVisible();
 await expect(scene.locator('.sm-about__welcome')).toBeVisible();
 await expect(scene.locator('.rose-strip__track')).toHaveCSS('animation-play-state','running');
 await expect(scene.locator('.hero-brand-track').first()).toHaveCSS('animation-play-state','running');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.evaluate(()=>{const select=document.querySelector<HTMLSelectElement>('#sm-motion-setting')!;select.value='off';select.dispatchEvent(new Event('change'))});
 await expect(scene.locator('.rose-strip__track')).toHaveCSS('animation-name','none');
 await expect(scene.locator('.hero-brand-track').first()).toHaveCSS('animation-name','none');
 expect(errors).toEqual([]);await context.close();
});

test('ribbons run in the about section with the original desktop scroll engine',async({page})=>{
 test.setTimeout(120000);await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','on'));
 await page.route('https://**',r=>r.abort());await page.route('**/*.mp4*',r=>r.abort());
 await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});
 await expect(page.locator('.loader')).toBeHidden({timeout:60000});
 await page.evaluate(()=>{(window as any).smScrollToSection(document.querySelector('.about-ribbons-scene'))});
 const scene=page.locator('.about-ribbons-scene');
 await expect.poll(()=>scene.evaluate(e=>Math.abs(e.getBoundingClientRect().top)),{timeout:60000}).toBeLessThan(100);
 await expect(scene.locator('.rose-strip__track')).toHaveCSS('animation-play-state','running',{timeout:30000});
 await expect(scene.locator('.hero-brand-track').first()).toHaveCSS('animation-play-state','running');
});

test('the reel follows scroll in both directions and pauses offscreen',async({browser})=>{
 test.setTimeout(90000);
 const context=await browser.newContext({viewport:{width:390,height:900},isMobile:true,hasTouch:true});
 await context.addInitScript(()=>localStorage.setItem('sm-motion-preference','on'));
 const page=await context.newPage();await page.route('https://**',r=>r.abort());await page.route('**/*.mp4*',r=>r.abort());
 await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});
 await expect(page.locator('.loader')).toBeHidden({timeout:60000});
 const scene=page.locator('.about-ribbons-scene');
 const position=async(top:number)=>{await scene.evaluate((el,y)=>window.scrollTo({top:window.scrollY+el.getBoundingClientRect().top-y,behavior:'instant'}),top);await page.waitForTimeout(1200);return Number(await scene.getAttribute('data-reel-progress'))};
 const first=await position(700),down=await position(100),up=await position(700);
 expect(down).toBeGreaterThan(first+.2);expect(up).toBeLessThan(down-.2);
 await position(100);
 const card=scene.locator('.rose-strip__card').first();
 await expect(card.locator('img')).toHaveCSS('object-fit','contain');
 await expect(scene.locator('.rose-strip__track')).toHaveCSS('opacity','0.85');
 await expect(scene.locator('.hero-brand-row').first()).toHaveCSS('opacity','0.58');
 await expect.poll(()=>scene.locator('.rose-strip__card[style*="poster-background"]').count()).toBeGreaterThan(0);
 await page.locator('#works').evaluate(el=>el.scrollIntoView({behavior:'instant'}));
 await expect(scene.locator('.rose-strip__track')).toHaveCSS('animation-play-state','paused');
 await expect(scene.locator('.hero-brand-track').first()).toHaveCSS('animation-play-state','paused');
 await context.close();
});
