import {test,expect} from '@playwright/test';
import fs from 'node:fs';import path from 'node:path';
let source=fs.readFileSync(path.resolve('../home-preview/saved-reference/assets/main-D5MQsYQ6.js'),'utf8');
let start=source.indexOf(',function(t){var e;const n=.0015'),end=source.indexOf(';const Ay=document.querySelectorAll',start);
if(start<0||end<0)throw new Error('Reference WebGL block not found');source=source.slice(0,start)+source.slice(end);
start=source.indexOf('window.addEventListener("load",()=>{My()&&function({patternSize:');end=source.indexOf('document.addEventListener("DOMContentLoaded",()=>{const t=document.title',start);
if(start<0||end<0)throw new Error('Reference noise block not found');source=source.slice(0,start)+source.slice(end);
for(const width of [320,390,768,1024,1440])test(`homepage paths are usable at ${width}px`,async({browser})=>{
 const context=await browser.newContext({viewport:{width,height:850},reducedMotion:'no-preference'});const page=await context.newPage(),errors:string[]=[];
 await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','off'));
 await page.route('**/main-D5MQsYQ6.js*',route=>route.fulfill({body:source,contentType:'text/javascript'}));
 await page.route('**/*.mp4*',route=>route.abort());await page.route('https://**',route=>route.abort());page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});await page.addStyleTag({content:'.loader,.nav{display:none!important}'});
 const section=page.locator('#path-section'),cards=section.locator('details');
 await expect(section.getByRole('heading',{name:'اختر مسارك'})).toBeVisible();await expect(cards).toHaveCount(3);
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
 await expect(section.locator('.sm-path__compare').first()).toHaveAttribute('href','/#pricing');
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
