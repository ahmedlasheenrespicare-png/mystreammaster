import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// Run the actual scroll engine, with only WebGL and canvas noise removed so
// headless CI can test scrolling independently of GPU availability.
let source=fs.readFileSync(path.resolve('../home-preview/saved-reference/assets/main-D5MQsYQ6.js'),'utf8');
let start=source.indexOf(',function(t){var e;let smMobile='),end=source.indexOf(';const Ay=document.querySelectorAll',start);
if(start<0||end<0)throw new Error('Reference WebGL block not found');
source=source.slice(0,start)+source.slice(end);
start=source.indexOf('window.addEventListener("load",()=>{My()&&function({patternSize:');end=source.indexOf('document.addEventListener("DOMContentLoaded",()=>{const t=document.title',start);
if(start>=0&&end>=0)source=source.slice(0,start)+source.slice(end);

test('actual reference scroll engine switches mobile smoothing with the setting',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:780},hasTouch:true,isMobile:true,reducedMotion:'no-preference'});
 const page=await context.newPage();const errors:string[]=[];
 await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','off'));
 await page.route('**/main-D5MQsYQ6.js*',route=>route.fulfill({status:200,contentType:'text/javascript',body:source}));
 await page.route('https://**',route=>route.abort());
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});
 await page.addStyleTag({content:'.loader,.nav,canvas{display:none!important}'});
 const wrap=page.locator('#smooth-wrapper');
 await expect(wrap).toHaveCSS('position','relative');
 await page.locator('#sm-motion-setting').selectOption('on');
 await expect(wrap).toHaveCSS('position','fixed');
 await page.evaluate(()=>window.scrollTo(0,1800));await page.waitForTimeout(1300);
 expect(await page.evaluate(()=>scrollY)).toBeGreaterThan(1000);
 const before=await page.evaluate(()=>scrollY),cdp=await context.newCDPSession(page);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:200,y:650}]});
 for(let i=1;i<=10;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:200,y:650-i*35}]});await page.waitForTimeout(12)}
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(before);
 expect(await page.evaluate(()=>[scrollX,document.documentElement.scrollWidth,innerWidth])).toEqual([0,390,390]);
 await page.locator('#sm-motion-setting').selectOption('off');
 await expect(wrap).toHaveCSS('position','relative');
 expect(await page.evaluate(()=>scrollY)).toBeGreaterThan(1000);
 await page.locator('#sm-motion-setting').selectOption('on');
 await expect(wrap).toHaveCSS('position','fixed');
 await page.emulateMedia({reducedMotion:'reduce'});
 await expect(wrap).toHaveCSS('position','fixed');
 await expect(page.locator('#sm-motion-note')).toContainText('بغض النظر');
 await page.locator('#sm-motion-setting').selectOption('auto');
 await expect(wrap).toHaveCSS('position','relative');
 await expect(page.locator('#sm-motion-note')).toContainText('تقليل الحركة مفعّل');
 await page.emulateMedia({reducedMotion:'no-preference'});
 await expect(wrap).toHaveCSS('position','fixed');
 expect(errors).toEqual([]);
 await context.close();
});

for(const mobile of [true,false]) test(`hero scrolling settles promptly with reference motion ${mobile?'on touch':'on desktop'}`,async({browser})=>{
 const context=await browser.newContext({viewport:{width:mobile?390:1280,height:780},hasTouch:mobile,isMobile:mobile,reducedMotion:'no-preference'});
 const page=await context.newPage();
 await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','on'));
 await page.route('**/main-D5MQsYQ6.js*',route=>route.fulfill({status:200,contentType:'text/javascript',body:source}));
 await page.route('https://**',route=>route.abort());
 await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});
 await page.addStyleTag({content:'.nav,canvas{display:none!important}'});
 await expect(page.locator('.loader')).toBeHidden({timeout:20000});
 // The captured loader is already hidden, but its preload timeline still runs.
 await expect(page.locator('.progress .number').first()).toHaveText('100%',{timeout:20000});
 await page.waitForTimeout(2500);
 await expect(page.locator('#smooth-wrapper')).toHaveCSS('position','fixed');
 await page.evaluate(()=>window.scrollTo(0,600));
 await expect.poll(()=>page.evaluate(()=>scrollY),{timeout:3000}).toBeGreaterThan(500);
 await expect.poll(()=>page.evaluate(()=>{const transform=getComputedStyle(document.querySelector('#smooth-content')!).transform;return Math.abs(scrollY+(transform==='none'?0:new DOMMatrixReadOnly(transform).m42))}),{timeout:1500}).toBeLessThan(45);
 await page.evaluate(()=>window.scrollTo(0,0));
 await expect.poll(()=>page.evaluate(()=>scrollY),{timeout:3000}).toBeLessThan(10);
 await expect.poll(()=>page.evaluate(()=>{const transform=getComputedStyle(document.querySelector('#smooth-content')!).transform;return Math.abs(scrollY+(transform==='none'?0:new DOMMatrixReadOnly(transform).m42))}),{timeout:1500}).toBeLessThan(45);
 await context.close();
});

test('footer WebGL rendering and texture work are gated by visibility',()=>{
 const original=fs.readFileSync(path.resolve('../home-preview/saved-reference/assets/main-D5MQsYQ6.js'),'utf8');
 expect(original).toContain('smObserver.observe(smTarget)');
 expect(original).toContain('!smFooterFrame&&smFooterVisible&&!document.hidden');
 expect(original).toContain('if(smFooterFrame=0,!smFooterVisible||document.hidden)return');
 expect(original).toContain('smUpdateTexture(),c.update(),e.render(n,i)');
});
