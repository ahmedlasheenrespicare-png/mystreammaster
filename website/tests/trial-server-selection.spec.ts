import { test, expect } from '@playwright/test';

test('each plan opens the trial form with its own server selected', async ({ page }) => {
  for (const [route, value] of [
    ['nova', 'سيرفر نوفا (Nova Server)'],
    ['istar', 'سيرفر إيستار (iStar Pro) — المتوازن للأجهزة الذكية'],
    ['moka', 'سيرفر موكا (Moka) — الاقتصادي للنت الضعيف'],
    ['x', 'سيرفر X (XTV Server)'],
  ]) {
    await page.goto(`/${route}/`);
    await page.getByRole('button', { name: 'طلب كود تجريبي', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'طلب تجربة مجانية' });
    await expect(dialog.locator('#trial-server')).toHaveValue(value);
    await expect(dialog.locator('#trial-server option')).toHaveCount(4);
    await dialog.getByRole('button', { name: 'إغلاق نافذة التجربة' }).click();
  }
});
