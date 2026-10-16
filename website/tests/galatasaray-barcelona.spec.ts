import {test,expect} from '@playwright/test';
const PATH='/galatasaray-barcelona/';
for(const width of [320,390,768,1440]){
 test(`complete Galatasaray–Barcelona report at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:1000});
  await page.route('**/*',r=>['127.0.0.1','localhost'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(PATH);
  await expect(page.locator('main h1')).toHaveCount(1);await expect(page.locator('main h1')).toContainText('برشلونة');
  await expect(page.locator('.fixture-final-result')).toHaveAttribute('aria-label','النتيجة النهائية: جالاتا سراي 1، برشلونة 4');
  await expect(page.locator('.match-details time')).toHaveAttribute('datetime','2026-10-13T22:00:00+03:00');
  for(const id of ['match-facts','match-summary','head-to-head','match-lineups','uefa-stats','preview','arabic-reviews','competition-standings','official-highlights','report-sources','faq'])await expect(page.locator('#'+id)).toHaveCount(1);
  for(const [selector,count] of [['[data-starting-player]',22],['[data-substitute-player]',10],['#uefa-stats tbody tr',24],['.fc-card',9],['#competition-standings tbody tr',74],['.fh-card',3],['.report-source',11],['[data-analyst-review]',1]] as const)await expect(page.locator(selector)).toHaveCount(count);
  expect(await page.locator('.club-mark').evaluateAll(imgs=>imgs.every(i=>(i as HTMLImageElement).naturalWidth>0))).toBe(true);
  await expect(page.locator('main iframe,main video,[data-chart-source="espn"]')).toHaveCount(0);
  await expect(page.locator('[data-starting-player="1467236"] [data-player-rating]')).toHaveAttribute('data-player-rating','9.0');
  await page.locator('[data-chart-filter="attack"]').click();await expect(page.locator('.fc-card:visible')).toHaveCount(3);
  await page.locator('[data-chart-highlight="away"]').click();await expect(page.locator('#analysis-charts')).toHaveAttribute('data-highlight','away');
  await page.locator('[data-chart-filter="all"]').click();await expect(page.locator('.fc-card:visible')).toHaveCount(9);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  expect(await page.locator('.report-nav a').evaluateAll(links=>links.every(a=>document.getElementById((a as HTMLAnchorElement).hash.slice(1))))).toBe(true);
  await page.locator('main details summary').first().click();await expect(page.locator('main details p').first()).toBeVisible();
  if(width===1440)await page.screenshot({path:'test-results/galatasaray-barcelona-desktop.png',fullPage:true});
  await page.locator('#primary-watch').click();await expect(page).toHaveURL(/\/galatasaray-barcelona\/watch\/$/);
  await expect(page.locator('main')).toContainText('جالاتا سراي 1–4 برشلونة');
  await page.getByRole('link',{name:'العودة إلى تفاصيل المواجهة'}).click();expect(errors).toEqual([]);
 });
}
test('Galatasaray report is complete without JavaScript',async({browser})=>{
 const context=await browser.newContext({javaScriptEnabled:false});const page=await context.newPage();await page.goto(PATH);
 await expect(page.locator('[data-starting-player]')).toHaveCount(22);await expect(page.locator('#uefa-stats tbody tr')).toHaveCount(24);
 await expect(page.locator('#competition-standings tbody tr')).toHaveCount(74);await expect(page.locator('.fc-card')).toHaveCount(9);
 await page.locator('.fixture-breadcrumb a[href="/match-analysis/"]').click();await expect(page.locator('.ma-card')).toHaveCount(4);await context.close();
});
test('Galatasaray report never sends scoreboard or standings requests',async({page})=>{
 const requests:string[]=[];page.on('request',r=>{if(/\/(standings|scoreboard)\.php/.test(r.url()))requests.push(r.url());});
 await page.clock.install({time:new Date('2026-10-16T12:00:00Z')});await page.goto(PATH);await page.clock.runFor(301000);
 await expect(page.locator('[data-galatasaray-standing][data-feed-state="snapshot"]')).toHaveCount(3);
 await expect(page.locator('#competition-standings tbody tr')).toHaveCount(74);expect(requests).toEqual([]);
});
