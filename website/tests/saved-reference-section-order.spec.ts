import {test,expect} from '@playwright/test';
import fs from 'node:fs';import path from 'node:path';
let source=fs.readFileSync(path.resolve('../home-preview/saved-reference/assets/main-D5MQsYQ6.js'),'utf8');const start=source.indexOf(',function(t){var e;const n=.0015'),end=source.indexOf(';const Ay=document.querySelectorAll',start);if(start>=0&&end>=0)source=source.slice(0,start)+source.slice(end);
for(const width of [320,390,1440])test(`reference sections follow the visitor journey at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:850});await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','off'));await page.route('**/main-D5MQsYQ6.js*',r=>r.fulfill({body:source,contentType:'text/javascript'}));await page.route('**/*.mp4*',r=>r.abort());await page.route('https://**',r=>r.abort());await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});await page.addStyleTag({content:'.loader,.nav{display:none!important}'});await page.evaluate(()=>document.fonts.ready);
 const ids=['about','services','league-strip','featured-matches','sports-news','cinema-library','path-section','works','journey','reviews','faq','blog-teaser','contact'];
 const sections=await page.evaluate(ids=>ids.map(id=>{const el=document.getElementById(id);if(!el)throw Error('Missing '+id);const r=el.getBoundingClientRect();return {id,top:r.top,bottom:r.bottom,width:r.width,left:r.left,right:r.right}}),ids);
 for(let i=0;i<sections.length;i++){const r=sections[i];expect(r.width).toBeGreaterThan(0);expect(r.left).toBeGreaterThanOrEqual(-1);expect(r.right).toBeLessThanOrEqual(width+1);if(i)expect(r.top,`${sections[i-1].id} before ${r.id}`).toBeGreaterThanOrEqual(sections[i-1].bottom-3)}
 const headerLinks=page.locator('.nav__links a');
 const expectedHeader=['#league-strip','#cinema-library','#path-section','#works'];
 await expect(headerLinks).toHaveCount(expectedHeader.length);
 for(const [i,href] of expectedHeader.entries())await expect(headerLinks.nth(i)).toHaveAttribute('href',href);
 const menuLinks=page.locator('.nav__menu .links a');
 const expectedMenu=['#about','#services','#featured-matches','#cinema-library','#path-section','#works','#servers-compare','#journey','#reviews','#faq','#blog-teaser','#contact'];
 await expect(menuLinks).toHaveCount(expectedMenu.length);
 for(const [i,href] of expectedMenu.entries())await expect(menuLinks.nth(i)).toHaveAttribute('href',href);
 await expect(page.locator('.nav__menu .preview-menu-group h2')).toHaveText(['اكتشف','ابدأ المشاهدة','المساعدة والمزيد']);
 await expect(page.locator('#path-section')).toHaveCSS('margin-top','0px');expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
});
test('menu navigation reaches the selected reference section',async({page})=>{
 await page.setViewportSize({width:390,height:850});
 await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','off'));
 await page.route('**/*.mp4*',r=>r.abort());await page.route('https://**',r=>r.abort());
 await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});
 await expect(page.locator('.loader')).toBeHidden({timeout:60000});
 const toggle=page.locator('.nav__menu-btn'),menu=page.locator('.nav__menu');
 await toggle.click();await expect(menu).toHaveClass(/open/);
 await menu.locator('a[href="#reviews"]').click();
 await expect(menu).not.toHaveClass(/open/);await expect(page).toHaveURL(/#reviews$/);
 await expect(page.locator('#reviews')).toBeInViewport({timeout:10000});
});
