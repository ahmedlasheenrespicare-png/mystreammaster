import test from 'node:test';
import assert from 'node:assert/strict';
<<<<<<< HEAD
import {
  PITCH_POSITION_CODES, headToHeadSummary, lineupPitchSides, pitchCounters, positionLabelAr, possessionSplit,
  previewFacts, previewPlacement, unavailableDataNotes,
} from '../src/lib/match-center.mjs';
=======
import { lineupPitchSides, unavailableDataNotes } from '../src/lib/match-center.mjs';
>>>>>>> c1d9318 (Merge pull request #66 from ahmedlasheenrespicare-png/arena/cb70c0cb-mystreammaster)
import { adaptSnapshot } from '../src/lib/match-center-transport.mjs';
import { MATCH_CENTER_ALL_MATCHES } from '../src/content/match-center.mjs';
import { pitchLineupPayload } from '../tests/fixtures/pitch-lineups.mjs';
const match = MATCH_CENTER_ALL_MATCHES.find(match => match.slug === 'manchester-city-ipswich-town');
const read = (payload = pitchLineupPayload()) => lineupPitchSides({ match, snapshot: adaptSnapshot(payload, match) });
const allPlayers = side => [...side.rows.flatMap(row => row.players), ...side.substitutes];

test('confirmed source-role XI is static, twelve events do not replace the outgoing starter', () => {
  const sides = read();
  assert.equal(sides.length, 2);
  for (const side of sides) assert.equal(side.rows.flatMap(row => row.players).length, 11);
  assert.equal(sides[0].substitutes[0].id, 'h11');
  const scorer = allPlayers(sides[0]).find(player => player.id === 'h10');
  assert.deepEqual(scorer.badges.map(b => b.event.id), ['goal', 'yellow', 'red', 'cancelled', 'sub']);
  assert.equal(scorer.badges[1].minute, '45+2′');
  assert.equal(scorer.badges.at(-1).role, 'خروج');
  assert.equal(sides[0].substitutes[0].badges[0].role, 'دخول');
  assert.equal(sides[0].substitutes[0].badges[1].minute, '90+3′');
  assert.equal(sides[0].substitutes[0].badges[1].typeLabel, 'هدف');
  assert.equal(scorer.badges[3].event.cancelled, true);
  assert.deepEqual(allPlayers(sides[1]).flatMap(player => player.badges), []);
});
test('unlinked IDs, name-only, wrong-side/team, untimed, other and delay events never become player overlays', () => {
  const ids = read().flatMap(allPlayers).flatMap(player => player.badges.map(b => b.event.id));
  for (const id of ['unlinked', 'wrong-side', 'no-id', 'wrong-team-id', 'untimed', 'silent', 'other']) assert.ok(!ids.includes(id), id);
});
test('grouping does not interpret formationPlace or mutate the snapshot', () => {
  const payload = pitchLineupPayload();
  payload.lineups.home.starters.forEach(p => { p.formationPlace = '999'; });
  const before = JSON.stringify(payload); read(payload);
  assert.equal(JSON.stringify(payload), before);
  assert.equal(read(payload)[0].rows[0].players[0].positionCode, 'G');
});
test('unknown positions never get guessed, and an absent opponent remains absent', () => {
  const payload = pitchLineupPayload();
  payload.lineups.home.starters[0].positionCode = 'unverified';
  assert.deepEqual(read(payload).map(s => s.side), ['away']);
  payload.lineups.home = null;
  assert.deepEqual(read(payload).map(s => s.side), ['away']);
});
test('identity mismatches and duplicate players fail closed, not by array order or name', () => {
  for (const mutate of [p => p.lineups.provider = 'snapshot', p => p.lineups.eventId = '401879258',
    p => p.lineups.home.teamId = '373', p => p.lineups.home.starters[1].id = 'h0',
    p => p.lineups.away.starters[0].id = 'h0', p => p.lineups.home.substitutes[0].id = 'h0',
    p => p.lineups.home.starters.pop(), p => p.lineups.home.starters.push({ id: 'extra' })]) {
    const payload = pitchLineupPayload(); mutate(payload); assert.deepEqual(read(payload), []);
  }
});
test('expected and absent XI never drawn; a legitimate pre-match XI gets no future event overlays', () => {
  const payload = pitchLineupPayload();
  payload.lineups.home.confirmed = false; payload.lineups.away.confirmed = false;
  assert.deepEqual(read(payload), []);
  payload.lineups = null; assert.deepEqual(read(payload), []);
  const pre = pitchLineupPayload(); pre.status.type = { name: 'STATUS_SCHEDULED', state: 'pre', completed: false };
  assert.equal(read(pre).length, 2);
  assert.deepEqual(read(pre).flatMap(allPlayers).flatMap(p => p.badges), []);
});
test('duplicate source events do not repeat the same badge; null rating stays null', () => {
  const payload = pitchLineupPayload(); payload.events.push(payload.events[0]);
  const player = allPlayers(read(payload)[0]).find(p => p.id === 'h10');
  assert.equal(player.badges.filter(b => b.event.id === 'goal').length, 1);
  assert.equal(player.rating, null);
});
test('missing-data text describes this read, not a blanket claim that source cannot supply lineups', () => {
  const snapshot = adaptSnapshot(pitchLineupPayload(), match);
  assert.ok(!unavailableDataNotes(snapshot).some(n => n.id === 'lineups'));
  snapshot.lineups = null;
  assert.match(unavailableDataNotes(snapshot).find(n => n.id === 'lineups').text, /القراءة الحالية/);
});
<<<<<<< HEAD

/* ── المرحلة أ: المعاينة على الملعب حتى صدور التشكيلة، واسم المركز بالعربية ── */

test('the preview lives on the pitch until the pitch draws a lineup, then moves to the panel', () => {
  assert.equal(previewPlacement({ match, snapshot: null }), 'pitch', 'before any read: on the pitch');
  const payload = pitchLineupPayload();
  assert.equal(previewPlacement({ match, snapshot: adaptSnapshot(payload, match) }), 'panel', 'drawn XI replaces it');
  // تشكيلة «مؤكدة» لا يرسمها الملعب (معرّف حدث آخر) لا تُخلي الملعب من المعاينة.
  payload.lineups.eventId = '401879258';
  assert.equal(previewPlacement({ match, snapshot: adaptSnapshot(payload, match) }), 'pitch');
  const partial = pitchLineupPayload();
  partial.lineups.home = null;
  assert.equal(previewPlacement({ match, snapshot: adaptSnapshot(partial, match) }), 'panel', 'one drawable side is enough');
  // المرحلة تحسم أيضاً: مع الانطلاق يصير الملعب للأحداث والنتيجة ولو لم تصل تشكيلة قط.
  for (const phase of ['live', 'post', 'terminal']) {
    assert.equal(previewPlacement({ match, snapshot: null, status: { phase } }), 'panel', phase);
  }
  assert.equal(previewPlacement({ match, snapshot: null, status: { phase: 'pre', code: 'scheduled' } }), 'pitch');
  assert.equal(previewPlacement({ match, snapshot: null, status: { code: 'unknown' } }), 'pitch', 'unknown status behaves as pre-match');
});

test('preview facts are one source of truth: six ids at most, nothing invented, kickoff hidden when not showable', () => {
  const facts = previewFacts(match, null, { phase: 'pre', code: 'scheduled' });
  assert.deepEqual(facts.map(fact => fact.id).filter(id => !['competition', 'season', 'round', 'venue', 'cairo', 'mecca'].includes(id)), []);
  assert.ok(facts.some(fact => fact.id === 'competition'));
  assert.ok(facts.every(fact => typeof fact.label === 'string' && fact.label && typeof fact.value === 'string' && fact.value));
  // الملعب من اللقطة حين تصل، ومن التعريف قبلها؛ `null` في اللقطة يُسقط الخلية بدل الرجوع إلى تخمين.
  assert.equal(previewFacts({ ...match, venue: 'Static Venue' }, null, null).find(f => f.id === 'venue')?.value, 'Static Venue');
  assert.equal(previewFacts({ ...match, venue: 'Static Venue' }, { venue: null }, null).find(f => f.id === 'venue'), undefined);
  // موعد ملغى/مؤجل لا يُعرض؛ تاريخ تالف لا يرمي.
  assert.equal(previewFacts(match, null, { phase: 'terminal', code: 'postponed' }).find(f => f.id === 'cairo'), undefined);
  assert.doesNotThrow(() => previewFacts({ ...match, kickoffUtc: 'nonsense' }, null, { phase: 'pre', code: 'scheduled' }));
  assert.deepEqual(previewFacts(null, null, null), []);
});

test('every pitch role code has an Arabic label; unknown codes stay bare', () => {
  assert.equal(PITCH_POSITION_CODES.length, 21);
  for (const code of PITCH_POSITION_CODES) assert.equal(typeof positionLabelAr(code), 'string', code);
  assert.equal(positionLabelAr('G'), 'حارس المرمى');
  assert.equal(positionLabelAr('CD-R'), 'قلب دفاع أيمن');
  assert.equal(positionLabelAr('cf-l'), 'مهاجم أيسر');
  assert.equal(positionLabelAr('SW'), null);
  assert.equal(positionLabelAr(''), null);
  assert.equal(positionLabelAr(null), null);
});

test('head-to-head summary counts only what the rows say and hides itself on any unattributable row', () => {
  const rows = [
    { date: '2026-01-17', home: 'نوتنجهام فورست', away: 'أرسنال', homeGoals: 0, awayGoals: 0, completed: true },
    { date: '2025-09-13', home: 'أرسنال', away: 'نوتنجهام فورست', homeGoals: 3, awayGoals: 0, completed: true },
    { date: '2025-02-26', home: 'نوتنجهام فورست', away: 'أرسنال', homeGoals: 0, awayGoals: 0, completed: true },
  ];
  assert.deepEqual(headToHeadSummary(rows, 'نوتنجهام فورست', 'أرسنال'), { homeWins: 0, draws: 2, awayWins: 1, total: 3 });
  assert.deepEqual(headToHeadSummary(rows, 'أرسنال', 'نوتنجهام فورست'), { homeWins: 1, draws: 2, awayWins: 0, total: 3 });
  // صف بفائز لا يطابق أحد الطرفين ⇒ لا سطر إطلاقاً، لا «أخرى» ولا تقريب.
  assert.equal(headToHeadSummary([...rows, { date: '2024-05-01', home: 'Other FC', away: 'أرسنال', homeGoals: 2, awayGoals: 1, completed: true }], 'نوتنجهام فورست', 'أرسنال'), null);
  // صف بلا نتيجة لا يُعدّ أصلاً (مُرشَّح من العرض) ولا يكسر السطر.
  assert.deepEqual(headToHeadSummary([...rows, { date: '2024-05-01', home: 'أرسنال', away: 'نوتنجهام فورست', homeGoals: null, awayGoals: null }], 'نوتنجهام فورست', 'أرسنال'), { homeWins: 0, draws: 2, awayWins: 1, total: 3 });
  assert.equal(headToHeadSummary([], 'A', 'B'), null);
  assert.equal(headToHeadSummary(rows, '', 'أرسنال'), null);
  assert.equal(headToHeadSummary(rows, 'أرسنال', 'أرسنال'), null);
  // في الإنتاج أسماء الصفوف إنجليزية من المصدر والاسم المعروض عربي: النسبة بمعرّف الفريق أولاً ثم باسم المصدر.
  const sourceRows = [
    { date: '2026-01-17', home: 'Nottingham Forest', away: 'Arsenal', homeTeamId: '393', awayTeamId: '359', homeGoals: 0, awayGoals: 0, completed: true },
    { date: '2025-09-13', home: 'Arsenal', away: 'Nottingham Forest', homeTeamId: '359', awayTeamId: '393', homeGoals: 3, awayGoals: 0, completed: true },
  ];
  const forest = { name: 'نوتنجهام فورست', sourceName: 'Nottingham Forest', externalIds: { espn: '393' } };
  const arsenal = { name: 'أرسنال', sourceName: 'Arsenal', externalIds: { espn: '359' } };
  assert.deepEqual(headToHeadSummary(sourceRows, forest, arsenal), { homeWins: 0, draws: 1, awayWins: 1, total: 2 });
  // بلا معرّفات في الصفوف: اسم المصدر يكفي، بغض النظر عن حالة الأحرف.
  const nameOnly = sourceRows.map(({ homeTeamId, awayTeamId, ...row }) => ({ ...row, home: row.home.toUpperCase() }));
  assert.deepEqual(headToHeadSummary(nameOnly, forest, arsenal), { homeWins: 0, draws: 1, awayWins: 1, total: 2 });
  // معرّف فريق ثالث يفوز ⇒ لا سطر؛ وطرفان بالمعرّف نفسه ⇒ لا سطر.
  assert.equal(headToHeadSummary([{ ...sourceRows[1], homeTeamId: '999', home: 'Other' }], forest, arsenal), null);
  assert.equal(headToHeadSummary(sourceRows, forest, { ...arsenal, externalIds: { espn: '393' } }), null);
});

test('pitch counters come from the statistics table only; null hides the pill, no statistics hides the row', () => {
  const statistics = [
    { key: 'yellowCards', label: 'بطاقات صفراء', unit: '', home: 2, away: null },
    { key: 'redCards', label: 'بطاقات حمراء', unit: '', home: 0, away: 1 },
    { key: 'wonCorners', label: 'الركنيات', unit: '', home: 4, away: 7 },
  ];
  assert.deepEqual(pitchCounters(statistics, 'home').map(c => [c.id, c.value]), [['yellow', 2], ['red', 0], ['corners', 4]]);
  assert.deepEqual(pitchCounters(statistics, 'away').map(c => [c.id, c.value]), [['red', 1], ['corners', 7]]);
  assert.deepEqual(pitchCounters(null, 'home'), []);
  assert.deepEqual(pitchCounters([{ key: 'totalShots', label: 'x', home: 1, away: 2 }], 'home'), []);
  assert.deepEqual(pitchCounters(statistics, 'unknown'), []);
});

test('the possession bar needs both numbers; widths are shares of their sum, the figures stay as sent', () => {
  assert.equal(possessionSplit(null), null);
  assert.equal(possessionSplit([{ key: 'possessionPct', label: 'الاستحواذ', unit: '%', home: 58, away: null }]), null);
  const split = possessionSplit([{ key: 'possessionPct', label: 'الاستحواذ', unit: '%', home: 47.2, away: 52.8 }]);
  assert.deepEqual([split.home, split.away], [47.2, 52.8]);
  assert.ok(Math.abs(split.homeShare + split.awayShare - 1) < 1e-9);
  // مجموع لا يبلغ 100 بسبب التقريب: الأرقام كما هي، والشريط منسوب إلى المجموع.
  const rounded = possessionSplit([{ key: 'possessionPct', label: 'الاستحواذ', unit: '%', home: 60, away: 39 }]);
  assert.deepEqual([rounded.home, rounded.away], [60, 39]);
  assert.ok(Math.abs(rounded.homeShare - 60 / 99) < 1e-9);
  assert.equal(possessionSplit([{ key: 'possessionPct', label: 'الاستحواذ', unit: '%', home: 0, away: 0 }]), null);
});
=======
>>>>>>> c1d9318 (Merge pull request #66 from ahmedlasheenrespicare-png/arena/cb70c0cb-mystreammaster)
