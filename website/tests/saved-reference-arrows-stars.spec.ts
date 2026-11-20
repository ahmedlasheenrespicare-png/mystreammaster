import {test,expect} from '@playwright/test';

for(const width of [320,390,768,1024,1440])test(`reference arrows and pink motifs render at ${width}px`,async({browser})=>{
 const context=await browser.newContext({viewport:{width,height:850},reducedMotion:'reduce'}),page=await context.newPage();
 await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','off'));
 await page.route('**/main-D5MQsYQ6.js*',route=>route.abort());await page.route('**/*.mp4*',route=>route.abort());await page.route('https://**',route=>route.abort());
 await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});await page.addStyleTag({content:'.loader,.nav{display:none!important}'});
 const hero=page.locator('.ban__oval__btn');await expect(hero).toBeVisible();await expect(hero).toHaveAttribute('href','#sm-hero-copy');
 await expect(hero.locator('.sm-reference-arrow--down')).toBeVisible();
 expect(await hero.locator('span').evaluate(el=>getComputedStyle(el,'::before').content)).toBe('none');
 const section=page.locator('#path-section'),stars=section.locator('.sm-path__aster img');await expect(stars).toHaveCount(3);
 for(const star of await stars.all()){await expect(star).toBeVisible();await expect(star).toHaveAttribute('src','./assets/aster-rose.svg');await expect.poll(()=>star.evaluate((el:HTMLImageElement)=>el.complete&&el.naturalWidth>0)).toBe(true)}
 const asset=await page.request.get('/home-preview/saved-reference/assets/aster-rose.svg');expect(asset.status()).toBe(200);expect(await asset.text()).toContain('#E06C8F');
 const title=page.locator('.sm-about .small_title').first();expect(await title.evaluate(el=>getComputedStyle(el,'::before').backgroundImage)).toContain('aster-rose.svg');
 const trial=section.locator('.sm-path__trial');await expect(trial.locator('b .sm-reference-arrow')).toBeVisible();await expect(trial).toHaveAttribute('href',/^https:\/\/wa\.me\/201090415657\?text=/);
 for(const card of await section.locator('.sm-path__card').all()){
  await card.evaluate((el:HTMLDetailsElement)=>{el.open=true});
  const arrow=card.locator('.sm-path__buy-arrow .sm-reference-arrow');await expect(arrow).toBeVisible();await expect(arrow).toHaveCSS('stroke','rgb(255, 255, 255)');
  const circle=await card.locator('.sm-path__buy-arrow').boundingBox();expect(circle!.width).toBeGreaterThanOrEqual(48);
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);await context.close();
});

for(const width of [320,390,768,1440])test(`section action arrows use the same vector shape at ${width}px`,async({browser})=>{
 const context=await browser.newContext({viewport:{width,height:850},reducedMotion:'reduce'}),page=await context.newPage();
 await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','off'));
 await page.route('**/main-D5MQsYQ6.js*',route=>route.abort());await page.route('**/*.mp4*',route=>route.abort());await page.route('https://**',route=>route.abort());
 await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});await page.addStyleTag({content:'.loader,.nav{display:none!important}'});
 for(const selector of ['.sm-server__actions a:first-child','.sm-journey__step-link','.sm-leagues__card a','.sm-blog__all','.sm-faq__bottom a','.sm-contact__actions a','.sm-footer__brand>a']){
  const link=page.locator(selector).first(),icon=link.locator('.sm-arrow-icon .sm-reference-arrow');await expect(icon).toHaveCount(1);
  await expect(icon.locator('path')).toHaveAttribute('d','M5 19 19 5M7 5h12v12');
  const styles=await icon.evaluate(el=>({display:getComputedStyle(el).display,stroke:getComputedStyle(el).stroke,width:el.getBoundingClientRect().width}));
  expect(styles.display).not.toBe('none');expect(styles.stroke).not.toBe('none');if(selector!=='.sm-leagues__card a')expect(styles.width).toBeGreaterThan(8);
 }
 for(const selector of ['.sm-matches__arrows button[data-direction]','.sm-blog__controls button[data-blog-direction]']){
  const buttons=page.locator(selector);await expect(buttons).toHaveCount(2);for(const button of await buttons.all())await expect(button.locator('svg.sm-reference-arrow--nav path')).toHaveCount(1);
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);await context.close();
});
