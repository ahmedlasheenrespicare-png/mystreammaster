import { test, expect, type Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';

/* ==========================================================================
   اختبارات قسم «مشغّل اشتراكك الشخصي» (#xtream).
   كل اتصال خارجي محاكى محلياً أو مقطوع deliberately — لا نتصل بأي سيرفر حقيقي،
   فالاختبارات تتحقق من واجهة القسم ومنطق القوائم ولا تثبت صلاحية أي بث.
   ========================================================================== */

/* Service Worker الموقع يعترض fetch خارج نطاق page.route — نمنعه هنا حتى تبقى
   كل المحاكاة مرئية للاختبار (وإلا مرّت طلبات السيرفر المحاكى بلا اعتراض) */
test.use({ serviceWorkers: 'block' });

const MOCK_HOST = 'mock-xtream.test';
const PASSWORD = 'pass1';

/* بيانات اشتراك محاكاة: 400 قناة + تصنيفان */
function buildStreams() {
  const list: { stream_id: number; name: string; stream_icon: string; category_id: string }[] = [
    { stream_id: 1, name: 'قناة الجزيرة الإخبارية', stream_icon: '', category_id: '1' },
    { stream_id: 2, name: 'MBC Masr 1', stream_icon: '', category_id: '2' },
  ];
  for (let i = 3; i <= 400; i++) {
    list.push({
      stream_id: i,
      name: `قناة رقم ${i}`,
      stream_icon: '',
      category_id: i % 2 === 0 ? '1' : '2',
    });
  }
  return list;
}

/* مسار واحد: يوافق على المحاكاة المحلية ويقطع كل ما عداها (لا شبكة خارجية) */
async function mockNetwork(page: Page) {
  const streams = buildStreams();
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') return route.continue();
    if (url.hostname !== MOCK_HOST) return route.abort();

    const action = url.searchParams.get('action');
    const json = (body: unknown) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

    if (url.pathname.endsWith('/player_api.php')) {
      if (!url.searchParams.get('action')) {
        return json({
          user_info: {
            auth: 1,
            status: 'Active',
            exp_date: String(Math.floor(Date.now() / 1000) + 5 * 86400),
            max_connections: '2',
            active_cons: '1',
            is_trial: '0',
          },
        });
      }
      if (action === 'get_live_categories') {
        return json([
          { category_id: '1', category_name: 'أخبارية' },
          { category_id: '2', category_name: 'رياضية' },
        ]);
      }
      if (action === 'get_live_streams') return json(streams);
      return json([]);
    }

    /* أي طلب بث (m3u8/ts) يفشل — لا نشغّل وسائط في الاختبار */
    return route.abort();
  });
}

/* الصفحة مرسومة مسبقاً (SSR): قبل انتهاء hydration لا تُربط معالجات React،
   فننتظر وصول مفاتيح React الداخلية إلى القسم حتى لا يضيع نقر الاختبار */
async function waitForHydration(page: Page) {
  await page.waitForFunction(() => {
    const el = document.querySelector('#xtream');
    if (!el) return false;
    return Object.keys(el).some(
      (key) => key.startsWith('__reactFiber$') || key.startsWith('__reactProps$')
    );
  });
}

async function login(page: Page) {
  const section = page.locator('#xtream');
  await section.getByRole('textbox').first().fill(MOCK_HOST);
  await section.locator('input[type="text"]').nth(1).fill('user1');
  await section.locator('input[type="password"]').fill(PASSWORD);
  await section.getByTestId('login-submit').click();
  /* الدخول يمر بجولات شبكة ثم جلب القنوات — مهلة أوسع من الافتراضية */
  await expect(section.getByTestId('connection-badge')).toBeVisible({ timeout: 20000 });
}

test.beforeEach(async ({ page }) => {
  await mockNetwork(page);
  await page.goto('/#xtream');
  await waitForHydration(page);
});

test('نموذج الدخول يظهر أولاً ولا يطلب أي اتصال خارجي', async ({ page }) => {
  const section = page.locator('#xtream');
  await expect(section.getByRole('heading', { name: 'تسجيل دخول المشتركين' })).toBeVisible();
  /* ثلاثة حقول ظاهرة: السيرفر + المستخدم + كلمة السر (وحقل ملف مخفي) */
  await expect(section.locator('input[type="text"], input[type="password"]')).toHaveCount(3);
  await expect(section.locator('input[type="file"]')).toHaveCount(1);
  await expect(section.getByRole('button', { name: 'نزّل ملف قنواتك' })).toBeDisabled();
  await expect(section.getByTestId('account-chips')).toHaveCount(0);
});

test('فشل الاتصال يعرض سبباً وتقرير تشخيص بلا كلمة سر', async ({ page }) => {
  const section = page.locator('#xtream');
  /* سيرفر غير محاكى: كل محاولاته تُقطع → رسالة CORS + تقرير تشخيص */
  await section.locator('input[type="text"]').first().fill('blocked-xtream.test');
  await section.locator('input[type="text"]').nth(1).fill('user1');
  await section.locator('input[type="password"]').fill('secret-pass');
  await section.getByTestId('login-submit').click();

  const error = section.getByTestId('login-error');
  await expect(error).toBeVisible({ timeout: 15000 });
  await expect(error).toContainText('CORS');

  /* التقرير مطوي — نفتحه للتحقق من محتواه وأزرار المشاركة */
  await section.getByTestId('diag-summary').click();
  await expect(section.getByTestId('diag-box')).toHaveAttribute('open', '');

  /* رمز المشاركة ومحتوى الرسالة لا يحملان كلمة السر */
  const wa = section.getByTestId('send-diag-whatsapp');
  await expect(wa).toBeVisible();
  await expect(wa).toHaveAttribute('href', /wa\.me/);
  const href = await wa.getAttribute('href');
  expect(href).not.toContain('secret-pass');
  await expect(section.getByText(/لا يحتويان كلمة السر/)).toBeVisible();
});

test('دخول ناجح: 400 قناة بقائمة افتراضية وبحث عربي شامل', async ({ page }) => {
  const section = page.locator('#xtream');
  await login(page);

  await expect(section.getByText('400 قناة معروضة')).toBeVisible();
  await expect(section.getByText('ينتهي:')).toBeVisible();

  /* القائمة افتراضية: رشّح قليل من الصفوف فقط لـ400 قناة */
  const rendered = await section.getByTestId('channel-row').count();
  expect(rendered).toBeGreaterThan(3);
  expect(rendered).toBeLessThan(60);

  /* التمرير لأسفل يعرض قنوات نهاية القائمة (لا سقف 300) */
  await section.getByTestId('channel-list').evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await expect(section.getByTestId('channel-row').last()).toContainText('قناة رقم 400');

  /* البحث يعمل بالشكل البديل: «الجزيره» تجد «الجزيرة» */
  const search = section.getByPlaceholder('ابحث في كل القنوات…');
  await search.fill('الجزيره');
  await expect(section.getByTestId('channel-row')).toHaveCount(1);
  await expect(section.getByTestId('channel-row')).toContainText('قناة الجزيرة الإخبارية');

  /* البحث يعمل على كل التصنيفات لا داخل التصنيف المختار فقط */
  await search.fill('');
  await section.getByRole('button', { name: 'رياضية', exact: true }).click();
  await search.fill('mbc');
  await expect(section.getByTestId('channel-row')).toContainText('MBC Masr 1');
});

test('المفضلة وسجل المشاهدة يُحفظان لكل حساب ويبقيان بعد إعادة التحميل', async ({ page }) => {
  const section = page.locator('#xtream');
  await login(page);

  /* إضافة أول قناة إلى المفضلة */
  await section.getByTestId('favorite-toggle').first().click();
  await expect(section.getByTestId('tab-favorites')).toContainText('(1)');

  /* تشغيل قناة يضيفها لسجل «الأخيرة» */
  await section.getByTestId('channel-row').first().click();
  await expect(section.getByTestId('tab-recent')).toContainText('(1)');
  await section.getByTestId('tab-recent').click();
  await expect(section.getByTestId('channel-row')).toHaveCount(1);

  /* إعادة التحميل: الدخول التلقائي يعيد القائمة والمفضلة من التخزين المحلي */
  await page.reload();
  await waitForHydration(page);
  await expect(section.getByTestId('connection-badge')).toBeVisible({ timeout: 20000 });
  await expect(section.getByTestId('tab-favorites')).toContainText('(1)');
  await section.getByRole('tab', { name: /المفضلة \(1\)/ }).click();
  await expect(section.getByTestId('channel-row')).toHaveCount(1);
});

test('ملف القنوات M3U يُحمّل بالسحب والإفلات ويظهر بملف مستقل', async ({ page }) => {
  const section = page.locator('#xtream');
  await section
    .locator('input[type="file"]')
    .first()
    .setInputFiles(fileURLToPath(new URL('./fixtures/sample-playlist.m3u', import.meta.url)));

  await expect(section.getByTestId('connection-badge')).toContainText('sample-playlist.m3u');
  await expect(section.getByText('3 قناة معروضة')).toBeVisible();
  await expect(section.getByTestId('channel-row')).toHaveCount(3);
  /* ملف جديد = ملف مفضلة جديد لا يختلط بحساب آخر */
  await expect(section.getByTestId('tab-favorites')).toContainText('(0)');

  await section.getByPlaceholder('ابحث في كل القنوات…').fill('bbc');
  await expect(section.getByTestId('channel-row')).toHaveCount(1);
  await expect(section.getByTestId('channel-row')).toContainText('BBC Arabic');
});

test('إدارة الحسابات: الشرائح وتبديل الحساب وإضافة حساب آخر', async ({ page }) => {
  const section = page.locator('#xtream');
  await login(page);

  const chips = section.getByTestId('account-chips');
  await expect(chips).toBeVisible();
  await expect(chips.getByRole('button', { name: `تبديل إلى ${MOCK_HOST}` })).toBeVisible();

  await section.getByTestId('add-account').click();
  await expect(section.getByRole('heading', { name: 'تسجيل دخول المشتركين' })).toBeVisible();
  /* شرائح الحسابات تبقى متاحة للعودة السريعة */
  await expect(chips.getByRole('button', { name: `تبديل إلى ${MOCK_HOST}` })).toBeVisible();
  await chips.getByRole('button', { name: `تبديل إلى ${MOCK_HOST}` }).click();
  await expect(section.getByTestId('connection-badge')).toBeVisible({ timeout: 20000 });
});
