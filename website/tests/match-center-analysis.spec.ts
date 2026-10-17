import { test, expect } from '@playwright/test';

/* ==========================================================================
   قسم «تحليل المباراة» ودفتر ملاحظات المحلل — اختبار الواجهة
   --------------------------------------------------------------------------
   كل رقم في هذا الملف مُدخلٌ للاختبار لا بيانات منشورة: يُحقن في
   `match-center.php` ثم يُقرأ كما يقرأه الزائر. الفحوص على ما لا يُغتفر إفساده:
   • التبويب لا يظهر بلا أحداث ولا أرقام، ولا يظهر صفٌّ فارغ بدل ذلك.
   • القيمة الناقصة تبقى كلمة، ولا تتحول صفرًا.
   • الفلاتر تُطابق أحداث المصدر، وتعمل باللمس ولوحة المفاتيح.
   • الملاحظة تُحفظ لمباراتها وحدها، وتعود بعد إعادة التحميل، وتُعدَّل وتحذف
     وتُصدَّر — بلا خدمة خلفية.
========================================================================== */

const MATCH = 'manchester-city-ipswich-town';
const EVENT_ID = '401879259';
const NOW = new Date('2026-10-17T15:20:00Z');
const HOME = 'مانشستر سيتي';
const AWAY = 'إيبسويتش تاون';

/* القراءة تهبط بعد الإماهة؛ على آلّة بمِنبطين قد يتأخر الطلب نفسه. */
test.beforeEach(() => {
  test.setTimeout(90_000);
});

const STATISTICS = [
  { key: 'possessionPct', label: 'الاستحواذ', unit: '%', home: 58, away: 42 },
  { key: 'passPct', label: 'دقة التمرير', unit: '%', home: 84, away: null },
  { key: 'totalShots', label: 'التسديدات', unit: '', home: 11, away: 7 },
  { key: 'shotsOnTarget', label: 'على المرمى', unit: '', home: 4, away: 2 },
  { key: 'blockedShots', label: 'تسديدات تم اعتراضها', unit: '', home: 3, away: 1 },
  { key: 'wonCorners', label: 'الركنيات', unit: '', home: 6, away: 3 },
  { key: 'foulsCommitted', label: 'الأخطاء', unit: '', home: 9, away: 14 },
  { key: 'offsides', label: 'التسلل', unit: '', home: 2, away: 1 },
  { key: 'saves', label: 'التصديات', unit: '', home: 3, away: 4 },
  { key: 'yellowCards', label: 'بطاقات صفراء', unit: '', home: 1, away: 3 },
  { key: 'redCards', label: 'بطاقات حمراء', unit: '', home: null, away: 0 },
];

const EVENTS = [
  { id: 'a1', type: 'Goal', minute: 12, extraMinute: null, period: { number: 1 }, side: 'home', team: { name: 'Manchester City', homeAway: 'home' }, player: { id: 'p1', name: 'Haaland' } },
  { id: 'a2', type: 'Yellow Card', minute: 31, extraMinute: null, period: { number: 1 }, side: 'away', team: { name: 'Ipswich Town', homeAway: 'away' }, player: { id: 'p2', name: 'Morsy' } },
  { id: 'a3', type: 'Goal', minute: 45, extraMinute: 2, period: { number: 1 }, side: 'home', team: { name: 'Manchester City', homeAway: 'home' }, player: { id: 'p1', name: 'Haaland' } },
  { id: 'a4', type: 'Start Delay', minute: 46, extraMinute: null, period: { number: 2 }, side: 'home', team: { name: 'Manchester City', homeAway: 'home' } },
  { id: 'a5', type: 'Substitution', minute: 60, extraMinute: null, period: { number: 2 }, side: 'away', team: { name: 'Ipswich Town', homeAway: 'away' }, player: { id: 'p3', name: 'Chaplin' }, assist: { id: 'p4', name: 'Szmodics' } },
  { id: 'a6', type: 'Goal', minute: 66, extraMinute: null, period: { number: 2 }, side: 'away', cancelled: true, team: { name: 'Ipswich Town', homeAway: 'away' }, player: { id: 'p5', name: 'Delph' } },
  { id: 'a7', type: 'Red Card', minute: 78, extraMinute: null, period: { number: 2 }, side: 'away', team: { name: 'Ipswich Town', homeAway: 'away' }, player: { id: 'p6', name: 'Tuanzebe' } },
  { id: 'a8', type: 'Injury timeout', minute: null, extraMinute: null, period: null, side: null, team: null, player: null, detail: 'Pitchside assessment' },
];

/** سبع أحداث قابلة للعرض: `a4` توقفُ مصدر ولا يصل عرضُه أصلاً. */
const RENDERABLE = 7;

function payload(overrides = {}) {
  return {
    provider: 'espn',
    match: MATCH,
    event: EVENT_ID,
    readAt: '2026-10-17T15:19:20Z',
    cache: 'HIT',
    status: { type: { name: 'STATUS_SECOND_HALF', state: 'in', completed: false }, displayClock: "78'" },
    score: { home: 2, away: 0 },
    events: EVENTS,
    statistics: STATISTICS,
    lineups: null,
    ratings: null,
    h2h: [],
    form: null,
    venue: 'Etihad Stadium',
    ...overrides,
  };
}

/* الحمولة تُعاد حتى تهبط القراءة المعترَض عليها: في بيئة الجري المُقيَّدة قد يسبق
   أولُ طلبٍ ارتباطَ الاعتراض فتصل 501 من خادم المعاينة. إعادة المحاولة هنا عن
/* ترتيب مقصود: ساعة الصفحة أولًا، ثم المسار، ثم التنقّل.
   • `page.clock.install()` يعيد ضبط حالة الصفحة، فمسارٌ مسجَّل على الصفحة قبله
     يضيع: الطلب يذهب إلى خادم المعاينة فيردّ 501، ويسقط الاختبار وواجهةٌ سليمة.
     المسار يُسجَّل على السياق لذلك — لا على الصفحة.
   • الانتظار على «domcontentloaded» ثم على علامةٍ من القراءة: طلبٌ خارجي معلَّق
     يؤخر «load»، والفحص قبل هبوط القراءة يحوّل «لم تصل القراءة» إلى «لا بيانات». */
async function openMatchCenter(page, options: { match?: string; overrides?: Record<string, unknown>; requireRead?: boolean } = {}) {
  const { match = MATCH, overrides = {}, requireRead = true } = options;
  await page.clock.install({ time: NOW });
  await page.context().unroute('**/match-center.php*').catch(() => null);
  await page.context().route('**/match-center.php*', route => route.fulfill({
    status: 200,
    headers: { 'X-Matches-Cache': 'HIT', 'X-Cache-Age': '4', 'Content-Type': 'application/json' },
    json: payload({ ...overrides, match }),
  }));
  await page.goto(`/matches/الدوري-الإنجليزي/${match}/`, { waitUntil: 'domcontentloaded' });
  // لا فحص قبل هبوط القراءة: بلا هذا يُقرأ «لم تصل القراءة» على أنه «لا بيانات لديك».
  // ومباراة بلا معرّف حدث في مصدرها لا تطلب قراءة أصلًا — فلا انتظار هناك.
  if (requireRead) await expect(page.locator('.mc-pitch-statusline')).toBeVisible({ timeout: 30_000 });
}

async function openTab(page, tabId: string) {
  await page.locator(`#mc-tab-${tabId}`).click();
  await expect(page.locator(`#mc-panel-${tabId}`)).toBeVisible();
}

/** لا تمرير أفقي ولا عنصر خارج الإطار عند عرض بعرض معلوم. */
async function expectNoOverflow(page, width: number, label: string) {
  const report = await page.evaluate(() => {
    const limit = document.documentElement.clientWidth;
    const outside: string[] = [];
    const scrollable: string[] = [];
    for (const node of document.querySelectorAll('.mc-page, .mc-container, .mc-panel, .mc-pitch-frame, .mc-pitch-events, .mc-analysis-filters, .mc-note-form')) {
      const el = node as HTMLElement;
      if (el.scrollWidth - el.clientWidth > 1) scrollable.push(el.className.toString());
      const box = el.getBoundingClientRect();
      if (box.right > limit + 1 || box.left < -1) outside.push(el.className.toString());
    }
    return { documentOverflow: document.documentElement.scrollWidth - window.innerWidth, outside, scrollable };
  });
  expect(report.documentOverflow, `document scrolls horizontally at ${width}px (${label})`).toBeLessThanOrEqual(0);
  expect(report.outside, `elements outside the viewport at ${width}px (${label})`).toEqual([]);
  expect(report.scrollable, `elements wider than themselves at ${width}px (${label})`).toEqual([]);
}

test.describe('match analysis tab', () => {
  test('the tab opens when the source sent events or numbers', async ({ page }) => {
    await openMatchCenter(page);
    await expect(page.locator('#mc-tab-analysis')).toBeVisible();
  });

  test('no events and no numbers: no analysis tab, no empty panel', async ({ page }) => {
    await openMatchCenter(page, { overrides: { events: [], statistics: null } });
    await expect(page.locator('#mc-tab-analysis')).toHaveCount(0);
    await expect(page.locator('.mc-analysis')).toHaveCount(0);
  });

  test('stoppages alone are not data: the analysis tab stays closed', async ({ page }) => {
    await openMatchCenter(page, { overrides: { events: [EVENTS[3]], statistics: null } });
    await expect(page.locator('#mc-tab-analysis')).toHaveCount(0);
    await expect(page.locator('.mc-analysis')).toHaveCount(0);
    // ولا يصل نصّهما الإنجليزي إلى الصفحة كلها.
    await expect(page.getByText('Start Delay')).toHaveCount(0);
  });

  test('the summary says only what the numbers say: both values, no verdict', async ({ page }) => {
    await openMatchCenter(page);
    await openTab(page, 'analysis');

    const shots = page.locator('.mc-analysis-fact', { has: page.getByText('على المرمى') });
    await expect(shots).toContainText('٤');
    await expect(shots).toContainText('مقابل');
    await expect(shots).toContainText('٢');
    await expect(page.locator('.mc-analysis-facts')).toContainText('الاستحواذ');
    await expect(page.locator('.mc-analysis-fact').filter({ hasText: 'الاستحواذ' })).toContainText('٥٨%');
    // نفس الصفوف في لوحة «مباشر» — المجموعة مشتركة، لا نسخة ثانية من العقد.
    await expect(page.locator('.mc-analysis-fact').filter({ hasText: 'الاستحواذ' })).toContainText('٤٢%');

    // دقة التمريرطرفٌ فيها غائب: لا «٨٤ مقابل ٠» في الملخص.
    await expect(page.locator('.mc-analysis-facts')).not.toContainText('دقة التمرير');
    // لكنها باقية في جدول الأرقام بوصف الغياب، لا بصفر.
    const passing = page.locator('.mc-analysis .mc-stat-compare', { hasText: 'دقة التمرير' });
    await expect(passing).toContainText('٨٤');
    await expect(passing).toContainText('لا رقم من المصدر');

    await expect(page.locator('.mc-analysis .mc-stat-group-title')).toHaveText(['الاستحواذ والتمرير', 'التسديد', 'الدفاع والانضباط']);
    const fouls = page.locator('.mc-analysis .mc-stat-compare', { hasText: 'الأخطاء' });
    await expect(fouls).toContainText('٩');
    await expect(fouls).toContainText('١٤');
    await expect(fouls).toContainText('الفارق ٥');
    await expect(fouls).toContainText('الأعلى رقمياً: إيبسويتش تاون');
    await expect(fouls.locator('.mc-stat-bar')).toHaveCount(2);

    // لفظ الحكم ممنوع في الأرقام نفسها (سطر التوضيح يذكر المنع صراحةً، فلا يُفحص معه).
    const verdicts = (await page.locator('.mc-analysis .mc-stat-compare, .mc-analysis .mc-analysis-fact').allTextContents()).join(' ');
    expect(verdicts).not.toMatch(/أفضل|أفضلية|سيطرة|الأقوى|أخطر|لصالح/);
    await expect(page.locator('.mc-analysis')).toContainText('ليست أفضلية');
    // الصفر الحقيقي من المصدر يبقى صفرًا، والغياب لا يصير صفرًا.
    const cards = page.locator('.mc-analysis .mc-stat-compare', { hasText: 'بطاقات حمراء' });
    await expect(cards).toContainText('٠');
    await expect(cards).toContainText('لا رقم من المصدر');
  });

  test('filters match source events by team, period and type; عرض الكل resets', async ({ page }) => {
    await openMatchCenter(page);
    await openTab(page, 'analysis');

    const rows = page.locator('.mc-analysis-event');
    await expect(rows).toHaveCount(RENDERABLE);
    await expect(rows.filter({ hasText: 'Start Delay' })).toHaveCount(0);
    await expect(rows.filter({ hasText: 'End Delay' })).toHaveCount(0);

    const team = page.locator('#mc-filter-team');
    const period = page.locator('#mc-filter-period');
    const type = page.locator('#mc-filter-type');
    // العدد بالأرقام العربية مثل بقية الأرقام في الواجهة.
    await expect(team.locator('option')).toHaveText(['كل الأحداث', `${HOME} (٢)`, `${AWAY} (٤)`, 'غير منسوب إلى طرف (١)']);
    await expect(period.locator('option')).toHaveText(['كل الأشواط', 'الشوط الأول (٣)', 'الشوط الثاني (٣)', 'شوط غير مبيَّن من المصدر (١)']);

    await team.selectOption('home');
    await expect(rows).toHaveCount(2);
    await expect(page.locator('.mc-analysis-count')).toContainText('٢');

    await period.selectOption('1');
    await expect(rows).toHaveCount(2);
    await expect(page.locator('.mc-filter-reset')).toBeEnabled();

    await type.selectOption('goal');
    await expect(rows).toHaveCount(2);

    await page.locator('.mc-filter-reset').click();
    await expect(rows).toHaveCount(RENDERABLE);
    await expect(page.locator('.mc-filter-reset')).toBeDisabled();

    // نوعٌ واحد: يبقى الحدث الملغى ظاهرًا بوصفه حدثًا أرسله المصدر.
    await type.focus();
    await type.selectOption('yellow_card');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('بطاقة صفراء');
    // دقيقة الحدث بصيغة ساعة المصدر نفسها (كما على الشريط)، والقيم الرقمية بالعربية.
    await expect(rows.first()).toContainText('31′');

    // لا تطابق ⇒ رسالة، لا جدول فارغ ولا أصفار.
    await page.locator('.mc-filter-reset').click();
    await type.selectOption('substitution');
    await team.selectOption('home');
    await expect(rows).toHaveCount(0);
    await expect(page.locator('.mc-analysis-empty')).toContainText('لا حدث يطابق هذا الفلتر');
  });

  test('an event row opens details, works by keyboard, and reveals itself on the strip', async ({ page }) => {
    await openMatchCenter(page);
    await openTab(page, 'analysis');

    const substitution = page.locator('.mc-analysis-event', { hasText: 'تبديل' }).first();
    await substitution.locator('button').focus();
    await expect(substitution.locator('button')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(substitution).toHaveAttribute('data-selected', 'true');
    await expect(substitution.locator('.mc-analysis-detail-values')).toContainText('Szmodics');
    await expect(substitution.locator('.mc-analysis-detail-values')).toContainText('الشوط الثاني');

    // الإظهار على الشريط: التركيز يذهب إلى العلامة نفسها وتفاصيلها تُقرأ.
    await substitution.getByRole('button', { name: 'إظهار على الشريط الزمني' }).click();
    const marker = page.locator(`.mc-pitch-marker[data-event-key="${MATCH}:a5"]`);
    await expect(marker).toBeFocused();
    await expect(marker).toHaveAttribute('data-active', 'true');
    await expect(page.locator('.mc-pitch-event-detail')).toContainText('لاعب مرتبط: Szmodics');

    // الهدف الملغى بعد الفيديو: مشطوب على الملعب، غير محسوب، ومذكور في التحليل.
    const cancelled = page.locator('.mc-analysis-event', { hasText: 'Delph' }).first();
    await cancelled.locator('button').click();
    await expect(cancelled).toContainText('ملغى من المصدر — لا يُحتسب في النتيجة');
    await expect(page.locator(`.mc-pitch-marker[data-event-key="${MATCH}:a6"]`)).toHaveAttribute('data-kind', 'cancelled');
    await expect(page.locator('.mc-pitch-score')).toContainText('2–0');

    // حدث بلا دقيقة: يبقى خارج الشريط، ولا موضع مُختلَع له.
    const untimed = page.locator('.mc-analysis-event', { hasText: 'Injury timeout' }).first();
    await expect(untimed.locator('.mc-analysis-event-minute')).toHaveText('—');
    await untimed.locator('button').click();
    await expect(untimed.getByRole('button', { name: 'إظهار على الشريط الزمني' })).toHaveCount(0);
    await expect(untimed.locator('.mc-analysis-detail-values')).toContainText('لا يرسل المصدر دقيقة لهذا الحدث');
  });

  test('sections the provider does not deliver are named, not drawn empty', async ({ page }) => {
    await openMatchCenter(page);
    await openTab(page, 'analysis');
    const absent = page.locator('.mc-analysis-absent');
    await expect(absent.getByText('التشكيلات', { exact: false })).toBeVisible();
    await expect(absent).toContainText('تقييمات اللاعبين');
    await expect(absent).toContainText('xG');
    await expect(absent).toContainText('إحداثيات');
    // لا رادار ولا خريطة ولا canvas: لا أرقام مقارنة موسمية في ربط المصدر الحالي.
    await expect(page.locator('.mc-radar')).toHaveCount(0);
    await expect(page.locator('.mc-page canvas')).toHaveCount(0);
  });

  test('a payload with neither events nor statistics opens no analysis and no zero table', async ({ page }) => {
    await openMatchCenter(page, { overrides: { statistics: null, events: [], lineups: null, ratings: null, h2h: [], form: null } });
    await expect(page.locator('#mc-tab-analysis')).toHaveCount(0);
    await expect(page.locator('#mc-tab-live')).toHaveCount(0);
    await expect(page.locator('.mc-analysis, .mc-stat-group')).toHaveCount(0);
    // شريط الدقيقة لا يَرسم أحداثًا ليست موجودة، ولا يَخترع ساعة.
    await expect(page.locator('.mc-pitch-events')).toHaveCount(0);
    await expect(page.locator('.mc-pitch-axis')).toHaveCount(0);
    // لا تبويب تشكيلات ولا تقييمات: الوصول إليهما غير مؤكَّد في ربط المصدر.
    await expect(page.locator('#mc-tab-lineups')).toHaveCount(0);
    // الموعد والملعب من بيانات الجدول الموقّعة نفسها، لا من قراءة مباشرة.
    await expect(page.locator('.mc-match-facts dt').first()).toHaveText('الملعب');
  });
});

test.describe('analyst notebook', () => {
  test('a note is saved per match, returns after reload, and can be edited, deleted, exported', async ({ page }) => {
    await openMatchCenter(page);
    await openTab(page, 'notes');

    await expect(page.locator('.mc-notebook-storage')).toContainText('هذا المتصفح على هذا الجهاز فقط');
    await expect(page.locator('.mc-note-empty')).toContainText('لا ملاحظات في هذا المتصفح لهذه المباراة');

    await page.locator('#mc-note-text').fill('خروج الظهير الأيسر ترك مساحة على الجهة اليمنى.');
    await page.getByRole('radio', { name: 'دقيقة أختارها' }).check();
    await page.locator('#mc-note-minute').fill('62');
    await page.locator('#mc-note-side').selectOption('away');
    await page.getByRole('button', { name: 'كرة ثابتة', exact: true }).click();
    await page.getByRole('button', { name: 'حفظ الملاحظة' }).click();

    const saved = page.locator('.mc-note-item');
    await expect(saved).toHaveCount(1);
    await expect(saved.first()).toContainText('خروج الظهير الأيسر');
    await expect(saved.first()).toContainText('كرة ثابتة');
    await expect(saved.first()).toContainText('الدقيقة 62′ · إيبسويتش تاون');
    await expect(page.locator('.mc-note-status')).toContainText('حُفظت الملاحظة');

    // بعد إعادة التحميل: الملاحظة لمباراتها هي، ولم تُرسل إلى أي مكان.
    await page.reload();
    await expect(page.locator('.mc-pitch-statusline')).toBeVisible({ timeout: 30_000 });
    await page.locator('#mc-tab-notes').click();
    await expect(page.locator('.mc-note-item')).toHaveCount(1);
    await expect(page.locator('.mc-note-item').first()).toContainText('خروج الظهير الأيسر');

    // التعديل يحفظ في السطر نفسه، لا في سطر ثانٍ.
    await page.getByRole('button', { name: /تعديل الملاحظة/ }).click();
    await page.locator('#mc-note-text').fill('خروج الظهير + تأخر الارتداد — مساحة على الجهة اليمنى.');
    await page.getByRole('button', { name: 'حفظ التعديل' }).click();
    await expect(page.locator('.mc-note-item')).toHaveCount(1);
    await expect(page.locator('.mc-note-item').first()).toContainText('تأخر الارتداد');

    // التصدير: ملف واحد فيه الملاحظة وأرقام المباراة، والغياب يبقى غيابًا.
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /تصدير الملاحظات والبيانات/ }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^analyst-notes-manchester-city-ipswich-town-\d{8}-\d{4}\.json$/);
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk as Buffer);
    const exported = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    expect(exported.notes).toHaveLength(1);
    expect(exported.notes[0].minute).toBe(62);
    expect(exported.notes[0].teamSide).toBe('away');
    expect(exported.notes[0].tags).toEqual(['كرة ثابتة']);
    expect(exported.read.statistics[1]).toEqual({ key: 'passPct', label: 'دقة التمرير', unit: '%', home: 84, away: null });
    expect(exported.read.score).toEqual({ home: 2, away: 0 });
    expect(exported.read.lineups).toBeNull();
    expect(exported.notAvailableFromProvider.expectedGoals).toBeNull();
    expect(exported.events.count).toBe(RENDERABLE);
    expect(JSON.stringify(exported.events.items)).not.toMatch(/Start Delay/);
    expect(exported.privacyNote).toContain('هذا الجهاز');

    await page.getByRole('button', { name: /حذف الملاحظة/ }).click();
    await expect(page.locator('.mc-note-item')).toHaveCount(0);
    await expect(page.locator('.mc-note-empty')).toContainText('لا ملاحظات في هذا المتصفح لهذه المباراة');
  });

  test('a note can be pinned to a source event from the analysis list', async ({ page }) => {
    await openMatchCenter(page);
    await openTab(page, 'analysis');
    const redCard = page.locator('.mc-analysis-event', { hasText: 'بطاقة حمراء' }).first();
    await redCard.locator('button').click();
    await redCard.getByRole('button', { name: 'ملاحظة بهذا الحدث' }).click();

    await expect(page.locator('#mc-tab-notes')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#mc-note-event')).toBeVisible();
    expect(await page.locator('#mc-note-event').inputValue()).toContain('a7');
    await expect(page.locator('.mc-note-linked-hint')).toContainText('78′');
    await page.locator('#mc-note-text').fill('البطاقة بعد فقدان الكرة في الخروج الأول.');
    await page.getByRole('button', { name: 'حفظ الملاحظة' }).click();
    await expect(page.locator('.mc-note-item').first()).toContainText('البطاقة بعد فقدان الكرة');
    await expect(page.locator('.mc-note-item').first()).toContainText('78′');
  });

  test('an empty note or an impossible minute is refused, not saved as an empty row', async ({ page }) => {
    await openMatchCenter(page);
    await openTab(page, 'notes');
    await page.getByRole('radio', { name: 'دقيقة أختارها' }).check();
    await page.locator('#mc-note-minute').fill('400');
    await page.getByRole('button', { name: 'حفظ الملاحظة' }).click();
    await expect(page.locator('.mc-note-error').first()).toContainText('نص الملاحظة');
    await expect(page.locator('.mc-note-item')).toHaveCount(0);

    await page.locator('#mc-note-text').fill('ملاحظة قصيرة');
    await page.getByRole('button', { name: 'حفظ الملاحظة' }).click();
    await expect(page.locator('.mc-note-error')).toContainText('الدقيقة بين 0 و240');
    await expect(page.locator('.mc-note-item')).toHaveCount(0);

    await page.locator('#mc-note-minute').fill('35');
    await page.getByRole('button', { name: 'حفظ الملاحظة' }).click();
    await expect(page.locator('.mc-note-item')).toHaveCount(1);
    await expect(page.locator('.mc-note-item').first()).toContainText('الدقيقة 35′');
  });

  test('the notebook of one match never shows up on another', async ({ page }) => {
    await openMatchCenter(page);
    await openTab(page, 'notes');
    await page.locator('#mc-note-text').fill('ملاحظة لمباراة واحدة فقط.');
    await page.getByRole('button', { name: 'حفظ الملاحظة' }).click();
    await expect(page.locator('.mc-note-item')).toHaveCount(1);

    // مباراة بلا معرّف حدث في مصدرها: لا قراءة ولا انتظارها — الدفتر لا يحتاج قراءة.
    const other = 'epl-afc-bournemouth-vs-arsenal';
    await openMatchCenter(page, { match: other, overrides: { event: '401879270' }, requireRead: false });
    await page.locator('#mc-tab-notes').click();
    await expect(page.locator('.mc-note-item')).toHaveCount(0);
    await expect(page.locator('.mc-note-empty')).toContainText('لا ملاحظات في هذا المتصفح لهذه المباراة');
  });

  test('print media reveals every data-backed panel and hides the controls', async ({ page }) => {
    await openMatchCenter(page);
    await page.emulateMedia({ media: 'print' });
    const styles = await page.evaluate(() => {
      const display = selector => {
        const el = document.querySelector(selector) as HTMLElement | null;
        return el ? getComputedStyle(el).display : 'missing';
      };
      return {
        analysis: display('#mc-panel-analysis'),
        notes: display('#mc-panel-notes'),
        tabs: display('.mc-tabs'),
        form: display('.mc-note-form'),
        mini: display('.mc-mini'),
      };
    });
    expect(styles.analysis, 'كل قسم فيه بيانات يُطبع لا القسم المفتوح وحده').not.toBe('none');
    expect(styles.notes).not.toBe('none');
    expect(styles.tabs).toBe('none');
    expect(styles.form).toBe('none');
    expect(styles.mini).toBe('none');
  });
});

test.describe('layout at every accepted width', () => {
  for (const width of [320, 390, 768, 1200, 1440]) {
    test(`no horizontal overflow or overlap at ${width}px`, async ({ page }) => {
      test.setTimeout(90_000);
      await page.setViewportSize({ width, height: 900 });
      await openMatchCenter(page);

      for (const tabId of ['preview', 'live', 'analysis', 'notes']) {
        await openTab(page, tabId);
        await expectNoOverflow(page, width, tabId);
      }

      // التبويبات لا تتراكب، وكل واحد في صفّه أو بجوار مباشرة.
      const boxes = await page.locator('.mc-tab').evaluateAll(items => items.map(item => {
        const box = item.getBoundingClientRect();
        return { x: box.x, y: box.y, right: box.right, bottom: box.bottom };
      }));
      expect(boxes.length).toBeGreaterThan(3);
      for (const [index, box] of boxes.entries()) {
        for (const other of boxes.slice(index + 1)) {
          const overlapX = box.x < other.right - 1 && other.x < box.right - 1;
          const overlapY = box.y < other.bottom - 1 && other.y < box.bottom - 1;
          expect(overlapX && overlapY, `tabs ${index} and ${index + 1} overlap at ${width}px`).toBe(false);
        }
      }

      // الشريط الزمني كما هو معتمد: 0′ يمينًا و90′ يسارًا.
      const first = await page.locator('.mc-pitch-tick').first().boundingBox();
      const last = await page.locator('.mc-pitch-tick').last().boundingBox();
      if (first && last) expect(first.x).toBeGreaterThan(last.x);
    });
  }
});
