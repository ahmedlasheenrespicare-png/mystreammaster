import {test,expect} from '@playwright/test';

test('desktop smoother updates path and journey without idle frame loops',async({page})=>{
 test.setTimeout(150000);
 await page.setViewportSize({width:1440,height:1000});
 await page.addInitScript(()=>{
  localStorage.setItem('sm-motion-preference','on');
  const raf=window.requestAnimationFrame.bind(window);
  (window as any).desktopFrames={path:0,journey:0};
  window.requestAnimationFrame=callback=>{
   const stack=new Error().stack||'';
   const kind=stack.includes('path-section.js')?'path':stack.includes('about-motion.js')?'journey':null;
   return raf(time=>{if(kind)(window as any).desktopFrames[kind]++;callback(time)});
  };
 });
 await page.route('**/*.mp4*',r=>r.abort());await page.route('https://**',r=>r.abort());
 await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});
 await page.addStyleTag({content:'.loader,.nav{display:none!important}'});
 await expect(page.locator('html')).toHaveAttribute('data-motion-reduced','false');
 await expect.poll(()=>page.locator('#smooth-wrapper').evaluate(e=>getComputedStyle(e).position)).toBe('fixed');
 const heading=page.locator('.sm-path__heading'),accent=heading.locator('.sm-path__script');
 await heading.evaluate(el=>{const r=el.getBoundingClientRect();window.scrollBy(0,r.top+r.height/2-innerHeight*.65)});
 await expect.poll(()=>heading.evaluate(el=>el.getBoundingClientRect().top),{timeout:20000}).toBeLessThan(500);
 const before=await accent.evaluate(e=>parseFloat((e as HTMLElement).style.getPropertyValue('--sm-path-script-y')));
 await page.mouse.wheel(0,250);
 await expect.poll(()=>accent.evaluate(e=>parseFloat((e as HTMLElement).style.getPropertyValue('--sm-path-script-y')))).toBeGreaterThan(before+5);
 await page.waitForTimeout(2500);await page.evaluate(()=>{(window as any).desktopFrames.path=0});await page.waitForTimeout(800);
 expect(await page.evaluate(()=>(window as any).desktopFrames.path)).toBeLessThanOrEqual(2);
 const stage=page.locator('.sm-journey__stage'),cards=stage.locator('.sm-journey__steps li');
 await expect(stage).toHaveAttribute('data-scroll-active','true');
 await stage.evaluate(el=>{const r=el.getBoundingClientRect(),v=el.querySelector('.sm-journey__stage-view')!;scrollBy(0,r.top+(r.height-v.getBoundingClientRect().height)*.4)});
 await expect(cards.nth(1)).toHaveAttribute('data-current','true',{timeout:10000});
 await page.waitForTimeout(2500);await page.evaluate(()=>{(window as any).desktopFrames.journey=0});await page.waitForTimeout(500);
 expect(await page.evaluate(()=>(window as any).desktopFrames.journey)).toBeLessThanOrEqual(3);
 await page.mouse.wheel(0,400);await expect(cards.nth(2)).toHaveAttribute('data-current','true',{timeout:8000});
 await page.mouse.wheel(0,-400);await expect(cards.nth(1)).toHaveAttribute('data-current','true',{timeout:8000});
});
