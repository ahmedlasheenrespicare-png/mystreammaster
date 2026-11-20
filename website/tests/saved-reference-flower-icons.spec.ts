import {test,expect} from '@playwright/test';
for(const width of [320,390,768,1440])test(`decorative flowers keep section colors at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:850});
  await page.route('**/main-D5MQsYQ6.js*',r=>r.fulfill({body:'',contentType:'text/javascript'}));
  await page.route('**/*.mp4*',r=>r.abort());await page.route('https://**',r=>r.abort());
  await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});
  for(const [selector,count,color] of [['.sm-path__number',3,'rgb(255, 255, 255)'],['.sm-faq__eyebrow',1,'rgb(203, 103, 140)'],['.sm-footer__track',4,'rgb(232, 126, 158)']] as const){
    const icons=page.locator(`${selector} .sm-flower-icon`);await expect(icons).toHaveCount(count);
    for(const icon of await icons.all())await expect(icon.locator('path')).toHaveCSS('stroke',color);
  }
  const pseudo=await page.locator('.sm-path__shared-heading strong').evaluate(el=>{const c=getComputedStyle(el,'::before');return {content:c.content,width:c.width,mask:c.maskImage,background:c.backgroundColor}});
  expect(pseudo.content).toBe('""');expect(parseFloat(pseudo.width)).toBeGreaterThan(0);expect(pseudo.mask).toContain('data:image/svg+xml');expect(pseudo.background).toBe('rgb(213, 104, 141)');
  await expect(page.locator('#cinema-library .smcin-mini-top svg path').first()).toHaveCSS('stroke','rgb(240, 197, 120)');
});
