import {test,expect} from '@playwright/test';

for (const width of [320,390,768,1440]) {
 test(`hero layout, assets and motion settings at ${width}px`,async({browser})=>{
  const context=await browser.newContext({viewport:{width,height:850},reducedMotion:'reduce'});
  const page=await context.newPage();
  await page.route('**/main-D5MQsYQ6.js*',r=>r.abort());
  await page.route('https://**',r=>r.abort());
  await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});
  await page.addStyleTag({content:'.loader{display:none!important}'});
  const heading=page.locator('.sm-hero-copy h1');
  await expect(heading).toContainText('كل ما تحب');
  await expect(heading).toContainText('بجودة');
  await expect(page.locator('#bannerCanvas')).toHaveCount(1);
  for(const line of await heading.locator('.sm-hero-line').all()){
   const box=await line.boundingBox();expect(box).not.toBeNull();expect(box!.x).toBeGreaterThanOrEqual(-1);expect(box!.x+box!.width).toBeLessThanOrEqual(width+1);
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  expect((await page.request.get('/home-preview/saved-reference/assets/hero-clouds.svg')).status()).toBe(200);
  expect((await page.request.get('/home-preview/saved-reference/assets/hero-clouds-soft.webp')).status()).toBe(200);
  expect((await page.request.get('/home-preview/saved-reference/assets/hero-motif.svg')).status()).toBe(200);
  if(width>=1024)await expect(page.locator('.sm-hero-stamp')).toBeVisible();else await expect(page.locator('.sm-hero-stamp')).toBeHidden();
  const setting=page.locator('#sm-motion-setting');
  await setting.selectOption('auto');await expect(page.locator('.ban__desc__content')).toHaveCSS('animation-name','none');
  await setting.selectOption('on');await expect(page.locator('.ban__desc__content')).toHaveCSS('animation-name','marquee');
  await heading.scrollIntoViewIfNeeded();
  await expect(heading.locator('.sm-hero-line').first()).toHaveCSS('opacity','1');
  const last=heading.locator('.sm-hero-line').last();
  await last.scrollIntoViewIfNeeded();
  await expect(last).not.toHaveClass(/sm-hero-pending/);
  await expect(last).toHaveCSS('opacity','1');
  await expect.poll(()=>last.evaluate(el=>el.style.getPropertyValue('--hero-drift'))).not.toBe('');
  await expect(page.locator('.sm-hero-info__star')).toBeVisible();
  await expect(page.locator(width<600?'.sm-hero-info__mobile':'.sm-hero-info__detail')).toBeVisible();
  await setting.selectOption('off');await expect(page.locator('.ban__desc__content')).toHaveCSS('animation-name','none');
  await expect.poll(()=>last.evaluate(el=>el.style.getPropertyValue('--hero-drift'))).toBe('');
  await context.close();
 });
}

test('homepage verbs animate only when enabled and visible',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:850},reducedMotion:'reduce'});
 const page=await context.newPage();
 await page.addInitScript(()=>localStorage.setItem('sm-motion-preference','on'));
 await page.route('**/main-D5MQsYQ6.js*',r=>r.abort());await page.route('https://**',r=>r.abort());
 await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});
 await page.addStyleTag({content:'.loader{display:none!important}'});
 const verb=page.locator('.sm-hero-verb');await verb.scrollIntoViewIfNeeded();
 await expect(verb).toHaveText('تابِع',{timeout:8000});
 await page.locator('#sm-motion-setting').selectOption('off');
 await expect(verb).toHaveText('شاهِد');
 await page.waitForTimeout(600);await expect(verb).toHaveText('شاهِد');
 await expect(page.locator('.sm-hero-copy h1')).toHaveAttribute('aria-label','شاهِد كل ما تحب بجودة 4K وبلا تقطيع');
 await context.close();
});
