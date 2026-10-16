import { test, expect } from '@playwright/test';
const PATH='/roma-real-madrid/';
const sections=['match-facts','match-summary','head-to-head','match-lineups','uefa-stats','preview','arabic-reviews','competition-standings','official-highlights','report-sources','source-scoreboard','faq'];
for (const width of [320,390,768,1440]) {
  test(`complete Roma–Madrid report and follow page at ${width}px`, async ({page})=>{
    await page.setViewportSize({width,height:900});
    await page.route('**/*',route=>['127.0.0.1','localhost'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(PATH);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toContainText('ريال مدريد');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://streammasterstore.com/roma-real-madrid/');
    await expect(page.locator('.fixture-final-result')).toHaveAttribute('aria-label','النتيجة النهائية: روما 3، ريال مدريد 4');
    await expect(page.locator('.match-details time')).toHaveAttribute('datetime','2026-10-14T22:00:00+03:00');
    await expect(page.locator('.time-zone-note')).toContainText('مصر 22:00 · مكة 22:00 · UTC 19:00');
    for (const id of sections) await expect(page.locator(`#${id}`)).toHaveCount(1);
    await expect(page.locator('.club-mark')).toHaveCount(2);
    expect(await page.locator('.club-mark').evaluateAll(images=>images.every(img=>(img as HTMLImageElement).naturalWidth>0))).toBe(true);
    await expect(page.locator('[data-starting-player]')).toHaveCount(22);
    await expect(page.locator('[data-substitute-player]')).toHaveCount(10);
    await expect(page.locator('#uefa-stats tbody tr')).toHaveCount(24);
    await expect(page.locator('.fc-card')).toHaveCount(9);
    await expect(page.locator('#head-to-head .fh-card')).toHaveCount(3);
    await expect(page.locator('#competition-standings tbody tr')).toHaveCount(76);
    await expect(page.locator('#report-sources .report-source')).toHaveCount(15);
    await expect(page.locator('#report-sources a[href*="2049573"]')).toHaveCount(0);
    await expect(page.locator('iframe, [data-watch-url]')).toHaveCount(0);
    const graph=JSON.parse((await page.locator('script[type="application/ld+json"]').first().textContent())!)['@graph'];
    for(const item of graph.find((n:any)=>n['@type']==='FAQPage').mainEntity){
      const detail=page.locator('main details').filter({has:page.locator('summary',{hasText:item.name})});
      await expect(detail.locator('p')).toHaveText(item.acceptedAnswer.text);
    }
    await page.locator('main details').first().locator('summary').click();
    await expect(page.locator('main details').first().locator('p')).toBeVisible();
    await page.locator('[data-chart-filter="attack"]').click();
    await expect(page.locator('.fc-card:visible')).toHaveCount(3);
    await page.locator('[data-chart-highlight="home"]').click();
    await expect(page.locator('#analysis-charts')).toHaveAttribute('data-highlight','home');
    await page.locator('[data-chart-filter="all"]').click();
    await expect(page.locator('.fc-card:visible')).toHaveCount(9);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    // Every in-page navigation points to an actual section.
    expect(await page.locator('.report-nav a').evaluateAll(links=>links.every(a=>document.getElementById((a as HTMLAnchorElement).hash.slice(1))))).toBe(true);
    if(width===1440) await page.screenshot({path:'test-results/roma-madrid-desktop.png',fullPage:true});
    await expect(page.locator('[data-analyst-review="whtGr0wtW3U"] .fr-open-video')).toHaveAttribute('href','#source-awaad-review');
    await expect(page.locator('[data-analyst-review="TP5-CX67cgg"] .fr-open-video')).toHaveAttribute('href','#source-nasrallah-review');
    await expect(page.locator('#source-nasrallah-review a')).toHaveAttribute('href','https://www.youtube.com/watch?v=TP5-CX67cgg');
    await page.locator('#primary-watch').click();
    await expect(page).toHaveURL(/\/roma-real-madrid\/watch\/$/);
    await expect(page.locator('main')).toContainText('انتهت المباراة');
    await page.getByRole('link',{name:'العودة إلى تفاصيل المواجهة'}).click();
    expect(errors).toEqual([]);
  });
}
test('report is complete without JavaScript',async({browser})=>{
  const context=await browser.newContext({javaScriptEnabled:false});
  const page=await context.newPage();await page.goto(PATH);
  await expect(page.locator('#uefa-stats tbody tr')).toHaveCount(24);
  await expect(page.locator('[data-starting-player]')).toHaveCount(22);
  await expect(page.locator('#competition-standings tbody tr')).toHaveCount(76);
  await expect(page.locator('.fc-card')).toHaveCount(9);
  await expect(page.locator('#official-highlights a')).toHaveAttribute('href','#source-highlights');
  await context.close();
});
test('PHP failure retains official report and dated standings',async({page})=>{
  await page.goto(PATH);
  await expect(page.locator('[data-roma-live-status]')).toContainText('المعاينة لا تشغّل PHP');
  await expect(page.locator('[data-roma-standing-status]').first()).toContainText('احتُفظ');
  await expect(page.locator('#competition-standings tbody tr')).toHaveCount(76);
  await expect(page.locator('.fixture-final-score')).toContainText('3');
  await page.locator('[data-chart-source="espn"]').click();
  await expect(page.locator('[data-chart-status]')).toContainText(/PHP|المعاينة/);
  await expect(page.locator('.fc-value').first()).toContainText('غير متاح');
  await page.locator('[data-chart-source="uefa"]').click();
  await expect(page.locator('.fc-value').first()).toHaveText('14');
});
test('matching ESPN fixture updates only the independent panels',async({page})=>{
  await page.route('**/scoreboard.php?*',route=>route.fulfill({json:{events:[{id:'401915414',date:'2026-10-14T19:00:00Z',status:{type:{completed:true}},competitions:[{competitors:[{homeAway:'home',team:{id:'104'},score:'3',statistics:[{name:'totalShots',displayValue:'17'}]},{homeAway:'away',team:{id:'86'},score:'4',statistics:[{name:'totalShots',displayValue:'16'}]}]}]}]}}));
  await page.goto(PATH);
  await expect(page.locator('[data-roma-live-status]')).toContainText('قراءة ESPN');
  await page.locator('[data-chart-source="espn"]').click();
  await expect(page.locator('[data-metric="attempts"] .fc-value').first()).toHaveText('17');
  await expect(page.locator('#uefa-stats [data-stat="attempts"] td').first()).toHaveText('14');
  await page.locator('[data-chart-source="uefa"]').click();
  await expect(page.locator('[data-metric="attempts"] .fc-value').first()).toHaveText('14');
});
test('ita.1 remains a complete dated snapshot without unsupported PHP requests',async({page})=>{
  const requests:string[]=[];
  page.on('request',request=>{if(request.url().includes('standings.php?league=ita.1'))requests.push(request.url());});
  await page.clock.install({time:new Date('2026-10-16T12:00:00Z')});
  await page.goto(PATH);
  const card=page.locator('[data-roma-standing="ita.1"]');
  await expect(card).toHaveAttribute('data-feed-state','snapshot');
  await expect(card.locator('tbody tr')).toHaveCount(20);
  await expect(card.locator('.fs-reading')).toContainText('لقطة ثابتة مؤرخة');
  await page.clock.runFor(301000);
  await expect(card).toHaveAttribute('data-feed-state','snapshot');
  await expect(card.locator('tbody tr')).toHaveCount(20);
  expect(requests).toEqual([]);
  await expect(page.locator('#uefa-stats [data-stat="possession"] td').first()).toHaveText('50%');
});
test('failed later reads preserve independent chart values and timestamp',async({page})=>{
  let failed=false;
  await page.clock.install({time:new Date('2026-10-16T12:00:00Z')});
  await page.route('**/scoreboard.php?*',route=>failed?route.fulfill({status:503,json:{ok:false}}):route.fulfill({json:{events:[{id:'401915414',date:'2026-10-14T19:00:00Z',status:{type:{completed:true}},competitions:[{competitors:[{homeAway:'home',team:{id:'104'},score:'3',statistics:[{name:'totalShots',displayValue:'17'}]},{homeAway:'away',team:{id:'86'},score:'4',statistics:[{name:'totalShots',displayValue:'16'}]}]}]}]}}));
  await page.goto(PATH);
  await page.locator('[data-chart-source="espn"]').click();
  await expect(page.locator('[data-metric="attempts"] .fc-value').first()).toHaveText('17');
  const read=await page.evaluate(()=>(window as any).__smFixtureChartSnapshot.checkedAt);
  failed=true;
  await page.clock.runFor(61000);
  await expect(page.locator('[data-chart-status]')).toContainText('تعذّر');
  await expect(page.locator('[data-metric="attempts"] .fc-value').first()).toHaveText('17');
  expect(await page.evaluate(()=>(window as any).__smFixtureChartSnapshot.checkedAt)).toBe(read);
});
