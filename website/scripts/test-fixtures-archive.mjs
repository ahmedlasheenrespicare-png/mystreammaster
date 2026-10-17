import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ARCHIVE_LEAGUES, validateArchive, mergeArchive, archiveTeamStats, standingsRates } from '../src/lib/fixtures-archive.mjs';
import { normalizeEspn, normalizeHighlightly, summaryStatistics, collect } from './fetch-fixtures-archive.mjs';
import { publish } from './publish-fixtures-archive.mjs';
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
test('summary stats match team IDs and leave missing passing accuracy null', () => {
  const raw = { boxscore: { players: [{ team: { id: 'h' }, statistics: [{ name: 'possessionPct', displayValue: '54%' }, { name: 'totalShots', displayValue: '9' }] }, { team: { id: 'a' }, statistics: [] }] } };
  assert.deepEqual(summaryStatistics(raw, match()), { home: { possession: 54, shots: 9, passAccuracy: null }, away: { possession: null, shots: null, passAccuracy: null } });
});
test('terms gate makes no network requests and produces a report for all leagues', async t => {
  const dir = await temporary(t);
  const r = await collect({ outDir: dir, approved: false, delayMs: 0, request: () => { throw new Error('must not call'); } });
  assert.equal(r.requests, 0); assert.equal(r.leagues.length, 12); assert(r.leagues.every(l => !l.ok && l.preserved));
});
test('whole-league failure never stages partial data; window is inclusive UTC 45 days', async t => {
  const dir = await temporary(t); let calls = 0;
  const r = await collect({ now: new Date(now), outDir: dir, archiveDir: path.join(dir, 'existing'), approved: true, highlightlyApproved: false, delayMs: 0, request: async () => { calls++; return calls === 1 ? response(espn()) : { ok: false, status: 429 }; } });
  assert.deepEqual(r.window, { from: '2026-09-17', to: '2026-10-31' });
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
