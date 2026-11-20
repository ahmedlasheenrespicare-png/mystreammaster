import {test,expect} from '@playwright/test';
import fs from 'node:fs';import path from 'node:path';
let source=fs.readFileSync(path.resolve('../home-preview/saved-reference/assets/main-D5MQsYQ6.js'),'utf8');
let start=source.indexOf(',function(t){var e;const n=.0015'),end=source.indexOf(';const Ay=document.querySelectorAll',start);
if(start>=0&&end>=0)source=source.slice(0,start)+source.slice(end);
start=source.indexOf('window.addEventListener("load",()=>{My()&&function({patternSize:');end=source.indexOf('document.addEventListener("DOMContentLoaded",()=>{const t=document.title',start);
if(start>=0&&end>=0)source=source.slice(0,start)+source.slice(end);
for(const width of [320,390,768,1024,1200,1440])test(`server cards retain their logos on transparent backgrounds at ${width}`,async({browser})=>{
 const context=await browser.newContext({viewport:{width,height:850}}),page=await context.newPage();
 await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','off'));
 await page.route('**/main-D5MQsYQ6.js*',route=>route.fulfill({body:source,contentType:'text/javascript'}));await page.route('**/*.mp4*',route=>route.abort());await page.route('https://**',route=>route.abort());
 await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});await page.addStyleTag({content:'.loader,.nav{display:none!important}'});
 await page.evaluate(()=>document.fonts.ready);
 const section=page.locator('#works'),cards=section.locator('.sm-server');await expect(cards).toHaveCount(4);
 for(const [i,code] of ['nova','istar','moka','x'].entries()){
  const card=cards.nth(i),surface=card.locator('.sm-server__card'),logo=card.locator('.sm-server__image');
  await expect(surface).toHaveCSS('background-image','none');await expect(surface).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
  if(width<=700 && code==='istar'){const heading=card.locator('.sm-server__name');await expect(heading).toHaveCSS('white-space','nowrap');expect(await heading.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);}
  await expect(card.locator('.sm-server__shade')).toHaveCount(0);await expect(logo).toHaveAttribute('src',new RegExp(code==='x'?'xtv-mark':`${code}-ticket`));
  await expect(logo).toHaveCSS('opacity','1');await logo.scrollIntoViewIfNeeded();await expect.poll(()=>logo.evaluate((el:HTMLImageElement)=>el.complete&&el.naturalWidth>0)).toBe(true);
  const positions=await card.evaluate(el=>{const box=(sel:string)=>el.querySelector(sel)!.getBoundingClientRect();const logo=box('.sm-server__image'),name=box('.sm-server__name'),price=box('.sm-server__price'),label=box('.sm-server__label'),spec=box('.sm-server__specs');const overlaps=(a:DOMRect,b:DOMRect)=>a.left<b.right-1&&a.right>b.left+1&&a.top<b.bottom-1&&a.bottom>b.top+1;return {clear:!overlaps(logo,label)&&!overlaps(logo,name)&&!overlaps(logo,price)&&!overlaps(name,price),order:label.bottom<=name.top+1&&name.bottom<=spec.top+1&&price.bottom<=spec.top+1}});
  expect(positions.clear).toBe(true);expect(positions.order).toBe(true);
  if(width>=1024){const round=await card.locator('.sm-server__round').boundingBox(),actions=await card.locator('.sm-server__actions').boundingBox();const overlap=round!.x<actions!.x+actions!.width&&round!.x+round!.width>actions!.x&&round!.y<actions!.y+actions!.height&&round!.y+round!.height>actions!.y;expect(overlap).toBe(false);await expect(card.locator('.sm-server__round .sm-arrow-icon')).toHaveCSS('width','27px')}
  for(const value of await card.locator('.sm-server__specs dd').all())expect(await value.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
  {
   const difference=await card.evaluate(el=>{const counts=el.querySelectorAll('.sm-server__count');return Math.abs(counts[0].getBoundingClientRect().top-counts[1].getBoundingClientRect().top)});
   expect(difference).toBeLessThanOrEqual(1);
  }
  const quality=card.locator(`[data-server-field="${code}.quality"]`);
  await expect(quality).toHaveText(code==='nova'||code==='x'?'8K / 4K / FHD / HD':'4K / FHD / HD');
  await expect(quality.locator('.sm-server__quality-tag')).toHaveCount(code==='nova'||code==='x'?4:3);
  if(width>=701){
   const clear=await quality.locator('..').evaluate(el=>{const label=el.querySelector('dt')!.getBoundingClientRect(),tags=el.querySelector('dd')!.getBoundingClientRect();return label.left>=tags.right-1||tags.left>=label.right-1});
   expect(clear).toBe(true);
  }
  for(const tag of await quality.locator('.sm-server__quality-tag').all())await expect(tag).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
  for(const action of await card.locator('.sm-server__actions a').all()){
   await expect(action).toHaveCSS('white-space','nowrap');
   expect(await action.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
  }
  await expect(card.locator('.sm-server__actions a').first()).toHaveAttribute('href',`/${code}/`);await expect(card.locator('.sm-server__trial')).toHaveAttribute('href','/trial/');
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);await context.close();
});

test('server entrance follows the selected motion setting on mobile',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:850},reducedMotion:'reduce'}),page=await context.newPage();
 await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','on'));
 await page.route('**/main-D5MQsYQ6.js*',route=>route.fulfill({body:source,contentType:'text/javascript'}));await page.route('**/*.mp4*',route=>route.abort());await page.route('https://**',route=>route.abort());
 await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});await page.addStyleTag({content:'.loader,.nav{display:none!important}'});
 const card=page.locator('.sm-server').first(),logo=card.locator('.sm-server__image');
 await logo.scrollIntoViewIfNeeded();await expect(card).toHaveClass(/is-visible/);await expect(logo).toHaveCSS('animation-name','sm-server-logo-reveal');
 await page.locator('#sm-motion-setting').selectOption('off');await expect(logo).toHaveCSS('animation-name','none');await expect(card.locator('.sm-server__name')).toHaveCSS('animation-name','none');
 await page.locator('#sm-motion-setting').selectOption('auto');await expect(logo).toHaveCSS('animation-name','none');
 await page.locator('#sm-motion-setting').selectOption('on');await expect(logo).toHaveCSS('animation-name','sm-server-logo-reveal');await context.close();
});

test('server counters animate on visibility and respond to motion preference',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:850},reducedMotion:'reduce'}),page=await context.newPage();
 await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','on'));
 await page.route('**/main-D5MQsYQ6.js*',route=>route.fulfill({body:source,contentType:'text/javascript'}));await page.route('**/*.mp4*',route=>route.abort());await page.route('https://**',route=>route.abort());
 await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});await page.addStyleTag({content:'.loader,.nav{display:none!important}'});
 const cards=page.locator('.sm-server');
 for(const card of await cards.all()){
  await expect(card.locator('.sm-server__specs dt svg')).toHaveCount(3);
  for(const icon of await card.locator('.sm-server__specs dt svg').all())await expect(icon).toHaveAttribute('aria-hidden','true');
 }
 const count=cards.first().locator('.sm-server__count').first(),accessible=cards.first().locator('.sm-server__sr-only').first();
 await expect(count).toHaveText('+15,000');await expect(accessible).toHaveText('+15,000');await expect(count).toHaveAttribute('aria-hidden','true');
 await count.scrollIntoViewIfNeeded();
 await expect.poll(async()=>await count.textContent(),{timeout:1000}).not.toBe('+15,000');
 await expect(count).toHaveText('+15,000',{timeout:10000});
 const next=cards.nth(1).locator('.sm-server__count').first(),nextFinal=await next.textContent();
 await next.scrollIntoViewIfNeeded();await expect.poll(async()=>await next.textContent(),{timeout:1000}).not.toBe(nextFinal);
 await page.locator('#sm-motion-setting').evaluate((el:HTMLSelectElement)=>{el.value='off';el.dispatchEvent(new Event('change',{bubbles:true}))});await expect(next).toHaveText(nextFinal!);
 const third=cards.nth(2).locator('.sm-server__count').first(),thirdFinal=await third.textContent();await third.scrollIntoViewIfNeeded();await page.waitForTimeout(100);await expect(third).toHaveText(thirdFinal!);
 await page.locator('#sm-motion-setting').evaluate((el:HTMLSelectElement)=>{el.value='auto';el.dispatchEvent(new Event('change',{bubbles:true}))});await expect(third).toHaveText(thirdFinal!);
 await page.locator('#sm-motion-setting').evaluate((el:HTMLSelectElement)=>{el.value='on';el.dispatchEvent(new Event('change',{bubbles:true}))});await expect.poll(async()=>await third.textContent(),{timeout:1000}).not.toBe(thirdFinal);await expect(third).toHaveText(thirdFinal!,{timeout:10000});
 await context.close();
});
