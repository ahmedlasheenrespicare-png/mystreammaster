import {test,expect} from '@playwright/test';
const routes=['/roma-real-madrid/','/manchester-city-psg/','/manchester-united-atletico/','/galatasaray-barcelona/'];
for(const width of [320,390,768,1280,1440]){
 test(`analysis collection and report return paths at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:1000});
  await page.route('**/*',route=>['localhost','127.0.0.1'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/match-analysis/');
  await expect(page.locator('h1')).toHaveText('دوري أبطال أوروبا.');
  await expect(page.locator('#reports-title')).toHaveText('الجولة الثانية');
  await expect(page.locator('#reports .ma-card')).toHaveCount(4);
  for(const card of await page.locator('.ma-card').all()) {
   expect(await card.evaluate(e=>e.getBoundingClientRect().height)).toBeLessThan(700);
  }
  if(width>1000){
   const heights=await page.locator('.ma-card').evaluateAll(cards=>cards.map(c=>c.getBoundingClientRect().height));
   expect(Math.max(...heights)-Math.min(...heights)).toBeLessThan(2);
  }
  await expect(page.locator('.ma-banner,.ma-banner-image,.ma-photo-credit,.ma-photo-rights')).toHaveCount(0);
  await expect(page.locator('.ma-card img')).toHaveCount(8);
  await expect(page.locator('.ma-open')).toHaveCount(4);
  expect(await page.locator('.ma-open').evaluateAll(links=>links.map(a=>(a as HTMLAnchorElement).getAttribute('href')))).toEqual(routes);
  expect(await page.locator('.ma-scoreboard img').evaluateAll(images=>images.every(i=>(i as HTMLImageElement).naturalWidth>0))).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  if(width>=1280)expect(await page.locator('.sm-nav .sm-actions').evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;})).toBe(true);
  await expect(page.locator('.ma-score>strong').first()).toHaveCSS('color','rgb(245, 247, 251)');
  for(const card of await page.locator('.ma-card').all())expect(await card.evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://streammasterstore.com/match-analysis/');
  const graph=JSON.parse((await page.locator('script[type="application/ld+json"]').first().textContent())!)['@graph'];
  expect(graph.find((n:any)=>n['@type']==='CollectionPage').mainEntity.numberOfItems).toBe(4);
  await expect(page.locator('main iframe,main video')).toHaveCount(0);
  if(width===1440){
   await page.screenshot({path:'test-results/match-analysis-desktop.png'});
   await page.locator('#reports').screenshot({path:'test-results/match-analysis-cards.png'});
  }
  if(width===390)await page.screenshot({path:'test-results/match-analysis-mobile.png',fullPage:true});
  for(let i=0;i<routes.length;i++){
   await page.locator('.ma-open').nth(i).click();
   await expect(page).toHaveURL(new RegExp(`${routes[i]}$`));
   const breadcrumb=page.locator('main nav[aria-label="مسار التنقل"]');
   await expect(breadcrumb.getByRole('link',{name:'تحليل المباريات',exact:true})).toHaveAttribute('href','/match-analysis/');
   await breadcrumb.getByRole('link',{name:'تحليل المباريات',exact:true}).click();
   await expect(page).toHaveURL(/\/match-analysis\/$/);
  }
  expect(errors).toEqual([]);
 });
}
test('analysis collection remains complete without JavaScript',async({browser})=>{
 const context=await browser.newContext({javaScriptEnabled:false});const page=await context.newPage();
 await page.goto('/match-analysis/');
 await expect(page.locator('.ma-card')).toHaveCount(4);
 await expect(page.locator('.ma-scoreboard').first()).toHaveAttribute('aria-label','النتيجة النهائية: روما 3، ريال مدريد 4');
 await page.locator('.ma-open').first().click();await expect(page).toHaveURL(/\/roma-real-madrid\/$/);
 await page.locator('.fixture-breadcrumb').getByRole('link',{name:'تحليل المباريات',exact:true}).click();
 await expect(page.locator('.ma-card')).toHaveCount(4);await context.close();
});

for(const width of [390,1440]){
 test(`season dropdown contains round-two matches at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:1000});
  await page.goto('/match-analysis/');
  if(width<1360){
   await page.locator('.sm-menu-toggle').click();
   const group=page.locator('.sm-acc[data-group="match-center"]');
   if(await group.getAttribute('open')===null)await group.locator(':scope > summary').click();
  }else await page.locator('#sm-dd-btn-match-center').click();
  const season=page.locator(width<1360?'.sm-mobile .sm-season':'.sm-dd-match-center .sm-season');
  await expect(season).not.toHaveAttribute('open','');
  await season.locator('summary').click();
  await expect(season).toHaveAttribute('open','');
  await expect(season.getByText('تحليلات الجولة الثانية',{exact:true})).toBeVisible();
  for(const route of routes)await expect(season.locator(`a[href="${route}"]`)).toBeVisible();
  await season.locator(`a[href="${routes[0]}"]`).click();
  await expect(page).toHaveURL(/\/roma-real-madrid\/$/);
 });
}
