import {test,expect} from '@playwright/test';
import fs from 'node:fs';import path from 'node:path';
let source=fs.readFileSync(path.resolve('../home-preview/saved-reference/assets/main-D5MQsYQ6.js'),'utf8');
let start=source.indexOf(',function(t){var e;const n=.0015'),end=source.indexOf(';const Ay=document.querySelectorAll',start);
if(start<0||end<0)throw new Error('Reference WebGL block not found');source=source.slice(0,start)+source.slice(end);
start=source.indexOf('window.addEventListener("load",()=>{My()&&function({patternSize:');end=source.indexOf('document.addEventListener("DOMContentLoaded",()=>{const t=document.title',start);if(start>=0&&end>=0)source=source.slice(0,start)+source.slice(end);
for(const width of [320,390,768,1024,1440])test(`journey editorial title and copy stay readable at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:850});await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','off'));
 await page.route('**/main-D5MQsYQ6.js*',route=>route.fulfill({body:source,contentType:'text/javascript'}));await page.route('**/*.mp4*',route=>route.abort());await page.route('https://**',route=>route.abort());
 await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});await page.addStyleTag({content:'.loader,.nav{display:none!important}'});await page.evaluate(()=>document.fonts.ready);
 const section=page.locator('#journey'),title=section.locator('h2'),lead=section.locator('.sm-journey__headline'),intro=section.locator('.sm-journey__intro');
 await expect(title).toHaveText('من التجربة إلى المشاهدة');await expect(lead).toContainText('تجربة مجانية');await expect(intro).toContainText('باللغة العربية');
 await expect(title.locator('span')).toHaveCount(2);await expect(section.locator('.sm-journey__stars img')).toHaveCount(3);
 const stageTitle=section.locator('.sm-journey__stage-heading');await expect(stageTitle.locator('p')).toHaveText('خطوات بسيطة');await expect(stageTitle.locator('h3')).toHaveText('رحلتك تبدأ هنا');await expect(stageTitle.locator('h3')).toHaveCSS('font-style','italic');
 expect(await stageTitle.evaluate(el=>{const p=el.querySelector('p')!,h=el.querySelector('h3')!,r=h.getBoundingClientRect();return h.scrollWidth<=h.clientWidth+1&&r.left>=0&&r.right<=innerWidth&&getComputedStyle(p,'::before').backgroundImage.includes('aster-rose.svg')})).toBe(true);
 const headingFit=await title.evaluate(el=>[...el.querySelectorAll('span')].every(part=>part.scrollWidth<=part.clientWidth+1));expect(headingFit).toBe(true);
 await expect(section.locator('.sm-journey__script')).toHaveAttribute('aria-hidden','true');await expect(section.locator('.sm-journey__script')).toHaveCSS('pointer-events','none');await expect(section.locator('.sm-journey__script')).toHaveCSS('opacity','0.32');
 await expect(lead.locator('*')).toHaveCount(0);await expect(section.locator('.sm-journey__steps li')).toHaveCount(4);await expect(section.locator('.sm-journey__step-icon[aria-hidden="true"]')).toHaveCount(4);await expect(section.locator('.sm-journey__step-link').nth(0)).toHaveAttribute('href','/trial/');await expect(section.locator('.sm-journey__step-link').nth(1)).toHaveAttribute('href','/#pricing');await expect(section.locator('.sm-journey__step-link').nth(2)).toHaveAttribute('href','https://wa.me/201090415657');await expect(section.locator('.sm-journey__step-link').nth(3)).toHaveAttribute('href','#supported-devices');await expect(page.locator('#supported-devices')).toHaveCount(1);
 const boxes=await section.evaluate(el=>{const ids=['h2','.sm-journey__headline','.sm-journey__intro','.sm-journey__steps'];return ids.map(s=>{const e=el.querySelector(s)!,r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,scroll:e.scrollWidth,client:e.clientWidth}})});
 for(const b of boxes){expect(b.left).toBeGreaterThanOrEqual(0);expect(b.right).toBeLessThanOrEqual(width);expect(b.scroll).toBeLessThanOrEqual(b.client+1)}
 for(let i=1;i<boxes.length;i++)expect(boxes[i].top).toBeGreaterThanOrEqual(boxes[i-1].bottom-1);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
});
test('journey copy appears with motion enabled and remains readable when disabled',async({page})=>{
 await page.setViewportSize({width:390,height:850});await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','on'));
 await page.route('**/main-D5MQsYQ6.js*',route=>route.fulfill({body:source,contentType:'text/javascript'}));await page.route('**/*.mp4*',route=>route.abort());await page.route('https://**',route=>route.abort());
 await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});await page.addStyleTag({content:'.loader,.nav{display:none!important}'});
 const lead=page.locator('.sm-journey__headline');await lead.scrollIntoViewIfNeeded();await expect(lead).not.toHaveClass(/sm-journey-pending/);await expect(lead).toHaveCSS('opacity','1');await expect(lead.locator('*')).toHaveCount(0);
 await page.locator('#sm-motion-setting').evaluate((el:HTMLSelectElement)=>{el.value='off';el.dispatchEvent(new Event('change',{bubbles:true}))});await expect(lead).toHaveCSS('opacity','1');await expect(lead).toHaveCSS('transform','none');
});
for(const width of [320,390,768,1440])test(`pinned journey reveals four cards in order and reverses at ${width}px`,async({browser})=>{
 const context=await browser.newContext({viewport:{width,height:850},hasTouch:width<=390,isMobile:width<=390,reducedMotion:'reduce'}),page=await context.newPage();
 await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','on'));
 await page.route('**/main-D5MQsYQ6.js*',route=>route.fulfill({body:source,contentType:'text/javascript'}));await page.route('**/*.mp4*',route=>route.abort());await page.route('https://**',route=>route.abort());
 await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});await page.addStyleTag({content:'.loader,.nav{display:none!important}'});await page.evaluate(()=>document.fonts.ready);
 const stage=page.locator('.sm-journey__stage'),view=page.locator('.sm-journey__stage-view'),cards=page.locator('.sm-journey__steps li'),phrase=page.locator('.sm-journey__script'),progress=page.locator('.sm-journey__meter');
 await expect(stage).toHaveAttribute('data-scroll-active','true');
 await expect(stage).toHaveCSS('background-color','rgb(252, 250, 246)');expect(await view.evaluate(el=>getComputedStyle(el,'::before').pointerEvents)).toBe('none');
 if(width<=390)expect(await stage.evaluate(el=>el.getBoundingClientRect().height)).toBeCloseTo(2550,0);
 const go=async(progress:number)=>{await page.evaluate(progress=>{const el=document.querySelector('.sm-journey__stage')!,v=el.querySelector('.sm-journey__stage-view')!,r=el.getBoundingClientRect(),distance=r.height-v.getBoundingClientRect().height;window.scrollTo(0,window.scrollY+r.top+distance*progress)},progress);await page.waitForTimeout(1800)};
 const state=async(expected:string[],current:number)=>{await expect.poll(()=>cards.evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-revealed')))).toEqual(expected);await expect(cards.nth(current)).toHaveAttribute('data-current','true');for(let i=0;i<4;i++){const link=cards.nth(i).locator('.sm-journey__step-link');if(i===current){await expect(link).toBeVisible();await expect(link).toHaveAttribute('tabindex','0')}else{await expect(link).toBeHidden();await expect(link).toHaveAttribute('tabindex','-1')}}await expect(cards.nth(current)).toHaveCSS('border-left-width','4px');await expect(cards.nth(current)).not.toHaveCSS('box-shadow','none');await expect(progress).toHaveAttribute('aria-valuenow',String(current+1));await expect(progress).toHaveAttribute('aria-valuetext',`الخطوة ${['١','٢','٣','٤'][current]} من ٤`);await expect(progress.locator('[data-journey-progress]')).toHaveText(['١','٢','٣','٤'][current]);};
 const pinned=async()=>{await expect.poll(()=>view.evaluate(el=>Math.abs(el.getBoundingClientRect().top)),{timeout:5000}).toBeLessThan(8);const box=await view.boundingBox();expect(box!.height).toBeLessThanOrEqual(851)};
 const near=async(index:number)=>expect.poll(()=>stage.evaluate((el,index)=>{const base=el.querySelector('.sm-journey__stage-content')!.getBoundingClientRect(),r=el.querySelectorAll('.sm-journey__steps li')[index].getBoundingClientRect(),y=parseFloat((el.querySelector('.sm-journey__script') as HTMLElement).style.getPropertyValue('--journey-ghost-y'));return Math.abs(y-(r.top-base.top+r.height/2))},index),{timeout:5000}).toBeLessThan(3);
 await go(.12);await state(['true','false','false','false'],0);await pinned();await near(0);const first=await phrase.evaluate(el=>parseFloat(el.style.getPropertyValue('--journey-ghost-y')));
 await go(.43);await state(['true','true','false','false'],1);await pinned();await near(1);const second=await phrase.evaluate(el=>parseFloat(el.style.getPropertyValue('--journey-ghost-y')));expect(second).toBeGreaterThan(first);
 await go(.58);await state(['true','true','true','false'],2);await pinned();await near(2);const third=await phrase.evaluate(el=>parseFloat(el.style.getPropertyValue('--journey-ghost-y')));expect(third).toBeGreaterThan(second);
 await go(.85);await state(['true','true','true','true'],3);await pinned();await near(3);
 await go(.12);await state(['true','false','false','false'],0);await pinned();
 await go(1.08);await expect.poll(()=>page.locator('#faq').evaluate(el=>el.getBoundingClientRect().top),{timeout:5000}).toBeLessThan(850);
 const setting=page.locator('#sm-motion-setting'),set=async(value:string)=>setting.evaluate((el:HTMLSelectElement,value)=>{el.value=value;el.dispatchEvent(new Event('change',{bubbles:true}))},value);
 await set('off');await expect(stage).not.toHaveAttribute('data-scroll-active','true');await expect(progress).toBeHidden();for(const card of await cards.all())await expect(card).toHaveCSS('opacity','1');
 await set('auto');await expect(stage).not.toHaveAttribute('data-scroll-active','true');await set('on');await expect(stage).toHaveAttribute('data-scroll-active','true');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);await context.close();
});

test('journey cards stay available without JavaScript',async({page})=>{
 await page.context().setOffline(false);await page.route('**/*.js*',route=>route.abort());await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});await page.addStyleTag({content:'.loader,.nav{display:none!important}'});
 const cards=page.locator('.sm-journey__steps li');await expect(cards).toHaveCount(4);for(const card of await cards.all()){await expect(card).toHaveCSS('opacity','1');await expect(card.locator('.sm-journey__step-link')).toBeVisible()}await expect(page.locator('.sm-journey__step-link').nth(0)).toHaveAttribute('href','/trial/');await expect(page.locator('.sm-journey__step-link').nth(1)).toHaveAttribute('href','/#pricing');
});

test('short screens show all cards without trapping or clipping the visitor',async({page})=>{
 await page.setViewportSize({width:320,height:360});await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','on'));
 await page.route('**/main-D5MQsYQ6.js*',route=>route.fulfill({body:source,contentType:'text/javascript'}));await page.route('**/*.mp4*',route=>route.abort());await page.route('https://**',route=>route.abort());
 await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});await page.addStyleTag({content:'.loader,.nav{display:none!important}'});await page.evaluate(()=>document.fonts.ready);
 await expect(page.locator('.sm-journey__stage')).not.toHaveAttribute('data-scroll-active','true');for(const card of await page.locator('.sm-journey__steps li').all())await expect(card).toHaveCSS('opacity','1');
 await page.locator('.sm-journey__step-link').nth(0).scrollIntoViewIfNeeded();await expect(page.locator('.sm-journey__step-link').nth(0)).toBeVisible();
});

test('idle preview repeats without scrolling and stops on interaction or motion off',async({browser})=>{
 test.setTimeout(60000);
 const context=await browser.newContext({viewport:{width:390,height:850},hasTouch:true,isMobile:true,reducedMotion:'reduce'}),page=await context.newPage();
 await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','on'));
 await page.route('**/main-D5MQsYQ6.js*',route=>route.fulfill({body:source,contentType:'text/javascript'}));await page.route('**/*.mp4*',route=>route.abort());await page.route('https://**',route=>route.abort());
 await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});await page.addStyleTag({content:'.loader,.nav{display:none!important}'});await page.evaluate(()=>document.fonts.ready);
 const stage=page.locator('.sm-journey__stage'),progress=page.locator('.sm-journey__meter');
 await expect(stage).toHaveAttribute('data-scroll-active','true');await expect(page.locator('.sm-journey__replay')).toHaveCount(0);
 await page.evaluate(()=>{const el=document.querySelector('.sm-journey__stage')!,view=el.querySelector('.sm-journey__stage-view')!,r=el.getBoundingClientRect();window.scrollTo(0,window.scrollY+r.top+(r.height-view.getBoundingClientRect().height)*.43)});
 await expect(progress).toHaveAttribute('aria-valuenow','2',{timeout:10000});await page.waitForTimeout(1000);const position=await page.evaluate(()=>scrollY);
 await expect(progress).toHaveAttribute('aria-valuenow','1',{timeout:7000});await expect(progress).toHaveAttribute('aria-valuenow','2',{timeout:5000});await expect(progress).toHaveAttribute('aria-valuenow','3',{timeout:5000});await expect(progress).toHaveAttribute('aria-valuenow','4',{timeout:5000});await expect(progress).toHaveAttribute('aria-valuenow','1',{timeout:5000});
 expect(Math.abs(await page.evaluate(()=>scrollY)-position)).toBeLessThan(1);
 await page.evaluate(()=>document.dispatchEvent(new Event('touchstart',{bubbles:true})));await expect(progress).toHaveAttribute('aria-valuenow','2');
 await expect(progress).toHaveAttribute('aria-valuenow','1',{timeout:5000});await page.evaluate(()=>document.dispatchEvent(new WheelEvent('wheel',{deltaY:5,bubbles:true})));await expect(progress).toHaveAttribute('aria-valuenow','2');
 await page.locator('#sm-motion-setting').evaluate((el:HTMLSelectElement)=>{el.value='off';el.dispatchEvent(new Event('change',{bubbles:true}))});await expect(progress).toBeHidden();
 for(const card of await page.locator('.sm-journey__steps li').all())await expect(card).toHaveCSS('opacity','1');await context.close();
});

for(const width of [320,1440])test(`inactive cards use minimal lines and active card breathes at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:850});await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','on'));
 await page.route('**/main-D5MQsYQ6.js*',route=>route.fulfill({body:source,contentType:'text/javascript'}));await page.route('**/*.mp4*',route=>route.abort());await page.route('https://**',route=>route.abort());
 await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});await page.addStyleTag({content:'.loader,.nav{display:none!important}'});await page.evaluate(()=>document.fonts.ready);
 const stage=page.locator('.sm-journey__stage'),cards=stage.locator('.sm-journey__steps li');await expect(page.locator('#sm-journey-inactive')).toHaveCount(0);
 await page.evaluate(()=>{const el=document.querySelector('.sm-journey__stage')!,view=el.querySelector('.sm-journey__stage-view')!,r=el.getBoundingClientRect();window.scrollTo(0,window.scrollY+r.top+(r.height-view.getBoundingClientRect().height)*.43)});await page.waitForTimeout(1800);await expect(stage).toHaveAttribute('data-in-view','true');await expect(cards.nth(1)).toHaveAttribute('data-current','true');await expect(cards.nth(1)).toHaveCSS('animation-name','sm-entry-side-wide, sm-card-breathe-border');await expect(cards.nth(1)).toHaveCSS('border-radius','22px');await expect(cards.nth(0)).toHaveCSS('border-radius','0px');await expect(cards.nth(0)).toHaveCSS('background-color','rgba(0, 0, 0, 0)');await expect(cards.nth(2)).toHaveAttribute('data-revealed','false');
 await page.locator('#sm-motion-setting').evaluate((el:HTMLSelectElement)=>{el.value='off';el.dispatchEvent(new Event('change',{bubbles:true}))});await expect(cards.nth(1)).toHaveCSS('animation-name','none');await expect(cards.nth(1)).toHaveCSS('border-radius','22px');
});

for(const width of [320,390,1440])test(`server logos fit without changing the card size at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:850});await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','off'));
 await page.route('**/main-D5MQsYQ6.js*',route=>route.fulfill({body:source,contentType:'text/javascript'}));await page.route('**/*.mp4*',route=>route.abort());await page.route('https://**',route=>route.abort());await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});await page.addStyleTag({content:'.loader,.nav{display:none!important}'});await page.evaluate(()=>document.fonts.ready);
 const card=page.locator('.sm-journey__steps li').nth(1),logos=card.locator('.sm-journey__server-logos');await expect(logos.locator('img')).toHaveCount(4);await expect(logos).toHaveAttribute('aria-label','نوفا، إيستار، موكا و X');
 const metrics=await card.evaluate(el=>{const logos=el.querySelector('.sm-journey__server-logos') as HTMLElement,link=el.querySelector('.sm-journey__step-link')!,r=el.getBoundingClientRect(),lr=logos.getBoundingClientRect(),ar=link.getBoundingClientRect(),before={width:r.width,height:r.height};logos.style.display='none';const after=el.getBoundingClientRect();return {before,after:{width:after.width,height:after.height},inside:lr.left>=r.left&&lr.right<=r.right&&lr.top>=r.top&&lr.bottom<=r.bottom,separate:lr.right<=ar.left||lr.left>=ar.right}});expect(metrics.before).toEqual(metrics.after);expect(metrics.inside).toBe(true);expect(metrics.separate).toBe(true);
});
for(const width of [320,390,1440])test(`detail icons fit without changing card dimensions at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:850});await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','off'));
 await page.route('**/main-D5MQsYQ6.js*',route=>route.fulfill({body:source,contentType:'text/javascript'}));await page.route('**/*.mp4*',route=>route.abort());await page.route('https://**',route=>route.abort());await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});await page.addStyleTag({content:'.loader,.nav{display:none!important}'});await page.evaluate(()=>document.fonts.ready);
 const cards=page.locator('.sm-journey__steps li');await expect(page.locator('.sm-journey__detail-icons')).toHaveCount(3);
 for(const index of [0,2,3]){const card=cards.nth(index);const metrics=await card.evaluate(el=>{const icon=el.querySelector('.sm-journey__detail-icons') as HTMLElement,link=el.querySelector('.sm-journey__step-link')!,r=el.getBoundingClientRect(),ir=icon.getBoundingClientRect(),ar=link.getBoundingClientRect(),before={width:r.width,height:r.height};icon.style.display='none';const after=el.getBoundingClientRect();return {before,after:{width:after.width,height:after.height},inside:ir.left>=r.left&&ir.right<=r.right&&ir.top>=r.top&&ir.bottom<=r.bottom,separate:ir.right<=ar.left||ir.left>=ar.right}});expect(metrics.before).toEqual(metrics.after);expect(metrics.inside).toBe(true);expect(metrics.separate).toBe(true)}
});
for(const width of [320,1440])test(`phrase slides in and reaches full colour at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:width===320?750:850});await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','on'));
 await page.route('**/main-D5MQsYQ6.js*',route=>route.fulfill({body:source,contentType:'text/javascript'}));await page.route('**/*.mp4*',route=>route.abort());await page.route('https://**',route=>route.abort());await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});await page.addStyleTag({content:'.loader,.nav{display:none!important}'});await page.evaluate(()=>document.fonts.ready);
 const stage=page.locator('.sm-journey__stage'),pointer=stage.locator('.sm-journey__pointer'),path=stage.locator('.sm-journey__pointer-path'),cards=stage.locator('.sm-journey__steps li');await expect(page.locator('#sm-journey-phrase-slide')).toHaveCount(0);await expect(stage).toHaveAttribute('data-phrase-slide','wide');await expect(stage).toHaveCSS('--phrase-slide-distance','-48px');await expect(stage).toHaveAttribute('data-scroll-active','true');await expect(stage).toHaveAttribute('data-pointer','curve');
 await page.waitForTimeout(1000);await page.evaluate(()=>{const el=document.querySelector('.sm-journey__stage')!,v=el.querySelector('.sm-journey__stage-view')!,r=el.getBoundingClientRect();scrollTo(0,scrollY+r.top+(r.height-v.getBoundingClientRect().height)*.35)});await page.waitForTimeout(1800);await expect(cards.nth(1)).toHaveAttribute('data-current','true');await expect(pointer).toBeVisible();await expect(path).toHaveAttribute('d',/^M .*Q /);
 const phrase=cards.nth(1).locator('.sm-journey__card-phrase');await expect(phrase).toHaveCSS('animation-name',width===320?'sm-phrase-side-mobile':'sm-phrase-side');await expect(phrase).toHaveCSS('opacity','1');await expect(phrase).toHaveCSS('color','rgb(210, 107, 143)');await expect(phrase).toHaveCSS('opacity','1');await expect(cards.nth(0).locator('.sm-journey__card-phrase')).toHaveCSS('opacity','0');
 await page.locator('#sm-motion-setting').evaluate((el:HTMLSelectElement)=>{el.value='off';el.dispatchEvent(new Event('change',{bubbles:true}))});await expect(pointer).toBeHidden();await expect(phrase).toHaveCSS('animation-name','none');
});

for(const width of [320,390,1440])test(`active phrase does not obscure card content at ${width}px`,async({browser})=>{
 const context=await browser.newContext({viewport:{width,height:width<=390?750:900},hasTouch:width<=390,isMobile:width<=390});const page=await context.newPage();await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','on'));
 await page.route('**/main-D5MQsYQ6.js*',route=>route.fulfill({body:source,contentType:'text/javascript'}));await page.route('**/*.mp4*',route=>route.abort());await page.route('https://**',route=>route.abort());await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});await page.addStyleTag({content:'.loader,.nav{display:none!important}'});await page.evaluate(()=>document.fonts.ready);const stage=page.locator('.sm-journey__stage'),cards=stage.locator('.sm-journey__steps li');await expect(stage).toHaveAttribute('data-scroll-active','true');
 for(const [index,pos] of [0.12,0.35,0.60,0.85].entries()){
  await page.evaluate(pos=>{const el=document.querySelector('.sm-journey__stage')!,v=el.querySelector('.sm-journey__stage-view')!,r=el.getBoundingClientRect();scrollTo(0,scrollY+r.top+(r.height-v.getBoundingClientRect().height)*pos)},pos);await page.waitForTimeout(1800);const card=cards.nth(index);await expect(card).toHaveAttribute('data-current','true');
  const collisions=await card.evaluate(el=>{const phrase=el.querySelector('.sm-journey__card-phrase')!.getBoundingClientRect();return [...el.querySelectorAll('strong span,strong svg,p,.sm-journey__step-link,.sm-journey__detail-icons,.sm-journey__server-logos')].filter(e=>{const range=document.createRange();range.selectNodeContents(e);const r=e.tagName==='P'?range.getBoundingClientRect():e.getBoundingClientRect();return r.width>0&&r.height>0&&Math.min(phrase.right,r.right)>Math.max(phrase.left,r.left)+1&&Math.min(phrase.bottom,r.bottom)>Math.max(phrase.top,r.top)+1}).map(e=>e.className||e.tagName)});expect(collisions,`card ${index+1}`).toEqual([]);
 }
 await context.close();
});
