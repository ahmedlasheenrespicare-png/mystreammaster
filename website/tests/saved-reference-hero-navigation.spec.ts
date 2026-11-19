import {test,expect} from '@playwright/test';

for (const width of [320,390,768,1440,2560]) test(`about ribbons and header fit at ${width}px with motion on`,async({browser})=>{
 test.setTimeout(90000);
 const context=await browser.newContext({viewport:{width,height:900},isMobile:width<600,hasTouch:width<600,reducedMotion:'no-preference'});
 await context.addInitScript(()=>localStorage.setItem('sm-motion-preference','on'));
 const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 if(width>=600)await page.route('**/main-D5MQsYQ6.js*',r=>r.fulfill({body:'',contentType:'text/javascript'}));
 await page.route('https://**',r=>r.abort());await page.route('**/*.mp4*',r=>r.abort());
 await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});
 await page.addStyleTag({content:'.loader{display:none!important}'});
 const rows=page.locator('.hero-brand-row');await expect(rows).toHaveCount(2);
 await expect.poll(()=>page.locator('.hero-brand-card img').evaluateAll(els=>els.every(e=>(e as HTMLImageElement).complete&&(e as HTMLImageElement).naturalWidth>0)),{timeout:30000}).toBe(true);
 const sizes=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth, rows:[...document.querySelectorAll<HTMLElement>('.hero-brand-row')].map(row=>({width:row.offsetWidth,group:(row.querySelector('.hero-brand-group') as HTMLElement).offsetWidth,opacity:getComputedStyle(row).opacity})),gap:getComputedStyle(document.querySelector('.rose-strip__perspective')!).gap}));
 expect(sizes.overflow).toBe(false);for(const row of sizes.rows){expect(row.group).toBeGreaterThanOrEqual(row.width);expect(row.opacity).toBe('0.58')};if(width<=600)expect(sizes.gap).toBe('22px');
 await page.locator('.about-ribbons-scene').scrollIntoViewIfNeeded();
 await expect(page.locator('.hero-brand-track').first()).toHaveCSS('animation-play-state','running');
 await expect(page.locator('.hero-wordband__track').first()).toHaveCSS('animation-name','hero-wordband-scroll');
 await expect(page.locator('.nav__socials a')).toHaveText(['نوفا','إيستار','موكا','X']);
 await page.locator('#works').scrollIntoViewIfNeeded();
 await expect(page.locator('.hero-brand-track').first()).toHaveCSS('animation-play-state','paused',{timeout:15000});
 await expect(page.locator('.hero-wordband__track').first()).toHaveCSS('animation-play-state','paused',{timeout:15000});
 await page.evaluate(()=>{const s=document.querySelector<HTMLSelectElement>('#sm-motion-setting')!;s.value='off';s.dispatchEvent(new Event('change'))});
 await expect(page.locator('.hero-brand-track').first()).toHaveCSS('animation-name','none');
 await expect(page.locator('.hero-wordband__track').first()).toHaveCSS('animation-name','none');
 expect(errors).toEqual([]);await context.close();
});

test('mobile menu comparison closes and opens all specifications with the original engine',async({browser})=>{
 test.setTimeout(120000);
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 await context.addInitScript(()=>localStorage.setItem('sm-motion-preference','off'));
 const page=await context.newPage();await page.route('https://**',r=>r.abort());await page.route('**/*.mp4*',r=>r.abort());
 await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});
 await page.locator('.nav__menu-btn').click({timeout:60000});
 await expect(page.locator('.nav__menu-btn')).toHaveAttribute('aria-expanded','true');
 await expect(page.locator('.nav__menu .links a')).toHaveCount(10);
 await expect(page.locator('.nav__menu .preview-menu-actions')).toHaveCount(0);
 await page.locator('.nav__menu a[href="#servers-compare"]').click();
 await expect(page.locator('.nav__menu-btn')).toHaveAttribute('aria-expanded','false');
 await expect(page.locator('.server-spec-more[open]')).toHaveCount(4);
 await expect.poll(()=>page.locator('#works').evaluate(el=>Math.abs(el.getBoundingClientRect().top)),{timeout:60000}).toBeLessThan(100);
 await context.close();
});

test('header hides down and returns up with the original mobile engine',async({browser})=>{
 test.setTimeout(120000);
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const page=await context.newPage();
 await page.route('https://**',r=>r.abort());await page.route('**/*.mp4*',r=>r.abort());
 await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});
 await expect(page.locator('.loader')).toBeHidden({timeout:60000});
 await page.evaluate(()=>window.scrollTo(0,500));await expect(page.locator('.nav')).toHaveClass(/is-scrolled-away/);
 await page.evaluate(()=>window.scrollTo(0,200));await expect(page.locator('.nav')).not.toHaveClass(/is-scrolled-away/);
 await context.close();
});

test('desktop navigation works with the original scroll engine and motion enabled',async({page})=>{
 test.setTimeout(120000);
 await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','on'));
 await page.route('https://**',r=>r.abort());await page.route('**/*.mp4*',r=>r.abort());
 await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});
 await expect(page.locator('.loader')).toBeHidden({timeout:60000});
 await page.locator('.nav__links a[href="#cinema-library"]').click({timeout:30000});
 await expect.poll(()=>page.locator('#cinema-library').evaluate(el=>Math.abs(el.getBoundingClientRect().top)),{timeout:60000}).toBeLessThan(160);

});

test('desktop header follows scrolling with the original engine and motion enabled',async({page})=>{
 test.setTimeout(120000);
 await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','on'));
 await page.route('https://**',r=>r.abort());await page.route('**/*.mp4*',r=>r.abort());
 await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});
 await expect(page.locator('.loader')).toBeHidden({timeout:60000});
 await page.evaluate(()=>window.scrollTo({top:500,behavior:'instant'}));
 await expect(page.locator('.nav')).toHaveClass(/is-scrolled-away/,{timeout:15000});
 await page.evaluate(()=>window.scrollTo({top:200,behavior:'instant'}));
 await expect(page.locator('.nav')).not.toHaveClass(/is-scrolled-away/,{timeout:15000});
});
