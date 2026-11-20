import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import path from 'node:path';
const script=readFileSync(path.resolve('../home-preview/saved-reference/assets/about-fold.js'),'utf8');
const css=readFileSync(path.resolve('../home-preview/saved-reference/assets/about-fold.css'),'utf8');
for(const width of [320,390,768,1440])test(`about copy reveals horizontally with scrolling at ${width}px`,async({browser})=>{
 const context=await browser.newContext({viewport:{width,height:700},isMobile:width<700,hasTouch:width<700});const page=await context.newPage();
 await page.setContent(`<meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}.spacer{height:900px}.sm-about .abt__who .abt__who__text p{font-size:30px;line-height:1.5;padding:24px 0;max-width:800px;margin:auto;direction:rtl}${css}</style><div class="spacer"></div><section class="sm-about"><div class="abt__who"><div class="abt__who__text"><p class="a-text fold-about-text" aria-label="على شاشتك وجوالك، ترفيه أينما كنت ومشاهدة تناسب يومك."><span class="fold-about-base" aria-hidden="true">على شاشتك وجوالك، ترفيه أينما كنت ومشاهدة تناسب يومك.</span><span class="fold-about-fill" aria-hidden="true">على شاشتك وجوالك، ترفيه أينما كنت ومشاهدة تناسب يومك.</span></p></div></div></section><div class="spacer"></div>`);
 await page.evaluate(()=>{let listeners:Function[]=[];(window as any).smMotion={matches:false,addEventListener(_type:string,fn:Function){listeners.push(fn)},set(value:boolean){this.matches=value;listeners.forEach(fn=>fn())}}});await page.addScriptTag({content:script});
 await page.evaluate(()=>window.scrollTo(0,450));const paragraph=page.locator('.fold-about-text');await expect.poll(()=>paragraph.evaluate(e=>e.style.getPropertyValue('--fold-progress'))).not.toBe('');let before=Number(await paragraph.evaluate(e=>e.style.getPropertyValue('--fold-progress')));
 await page.evaluate(()=>window.scrollTo(0,800));await expect.poll(()=>paragraph.evaluate(e=>Number(e.style.getPropertyValue('--fold-progress')))).toBeGreaterThan(before);expect(await paragraph.evaluate(e=>getComputedStyle(e).transform)).toBe('none');expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
 await page.evaluate(()=>(window as any).smMotion.set(true));await expect.poll(()=>paragraph.evaluate(e=>Number(e.style.getPropertyValue('--fold-progress')))).toBe(1);await context.close();
});
