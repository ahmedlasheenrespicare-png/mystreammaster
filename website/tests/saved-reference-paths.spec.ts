import {test,expect} from '@playwright/test';
import fs from 'node:fs';import path from 'node:path';
let source=fs.readFileSync(path.resolve('../home-preview/saved-reference/assets/main-D5MQsYQ6.js'),'utf8');
let start=source.indexOf(',function(t){var e;const n=.0015'),end=source.indexOf(';const Ay=document.querySelectorAll',start);
if(start>=0&&end>=0)source=source.slice(0,start)+source.slice(end);
start=source.indexOf('window.addEventListener("load",()=>{My()&&function({patternSize:');end=source.indexOf('document.addEventListener("DOMContentLoaded",()=>{const t=document.title',start);
if(start>=0&&end>=0)source=source.slice(0,start)+source.slice(end);
for(const width of [320,390,768,1024,1440])test(`homepage paths are usable at ${width}px`,async({browser})=>{
 const context=await browser.newContext({viewport:{width,height:850},reducedMotion:'no-preference'});const page=await context.newPage(),errors:string[]=[];
 await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','off'));
 await page.route('**/main-D5MQsYQ6.js*',route=>route.fulfill({body:source,contentType:'text/javascript'}));
 await page.route('**/*.mp4*',route=>route.abort());await page.route('https://**',route=>route.abort());page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});await page.addStyleTag({content:'.loader,.nav{display:none!important}'});
 const section=page.locator('#path-section'),cards=section.locator('details');
 await expect(section.getByRole('heading',{name:'اختر مسارك'})).toBeVisible();await expect(cards).toHaveCount(3);await expect(section).toHaveAttribute('dir','rtl');await expect(section).toHaveCSS('direction','rtl');await expect(section.locator('.sm-path__guide')).toContainText('استعرض التفاصيل');await expect(section.locator('.sm-path__interest-icon[aria-hidden="true"]')).toHaveCount(3);for(const card of await cards.all()){await expect(card).toHaveCSS('background-color','rgb(255, 255, 255)');expect(await card.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true)}
 await expect(section.locator('[data-path="nova"] [data-path-field="nova.price"]').first()).toHaveText('$25');
 await expect(section.locator('[data-path="istar"] [data-path-field="istar.price"]').first()).toHaveText('$35');
 await expect(section.locator('[data-path="x"] [data-path-field="x.price"]').first()).toHaveText('$20');
 if(width<1024){
  await expect(cards.nth(0)).not.toHaveAttribute('open');await cards.nth(0).locator('summary').click();await expect(cards.nth(0)).toHaveAttribute('open','');
  await expect(cards.nth(0).locator('a.sm-path__buy')).toHaveAttribute('href','/nova/');
  await cards.nth(1).locator('summary').focus();await page.keyboard.press('Enter');await expect(cards.nth(0)).not.toHaveAttribute('open');await expect(cards.nth(1)).toHaveAttribute('open','');
  await cards.nth(1).locator('summary').focus();await page.keyboard.press('Enter');await expect(cards.nth(1)).not.toHaveAttribute('open');
 }else{for(const card of await cards.all())await expect(card).toHaveAttribute('open','');
  await cards.nth(0).locator('summary').focus();await page.keyboard.press('Enter');await expect(cards.nth(0)).not.toHaveAttribute('open');await page.keyboard.press('Enter');await expect(cards.nth(0)).toHaveAttribute('open','');
 }
 await expect(section.locator('.sm-path__trial')).toHaveAttribute('href','/trial/');await expect(section.locator('.sm-path__note a')).toHaveAttribute('href','/moka/');
 await expect(section.locator('.sm-path__compare')).toHaveCount(1);await expect(section.locator('.sm-path__compare')).toHaveAttribute('href','/#pricing');await expect(section.locator('.sm-path__grid .sm-path__compare')).toHaveCount(0);await expect(section.locator('.sm-path__shared')).toContainText('اشتراكات سنوية');await expect(section.locator('.sm-path__shared')).not.toContainText(/نوفا|إيستار|موكا|\bX\b/);const clean=async(selector:string)=>(await section.locator(selector).innerText()).replace(/[\u2066-\u2069]/g,'');expect(await clean('[data-path-shared-vod]')).toBe('أكثر من 50,000 فيلم ومسلسل');expect(await clean('[data-path-shared-channels]')).toBe('أكثر من 14,000 قناة حية');expect(await clean('[data-path-shared-quality]')).toBe('حتى 4K حسب الباقة');await expect(section.locator('.sm-path__grid [data-path-field$=".vod"]')).toHaveCount(0);for(const card of await cards.all()){await expect(card.locator('dl')).toHaveCount(0);await expect(card.locator('.sm-path__buy')).toHaveCount(1)}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);expect(errors).toEqual([]);await context.close();
});

test('path reveals follow the selected motion preference on mobile',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:850},reducedMotion:'reduce'});const page=await context.newPage();
 await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','on'));
 await page.route('**/main-D5MQsYQ6.js*',route=>route.fulfill({body:source,contentType:'text/javascript'}));
 await page.route('**/*.mp4*',route=>route.abort());await page.route('https://**',route=>route.abort());
 await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});await page.addStyleTag({content:'.loader,.nav{display:none!important}'});
 const heading=page.locator('.sm-path__heading h2'),card=page.locator('.sm-path__card').first(),trial=page.locator('.sm-path__trial');
 await expect(heading).toHaveClass(/sm-path-pending/);await expect(card).toHaveClass(/sm-path-pending/);await expect(trial).toHaveClass(/sm-path-pending/);
 await expect(heading.locator('span').first()).toHaveCSS('opacity','0');
 expect(await heading.locator('span').first().evaluate(el=>getComputedStyle(el).transitionDuration)).not.toBe('0s');
 await heading.scrollIntoViewIfNeeded();await expect(heading).not.toHaveClass(/sm-path-pending/);
 await page.locator('#sm-motion-setting').selectOption('off');await expect(card).not.toHaveClass(/sm-path-pending/);await expect(trial).not.toHaveClass(/sm-path-pending/);await expect(trial).toHaveCSS('opacity','1');
 await expect(heading.locator('span').first()).toHaveCSS('transition-duration','0s');
 await page.locator('#sm-motion-setting').selectOption('auto');await expect(card).not.toHaveClass(/sm-path-pending/);
 await page.locator('#sm-motion-setting').selectOption('on');await expect(card).toHaveClass(/sm-path-pending/);
 await card.scrollIntoViewIfNeeded();await expect(card).not.toHaveClass(/sm-path-pending/);await context.close();
});

for(const width of [390,1440])test(`handwritten path phrase follows scroll both ways and motion settings at ${width}px`,async({browser})=>{
 const context=await browser.newContext({viewport:{width,height:850},hasTouch:width===390,isMobile:width===390,reducedMotion:'reduce'}),page=await context.newPage();
 await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','on'));await page.route('**/main-D5MQsYQ6.js*',route=>route.fulfill({body:source,contentType:'text/javascript'}));await page.route('**/*.mp4*',route=>route.abort());await page.route('https://**',route=>route.abort());
 await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});await page.addStyleTag({content:'.loader,.nav{display:none!important}'});await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(1000);
 const phrase=page.locator('.sm-path__script');await expect(phrase).toHaveText('على مزاجك');
 const go=async(fraction:number)=>{await page.evaluate(fraction=>{const el=document.querySelector('.sm-path__heading')!,r=el.getBoundingClientRect();window.scrollTo(0,scrollY+r.top+r.height/2-innerHeight*fraction)},fraction);await page.waitForTimeout(1600)};
 const shift=()=>phrase.evaluate(el=>parseFloat(el.style.getPropertyValue('--sm-path-script-y')));
 const visualOffset=()=>page.evaluate(()=>{const h=document.querySelector('.sm-path__heading')!.getBoundingClientRect(),p=document.querySelector('.sm-path__script')!.getBoundingClientRect();return p.top-h.top});
 await go(.75);await expect.poll(shift).toBeLessThan(-3);const first=await shift(),firstVisual=await visualOffset();await go(.25);await expect.poll(shift).toBeGreaterThan(first+20);const second=await shift(),secondVisual=await visualOffset();expect(secondVisual-firstVisual).toBeGreaterThan(20);await go(.70);await expect.poll(shift).toBeLessThan(second-20);expect(await visualOffset()).toBeLessThan(secondVisual-20);
 const set=async(value:string)=>page.locator('#sm-motion-setting').evaluate((el:HTMLSelectElement,value)=>{el.value=value;el.dispatchEvent(new Event('change',{bubbles:true}))},value);
 await set('off');await expect.poll(()=>phrase.evaluate(el=>el.style.getPropertyValue('--sm-path-script-y'))).toBe('');await go(.3);await expect(phrase).toHaveCSS('transform',/matrix/);await expect.poll(()=>phrase.evaluate(el=>el.style.getPropertyValue('--sm-path-script-y'))).toBe('');
 await set('auto');await expect.poll(()=>phrase.evaluate(el=>el.style.getPropertyValue('--sm-path-script-y'))).toBe('');await set('on');await expect.poll(shift).toBeGreaterThan(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);await context.close();
});

test('wheel visibly moves the phrase relative to its heading',async({page})=>{
 await page.setViewportSize({width:1280,height:850});await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','on'));await page.route('**/main-D5MQsYQ6.js*',route=>route.fulfill({body:source,contentType:'text/javascript'}));await page.route('**/*.mp4*',route=>route.abort());await page.route('https://**',route=>route.abort());await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});await page.addStyleTag({content:'.loader,.nav{display:none!important}'});await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(1500);
 await page.evaluate(()=>{const e=document.querySelector('.sm-path__heading')!,r=e.getBoundingClientRect();window.scrollTo(0,scrollY+r.top+r.height/2-innerHeight*.72)});await page.waitForTimeout(1800);
 const offset=()=>page.evaluate(()=>document.querySelector('.sm-path__script')!.getBoundingClientRect().top-document.querySelector('.sm-path__heading')!.getBoundingClientRect().top),first=await offset();await page.mouse.wheel(0,420);await expect.poll(offset,{timeout:5000}).toBeGreaterThan(first+15);const second=await offset();await page.mouse.wheel(0,-350);await expect.poll(offset,{timeout:5000}).toBeLessThan(second-15);
});

for(const width of [320,768,1440])test(`path background images stop before the action at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:850});await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','off'));await page.route('**/main-D5MQsYQ6.js*',route=>route.fulfill({body:source,contentType:'text/javascript'}));await page.route('**/*.mp4*',route=>route.abort());await page.route('https://**',route=>route.abort());await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});await page.addStyleTag({content:'.loader,.nav{display:none!important}'});await page.evaluate(()=>document.fonts.ready);
 const cards=page.locator('.sm-path__card');
 for(const [index,file] of ['path-sport.jpg','path-cinema.jpg','path-value.jpg'].entries()){
  const card=cards.nth(index);if(width<1024)await card.locator('summary').click();
  await expect(card).toHaveAttribute('open','');await expect.poll(()=>card.evaluate(el=>{const r=el.getBoundingClientRect(),button=el.querySelector('.sm-path__buy')!.getBoundingClientRect(),bottom=parseFloat(getComputedStyle(el,'::before').bottom);return Math.abs(r.bottom-bottom-button.top)})).toBeLessThan(2);
  expect(await card.evaluate(el=>getComputedStyle(el,'::before').backgroundImage)).toContain(file);expect((await page.request.get(`/home-preview/saved-reference/assets/${file}`)).status()).toBe(200);
  if(width<1024){await card.locator('summary').click();await expect(card).not.toHaveAttribute('open');await expect.poll(()=>card.evaluate(el=>parseFloat(getComputedStyle(el,'::before').bottom))).toBe(0)}
 }
});

test('path imagery and actions remain available without JavaScript',async({page})=>{
 await page.route('**/*.js*',route=>route.abort());await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});await page.addStyleTag({content:'.loader,.nav{display:none!important}'});
 for(const [i,file] of ['path-sport.jpg','path-cinema.jpg','path-value.jpg'].entries()){const card=page.locator('.sm-path__card').nth(i);await expect(card).toHaveAttribute('open','');await expect(card.locator('.sm-path__buy')).toBeVisible();expect(await card.evaluate(el=>getComputedStyle(el,'::before').backgroundImage)).toContain(file);const fit=await card.evaluate(el=>{const r=el.getBoundingClientRect(),button=el.querySelector('.sm-path__buy')!.getBoundingClientRect(),bottom=parseFloat(getComputedStyle(el,'::before').bottom);return r.bottom-bottom<=button.top+2});expect(fit).toBe(true)}
});

 test('path cards reveal bottom to top and respect reduced motion',async({browser})=>{
 const context=await browser.newContext({viewport:{width:1440,height:850},reducedMotion:'no-preference'}),page=await context.newPage();
 await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','on'));await page.route('**/main-D5MQsYQ6.js*',route=>route.fulfill({body:source,contentType:'text/javascript'}));await page.route('**/*.mp4*',route=>route.abort());await page.route('https://**',route=>route.abort());await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});await page.addStyleTag({content:'.loader,.nav{display:none!important}'});
 const card=page.locator('.sm-path__card').first();await expect(card).toHaveClass(/sm-path-pending/);await expect(card).toHaveCSS('mask-size','100% 0%');await expect(card).toHaveCSS('opacity','1');
 await card.scrollIntoViewIfNeeded();await expect(card).not.toHaveClass(/sm-path-pending/);await expect.poll(()=>card.evaluate(el=>el.getAnimations().length)).toBeGreaterThan(0);await card.evaluate(el=>el.getAnimations().forEach(animation=>animation.finish()));await expect(card).toHaveCSS('mask-size','100% 100%');
 const cards=page.locator('.sm-path__card');expect(await cards.nth(1).evaluate(el=>getComputedStyle(el).transitionDelay)).toBe('0.16s');
 await page.locator('#sm-motion-setting').selectOption('off');await expect(card).toHaveCSS('transition-duration','0s');await expect(card).toHaveCSS('mask-size','100% 100%');await context.close();
});

for(const width of [390,1440])test(`combined path preview works at ${width}px and respects reduced motion`,async({browser})=>{
 const context=await browser.newContext({viewport:{width,height:850},reducedMotion:'no-preference',hasTouch:width<1024}),page=await context.newPage();await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','on'));await page.route('**/main-D5MQsYQ6.js*',route=>route.fulfill({body:source,contentType:'text/javascript'}));await page.route('**/*.mp4*',route=>route.abort());await page.route('https://**',route=>route.abort());await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});await page.addStyleTag({content:'.loader,.nav{display:none!important}'});
 const card=page.locator('.sm-path__card').first();await card.scrollIntoViewIfNeeded();await card.locator('summary').focus();await expect(card).not.toHaveClass(/sm-path-pending/);await card.evaluate(el=>el.getAnimations().forEach(a=>a.finish()));if(width<1024)await card.locator('summary').click();else await card.hover();await expect.poll(()=>card.evaluate(el=>el.getAnimations({subtree:true}).length)).toBeGreaterThan(0);await card.evaluate(el=>el.getAnimations({subtree:true}).filter(a=>a instanceof CSSTransition).forEach(a=>a.finish()));
 await expect.poll(()=>card.evaluate(el=>getComputedStyle(el,'::after').borderTopColor)).toBe('rgb(255, 255, 255)');await expect.poll(()=>card.evaluate(el=>getComputedStyle(el,'::before').backgroundSize)).not.toBe('auto 100%');
 await page.locator('#sm-motion-setting').selectOption('off');await expect(card).toHaveCSS('transform','none');await expect(card).toHaveCSS('transition-duration','0s');await expect.poll(()=>card.evaluate(el=>getComputedStyle(el,'::after').backgroundImage)).toBe('none');await expect.poll(()=>card.evaluate(el=>getComputedStyle(el,'::before').backgroundSize)).toBe('auto 100%');await context.close();
});

for(const width of [390,1440])test(`idle path preview cycles visible cards and pauses for interaction at ${width}px`,async({browser})=>{
 const context=await browser.newContext({viewport:{width,height:850},reducedMotion:'no-preference',hasTouch:width<1024}),page=await context.newPage();await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','on'));await page.route('**/main-D5MQsYQ6.js*',route=>route.fulfill({body:source,contentType:'text/javascript'}));await page.route('**/*.mp4*',route=>route.abort());await page.route('https://**',route=>route.abort());await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});await page.addStyleTag({content:'.loader,.nav{display:none!important}'});
 const cards=page.locator('.sm-path__card');await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(1500);await page.mouse.move(0,0);await cards.first().evaluate(el=>window.scrollTo({top:window.scrollY+el.getBoundingClientRect().top-160,behavior:'instant'}));await expect(page.locator('.sm-path__card.is-idle')).toHaveCount(1,{timeout:15000});const initialCard=page.locator('.sm-path__card.is-idle');await expect(initialCard.locator('.sm-path__art-alt>span')).toHaveCount(3);const initial=await initialCard.getAttribute('data-path');const activeIndex=['nova','istar','x'].indexOf(initial!);await expect(page.locator('.sm-path__progress')).toHaveClass(/is-visible/);await expect(page.locator('.sm-path__progress span').nth(activeIndex)).toHaveClass(/is-current/);if(width===1440)await expect.poll(()=>page.locator('.sm-path__card.is-idle').getAttribute('data-path'),{timeout:18000}).not.toBe(initial);
 await page.evaluate(()=>window.dispatchEvent(new Event('wheel')));await expect(page.locator('.sm-path__card.is-idle')).toHaveCount(0);await expect(page.locator('.sm-path__progress')).not.toHaveClass(/is-visible/);await page.locator('#sm-motion-setting').selectOption('off');await page.waitForTimeout(3200);await expect(page.locator('.sm-path__card.is-idle')).toHaveCount(0);await context.close();
});

test('three framed path images reveal in sequence and respect reduced motion',async({browser})=>{
 const context=await browser.newContext({viewport:{width:1440,height:850},reducedMotion:'no-preference'}),page=await context.newPage();await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','on'));await page.route('**/main-D5MQsYQ6.js*',route=>route.fulfill({body:source,contentType:'text/javascript'}));await page.route('**/*.mp4*',route=>route.abort());await page.route('https://**',route=>route.abort());await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});await page.addStyleTag({content:'.loader,.nav{display:none!important}'});
 for(const [i,key] of ['sport','cinema','value'].entries()){const card=page.locator('.sm-path__card').nth(i),alt=card.locator('.sm-path__art-alt'),tiles=alt.locator('> span');await expect(alt).toHaveAttribute('aria-hidden','true');await expect(tiles).toHaveCount(3);await expect(alt).toHaveCSS('background-color','rgba(0, 0, 0, 0)');for(let j=0;j<3;j++){const tile=tiles.nth(j),file=`path-${key}-${j+2}.jpg`;expect(await tile.evaluate(el=>getComputedStyle(el).backgroundImage)).toContain(file);expect((await page.request.get(`/home-preview/saved-reference/assets/${file}`)).status()).toBe(200);expect(await tile.evaluate(el=>getComputedStyle(el,'::after').borderTopWidth)).toBe('1px');expect(await tile.evaluate(el=>getComputedStyle(el).transitionDelay)).toBe(['0s','0.2s','0.4s'][j])}await card.evaluate(el=>{el.classList.add('is-alt');el.getAnimations({subtree:true}).filter(a=>a instanceof CSSTransition).forEach(a=>a.finish())});for(const tile of await tiles.all())await expect(tile).toHaveCSS('clip-path','inset(0px)');const bounds=await card.evaluate(el=>{const a=el.querySelector('.sm-path__art-alt')!.getBoundingClientRect(),b=el.querySelector('.sm-path__buy')!.getBoundingClientRect();return a.bottom<=b.top+2});expect(bounds).toBe(true)}
 await page.locator('#sm-motion-setting').selectOption('off');await expect(page.locator('.sm-path__card.is-alt')).toHaveCount(0);await expect(page.locator('.sm-path__art-alt>span').first()).toHaveCSS('transition-duration','0s');await expect(page.locator('.sm-path__art-alt>span').first()).toHaveCSS('clip-path','inset(100% 0px 0px)');await context.close();
});

for(const width of [320,390,768,1440])test(`general specifications remain readable and contained at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:850});await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','off'));await page.route('**/main-D5MQsYQ6.js*',route=>route.fulfill({body:source,contentType:'text/javascript'}));await page.route('**/*.mp4*',route=>route.abort());await page.route('https://**',route=>route.abort());await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});await page.addStyleTag({content:'.loader,.nav{display:none!important}'});await page.evaluate(()=>document.fonts.ready);
 const shared=page.locator('.sm-path__shared');await expect(shared.locator('dt')).toHaveCount(3);await expect(shared.locator('dd')).toHaveCount(3);expect(await shared.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);for(const el of await shared.locator('dt,dd').all()){await expect(el).toBeVisible();expect(await el.evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true)}const sizes=await shared.locator('.sm-path__shared-heading').evaluate(el=>[...el.children].map(e=>e.getBoundingClientRect().toJSON()));expect(sizes[0].left).toBeGreaterThanOrEqual(sizes[1].right-1);
});
