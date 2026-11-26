import {test, expect} from '@playwright/test';
for (const server of ['nova','x']) for (const width of [1440,390]) {
  test(`مجسّم صفحة ${server} بحجم ${width}`, async ({page}) => {
    await page.setViewportSize({width,height:900});
    await page.goto(`/${server}/`, {waitUntil:'domcontentloaded'});
    const model = page.locator(`.plan-server-model[data-server="${server}"]`);
    await expect(model).toBeVisible();
    await expect(model.locator('iframe')).toHaveCSS('opacity','1', {timeout:30000});
    await expect(model.frameLocator('iframe').locator('#viewer')).toHaveAttribute('data-ready','true', {timeout:30000});
    await expect(page.getByRole('heading',{level:1})).toBeVisible();
    await expect(page.getByRole('button',{name:'12 شهر (سنة كاملة)'})).toBeVisible();
  });
}
test('يبقى الشعار الأصلي ظاهرًا عند تعذّر WebGL', async ({page}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type: string, ...args: any[]) {
      if (['webgl','webgl2','experimental-webgl'].includes(type)) return null;
      return (original as any).call(this,type,...args);
    } as typeof HTMLCanvasElement.prototype.getContext;
  });
  await page.goto('/nova/');
  const model = page.locator('.plan-server-model');
  await expect(model.frameLocator('iframe').locator('#viewer')).toHaveAttribute('data-ready','fallback');
  await expect(model.locator('img')).toHaveCSS('opacity','1');
});
test('الشعار متاح عند إيقاف JavaScript', async ({browser}) => {
  const context = await browser.newContext({javaScriptEnabled:false});
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:3000/x/');
  await expect(page.locator('.plan-server-model img')).toBeVisible();
  await expect(page.locator('.plan-server-model iframe')).toHaveCount(0);
  await context.close();
});
