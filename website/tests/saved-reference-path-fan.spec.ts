import {test,expect} from '@playwright/test';
for(const size of [{width:320,height:700},{width:390,height:850},{width:768,height:900}])test(`full-page fan works with motion on at ${size.width}px`,async({browser})=>{
 test.setTimeout(90000);const context=await browser.newContext({viewport:size,hasTouch:true,isMobile:size.width<768,reducedMotion:'no-preference'}),page=await context.newPage(),errors:string[]=[];
 await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','on'));await page.route('**/*.mp4*',r=>r.abort());await page.route('https://**',r=>r.abort());page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});await page.addStyleTag({content:'.loader,.nav{display:none!important}'});
 expect(await page.evaluate(()=>{const root=document.querySelector('#path-section')!,children=Array.from(root.children),a=children.indexOf(root.querySelector('.sm-path__intro')!),b=children.indexOf(root.querySelector('.sm-fan-zone')!),c=children.indexOf(root.querySelector('.sm-path__trial-after-fan')!);return a>=0&&a<b&&b<c})).toBe(true);
 const fan=page.locator('.sm-fan'),cards=fan.locator('.sm-fan-card');await expect(page.locator('html')).toHaveAttribute('data-motion-reduced','false');await expect(cards).toHaveCount(3);
 await fan.scrollIntoViewIfNeeded();await expect(fan).toHaveClass(/is-revealed/,{timeout:20000});await expect(fan).toHaveAttribute('data-active','1',{timeout:20000});
 await expect.poll(()=>cards.first().evaluate(e=>getComputedStyle(e).transform),{timeout:20000}).toMatch(/^matrix\(/);await page.waitForTimeout(2000);
 const results=await cards.evaluateAll(es=>es.map(e=>{const c=e.getBoundingClientRect(),a=e.querySelector('a')!.getBoundingClientRect(),text=e.querySelector('.sm-fan-content > div')!.getBoundingClientRect(),bottom=e.querySelector('.sm-fan-bottom')!.getBoundingClientRect();return {outside:a.bottom>c.bottom+3||a.left<c.left-3||a.right>c.right+3,overlap:text.bottom>bottom.top-3}}));expect(results.every(r=>!r.outside&&!r.overlap)).toBe(true);
 await page.locator('.sm-fan-next').click();await expect(fan).toHaveAttribute('data-active','2',{timeout:15000});await page.locator('.sm-fan-prev').click();await expect(fan).toHaveAttribute('data-active','1',{timeout:15000});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);await context.close();
});
