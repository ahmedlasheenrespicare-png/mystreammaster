import { expect, test } from '@playwright/test';

async function blockExternal(page: import('@playwright/test').Page) {
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (url.startsWith('http://127.0.0.1:3000') || url.startsWith('http://localhost:3000') || url.startsWith('data:')) {
      return route.continue();
    }
    return route.abort();
  });
}

test.describe('هوية ستريم ماستر المتحركة (brave-newt-35) واستجابة الجوال', () => {
  test('شعار الهيدر يتحرك بنفس الأسلوب مع الحفاظ التام على نفس الحجم والمساحة (مكتب وجوال)', async ({ browser }) => {
    for (const vp of [
      { width: 1440, height: 900, expectedTile: 36, subVisible: true },
      { width: 390, height: 844, expectedTile: 28, subVisible: false },
      { width: 320, height: 640, expectedTile: 21, subVisible: false },
    ]) {
      const ctxMotion = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, reducedMotion: 'no-preference' });
      const ctxStatic = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, reducedMotion: 'reduce' });

      const pMotion = await ctxMotion.newPage();
      const pStatic = await ctxStatic.newPage();
      await blockExternal(pMotion);
      await blockExternal(pStatic);

      await pMotion.goto('/?nosplash=1', { waitUntil: 'load' });
      await pStatic.goto('/?nosplash=1', { waitUntil: 'load' });

      const motionInfo = await pMotion.locator('header .sm-crab39').evaluate((el) => {
        const rect = el.getBoundingClientRect();
        const tile = el.querySelector('.sm-crab39__tile') as HTMLElement;
        const rest = el.querySelector('.sm-crab39__rest') as HTMLElement;
        const sub = el.querySelector('.sm-crab39__sub') as HTMLElement;
        const before = getComputedStyle(el, '::before');
        return {
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          tileOffsetW: tile.offsetWidth,
          tileOffsetH: tile.offsetHeight,
          tileAnim: getComputedStyle(tile).animationName,
          restAnim: getComputedStyle(rest).animationName,
          lineAnim: before.animationName,
          subDisplay: getComputedStyle(sub).display,
        };
      });

      const staticInfo = await pStatic.locator('header .sm-crab39').evaluate((el) => {
        const rect = el.getBoundingClientRect();
        const tile = el.querySelector('.sm-crab39__tile') as HTMLElement;
        return {
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          tileOffsetW: tile.offsetWidth,
          tileOffsetH: tile.offsetHeight,
          tileAnim: getComputedStyle(tile).animationName,
        };
      });

      expect(motionInfo.tileOffsetW).toBe(vp.expectedTile);
      expect(motionInfo.tileOffsetH).toBe(vp.expectedTile);
      expect(Math.abs(motionInfo.width - staticInfo.width)).toBeLessThanOrEqual(2);
      expect(Math.abs(motionInfo.height - staticInfo.height)).toBeLessThanOrEqual(2);
      expect(motionInfo.tileAnim).toContain('smCrab39Fly');
      expect(motionInfo.restAnim).toContain('smCrab39Fly');
      expect(motionInfo.lineAnim).toContain('smCrab39Line');
      expect(motionInfo.subDisplay === 'none').toBe(!vp.subVisible);
      expect(staticInfo.tileAnim).toBe('none');

      await ctxMotion.close();
      await ctxStatic.close();
    }
  });

  test('جميع المواضع الأربعة تعمل على الجوال الصغير (320px و375px) وسطح المكتب دون أي تجاوز أفقي', async ({ browser }) => {
    for (const width of [320, 375, 1440]) {
      const ctx = await browser.newContext({
        viewport: { width, height: 844 },
        reducedMotion: 'no-preference',
      });
      const page = await ctx.newPage();
      await blockExternal(page);

      // 1) الشاشة الترحيبية السريعة (Welcome Splash)
      await page.goto('/?splash=1', { waitUntil: 'load' });
      const splash = page.getByTestId('welcome-splash');
      await expect(splash).toBeVisible();
      await expect(page.locator('[data-newt35-stage="splash"]')).toBeVisible();

      const splashOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(splashOverflow).toBeLessThanOrEqual(1);

      // زر التخطي يعمل فوراً ويحفظ الجلسة
      await page.getByTestId('welcome-splash-skip').click();
      await expect(splash).toBeHidden({ timeout: 3000 });
      const savedKey = await page.evaluate(() => sessionStorage.getItem('sm_welcome_intro_v1'));
      expect(savedKey).toBe('1');

      // 2) نموذج التلفاز في الهيرو: بدون طبقة أجواء brave-newt-35، مع بقاء الشعار فقط داخل التلفاز
      await expect(page.locator('[data-newt35-tv-ambient]')).toHaveCount(0);
      await expect(page.locator('.hero-tv-wordmark .sm-tv-crab-mini')).toBeVisible();

      // 3) شاشة عرض المشغّل الذكي (#xtream)
      const playerBanner = page.locator('#xtream [data-newt35-stage="player-banner"]');
      await playerBanner.scrollIntoViewIfNeeded();
      await expect(playerBanner).toBeVisible();
      const playerBox = await playerBanner.boundingBox();
      expect(playerBox).not.toBeNull();
      expect(playerBox!.width).toBeLessThanOrEqual(width);
      expect(playerBox!.x).toBeGreaterThanOrEqual(0);

      // 4) بطاقة الدعوة الختامية الداكنة قبل الفوتر
      const ctaStage = page.locator('[data-newt35-stage="cta"]');
      await ctaStage.scrollIntoViewIfNeeded();
      await expect(ctaStage).toBeVisible();
      const ctaBox = await ctaStage.boundingBox();
      expect(ctaBox).not.toBeNull();
      expect(ctaBox!.width).toBeLessThanOrEqual(width);

      // التحقق من عدم وجود أي تمرير أفقي على الشاشة الصغيرة
      const pageOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(pageOverflow).toBeLessThanOrEqual(1);

      await ctx.close();
    }
  });
});
