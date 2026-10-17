import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LEAGUES,
  classifyFetchError,
  dayInZone,
  describeDiagnostic,
  matchesForDay,
  parseScoreboard,
  readScoreboardResponse,
  scoreboardUrl,
  shiftDay,
  upstreamScoreboardUrl,
  weekDays,
} from '../src/lib/matches.mjs';

const league = LEAGUES[0];
function event(overrides = {}) {
  return { id: '1', date: '2026-10-13T22:30:00Z', competitions: [{ competitors: [
    { homeAway: 'away', score: '0', team: { displayName: 'Away' } },
    { homeAway: 'home', score: '2', team: { displayName: 'Home', logo: 'https://example.com/logo.png' } },
  ], status: { type: { state: 'in', name: 'STATUS_IN_PROGRESS' }, displayClock: "67′" } }], ...overrides };
}
test('15 calendar days span exactly seven past and seven future days across year boundaries', () => {
  const days = weekDays('2026-01-01');
  assert.equal(days.length, 15);
  assert.equal(days[0], '2025-12-25');
  assert.equal(days[7], '2026-01-01');
  assert.equal(days[14], '2026-01-08');
  assert.equal(new Set(days).size, 15);
  assert.equal(shiftDay('2028-03-01', -1), '2028-02-29');
});
test('IANA zones apply Egypt summer/winter rules and do not use a hard-coded offset', () => {
  assert.equal(dayInZone(new Date('2026-01-12T21:30:00Z'), 'Africa/Cairo'), '2026-01-12');
  assert.equal(dayInZone(new Date('2026-07-12T21:30:00Z'), 'Africa/Cairo'), '2026-07-13');
  assert.equal(dayInZone(new Date('2026-01-12T21:30:00Z'), 'Asia/Riyadh'), '2026-01-13');
});
test('day membership uses selected timezone, including UTC midnight and extreme offsets', () => {
  const matches = parseScoreboard({ events: [event()] }, league);
  assert.equal(matchesForDay(matches, '2026-10-13', 'UTC').length, 1);
  assert.equal(matchesForDay(matches, '2026-10-14', 'Asia/Riyadh').length, 1);
  assert.equal(matchesForDay(matches, '2026-10-13', 'Asia/Riyadh').length, 0);
  assert.equal(dayInZone(new Date('2026-10-13T11:00:00Z'), 'Pacific/Kiritimati'), '2026-10-14');
  assert.equal(dayInZone(new Date('2026-10-13T01:00:00Z'), 'America/Los_Angeles'), '2026-10-12');
});
test('browser scoreboard URLs route via same-origin PHP proxy and reject arbitrary league/date input', () => {
  const proxy = new URL(scoreboardUrl('eng.1', '2026-01-01'), 'https://streammasterstore.com');
  assert.equal(proxy.origin, 'https://streammasterstore.com');
  assert.equal(proxy.pathname, '/scoreboard.php');
  assert.equal(proxy.searchParams.get('league'), 'eng.1');
  assert.equal(proxy.searchParams.get('dates'), '20251231-20260102');

  const upstream = new URL(upstreamScoreboardUrl('eng.1', '2026-01-01'));
  assert.equal(upstream.hostname, 'site.api.espn.com');
  assert.equal(upstream.searchParams.get('dates'), '20251231-20260102');

  assert.throws(() => scoreboardUrl('https://evil.example', '2026-01-01'));
  assert.throws(() => scoreboardUrl('eng.1', '2026-02-30'));
  assert.throws(() => upstreamScoreboardUrl('https://evil.example', '2026-01-01'));
});
test('home/away order and zero scores survive normalization, without guessing elapsed minutes', () => {
  const [match] = parseScoreboard({ events: [event(), event()] }, league);
  assert.equal(parseScoreboard({ events: [event(), event()] }, league).length, 1);
  assert.equal(match.home.name, 'Home');
  assert.equal(match.away.score, 0);
  assert.equal(match.state, 'live');
  assert.equal(match.detail, '67′');
});
test('postponement, cancellation and full time have distinct states', () => {
  for (const name of ['STATUS_POSTPONED', 'STATUS_CANCELED', 'STATUS_SUSPENDED', 'STATUS_DELAYED']) {
    const data = event();
    data.competitions[0].status.type = { state: 'pre', name };
    assert.equal(parseScoreboard({ events: [data] }, league)[0].state, 'other');
  }
  const data = event();
  data.competitions[0].status.type = { state: 'post', completed: true, name: 'STATUS_FULL_TIME' };
  assert.equal(parseScoreboard({ events: [data] }, league)[0].state, 'finished');
});
test('invalid responses fail rather than masquerading as a match-free day; malformed fixtures are skipped', () => {
  assert.throws(() => parseScoreboard({}, league));
  assert.deepEqual(parseScoreboard({ events: [] }, league), []);
  assert.deepEqual(parseScoreboard({ events: [null, {}, event({ date: 'not-a-date' })] }, league), []);
  const data = event();
  data.competitions[0].competitors[1].score = 'unknown';
  data.competitions[0].competitors[1].team.logo = 'javascript:alert(1)';
  const [match] = parseScoreboard({ events: [data] }, league);
  assert.equal(match.home.score, null);
  assert.equal(match.home.logo, undefined);
});
test('readScoreboardResponse surfaces clear diagnostic codes for PHP, upstream, and cache states', async () => {
  const now = Date.parse('2026-10-13T12:00:00Z');
  const staleRes = new Response(JSON.stringify({ events: [event()] }), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'x-matches-cache': 'STALE',
      'x-cache-age': '120',
      'x-diagnostic-code': 'UPSTREAM_TIMEOUT',
    },
  });
  const staleBoard = await readScoreboardResponse(staleRes, league, now);
  assert.equal(staleBoard.stale, true);
  assert.equal(staleBoard.cache, 'STALE');
  assert.equal(staleBoard.diagnostic, 'UPSTREAM_TIMEOUT');
  assert.equal(staleBoard.updated, '2026-10-13T11:58:00.000Z');
  assert.equal(staleBoard.matches.length, 1);

  await assert.rejects(
    readScoreboardResponse(new Response('<?php echo "raw";', { status: 200 }), league, now),
    err => err.code === 'PHP_UNAVAILABLE',
  );
  await assert.rejects(
    readScoreboardResponse(new Response(JSON.stringify({ ok: false, code: 'UPSTREAM_HTTP_503' }), { status: 503 }), league, now),
    err => err.code === 'UPSTREAM_HTTP_503',
  );
  await assert.rejects(
    readScoreboardResponse(new Response('Not implemented', { status: 501 }), league, now),
    err => err.code === 'PHP_PREVIEW_UNAVAILABLE',
  );
  await assert.rejects(
    readScoreboardResponse(new Response('{}', { status: 200 }), league, now),
    err => err.code === 'INVALID_SCOREBOARD',
  );

  const abortErr = Object.assign(new Error('Aborted'), { name: 'AbortError' });
  assert.equal(classifyFetchError(abortErr), 'REQUEST_TIMEOUT');
  assert.equal(classifyFetchError(new TypeError('Failed to fetch')), 'NETWORK_ERROR');
  assert.match(describeDiagnostic('UPSTREAM_HTTP_503'), /503/);
  assert.match(describeDiagnostic('UPSTREAM_HTTP_403'), /403/);
});
test('scoreboard.php whitelist, cache headers, and diagnostic codes match frontend contract', async () => {
  const phpPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../scoreboard.php');
  const source = (await Promise.all([phpPath, path.join(path.dirname(phpPath), 'lib/espn_source.php')].map(file => fs.readFile(file, 'utf8')))).join('\n');
  const match = source.match(/const\s+ALLOWED_LEAGUES\s*=\s*\[([\s\S]*?)\];/);
  assert.ok(match, 'ALLOWED_LEAGUES must be defined in scoreboard.php');
  const phpLeagues = Array.from(match[1].matchAll(/'([^']+)'/g), m => m[1]);
  assert.deepEqual(phpLeagues, LEAGUES.map(l => l.id));
  for (const token of [
    'CACHE_TTL',
    'STALE_TTL',
    'X-Matches-Cache',
    'X-Cache-Age',
    'X-Diagnostic-Code',
    'INVALID_LEAGUE',
    'INVALID_DATES',
    'RATE_LIMITED',
    'UPSTREAM_TIMEOUT',
    'DNS_LOOKUP_FAILED',
    'UPSTREAM_CONNECT_FAILED',
    'UPSTREAM_SSL_ERROR',
    'UPSTREAM_INVALID_JSON',
  ]) {
    assert.ok(source.includes(token), `scoreboard.php should include ${token}`);
  }
});
