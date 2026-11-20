import { test, expect } from '@playwright/test';

for (const width of [320, 390, 1280]) test(`featured match timing uses confirmed source at ${width}px`, async ({ page }) => {
  await page.setViewportSize({width,height:850});
  await page.clock.install({time:new Date('2026-11-12T10:00:00Z')});
  let liveClock='42:00';
  const event=(id:string,date:string,state:string,clock?:string)=>({id,date,competitions:[{date,status:{type:{state,completed:state==='post'},displayClock:clock},competitors:[{homeAway:'home',team:{displayName:'Home'},score:'1'},{homeAway:'away',team:{displayName:'Away'},score:'0'}]}]});
  await page.route('**/scoreboard.php?*',route=>route.fulfill({json:{events:new URL(route.request().url()).searchParams.get('league')==='eng.1' ? [event('upcoming','2026-11-12T11:01:05Z','pre'),event('live','2026-11-12T09:00:00Z','in',liveClock),event('finished','2026-11-12T08:00:00Z','post')] : []}}));
  await page.route('**/main-D5MQsYQ6.js*',route=>route.abort());
  await page.route('https://**',route=>route.abort());
  await page.goto('/home-preview/saved-reference/',{waitUntil:'domcontentloaded'});
  await page.addStyleTag({content:'.loader,.nav,canvas{display:none!important}'});
  await page.locator('#featured-matches').scrollIntoViewIfNeeded();
  const scheduled=page.locator('.sm-match[data-state=scheduled]'),live=page.locator('.sm-match[data-state=live]'),finished=page.locator('.sm-match[data-state=finished]');
  await expect(scheduled).toHaveCount(1);await expect(live.locator('.sm-match__live-clock')).toHaveText('42:00');
  await expect(finished.locator('.sm-match__timing')).toBeHidden();
  const timer=scheduled.locator('.sm-match__countdown');
  await expect(timer).toContainText('ساعات');await expect(timer).toContainText('ثوانٍ');
  const before=await timer.innerText();await page.clock.runFor(2000);await expect(timer).not.toHaveText(before);
  await expect(live.locator('.sm-match__live-clock')).toHaveText('42:00');
  liveClock='43:00';await page.clock.runFor(60000);await expect(live.locator('.sm-match__live-clock')).toHaveText('43:00');
  await page.clock.fastForward(3700000);await expect(timer).toHaveText('بانتظار تأكيد البداية');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
});
