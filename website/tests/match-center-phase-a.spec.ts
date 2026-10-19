import { test, expect } from '@playwright/test';
import { pitchLineupPayload } from './fixtures/pitch-lineups.mjs';

/* ==========================================================================
   المرحلة أ — اختبار الواجهة
   --------------------------------------------------------------------------
   ثلاث حالات لمباراة واحدة، كلها مُدخلات اختبار تُحقن في `match-center.php`:
   • الحالة أ: قبل المباراة بلا تشكيلة ⇒ المعاينة (حقائق + آخر 5 لكل فريق)
     على الملعب نفسه، ولوحة «قبل المباراة» تحمل المواجهات ومجملها وإشارةً إلى
     الملعب — لا تكرار للبيانات.
   • الحالة ب: التشكيلة الرسمية وصلت ⇒ تحل محل المعاينة على الملعب، والمعاينة
     تعود إلى اللوحة. اسم المركز بالعربية ورمز المصدر بجانبه.
   • مباشر: عدّادات البطاقات والركنيات أسفل الشعارين، شريط الاستحواذ، رؤوس
     المجموعات بالشعارين، والقيمة الغائبة كلمة «غير متاح» لا صفر.
   وفي كل حالة: لا نص عن المصدر خارج «التوثيق والمراجعة»، ولا تمرير أفقي.
========================================================================== */

const MATCH = 'manchester-city-ipswich-town';
const EVENT_ID = '401879259';
const NOW = new Date('2026-10-17T12:20:00Z');
const HOME_ID = '382';
const AWAY_ID = '373';

test.beforeEach(() => {
  test.setTimeout(90_000);
});

const H2H = [
  { fixtureId: 'h1', date: '2026-01-17T15:00:00Z', competition: 'English Premier League', year: null, friendly: false, completed: true, home: 'Ipswich Town', away: 'Manchester City', homeTeamId: AWAY_ID, awayTeamId: HOME_ID, homeGoals: 0, awayGoals: 0 },
  { fixtureId: 'h2', date: '2025-09-13T14:00:00Z', competition: 'English Premier League', year: null, friendly: false, completed: true, home: 'Manchester City', away: 'Ipswich Town', homeTeamId: HOME_ID, awayTeamId: AWAY_ID, homeGoals: 3, awayGoals: 0 },
  { fixtureId: 'h3', date: '2025-02-26T20:00:00Z', competition: 'English Premier League', year: null, friendly: false, completed: true, home: 'Ipswich Town', away: 'Manchester City', homeTeamId: AWAY_ID, awayTeamId: HOME_ID, homeGoals: 2, awayGoals: 1 },
];

function formEntries(teamId: string, prefix: string, results: Array<[number, number]>) {
  return results.map(([goalsFor, goalsAgainst], index) => ({
    fixtureId: `${prefix}${index}`,
    date: `2026-10-${String(10 - index).padStart(2, '0')}T14:00:00Z`,
    competition: 'English Premier League',
    opponent: `Opponent ${prefix}${index}`,
    homeTeamId: index % 2 === 0 ? teamId : `9${index}`,
    awayTeamId: index % 2 === 0 ? `9${index}` : teamId,
    homeGoals: index % 2 === 0 ? goalsFor : goalsAgainst,
    awayGoals: index % 2 === 0 ? goalsAgainst : goalsFor,
  }));
}

const FORM = {
  home: formEntries(HOME_ID, 'fh', [[2, 0], [1, 1], [0, 1], [3, 1], [2, 2]]),
  away: formEntries(AWAY_ID, 'fa', [[0, 2], [1, 0], [1, 1], [0, 3], [2, 1]]),
};

const LIVE_STATISTICS = [
  { key: 'possessionPct', label: 'الاستحواذ', unit: '%', home: 58, away: 42 },
  { key: 'totalPasses', label: 'التمريرات', unit: '', home: 412, away: 298 },
  { key: 'passPct', label: 'دقة التمرير', unit: '%', home: 84, away: null },
  { key: 'totalShots', label: 'التسديدات', unit: '', home: 11, away: 7 },
  { key: 'shotsOnTarget', label: 'على المرمى', unit: '', home: 4, away: 2 },
  { key: 'wonCorners', label: 'الركنيات', unit: '', home: 6, away: 3 },
  { key: 'totalTackles', label: 'التدخلات', unit: '', home: 14, away: 19 },
  { key: 'saves', label: 'التصديات', unit: '', home: 3, away: 4 },
  { key: 'foulsCommitted', label: 'الأخطاء', unit: '', home: 9, away: 14 },
  { key: 'yellowCards', label: 'بطاقات صفراء', unit: '', home: 1, away: 3 },
  { key: 'redCards', label: 'بطاقات حمراء', unit: '', home: null, away: 1 },
];

function payload(overrides: Record<string, unknown> = {}) {
  return {
    provider: 'espn',
    match: MATCH,
    event: EVENT_ID,
    league: 'eng.1',
    readAt: '2026-10-17T12:19:20Z',
    cache: 'HIT',
    status: { type: { name: 'STATUS_SCHEDULED', state: 'pre', completed: false } },
    score: null,
    events: [],
    statistics: null,
    lineups: null,
    ratings: null,
    h2h: H2H,
    form: FORM,
    venue: 'Etihad Stadium',
    ...overrides,
  };
}

function statePayloadB(overrides: Record<string, unknown> = {}) {
  const base = pitchLineupPayload();
  return payload({ lineups: base.lineups, ...overrides });
}

function livePayload() {
  const base = pitchLineupPayload();
  return payload({
    status: { type: { name: 'STATUS_IN_PROGRESS', state: 'in', completed: false }, displayClock: "67'" },
    score: { home: 1, away: 2 },
    statistics: LIVE_STATISTICS,
    lineups: base.lineups,
    events: [
      { id: 'g1', type: 'Goal', minute: 12, extraMinute: null, period: { number: 1 }, side: 'home', team: { name: 'Manchester City', homeAway: 'home' }, player: { id: 'h10', name: 'Mock h Player Long Name 10' } },
      { id: 'y1', type: 'Yellow Card', minute: 31, extraMinute: null, period: { number: 1 }, side: 'away', team: { name: 'Ipswich Town', homeAway: 'away' }, player: { id: 'a3', name: 'Mock a Player Long Name 3' } },
    ],
  });
}

/* المسار على السياق قبل التنقل وبعد تثبيت الساعة — كما في بقية ملفات المركز. */
async function openMatchCenter(page, body: Record<string, unknown>) {
  await page.clock.install({ time: NOW });
  await page.context().unroute('**/match-center.php*').catch(() => null);
  await page.context().route('**/match-center.php*', route => route.fulfill({
    status: 200,
    headers: { 'X-Matches-Cache': 'HIT', 'X-Cache-Age': '4', 'Content-Type': 'application/json' },
    json: body,
  }));
  await page.goto(`/matches/الدوري-الإنجليزي/${MATCH}/`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.mc-pitch-statusline')).toBeVisible({ timeout: 30_000 });
}

async function openTab(page, tabId: string) {
  await page.locator(`#mc-tab-${tabId}`).click();
  await expect(page.locator(`#mc-panel-${tabId}`)).toBeVisible();
}

/** كل نص عن المصدر أو شرحه يسكن «التوثيق والمراجعة» وحدها. */
async function expectNoSourceTextOutsideDocs(page) {
  const leaked = await page.evaluate(() => {
    const root = document.querySelector('.mc-page');
    if (!root) return ['no .mc-page'];
    const clone = root.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('.mc-docs, .mc-live-region').forEach(node => node.remove());
    const text = clone.textContent ?? '';
    return ['المصدر', 'لا درجة من 100', 'ليست أفضلية', 'يراجع فريقنا'].filter(needle => text.includes(needle));
  });
  expect(leaked).toEqual([]);
}

async function expectNoOverflow(page, width: number) {
  await page.setViewportSize({ width, height: 1000 });
  const report = await page.evaluate(() => {
    const limit = document.documentElement.clientWidth;
    const scrollable: string[] = [];
    const outside: string[] = [];
    for (const node of document.querySelectorAll('.mc-page, .mc-pitch-frame, .mc-pitch-preview, .mc-pitch-forms, .mc-panel, .mc-docs, .mc-h2h-agg, .mc-possession, .mc-stat-group')) {
      const el = node as HTMLElement;
      if (el.scrollWidth - el.clientWidth > 1) scrollable.push(el.className.toString());
      const box = el.getBoundingClientRect();
      if (box.right > limit + 1 || box.left < -1) outside.push(el.className.toString());
    }
    return { scrollable, outside, pageOverflow: document.documentElement.scrollWidth > limit + 1 };
  });
  expect(report, `${width}px`).toEqual({ scrollable: [], outside: [], pageOverflow: false });
}

test('state A: without a lineup the preview sits on the pitch and the panel points to it', async ({ page }) => {
  await openMatchCenter(page, payload());

  await expect(page.locator('[role="tab"]')).toHaveText(['قبل المباراة', 'مباشر']);

  const preview = page.locator('.mc-pitch-frame .mc-pitch-preview');
  await expect(preview).toBeVisible();
  await expect(preview.locator('h2')).toHaveText('المعاينة');
  const facts = preview.locator('.mc-pitch-preview-facts');
  await expect(facts).toContainText('المسابقة');
  await expect(facts).toContainText('Etihad Stadium');
  await expect(facts).toContainText('موعد القاهرة');
  await expect(preview.locator('.mc-pitch-form')).toHaveCount(2);
  await expect(preview.locator('.mc-pitch-form[data-side="home"] .mc-form-result')).toHaveCount(5);
  await expect(preview.locator('.mc-pitch-form[data-side="home"] .mc-form-result').first()).toHaveAttribute('data-r', 'W');
  await expect(preview.locator('.mc-pitch-form[data-side="away"] .mc-form-result').first()).toHaveAttribute('data-r', 'L');
  // لا تشكيلة ولا عدّادات ولا نسخة ثانية من الحقائق أسفل الملعب.
  await expect(page.locator('.mc-pitch-lineups')).toHaveCount(0);
  await expect(page.locator('.mc-pitch-counters')).toHaveCount(0);
  await expect(page.locator('.mc-match-facts')).toHaveCount(0);

  await openTab(page, 'prematch');
  const panel = page.locator('#mc-panel-prematch');
  await expect(panel.locator('.mc-prematch-pointer')).toBeVisible();
  await expect(panel.locator('.mc-preview-facts')).toHaveCount(0);
  await expect(panel.locator('.mc-form-side')).toHaveCount(0);
  // مجمل المواجهات من الصفوف الثلاثة نفسها (نُسب بمعرّف الفريق لا بالاسم): سيتي 1، تعادل 1، إيبسويتش 1.
  const agg = panel.locator('.mc-h2h-agg');
  await expect(agg).toBeVisible();
  await expect(agg.locator('.mc-h2h-cell[data-side="home"] .mc-num')).toHaveText('١');
  await expect(agg.locator('.mc-h2h-cell[data-side="draw"] .mc-num')).toHaveText('١');
  await expect(agg.locator('.mc-h2h-cell[data-side="away"] .mc-num')).toHaveText('١');
  await expect(agg.locator('.mc-h2h-cell[data-side="home"]')).toContainText('مانشستر سيتي');

  // «مباشر» قبل الصافرة بلا أرقام: لا «غير متاح» ولا صفر مزعوم.
  await openTab(page, 'live');
  await expect(page.locator('#mc-panel-live .mc-possession')).toHaveCount(0);
  await expect(page.locator('#mc-panel-live')).not.toContainText('غير متاح');

  // قبل البداية لا أرقام ⇒ لا مقارنة بمتوسط الدوري (لا أساس بلا أرقام مباراة).
  await expect(page.locator('.mc-benchmark')).toHaveCount(0);

  const docs = page.locator('.mc-docs');
  await expect(docs.locator('.mc-doc')).toHaveCount(8);
  await expect(docs).toContainText('آخر 3 مواجهات');
  await expect(docs).toContainText('آخر 5 مباريات');
  await expect(docs).toContainText('ليست أفضلية');
  // بطاقة ميزان المجموعة: شرح الشريطين والأساس، في بيت النصوص الوحيد.
  await expect(docs.locator('.mc-doc[data-doc="group-index"]')).toContainText('متوسط حصة كل طرف');
  await expect(docs.locator('.mc-docs-review')).toContainText('18 أكتوبر 2026');
  await expect(docs.locator('.mc-report')).toHaveAttribute('href', /^mailto:/);
  await expectNoSourceTextOutsideDocs(page);

  for (const width of [390, 768, 1440]) await expectNoOverflow(page, width);
});

test('state B: the official lineup replaces the preview on the pitch and the preview returns to the panel', async ({ page }) => {
  await openMatchCenter(page, statePayloadB());

  await expect(page.locator('[role="tab"]')).toHaveText(['قبل المباراة', 'مباشر']);
  const pitch = page.locator('.mc-pitch-frame .mc-pitch-lineups');
  await expect(pitch).toBeVisible();
  await expect(page.locator('.mc-pitch-preview')).toHaveCount(0);
  // شريط الحقائق المختصر أسفل الملعب يعود كما كان (التصور المعتمد)؛ يُخفى فقط حين تكون الحقائق على الملعب نفسه.
  await expect(page.locator('.mc-match-facts')).toHaveCount(1);
  // اسم المركز بالعربية ورمز المصدر بجانبه، لا الرمز وحده.
  const keeper = pitch.locator('.mc-lineup-squad[data-side="home"] .mc-lineup-rows .mc-lineup-player').first();
  await expect(keeper.locator('.mc-player-pos')).toHaveText('حارس المرمى');
  await expect(keeper.locator('.mc-player-pos-code')).toHaveText('G');
  await expect(pitch.locator('.mc-player-pos')).toHaveCount(22);
  await expect(page.locator('.mc-lineup-explainer')).toHaveCount(0);
  // بلا إحصاءات لا صف عدّادات أصلاً — ولا أصفار.
  await expect(page.locator('.mc-pitch-counters')).toHaveCount(0);

  await openTab(page, 'prematch');
  const panel = page.locator('#mc-panel-prematch');
  await expect(panel.locator('.mc-prematch-pointer')).toHaveCount(0);
  await expect(panel.locator('.mc-preview-facts')).toBeVisible();
  await expect(panel.locator('.mc-preview-facts')).toContainText('Etihad Stadium');
  await expect(panel.locator('.mc-form-side')).toHaveCount(2);
  await expect(panel.locator('.mc-h2h-agg')).toBeVisible();
  // التشكيلة لا تُعرض مرتين: لا قائمة لاعبين داخل اللوحة.
  await expect(panel.locator('.mc-lineup-player')).toHaveCount(0);
  await expectNoSourceTextOutsideDocs(page);

  for (const width of [390, 1440]) await expectNoOverflow(page, width);
});

test('live: pitch counters, possession bar, crest headers, and «غير متاح» for a missing value', async ({ page }) => {
  await openMatchCenter(page, livePayload());

  await expect(page.locator('[role="tab"]')).toHaveText(['قبل المباراة', 'مباشر']);
  await expect(page.locator('#mc-panel-live')).toBeVisible();

  // عدّادات أسفل الشعارين: صفراء/حمراء فقط، وتُخفى تماماً ما دامت صفراً أو null؛
  // الركنيات لم تعد من عدّادات الملعب. المضيف صفراء وحدها، والضيف صفراء وحمراء.
  const home = page.locator('.mc-pitch-team[data-side="home"] .mc-pitch-counters, .mc-pitch-team--home .mc-pitch-counters').first();
  const away = page.locator('.mc-pitch-team[data-side="away"] .mc-pitch-counters, .mc-pitch-team--away .mc-pitch-counters').first();
  await expect(page.locator('.mc-pitch-counters')).toHaveCount(2);
  await expect(home.locator('.mc-pitch-counter')).toHaveCount(1);
  await expect(home.locator('.mc-pitch-counter[data-counter="red"]')).toHaveCount(0);
  await expect(home.locator('.mc-pitch-counter[data-counter="corners"]')).toHaveCount(0);
  await expect(home.locator('.mc-pitch-counter[data-counter="yellow"] .mc-num')).toHaveText('١');
  await expect(away.locator('.mc-pitch-counter')).toHaveCount(2);
  await expect(away.locator('.mc-pitch-counter[data-counter="red"] .mc-num')).toHaveText('١');

  // مقارنة بمتوسط الدوري الموثّق: أساس معلن العينات، وكمية لا حكم، والطرف
  // الناقص «غير متاح». الاستحواذ ٥٨/٤٢ مقابل متوسط ٥٠ ⇒ أعلى وأقل معاً.
  const benchmark = page.locator('#mc-panel-live .mc-benchmark');
  await expect(benchmark).toBeVisible();
  await expect(benchmark).toContainText('مباراة موثقة');
  await expect(benchmark).toContainText('متوسط الدوري');
  await expect(benchmark).toContainText('أعلى من متوسط الدوري بـ ٨');
  await expect(benchmark).toContainText('أقل من متوسط الدوري بـ ٨');
  await expect(benchmark.locator('.mc-benchmark-row')).toHaveCount(3);
  await expect(benchmark.locator('.mc-bench-none')).toHaveCount(1);

  const live = page.locator('#mc-panel-live');
  const possession = live.locator('.mc-possession');
  await expect(possession).toBeVisible();
  await expect(possession).toContainText('٥٨%');
  await expect(possession).toContainText('٤٢%');
  const widths = await possession.locator('.mc-possession-fill').evaluateAll(nodes => nodes.map(node => (node as HTMLElement).getBoundingClientRect().width));
  expect(widths.length).toBe(2);
  expect(widths[0] / (widths[0] + widths[1])).toBeCloseTo(0.58, 1);

  // ست مجموعات معرَّفة وهذه العينة تملأها كلها؛ كل رأس يحمل شعاري الفريقين (أو حرفيهما).
  const groups = live.locator('.mc-stat-group');
  await expect(groups).toHaveCount(6);
  await expect(live.locator('.mc-stat-group-title')).toHaveText(['الاستحواذ والتمرير', 'التسديد', 'بناء الهجمة', 'الدفاع', 'حراسة المرمى', 'الانضباط']);
  await expect(live.locator('.mc-stat-group-head .mc-mini-crest--home')).toHaveCount(6);
  await expect(live.locator('.mc-stat-group-head .mc-mini-crest--away')).toHaveCount(6);

  // ميزان كل مجموعة: شريط متوسط الحصة برقميه (مجموعهما ١٠) وشريط عدّ الصفوف،
  // بلا عنوان باسمه — اسم المجموعة في رأسها تسميته — وأساسه معلَن في سطره.
  const balances = live.locator('.mc-stat-index');
  await expect(balances).toHaveCount(6);
  const first = balances.first();
  await expect(first).toContainText('٥٨%');
  await expect(first).toContainText('٤٢%');
  await expect(first.locator('.mc-stat-index-fill')).toHaveCount(2);
  await expect(first.locator('.mc-stat-tally-seg[data-lead="home"]')).toHaveCount(1);
  // «دقة التمرير» وصل طرفها المضيف وحده: خارج المتوسط ومعدودة في الأساس.
  await expect(first).toContainText('بلا رقمين: ١');
  // مجموعة بصف واحد قابل للمقارنة أساسها ضيّق معلن بإطار متقطع.
  await expect(live.locator('.mc-stat-group', { hasText: 'حراسة المرمى' }).locator('.mc-stat-index')).toHaveAttribute('data-basis', 'single');
  // لوحة «مؤشرات المجموعات»: ستة أسطر، كل سطر رابط إلى مجموعته في التبويب نفسه.
  const board = live.locator('.mc-indexboard');
  await expect(board).toBeVisible();
  await expect(board.locator('.mc-indexboard-row')).toHaveCount(6);
  await expect(board.locator('.mc-indexboard-row a').first()).toHaveAttribute('href', '#live-statgroup-possession-passing');
  await expect(live.locator('#live-statgroup-possession-passing')).toHaveCount(1);
  const passing = live.locator('.mc-stat-compare', { hasText: 'دقة التمرير' });
  await expect(passing.locator('.mc-stat-side-none')).toHaveText('غير متاح');
  await expect(passing).not.toContainText('٠%');
  // البطاقة الحمراء الغائبة للمضيف كلمة لا صفر، وبطاقة الضيف رقمها كما وصل.
  const red = live.locator('.mc-stat-compare', { hasText: 'بطاقات حمراء' });
  await expect(red.locator('.mc-stat-side-none')).toHaveCount(1);
  await expect(red).toContainText('١');

  await expectNoSourceTextOutsideDocs(page);
  for (const width of [390, 1440]) await expectNoOverflow(page, width);
});

test('after the final whistle «مباشر» disappears and «بعد المباراة» takes its place', async ({ page }) => {
  const base = livePayload();
  await openMatchCenter(page, {
    ...base,
    status: { type: { name: 'STATUS_FULL_TIME', state: 'post', completed: true }, displayClock: "90'" },
  });
  await expect(page.locator('[role="tab"]')).toHaveText(['قبل المباراة', 'بعد المباراة']);
  await expect(page.locator('#mc-tab-live')).toHaveCount(0);
  await expect(page.locator('#mc-panel-postmatch')).toBeVisible();
  await expect(page.locator('#mc-panel-postmatch .mc-possession')).toBeVisible();
  // بعد النهاية تثبت المقارنة بمتوسط الدوري أرشيفاً ختامياً بالأرقام نفسها.
  await expect(page.locator('#mc-panel-postmatch .mc-benchmark')).toBeVisible();
  await expect(page.locator('#mc-panel-postmatch .mc-benchmark')).toContainText('مباراة موثقة');
});
