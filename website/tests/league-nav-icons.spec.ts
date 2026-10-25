import { test, expect, type Locator } from '@playwright/test';
import { NAV_GROUPS } from '../src/navigation.mjs';
import { LEAGUE_ICONS } from '../src/lib/league-icons.mjs';

/* أيقونات البطولات في القوائم المنسدلة — الشعار داخل صندوق 32×32 بدل الإيموجي.
   الشعارات من مخزن ESPN (مضيف محجوب في بيئة الاختبار، فالصور تُطلب وتفشل بلا أثر
   مرئي). بطولة بلا شعار موثّق يبقى صندوقها فارغاً بلا أيقونة بديلة. */

const matchesGroup = NAV_GROUPS.find(g => g.key === 'matches')!;
const leagueLinks = matchesGroup.links.filter(l => l.league);
/* المنتخبات الثمانية وحدها — صفحة «كأس العالم 2026» نفسها ليست منتخباً */
const teamLinks = matchesGroup.links.filter(l => /^world-cup-2026\/[^/]+\/$/.test(l.href));

test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    return ['127.0.0.1', 'localhost'].includes(url.hostname) ? route.continue() : route.abort();
  });
});

test('navigation data: exactly the eight league entries carry a league id, national teams do not', () => {
  expect(leagueLinks.map(l => l.league)).toEqual([
    'uefa.champions', 'eng.1', 'fra.1', 'esp.1', 'ger.1', 'ita.1', 'sau.1', 'egy.1',
  ]);
  for (const link of teamLinks) expect(link.league, link.href).toBeUndefined();
  /* كل معرّف يملك شعاراً موثّقاً إلا الدوري المصري — بلا شعار موثّق فيبقى صندوقه فارغاً */
  for (const link of leagueLinks) {
    if (link.league === 'egy.1') expect(Object.keys(LEAGUE_ICONS)).not.toContain('egy.1');
    else expect(Object.keys(LEAGUE_ICONS), link.league).toContain(link.league);
  }
});

test('desktop «المباريات» dropdown: each league shows its logo in a 32×32 box, Egypt shows an empty box', async ({ page }) => {
  await page.goto('/');
  const nav = page.locator('header nav').first();
  await nav.getByRole('button', { name: 'المباريات', exact: true }).click();
  const panel = page.locator('#nav-panel-matches');
  await expect(panel).toBeVisible();

  for (const link of leagueLinks) {
    const row = panel.locator('a', { hasText: link.label });
    await expect(row, link.label).toHaveCount(1);
    const box = row.locator('span[aria-hidden="true"]').first();
    const size = await box.boundingBox();
    expect(size, link.label).toMatchObject({ width: 32, height: 32 });
    const img = box.locator('img');
    const src = LEAGUE_ICONS[link.league as keyof typeof LEAGUE_ICONS];
    if (src) {
      await expect(img, link.label).toHaveCount(1);
      await expect(img, link.label).toHaveAttribute('src', src);
      await expect(img, link.label).toHaveAttribute('alt', '');
      await expect(img, link.label).toHaveAttribute('loading', 'lazy');
      await expect(box.locator('svg'), link.label).toHaveCount(0);
    } else {
      /* بلا شعار موثّق: صندوق فارغ بلا img ولا أيقونة بديلة */
      await expect(img, link.label).toHaveCount(0);
      await expect(box.locator('svg'), link.label).toHaveCount(0);
    }
  }
});

test('desktop «المباريات» dropdown: national team rows keep their emoji and have no images', async ({ page }) => {
  await page.goto('/');
  await page.locator('header nav').first().getByRole('button', { name: 'المباريات', exact: true }).click();
  const panel = page.locator('#nav-panel-matches');
  for (const link of teamLinks) {
    const row = panel.locator('a', { hasText: link.label });
    await expect(row, link.label).toHaveCount(1);
    await expect(row.locator('img'), link.label).toHaveCount(0);
    await expect(row.locator('span[aria-hidden="true"]').first(), link.label).toHaveText(link.icon!);
  }
});

test('desktop «المباريات» dropdown: logos are not requested until the panel opens', async ({ page }) => {
  const logoRequests: string[] = [];
  page.on('request', request => {
    if (request.url().startsWith('https://a.espncdn.com/i/leaguelogos/')) logoRequests.push(request.url());
  });
  await page.goto('/');
  /* networkidle قد لا يتحقّق أبداً لأن الصفحة تستقصي المصادر دورياً؛
     ننتظر انتهاء التحميل الفعلي بحدّ زمني ثم نتحقق من الشرط نفسه:
     لا شعار بطولة قبل فتح القائمة. */
  await page.waitForFunction(() => document.readyState === 'complete');
  await page.waitForTimeout(1500);
  expect(logoRequests, 'قبل فتح القائمة').toEqual([]);
  await page.locator('header nav').first().getByRole('button', { name: 'المباريات', exact: true }).click();
  await expect(page.locator('#nav-panel-matches')).toBeVisible();
  await expect.poll(() => new Set(logoRequests).size).toBe(7);
});

/* الهيدر القديم (legacy-shell.mjs) — نفس المصدر ونفس الصندوق، بلا أيقونة بديلة */
async function expectLegacyLeagueIcons(scope: Locator, count: number) {
  await expect(scope.locator('.sm-dd-league')).toHaveCount(count);
  /* سبع بطولات لها شعار، والدوري المصري بصندوق فارغ بلا صورة ولا svg */
  await expect(scope.locator('.sm-dd-league img')).toHaveCount(count - 1);
  await expect(scope.locator('.sm-dd-league svg')).toHaveCount(0);
  for (const img of await scope.locator('.sm-dd-league img').all()) {
    await expect(img).toHaveAttribute('alt', '');
    expect(Object.values(LEAGUE_ICONS)).toContain(await img.getAttribute('src'));
  }
}

test('legacy desktop header: league rows carry logos in .sm-dd-icon boxes; Egypt shows an empty box', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/about/');
  await page.locator('#sm-dd-btn-matches').click();
  const panel = page.locator('#sm-dd-matches');
  await expect(panel).toBeVisible();
  await expectLegacyLeagueIcons(panel, leagueLinks.length);
  /* روابط المنتخبات تبقى إيموجي بلا صور */
  const teamIcons = panel.locator('.sm-dd-grid-4 .sm-dd-icon');
  await expect(teamIcons).toHaveCount(teamLinks.length);
  await expect(panel.locator('.sm-dd-grid-4 img')).toHaveCount(0);
  for (const icon of await teamIcons.all()) await expect(icon).not.toHaveClass(/sm-dd-league/);
});

test('legacy mobile menu: league rows carry the same logos as desktop', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/about/');
  await page.locator('.sm-menu-toggle').click();
  const menu = page.locator('#sm-mobile-nav');
  await menu.locator('details[data-group="matches"] summary').click();
  const rows = menu.locator('details[data-group="matches"] a.sm-m-row');
  await expect(rows).toHaveCount(matchesGroup.links.length);
  await expectLegacyLeagueIcons(menu.locator('details[data-group="matches"]'), leagueLinks.length);
  /* الرابط نفسه يعمل كما كان */
  await menu.getByRole('link', { name: 'مباريات الدوري الإنجليزي' }).click();
  await expect.poll(() => decodeURI(page.url())).toContain('/matches/الدوري-الإنجليزي/');
});

test('React mobile menu: league rows show a logo box instead of the emoji', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  /* من الرئيسية: المجموعة المفتوحة تلقائياً هي مجموعة الصفحة الحالية، فنفتح «المباريات» بالنقر */
  await page.goto('/');
  await page.getByRole('button', { name: 'القائمة', exact: true }).click();
  const menu = page.locator('#storefront-mobile-nav');
  await menu.getByRole('button', { name: /^المباريات/ }).click();
  for (const link of leagueLinks) {
    const row = menu.locator('a', { hasText: link.label });
    await expect(row, link.label).toHaveCount(1);
    await expect(row.locator('span[aria-hidden="true"]').first().locator('img')).toHaveCount(LEAGUE_ICONS[link.league as keyof typeof LEAGUE_ICONS] ? 1 : 0);
    await expect(row.locator('span[aria-hidden="true"]').first().locator('svg'), link.label).toHaveCount(0);
  }
});

test('legacy header: logos are not requested on page load, only when the menu opens', async ({ page }) => {
  const logoRequests: string[] = [];
  page.on('request', request => {
    if (request.url().startsWith('https://a.espncdn.com/i/leaguelogos/')) logoRequests.push(request.url());
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/about/');
  await page.waitForLoadState('networkidle');
  expect(logoRequests, 'قبل فتح القائمة').toEqual([]);
  await page.locator('#sm-dd-btn-matches').click();
  await expect(page.locator('#sm-dd-matches')).toBeVisible();
  await expect.poll(() => new Set(logoRequests).size).toBe(7);
});
