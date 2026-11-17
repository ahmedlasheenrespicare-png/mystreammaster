import {test,expect} from '@playwright/test';
for(const width of [320,1440])test(`cinema display and controls ${width}`,async({page})=>{await page.setViewportSize({width,height:850});await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','on'));await page.route('**/main-D5MQsYQ6.js*',r=>r.fulfill({body:'',contentType:'text/javascript'}));await page.route('**/*.mp4*',r=>r.abort());await page.route('https://**',r=>r.abort());await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});await page.addStyleTag({content:'.loader,.nav{display:none!important}'});const section=page.locator('#cinema-library');await section.locator('.smcin-stage').scrollIntoViewIfNeeded();await expect(section.locator('.smcin-panel.smcin-active')).toHaveCount(1,{timeout:10000});await expect(section.locator('.smcin-panel.smcin-active .smcin-overlay')).toHaveCSS('background-color','rgba(0, 0, 0, 0)');await expect.poll(()=>section.locator('.smcin-active > img').first().evaluate((e:HTMLImageElement)=>e.complete&&e.naturalWidth>0),{timeout:20000}).toBe(true);await expect(section.locator('.smcin-control, .smcin-progress, .smcin-note')).toHaveCount(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);});
test('reduced motion and no javascript fallbacks',async({browser})=>{for(const js of [true,false]){const ctx=await browser.newContext({viewport:{width:390,height:850},javaScriptEnabled:js});const page=await ctx.newPage();if(js)await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','off'));await page.route('**/main-D5MQsYQ6.js*',r=>r.fulfill({body:'',contentType:'text/javascript'}));await page.route('https://**',r=>r.abort());await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});await expect(page.locator('#cinema-library .smcin-panel.smcin-active')).toHaveCount(0);if(!js)await expect(page.locator('#cinema-library .smcin-panel')).toHaveCount(5);await ctx.close()}});

for(const width of [320,390,700,768,1440])test(`reel really animates and survives height-only resize at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:800});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','on'));
  await page.route('**/main-D5MQsYQ6.js*',r=>r.fulfill({body:'',contentType:'text/javascript'}));
  await page.route('**/*.mp4*',r=>r.abort());await page.route('https://**',r=>r.abort());
  await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});
  await page.addStyleTag({content:'.loader,.nav{display:none!important}'});
  const stage=page.locator('#cinema-library .smcin-stage'),track=stage.locator('.smcin-track');
  await stage.scrollIntoViewIfNeeded();
  await expect(stage.locator('.smcin-active')).toHaveCount(1,{timeout:8000});
  const panel=stage.locator('.smcin-active');
  expect(parseFloat(await panel.evaluate(el=>getComputedStyle(el).transitionDuration))).toBeGreaterThan(1);
  const first=await panel.evaluate(el=>el.getBoundingClientRect().width);
  await page.waitForTimeout(250);
  const middle=await panel.evaluate(el=>el.getBoundingClientRect().width);
  expect(middle).toBeGreaterThan(first+2);
  await track.evaluate(el=>{(window as any).cinemaTransitionResets=0;new MutationObserver(records=>{for(const r of records)if((r.target as Element).classList.contains('smcin-no-transition'))(window as any).cinemaTransitionResets++}).observe(el,{attributes:true,attributeFilter:['class']})});
  await page.setViewportSize({width,height:760});
  await page.waitForTimeout(350);
  expect(await page.evaluate(()=>(window as any).cinemaTransitionResets)).toBe(0);
  const later=await panel.evaluate(el=>el.getBoundingClientRect().width);
  expect(later).toBeGreaterThanOrEqual(middle-1);
  const railWidth=await stage.locator('.smcin-rail').evaluate(el=>el.getBoundingClientRect().width);
  await expect.poll(()=>panel.evaluate(el=>el.getBoundingClientRect().width),{timeout:3000}).toBeGreaterThan(railWidth*.55);
  const visible=await panel.evaluate(el=>{const p=el.getBoundingClientRect(),r=el.parentElement!.parentElement!.getBoundingClientRect();return p.left>=r.left-1&&p.right<=r.right+1});expect(visible).toBe(true);
});

test('automatic reduced motion stays still; enabling motion overrides the device setting',async({page})=>{
  await page.setViewportSize({width:390,height:800});await page.emulateMedia({reducedMotion:'reduce'});
  await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','auto'));
  await page.route('**/main-D5MQsYQ6.js*',r=>r.fulfill({body:'',contentType:'text/javascript'}));
  await page.route('**/*.mp4*',r=>r.abort());await page.route('https://**',r=>r.abort());
  await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});await page.addStyleTag({content:'.loader,.nav{display:none!important}'});
  const stage=page.locator('#cinema-library .smcin-stage');await stage.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1800);await expect(stage.locator('.smcin-active')).toHaveCount(0);
  await page.locator('#sm-motion-setting').selectOption('on',{force:true});
  await expect(stage.locator('.smcin-active')).toHaveCount(1,{timeout:8000});
  expect(parseFloat(await stage.locator('.smcin-active').evaluate(el=>getComputedStyle(el).transitionDuration))).toBeGreaterThan(1);
  await page.locator('#sm-motion-setting').selectOption('off',{force:true});await expect(stage.locator('.smcin-active')).toHaveCount(0);
});

test('library flower uses the same gold vector on phones and desktop',async({page})=>{
  await page.route('**/main-D5MQsYQ6.js*',r=>r.fulfill({body:'',contentType:'text/javascript'}));
  await page.route('**/*.mp4*',r=>r.abort());await page.route('https://**',r=>r.abort());
  for(const width of [320,390,768,1440]){
    await page.setViewportSize({width,height:800});await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});
    const icons=page.locator('#cinema-library .smcin-track > .smcin-panel .smcin-mini-top i');
    expect(await icons.count()).toBeGreaterThanOrEqual(5);
    const styles=await icons.evaluateAll(items=>items.map(icon=>({color:getComputedStyle(icon).color,svg:icon.querySelectorAll('svg').length,stroke:icon.querySelector('svg path')?getComputedStyle(icon.querySelector('svg path')!).stroke:null})));
    expect(styles.every(item=>item.color==='rgb(240, 197, 120)'&&item.svg===1&&item.stroke==='rgb(240, 197, 120)')).toBe(true);
  }
});

for(const width of [390,1440])test(`all scenes animate with stationary backgrounds at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:850});await page.addInitScript(()=>{localStorage.setItem('sm-motion-preference','on');Math.random=()=>0});
 await page.route('**/main-D5MQsYQ6.js*',r=>r.fulfill({body:'',contentType:'text/javascript'}));await page.route('**/*.mp4*',r=>r.abort());await page.route('https://**',r=>r.abort());
 await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});await page.addStyleTag({content:'.loader,.nav{display:none!important}'});
 const stage=page.locator('#cinema-library .smcin-stage');await stage.scrollIntoViewIfNeeded();const panels=stage.locator('.smcin-track > .smcin-panel');await expect(panels).toHaveCount(105);
 const ids=await panels.evaluateAll(els=>els.slice(35,70).map(el=>el.getAttribute('data-scene-id')));expect(new Set(ids).size).toBe(35);expect(ids).not.toEqual(Array.from({length:35},(_,i)=>String(i)));
 const active=stage.locator('.smcin-panel.smcin-active');await expect(active).toHaveCount(1,{timeout:12000});await expect(active).toHaveClass(/smcin-layers-ready/,{timeout:20000});
 await expect(active.locator('.smcin-backdrop')).toHaveCSS('transform','none');await expect.poll(async()=>active.locator('.smcin-person').evaluate(el=>getComputedStyle(el).transform),{timeout:6000}).not.toBe('none');
 const first=await active.getAttribute('data-scene-id');await expect.poll(()=>active.getAttribute('data-scene-id'),{timeout:10000}).not.toBe(first);
});
