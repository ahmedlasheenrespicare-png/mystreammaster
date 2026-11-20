import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// Keep the reference interaction and scroll engine, but remove WebGL scenes
// and noise for repeatable layout and keyboard tests on headless CI.
let source=fs.readFileSync(path.resolve('../home-preview/saved-reference/assets/main-D5MQsYQ6.js'),'utf8');
let start=source.indexOf(',function(t){var e;let smMobile=window.innerWidth<=1023;const n=.0015'),end=source.indexOf(';const Ay=document.querySelectorAll',start);
if(start<0||end<0)throw new Error('Reference WebGL block not found');
source=source.slice(0,start)+source.slice(end);
start=source.indexOf('window.addEventListener("load",()=>{My()&&function({patternSize:');end=source.indexOf('document.addEventListener("DOMContentLoaded",()=>{const t=document.title',start);
if(start<0||end<0)throw new Error('Reference noise block not found');
source=source.slice(0,start)+source.slice(end);

for(const width of [320,390,768,1440])test(`about devices preserve the reference scene and flip independently at ${width}px`,async({browser})=>{
 const context=await browser.newContext({viewport:{width,height:850},reducedMotion:'no-preference'});
 const page=await context.newPage();const errors:string[]=[];
 await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','on'));
 await page.route('**/main-D5MQsYQ6.js*',route=>route.fulfill({body:source,contentType:'text/javascript'}));
 await page.route('**/*.mp4*',route=>route.abort());await page.route('https://**',route=>route.abort());
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});
 await page.addStyleTag({content:'.loader,.nav{display:none!important}'});
 const group=page.locator('.sm-about__devices'),buttons=group.locator('button');await page.waitForTimeout(1500);await group.scrollIntoViewIfNeeded();
 await expect(group).not.toHaveClass(/sm-about-reveal-pending/);await expect(buttons).toHaveCount(3);
 await expect(page.locator('.sm-about .a-text').first()).toContainText('على شاشتك وجوالك');
 const welcome=page.locator('.sm-about__welcome'),mark=welcome.locator('.sm-welcome-mark');
 await expect(welcome).toHaveAttribute('aria-label','شعار ستريم ماستر');
 await expect(mark).toContainText('STREAM MASTER');
 await expect.poll(()=>mark.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
 expect((await welcome.boundingBox())!.width).toBeLessThanOrEqual(width<600?151:246);
 for(const button of await buttons.all()){
  await expect(button).toHaveAttribute('aria-pressed','false');
  const box=await button.boundingBox();expect(box!.width).toBeGreaterThanOrEqual(44);expect(box!.height).toBeGreaterThanOrEqual(44);
  await button.click();await expect(button).toHaveAttribute('aria-pressed','true');
  await button.focus();await page.keyboard.press('Space');await expect(button).toHaveAttribute('aria-pressed','false');
 }
 await buttons.nth(0).click();await expect(buttons.nth(0)).toHaveAttribute('aria-pressed','true');await expect(buttons.nth(1)).toHaveAttribute('aria-pressed','false');
 await page.locator('#sm-motion-setting').evaluate((el:HTMLSelectElement)=>{el.value='off';el.dispatchEvent(new Event('change',{bubbles:true}))});
 await expect(buttons.nth(0).locator('.sm-device__turn')).toHaveCSS('transition-duration','0s');
 await expect(page.locator('.sm-about .a-text.sm-about-reveal-pending')).toHaveCount(0);
 await expect(page.locator('.abt__video video')).toHaveAttribute('data-src',/video-streammaster-hero-montage-1080/);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
 expect(errors).toEqual([]);await context.close();
});

test('device illustrations remain visible without JavaScript',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:850},javaScriptEnabled:false}),page=await context.newPage();
 await page.route('**/*.mp4*',route=>route.abort());await page.route('https://**',route=>route.abort());
 await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});
 const devices=page.locator('.sm-about__devices');await expect(devices).toBeVisible();await expect(devices).toHaveCSS('opacity','1');
 await expect(devices.locator('.sm-device__front')).toHaveCount(3);await context.close();
});

test('welcome wordmark animates on arrival and respects motion settings',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:850},reducedMotion:'reduce'}),page=await context.newPage();
 await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','on'));
 await page.route('**/main-D5MQsYQ6.js*',route=>route.fulfill({body:source,contentType:'text/javascript'}));
 await page.route('**/*.mp4*',route=>route.abort());await page.route('https://**',route=>route.abort());
 await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});await page.addStyleTag({content:'.loader,.nav{display:none!important}'});
 await page.waitForTimeout(1500);const mark=page.locator('.sm-about__welcome');await mark.scrollIntoViewIfNeeded();
 await expect(mark).toHaveClass(/is-visible/);await expect(mark).toHaveClass(/is-in-view/);
 await expect(mark.locator('.sm-welcome-mark__piece').first()).toHaveCSS('animation-name','sm-welcome-arrive, sm-welcome-pulse');
 await expect(mark.locator('.sm-welcome-mark__piece').first()).toHaveCSS('animation-iteration-count','1, infinite');
 await expect(mark.locator('.sm-welcome-mark__rule').first()).toHaveCSS('animation-iteration-count','infinite');
 expect(await mark.locator('.sm-welcome-mark').evaluate(el=>getComputedStyle(el,'::before').animationName)).toBe('sm-welcome-halo');
 await page.locator('#sm-motion-setting').evaluate((el:HTMLSelectElement)=>{el.value='off';el.dispatchEvent(new Event('change',{bubbles:true}))});
 await expect(mark.locator('.sm-welcome-mark__piece').first()).toHaveCSS('animation-name','none');
 expect(await mark.locator('.sm-welcome-mark').evaluate(el=>getComputedStyle(el,'::before').animationName)).toBe('none');
 await page.locator('#sm-motion-setting').evaluate((el:HTMLSelectElement)=>{el.value='auto';el.dispatchEvent(new Event('change',{bubbles:true}))});
 await expect(mark.locator('.sm-welcome-mark__piece').first()).toHaveCSS('animation-name','none');await context.close();
});
