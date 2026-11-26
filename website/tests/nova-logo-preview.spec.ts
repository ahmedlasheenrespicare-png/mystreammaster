import { test, expect } from '@playwright/test';

for (const size of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`عرض مجسم نوفا والتفاعل معه ${size.width}`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto('http://127.0.0.1:5174/nova-logo-preview/model.html');
    const viewer = page.locator('#viewer');
    await expect(viewer).toHaveAttribute('data-ready', 'true', { timeout: 30000 });
    await expect(viewer.locator('canvas')).toBeVisible();
    const box = await viewer.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.down(); await page.mouse.move(box!.x + box!.width / 2 + 80, box!.y + box!.height / 2, { steps: 8 }); await page.mouse.up();
    await page.getByRole('button', { name: 'إعادة المجسّم إلى الوضع الأول' }).click();
    await expect(viewer.locator('canvas')).toBeVisible();
  });
}

test('يعرض الشعار الأصلي عند تعذر WebGL', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    // Emulate WebGL being unavailable while allowing the 2D image canvas.
    HTMLCanvasElement.prototype.getContext = function(type: string, ...args: any[]) {
      if (type === 'webgl2' || type === 'webgl' || type === 'experimental-webgl') return null;
      return (original as any).call(this, type, ...args);
    } as typeof HTMLCanvasElement.prototype.getContext;
  });
  await page.goto('http://127.0.0.1:5174/nova-logo-preview/model.html');
  await expect(page.locator('#viewer')).toHaveAttribute('data-ready', 'fallback');
  await expect(page.getByAltText('شعار نوفا')).toBeVisible();
});

test('التحكم بالدوران والتقريب مع تقليل الحركة', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://127.0.0.1:5174/nova-logo-preview/model.html');
  await expect(page.locator('#viewer')).toHaveAttribute('data-ready', 'true');
  const spin = page.locator('#spin');
  await expect(spin).toHaveAttribute('aria-pressed', 'false');
  await spin.click();
  await expect(spin).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'تكبير المجسّم' }).click();
  await page.getByRole('button', { name: 'تصغير المجسّم' }).click();
  await page.getByRole('button', { name: 'تدوير لليسار' }).click();
  await expect(spin).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('يتأخر تحميل المجسّم حتى الاقتراب منه', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 100 });
  await page.goto('http://127.0.0.1:5174/nova-logo-preview/model.html');
  const viewer = page.locator('#viewer');
  await expect(viewer).not.toHaveAttribute('data-ready', 'true');
  await viewer.scrollIntoViewIfNeeded();
  await expect(viewer).toHaveAttribute('data-ready', 'true', { timeout: 30000 });
});

test('الدخول والدوران التلقائي يعملان عند السماح بالحركة', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('http://127.0.0.1:5174/nova-logo-preview/model.html');
  await expect(page.locator('#viewer')).toHaveAttribute('data-ready', 'true');
  await expect(page.locator('#spin')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#spin').click();
  await expect(page.locator('#spin')).toHaveAttribute('aria-pressed', 'false');
});

test('تنزل النقطتان بالتتابع وتستقران، وتظهران فورًا مع تقليل الحركة', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('http://127.0.0.1:5174/nova-logo-preview/model.html');
  const viewer = page.locator('#viewer');
  await expect(viewer).toHaveAttribute('data-entrance', 'first');
  await expect(viewer).toHaveAttribute('data-entrance', 'complete');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await expect(viewer).toHaveAttribute('data-entrance', 'complete');
});

test('اختيار مجسّم سيرفر X والتبديل إلى نوفا', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://127.0.0.1:5174/nova-logo-preview/model.html');
  await page.getByRole('link', { name: 'سيرفر X' }).click();
  await expect(page.locator('#viewer')).toHaveAttribute('data-ready', 'true', { timeout: 30000 });
  await expect(page.getByRole('heading', { name: /سيرفر X/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'سيرفر X' })).toHaveAttribute('aria-current', 'page');
  await page.getByRole('button', { name: 'تدوير لليمين' }).click();
  await page.getByRole('button', { name: 'تكبير المجسّم' }).click();
  await page.getByRole('link', { name: 'نوفا', exact: true }).click();
  await expect(page.locator('#viewer')).toHaveAttribute('data-ready', 'true', { timeout: 30000 });
  await expect(page.getByRole('link', { name: 'نوفا', exact: true })).toHaveAttribute('aria-current', 'page');
});

test('دخول شعار X وتجميع أجزائه مع احترام تقليل الحركة', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('http://127.0.0.1:5174/nova-logo-preview/model.html?logo=x');
  const viewer = page.locator('#viewer');
  await expect(viewer).toHaveAttribute('data-ready', 'true');
  await expect(viewer).toHaveAttribute('data-entrance', 'complete', { timeout: 15000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await expect(viewer).toHaveAttribute('data-entrance', 'complete');
});

for (const width of [1440, 390]) {
  test(`المجسّمان معًا والتحكم المستقل وإعادة العرض ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('http://127.0.0.1:5174/nova-logo-preview/');
    const nova = page.frameLocator('#nova-frame');
    const x = page.frameLocator('#x-frame');
    await expect(nova.locator('#viewer')).toHaveAttribute('data-ready', 'true', { timeout: 30000 });
    await page.locator('#x-frame').scrollIntoViewIfNeeded();
    await expect(x.locator('#viewer')).toHaveAttribute('data-ready', 'true', { timeout: 30000 });
    await x.getByRole('button', { name: 'تدوير لليمين' }).click();
    await nova.getByRole('button', { name: 'تكبير المجسّم' }).click();
    await page.getByRole('button', { name: 'إعادة عرض المجسّمين' }).click();
    await expect(nova.locator('#viewer')).toHaveAttribute('data-ready', 'true', { timeout: 30000 });
    await page.locator('#x-frame').scrollIntoViewIfNeeded();
    await expect(x.locator('#viewer')).toHaveAttribute('data-ready', 'true', { timeout: 30000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
