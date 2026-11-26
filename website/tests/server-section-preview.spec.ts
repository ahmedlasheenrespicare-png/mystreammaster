import { test, expect } from '@playwright/test';
for (const width of [1440, 390]) {
  test(`معاينة قسم السيرفرات بمجسّمَي نوفا وX ${width}`, async ({page}) => {
    await page.setViewportSize({width,height:900});
    await page.goto('http://127.0.0.1:5174/');
    await expect(page.getByText('معاينة مستقلة لقسم السيرفرات')).toBeVisible();
    await page.locator('#works .league-carousel-controls').scrollIntoViewIfNeeded();
    await expect(page.locator('#works .league-carousel-item')).toHaveCount(4);
    const nova = page.locator('.league-carousel-item[data-index="0"]');
    await expect(nova.locator('.lc-stage')).toHaveClass(/has-3d/, {timeout:30000});
    const novaFrame = nova.frameLocator('iframe.preview-3d');
    await expect(novaFrame.locator('#viewer canvas')).toBeVisible();
    await expect(novaFrame.locator('.stage, .topbar, .viewer-caption')).toHaveCount(0);
    await page.getByRole('button', {name:'عرض X',exact:true}).click();
    const x = page.locator('.league-carousel-item[data-index="3"]');
    await expect(x.locator('.lc-stage')).toHaveClass(/has-3d/, {timeout:30000});
    await expect(x.locator('.actions a')).toHaveCount(2);
    await expect(page.getByText('مجسّم 3D', {exact:true})).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('يعاد دخول المجسّم عند عودة بطاقته إلى المقدمة', async ({page}) => {
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto('http://127.0.0.1:5174/');
  await page.locator('#works .league-carousel-controls').scrollIntoViewIfNeeded();
  const nova = page.locator('.league-carousel-item[data-index="0"]');
  const viewer = nova.frameLocator('iframe.preview-3d').locator('#viewer');
  await expect(viewer).toHaveAttribute('data-entrance','complete',{timeout:20000});
  await page.getByRole('button',{name:'عرض X',exact:true}).click();
  await expect(nova).not.toHaveAttribute('data-ring-pos','front');
  await page.getByRole('button',{name:'عرض نوفا',exact:true}).click();
  await expect(nova).toHaveAttribute('data-ring-pos','front');
  await expect(viewer).toHaveAttribute('data-entrance',/waiting|first|second/,{timeout:3000});
  await expect(viewer).toHaveAttribute('data-entrance','complete',{timeout:20000});
});
