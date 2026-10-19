import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EVENT_FILTER_ALL,
  EVENT_TYPE_LABELS,
  STAT_GROUPS,
  activeEventFilterCount,
  analysisIsAvailable,
  compareStatRow,
  computeAvailableTabs,
  confirmedLineupSides,
  describeEvent,
  displayableHeadToHead,
  displayableStatistics,
  eventFilterOptions,
  eventKey,
  eventMinuteLabel,
  eventOnTimeline,
  eventPeriodInfo,
  eventPeriodLabel,
  eventTypeFacet,
  benchmarkDirection,
  filterEvents,
  groupIndex,
  groupStatistics,
  leagueBenchmark,
  headToHeadFor,
  normalizeEvent,
  normalizeStatus,
  renderableEvents,
  summarizeSourceEvents,
  unavailableDataNotes,
} from '../src/lib/match-center.mjs';

/* ==========================================================================
   قسم «تحليل المباراة»: كل ما يُعرض قرارٌ في العقد، لا في المكوّن
   --------------------------------------------------------------------------
   تُختبر هنا ثلاث مجموعات من القواعد:
   • الأرقام: تُجمَّع وتُقارَن قيمتيها، بلا صفرٍ للاكتمال وبلا لفظ «الأفضل».
   • الفلاتر: تُشتق من أحداث المصدر ولا تُظهر خياراً ميتاً ولا توقظ توقفات
     المباراة (`Start Delay`/`End Delay`) التي تُخفى في العقد أصلاً.
   • التوافر: التبويب الذي لا بيانات له لا يوجد في القائمة إطلاقاً.
========================================================================== */

const STAT_INPUT = [
  { key: 'possessionPct', label: 'الاستحواذ', unit: '%', home: 58, away: 42 },
  { key: 'passPct', label: 'دقة التمرير', unit: '%', home: 84, away: 79 },
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

function eventsFrom(raw) {
  return raw.map(item => normalizeEvent(item));
}

const RAW_EVENTS = [
  { id: 'e1', type: 'Goal', minute: 12, period: { number: 1 }, team: { name: 'Home FC', homeAway: 'home' }, player: { id: 'p1', name: 'Scorer' } },
  { id: 'e2', type: 'Yellow Card', minute: 31, period: { number: 1 }, team: { name: 'Away FC', homeAway: 'away' }, player: { id: 'p2', name: 'Midfielder' } },
  { id: 'e3', type: 'Goal', minute: 45, extraMinute: 2, period: { number: 1 }, team: { name: 'Home FC', homeAway: 'home' }, player: { id: 'p1', name: 'Scorer' } },
  { id: 'e4', type: 'Substitution', minute: 60, period: { number: 2 }, team: { name: 'Away FC', homeAway: 'away' }, player: { id: 'p3', name: 'In' }, assist: { id: 'p4', name: 'Out' } },
  { id: 'e5', type: 'Goal', minute: 66, period: { number: 2 }, cancelled: true, team: { name: 'Away FC', homeAway: 'away' }, player: { id: 'p5', name: 'Striker' } },
  { id: 'e6', type: 'Possession sequence', minute: 81, period: { number: 2 }, team: { name: 'Away FC', homeAway: 'away' }, player: { id: 'p6', name: 'Winger' } },
  { id: 'e7', type: 'Tactical review', minute: null, period: null, team: null, player: null, detail: 'Coach review' },
  { id: 'd1', type: 'Start Delay', minute: 49, period: { number: 2 }, team: { name: 'Home FC', homeAway: 'home' } },
  { id: 'd2', type: 'End Delay', minute: 50, period: { number: 2 }, team: { name: 'Home FC', homeAway: 'home' } },
];

/* ── 1) تجميع الأرقام ───────────────────────────────────────────────── */

test('statistics arrive in the six scanning groups, in one fixed order', () => {
  const groups = groupStatistics(STAT_INPUT);
  // المجموعة التي لا يصلها صف لا تُنشأ: العينة بلا تدخلات/اعتراضات/تشتيت ⇒ لا «الدفاع».
  assert.deepEqual(groups.map(group => group.id), ['possession-passing', 'shots', 'build-up', 'goalkeeping', 'discipline']);
  assert.deepEqual(groups.map(group => group.label), ['الاستحواذ والتمرير', 'التسديد', 'بناء الهجمة', 'حراسة المرمى', 'الانضباط']);
  assert.deepEqual(STAT_GROUPS.map(group => group.id), ['possession-passing', 'shots', 'build-up', 'defense', 'goalkeeping', 'discipline']);
  assert.deepEqual(groups[1].rows.map(row => row.key), ['totalShots', 'shotsOnTarget', 'blockedShots']);
  // الركنيات انتقلت إلى «بناء الهجمة»؛ والانضباط بترتيب التعريف لا بترتيب
  // الاستجابة: يُقرأ الصف بالمكان نفسه في كل مباراة، ولو بدّل المصدر ترتيبه.
  assert.deepEqual(groups[2].rows.map(row => row.key), ['wonCorners']);
  assert.deepEqual(groups[4].rows.map(row => row.key), STAT_GROUPS.find(group => group.id === 'discipline').keys);
  // المفاتيح الـ28 كلها معرَّفة في مجموعة واحدة بالضبط.
  const keys = STAT_GROUPS.flatMap(group => group.keys);
  assert.equal(keys.length, 28);
  assert.equal(new Set(keys).size, 28);
});

test('all 28 source names land in their groups with the full defence block', () => {
  const full = [
    'possessionPct', 'totalPasses', 'accuratePasses', 'passPct', 'totalShots', 'shotsOnTarget', 'blockedShots', 'shotPct',
    'penaltyKickShots', 'penaltyKickGoals', 'totalCrosses', 'accurateCrosses', 'crossPct', 'totalLongBalls', 'accurateLongBalls',
    'longballPct', 'wonCorners', 'totalTackles', 'effectiveTackles', 'tacklePct', 'interceptions', 'totalClearance',
    'effectiveClearance', 'saves', 'foulsCommitted', 'offsides', 'yellowCards', 'redCards',
  ].map((key, index) => ({ key, label: `صف ${index}`, unit: key.endsWith('Pct') ? '%' : '', home: index, away: 28 - index }));
  const groups = groupStatistics(full);
  assert.deepEqual(groups.map(group => group.id), STAT_GROUPS.map(group => group.id));
  assert.equal(groups.reduce((count, group) => count + group.rows.length, 0), 28);
  assert.deepEqual(groups.find(group => group.id === 'defense').rows.map(row => row.key),
    ['totalTackles', 'effectiveTackles', 'tacklePct', 'interceptions', 'totalClearance', 'effectiveClearance']);
  for (const row of groups.flatMap(group => group.rows)) assert.equal(row.unitIsPercent, row.key.endsWith('Pct'));
});

test('a stat the grouping does not know is kept in a source bucket, never dropped', () => {
  const groups = groupStatistics([
    { key: 'distanceKm', label: 'المسافة المقطوعة', unit: 'كم', home: 108, away: 104 },
  ]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].id, 'source-other');
  assert.equal(groups[0].rows[0].label, 'المسافة المقطوعة');
});

/* ── 1ب) ميزان المجموعة: متوسط الحصة + عدّ الصفوف، بلا حكم ─────────────── */

test('group index is the mean of unit-free row shares, printed as complements of 100', () => {
  const groups = groupStatistics(STAT_INPUT);
  const possession = groups.find(group => group.id === 'possession-passing');
  // حصة المضيف: 58/100 ثم 84/163 ⇒ متوسطهما 0.5476… والعرض 55 مقابل 45.
  assert.ok(Math.abs(possession.index.meanHome - (0.58 + 84 / 163) / 2) < 1e-12);
  assert.equal(possession.index.pctHome, 55);
  assert.equal(possession.index.pctAway, 45);
  assert.equal(possession.index.pctHome + possession.index.pctAway, 100);
  // عدّ الصفوف في الانضباط: المضيف أعلى في التسلل وحده، والضيف في الأخطاء والصفراء.
  const discipline = groups.find(group => group.id === 'discipline');
  assert.deepEqual(discipline.index.tally, { home: 1, away: 2, equal: 0 });
  // «بطاقات حمراء» وصل طرفها الآخر وحده ⇒ خارج المتوسط ومعدود في الأساس.
  assert.equal(discipline.index.comparable, 3);
  assert.equal(discipline.index.unavailable, 1);
  assert.equal(discipline.index.pctHome, 44);
  assert.equal(discipline.index.pctAway, 56);
  // مجموعة بصف واحد قابل للمقارنة أساسها ضيّق ومُعلن.
  assert.equal(groups.find(group => group.id === 'goalkeeping').index.single, true);
  assert.equal(groups.find(group => group.id === 'possession-passing').index.single, false);
  // المجموعة الاحتياطية لها ميزان كبقية المجموعات.
  const other = groupStatistics([{ key: 'distanceKm', label: 'المسافة', unit: 'كم', home: 108, away: 104 }]);
  assert.equal(other[0].index.pctHome, 51);
  assert.equal(other[0].index.pctAway, 49);
});

test('group index: real zeros are equal halves and counted, absent sides never enter', () => {
  const index = groupIndex([
    compareStatRow({ key: 'a', label: 'أ', unit: '', home: 0, away: 0 }),
    compareStatRow({ key: 'b', label: 'ب', unit: '', home: 3, away: 1 }),
    compareStatRow({ key: 'c', label: 'ج', unit: '', home: null, away: 4 }),
  ]);
  // صفر/صفر نصف (0.5) لا صفر: 0.5 و0.75 ⇒ 0.625 ⇒ 63 مقابل 37.
  assert.equal(index.zeroZero, 1);
  assert.equal(index.meanHome, 0.625);
  assert.equal(index.pctHome, 63);
  assert.equal(index.pctAway, 37);
  assert.equal(index.comparable, 2);
  assert.equal(index.unavailable, 1);
  assert.deepEqual(index.tally, { home: 1, away: 0, equal: 1 });
});

/* ── 1ج) مقارنة بمتوسط الدوري: كمية مقابل أساس معلن، لا حكم ───────────── */

const LEAGUE_AVERAGES = { matches: 25, possession: 50, shots: 14.2, passAccuracy: 81.2 };

test('league benchmark compares each side with the documented average, side by side', () => {
  const benchmark = leagueBenchmark([
    { key: 'possessionPct', label: 'الاستحواذ', unit: '%', home: 41.8, away: 58.2 },
    { key: 'totalShots', label: 'التسديدات', unit: '', home: 9, away: 17 },
    { key: 'passPct', label: 'دقة التمرير', unit: '%', home: 76.1, away: null },
  ], LEAGUE_AVERAGES);
  assert.equal(benchmark.matches, 25);
  assert.deepEqual(benchmark.rows.map(row => row.key), ['possessionPct', 'totalShots', 'passPct']);
  const possession = benchmark.rows[0];
  assert.equal(possession.average, 50);
  assert.equal(possession.home.value, 41.8);
  // الفارق دقيق قبل التقريب؛ والتقريب مهمة العرض وحده.
  assert.ok(Math.abs(possession.home.delta - (41.8 - 50)) < 1e-12);
  assert.equal(benchmarkDirection(possession.home.delta), 'below');
  assert.equal(benchmarkDirection(possession.away.delta), 'above');
  // طرف بلا رقم يبقى «غير متاح» ولا يُستكمل صفراً ولا يُحسب فرقه.
  const passing = benchmark.rows[2];
  assert.equal(passing.home.value, 76.1);
  assert.equal(passing.away, null);
  // مقياس بلا رقم عند الطرفين لا يدخل المقارنة أصلاً.
  const silent = leagueBenchmark([{ key: 'totalShots', label: 'التسديدات', unit: '', home: null, away: null }], LEAGUE_AVERAGES);
  assert.equal(silent, null);
});

test('league benchmark refuses to speak without a documented base', () => {
  assert.equal(leagueBenchmark(STAT_INPUT, null), null);
  assert.equal(leagueBenchmark(STAT_INPUT, {}), null);
  assert.equal(leagueBenchmark(STAT_INPUT, { matches: 0, possession: 50 }), null);
  // اتجاه الفارق المقرّب منزلة واحدة: فرق أصغر من ٠٫٠٥ «عند المتوسط تقريباً».
  assert.equal(benchmarkDirection(0), 'equal');
  assert.equal(benchmarkDirection(0.04), 'equal');
  assert.equal(benchmarkDirection(-0.1), 'below');
  assert.equal(benchmarkDirection(2.96), 'above');
  assert.equal(benchmarkDirection(null), null);
});

test('group index refuses to speak for a group with no comparable row', () => {
  assert.equal(groupIndex(null), null);
  assert.equal(groupIndex([]), null);
  assert.equal(groupIndex([compareStatRow({ key: 'a', label: 'أ', unit: '', home: 5, away: null })]), null);
  // المجموعة تُرسم بصفوفها الناقصة لكن بلا ميزان: نصفها اختلاق فلا مؤشر.
  const groups = groupStatistics([
    { key: 'totalTackles', label: 'التدخلات', unit: '', home: null, away: 7 },
    { key: 'interceptions', label: 'الاعتراضات', unit: '', home: 5, away: null },
  ]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].index, null);
});

test('an empty or malformed statistic list produces no group at all', () => {
  assert.deepEqual(groupStatistics(null), []);
  assert.deepEqual(groupStatistics([]), []);
  // بلا أرقام الطرفين معاً لا مادة للعرض: صف بـ`label` وحده لا يُنشئ مجموعة.
  assert.deepEqual(groupStatistics([{ key: 'x', label: 'فارغة', home: null, away: null }]), []);
  assert.deepEqual(displayableStatistics([{ key: 'x', label: '  ', home: 1, away: 2 }]), []);
});

test('a missing value stays missing: null is never rendered as zero and never padded', () => {
  const row = compareStatRow({ key: 'redCards', label: 'بطاقات حمراء', unit: '', home: null, away: 0 });
  assert.equal(row.home, null, 'a side the source did not send is null, not 0');
  assert.equal(row.away, 0, 'a genuine zero from the source stays zero');
  assert.equal(row.both, false);
  assert.equal(row.difference, null, 'no difference can be computed against an absent value');
  assert.deepEqual(row.bar, { home: null, away: null }, 'بلا طرفين لا مقارنة: لا يُرسم شريط لنصف صف');
});

test('comparison exposes quantity only — the contract has no word for better', () => {
  const row = compareStatRow({ key: 'foulsCommitted', label: 'الأخطاء', unit: '', home: 9, away: 14 });
  assert.equal(row.difference, 5);
  assert.equal(row.leadingSide, 'away', 'the larger number is named as a quantity, not a virtue');
  assert.deepEqual(Object.keys(row).sort(), [
    'away', 'bar', 'both', 'comparable', 'difference', 'home', 'key', 'label', 'leadingSide', 'unit', 'unitIsPercent',
  ].sort());
  // لا حقل «أفضل» ولا «أفضلية» ولا «فريق رابح» في أي صف.
  assert.equal('better' in row, false);
  assert.equal('winner' in row, false);
  assert.equal(row.unitIsPercent, false);
  for (const label of Object.values(EVENT_TYPE_LABELS)) {
    assert.doesNotMatch(label, /أفضل|أفضلية|الأقوى|بهيجة/, `event label must not judge: ${label}`);
  }
});

test('two real zeros are equal, and are not normalised into full bars', () => {
  const row = compareStatRow({ key: 'redCards', label: 'بطاقات حمراء', home: 0, away: 0 });
  assert.equal(row.difference, 0);
  assert.equal(row.leadingSide, null);
  assert.deepEqual(row.bar, { home: 0.5, away: 0.5 });
});

test('the bar is a share of the larger value in the same row, not a score out of 100', () => {
  const shots = compareStatRow({ key: 'shotsOnTarget', label: 'على المرمى', home: 4, away: 2 });
  assert.deepEqual(shots.bar, { home: 1, away: 0.5 });
  const possession = compareStatRow({ key: 'possessionPct', label: 'الاستحواذ', unit: '%', home: 58, away: 42 });
  assert.equal(possession.unitIsPercent, true);
  assert.ok(possession.bar.home > 0.99 && possession.bar.home <= 1);
});

/* ── 2) أحداث المصدر: الوصف والعدّ والفلاتر ───────────────────────── */

test('event wording is one source for the pitch and the analysis panel', () => {
  const [goal, yellow, addedTime, substitution, cancelled, unclassified, untimed] = eventsFrom(RAW_EVENTS);
  assert.equal(eventMinuteLabel(goal), '12′');
  assert.equal(eventMinuteLabel(addedTime), '45+2′');
  assert.equal(eventMinuteLabel(untimed), null, 'no minute from the source means no invented number');
  assert.equal(eventMinuteLabel({ minute: -1 }), null);
  assert.equal(describeEvent(yellow), '31′ · بطاقة صفراء · الضيف · Away FC · Midfielder');
  assert.equal(describeEvent(substitution).includes('لاعب مرتبط: Out'), true);
  assert.equal(describeEvent(cancelled).includes('ملغى من المصدر'), true);
  assert.equal(describeEvent(goal).startsWith('12′ · هدف · المضيف'), true);
  assert.equal(describeEvent(unclassified).includes('Possession sequence'), true, 'an unknown type keeps the source wording');
  assert.equal(describeEvent({}), null, 'nothing to say is null, not an empty string');
});

test('period labels come from the source number, and an unknown period is not guessed', () => {
  const [first, second] = [eventsFrom(RAW_EVENTS)[0], eventsFrom(RAW_EVENTS)[3]];
  assert.equal(eventPeriodLabel(first), 'الشوط الأول');
  assert.equal(eventPeriodLabel(second), 'الشوط الثاني');
  assert.deepEqual(eventPeriodInfo('7'), { value: '7', label: '7', classified: false });
  assert.equal(eventPeriodLabel({ period: null }), null);
});

test('a marker exists on the strip only when the source sent a minute', () => {
  const [goal, , , , , , untimed] = eventsFrom(RAW_EVENTS);
  assert.equal(eventOnTimeline(goal), true);
  assert.equal(eventOnTimeline(untimed), false);
  const delay = eventsFrom(RAW_EVENTS).find(event => event.type === 'other' && event.sourceType === 'Start Delay');
  assert.equal(eventOnTimeline(delay), false, 'a stoppage is never on the timeline at all');
});

test('counts are facts about the payload: stoppages excluded, cancellations and untimed rows counted', () => {
  const summary = summarizeSourceEvents(eventsFrom(RAW_EVENTS));
  assert.equal(summary.total, 7, 'two stoppages are filtered out of every count');
  assert.equal(summary.onTimeline, 6);
  assert.equal(summary.untimed, 1);
  assert.equal(summary.cancelled, 1);
  assert.deepEqual(summary.bySide, { home: 2, away: 4, unassigned: 1 });
  assert.equal(summary.firstMinute, 12);
  assert.equal(summary.lastMinute, 81);
  const goals = summary.types.find(entry => entry.value === 'goal');
  assert.equal(goals.count, 3, 'the disallowed goal is still an event the source sent — and is labelled cancelled');
  assert.equal(summary.cancelled, 1, 'the cancellation is counted separately, never folded into the score');
});

test('filter choices are derived from what the source actually sent', () => {
  const events = eventsFrom(RAW_EVENTS);
  const choices = eventFilterOptions(events, { homeName: 'Home FC', awayName: 'Away FC' });
  assert.deepEqual(choices.team.map(option => option.value), ['home', 'away', 'unassigned']);
  assert.deepEqual(choices.team.map(option => option.label), ['Home FC', 'Away FC', 'غير منسوب إلى طرف']);
  assert.deepEqual(choices.period.map(option => option.value), ['1', '2', 'none']);
  assert.deepEqual(choices.period.map(option => option.label), ['الشوط الأول', 'الشوط الثاني', 'شوط غير مبيَّن من المصدر']);
  // كل نوع وارد، ولا خيار بلا حدث يطابقه.
  assert.equal(choices.type.every(option => option.count > 0), true);
  assert.equal(choices.type.some(option => option.value === 'other:Possession sequence'), true);
  assert.equal(choices.type.some(option => option.value === 'other:Tactical review'), true);
  assert.equal(choices.total, 7);
});

test('filters match the same events the panel renders, and stoppages stay hidden', () => {
  const events = eventsFrom(RAW_EVENTS);
  assert.equal(filterEvents(events, { team: 'home' }).length, 2);
  assert.equal(filterEvents(events, { team: 'away' }).length, 4);
  assert.equal(filterEvents(events, { period: '1' }).length, 3);
  assert.equal(filterEvents(events, { type: 'goal' }).length, 3, 'including the goal the source disallowed');
  assert.equal(filterEvents(events, { type: 'other:Possession sequence' }).length, 1);
  assert.equal(filterEvents(events, { team: 'home', period: '1' }).length, 2);
  assert.equal(filterEvents(events, { team: 'away', period: '1' }).length, 1);
  assert.equal(filterEvents(events, { period: 'none' }).length, 1);
  assert.equal(filterEvents(events).length, renderableEvents(events).length, 'no filter shows every renderable event');
  assert.equal(filterEvents(events, { team: 'all', period: 'all', type: 'all' }).length, 7, 'explicit "all" equals no filter, and hides the two stoppages');
  for (const filters of [{ team: 'home' }, { period: '1' }, { type: 'goal' }, {}]) {
    const filtered = filterEvents(events, filters);
    assert.equal(filtered.some(event => /delay/i.test(event.sourceType || '')), false, `stoppage leaked through ${JSON.stringify(filters)}`);
  }
  assert.equal(filterEvents(null, { team: 'home' }).length, 0);
  assert.equal(filterEvents([null, undefined, 7], {}).length, 0);
});

test('the reset control knows whether anything is filtered', () => {
  assert.equal(activeEventFilterCount(), 0);
  assert.equal(activeEventFilterCount({ team: EVENT_FILTER_ALL, period: EVENT_FILTER_ALL, type: EVENT_FILTER_ALL }), 0);
  assert.equal(activeEventFilterCount({ team: 'home', period: EVENT_FILTER_ALL }), 1);
  assert.equal(activeEventFilterCount({ team: 'home', period: '1', type: 'goal' }), 3);
});

test('event keys survive a source that sends no ids, so selection stays stable', () => {
  const events = eventsFrom(RAW_EVENTS);
  assert.equal(eventKey('m1', events[0]), 'm1:e1');
  const anonymous = normalizeEvent({ type: 'Yellow Card', minute: 20, player: { name: 'No Id' } });
  assert.match(eventKey('m1', anonymous), /^m1:yellow_card:20:-:No Id$/);
});

/* ── 3) التوافر: التبويب الذي لا مادة له لا يُفتَح ────────────────── */

const MATCH = {
  id: 'sample-match',
  slug: 'sample-match',
  competitionSlug: 'league',
  competitionName: 'دوري المثال',
  leagueId: 'sample.1',
  season: '2026/27',
  round: 9,
  kickoffUtc: '2026-10-17T14:00:00Z',
  venue: 'ملعب المثال',
  home: { name: 'Home FC', shortName: 'Home', sourceName: 'Home FC', logo: null, externalIds: { espn: '1' } },
  away: { name: 'Away FC', shortName: 'Away', sourceName: 'Away FC', logo: null, externalIds: { espn: '2' } },
  verification: 'confirmed',
  externalIds: { espn: '900' },
};

function snapshotOf(overrides) {
  return {
    matchId: MATCH.id,
    provider: 'espn',
    readAt: '2026-10-17T15:00:00Z',
    status: normalizeStatus({ type: { name: 'STATUS_IN_PROGRESS', state: 'in' } }, 'espn'),
    score: { home: 2, away: 1 },
    events: [],
    statistics: null,
    lineups: null,
    ratings: null,
    h2h: [],
    form: null,
    logos: { home: null, away: null },
    venue: null,
    seasonComparison: null,
    seasonSample: null,
    ...overrides,
  };
}

test('the analysis tab exists only with real events or real numbers', () => {
  assert.equal(analysisIsAvailable(null), false);
  assert.equal(analysisIsAvailable(snapshotOf({})), false);
  assert.equal(analysisIsAvailable(snapshotOf({ events: eventsFrom(RAW_EVENTS) })), true);
  assert.equal(analysisIsAvailable(snapshotOf({ statistics: STAT_INPUT })), true);
});

test('a payload of only stoppages is not "data": the analysis tab stays closed', () => {
  const delays = eventsFrom([{ id: 'd1', type: 'Start Delay', minute: 49 }, { id: 'd2', type: 'End Delay', minute: 50 }]);
  assert.equal(renderableEvents(delays).length, 0);
  assert.equal(analysisIsAvailable(snapshotOf({ events: delays })), false);
  const tabs = computeAvailableTabs({ match: MATCH, snapshot: snapshotOf({ events: delays }), status: normalizeStatus({ type: { name: 'STATUS_IN_PROGRESS', state: 'in' } }, 'espn') });
  assert.equal(tabs.includes('postmatch'), false);
});

test('tab availability is computed from the snapshot, in one place for the whole page', () => {
  const liveStatus = normalizeStatus({ type: { name: 'STATUS_IN_PROGRESS', state: 'in' } }, 'espn');
  const tabs = computeAvailableTabs({
    match: MATCH,
    snapshot: snapshotOf({ events: eventsFrom(RAW_EVENTS), statistics: STAT_INPUT }),
    status: liveStatus,
  });
  assert.deepEqual(tabs, ['prematch', 'live']);
  // الأسماء القديمة لم تعد تبويبات؛ بعد المباراة ممنوع أثناء السير.
  assert.equal(tabs.includes('lineups'), false);
  assert.equal(tabs.includes('postmatch'), false);
  assert.equal(tabs.includes('history'), false);
});

test('pre-match facts and kickoff open only data-backed panels', () => {
  const scheduled = normalizeStatus({ type: { name: 'STATUS_SCHEDULED', state: 'pre' } }, 'espn');
  assert.deepEqual(computeAvailableTabs({ match: MATCH, snapshot: null, status: scheduled }), ['prematch', 'live']);
  const bare = computeAvailableTabs({
    match: { ...MATCH, competitionName: '', season: '', round: null, venue: null, kickoffUtc: 'not-a-date' },
    snapshot: null,
    status: scheduled,
  });
  assert.deepEqual(bare, [], 'a fixture with nothing to say shows no tablist at all');
});

test('the report tab needs an official result and something to report', () => {
  const finished = normalizeStatus({ type: { name: 'STATUS_FULL_TIME', state: 'post', completed: true } }, 'espn');
  assert.equal(computeAvailableTabs({ match: MATCH, snapshot: snapshotOf({ status: finished, statistics: STAT_INPUT }), status: finished }).includes('postmatch'), true);
  assert.equal(computeAvailableTabs({ match: MATCH, snapshot: snapshotOf({ status: finished }), status: finished }).includes('postmatch'), true);
  // نتيجة غير مؤكدة (مباراة متوقفة) لا تفتح «بعد المباراة».
  const suspended = normalizeStatus({ type: { name: 'STATUS_SUSPENDED', state: 'in' } }, 'espn');
  assert.equal(computeAvailableTabs({ match: MATCH, snapshot: snapshotOf({ status: suspended, statistics: STAT_INPUT }), status: suspended }).includes('postmatch'), false);
});

test('the record tab and the panel read the same head-to-head list', () => {
  const finished = normalizeStatus({ type: { name: 'STATUS_FULL_TIME', state: 'post', completed: true } }, 'espn');
  const snapshot = snapshotOf({ status: finished, h2h: [{ date: '2025-04-01T00:00:00Z', home: 'Home FC', away: 'Away FC', homeGoals: 1, awayGoals: 0, completed: true }] });
  const entries = headToHeadFor(MATCH, snapshot, finished);
  assert.equal(entries.length, 2, 'the completed fixture itself joins the record once');
  assert.equal(displayableHeadToHead(entries).length, 2);
  assert.equal(computeAvailableTabs({ match: MATCH, snapshot, status: finished }).includes('prematch'), true);

  const scheduled = normalizeStatus({ type: { name: 'STATUS_SCHEDULED', state: 'pre' } }, 'espn');
  assert.equal(headToHeadFor(MATCH, snapshotOf({ status: scheduled, h2h: [] }), scheduled).length, 0, 'the upcoming match is not yet in its own record');
});

test('lineup and rating sections stay closed while the provider sends nulls', () => {
  const snapshot = snapshotOf({ lineups: null, ratings: null });
  assert.deepEqual(confirmedLineupSides(snapshot.lineups), []);
  const notes = unavailableDataNotes(snapshot).map(note => note.id);
  assert.deepEqual(notes, ['lineups', 'ratings', 'comparison', 'spatial']);
  const withLineups = snapshotOf({
    lineups: {
      home: { confirmed: true, formation: '4-3-3', coach: 'مدرب', starters: [{ id: '1', name: 'حارس', rating: null }], substitutes: [] },
      away: { confirmed: false, formation: null, coach: null, starters: [], substitutes: [] },
    },
  });
  assert.equal(confirmedLineupSides(withLineups.lineups).length, 1, 'only a confirmed side counts');
  assert.equal(unavailableDataNotes(withLineups).some(note => note.id === 'lineups'), false, 'the section opened, so the apology must go away');
  // الإحداثيات وxG تظل مذكورة حتى مع وصول تشكيلات: لا يرسلهما المصدر مطلقاً.
  assert.equal(unavailableDataNotes(withLineups).some(note => note.id === 'spatial'), true);
});

test('phase gates preserve valid data and ignore snapshot status', () => {
  const snapshot = snapshotOf({ statistics: STAT_INPUT, events: eventsFrom(RAW_EVENTS) });
  const original = structuredClone(snapshot);
  for (const phase of ['pre', 'live', 'post', 'terminal']) {
    const tabs = computeAvailableTabs({ match: MATCH, snapshot, status: { phase } });
    assert.equal(tabs.includes('postmatch'), phase === 'post');
    assert.equal(tabs.includes('live'), phase === 'pre' || phase === 'live');
    assert.deepEqual(snapshot, original);
  }
});

test('postmatch retains final score alone and events alone without empty statistics', () => {
  const status = normalizeStatus({ type: { name: 'STATUS_FULL_TIME', state: 'post', completed: true } }, 'espn');
  for (const snapshot of [snapshotOf({ statistics: null }), snapshotOf({ score: null, events: eventsFrom(RAW_EVENTS) })]) {
    assert.equal(computeAvailableTabs({ match: MATCH, snapshot, status }).includes('postmatch'), true);
    assert.deepEqual(displayableStatistics(snapshot.statistics), []);
  }
  assert.equal(computeAvailableTabs({ match: MATCH, snapshot: snapshotOf({ score: null }), status }).includes('postmatch'), false);
});
