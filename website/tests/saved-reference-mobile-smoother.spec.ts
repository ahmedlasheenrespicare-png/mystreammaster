import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// Run the actual scroll engine, with only WebGL and canvas noise removed so
// headless CI can test scrolling independently of GPU availability.
let source=fs.readFileSync(path.resolve('../home-preview/saved-reference/assets/main-D5MQsYQ6.js'),'utf8');
let start=source.indexOf(',function(t){var e;const n=.0015'),end=source.indexOf(';const Ay=document.querySelectorAll',start);
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
