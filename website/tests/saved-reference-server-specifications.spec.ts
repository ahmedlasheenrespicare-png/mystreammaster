import { test, expect } from '@playwright/test';

for (const width of [320,390,768,1440]) {
 test(`server details and comparison navigation at ${width}px`, async ({browser}) => {
  test.setTimeout(100000);
  const context=await browser.newContext({viewport:{width,height:900},isMobile:width<600,hasTouch:width<600,reducedMotion:'reduce'});
  const page=await context.newPage(), errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  if(width>=600)await page.route('**/main-D5MQsYQ6.js*',r=>r.fulfill({body:'',contentType:'text/javascript'}));
  await page.route('https://**',r=>r.abort());await page.route('**/*.mp4*',r=>r.abort());
  await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});
  await page.addStyleTag({content:'.loader{display:none!important}'});
  const root=page.locator('#works .preview'),link=page.locator('.sm-path__compare--shared');
  await link.scrollIntoViewIfNeeded();await link.click();
  await expect(page).toHaveURL(/#servers-compare$/);
  await expect(root.locator('.server-spec-more[open]')).toHaveCount(4);
  await expect(root).toHaveClass(/has-expanded-specs/);
  const before=await root.locator('[data-ring-pos="front"]').getAttribute('aria-label');
  const next=root.locator('.league-carousel-nav.next');await next.scrollIntoViewIfNeeded();await next.click();
  await expect(root.locator('[data-ring-pos="front"]')).not.toHaveAttribute('aria-label',before!);
  await expect(root.locator('.server-spec-more[open]')).toHaveCount(4);
  const active=root.locator('[data-ring-pos="front"]');
  await expect(active.locator('.server-spec-content dl>div')).toHaveCount(6);
  const layout=await active.evaluate(e=>{const scene=e.closest('.lc-ring-scene')!.getBoundingClientRect(),actions=e.querySelector('.actions')!.getBoundingClientRect();return{fits:actions.bottom<=scene.bottom,overflow:document.documentElement.scrollWidth>innerWidth}});
  expect(layout.fits).toBe(true);expect(layout.overflow).toBe(false);
  expect(errors).toEqual([]);await context.close();
 });
}
test('comparison hash opens every card on arrival',async({page})=>{
 await page.route('**/main-D5MQsYQ6.js*',r=>r.fulfill({body:'',contentType:'text/javascript'}));
 await page.route('https://**',r=>r.abort());await page.route('**/*.mp4*',r=>r.abort());
 await page.goto('/home-preview/saved-reference/#servers-compare',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#works .server-spec-more[open]')).toHaveCount(4);
});

for (const destination of ['path', 'steps', 'direct']) {
 test(`real desktop scroll engine reaches comparison from ${destination}`, async ({page}) => {
  test.setTimeout(120000);
  await page.route('https://**',r=>r.abort());
  await page.route('**/*.mp4*',r=>r.abort());
  await page.goto('/home-preview/saved-reference/'+(destination==='direct'?'#servers-compare':''),{waitUntil:'domcontentloaded'});
  if(destination!=='direct') {
   const link=destination==='path'?'.sm-path__compare--shared':'.steps__details a[href="#servers-compare"]';
   await page.locator(link).evaluate((el:HTMLElement)=>el.click());
  }
  const root=page.locator('#works .preview');
  await expect(root.locator('.server-spec-more[open]')).toHaveCount(4);
  await expect.poll(()=>page.locator('#works').evaluate(el=>Math.abs(el.getBoundingClientRect().top)),{timeout:60000}).toBeLessThan(100);
  const next=root.locator('.league-carousel-nav.next');
  await next.scrollIntoViewIfNeeded();
  const before=await root.locator('[data-ring-pos="front"]').getAttribute('aria-label');
  await next.click({timeout:20000});
  await expect(root.locator('[data-ring-pos="front"]')).not.toHaveAttribute('aria-label',before!);
  await expect(root.locator('.server-spec-more[open]')).toHaveCount(4);
 });
}

for (const width of [320, 390, 768]) {
 test(`server cards animate on small screen ${width} when motion is enabled`, async ({browser})=>{
  test.setTimeout(60000);
  const context=await browser.newContext({viewport:{width,height:900},isMobile:width<600,hasTouch:true,reducedMotion:'reduce'});
  await context.addInitScript(()=>localStorage.setItem('sm-motion-preference','on'));
  const page=await context.newPage();
  await page.route('**/main-D5MQsYQ6.js*',r=>r.fulfill({body:'',contentType:'text/javascript'}));
  await page.route('https://**',r=>r.abort());await page.route('**/*.mp4*',r=>r.abort());
  await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});
  await page.addStyleTag({content:'.loader{display:none!important}'});
  const root=page.locator('#works .preview');
  await root.scrollIntoViewIfNeeded();
  await root.locator('.server-spec-more').evaluateAll(nodes=>nodes.forEach(node=>(node as HTMLDetailsElement).open=true));
  await expect(root.locator('.server-spec-more[open]')).toHaveCount(4);
  await expect.poll(()=>root.evaluate(el=>getComputedStyle(el.querySelector('.lc-ring-inner')!).transitionDuration)).not.toBe('0s');
  const before=await root.locator('[data-ring-pos="front"]').getAttribute('aria-label');
  await expect.poll(()=>root.locator('[data-ring-pos="front"]').getAttribute('aria-label'),{timeout:15000}).not.toBe(before);
  await page.evaluate(()=>{document.querySelector<HTMLSelectElement>('#sm-motion-setting')!.value='off';document.querySelector('#sm-motion-setting')!.dispatchEvent(new Event('change'))});
  await expect.poll(()=>root.evaluate(el=>getComputedStyle(el.querySelector('.lc-ring-inner')!).transitionDuration)).toBe('0s');
  const stopped=await root.locator('[data-ring-pos="front"]').getAttribute('aria-label');
  await page.waitForTimeout(6000);
  await expect(root.locator('[data-ring-pos="front"]')).toHaveAttribute('aria-label',stopped!);
  await context.close();
 });
}

test('mobile motion runs with the original scroll engine after comparison navigation', async ({browser})=>{
 test.setTimeout(120000);
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'no-preference'});
 await context.addInitScript(()=>localStorage.setItem('sm-motion-preference','on'));
 const page=await context.newPage();
 await page.route('https://**',r=>r.abort());await page.route('**/*.mp4*',r=>r.abort());
 await page.goto('/home-preview/saved-reference/#servers-compare',{waitUntil:'domcontentloaded'});
 const root=page.locator('#works .preview');
 await expect(root.locator('.server-spec-more[open]')).toHaveCount(4);
 await expect.poll(()=>root.evaluate(el=>{const r=el.getBoundingClientRect();return r.top<innerHeight&&r.bottom>0}),{timeout:60000}).toBe(true);
 const before=await root.locator('[data-ring-pos="front"]').getAttribute('aria-label');
 await expect.poll(()=>root.locator('[data-ring-pos="front"]').getAttribute('aria-label'),{timeout:20000}).not.toBe(before);
 await expect(root.locator('.server-spec-more[open]')).toHaveCount(4);
 await context.close();
});
