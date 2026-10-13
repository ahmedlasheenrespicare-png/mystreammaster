import test from 'node:test';
import assert from 'node:assert/strict';
import { dayInZone, shiftDay, weekDays, matchesForDay, parseScoreboard, scoreboardUrl, LEAGUES } from '../src/lib/matches.mjs';

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
test('source URLs include adjacent UTC days and reject arbitrary league/URL input', () => {
  const url = new URL(scoreboardUrl('eng.1', '2026-01-01'));
  assert.equal(url.hostname, 'site.api.espn.com');
  assert.equal(url.searchParams.get('dates'), '20251231-20260102');
  assert.throws(() => scoreboardUrl('https://evil.example', '2026-01-01'));
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
