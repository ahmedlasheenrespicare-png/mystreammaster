import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ARCHIVE_LEAGUES, validateArchive, mergeArchive, archiveTeamStats, cleanTeamName, standingsRates, TACTIC_LABELS, computeLeagueAverages } from '../src/lib/fixtures-archive.mjs';
import { normalizeEspn, normalizeHighlightly, summaryStatistics, collect, dayRange } from './fetch-fixtures-archive.mjs';
import { publish, buildArchiveDeployReport } from './publish-fixtures-archive.mjs';
import { judgeEspnSummary, probeEspnSummary } from './probe-espn-summary.mjs';
const now = '2026-10-17T12:00:00.000Z';
const url = 'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?dates=20261017&limit=500';
const match = (extra = {}) => ({ id: '1', date: now, home: { id: 'h', name: 'Home' }, away: { id: 'a', name: 'Away' }, score: { home: 2, away: 0 }, status: 'finished', attendance: null, statistics: null, source: { provider: 'ESPN', leagueId: 'eng.1', url }, fetchedAt: now, ...extra });
const archive = matches => ({ schemaVersion: 1, league: 'eng.1', season: '2026', matches });
const espn = (league = 'eng.1', events) => ({ leagues: [{ slug: league }], events: events ?? [{ id: '1', date: now, season: { year: 2026 }, status: { type: { completed: true, state: 'post' } }, competitions: [{ attendance: 0, competitors: [{ homeAway: 'home', team: { id: 'h', displayName: 'Home' }, score: '2' }, { homeAway: 'away', team: { id: 'a', displayName: 'Away' }, score: '0' }] }] }] });
const response = raw => ({ ok: true, json: async () => raw });
async function temporary(t) { const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'fixtures-test-')); t.after(() => fs.rm(dir, { recursive: true, force: true })); return dir; }
test('exact 12 competitions; Saudi fixtures and standings identifiers never alias', () => {
  assert.equal(ARCHIVE_LEAGUES.length, 12); assert(ARCHIVE_LEAGUES.includes('sau.1')); assert(!ARCHIVE_LEAGUES.includes('ksa.1'));
  assert.throws(() => normalizeEspn(espn('ksa.1'), 'sau.1', url, now), /SOURCE_ID_MISMATCH/);
  assert.equal(normalizeEspn(espn('sau.1'), 'sau.1', url, now)[0].match.source.leagueId, 'sau.1');
});
test('ESPN retains zero attendance and unavailable values, never scheduled zero scores', () => {
  const raw = espn(); const m = normalizeEspn(raw, 'eng.1', url, now)[0].match;
  assert.equal(m.attendance, 0); assert.equal(m.statistics, null); assert.equal(m.score.away, 0);
  raw.events[0].status.type = { state: 'pre', completed: false };
  delete raw.events[0].competitions[0].attendance;
  const pre = normalizeEspn(raw, 'eng.1', url, now)[0].match;
  assert.equal(pre.attendance, null); assert.deepEqual(pre.score, { home: null, away: null });
});
test('Highlightly verifies Egyptian ID, pagination, source season and strict score shape', () => {
  const raw = { pagination: { totalCount: 1 }, data: [{ id: 9, date: now, league: { id: 199067, season: 2026 }, homeTeam: { id: 'h', name: 'H' }, awayTeam: { id: 'a', name: 'A' }, state: { description: 'Finished', score: { current: '2 - 0' } } }] };
  assert.deepEqual(normalizeHighlightly(raw, 'https://soccer.highlightly.net/matches?leagueId=199067', now)[0].match.score, { home: 2, away: 0 });
  raw.data[0].league.id = 199068; assert.throws(() => normalizeHighlightly(raw, '', now), /MISMATCH/);
});
for (const [name, mutate] of [
  ['empty', a => { a.matches = []; }], ['duplicate', a => a.matches.push(a.matches[0])],
  ['invalid team', a => { a.matches[0].home.id = ''; }], ['same teams', a => { a.matches[0].away.id = 'h'; }],
  ['non UTC', a => { a.matches[0].date = '2026-10-17'; }], ['negative attendance', a => { a.matches[0].attendance = -1; }],
  ['invalid score', a => { a.matches[0].score.home = 1.5; }], ['source mismatch', a => { a.matches[0].source.leagueId = 'ksa.1'; }],
  ['credential URL', a => { a.matches[0].source.url += '&key=secret'; }], ['missing attendance', a => { delete a.matches[0].attendance; }],
  ['invalid stats', a => { a.matches[0].statistics = { home: { possession: 101 }, away: {} }; }],
]) test(`validator rejects ${name}`, () => { const a = archive([match()]); mutate(a); assert.throws(() => validateArchive(a)); });
test('merge retains history, updates semantic values, ignores timestamp-only churn', () => {
  const old = archive([match(), match({ id: '2' })]);
  const identical = archive([match({ fetchedAt: '2026-10-18T12:00:00Z' })]);
  assert.deepEqual(mergeArchive(old, identical), old);
  identical.matches[0].attendance = 99;
  const changed = mergeArchive(old, identical); assert.equal(changed.matches.length, 2); assert.equal(changed.matches[0].attendance, 99);
});
test('home/away results, clean sheets and current chronological streaks; incomplete scores excluded', () => {
  const games = [match({ id: '3', date: '2026-10-19T12:00:00Z', score: { home: 0, away: 0 } }), match({ id: '2', date: '2026-10-18T12:00:00Z', score: { home: 1, away: 0 } }), match(), match({ id: '4', status: 'scheduled' }), match({ id: '5', score: { home: null, away: null } })];
  const h = archiveTeamStats(games).find(t => t.id === 'h');
  assert.equal(h.played, 3); assert.equal(h.home.wins, 2); assert.equal(h.cleanSheets, 3); assert.equal(h.winningStreak, 0); assert.equal(h.unbeatenStreak, null); assert.equal(h.away.played, 0);
});
test('standings rates include ties, do not invent zero for null or zero played', () => {
  const rows = [{ name: 'A', goalsFor: 4, goalsAgainst: 2, played: 2 }, { name: 'B', goalsFor: 2, goalsAgainst: 1, played: 1 }];
  assert.equal(standingsRates(rows).bestAttack.length, 2);
  assert.equal(standingsRates([...rows, { name: 'C', goalsFor: null, goalsAgainst: 0, played: 0 }]).bestAttack.length, 0);
});

test('standingsRates: single leader, 2-team tie, and many-team tie preserve all tied teams and exact order', () => {
  const single = [
    { teamId: '1', name: 'Leader FC', goalsFor: 12, goalsAgainst: 2, played: 4 },
    { teamId: '2', name: 'Mid FC', goalsFor: 6, goalsAgainst: 5, played: 4 },
    { teamId: '3', name: 'Low FC', goalsFor: 1, goalsAgainst: 10, played: 4 },
  ];
  const rSingle = standingsRates(single);
  assert.deepEqual(rSingle.bestAttack.map(t => t.name), ['Leader FC']);
  assert.deepEqual(rSingle.worstAttack.map(t => t.name), ['Low FC']);
  assert.deepEqual(rSingle.bestDefence.map(t => t.name), ['Leader FC']);
  assert.deepEqual(rSingle.worstDefence.map(t => t.name), ['Low FC']);
  assert.equal(rSingle.rows[0].attack.toFixed(2), '3.00');
  assert.equal(rSingle.rows[0].defence.toFixed(2), '0.50');

  const manyTied = Array.from({ length: 6 }, (_, i) => ({
    teamId: String(i + 1),
    name: `Club ${i + 1}`,
    goalsFor: (i % 2 === 0 ? 6 : 3),
    goalsAgainst: (i % 2 === 0 ? 2 : 1),
    played: (i % 2 === 0 ? 4 : 2),
  }));
  const rMany = standingsRates(manyTied);
  assert.equal(rMany.bestAttack.length, 6);
  assert.equal(rMany.worstAttack.length, 6);
  assert.equal(rMany.bestDefence.length, 6);
  assert.equal(rMany.worstDefence.length, 6);
});

test('standingsRates: compares exact unrounded fractions before rounding to 2 decimals', () => {
  // 5/3 = 1.6666... (rounds to 1.67) vs 167/100 = 1.6700 (rounds to 1.67)
  // Unrounded: 167/100 > 5/3 (501 > 500), so they are NOT tied!
  const unroundedDiff = [
    { teamId: '1', name: 'Five Thirds FC', goalsFor: 5, goalsAgainst: 4, played: 3 },
    { teamId: '2', name: 'Exact 167 FC', goalsFor: 167, goalsAgainst: 133, played: 100 },
  ];
  const res = standingsRates(unroundedDiff);
  assert.equal(res.rows[0].attack.toFixed(2), '1.67');
  assert.equal(res.rows[1].attack.toFixed(2), '1.67');
  assert.deepEqual(res.bestAttack.map(t => t.name), ['Exact 167 FC']);
  assert.deepEqual(res.worstAttack.map(t => t.name), ['Five Thirds FC']);
  // Defence: 4/3 = 1.3333... (1.33) vs 133/100 = 1.3300 (1.33); 133/100 < 4/3 (399 < 400)
  assert.equal(res.rows[0].defence.toFixed(2), '1.33');
  assert.equal(res.rows[1].defence.toFixed(2), '1.33');
  assert.deepEqual(res.bestDefence.map(t => t.name), ['Exact 167 FC']);
  assert.deepEqual(res.worstDefence.map(t => t.name), ['Five Thirds FC']);

  // Exact rational equality across different played counts: 5/3 === 10/6 === 15/9
  const exactTie = [
    { teamId: '1', name: 'Alpha', goalsFor: 5, goalsAgainst: 2, played: 3 },
    { teamId: '2', name: 'Beta', goalsFor: 10, goalsAgainst: 4, played: 6 },
    { teamId: '3', name: 'Gamma', goalsFor: 1, goalsAgainst: 9, played: 3 },
  ];
  const rTie = standingsRates(exactTie);
  assert.deepEqual(rTie.bestAttack.map(t => t.name), ['Alpha', 'Beta']);
  assert.deepEqual(rTie.bestDefence.map(t => t.name), ['Alpha', 'Beta']);
});

test('standingsRates: zero goals is valid 0.00; attack and defence validity are independent', () => {
  const zeroGoals = [
    { teamId: '1', name: 'Fortress FC', goalsFor: 0, goalsAgainst: 0, played: 5 },
    { teamId: '2', name: 'Normal FC', goalsFor: 5, goalsAgainst: 3, played: 5 },
  ];
  const rZero = standingsRates(zeroGoals);
  assert.deepEqual(rZero.worstAttack.map(t => t.name), ['Fortress FC']);
  assert.equal(rZero.worstAttack[0].attack, 0);
  assert.deepEqual(rZero.bestDefence.map(t => t.name), ['Fortress FC']);
  assert.equal(rZero.bestDefence[0].defence, 0);

  // Missing goalsAgainst invalidates defence ONLY; attack remains valid
  const missingDefenceOnly = [
    { teamId: '1', name: 'Attack Valid A', goalsFor: 9, goalsAgainst: null, played: 3 },
    { teamId: '2', name: 'Attack Valid B', goalsFor: 3, goalsAgainst: 2, played: 3 },
  ];
  const rAttackOnly = standingsRates(missingDefenceOnly);
  assert.equal(rAttackOnly.attackComplete, true);
  assert.equal(rAttackOnly.defenceComplete, false);
  assert.deepEqual(rAttackOnly.bestAttack.map(t => t.name), ['Attack Valid A']);
  assert.deepEqual(rAttackOnly.worstAttack.map(t => t.name), ['Attack Valid B']);
  assert.equal(rAttackOnly.bestDefence.length, 0);
  assert.equal(rAttackOnly.worstDefence.length, 0);

  // Missing goalsFor invalidates attack ONLY; defence remains valid
  const missingAttackOnly = [
    { teamId: '1', name: 'Defence Valid A', goalsFor: undefined, goalsAgainst: 1, played: 4 },
    { teamId: '2', name: 'Defence Valid B', goalsFor: 8, goalsAgainst: 6, played: 4 },
  ];
  const rDefenceOnly = standingsRates(missingAttackOnly);
  assert.equal(rDefenceOnly.attackComplete, false);
  assert.equal(rDefenceOnly.defenceComplete, true);
  assert.equal(rDefenceOnly.bestAttack.length, 0);
  assert.equal(rDefenceOnly.worstAttack.length, 0);
  assert.deepEqual(rDefenceOnly.bestDefence.map(t => t.name), ['Defence Valid A']);
  assert.deepEqual(rDefenceOnly.worstDefence.map(t => t.name), ['Defence Valid B']);
});

test('standingsRates: derived analyst metrics use exact fractions and never treat null as zero', () => {
  // 10/4 = 2.50 (يسوَّى إلى 5/2) مقابل 5/2 = 2.50 — تعادل تام رغم اختلاف العينة
  const rows = [
    { teamId: '1', name: 'Alpha', rank: 1, points: 9, played: 4, wins: 3, draws: 0, losses: 1, goalsFor: 10, goalsAgainst: 4, goalDifference: 6 },
    { teamId: '2', name: 'Beta', rank: 2, points: 6, played: 2, wins: 2, draws: 0, losses: 0, goalsFor: 5, goalsAgainst: 2, goalDifference: 3 },
    { teamId: '3', name: 'Gamma', rank: 3, points: 0, played: 3, wins: 0, draws: 0, losses: 3, goalsFor: 1, goalsAgainst: 9, goalDifference: -8 },
  ];
  const res = standingsRates(rows);
  assert.equal(res.rows[0].attack, 2.5);
  assert.equal(res.rows[1].attack, 2.5, 'التعادل الكسري الدقيق 10/4 === 5/2');
  assert.deepEqual(res.bestAttack.map(t => t.name), ['Alpha', 'Beta'], 'أولوية المتعادلة: المركز ثم الاسم');
  /* PPM: 9/4 = 2.25 و 6/2 = 3.00 و 0/3 = 0 */
  assert.equal(res.rows[0].ppm, 2.25);
  assert.equal(res.rows[1].ppm, 3);
  assert.equal(res.rows[2].ppm, 0);
  /* نسبة الفوز: 3/4 = 75%، 2/2 = 100%، 0/3 = 0% */
  assert.equal(res.rows[0].winPct, 75);
  assert.equal(res.rows[1].winPct, 100);
  assert.equal(res.rows[2].winPct, 0);
  /* الصافي/م من القيم الخام (له − عليه) ÷ لعب — لا من فارق المصدر */
  assert.equal(res.rows[0].gdPerMatch, 1.5);
  assert.equal(res.rows[1].gdPerMatch, 1.5);
  assert.equal(res.rows[2].gdPerMatch, -8 / 3);
  /* ملخص المسابقة: 16 هدفاً ÷ 9 مباريات جماعية */
  assert.equal(res.league.totalGoals, 16);
  assert.equal(res.league.totalTeamMatches, 9);
  assert.ok(Math.abs(res.league.averagePerTeam - 16 / 9) < 1e-12);
  assert.equal(res.league.maxAttack, 2.5);
  assert.equal(res.league.maxDefence, 3);
  assert.equal(res.league.bestGdPerMatch.value, 1.5);
  assert.deepEqual(res.league.bestGdPerMatch.teams.map(t => t.name), ['Alpha', 'Beta']);
  assert.equal(res.league.bestPpm.value, 3);
  assert.deepEqual(res.league.bestPpm.teams.map(t => t.name), ['Beta']);
});

test('standingsRates: missing goalsFor stops only the attack-side metrics of that team', () => {
  const res = standingsRates([
    { teamId: '1', name: 'Whole', rank: 1, points: 3, played: 1, wins: 1, draws: 0, losses: 0, goalsFor: 3, goalsAgainst: 1, goalDifference: 2 },
    { teamId: '2', name: 'Gap', rank: 2, points: 0, played: 2, wins: 0, draws: 0, losses: 2, goalsFor: null, goalsAgainst: 2, goalDifference: null },
  ]);
  assert.equal(res.rows[1].attack, null, 'غياب «له» يوقف معدل الهجوم وحده');
  assert.equal(res.rows[1].defence, 1, 'الدفاع يبقى صالحاً');
  assert.equal(res.rows[1].gdPerMatch, null, 'الصافي/م يتطلب «له» و«عليه» معاً');
  assert.equal(res.rows[1].ppm, 0);
  assert.equal(res.bestAttack.length, 0, 'جدول جزئي لا يثبت أقوى هجوم في المسابقة');
});

test('standingsRates: negative points and deductions stay valid in PPM; missing wins leave Win% unavailable', () => {
  const res = standingsRates([
    { teamId: '1', name: 'Deducted', rank: 1, points: -3, played: 5, wins: null, draws: 1, losses: 4, goalsFor: 4, goalsAgainst: 8, goalDifference: -4 },
  ]);
  assert.equal(res.rows[0].ppm, -3 / 5, 'النقاط السالبة تظل معدلًا صالحًا');
  assert.equal(res.rows[0].winPct, null, 'غياب «فاز» لا يُعدّ صفراً');
  assert.equal(res.rows[0].gdPerMatch, -0.8);
  assert.equal(res.league.bestPpm.value, -3 / 5, 'أعلى نقاط/م قد يكون سالباً في جدول كامل بالخصوم');
});

test('standingsRates: tactics classify by exact comparison against the league average', () => {
  // متوسط المسابقة = (12 + 8 + 4 + 2) / (4 + 4 + 4 + 4) = 26/16 = 1.625
  const res = standingsRates([
    { teamId: '1', name: 'Elite', rank: 1, points: 12, played: 4, wins: 4, draws: 0, losses: 0, goalsFor: 12, goalsAgainst: 4, goalDifference: 8 },
    { teamId: '2', name: 'Attacker', rank: 2, points: 7, played: 4, wins: 2, draws: 1, losses: 1, goalsFor: 8, goalsAgainst: 7, goalDifference: 1 },
    { teamId: '3', name: 'Park', rank: 3, points: 7, played: 4, wins: 2, draws: 1, losses: 1, goalsFor: 4, goalsAgainst: 2, goalDifference: 2 },
    { teamId: '4', name: 'Weak', rank: 4, points: 2, played: 4, wins: 0, draws: 2, losses: 2, goalsFor: 2, goalsAgainst: 7, goalDifference: -5 },
  ]);
  assert.equal(res.league.averagePerTeam, 26 / 16);
  assert.equal(res.rows[0].tactic, 'elite-balanced');
  assert.equal(res.rows[1].tactic, 'offensive');
  assert.equal(res.rows[2].tactic, 'defensive');
  assert.equal(res.rows[3].tactic, 'struggling');
  assert.equal(res.rows[0].attackDelta, 3 - 26 / 16);
  assert.equal(res.rows[0].defenceDelta, 1 - 26 / 16);
  assert.equal(TACTIC_LABELS[res.rows[0].tactic], 'متوازن النخبة');
});

test('standingsRates: a team exactly at the league average is not classified as above it', () => {
  // الفريقان 3/1 = 3.00 بالضبط = متوسط المسابقة (6 ÷ 2) — المساواة ليست «أقوى من المتوسط»
  const res = standingsRates([
    { teamId: '1', name: 'Exact A', rank: 1, points: 3, played: 1, wins: 1, draws: 0, losses: 0, goalsFor: 3, goalsAgainst: 0, goalDifference: 3 },
    { teamId: '2', name: 'Exact B', rank: 2, points: 0, played: 1, wins: 0, draws: 0, losses: 1, goalsFor: 3, goalsAgainst: 6, goalDifference: -3 },
  ]);
  assert.equal(res.league.averagePerTeam, 3);
  assert.equal(res.rows[0].attackDelta, 0);
  /* هجوم = المتوسط بالضبط (ليست فوقه) + دفاع 0 < 3 → تكتل دفاعي لا متوازن نخبة */
  assert.equal(res.rows[0].tactic, 'defensive');
  /* هجوم = المتوسط + دفاع 6 > 3 → يعاني هجومياً ودفاعياً */
  assert.equal(res.rows[1].tactic, 'struggling');
});

test('standingsRates: partial tables keep per-team analytics but mark unavailable league-wide claims', () => {
  const res = standingsRates([
    { teamId: '1', name: 'Complete', rank: 1, points: 6, played: 2, wins: 2, draws: 0, losses: 0, goalsFor: 4, goalsAgainst: 1, goalDifference: 3 },
    { teamId: '2', name: 'Gap', rank: 2, points: 0, played: null, wins: null, draws: null, losses: null, goalsFor: null, goalsAgainst: null, goalDifference: null },
  ]);
  assert.equal(res.bestAttack.length, 0, 'جدول جزئي لا يثبت أقوى هجوم في المسابقة');
  assert.equal(res.rows[0].attack, 2);
  assert.equal(res.rows[1].attack, null);
  assert.equal(res.rows[1].ppm, null);
  assert.equal(res.rows[1].gdPerMatch, null);
  assert.equal(res.league.totalGoals, 4, 'المتوسط يُحسب من الصفوف المتكاملة فقط');
  assert.equal(res.league.totalTeamMatches, 2);
  assert.equal(res.league.averagePerTeam, 2);
  assert.equal(res.rows[1].attackDelta, null);
  assert.equal(res.rows[1].tactic, null, 'لا تصنيف تكتيكي لصف ناقص');
});

test('archiveTeamStats: scoreless counts finished matches with zero goals, alongside clean sheets', () => {
  const games = [
    match(), // 2-0: h سجل وشباكه نظيفة؛ a لم يسجل
    match({ id: '2', score: { home: 0, away: 0 } }), // 0-0: كلاهما لم يسجل وكلاهما نظيف
    match({ id: '3', score: { home: 0, away: 3 } }), // h لم يسجل؛ a سجل
    match({ id: '4', status: 'scheduled' }),
    match({ id: '5', score: { home: null, away: null } }),
  ];
  const h = archiveTeamStats(games).find(t => t.id === 'h');
  const a = archiveTeamStats(games).find(t => t.id === 'a');
  assert.equal(h.played, 3);
  assert.equal(h.cleanSheets, 2);
  assert.equal(h.scoreless, 2, 'صفران: التعادل السلبي ومباراة 0-3');
  assert.equal(a.played, 3);
  assert.equal(a.cleanSheets, 2);
  assert.equal(a.scoreless, 2);
});

test('cleanTeamName normalizes HTML ampersand entities without altering Arabic or Latin names', () => {
  assert.equal(cleanTeamName('Brighton &amp; Hove Albion'), 'Brighton & Hove Albion');
  assert.equal(cleanTeamName('Brighton &amp;amp; Hove Albion'), 'Brighton & Hove Albion');
  assert.equal(cleanTeamName('Brighton &#38; Hove Albion'), 'Brighton & Hove Albion');
  assert.equal(cleanTeamName('Brighton &#x26; Hove Albion'), 'Brighton & Hove Albion');
  assert.equal(cleanTeamName('الأهلي & الزمالك'), 'الأهلي & الزمالك');
});
test('summary stats match team IDs across boxscore.teams and boxscore.players and leave missing passing accuracy null', () => {
  const raw = { boxscore: { players: [{ team: { id: 'h' }, statistics: [{ name: 'possessionPct', displayValue: '54%' }, { name: 'totalShots', displayValue: '9' }] }, { team: { id: 'a' }, statistics: [] }] } };
  assert.deepEqual(summaryStatistics(raw, match()), { home: { possession: 54, shots: 9, passAccuracy: null }, away: { possession: null, shots: null, passAccuracy: null } });

  // Live ESPN soccer summary structure places team totals in boxscore.teams while boxscore.players holds athlete groups
  const liveShape = {
    header: { id: '1', league: { slug: 'eng.1' } },
    boxscore: {
      teams: [
        { team: { id: 'h' }, statistics: [{ name: 'possessionPct', displayValue: '61.2' }, { name: 'totalShots', displayValue: '15' }, { name: 'passPct', displayValue: '87%' }] },
        { team: { id: 'a' }, statistics: [{ name: 'possessionPct', displayValue: '38.8' }, { name: 'totalShots', displayValue: '7' }] },
      ],
      players: [
        { team: { id: 'h' }, statistics: [{ name: 'goalie', athletes: [] }] },
        { team: { id: 'a' }, statistics: [{ name: 'goalie', athletes: [] }] },
      ],
    },
  };
  const judged = judgeEspnSummary(liveShape, match(), 'eng.1');
  assert.deepEqual(judged.statistics, {
    home: { possession: 61.2, shots: 15, passAccuracy: 87 },
    away: { possession: 38.8, shots: 7, passAccuracy: null },
  });
  assert.equal(judged.availableFields.possession, true);
  assert.equal(judged.availableFields.shots, true);
  assert.equal(judged.availableFields.passAccuracy, false);
});

test('probeEspnSummary inspects finished Big Five match and reports field availability without inventing values', async () => {
  const probeReport = await probeEspnSummary({
    now: new Date(now),
    leagues: ['eng.1'],
    request: async u => {
      if (u.includes('/scoreboard')) return response(espn('eng.1'));
      return response({
        header: { id: '1', league: { slug: 'eng.1' } },
        boxscore: {
          teams: [
            { team: { id: 'h' }, statistics: [{ name: 'possessionPct', displayValue: '55' }, { name: 'totalShots', displayValue: '12' }] },
            { team: { id: 'a' }, statistics: [{ name: 'possessionPct', displayValue: '45' }, { name: 'totalShots', displayValue: '8' }] },
          ],
        },
      });
    },
  });
  assert.equal(probeReport.results.length, 1);
  assert.equal(probeReport.results[0].ok, true);
  assert.deepEqual(probeReport.results[0].availableFields, { possession: true, shots: true, passAccuracy: false });
  assert.equal(probeReport.results[0].statistics.home.passAccuracy, null);
});
test('terms gate makes no network requests and produces a report for all leagues', async t => {
  const dir = await temporary(t);
  const r = await collect({ outDir: dir, approved: false, delayMs: 0, request: () => { throw new Error('must not call'); } });
  assert.equal(r.requests, 0); assert.equal(r.leagues.length, 12); assert(r.leagues.every(l => !l.ok && l.preserved));
});
test('dayRange is inclusive UTC and bounds the backfill window', () => {
  assert.deepEqual(dayRange('2026-08-21', '2026-08-23'), ['2026-08-21', '2026-08-22', '2026-08-23']);
  assert.throws(() => dayRange('2026-08-23', '2026-08-21'), /INVALID_WINDOW/);
  assert.throws(() => dayRange('2025-01-01', '2027-01-01'), /WINDOW_OUT_OF_BOUNDS/);
});
test('backfill window override scopes one league and preserves the rest', async t => {
  const dir = await temporary(t); let n = 0;
  const r = await collect({ now: new Date(now), outDir: dir, archiveDir: path.join(dir, 'existing'), approved: true, highlightlyApproved: false, delayMs: 0, leagues: ['eng.1'], windowFrom: '2026-08-21', windowTo: '2026-08-23', request: async () => { const raw = espn(); raw.events[0].id = String(++n); return response(raw); } });
  assert.deepEqual(r.window, { from: '2026-08-21', to: '2026-08-23', mode: 'backfill' });
  assert.equal(r.leagues.length, 12);
  assert.equal(r.leagues[0].ok, true); assert.equal(r.leagues[0].matchesInWindow, 3);
  assert.equal(r.leagues.filter(l => l.code === 'OUT_OF_SCOPE_PRESERVED').length, 11);
});
test('whole-league failure never stages partial data; window is inclusive UTC 45 days', async t => {
  const dir = await temporary(t); let calls = 0;
  const r = await collect({ now: new Date(now), outDir: dir, archiveDir: path.join(dir, 'existing'), approved: true, highlightlyApproved: false, delayMs: 0, request: async () => { calls++; return calls === 1 ? response(espn()) : { ok: false, status: 429 }; } });
  assert.deepEqual(r.window, { from: '2026-09-17', to: '2026-10-31', mode: 'rolling' });
  assert(r.leagues.every(l => !l.ok)); await assert.rejects(fs.access(path.join(dir, 'archive/eng.1/2026.json')));
});
test('collector uses source season, merges history; publisher revalidates and preserves failed leagues', async t => {
  const dir = await temporary(t), out = path.join(dir, 'out'), target = path.join(dir, 'archive');
  let n = 0;
  const report = await collect({ now: new Date(now), outDir: out, archiveDir: target, approved: true, highlightlyApproved: false, delayMs: 0, request: async u => {
    const league = new URL(u).pathname.split('/').at(-2);
    if (league !== 'eng.1') return { ok: false, status: 404 };
    n++; const raw = espn(); raw.events[0].id = String(n); return response(raw);
  } });
  assert.equal(report.leagues[0].matchesInWindow, 45);
  const result = await publish(out, target); assert.equal(result.files, 1);
  const content = await fs.readFile(path.join(target, 'eng.1/2026.json'), 'utf8'); assert.equal(JSON.parse(content).matches.length, 45);
  // A malicious/truncated candidate cannot erase even one historical record.
  await fs.writeFile(path.join(out, 'archive/eng.1/2026.json'), JSON.stringify(archive([match()])));
  await assert.rejects(publish(out, target), /SHRINK/);
  assert.equal(await fs.readFile(path.join(target, 'eng.1/2026.json'), 'utf8'), content);
});

test('known breaks restore a streak after a missing archived result', () => {
  const games = [match({ id: '1', score: { home: null, away: null } }), match({ id: '2', date: '2026-10-18T12:00:00Z', score: { home: 0, away: 1 } }), match({ id: '3', date: '2026-10-19T12:00:00Z' })];
  const h = archiveTeamStats(games).find(t => t.id === 'h');
  assert.equal(h.winningStreak, 1); assert.equal(h.unbeatenStreak, 1);
});

test('publish tracks semantic changedFiles, prevents no-op deploy triggers, and computes fetch-to-deploy delta', async t => {
  const dir = await temporary(t), out = path.join(dir, 'out'), target = path.join(dir, 'archive');
  let n = 0;
  await collect({
    now: new Date(now), outDir: out, archiveDir: target, approved: true, highlightlyApproved: false, delayMs: 0,
    request: async u => {
      const league = new URL(u).pathname.split('/').at(-2);
      if (league !== 'eng.1') return { ok: false, status: 400 };
      n++; const raw = espn(); raw.events[0].id = String(n); return response(raw);
    },
  });
  const firstPub = await publish(out, target);
  assert.equal(firstPub.files, 1);
  assert.equal(firstPub.changedFiles, 1);
  assert.deepEqual(firstPub.leaguesPublished, ['eng.1']);
  assert.equal(firstPub.leaguesPreserved.length, 11);

  const deployReport1 = buildArchiveDeployReport({
    lastFetchedAt: firstPub.lastFetchedAt,
    deployedAt: '2026-10-17T12:03:30.000Z',
    changedFiles: firstPub.changedFiles,
    commitSha: 'abc1234',
  });
  assert.equal(deployReport1.deployTriggered, true);
  assert.equal(deployReport1.deltaSeconds, 210);

  // Second publish with identical staged data must record 0 changedFiles and not trigger deploy
  const secondPub = await publish(out, target);
  assert.equal(secondPub.files, 1);
  assert.equal(secondPub.changedFiles, 0);
  const deployReport2 = buildArchiveDeployReport({
    lastFetchedAt: secondPub.lastFetchedAt,
    deployedAt: '2026-10-17T12:05:00.000Z',
    changedFiles: secondPub.changedFiles,
  });
  assert.equal(deployReport2.deployTriggered, false);
});

test('workflow delivery path connects archive changes to deploy.yml with loop prevention and safety gates intact', async () => {
  const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
  const archiveWf = await fs.readFile(path.join(rootDir, '.github/workflows/fixtures-archive.yml'), 'utf8');
  const deployWf = await fs.readFile(path.join(rootDir, '.github/workflows/deploy.yml'), 'utf8');

  assert.match(archiveWf, /\[skip ci\]/, 'archive commit must keep [skip ci] to prevent push workflow loops');
  assert.match(archiveWf, /if git diff --cached --quiet;/, 'archive publish must guard against no-op commits');
  assert.match(archiveWf, /needs\.publish\.outputs\.changed == 'true' && github\.ref == 'refs\/heads\/main'/, 'deploy job must only run when archive changed on main');
  assert.match(archiveWf, /uses:\s*\.\/\.github\/workflows\/deploy\.yml/, 'archive workflow must invoke deploy.yml');
  assert.match(deployWf, /workflow_call:/, 'deploy.yml must accept workflow_call from fixtures-archive.yml');
  assert.match(deployWf, /npm run typecheck && npm test && npm run build/, 'deploy.yml must keep all build and test gates');
  assert.match(deployWf, /group:\s*deploy-hostinger/, 'deploy.yml must keep concurrency lock');
});

/* ── متوسطات الدوري: مشتقة من الأرشيف وحده، بعينة معلنة ─────────────────── */
test('computeLeagueAverages: finished full-stat matches only, percent scale unified, small sample null', () => {
  const stats = (possession, shots, pass) => ({
    home: { possession, shots, passAccuracy: pass },
    away: { possession: 100 - possession, shots: shots + 4, passAccuracy: pass + 0.1 },
  });
  const finished = extra => match(extra);
  const rows = Array.from({ length: 10 }, (_, i) => finished({ id: `m${i}`, statistics: stats(50 + i, 10 + i, 0.8) }));
  const averages = computeLeagueAverages(rows);
  assert.equal(averages.matches, 10);
  // الكسر 0.8 نقاط مئوية (80)، والامتلاك كما وصل (0–100).
  assert.equal(averages.passAccuracy, 85);
  assert.equal(averages.possession, 50);
  // كل مباراة تسهم بطرفين: (10+i) و(14+i) ⇒ 330 ÷ 20 طرفاً.
  assert.equal(averages.shots, 16.5);
  // عينة أصغر من الحد ⇒ لا متوسط يُعلن؛ ومباريات غير منتهية أو ناقصة الأرقام لا تُحتسب.
  assert.equal(computeLeagueAverages(rows.slice(0, 9)), null);
  assert.equal(computeLeagueAverages([...rows, finished({ id: 'live1', status: 'live', statistics: stats(60, 10, 0.8) })]).matches, 10);
  assert.equal(computeLeagueAverages([...rows, finished({ id: 'bad1', statistics: { home: { possession: 120, shots: 1, passAccuracy: 0.8 }, away: { possession: 10, shots: 1, passAccuracy: 0.8 } } })]).matches, 10);
  assert.equal(computeLeagueAverages(null), null);
});

test('committed league-averages.json is re-derivable from the archive and the workflow regenerates it', async () => {
  const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
  const content = JSON.parse(await fs.readFile(path.join(rootDir, 'website/src/content/league-averages.json'), 'utf8'));
  assert.equal(content.schemaVersion, 1);
  for (const [league, entry] of Object.entries(content.leagues)) {
    const file = path.join(rootDir, 'website/src/content/fixtures-archive', league, `${entry.season}.json`);
    const data = JSON.parse(await fs.readFile(file, 'utf8'));
    assert.deepEqual(computeLeagueAverages(data.matches), {
      matches: entry.matches, possession: entry.possession, shots: entry.shots, passAccuracy: entry.passAccuracy,
    }, `${league} averages must equal a fresh recomputation from the archive`);
    assert.ok(entry.matches >= 10, `${league} sample must be declared and sufficient`);
  }
  // بطولة بلا أرشيف أرقام كافٍ لا تدخل الملف (لا متوسط مختلَق).
  assert.equal(content.leagues['egy.1'], undefined);
  const archiveWf = await fs.readFile(path.join(rootDir, '.github/workflows/fixtures-archive.yml'), 'utf8');
  assert.match(archiveWf, /node website\/scripts\/build-league-averages\.mjs/);
  const averageBuild = archiveWf.indexOf('node website/scripts/build-league-averages.mjs');
  const publishConsistencyTest = archiveWf.indexOf('node --test website/scripts/test-fixtures-archive.mjs', averageBuild);
  assert.ok(averageBuild >= 0 && publishConsistencyTest > averageBuild,
    'derived averages are regenerated before archive consistency tests run');
  assert.match(archiveWf, /git add -- website\/src\/content\/fixtures-archive website\/src\/content\/league-averages\.json/);
});
