import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// Keep the reference interaction and scroll engine, but remove WebGL scenes
// and noise for repeatable layout and keyboard tests on headless CI.
let source=fs.readFileSync(path.resolve('../home-preview/saved-reference/assets/main-D5MQsYQ6.js'),'utf8');
let start=source.indexOf(',function(t){var e;const n=.0015'),end=source.indexOf(';const Ay=document.querySelectorAll',start);
if(start<0||end<0)throw new Error('Reference WebGL block not found');
source=source.slice(0,start)+source.slice(end);
start=source.indexOf('window.addEventListener("load",()=>{My()&&function({patternSize:');end=source.indexOf('document.addEventListener("DOMContentLoaded",()=>{const t=document.title',start);
if(start<0||end<0)throw new Error('Reference noise block not found');
source=source.slice(0,start)+source.slice(end);

for(const width of [320,390,1440])test(`about section keeps reference layout and card interaction at ${width}px`,async({browser})=>{
 const context=await browser.newContext({viewport:{width,height:850},reducedMotion:'no-preference'});
 const page=await context.newPage();const errors:string[]=[];
 await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','on'));
 await page.route('**/main-D5MQsYQ6.js*',route=>route.fulfill({body:source,contentType:'text/javascript'}));
 await page.route('**/*.mp4*',route=>route.abort());await page.route('https://**',route=>route.abort());
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});
 await page.addStyleTag({content:'.loader,.nav{display:none!important}'});
 const card=page.locator('.sm-about .flip-card');await card.scrollIntoViewIfNeeded();
 await expect(card).not.toHaveClass(/sm-about-reveal-pending/);
 await expect(card.locator('.sm-about__flip-hint')).toBeVisible();
 await expect(page.locator('.sm-about .a-text').first()).toContainText('على شاشتك وجوالك');
 await expect(card).toHaveAttribute('aria-pressed','false');
 await expect(card.locator('img.front')).toHaveJSProperty('complete',true);
 await expect.poll(()=>card.locator('img.front').evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBeGreaterThan(0);
 await card.click();await expect(card).toHaveAttribute('aria-pressed','true');await expect(card).toHaveClass(/flipped/);
 await card.focus();await page.keyboard.press('Space');await expect(card).toHaveAttribute('aria-pressed','false');await expect(card).not.toHaveClass(/flipped/);
 await page.locator('#sm-motion-setting').selectOption('off');await expect(card.locator('img.front')).toHaveCSS('transition-duration','0s');
 await expect(page.locator('.sm-about .a-text.sm-about-reveal-pending')).toHaveCount(0);
 await expect(page.locator('.abt__video video')).toHaveAttribute('src',/video-streammaster-hd-1080/);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
 expect(errors).toEqual([]);await context.close();
});
