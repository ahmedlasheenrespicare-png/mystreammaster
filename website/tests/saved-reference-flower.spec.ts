import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// Keep the actual banner renderer and GLB. Disable the unrelated footer WebGL
// scene and noise canvas so software-rendered Chromium can exercise it in CI.
let source=fs.readFileSync(path.resolve('../home-preview/saved-reference/assets/main-D5MQsYQ6.js'),'utf8');
const footerStart=source.indexOf(',function(){const smTarget=document.querySelector("#phone")');
const footerEnd=source.indexOf(';const Ay=document.querySelectorAll',footerStart);
if(footerStart<0||footerEnd<0)throw new Error('Reference footer scene not found');
source=source.slice(0,footerStart)+source.slice(footerEnd);
const noiseStart=source.indexOf('window.addEventListener("load",()=>{My()&&function({patternSize:');
const noiseEnd=source.indexOf('document.addEventListener("DOMContentLoaded",()=>{const t=document.title',noiseStart);
if(noiseStart<0||noiseEnd<0)throw new Error('Reference noise block not found');
source=source.slice(0,noiseStart)+source.slice(noiseEnd);
const render='d&&!window.smMotion.matches&&(d.rotation.y+=(.01+g)*m*smStep,f.current+=(1-Math.pow(.95,smStep))*(f.target-f.current),d.position.y=p+f.current),r.render(o,l)';
if(!source.includes(render))throw new Error('Reference flower renderer not found');
source=source.replace(render,render+',d&&(document.getElementById("bannerCanvas").dataset.flowerRotation=String(d.rotation.y)),document.getElementById("bannerCanvas").dataset.flowerFrames=String(1+(+document.getElementById("bannerCanvas").dataset.flowerFrames||0))');

test('actual flower model pauses and resumes with the motion setting',async({browser})=>{
 test.setTimeout(90000);
 const context=await browser.newContext({viewport:{width:390,height:700},deviceScaleFactor:1,reducedMotion:'no-preference'});
 const page=await context.newPage();const errors:string[]=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','on'));
 await page.route('**/main-D5MQsYQ6.js*',route=>route.fulfill({body:source,contentType:'text/javascript'}));
 await page.route('**/*.mp4*',route=>route.abort());await page.route('https://**',route=>route.abort());
 await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});
 const canvas=page.locator('#bannerCanvas');
 await expect(canvas).toHaveAttribute('data-flower-rotation',/./,{timeout:30000});
 const initial=await canvas.getAttribute('data-flower-rotation');
 await expect.poll(()=>canvas.getAttribute('data-flower-rotation'),{timeout:20000}).not.toBe(initial);
 async function setMotion(value:string){await page.evaluate(value=>{const select=document.querySelector<HTMLSelectElement>('#sm-motion-setting')!;select.value=value;select.dispatchEvent(new Event('change'))},value)}
 await setMotion('off');await page.waitForTimeout(500);
 const stopped=await canvas.getAttribute('data-flower-rotation');await page.waitForTimeout(1000);
 expect(await canvas.getAttribute('data-flower-rotation')).toBe(stopped);
 await setMotion('on');await expect.poll(()=>canvas.getAttribute('data-flower-rotation'),{timeout:20000}).not.toBe(stopped);
 expect(errors).toEqual([]);await context.close();
});


test('mobile flower uses a capped pixel ratio and sleeps off screen',async({browser})=>{
 test.setTimeout(90000);
 const context=await browser.newContext({viewport:{width:390,height:700},deviceScaleFactor:3,reducedMotion:'no-preference'}),page=await context.newPage();
 await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','on'));
 await page.route('**/main-D5MQsYQ6.js*',route=>route.fulfill({body:source,contentType:'text/javascript'}));await page.route('**/*.mp4*',r=>r.abort());await page.route('https://**',r=>r.abort());
 await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});await page.addStyleTag({content:'.loader,.nav{display:none!important}'});
 const canvas=page.locator('#bannerCanvas');await canvas.scrollIntoViewIfNeeded();await expect(canvas).toHaveAttribute('data-flower-frames',/./,{timeout:30000});
 expect(await canvas.evaluate((el:HTMLCanvasElement)=>el.width/el.getBoundingClientRect().width)).toBeLessThanOrEqual(1.26);
 const firstFrames=Number(await canvas.getAttribute('data-flower-frames'));const start=await page.evaluate(()=>performance.now());await page.waitForTimeout(1000);
 const elapsed=(await page.evaluate(()=>performance.now()))-start, frames=Number(await canvas.getAttribute('data-flower-frames'))-firstFrames;
 expect(frames).toBeGreaterThan(0);expect(frames).toBeLessThanOrEqual(Math.ceil(elapsed/32)+2);
 await page.locator('#cinema-library').scrollIntoViewIfNeeded();await page.waitForTimeout(1500);
 const before=Number(await canvas.getAttribute('data-flower-frames'));await page.waitForTimeout(1000);const stopped=Number(await canvas.getAttribute('data-flower-frames'));
 // An already queued frame may complete as the observer marks it off-screen.
 expect(stopped-before).toBeLessThanOrEqual(1);
 await canvas.scrollIntoViewIfNeeded();await expect.poll(async()=>Number(await canvas.getAttribute('data-flower-frames')),{timeout:20000}).toBeGreaterThan(stopped);
 await context.close();
});
