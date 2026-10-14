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

/* الاختبارات هنا تشمل انتظار hydration وجولات دخول كاملة (وبعضها إعادة تحميل
   كاملة لجلب 400 قناة) — مهلة أوسع من 30 ثانية الافتراضية لأن عدّاءات CI أبطأ */
test.describe.configure({ timeout: 90000 });

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

      /* دليل البرامج EPG — يُطلب عند تشغيل قناة مباشرة */
      if (action === 'get_short_epg') {
        const now = Math.floor(Date.now() / 1000);
        const b64 = (t: string) => Buffer.from(t, 'utf8').toString('base64');
        return json({
          epg_listings: [
            {
              title: { base64: b64('استوديو التحليل') },
              description: { base64: b64('ملخص المباريات') },
              start_timestamp: String(now - 600),
              stop_timestamp: String(now + 3000),
            },
            {
              title: { base64: b64('الفيلم التالي') },
              description: { base64: '' },
              start_timestamp: String(now + 3000),
              stop_timestamp: String(now + 6600),
            },
          ],
        });
      }

      /* مكتبة الأفلام (VOD) */
      if (action === 'get_vod_categories') return json([{ category_id: 'v1', category_name: 'أكشن' }]);
      if (action === 'get_vod_streams') {
        return json([
          { stream_id: 901, name: 'فيلم الاختبار', stream_icon: '', category_id: 'v1', rating: '8.2', container_extension: 'mp4' },
          { stream_id: 902, name: 'فيلم آخر', stream_icon: '', category_id: 'v1', container_extension: 'mkv' },
        ]);
      }
      if (action === 'get_vod_info') {
        return json({
          movie_data: { stream_id: 901, name: 'فيلم الاختبار', container_extension: 'mp4' },
          info: {
            movie_image: '',
            plot: 'قصة الفيلم للمراجعة',
            rating: '8.2',
            cast: 'ممثل تجريبي',
            genre: 'أكشن',
            duration: '01:30:00',
            releasedate: '2024-01-01',
          },
        });
      }

      /* مكتبة المسلسلات */
      if (action === 'get_series_categories') return json([{ category_id: 's1', category_name: 'دراما' }]);
      if (action === 'get_series') {
        return json([{ series_id: 501, name: 'مسلسل الاختبار', cover: '', category_id: 's1' }]);
      }
      if (action === 'get_series_info') {
        return json({
          info: { name: 'مسلسل الاختبار', cover: '', plot: 'قصة المسلسل', rating: '7.5' },
          seasons: [{ season_number: 1, name: 'الموسم 1' }],
          episodes: {
            '1': [
              { id: 7001, episode_num: 1, title: 'الحلقة الأولى', container_extension: 'mp4', info: { duration: '40:00' } },
            ],
          },
        });
      }

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

test('السقوط التلقائي إلى Worker وبروكسي البث المباشر (/proxy.php) عند فشل الاتصال المباشر', async ({ page }) => {
  const streams = buildStreams();
  await page.unroute('**/*');
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    /* نسمح بملفات الصفحة المحلية لكن نعترض /proxy.php لمحاكاة استجابة بروكسي البث المباشر */
    if ((url.hostname === '127.0.0.1' || url.hostname === 'localhost') && url.pathname !== '/proxy.php') {
      return route.continue();
    }
    /* نحجب الاتصال المباشر والـWorker لإجبار المشغل على استخدام /proxy.php?url= */
    if (url.pathname !== '/proxy.php') {
      return route.abort();
    }

    const targetRaw = url.searchParams.get('url') || '';
    let target: URL;
    try {
      target = new URL(targetRaw);
    } catch {
      return route.abort();
    }
    if (target.hostname !== MOCK_HOST) return route.abort();

    const action = target.searchParams.get('action');
    const json = (body: unknown) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

    if (target.pathname.endsWith('/player_api.php')) {
      if (!action) {
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
    }
    return route.abort();
  });

  const section = page.locator('#xtream');
  await section.getByRole('textbox').first().fill(MOCK_HOST);
  await section.locator('input[type="text"]').nth(1).fill('ahmed1234');
  await section.locator('input[type="password"]').fill(PASSWORD);
  await section.getByTestId('login-submit').click();

  await expect(section.getByTestId('connection-badge')).toContainText('متصل — بروكسي HTTPS', {
    timeout: 20000,
  });
  await expect(section.getByText('400 قناة معروضة')).toBeVisible();
});


test('دليل البرامج EPG وتبويبا الأفلام والمسلسلات مع بطاقات التفاصيل', async ({ page }) => {
  const section = page.locator('#xtream');
  await login(page);

  /* تشغيل قناة مباشرة يجلب get_short_epg — شريط «يعرض الآن / التالي» مع تقدّم */
  await section.getByTestId('channel-row').first().click();
  const epgBar = section.getByTestId('epg-bar');
  await expect(epgBar).toBeVisible({ timeout: 15000 });
  await expect(epgBar).toContainText('يعرض الآن: استوديو التحليل');
  await expect(epgBar).toContainText('التالي: الفيلم التالي');

  /* تبويب الأفلام: القائمة → بطاقة التفاصيل (القصة + التقييم) → زر التشغيل */
  await section.getByTestId('libtab-vod').click();
  await expect(section.getByTestId('media-card')).toHaveCount(2, { timeout: 20000 });
  await section.getByTestId('media-card').first().click();
  const dialog = page.getByTestId('vod-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('قصة الفيلم للمراجعة');
  await expect(dialog).toContainText('8.2');
  await expect(dialog).toContainText('ممثل تجريبي');
  await expect(dialog.getByTestId('vod-play')).toBeVisible();
  await dialog.getByTestId('dialog-close').click();
  await expect(dialog).toHaveCount(0);

  /* تبويب المسلسلات: المواسم والحلقات */
  await section.getByTestId('libtab-series').click();
  await expect(section.getByTestId('media-card')).toHaveCount(1, { timeout: 20000 });
  await section.getByTestId('media-card').first().click();
  const sDialog = page.getByTestId('series-dialog');
  await expect(sDialog).toBeVisible();
  await expect(sDialog.getByTestId('season-1')).toBeVisible();
  await expect(sDialog.getByTestId('episode-row')).toHaveCount(1);
  await expect(sDialog).toContainText('الحلقة الأولى');
});

test('عدة الشاشات (2 أو 4) ودرج القنوات داخل الفيديو', async ({ page }) => {
  const section = page.locator('#xtream');
  await login(page);

  /* شاشتان في وقت واحد */
  await section.getByTestId('view-2').click();
  await expect(section.getByTestId('stage-cell')).toHaveCount(2);

  /* زر داخل الفيديو يفتح درج القنوات (يعمل داخل ملء الشاشة) */
  await section.getByTestId('channel-row').first().click();
  await section.getByTestId('drawer-button').click();
  const drawer = section.getByTestId('channel-drawer');
  await expect(drawer).toBeVisible();
  await expect(drawer.getByTestId('drawer-row').first()).toBeVisible();
  await expect(drawer.getByTestId('drawer-row')).toHaveCount(400);
  await drawer.getByTestId('drawer-row').nth(1).click();
  await expect(drawer).toHaveCount(0);

  /* أربع شاشات ثم العودة لشاشة واحدة */
  await section.getByTestId('view-4').click();
  await expect(section.getByTestId('stage-cell')).toHaveCount(4);
  await section.getByTestId('view-1').click();
  await expect(section.getByTestId('stage-cell')).toHaveCount(1);

  /* مفتاح F يفتح/يغلق ملء الشاشة بلا كسر بقية الصفحة */
  await section.getByTestId('fullscreen-button').click();
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
});

/* ==========================================================================
   بصمة المشغّل — User-Agent الخاص بـ IPTV Smarters / VLC
   --------------------------------------------------------------------------
   المتصفح لا يسمح لأي صفحة بتغيير User-Agent، لذلك يطلب المشغّل البصمة من
   الوسيط بمعامل ?smpua=smarters. نفحص هنا سلّم المحاولات الحقيقي في الصفحة:
   السيرفر (المحاكى) يرفض كل طلب بلا بصمة → يجب أن يجرّب المشغّل نفس المسار
   بالبصمة، وأن يعلن نجاحها في الواجهة.
========================================================================== */
const SMARTERS_UA = 'iptv_smarters_player_lite/1.4.2 VLC/3.1.2 LibVLC/3.1.2';

test('المشغّل يجرّب بصمة Smarters/VLC عبر الوسيط حين يرفض السيرفر المتصفح', async ({ page }) => {
  const seen: string[] = [];
  /* طلب بث: الرابط نفسه أو الهدف المُرمَّز داخل ?url= (وسيط /proxy.php) */
  const isMedia = (u: URL) => {
    const target = u.searchParams.get('url') || u.searchParams.get('u') || u.pathname;
    return /\.(m3u8|m3u|ts|m4s|mp4)(\?|$)/i.test(target);
  };

  /* القائمة التي يرد بها البروكسي عند طلب البصمة — مقطع واحد يمر عبر البروكسي */
  const manifest = [
    '#EXTM3U',
    '#EXT-X-VERSION:3',
    '#EXT-X-TARGETDURATION:6',
    '#EXT-X-MEDIA-SEQUENCE:0',
    '#EXTINF:6.0,',
    '/proxy.php?url=' +
      encodeURIComponent(`https://${MOCK_HOST}/live/user1/${PASSWORD}/seg0.ts`) +
      '&smpua=smarters',
    '',
  ].join('\n');

  /* المسجَّل لاحقاً يُفحص أولاً: نعترض طلبات البث فقط ونُعيد الباقي لمحاكاة الدخول */
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    const local = url.hostname === '127.0.0.1' || url.hostname === 'localhost';

    if (local && url.pathname === '/proxy.php' && isMedia(url)) {
      seen.push(url.toString());
      const target = url.searchParams.get('url') || '';
      /* بلا بصمة = السيرفر يحجب المتصفح (403) — كما تفعل لوحات Xtream كثيرة */
      if (url.searchParams.get('smpua') !== 'smarters') {
        return route.fulfill({ status: 403, body: 'user-agent not allowed' });
      }
      if (/\.ts(\?|$)/i.test(target)) return route.abort();
      return route.fulfill({
        status: 200,
        contentType: 'application/vnd.apple.mpegurl',
        body: manifest,
      });
    }

    /* الاتصال المباشر والوسيط الخارجي محجوبان في هذا الاختبار */
    if (!local && isMedia(url)) {
      seen.push(url.toString());
      return route.abort();
    }

    return route.fallback();
  });

  const section = page.locator('#xtream');
  await login(page);
  await section.getByTestId('channel-row').first().click();

  /* ① المشغّل جرّب نفس مسار البروكسي ببصمة Smarters/VLC */
  await expect
    .poll(() => seen.filter((u) => u.includes('/proxy.php') && u.includes('smpua=smarters')).length, {
      timeout: 60000,
      message: 'يجب أن يجرّب المشغّل بصمة IPTV Smarters/VLC عبر /proxy.php',
    })
    .toBeGreaterThan(0);

  /* ② البصمة تُجرَّب بعد المسار العادي (لا تلغيه) */
  const proxied = seen.filter((u) => u.includes('/proxy.php'));
  const plainIdx = proxied.findIndex((u) => !u.includes('smpua='));
  const uaIdx = proxied.findIndex((u) => u.includes('smpua=smarters'));
  expect(plainIdx).toBeGreaterThanOrEqual(0);
  expect(uaIdx).toBeGreaterThan(plainIdx);

  /* ③ الاتصال المباشر بالسيرفر لا يحمل البصمة — المتصفح لا يستطيع إرسالها،
     فالبصمة تظهر فقط في طلبات الوسيط (/proxy.php أو Worker) */
  const direct = seen.filter((u) => new URL(u).hostname === MOCK_HOST);
  expect(direct.length).toBeGreaterThan(0);
  expect(direct.every((u) => !u.includes('smpua='))).toBe(true);

  /* ④ الواجهة تعلن أن البث يعمل ببصمة المشغّل (مع القيمة الحرفية في title) */
  const badge = section.getByTestId('ua-badge');
  await expect(badge).toBeVisible({ timeout: 30000 });
  await expect(badge).toHaveAttribute('title', SMARTERS_UA);
});
