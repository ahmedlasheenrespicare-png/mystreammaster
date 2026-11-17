import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test('mobile cinema decodes only nearby images and releases them off screen',async({page})=>{
 await page.setViewportSize({width:390,height:850});await page.addInitScript(()=>{localStorage.setItem('sm-motion-preference','on');Math.random=()=>0});
 await page.route('**/main-D5MQsYQ6.js*',r=>r.fulfill({body:'',contentType:'text/javascript'}));await page.route('**/*.mp4*',r=>r.abort());await page.route('https://**',r=>r.abort());
 await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});await page.addStyleTag({content:'.loader,.nav{display:none!important}'});
 const stage=page.locator('#cinema-library .smcin-stage'),layers=stage.locator('img.smcin-backdrop,img.smcin-person'),posters=stage.locator('.smcin-panel > img:first-child');
 await expect(stage.locator('.smcin-panel')).toHaveCount(123);expect(await layers.evaluateAll(images=>images.filter(img=>img.hasAttribute('src')).length)).toBe(0);
 expect(await posters.evaluateAll(images=>images.filter(img=>img.hasAttribute('src')).length)).toBe(0);
 await stage.scrollIntoViewIfNeeded();await expect(stage.locator('.smcin-active')).toHaveCount(1,{timeout:10000});await expect(stage.locator('.smcin-active')).toHaveClass(/smcin-layers-ready/,{timeout:20000});
 expect(await layers.evaluateAll(images=>images.filter(img=>img.hasAttribute('src')).length)).toBeLessThanOrEqual(4);
 expect(await posters.evaluateAll(images=>images.filter(img=>img.hasAttribute('src')).length)).toBeLessThanOrEqual(9);
 const current=await stage.locator('.smcin-active').getAttribute('data-scene-id');await expect.poll(()=>stage.locator('.smcin-active').getAttribute('data-scene-id'),{timeout:15000}).not.toBe(current);
 await page.evaluate(()=>window.scrollTo(0,0));await expect.poll(()=>layers.evaluateAll(images=>images.filter(img=>img.hasAttribute('src')).length)).toBe(0);
 await stage.scrollIntoViewIfNeeded();await expect(stage.locator('.smcin-active')).toHaveClass(/smcin-layers-ready/,{timeout:20000});
});

test('secondary video is not fetched until it is visible or deliberately played',async({page})=>{
 await page.setViewportSize({width:390,height:850});await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','on'));
 await page.route('**/main-D5MQsYQ6.js*',r=>r.fulfill({body:'',contentType:'text/javascript'}));await page.route('**/*.mp4*',r=>r.abort());await page.route('https://**',r=>r.abort());
 await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});await page.addStyleTag({content:'.loader,.nav{display:none!important}'});
 const video=page.locator('.abt__video video');await expect(video).not.toHaveAttribute('src',/./);await expect(video).toHaveAttribute('preload','none');
 await video.scrollIntoViewIfNeeded();await expect(video).toHaveAttribute('src',/video-streammaster-hd-1080/);
});

test('hidden footer WebGL assets do not download even when scrolling to the footer',async({page})=>{
 test.setTimeout(90000);await page.setViewportSize({width:390,height:850});await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','on'));
 const footerRequests:string[]=[];page.on('request',req=>{if(req.url().includes('/assets/images/footer/'))footerRequests.push(req.url())});
 const source=fs.readFileSync(path.resolve('../home-preview/saved-reference/assets/main-D5MQsYQ6.js'),'utf8');
 await page.route('**/main-D5MQsYQ6.js*',r=>r.fulfill({body:source,contentType:'text/javascript'}));
 await page.route('**/*.mp4*',r=>r.abort());await page.route('https://**',r=>r.abort());
 await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});await page.addStyleTag({content:'.loader,.nav{display:none!important}'});
 const canvas=page.locator('#phone');await expect(canvas).toHaveCSS('visibility','hidden');await canvas.scrollIntoViewIfNeeded();await page.waitForTimeout(1000);
 expect(footerRequests).toEqual([]);
});

test('flower model is loaded once rather than duplicated by the preloader',async({page})=>{
 test.setTimeout(90000);await page.setViewportSize({width:390,height:850});await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','on'));
 const requests:string[]=[];page.on('request',req=>{if(/Flower2\.glb|pretoria_gardens_1k_comp\.hdr/.test(req.url()))requests.push(req.url())});
 const source=fs.readFileSync(path.resolve('../home-preview/saved-reference/assets/main-D5MQsYQ6.js'),'utf8');await page.route('**/main-D5MQsYQ6.js*',r=>r.fulfill({body:source,contentType:'text/javascript'}));await page.route('**/*.mp4*',r=>r.abort());await page.route('https://**',r=>r.abort());
 await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});
 await expect.poll(()=>requests.filter(url=>url.includes('Flower2.glb')).length,{timeout:20000}).toBe(1);
 await expect.poll(()=>requests.filter(url=>url.includes('pretoria_gardens_1k_comp.hdr')).length,{timeout:20000}).toBe(1);
 await page.waitForTimeout(300);expect(requests).toHaveLength(2);
});

test('shuffled library still visits all 41 scenes with bounded media',async({page})=>{
 test.setTimeout(90000);await page.setViewportSize({width:390,height:850});await page.addInitScript(()=>{localStorage.setItem('sm-motion-preference','on');Math.random=()=>0});
 await page.route('**/main-D5MQsYQ6.js*',r=>r.fulfill({body:'',contentType:'text/javascript'}));await page.route('**/*.mp4*',r=>r.abort());await page.route('**/cinema-layers/**',r=>r.abort());await page.route('https://**',r=>r.abort());
 await page.clock.install();await page.clock.pauseAt(new Date('2035-01-01T12:00:00Z'));
 await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});await page.addStyleTag({content:'.loader,.nav{display:none!important}'});
 const stage=page.locator('#cinema-library .smcin-stage');await stage.scrollIntoViewIfNeeded();await expect.poll(()=>stage.locator('.smcin-backdrop[src]').count()).toBeGreaterThan(0);await page.clock.fastForward(800);
 const visited=new Set<string>();
 for(let i=0;i<41;i++){
  const active=stage.locator('.smcin-active');await expect(active).toHaveCount(1);visited.add((await active.getAttribute('data-scene-id'))!);
  await page.clock.fastForward(6000);await expect(active).toHaveClass(/smcin-returning/);await page.clock.fastForward(3100);
 }
 expect(visited.size).toBe(41);
 expect(await stage.locator('img.smcin-backdrop,img.smcin-person').evaluateAll(images=>images.filter(img=>img.hasAttribute('src')).length)).toBeLessThanOrEqual(4);
});
