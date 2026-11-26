import { test, expect } from '@playwright/test';
for (const width of [1440, 390]) {
  test(`مجسّمات السيرفرات في الرئيسية ${width}`, async ({ page }) => {
    test.setTimeout(90000);
    await page.setViewportSize({width,height:900});
    await page.route(/\.(mp4|webm)(\?.*)?$/, route => route.abort());
    await page.goto('http://127.0.0.1:3000/', {waitUntil:'domcontentloaded',timeout:60000});
    const carousel = page.locator('#works .preview');
    await expect(carousel.locator('.league-carousel-item')).toHaveCount(4, {timeout:30000});
    await page.waitForFunction(() => !document.documentElement.classList.contains('sm-preloading'), null, {timeout:15000});
    await page.evaluate(() => {
      const target = document.querySelector('#works .preview') as HTMLElement;
      const scroll = (window as any).smScrollToSection;
      if (scroll) scroll(target); else target.scrollIntoView();
    });
    const nova = carousel.locator('.league-carousel-item[data-index="0"]');
    await expect(nova.locator('.lc-stage')).toHaveClass(/has-3d/, {timeout:30000});
    const model = nova.frameLocator('iframe.preview-3d');
    await expect(model.locator('#viewer')).toHaveAttribute('data-ready','true', {timeout:30000});
    await page.getByRole('button',{name:'عرض X', exact:true}).click();
    const x = carousel.locator('.league-carousel-item[data-index="3"]');
    await expect(x.locator('.lc-stage')).toHaveClass(/has-3d/, {timeout:30000});
    await expect(x.locator('.actions a')).toHaveCount(2);
    await expect(page.locator('.ban')).toHaveCount(1);
  });
}
