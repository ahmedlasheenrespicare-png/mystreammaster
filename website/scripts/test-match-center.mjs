import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {
  MATCH_CODES,
  MATCH_CENTER_DIAGNOSTICS,
  MAX_AXES,
  MIN_AXES,
  PHASES,
  POLL_INTERVALS,
  POST_MATCH_WINDOW_MS,
  STATUS_LABELS,
  TABS,
  buildComparison,
  canShowKickoff,
  canShowScore,
  countdownParts,
  defaultTab,
  deriveScore,
  detectScoreCorrection,
  eventKey,
  formatInZone,
  freshnessLabel,
  isResultOfficial,
  isStaleRead,
  isTrustworthyReadAt,
  isValidScore,
  isVerified,
  kickoffLabel,
  matchByFixtureId,
  matchPath,
  mergeH2h,
  mergeReads,
  nextTabId,
  normalizeEvent,
  normalizeStatus,
  planAnnouncements,
  pollIntervalFor,
  pollingAllowed,
  radarPoints,
  readAtProblem,
  resolveTab,
  shouldStopPolling,
  stampCompletion,
  summarizeForm,
} from '../src/lib/match-center.mjs';
import {
  MATCH_CENTER_COMPETITION,
  MATCH_CENTER_MATCHES,
  MATCH_CENTER_ALL_MATCHES,
  MATCH_CENTER_ENGLISH_MATCHES,
  MATCH_CENTER_ENGLISH_20261018_20261023_MATCHES,
  MATCH_CENTER_ENGLISH_20261018_20261023_RANGES,
  MATCH_CENTER_ENGLISH_20261018_20261023_VERIFICATION,
  MATCH_CENTER_ENGLISH_20261024_20261030_MATCHES,
  MATCH_CENTER_ENGLISH_20261024_20261030_RANGES,
  MATCH_CENTER_ENGLISH_20261024_20261030_VERIFICATION,
  MATCH_CENTER_ENGLISH_20261031_20261106_MATCHES,
  MATCH_CENTER_ENGLISH_20261031_20261106_RANGES,
  MATCH_CENTER_ENGLISH_20261031_20261106_VERIFICATION,
  MATCH_CENTER_ENGLISH_20261107_20261113_MATCHES,
  MATCH_CENTER_ENGLISH_20261107_20261113_RANGES,
  MATCH_CENTER_ENGLISH_20261107_20261113_VERIFICATION,
  MATCH_CENTER_ENGLISH_20261114_20261120_RANGES,
  MATCH_CENTER_ENGLISH_20261114_20261120_VERIFICATION,
  MATCH_CENTER_ENGLISH_20261121_20261127_MATCHES,
  MATCH_CENTER_ENGLISH_20261121_20261127_RANGES,
  MATCH_CENTER_ENGLISH_20261121_20261127_VERIFICATION,
  MATCH_CENTER_ENGLISH_20261128_20261204_MATCHES,
  MATCH_CENTER_ENGLISH_20261128_20261204_RANGES,
  MATCH_CENTER_ENGLISH_20261128_20261204_VERIFICATION,
  MATCH_CENTER_ENGLISH_20261205_20261211_MATCHES,
  MATCH_CENTER_ENGLISH_20261205_20261211_RANGES,
  MATCH_CENTER_ENGLISH_20261205_20261211_VERIFICATION,
  MATCH_CENTER_ENGLISH_20261212_20261218_MATCHES,
  MATCH_CENTER_ENGLISH_20261212_20261218_RANGES,
  MATCH_CENTER_ENGLISH_20261212_20261218_VERIFICATION,
  MATCH_CENTER_ENGLISH_20261219_20261225_MATCHES,
  MATCH_CENTER_ENGLISH_20261219_20261225_RANGES,
  MATCH_CENTER_ENGLISH_20261219_20261225_VERIFICATION,
  MATCH_CENTER_ENGLISH_20261226_20270101_MATCHES,
  MATCH_CENTER_ENGLISH_20261226_20270101_RANGES,
  MATCH_CENTER_ENGLISH_20261226_20270101_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270102_20270108_MATCHES,
  MATCH_CENTER_ENGLISH_20270102_20270108_RANGES,
  MATCH_CENTER_ENGLISH_20270102_20270108_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270109_20270115_RANGES,
  MATCH_CENTER_ENGLISH_20270109_20270115_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270116_20270122_MATCHES,
  MATCH_CENTER_ENGLISH_20270116_20270122_RANGES,
  MATCH_CENTER_ENGLISH_20270116_20270122_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270123_20270129_MATCHES,
  MATCH_CENTER_ENGLISH_20270123_20270129_RANGES,
  MATCH_CENTER_ENGLISH_20270123_20270129_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270130_20270205_MATCHES,
  MATCH_CENTER_ENGLISH_20270130_20270205_RANGES,
  MATCH_CENTER_ENGLISH_20270130_20270205_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270206_20270212_MATCHES,
  MATCH_CENTER_ENGLISH_20270206_20270212_RANGES,
  MATCH_CENTER_ENGLISH_20270206_20270212_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270213_20270219_RANGES,
  MATCH_CENTER_ENGLISH_20270213_20270219_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270220_20270226_MATCHES,
  MATCH_CENTER_ENGLISH_20270220_20270226_RANGES,
  MATCH_CENTER_ENGLISH_20270220_20270226_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270227_20270305_MATCHES,
  MATCH_CENTER_ENGLISH_20270227_20270305_RANGES,
  MATCH_CENTER_ENGLISH_20270227_20270305_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270306_20270312_RANGES,
  MATCH_CENTER_ENGLISH_20270306_20270312_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270313_20270319_MATCHES,
  MATCH_CENTER_ENGLISH_20270313_20270319_RANGES,
  MATCH_CENTER_ENGLISH_20270313_20270319_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270320_20270326_MATCHES,
  MATCH_CENTER_ENGLISH_20270320_20270326_RANGES,
  MATCH_CENTER_ENGLISH_20270320_20270326_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270327_20270402_RANGES,
  MATCH_CENTER_ENGLISH_20270327_20270402_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270403_20270409_RANGES,
  MATCH_CENTER_ENGLISH_20270403_20270409_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270410_20270416_MATCHES,
  MATCH_CENTER_ENGLISH_20270410_20270416_RANGES,
  MATCH_CENTER_ENGLISH_20270410_20270416_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270417_20270423_MATCHES,
  MATCH_CENTER_ENGLISH_20270417_20270423_RANGES,
  MATCH_CENTER_ENGLISH_20270417_20270423_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270424_20270430_MATCHES,
  MATCH_CENTER_ENGLISH_20270424_20270430_RANGES,
  MATCH_CENTER_ENGLISH_20270424_20270430_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270501_20270507_MATCHES,
  MATCH_CENTER_ENGLISH_20270501_20270507_RANGES,
  MATCH_CENTER_ENGLISH_20270501_20270507_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270508_20270514_MATCHES,
  MATCH_CENTER_ENGLISH_20270508_20270514_RANGES,
  MATCH_CENTER_ENGLISH_20270508_20270514_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270515_20270521_MATCHES,
  MATCH_CENTER_ENGLISH_20270515_20270521_RANGES,
  MATCH_CENTER_ENGLISH_20270515_20270521_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270522_20270528_MATCHES,
  MATCH_CENTER_ENGLISH_20270522_20270528_RANGES,
  MATCH_CENTER_ENGLISH_20270522_20270528_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270529_20270604_MATCHES,
  MATCH_CENTER_ENGLISH_20270529_20270604_RANGES,
  MATCH_CENTER_ENGLISH_20270529_20270604_VERIFICATION,
  MATCH_CENTER_ENGLISH_20270605_20270611_RANGES,
  MATCH_CENTER_ENGLISH_20270605_20270611_VERIFICATION,
  MATCH_CENTER_ENGLISH_20261017_CROSS_REFERENCED_EVENTS,
  MATCH_CENTER_ENGLISH_20261017_CROSS_REFERENCE_VERIFICATION,
  MATCH_CENTER_ENGLISH_20261017_CROSS_REFERENCED_MATCHES,
  MATCH_CENTER_SPANISH_MATCHES,
  MATCH_CENTER_SPANISH_20261017_20261211_MATCHES,
  MATCH_CENTER_SPANISH_20261212_20270205_MATCHES,
  MATCH_CENTER_SPANISH_20270206_20270212_MATCHES,
  MATCH_CENTER_SPANISH_20270213_20270219_MATCHES,
  MATCH_CENTER_SPANISH_20270220_20270226_MATCHES,
  MATCH_CENTER_SPANISH_20270227_20270305_MATCHES,
  MATCH_CENTER_SPANISH_20270306_20270312_MATCHES,
  MATCH_CENTER_SPANISH_20270313_20270319_MATCHES,
  MATCH_CENTER_SPANISH_20270320_20270326_MATCHES,
  MATCH_CENTER_SPANISH_20270403_20270409_MATCHES,
  MATCH_CENTER_SPANISH_20270410_20270416_MATCHES,
  MATCH_CENTER_SPANISH_20270417_20270423_MATCHES,
  MATCH_CENTER_SPANISH_20270501_20270507_MATCHES,
  MATCH_CENTER_SPANISH_20270508_20270514_MATCHES,
  MATCH_CENTER_SPANISH_20270515_20270521_MATCHES,
  MATCH_CENTER_SPANISH_20270522_20270528_MATCHES,
  MATCH_CENTER_SPANISH_20270529_20270604_MATCHES,
  MATCH_CENTER_SPANISH_20261017_20261211_VERIFICATION,
  MATCH_CENTER_SPANISH_20261212_20270205_VERIFICATION,
  MATCH_CENTER_SPANISH_20270206_20270212_VERIFICATION,
  MATCH_CENTER_SPANISH_20270213_20270219_VERIFICATION,
  MATCH_CENTER_SPANISH_20270220_20270226_VERIFICATION,
  MATCH_CENTER_SPANISH_20270227_20270305_VERIFICATION,
  MATCH_CENTER_SPANISH_20270306_20270312_VERIFICATION,
  MATCH_CENTER_SPANISH_20270313_20270319_VERIFICATION,
  MATCH_CENTER_SPANISH_20270320_20270326_VERIFICATION,
  MATCH_CENTER_SPANISH_20270403_20270409_VERIFICATION,
  MATCH_CENTER_SPANISH_20270410_20270416_VERIFICATION,
  MATCH_CENTER_SPANISH_20270417_20270423_VERIFICATION,
  MATCH_CENTER_SPANISH_20270501_20270507_VERIFICATION,
  MATCH_CENTER_SPANISH_20270508_20270514_VERIFICATION,
  MATCH_CENTER_SPANISH_20270515_20270521_VERIFICATION,
  MATCH_CENTER_SPANISH_20270522_20270528_VERIFICATION,
  MATCH_CENTER_SPANISH_20270529_20270604_VERIFICATION,
  MATCH_CENTER_SPANISH_20270605_20270607_VERIFICATION,
  MATCH_CENTER_SPANISH_20270327_20270402_VERIFICATION,
  MATCH_CENTER_SPANISH_20270424_20270430_VERIFICATION,
  MATCH_CENTER_SUMMARY_PROBE,
  MATCH_CENTER_SPANISH_20270608_20270802_VERIFICATION,
  MATCH_CENTER_SPANISH_20270803_20270927_VERIFICATION,
  MATCH_CENTER_SPANISH_20270928_20271122_VERIFICATION,
  MATCH_CENTER_SPANISH_20271123_20280117_VERIFICATION,
  MATCH_CENTER_SPANISH_20280118_20280313_VERIFICATION,
  MATCH_CENTER_VERIFICATION,
  allMatchesVerified,
  forbiddenSummaryKeys,
  matchByExternalId,
  matchByRoute,
  matchBySlug,
  matchCenterRoutes,
  summaryKeyVerdict,
} from '../src/content/match-center.mjs';

/* ── Factories ────────────────────────────────────────────────────── */

/** ESPN-shaped status node, mirroring scoreboard.php's upstream vocabulary. */
function espnStatus(name, overrides = {}) {
  return { type: { name, completed: false, state: 'pre', shortDetail: name, ...overrides }, displayClock: overrides.clock ?? null };
}
function goal(overrides = {}) {
  return normalizeEvent({ type: 'Goal', minute: 23, team: { name: 'Home', homeAway: 'home' }, player: { id: 7, name: 'Player' }, ...overrides });
}
function snapshot(matchId, overrides = {}) {
  return {
    matchId,
    provider: 'snapshot',
    readAt: '2026-10-17T15:00:00Z',
    status: normalizeStatus(espnStatus('STATUS_SCHEDULED')),
    score: null,
    events: [],
    statistics: null,
    lineups: null,
    ratings: null,
    h2h: [],
    logos: { home: null, away: null },
    seasonComparison: null,
    seasonSample: null,
    ...overrides,
  };
}

/* ── 1. State machine: data only, never the clock ─────────────────── */

test('status comes from the source alone: normalizeStatus takes no "now" and cannot be moved by a countdown', () => {
  // Rule 6: "وصول العدّاد إلى الصفر لا يحوّل المباراة تلقائياً إلى «مباشر»".
  // The strongest possible guarantee is structural: the function reads no clock
  // at all, so no caller could make the time decide the state even by mistake.
  // (`Function.length` counts only parameters before the first default, so it
  // reports 1 for `normalizeStatus(raw, provider = 'unknown')` — asserting on
  // the source is what actually proves the point.)
  assert.equal(normalizeStatus.length, 1, 'only "raw" is a required parameter');
  const statusSource = normalizeStatus.toString();
  assert.doesNotMatch(statusSource, /Date\.now|new Date\(/, 'normalizeStatus never reads a clock');
  const scheduled = normalizeStatus(espnStatus('STATUS_SCHEDULED'), 'espn');
  assert.equal(scheduled.code, 'scheduled');
  assert.equal(scheduled.phase, 'pre');
  // An hour past kickoff, the source still says scheduled — so we still say scheduled.
  assert.deepEqual(normalizeStatus(espnStatus('STATUS_SCHEDULED'), 'espn'), scheduled);
});

test('pre-match, in-play, half time and full time are four distinct states with four distinct phases', () => {
  const cases = [
    ['STATUS_SCHEDULED', 'scheduled', 'pre'],
    ['STATUS_IN_PLAY', 'live', 'live'],
    ['STATUS_HALFTIME', 'halftime', 'live'],
    ['STATUS_FULL_TIME', 'finished', 'post'],
  ];
  for (const [raw, code, phase] of cases) {
    const status = normalizeStatus(espnStatus(raw), 'espn');
    assert.equal(status.code, code, raw);
    assert.equal(status.phase, phase, raw);
    assert.equal(status.label, STATUS_LABELS[code], raw);
  }
});

test('postponement, delay, suspension, abandonment and cancellation stay independent states', () => {
  // Rule 7: "التأجيل والتأخير والتوقف والإلغاء حالات مستقلة".
  const expected = {
    STATUS_POSTPONED: ['postponed', 'terminal'],
    STATUS_DELAYED: ['delayed', 'pre'],
    STATUS_SUSPENDED: ['suspended', 'live'],
    STATUS_ABANDONED: ['abandoned', 'post'],
    STATUS_CANCELED: ['canceled', 'terminal'],
  };
  for (const [raw, [code, phase]] of Object.entries(expected)) {
    const status = normalizeStatus(espnStatus(raw), 'espn');
    assert.equal(status.code, code, raw);
    assert.equal(status.phase, phase, `${raw} phase`);
    assert.ok(STATUS_LABELS[code], `${code} has an Arabic label`);
  }
  // None of them collapse into each other or into 'unknown'.
  const codes = Object.keys(expected).map(raw => normalizeStatus(espnStatus(raw), 'espn').code);
  assert.equal(new Set(codes).size, codes.length, 'five distinct codes');
  assert.ok(!codes.includes('unknown'));
  // Every declared code has a label and a phase — no half-wired state.
  for (const code of MATCH_CODES) {
    assert.ok(STATUS_LABELS[code], `label for ${code}`);
    assert.ok(PHASES[code], `phase for ${code}`);
  }
});

test('full time is declared by the source, never by 90 minutes having passed', () => {
  // Rule 7: "لا تُعلن النهاية لمجرد مرور 90 دقيقة".
  const inPlay = normalizeStatus(espnStatus('STATUS_IN_PLAY'), 'espn');
  assert.equal(inPlay.code, 'live');
  assert.equal(inPlay.completed, false);
  // Elapsed minutes alone cannot finish a match.
  const deep = normalizeStatus({ type: { name: 'STATUS_IN_PLAY', completed: false }, elapsed: 118 }, 'espn');
  assert.equal(deep.code, 'live', '118 minutes elapsed is still live');
  assert.equal(deep.elapsed, 118, 'elapsed is carried through for display');
  // Only the source's completed flag ends it.
  const done = normalizeStatus(espnStatus('STATUS_IN_PLAY', { completed: true }), 'espn');
  assert.equal(done.code, 'finished');
  assert.equal(done.completed, true);
});

test('the clock shown to visitors is the source clock, not a locally computed minute', () => {
  const status = normalizeStatus({ type: { name: 'STATUS_IN_PLAY' }, displayClock: "67′" }, 'espn');
  assert.equal(status.clock, "67′");
  assert.equal(status.detail, "67′");
  const noClock = normalizeStatus(espnStatus('STATUS_SCHEDULED'), 'espn');
  // Absent stays absent — never fabricated from kickoff time.
  assert.equal(noClock.clock, null);
  assert.equal(noClock.elapsed, null);
});

test('a switchable provider layer maps a second vocabulary without merging the two', () => {
  // Approved decision: provider-agnostic layer. API-Football codes map through
  // their own table, and ESPN codes must not leak into it.
  assert.equal(normalizeStatus({ code: 'PST' }, 'apifootball').code, 'postponed');
  assert.equal(normalizeStatus({ code: 'HT' }, 'apifootball').code, 'halftime');
  assert.equal(normalizeStatus({ code: '2H' }, 'apifootball').code, 'live');
  assert.equal(normalizeStatus({ code: 'FT' }, 'apifootball').code, 'finished');
  assert.equal(normalizeStatus({ code: 'ABD' }, 'apifootball').code, 'abandoned');
  assert.equal(normalizeStatus({ code: 'NS' }, 'apifootball').code, 'scheduled');
  // An ESPN-only token is not valid API-Football vocabulary and must not resolve.
  assert.equal(normalizeStatus({ code: 'STATUS_HALFTIME' }, 'apifootball').code, 'unknown');
  // ...and the reverse: an API-Football code is not read through ESPN's table.
  assert.equal(normalizeStatus({ type: { name: 'HT' } }, 'espn').code, 'unknown');
});

test('ESPN statuses the scoreboard already relies on are understood, including the structural state signal', () => {
  // `scripts/test-matches.mjs` drives the existing board with STATUS_IN_PROGRESS
  // and `type.state: 'in'`, so the match center must read the same vocabulary.
  assert.equal(normalizeStatus(espnStatus('STATUS_IN_PROGRESS'), 'espn').code, 'live');
  assert.equal(normalizeStatus(espnStatus('STATUS_END_OF_FIRST_HALF'), 'espn').code, 'halftime');
  assert.equal(normalizeStatus(espnStatus('STATUS_RESCHEDULED'), 'espn').code, 'postponed');
  assert.equal(normalizeStatus(espnStatus('STATUS_AWARDED'), 'espn').code, 'finished');
  // An unrecognized name still resolves through ESPN's own pre/in/post signal.
  assert.equal(normalizeStatus({ type: { name: 'STATUS_WEIRD_NEW_CODE', state: 'in' } }, 'espn').code, 'live');
  assert.equal(normalizeStatus({ type: { name: 'STATUS_WEIRD_NEW_CODE', state: 'post' } }, 'espn').code, 'finished');
  assert.equal(normalizeStatus({ type: { name: 'STATUS_WEIRD_NEW_CODE', state: 'pre' } }, 'espn').code, 'scheduled');
  // With no provider declared, keyword matching still works as a last resort.
  assert.equal(normalizeStatus({ status: 'Match Postponed' }).code, 'postponed');
  assert.equal(normalizeStatus({ status: 'Second Half' }).code, 'live');
  // A declared provider with an unreadable code stays honestly unknown rather
  // than borrowing another provider's guess; the source text is still carried.
  const opaque = normalizeStatus({ type: { name: 'STATUS_BRAND_NEW', shortDetail: '45+2' } }, 'espn');
  assert.equal(opaque.code, 'unknown');
  assert.equal(opaque.label, STATUS_LABELS.unknown);
  assert.equal(opaque.detail, '45+2', 'the source wording survives for display');
});

/* ── 2. Score: no phantom 0–0 ─────────────────────────────────────── */

test('before kickoff there is no score at all, not a confirmed-looking 0–0', () => {
  const scheduled = normalizeStatus(espnStatus('STATUS_SCHEDULED'), 'espn');
  // Even when the source literally sends zeros, the pre-match phase yields null.
  assert.equal(deriveScore(scheduled, { score: '0' }, { score: '0' }), null);
  assert.equal(deriveScore(scheduled, { score: '2' }, { score: '1' }), null);
  for (const raw of ['STATUS_POSTPONED', 'STATUS_CANCELED', 'STATUS_DELAYED']) {
    assert.equal(deriveScore(normalizeStatus(espnStatus(raw), 'espn'), { score: '0' }, { score: '0' }), null, raw);
  }
});

test('a genuine zero stays zero while a missing value stays null — the two are never confused', () => {
  // Rule 14 explicitly tests "بيانات ناقصة وصفر حقيقي".
  const live = normalizeStatus(espnStatus('STATUS_IN_PLAY'), 'espn');
  assert.deepEqual(deriveScore(live, { score: '2' }, { score: '0' }), { home: 2, away: 0 });
  assert.deepEqual(deriveScore(live, { score: '0' }, { score: '0' }), { home: 0, away: 0 });
  assert.equal(deriveScore(live, {}, {}), null, 'absent score is null');
  assert.deepEqual(deriveScore(live, { score: '1' }, {}), { home: 1, away: null }, 'one side absent');
  // Non-numeric junk never becomes a number.
  assert.deepEqual(deriveScore(live, { score: '—' }, { score: 'N/A' }), null);
});

test('a visible result needs a result-capable source status and two complete non-negative integer scores', () => {
  const live = normalizeStatus(espnStatus('STATUS_IN_PLAY'), 'espn');
  const scheduled = normalizeStatus(espnStatus('STATUS_SCHEDULED'), 'espn');
  const finished = normalizeStatus(espnStatus('STATUS_FULL_TIME', { completed: true }), 'espn');
  const abandoned = normalizeStatus(espnStatus('STATUS_ABANDONED', { completed: true }), 'espn');
  const postponed = normalizeStatus(espnStatus('STATUS_POSTPONED'), 'espn');
  const delayed = normalizeStatus(espnStatus('STATUS_DELAYED'), 'espn');
  assert.equal(isValidScore({ home: 0, away: 0 }), true, 'a real zero is valid');
  assert.equal(canShowScore(live, { home: 0, away: 0 }), true);
  assert.equal(canShowScore(scheduled, { home: 0, away: 0 }), false, 'not before play');
  assert.equal(canShowScore(live, { home: 2, away: null }), false, 'never show a partial result');
  assert.equal(canShowScore(live, { home: 2, away: Number.NaN }), false);
  assert.equal(canShowScore(finished, { home: 2.5, away: 1 }), false, 'goal counts must be integers');
  assert.equal(canShowScore(finished, { home: -1, away: 0 }), false, 'negative values are invalid');
  assert.equal(canShowScore(abandoned, { home: 1, away: 0 }), false, 'an abandoned match score is not a final result');
  assert.equal(canShowScore(null, { home: 2, away: 1 }), false, 'no source status means no score');
  assert.equal(canShowKickoff(scheduled), true);
  assert.equal(canShowKickoff(postponed), false, 'the former kickoff is not presented as the new date');
  assert.equal(canShowKickoff(delayed), false, 'a delay does not invent a revised kickoff');
});

/* ── 3. Time zones: IANA rules, never a fixed offset ──────────────── */

test('Cairo and Mecca come from IANA zones, and Cairo changes offset within weeks of the trial', () => {
  // Rule 1: store UTC, render via Africa/Cairo and Asia/Riyadh — not +3 all year.
  assert.equal(kickoffLabel('2026-10-17T14:00:00Z', 'Africa/Cairo'), '١٧:٠٠');
  assert.equal(kickoffLabel('2026-10-17T14:00:00Z', 'Asia/Riyadh'), '١٧:٠٠');
  assert.equal(kickoffLabel('2026-10-17T16:30:00Z', 'Africa/Cairo'), '١٩:٣٠');
  assert.equal(kickoffLabel('2026-10-17T16:30:00Z', 'Asia/Riyadh'), '١٩:٣٠');
  // Egypt ends summer time late October: a fixed +3 would be wrong 12 days later.
  assert.equal(kickoffLabel('2026-11-05T14:00:00Z', 'Africa/Cairo'), '١٦:٠٠');
  assert.equal(kickoffLabel('2026-11-05T14:00:00Z', 'Asia/Riyadh'), '١٧:٠٠', 'Mecca has no DST');
  assert.equal(kickoffLabel('2026-04-20T14:00:00Z', 'Africa/Cairo'), '١٦:٠٠', 'Cairo before summer time');
  // The UK flips BST→GMT on 29 October, shifting local kickoffs by an hour too.
  // formatInZone renders in ar-EG on purpose (the whole site is Arabic), so the
  // digits are Arabic-Indic — asserting Latin digits here would be testing the
  // wrong thing, exactly as MatchesPage's own zone formatting already behaves.
  const london = iso => formatInZone(iso, 'Europe/London', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  assert.equal(london('2026-10-17T14:00:00Z'), '١٥:٠٠');
  assert.equal(london('2026-11-05T14:00:00Z'), '١٤:٠٠');
  assert.throws(() => kickoffLabel('not-a-date', 'Africa/Cairo'), /Invalid date/);
});

test('no hard-coded three-hour offset exists in the match-center source', async () => {
  // Rule 1, enforced structurally. Comments are stripped first: this file's own
  // prose quotes "+ 3 * 3600 * 1000" as the thing that must NOT exist, and a
  // naive scan would match that sentence and pass for the wrong reason.
  const files = ['../src/lib/match-center.mjs', '../src/content/match-center.mjs'];
  for (const file of files) {
    const source = await fs.readFile(new URL(file, import.meta.url), 'utf8');
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').replace(/^\s*\*.*$/gm, '');
    assert.doesNotMatch(code, /3\s*\*\s*60\s*\*\s*60|3\s*\*\s*3600|3600\s*\*\s*3|10_?800_?000|\+\s*10800/, `${file} must not add a fixed 3h`);
  }
});

test('the countdown is display-only: it never goes negative and never sets a state', () => {
  const kickoff = '2026-10-17T14:00:00Z';
  const before = countdownParts(kickoff, Date.parse('2026-10-17T13:00:00Z'));
  assert.equal(before.started, false);
  assert.deepEqual([before.hours, before.minutes, before.seconds], [1, 0, 0]);
  const after = countdownParts(kickoff, Date.parse('2026-10-17T15:30:00Z'));
  // Rule 6: hitting zero does not make the match live — the component gets no
  // negative numbers to render and no state to derive.
  assert.equal(after.started, true);
  assert.equal(after.totalMs, 0);
  assert.ok([after.days, after.hours, after.minutes, after.seconds].every(value => value >= 0));
  assert.equal(countdownParts('garbage', Date.now()), null);
});

/* ── 4. Stale reads and per-match isolation ───────────────────────── */

test('an older read never replaces a newer one, and an equal timestamp is not churned either', () => {
  const current = { readAt: '2026-10-17T15:00:00Z' };
  assert.equal(isStaleRead({ readAt: '2026-10-17T14:59:59Z' }, current), true);
  assert.equal(isStaleRead({ readAt: '2026-10-17T15:00:00Z' }, current), true, 'equal is rejected to avoid flicker');
  assert.equal(isStaleRead({ readAt: '2026-10-17T15:00:01Z' }, current), false);
  assert.equal(isStaleRead({}, current), true, 'a read without a timestamp is not trusted');
  assert.equal(isStaleRead({ readAt: '2026-10-17T15:00:01Z' }, null), false, 'first read always lands');
});

test('one match failing keeps its last confirmed reading and never touches the other two', () => {
  // Rule 11: "فشل مباراة لا يمسح بيانات المباراتين الأخريين".
  const now = Date.parse('2026-10-17T15:02:00Z');
  const current = {
    a: { data: snapshot('a', { score: { home: 1, away: 0 } }), failure: null },
    b: { data: snapshot('b', { score: { home: 0, away: 0 } }), failure: null },
  };
  const merged = mergeReads(current, {
    a: { status: 'rejected', code: 'UPSTREAM_TIMEOUT' },
    b: { status: 'fulfilled', value: { data: snapshot('b', { readAt: '2026-10-17T15:01:00Z', score: { home: 0, away: 2 } }), cache: 'MISS' } },
    c: { status: 'rejected', code: 'NETWORK_ERROR' },
  }, now);

  assert.deepEqual(merged.a.data.score, { home: 1, away: 0 }, 'last confirmed reading retained');
  assert.equal(merged.a.failure, 'UPSTREAM_TIMEOUT', 'the warning is attached to that match only');
  assert.deepEqual(merged.b.data.score, { home: 0, away: 2 }, 'healthy match still updates');
  assert.equal(merged.b.failure, null);
  assert.equal(merged.c.data, null, 'a match with no prior data shows no invented numbers');
  assert.equal(merged.c.failure, 'NETWORK_ERROR');
});

test('a stale response is refused without overwriting values, and the refusal is counted not hidden', () => {
  const now = Date.parse('2026-10-17T15:05:00Z');
  const current = { a: { data: snapshot('a', { readAt: '2026-10-17T15:00:00Z', score: { home: 2, away: 1 } }), failure: null } };
  const merged = mergeReads(current, {
    a: { status: 'fulfilled', value: { data: snapshot('a', { readAt: '2026-10-17T14:50:00Z', score: { home: 0, away: 0 } }) } },
  }, now);
  assert.deepEqual(merged.a.data.score, { home: 2, away: 1 }, 'newer reading survives');
  assert.equal(merged.a.rejectedStale, 1, 'a retry attempt is recorded');
  const again = mergeReads(merged, {
    a: { status: 'fulfilled', value: { data: snapshot('a', { readAt: '2026-10-17T14:51:00Z' }) } },
  }, now);
  assert.equal(again.a.rejectedStale, 2);
});

test('freshness wording never claims "updated now" for a retry, a failure or a stored copy', () => {
  // Rule 11: "عدم كتابة «محدث الآن» لمجرد إعادة المحاولة أو استلام نسخة مخزنة قديمة".
  const now = Date.parse('2026-10-17T15:00:30Z');
  const fresh = freshnessLabel({ readAt: '2026-10-17T15:00:00Z', cache: 'HIT', now });
  assert.equal(fresh.text, 'محدَّث الآن');
  assert.equal(fresh.level, 'fresh');

  const staleCache = freshnessLabel({ readAt: '2026-10-17T14:50:00Z', cache: 'STALE', now });
  assert.notEqual(staleCache.text, 'محدَّث الآن');
  assert.equal(staleCache.level, 'stale');
  assert.match(staleCache.text, /نسخة مخزّنة/);

  const failed = freshnessLabel({ readAt: '2026-10-17T15:00:00Z', cache: 'MISS', now, failed: true });
  assert.equal(failed.level, 'failed');
  assert.match(failed.text, /تعذر التحديث/);

  const missing = freshnessLabel({ readAt: null, now, failed: false });
  assert.equal(missing.level, 'failed');

  // A successful-but-old read is described by its real age, not as "now".
  const aging = freshnessLabel({ readAt: '2026-10-17T14:59:00Z', cache: 'MISS', now });
  assert.notEqual(aging.text, 'محدَّث الآن');
  assert.equal(aging.level, 'aging');
  assert.match(aging.text, /قبل/);

  const old = freshnessLabel({ readAt: '2026-10-17T14:55:00Z', cache: 'MISS', now });
  assert.notEqual(old.text, 'محدَّث الآن');
  assert.equal(old.level, 'stale', 'five minutes old against 60s polling is stale, not merely aging');
  assert.match(old.text, /قبل/);

  // A future-dated read is not "fresh" merely because its computed age clamps to
  // zero; mergeReads refuses that same payload, so the label must agree with it.
  const future = freshnessLabel({ readAt: '2027-01-01T00:00:00Z', cache: 'MISS', now });
  assert.notEqual(future.text, 'محدَّث الآن');
  assert.equal(future.level, 'invalid');
  assert.equal(freshnessLabel({ readAt: 'not-a-date', cache: 'MISS', now }).level, 'invalid');

  // Only 'fresh' may be presented as a live reading, and all five levels are
  // reachable and distinct so the UI can style each honestly.
  const probes = {
    fresh: '2026-10-17T15:00:00Z', aging: '2026-10-17T14:59:00Z', stale: '2026-10-17T14:50:00Z',
    failed: null, invalid: '2027-01-01T00:00:00Z',
  };
  for (const [level, readAt] of Object.entries(probes)) {
    assert.equal(freshnessLabel({ readAt, cache: 'MISS', now }).level, level);
  }
  assert.equal(new Set(Object.values(probes).map(readAt => freshnessLabel({ readAt, cache: 'MISS', now }).level)).size, 5);
});

/* ── 4b. Read integrity: the timestamp that guards staleness ──────── */

test('a payload with no usable readAt is refused, because storing it would disable staleness protection for good', () => {
  const now = Date.parse('2026-10-17T15:05:00Z');
  for (const bad of [undefined, null, '', 'not-a-date', 1792249500000]) {
    const store = mergeReads({}, { a: { status: 'fulfilled', value: { data: { matchId: 'a', readAt: bad, score: { home: 1, away: 0 } } } } }, now);
    assert.equal(store.a.data, null, `readAt ${JSON.stringify(bad)} must not be stored as a reading`);
    assert.ok(store.a.failure, `readAt ${JSON.stringify(bad)} is reported, not swallowed`);
    assert.equal(store.a.failure, 'MISSING_READ_AT');
    assert.ok(MATCH_CENTER_DIAGNOSTICS.MISSING_READ_AT, 'the code has a visitor-facing label');
  }
  // Without this refusal an older payload would overwrite a newer one, since a
  // stored reading with no timestamp makes every later read look newer.
  const good = mergeReads({}, { a: { status: 'fulfilled', value: { data: snapshot('a', { readAt: '2026-10-17T15:00:00Z', score: { home: 1, away: 0 } }) } } }, now);
  assert.deepEqual(good.a.data.score, { home: 1, away: 0 });
  const afterBad = mergeReads(good, { a: { status: 'fulfilled', value: { data: { matchId: 'a', score: { home: 9, away: 9 } } } } }, now);
  assert.deepEqual(afterBad.a.data.score, { home: 1, away: 0 }, 'the confirmed reading survives the malformed one');
  assert.equal(afterBad.a.failure, 'MISSING_READ_AT');
});

test('a future-dated read cannot freeze the data layer, and a stored bogus timestamp is dropped rather than trusted', () => {
  const now = Date.parse('2026-10-17T15:05:00Z');
  const future = '2027-01-01T00:00:00Z';
  const store = mergeReads({}, { a: { status: 'fulfilled', value: { data: snapshot('a', { readAt: future, score: { home: 9, away: 9 } }) } } }, now);
  assert.equal(store.a.data, null, 'the bogus reading is refused on arrival');
  assert.equal(store.a.failure, 'FUTURE_READ_AT');

  // Even if a future timestamp somehow got stored, it must not become the
  // baseline that rejects every genuine update after it.
  const poisoned = { a: { data: snapshot('a', { readAt: future, score: { home: 9, away: 9 } }), failure: null } };
  const recovered = mergeReads(poisoned, {
    a: { status: 'fulfilled', value: { data: snapshot('a', { readAt: '2026-10-17T15:04:00Z', score: { home: 2, away: 1 } }) } },
  }, now);
  assert.deepEqual(recovered.a.data.score, { home: 2, away: 1 }, 'updates resume after a poisoned timestamp');
  assert.equal(recovered.a.failure, null);

  // Small clock skew is tolerated: the source may legitimately be seconds ahead.
  const skew = mergeReads({}, { a: { status: 'fulfilled', value: { data: snapshot('a', { readAt: '2026-10-17T15:05:30Z' }) } } }, now);
  assert.ok(skew.a.data, '30 seconds of skew is accepted');
  assert.equal(skew.a.failure, null);
  // The tolerance boundary is inclusive, so pin it explicitly and then step past it.
  assert.equal(isTrustworthyReadAt('2026-10-17T15:07:00Z', now), true, 'exactly at the tolerance is still trusted');
  assert.equal(isTrustworthyReadAt('2026-10-17T15:07:01Z', now), false, 'one second past the tolerance is not skew');
  assert.equal(isTrustworthyReadAt(future, now), false);
  assert.equal(isTrustworthyReadAt(undefined, now), false);
  assert.equal(isTrustworthyReadAt(1792249500000, now), false, 'a numeric timestamp is not an ISO readAt');
  assert.equal(readAtProblem('2026-10-17T15:00:00Z', now), null);
  assert.equal(readAtProblem('', now), 'MISSING_READ_AT');
  assert.equal(readAtProblem(future, now), 'FUTURE_READ_AT');
});

/* ── 4c. Completion stamping: when polling is allowed to stop ─────── */

test('the settle window is measured from a stamped full time, never from the latest read', () => {
  // Rule 8 eases requests after full time; rule 11 keeps late statistics and
  // ratings coming. Measuring the window from readAt would make it elapse never,
  // because every poll renews readAt.
  const finishedAt = '2026-10-17T16:00:00Z';
  const status = stampCompletion(
    normalizeStatus(espnStatus('STATUS_IN_PLAY'), 'espn'),
    normalizeStatus(espnStatus('STATUS_FULL_TIME', { completed: true }), 'espn'),
    finishedAt,
  );
  assert.equal(status.code, 'finished');
  assert.equal(status.finishedAt, finishedAt);

  const complete = snapshot('m', { statistics: [{ key: 'possession', label: 'x', home: 1, away: 1 }], ratings: [] });
  // Three hours later, with a readAt only seconds old, polling still stops.
  const late = Date.parse('2026-10-17T19:00:00Z');
  const freshRead = snapshot('m', { readAt: '2026-10-17T18:59:30Z', statistics: [], ratings: [] });
  assert.equal(shouldStopPolling(status, freshRead, late), true, 'a fresh read does not reopen the window');
  assert.equal(shouldStopPolling(status, complete, late), true);
  // Inside the window it keeps going.
  assert.equal(shouldStopPolling(status, complete, Date.parse('2026-10-17T16:30:00Z')), false);
});

test('the stamp is written once, preserved across later reads, and cleared if the source reopens the match', () => {
  const live = normalizeStatus(espnStatus('STATUS_IN_PLAY'), 'espn');
  const fullTime = normalizeStatus(espnStatus('STATUS_FULL_TIME', { completed: true }), 'espn');
  const first = stampCompletion(live, fullTime, '2026-10-17T16:00:00Z');
  assert.equal(first.finishedAt, '2026-10-17T16:00:00Z');

  // A later read an hour on must not move the stamp, or the window never ends.
  const second = stampCompletion(first, normalizeStatus(espnStatus('STATUS_FULL_TIME', { completed: true }), 'espn'), '2026-10-17T17:00:00Z');
  assert.equal(second.finishedAt, '2026-10-17T16:00:00Z', 'stamp is preserved');

  // A correction that puts the match back in play clears it.
  const reopened = stampCompletion(second, live, '2026-10-17T17:05:00Z');
  assert.equal(reopened.finishedAt, null);
  // And it is stamped again if the match finishes once more.
  assert.equal(stampCompletion(reopened, fullTime, '2026-10-17T17:10:00Z').finishedAt, '2026-10-17T17:10:00Z');

  // A completed status with no readable stamp keeps polling: continuing is the
  // cautious choice, stopping on an unknown time is not.
  assert.equal(stampCompletion(null, fullTime, null).finishedAt, null);
  assert.equal(shouldStopPolling(stampCompletion(null, fullTime, null), snapshot('m', { statistics: [], ratings: [] }), Date.parse('2027-01-01T00:00:00Z')), false);
  assert.equal(stampCompletion(null, null, '2026-10-17T16:00:00Z'), null);
});

/* ── 5. Cross-match isolation for the two simultaneous kickoffs ───── */

test('the two 14:00Z matches keep separate identities, so nothing can leak between them', () => {
  // Rule 3: "المباراتان الأوليان تبدأان معاً؛ لذلك يجب اختبار عدم انتقال نتيجة
  // أو حدث أو تشكيل من مباراة إلى أخرى."
  const [first, second, third] = MATCH_CENTER_MATCHES;
  assert.equal(first.kickoffUtc, second.kickoffUtc, 'they do kick off together by design');
  assert.notEqual(first.id, second.id);
  assert.notEqual(first.slug, second.slug);
  assert.notEqual(matchPath(first.competitionSlug, first.slug), matchPath(second.competitionSlug, second.slug));
  assert.equal(third.kickoffUtc, '2026-10-17T16:30:00Z');

  // Event keys are namespaced by match id, so an identical goal in both matches
  // produces two different keys and cannot be deduplicated across matches.
  const shared = { id: 99, type: 'Goal', minute: 10, player: { id: 5, name: 'Same Player' } };
  const keyA = eventKey(first.id, normalizeEvent(shared));
  const keyB = eventKey(second.id, normalizeEvent(shared));
  assert.notEqual(keyA, keyB);
  assert.ok(keyA.startsWith(`${first.id}:`), 'key is namespaced by match');

  // A goal announced in match A must not appear when planning match B.
  const planA = planAnnouncements({ matchId: first.id, previousEvents: [], nextEvents: [normalizeEvent(shared)] });
  assert.equal(planA.announce.length, 1);
  const planB = planAnnouncements({ matchId: second.id, previousEvents: [], nextEvents: [], knownKeys: planA.knownKeys });
  assert.equal(planB.announce.length, 0, 'match A keys never announce for match B');
});

/* ── 6. Goal, cancellation and correction announcements ───────────── */

test('a goal is announced once and never repeated across identical responses', () => {
  // Rule 7: "منع تكرار إشعار الهدف مع كل استجابة".
  const first = planAnnouncements({ matchId: 'm', previousEvents: [], nextEvents: [goal()] });
  assert.equal(first.announce.length, 1);
  assert.equal(first.announce[0].kind, 'goal');
  // The very same payload arrives again (a 60s poll with no change).
  const second = planAnnouncements({ matchId: 'm', previousEvents: [goal()], nextEvents: [goal()], knownKeys: first.knownKeys });
  assert.equal(second.announce.length, 0, 'no duplicate on an unchanged response');
  // And again, and again.
  const third = planAnnouncements({ matchId: 'm', previousEvents: [goal()], nextEvents: [goal()], knownKeys: second.knownKeys });
  assert.equal(third.announce.length, 0);
  assert.deepEqual(second.knownKeys, first.knownKeys, 'the key set stays stable');
});

test('the first read after a reload or reconnect is seeded silently, so old goals are not shown as happening now', () => {
  // Rule 7: "عدم عرض أهداف قديمة وصلت مع استعادة الاتصال كأنها حدثت الآن".
  const backlog = [goal({ minute: 4 }), goal({ minute: 31 }), goal({ minute: 58, id: 2 })];
  const seeded = planAnnouncements({ matchId: 'm', previousEvents: [], nextEvents: backlog, knownKeys: [], silentSeed: true });
  assert.equal(seeded.announce.length, 0, 'reconnecting announces nothing from the backlog');
  assert.equal(seeded.knownKeys.length, 3, 'but every backlog goal is recorded as known');
  // After seeding, a genuinely new goal is still announced.
  const next = planAnnouncements({ matchId: 'm', previousEvents: backlog, nextEvents: [...backlog, goal({ minute: 77, id: 3 })], knownKeys: seeded.knownKeys });
  assert.equal(next.announce.length, 1);
  assert.equal(next.announce[0].event.minute, 77, 'only the new goal is announced');
});

test('a goal disallowed by VAR is announced as a cancellation, and a vanished announced goal as a correction', () => {
  // Rule 7: "دعم تصحيح النتيجة وإلغاء الهدف بعد VAR".
  const scored = goal({ id: 11 });
  const seeded = planAnnouncements({ matchId: 'm', previousEvents: [], nextEvents: [scored] });
  assert.equal(seeded.announce[0].kind, 'goal');

  const cancelledEvent = goal({ id: 11, type: 'VAR Cancelled' });
  assert.equal(normalizeEvent({ type: 'VAR Cancelled' }).cancelled, true);
  const cancelled = planAnnouncements({ matchId: 'm', previousEvents: [scored], nextEvents: [cancelledEvent], knownKeys: seeded.knownKeys });
  assert.equal(cancelled.announce.length, 1);
  assert.equal(cancelled.announce[0].kind, 'cancelled');
  assert.match(cancelled.announce[0].message, /أُلغي هدف/);

  // The event disappears entirely from the source instead of being flagged.
  const removed = planAnnouncements({ matchId: 'm', previousEvents: [scored], nextEvents: [], knownKeys: seeded.knownKeys });
  assert.equal(removed.announce.length, 1);
  assert.equal(removed.announce[0].kind, 'corrected');
  assert.match(removed.announce[0].message, /تصحيح من المصدر/);

  // An event that was never announced must not generate correction noise.
  const quiet = planAnnouncements({ matchId: 'm', previousEvents: [goal({ id: 55 })], nextEvents: [], knownKeys: [] });
  assert.equal(quiet.announce.length, 0);
});

test('only goals and corrections are announceable — cards and substitutions do not trigger aria-live', () => {
  // Rule 10: aria-live is for goals, corrections and important alerts, not everything.
  const events = [
    normalizeEvent({ type: 'Yellow Card', minute: 12, player: { name: 'A' } }),
    normalizeEvent({ type: 'Red Card', minute: 40, player: { name: 'B' } }),
    normalizeEvent({ type: 'Substitution', minute: 61, player: { name: 'C' } }),
  ];
  for (const [index, event] of events.entries()) {
    const plan = planAnnouncements({ matchId: 'm', previousEvents: [], nextEvents: [event] });
    assert.equal(plan.announce.length, 0, `${event.type} is not announced`);
    assert.equal(plan.knownKeys.length, 0, `nothing to remember for ${event.type}`);
    assert.ok(event.minute !== null, `minute preserved for ${index}`);
  }
  // But they are still normalized and rendered as facts.
  assert.equal(events[0].type, 'yellow_card');
  assert.equal(events[1].type, 'red_card');
  assert.equal(events[2].type, 'substitution');
  // Missed penalty is distinguishable from a scored one.
  assert.equal(normalizeEvent({ type: 'Penalty Missed' }).type, 'missed_penalty');
  assert.equal(normalizeEvent({ type: 'Penalty' }).type, 'penalty');
  assert.equal(normalizeEvent({ type: 'Own Goal' }).type, 'own_goal');
});

test('event identity survives a source that sends no ids, without inventing one', () => {
  const withId = eventKey('m', normalizeEvent({ id: 'e7', type: 'Goal', minute: 5 }));
  assert.equal(withId, 'm:e7');
  const withoutId = eventKey('m', normalizeEvent({ type: 'Goal', minute: 5, player: { name: 'X' } }));
  assert.match(withoutId, /^m:goal:5:-:X$/, 'falls back to type+minute+player, still stable');
  // Two different goals without ids stay distinct.
  const other = eventKey('m', normalizeEvent({ type: 'Goal', minute: 5, player: { name: 'Y' } }));
  assert.notEqual(withoutId, other);
});

test('a score change explained by announced goals is not a correction; an unexplained one is', () => {
  const previous = { home: 1, away: 0 };
  const announced = [{ kind: 'goal', event: goal({ teamSide: 'home' }) }];
  assert.equal(detectScoreCorrection(previous, { home: 2, away: 0 }, announced), null, 'explained by the goal');
  const unexplained = detectScoreCorrection(previous, { home: 1, away: 1 }, announced);
  assert.ok(unexplained, 'away scored with no announced event');
  assert.deepEqual(unexplained.from, previous);
  assert.deepEqual(unexplained.to, { home: 1, away: 1 });
  assert.match(unexplained.message, /صُحّحت النتيجة/);
  // No previous score means nothing to correct.
  assert.equal(detectScoreCorrection(null, { home: 1, away: 0 }, []), null);
  // A VAR reversal shows up as an unexplained downward change.
  const reversal = detectScoreCorrection({ home: 2, away: 0 }, { home: 1, away: 0 }, []);
  assert.ok(reversal, 'score corrected downward');
});

test('an own goal credits the opponent and is not mistaken for a score correction', () => {
  // An own goal must not debit the conceding side: doing so produced a false
  // "the source corrected the score" alert on every own goal, in both directions.
  const awayOwnGoal = [{ kind: 'goal', event: normalizeEvent({ type: 'Own Goal', minute: 30, team: { name: 'Away', homeAway: 'away' }, player: { name: 'X' } }) }];
  assert.equal(awayOwnGoal[0].event.type, 'own_goal');
  assert.equal(awayOwnGoal[0].event.teamSide, 'away');
  // Away concedes, so home goes 1 -> 2 and away stays 0.
  assert.equal(detectScoreCorrection({ home: 1, away: 0 }, { home: 2, away: 0 }, awayOwnGoal), null);

  const homeOwnGoal = [{ kind: 'goal', event: normalizeEvent({ type: 'Own Goal', minute: 30, team: { name: 'Home', homeAway: 'home' }, player: { name: 'Y' } }) }];
  // Home concedes, so away goes 0 -> 1 and home is unchanged.
  assert.equal(detectScoreCorrection({ home: 1, away: 0 }, { home: 1, away: 1 }, homeOwnGoal), null);
  // But crediting the wrong side is still a genuine correction.
  assert.ok(detectScoreCorrection({ home: 1, away: 0 }, { home: 2, away: 0 }, homeOwnGoal), 'home scoring off its own own-goal is unexplained');

  // A normal goal by each side explains a 1-1 -> 2-2 move.
  const both = [
    { kind: 'goal', event: normalizeEvent({ type: 'Goal', minute: 50, team: { homeAway: 'home' }, player: { name: 'H' } }) },
    { kind: 'goal', event: normalizeEvent({ type: 'Goal', minute: 63, team: { homeAway: 'away' }, player: { name: 'A' } }) },
  ];
  assert.equal(detectScoreCorrection({ home: 1, away: 1 }, { home: 2, away: 2 }, both), null);

  // A missed penalty and a cancelled goal move nothing.
  const miss = [{ kind: 'goal', event: normalizeEvent({ type: 'Penalty Missed', minute: 20, team: { homeAway: 'home' }, player: { name: 'Z' } }) }];
  assert.equal(detectScoreCorrection({ home: 0, away: 0 }, { home: 0, away: 0 }, miss), null);
  const cancelled = [{ kind: 'cancelled', event: normalizeEvent({ id: 4, type: 'VAR Cancelled', minute: 44, team: { homeAway: 'home' }, player: { name: 'W' } }) }];
  assert.ok(cancelled[0].event.cancelled);
  assert.ok(detectScoreCorrection({ home: 1, away: 0 }, { home: 0, away: 0 }, cancelled), 'a disallowed goal must show as a correction');

  // A goal whose side the source did not send is an attribution gap, not a
  // corrected score: the total still adds up, so no false alert is raised.
  const unattributed = [{ kind: 'goal', event: normalizeEvent({ type: 'Goal', minute: 70, player: { name: 'N' } }) }];
  assert.equal(unattributed[0].event.teamSide, null);
  assert.equal(detectScoreCorrection({ home: 0, away: 0 }, { home: 1, away: 0 }, unattributed), null);
  // ...but a total that does not add up is still reported.
  assert.ok(detectScoreCorrection({ home: 0, away: 0 }, { home: 2, away: 1 }, unattributed));
  // Malformed announcement lists do not throw.
  assert.equal(detectScoreCorrection({ home: 1, away: 0 }, { home: 1, away: 0 }, null), null);
  assert.equal(detectScoreCorrection({ home: 1, away: 0 }, { home: 1, away: 0 }, [null, {}]), null);
});

/* ── 7. Head-to-head ──────────────────────────────────────────────── */

test('the upcoming match stays out of its own head-to-head until it is actually completed', () => {
  // Rule 6: "سجل المواجهات لا يتضمن المباراة المقبلة قبل اكتمالها".
  const history = [
    { date: '2025-12-01', home: 'A', away: 'B', homeGoals: 1, awayGoals: 1, completed: true, friendly: false, competition: 'الدوري الإنجليزي', year: '2025' },
    { date: '2025-04-10', home: 'B', away: 'A', homeGoals: 0, awayGoals: 2, completed: true, friendly: false, competition: 'الدوري الإنجليزي', year: '2025' },
  ];
  const upcoming = { date: '2026-10-17', home: 'A', away: 'B', homeGoals: null, awayGoals: null, completed: false, friendly: false };
  const before = mergeH2h(history, upcoming);
  assert.equal(before.length, 2);
  assert.ok(!before.some(entry => entry.date === '2026-10-17'), 'upcoming match excluded');
});

test('after full time the match enters the record once, newest first, capped at three', () => {
  // Rule 8: "تحديث آخر ثلاث مواجهات مكتملة لإدخال هذا اللقاء دون تكراره".
  const history = [
    { date: '2025-12-01', home: 'A', away: 'B', homeGoals: 1, awayGoals: 1, completed: true },
    { date: '2025-04-10', home: 'B', away: 'A', homeGoals: 0, awayGoals: 2, completed: true },
    { date: '2024-09-05', home: 'A', away: 'B', homeGoals: 3, awayGoals: 0, completed: true },
  ];
  const finished = { fixtureId: 'x1', date: '2026-10-17', home: 'A', away: 'B', homeGoals: 2, awayGoals: 1, completed: true, friendly: false };
  const merged = mergeH2h(history, finished);
  assert.equal(merged.length, 3, 'still capped at three');
  assert.deepEqual(merged.map(entry => entry.date), ['2026-10-17', '2025-12-01', '2025-04-10'], 'newest first, oldest dropped');
  // Inserting it a second time must not duplicate it.
  assert.deepEqual(mergeH2h(merged, finished), merged);
  // Entries already carrying the same fixture id are recognized as the same match.
  const sameId = { ...finished, homeGoals: 9, awayGoals: 9 };
  assert.equal(mergeH2h(merged, sameId).length, 3);
});

test('an unclassified meeting is not silently labelled a friendly', () => {
  // Rule 5: "تمييز الوديات" — but only when the source actually says so.
  const history = [
    { date: '2025-08-01', home: 'A', away: 'B', homeGoals: 1, awayGoals: 0, completed: true, friendly: true, competition: 'ودية للأندية' },
    { date: '2025-05-01', home: 'A', away: 'B', homeGoals: 2, awayGoals: 2, completed: true, friendly: null, competition: null },
  ];
  const merged = mergeH2h(history, null);
  assert.equal(merged[0].friendly, true, 'declared friendly keeps its flag');
  assert.equal(merged[1].friendly, null, 'unknown stays unknown, never guessed false');
  // Incomplete entries never enter the record even if dated.
  assert.equal(mergeH2h([{ date: '2026-01-01', completed: false }], null).length, 0);
});

test('only an official result enters the record: an abandoned match without a score does not', () => {
  // Rule 5 asks for "آخر ثلاث مواجهات مكتملة". A match abandoned after kickoff
  // has ended but has no official result, so counting it would either show a
  // meeting with no score or push a genuine meeting out of the last three.
  const abandoned = normalizeStatus(espnStatus('STATUS_ABANDONED'), 'espn');
  assert.equal(abandoned.completed, true, 'it did end');
  assert.equal(isResultOfficial(abandoned, null), false, 'but there is no official result');
  assert.equal(isResultOfficial(abandoned, { home: 2, away: 0 }), false, 'a partial score is still not a final one');
  const fullTime = normalizeStatus(espnStatus('STATUS_FULL_TIME', { completed: true }), 'espn');
  assert.equal(isResultOfficial(fullTime, { home: 2, away: 0 }), true);
  assert.equal(isResultOfficial(fullTime, { home: 2, away: null }), false);
  assert.equal(isResultOfficial(fullTime, null), false);
  assert.equal(isResultOfficial(normalizeStatus(espnStatus('STATUS_IN_PLAY'), 'espn'), { home: 1, away: 0 }), false);

  const history = [
    { date: '2025-12-01', home: 'A', away: 'B', homeGoals: 1, awayGoals: 1, completed: true },
    { date: '2025-04-10', home: 'B', away: 'A', homeGoals: 0, awayGoals: 2, completed: true },
    { date: '2025-01-15', home: 'A', away: 'B', homeGoals: 3, awayGoals: 1, completed: true },
  ];
  const noScore = { date: '2026-10-17', home: 'A', away: 'B', homeGoals: null, awayGoals: null, completed: true };
  const merged = mergeH2h(history, noScore);
  assert.equal(merged.length, 3, 'the scoreless meeting is not inserted');
  assert.ok(!merged.some(entry => entry.date === '2026-10-17'));
  assert.deepEqual(merged.map(entry => entry.date), ['2025-12-01', '2025-04-10', '2025-01-15'], 'the real three are kept');
  // Malformed stored entries are filtered out too, not just the incoming one.
  assert.equal(mergeH2h([{ date: '2025-01-01', completed: true, homeGoals: null, awayGoals: null }, { date: 'nonsense', completed: true, homeGoals: 1, awayGoals: 0 }], null).length, 0);
  assert.equal(mergeH2h(null, null).length, 0, 'a null record does not throw');
  assert.equal(mergeH2h(history, null, 0).length, 0, 'a zero limit is respected');
});

/* ── 8. Tabs ──────────────────────────────────────────────────────── */

test('the opening tab follows the data state, and five tabs exist in a fixed order', () => {
  // Rule 5: "عند الدخول نفتح التبويب المناسب للحالة".
  assert.deepEqual(TABS.map(tab => tab.id), ['preview', 'history', 'lineups', 'live', 'report']);
  assert.deepEqual(TABS.map(tab => tab.label), ['معاينة', 'المواجهات', 'التشكيلات', 'مباشر', 'بعد المباراة']);
  assert.equal(defaultTab(normalizeStatus(espnStatus('STATUS_SCHEDULED'), 'espn')), 'preview');
  assert.equal(defaultTab(normalizeStatus(espnStatus('STATUS_IN_PLAY'), 'espn')), 'live');
  assert.equal(defaultTab(normalizeStatus(espnStatus('STATUS_HALFTIME'), 'espn')), 'live');
  assert.equal(defaultTab(normalizeStatus(espnStatus('STATUS_SUSPENDED'), 'espn')), 'live');
  assert.equal(defaultTab(normalizeStatus(espnStatus('STATUS_FULL_TIME'), 'espn')), 'report');
  assert.equal(defaultTab(normalizeStatus(espnStatus('STATUS_ABANDONED'), 'espn')), 'report');
  assert.equal(defaultTab(normalizeStatus(espnStatus('STATUS_POSTPONED'), 'espn')), 'preview');
  assert.equal(defaultTab(null), 'preview', 'unknown state opens on the preview, not on a claim');
});

test('a tab the visitor chose is never taken away by a refresh or an arriving goal', () => {
  // Rule 5: "إذا اختار المستخدم تبويباً بنفسه، فلا ننقله منه قسرياً".
  const nowLive = normalizeStatus(espnStatus('STATUS_IN_PLAY'), 'espn');
  assert.equal(resolveTab(nowLive, 'history'), 'history', 'reading the record while the match goes live');
  assert.equal(resolveTab(nowLive, 'preview'), 'preview');
  assert.equal(resolveTab(nowLive, 'lineups'), 'lineups');
  // The state change from pre-match to live does not move a settled visitor.
  assert.equal(resolveTab(normalizeStatus(espnStatus('STATUS_SCHEDULED'), 'espn'), 'lineups'), 'lineups');
  assert.equal(resolveTab(nowLive, 'lineups'), 'lineups');
  // With no choice, the state decides.
  assert.equal(resolveTab(nowLive, null), 'live');
  // An invalid choice falls back rather than breaking the tablist.
  assert.equal(resolveTab(nowLive, 'not-a-tab'), 'live');
});

test('arrow keys walk the tablist in visual RTL order', () => {
  // Rule 10: keyboard-operable tabs with a sensible RTL order. In RTL the
  // visually next tab sits to the left, i.e. earlier in DOM order.
  assert.equal(nextTabId('preview', 'next'), 'history');
  assert.equal(nextTabId('history', 'next'), 'lineups');
  assert.equal(nextTabId('report', 'next'), 'preview', 'wraps forward');
  assert.equal(nextTabId('preview', 'previous'), 'report', 'wraps backward');
  assert.equal(nextTabId('report', 'previous'), 'live', 'the tab before the report is the live tab');
  assert.equal(nextTabId('live', 'previous'), 'lineups');
  // Every tab is reachable in five steps with no dead end.
  let id = 'preview';
  const visited = new Set();
  for (let step = 0; step < TABS.length; step++) { visited.add(id); id = nextTabId(id, 'next'); }
  assert.equal(visited.size, TABS.length);
  assert.equal(id, 'preview', 'returns to the start');
});

/* ── 9. Comparison and radar honesty ──────────────────────────────── */

/* Every metric declares its provider on purpose: a comparison whose rows do not
   name a source cannot be checked for mixing, so the contract refuses it. The
   fixtures below therefore carry one, which makes these tests stricter than
   before rather than looser. */
const AXES = [
  { key: 'possession', label: 'الاستحواذ', unit: '%', home: 62, away: 38, provider: 'snapshot' },
  { key: 'shots', label: 'التسديدات', unit: 'تسديدة', home: 14, away: 7, provider: 'snapshot' },
  { key: 'passes', label: 'التمريرات', unit: 'تمريرة', home: 540, away: 310, provider: 'snapshot' },
];

test('a valid comparison draws a polygon and normalizes against the pair maximum, not a 0–100 score', () => {
  const result = buildComparison(AXES, { mode: 'match' });
  assert.equal(result.ok, true);
  assert.equal(result.polygon, true);
  assert.equal(result.reason, 'OK');
  assert.equal(result.axes.length, 3);
  // Rule 9: "توحيد المقاييس بطريقة معلنة، وعدم تقديم الرادار كدرجة قوة أو
  // تقييم من 100". The declared rule is ratio-to-larger-side, capped at 1.
  assert.equal(result.axes[0].homeNorm, 1);
  assert.equal(result.axes[0].awayNorm, 38 / 62);
  assert.ok(result.axes.every(axis => axis.homeNorm <= 1 && axis.awayNorm <= 1));
  assert.ok(result.axes.every(axis => axis.homeNorm >= 0 && axis.awayNorm >= 0));
  // Raw numbers and units travel with the axes for the adjacent table.
  assert.equal(result.axes[1].home, 14);
  assert.equal(result.axes[1].unit, 'تسديدة');
  // A genuine 0–0 pair normalizes to zeros, which is a real value not a gap.
  const zeros = buildComparison([...AXES, { key: 'errors', label: 'أخطاء', unit: '', home: 0, away: 0 }]);
  const axis = zeros.axes.find(entry => entry.key === 'errors');
  assert.equal(axis.comparable, true);
  assert.equal(axis.homeNorm, 0);
});

test('a missing axis is never zero-filled: it leaves the polygon but stays visible in the table', () => {
  // Rule 9: "عدم استكمال المحاور الناقصة بأصفار أو قيم تخمينية".
  const metrics = [...AXES, { key: 'xg', label: 'الأهداف المتوقعة', unit: 'هدف', home: null, away: 1.4 }];
  const result = buildComparison(metrics);
  assert.equal(result.ok, true, 'three comparable axes are still enough');
  const missing = result.axes.find(axis => axis.key === 'xg');
  assert.equal(missing.comparable, false);
  assert.equal(missing.homeNorm, null, 'not 0');
  assert.equal(missing.home, null);
  assert.equal(missing.away, 1.4, 'the side that does have data is kept');
  assert.equal(result.tableOk, true, 'the raw table still renders');
  // The polygon drops the incomplete axis instead of drawing it as zero.
  const points = radarPoints(result.axes, { side: 'home' });
  assert.equal(points.trim().split(/\s+/).length, 3, 'three vertices for three comparable axes');
});

test('insufficient data yields the table plus a clear message instead of a misleading polygon', () => {
  // Rule 9: "عند عدم كفاية البيانات، نعرض جدول المقارنة ورسالة واضحة بدلاً من
  // مضلع مضلل".
  const two = buildComparison(AXES.slice(0, 2));
  assert.equal(two.polygon, false);
  assert.equal(two.ok, false);
  assert.equal(two.reason, 'INSUFFICIENT_AXES');
  assert.equal(two.tableOk, true, 'the two known axes are still shown as numbers');
  assert.equal(two.axes.length, 2);
  assert.match(two.message, /لا يكفي لرسم مضلع غير مضلل/);
  assert.equal(radarPoints(two.axes), '', 'no polygon coordinates are produced');

  const one = buildComparison([AXES[0]]);
  assert.equal(one.polygon, false);
  assert.equal(one.reason, 'INSUFFICIENT_AXES');
  assert.equal(buildComparison([]).reason, 'NO_DATA');
  assert.equal(buildComparison([]).tableOk, false);
});

test('numbers from two providers are refused outright, not averaged into one chart', () => {
  // Rule 2: "لا تخلط أرقام مزوّدين مختلفين داخل مقارنة واحدة".
  const mixed = buildComparison([
    { key: 'possession', label: 'الاستحواذ', home: 60, away: 40, provider: 'espn' },
    { key: 'shots', label: 'التسديدات', home: 12, away: 9, provider: 'apifootball' },
    { key: 'passes', label: 'التمريرات', home: 500, away: 400, provider: 'espn' },
  ]);
  assert.equal(mixed.ok, false);
  assert.equal(mixed.reason, 'MIXED_PROVIDERS');
  assert.equal(mixed.tableOk, false, 'not even the table, since the rows are incomparable');
  assert.equal(mixed.axes.length, 0);
  // A single explicit provider for all metrics is accepted.
  const single = buildComparison(AXES, { provider: 'snapshot' });
  assert.equal(single.ok, true);
  assert.equal(single.provider, 'snapshot');
});

test('match numbers and season averages cannot share one radar', () => {
  // Rule 9: pre-match uses homogeneous period data; live and post use this
  // match's own numbers. Mixing them compares one game against a whole season.
  const mixed = buildComparison([
    { key: 'possession', label: 'الاستحواذ', home: 60, away: 40, mode: 'match', provider: 'snapshot' },
    { key: 'shots_avg', label: 'متوسط التسديدات', home: 12, away: 9, mode: 'season', provider: 'snapshot' },
    { key: 'passes', label: 'التمريرات', home: 500, away: 400, mode: 'match', provider: 'snapshot' },
  ]);
  assert.equal(mixed.ok, false);
  assert.equal(mixed.reason, 'MIXED_MODES');
  assert.equal(mixed.tableOk, false);
});

test('provider odds and win probabilities are never presented as actual statistics', () => {
  // Rule 9: "عدم استخدام توقعات المزود أو احتمالات الفوز على أنها إحصائيات فعلية".
  for (const key of ['odds', 'winProbability', 'prediction', 'expectedWinner', 'impliedChance', 'bettingLine']) {
    const result = buildComparison([
      { key, label: 'احتمال', home: 60, away: 40 },
      ...AXES.slice(0, 2),
    ]);
    assert.equal(result.ok, false, `${key} must be refused`);
    assert.equal(result.reason, 'FORBIDDEN_METRIC', key);
    assert.equal(result.tableOk, false, `and not shown as a number either: ${key}`);
  }
});

test('more than six axes are refused rather than silently truncated', () => {
  const many = Array.from({ length: 7 }, (_, index) => ({ key: `k${index}`, label: `محور ${index}`, home: index + 1, away: index + 2, provider: 'snapshot' }));
  const result = buildComparison(many);
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'TOO_MANY_AXES');
  assert.match(result.message, /ستة محاور/);
  // Exactly six is allowed.
  assert.equal(buildComparison(many.slice(0, 6)).ok, true);
});

test('a malformed metric row refuses the whole comparison instead of crashing the render path', () => {
  // buildComparison is called while rendering, so a throw would take the page
  // down. Degrading to a clear message is the required behaviour.
  for (const broken of [null, undefined, 42, 'possession', {}, { key: 'shots' }, { label: 'تسديدات' }]) {
    const result = buildComparison([...AXES.slice(0, 2), broken]);
    assert.equal(result.ok, false, `broken row ${JSON.stringify(broken)}`);
    assert.equal(result.reason, 'INVALID_METRICS', `broken row ${JSON.stringify(broken)}`);
    assert.equal(result.tableOk, false, `a broken dataset renders no table either: ${JSON.stringify(broken)}`);
  }
});

test('a comparison whose rows name no source is refused, since uniformity cannot be checked', () => {
  // Rule 2 forbids mixing providers; without a declared provider there is no way
  // to know whether the three rows even came from the same one.
  const undeclared = [
    { key: 'possession', label: 'الاستحواذ', home: 62, away: 38 },
    { key: 'shots', label: 'التسديدات', home: 14, away: 7 },
    { key: 'passes', label: 'التمريرات', home: 540, away: 310 },
  ];
  const result = buildComparison(undeclared);
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'UNDECLARED_PROVIDER');
  assert.equal(result.tableOk, false);
  assert.equal(result.axes.length, 0);
  // Declaring it once for the whole comparison is enough.
  assert.equal(buildComparison(undeclared, { provider: 'snapshot' }).ok, true);
  assert.equal(buildComparison(undeclared, { provider: 'snapshot' }).provider, 'snapshot');
});

test('pre-match comparison requires a declared sample size, and the sample is carried through', () => {
  // Rule 9: "بيانات متجانسة لنفس المسابقة والفترة، إن توفرت، مع توضيح حجم العينة".
  const sample = { competition: 'الدوري الإنجليزي', period: '2026/27', matches: 8 };
  const withSample = buildComparison(AXES, { mode: 'season', sample });
  assert.equal(withSample.ok, true);
  assert.deepEqual(withSample.sample, sample);
  assert.equal(withSample.mode, 'season');

  for (const bad of [null, { competition: 'x', period: 'y', matches: 0 }, { competition: 'x', period: 'y' }]) {
    const result = buildComparison(AXES, { mode: 'season', sample: bad });
    assert.equal(result.ok, false, JSON.stringify(bad));
    assert.equal(result.reason, 'NO_SAMPLE');
    assert.equal(result.tableOk, false, 'no averages without a known sample');
  }
  // Match mode needs no sample.
  assert.equal(buildComparison(AXES, { mode: 'match' }).ok, true);
});

test('radar geometry places the first axis at the top and keeps both sides on the same vertices', () => {
  const result = buildComparison(AXES);
  const home = radarPoints(result.axes, { cx: 100, cy: 100, r: 80, side: 'home' }).trim().split(/\s+/);
  const away = radarPoints(result.axes, { cx: 100, cy: 100, r: 80, side: 'away' }).trim().split(/\s+/);
  assert.equal(home.length, away.length);
  // First vertex is straight up because the leading axis normalizes to 1.
  assert.equal(home[0], '100.00,20.00');
  // No coordinate may escape the drawing box.
  for (const points of [...home, ...away]) {
    const [x, y] = points.split(',').map(Number);
    assert.ok(x >= 20 && x <= 180 && y >= 20 && y <= 180, `${points} inside the box`);
  }
  // Fewer than three comparable axes produces no geometry at all.
  assert.equal(radarPoints([{ ...result.axes[0], awayNorm: null, comparable: false }, result.axes[1]]), '');
});

/* ── 10. Polling cadence per data type ────────────────────────────── */

test('each data type polls at its own cadence, and the live score uses the agreed 60 seconds', () => {
  // Rule 11: "تحديث كل نوع بيانات حسب تواتر توفره، وليس افتراض أن الترتيب
  // والتقييمات والنتيجة تتجدد بالمعدل نفسه" + "كل 60 ثانية" for score/status.
  const live = normalizeStatus(espnStatus('STATUS_IN_PLAY'), 'espn');
  assert.equal(pollIntervalFor(live, 'status'), 60_000);
  assert.equal(pollIntervalFor(live, 'events'), 60_000);
  assert.equal(pollIntervalFor(live, 'statistics'), 60_000);
  assert.equal(pollIntervalFor(live, 'lineups'), 300_000, 'lineups are published, not streamed');
  assert.equal(pollIntervalFor(live, 'standings'), 1_800_000, 'shared across the three matches');
  assert.equal(pollIntervalFor(live, 'ratings'), null, 'no in-match ratings from this layer');

  const pre = normalizeStatus(espnStatus('STATUS_SCHEDULED'), 'espn');
  assert.equal(pollIntervalFor(pre, 'status'), 300_000, 'pre-match does not need 60s');
  assert.equal(pollIntervalFor(pre, 'lineups'), 300_000, 'confirmed lineups get picked up');

  const post = normalizeStatus(espnStatus('STATUS_FULL_TIME', { completed: true }), 'espn');
  assert.equal(pollIntervalFor(post, 'status'), 300_000, 'rule 8: eased after full time');
  assert.ok(pollIntervalFor(post, 'status') > pollIntervalFor(live, 'status'));
  assert.equal(pollIntervalFor(post, 'ratings'), 600_000, 'ratings may still arrive later');
  assert.equal(pollIntervalFor(post, 'lineups'), null, 'lineups are final by then');

  const postponed = normalizeStatus(espnStatus('STATUS_POSTPONED'), 'espn');
  assert.equal(pollIntervalFor(postponed, 'status'), 900_000, 'a new date may appear');
  assert.equal(pollIntervalFor(postponed, 'events'), null);
  // An unknown data type simply is not requested.
  assert.equal(pollIntervalFor(live, 'not-a-type'), null);
});

test('polling stops only after full time, the settle window, and the late data having arrived', () => {
  const now = Date.parse('2026-10-17T18:00:00Z');
  const finished = { ...normalizeStatus(espnStatus('STATUS_FULL_TIME', { completed: true }), 'espn'), finishedAt: '2026-10-17T16:00:00Z' };
  const complete = snapshot('m', { statistics: [{ key: 'possession', label: 'x', home: 1, away: 1 }], ratings: [] });
  assert.equal(shouldStopPolling(finished, complete, now), true, 'window passed and late data present');

  const noStats = snapshot('m', { statistics: null, ratings: [] });
  assert.equal(shouldStopPolling(finished, noStats, now), false, 'statistics may still arrive');
  const noRatings = snapshot('m', { statistics: [], ratings: null });
  assert.equal(shouldStopPolling(finished, noRatings, now), false, 'ratings may still arrive');

  const early = Date.parse('2026-10-17T16:30:00Z');
  assert.equal(shouldStopPolling(finished, complete, early), false, 'still inside the settle window');
  assert.equal(POST_MATCH_WINDOW_MS, 3_600_000);

  // A live or pre-match state never stops polling.
  assert.equal(shouldStopPolling(normalizeStatus(espnStatus('STATUS_IN_PLAY'), 'espn'), complete, now), false);
  assert.equal(shouldStopPolling(finished, null, now), false, 'no data at all is not a reason to stop');
});

test('polling is gated on the tab being visible and the browser being online', () => {
  // Rule 11: "إيقاف polling عند إخفاء الصفحة واستئنافه عند العودة أو استعادة
  // الاتصال" — the same discipline MatchesPage already applies.
  assert.equal(pollingAllowed({ hidden: false, online: true }), true);
  assert.equal(pollingAllowed({ hidden: true, online: true }), false);
  assert.equal(pollingAllowed({ hidden: false, online: false }), false);
  assert.equal(pollingAllowed({ hidden: true, online: false }), false);
});

test('every polling phase declares its cadences in one table', () => {
  for (const phase of Object.values(PHASES)) {
    assert.ok(POLL_INTERVALS[phase], `cadence table for ${phase}`);
  }
  for (const [phase, table] of Object.entries(POLL_INTERVALS)) {
    for (const [type, value] of Object.entries(table)) {
      assert.ok(value === null || (typeof value === 'number' && value > 0), `${phase}.${type} is null or a positive interval`);
    }
  }
});

/* ── 11. Routes and fixture definitions ───────────────────────────── */

test('all verified fixtures have independent stable routes with no state, score or kickoff in the path', () => {
  // Rule 3: an independent, stable URL per match that survives the transition
  // from preview to live to the final report.
  const routes = matchCenterRoutes();
  assert.equal(routes.length, MATCH_CENTER_ALL_MATCHES.length);
  assert.equal(routes.length, 620);
  assert.equal(new Set(routes).size, routes.length, 'unique');
  const stateWords = ['preview', 'live', 'report', 'halftime', 'finished', 'scheduled', 'postponed', 'lineups', 'history'];
  for (const route of routes) {
    assert.ok(route.endsWith('/'), `${route} ends with a slash like every other route`);
    const segments = route.split('/').filter(Boolean);
    // Checked per segment on purpose: "live" appears inside "liverpool", and a
    // substring test would fail for a reason that has nothing to do with state.
    assert.ok(!segments.some(segment => stateWords.includes(segment)), `${route} carries no state segment`);
    assert.ok(!segments.some(segment => /^\d+-\d+$/.test(segment)), `${route} carries no score`);
    assert.ok(!/\d{4}-\d{2}-\d{2}/.test(route), `${route} carries no kickoff date`);
    assert.ok(!/[?#]/.test(route), `${route} has no query or fragment`);
  }
  // Route construction has a single source of truth for both competitions.
  for (const match of MATCH_CENTER_ALL_MATCHES) {
    const route = `/matches/${match.competitionSlug}/${match.slug}/`;
    assert.equal(matchPath(match.competitionSlug, match.slug), route);
    assert.ok(routes.includes(route));
    assert.ok(!route.includes(match.externalIds.espn), `${match.slug}: URL does not expose the provider id`);
    assert.equal(matchBySlug(match.slug), match);
    assert.equal(matchByRoute(route), match);
  }
  assert.ok(routes.slice(0, MATCH_CENTER_MATCHES.length).every(route => route.startsWith(`/matches/${MATCH_CENTER_COMPETITION.slug}/`)));
  assert.equal(matchBySlug('no-such-match'), null);
});

test('the English Oct 18–23 output is source-bound by event, team IDs, sides, venue and UTC kickoff before indexing', () => {
  const verification = MATCH_CENTER_ENGLISH_20261018_20261023_VERIFICATION;
  const dates = '20261018-20261023';
  const expected = [
    ['401879263', '2026-10-18T13:00Z', 'Sunderland at AFC Bournemouth', 'Vitality Stadium', '349', 'AFC Bournemouth', '366', 'Sunderland'],
    ['401879261', '2026-10-18T13:00Z', 'Crystal Palace at Brighton & Hove Albion', 'American Express Stadium', '331', 'Brighton & Hove Albion', '384', 'Crystal Palace'],
    ['401879260', '2026-10-18T13:00Z', 'Manchester United at Leeds United', 'Elland Road', '357', 'Leeds United', '360', 'Manchester United'],
    ['401878769', '2026-10-18T15:30Z', 'Arsenal at Nottingham Forest', 'The City Ground', '393', 'Nottingham Forest', '359', 'Arsenal'],
    ['401879257', '2026-10-19T19:00Z', 'Coventry City at Tottenham Hotspur', 'Tottenham Hotspur Stadium', '367', 'Tottenham Hotspur', '388', 'Coventry City'],
    ['401879253', '2026-10-23T19:00Z', 'Nottingham Forest at Ipswich Town', 'Portman Road', '373', 'Ipswich Town', '393', 'Nottingham Forest'],
  ];
  assert.equal(verification.receivedOn, '2026-10-17');
  assert.equal(verification.provider, 'espn');
  assert.equal(verification.leagueId, 'eng.1');
  assert.match(verification.method, /لم ينفذ المساعد طلب API/);
  assert.deepEqual(verification.receivedRanges.map(({ dates: range, eventCount, complete }) => [range, eventCount, complete]), [[dates, 6, true]]);
  assert.deepEqual(verification.receivedRanges.map(({ scoreboardEndpoint }) => scoreboardEndpoint), [
    `https://streammasterstore.com/scoreboard.php?league=eng.1&dates=${dates}`,
  ]);
  assert.deepEqual(MATCH_CENTER_ENGLISH_20261018_20261023_RANGES.map(({ dates: range, events }) => [range, events.length]), [[dates, 6]]);
  assert.equal(verification.receivedEvents.length, 6);
  assert.equal(verification.receivedTeams.length, 12);
  assert.deepEqual(verification.receivedEvents.map(({ id, date, name, venue, status, window }) => [id, date, name, venue, status, window]),
    expected.map(([id, date, name, venue]) => [id, date, name, venue, 'STATUS_SCHEDULED', dates]));
  assert.equal(new Set(expected.map(([id]) => id)).size, 6, 'received event ids are unique');

  for (const [eventId, sourceDate, eventName, venue, homeId, homeName, awayId, awayName] of expected) {
    const fixture = MATCH_CENTER_ENGLISH_20261018_20261023_MATCHES.find(match => match.externalIds.espn === eventId);
    assert.ok(fixture, `${eventId}: indexed only after source match`);
    assert.equal(matchByExternalId('espn', eventId), fixture);
    assert.equal(fixture.sourceEventName, eventName);
    assert.equal(fixture.kickoffUtc, `${sourceDate.slice(0, -1)}:00Z`);
    assert.equal(fixture.venue, venue);
    assert.equal(fixture.leagueId, 'eng.1');
    assert.equal(fixture.season, '2026/27');
    assert.equal(fixture.verification, 'confirmed');
    assert.equal(fixture.home.sourceName, homeName);
    assert.equal(fixture.home.externalIds.espn, homeId);
    assert.equal(fixture.away.sourceName, awayName);
    assert.equal(fixture.away.externalIds.espn, awayId);
    assert.equal(fixture.sourceEventName, `${awayName} at ${homeName}`);
    assert.equal(fixture.id, fixture.slug);
    assert.equal(fixture.round, null, 'round is not inferred');
    assert.equal(fixture.score, undefined, 'the scheduled output contains no score');
  }
  assert.equal(MATCH_CENTER_ENGLISH_20261018_20261023_MATCHES.length, 6);
  assert.equal(MATCH_CENTER_ENGLISH_MATCHES.length, 320, 'the five Oct 17 fixtures stay alongside the three hundred fifteen received fixtures');
  assert.equal(MATCH_CENTER_SPANISH_MATCHES.length, 300);
  assert.equal(MATCH_CENTER_ALL_MATCHES.length, 620);
  assert.equal(new Set(MATCH_CENTER_ALL_MATCHES.map(match => match.externalIds.espn)).size, 620,
    'all 320 English and 300 Spanish source ids remain unique');
});

test('the English Oct 24–30 output binds all nine event IDs, team sides, venues and UTC kickoffs before indexing', () => {
  const verification = MATCH_CENTER_ENGLISH_20261024_20261030_VERIFICATION;
  const dates = '20261024-20261030';
  const expected = [
    ['401879256', '2026-10-24T11:30Z', 'Manchester City at Aston Villa', 'Villa Park', '362', 'Aston Villa', '382', 'Manchester City'],
    ['401878768', '2026-10-24T14:00Z', 'Everton at Arsenal', 'Emirates Stadium', '359', 'Arsenal', '368', 'Everton'],
    ['401879255', '2026-10-24T14:00Z', 'Fulham at Coventry City', 'Coventry Building Society Arena', '388', 'Coventry City', '370', 'Fulham'],
    ['401878767', '2026-10-24T16:30Z', 'Tottenham Hotspur at Chelsea', 'Stamford Bridge', '363', 'Chelsea', '367', 'Tottenham Hotspur'],
    ['401879254', '2026-10-25T14:00Z', 'Newcastle United at Crystal Palace', 'Selhurst Park', '384', 'Crystal Palace', '361', 'Newcastle United'],
    ['401878766', '2026-10-25T14:00Z', 'Brentford at Hull City', 'The MKM Stadium', '306', 'Hull City', '337', 'Brentford'],
    ['401878765', '2026-10-25T14:00Z', 'Brighton & Hove Albion at Liverpool', 'Anfield', '364', 'Liverpool', '331', 'Brighton & Hove Albion'],
    ['401879252', '2026-10-25T14:00Z', 'AFC Bournemouth at Manchester United', 'Old Trafford', '360', 'Manchester United', '349', 'AFC Bournemouth'],
    ['401878764', '2026-10-25T16:30Z', 'Leeds United at Sunderland', 'Stadium of Light', '366', 'Sunderland', '357', 'Leeds United'],
  ];
  assert.equal(verification.receivedOn, '2026-10-17');
  assert.equal(verification.provider, 'espn');
  assert.equal(verification.leagueId, 'eng.1');
  assert.match(verification.method, /لم ينفذ المساعد طلب API/);
  assert.deepEqual(verification.receivedRanges.map(({ dates: range, eventCount, complete }) => [range, eventCount, complete]), [[dates, 9, true]]);
  assert.deepEqual(verification.receivedRanges.map(({ scoreboardEndpoint }) => scoreboardEndpoint), [
    `https://streammasterstore.com/scoreboard.php?league=eng.1&dates=${dates}`,
  ]);
  assert.deepEqual(MATCH_CENTER_ENGLISH_20261024_20261030_RANGES.map(({ dates: range, events }) => [range, events.length]), [[dates, 9]]);
  assert.equal(verification.receivedEvents.length, 9);
  assert.equal(verification.receivedTeams.length, 18);
  assert.deepEqual(verification.receivedEvents.map(({ id, date, name, venue, status, window }) => [id, date, name, venue, status, window]),
    expected.map(([id, date, name, venue]) => [id, date, name, venue, 'STATUS_SCHEDULED', dates]));
  assert.equal(new Set(expected.map(([id]) => id)).size, 9, 'received event ids are unique');

  for (const [eventId, sourceDate, eventName, venue, homeId, homeName, awayId, awayName] of expected) {
    const fixture = MATCH_CENTER_ENGLISH_20261024_20261030_MATCHES.find(match => match.externalIds.espn === eventId);
    assert.ok(fixture, `${eventId}: indexed only after source match`);
    assert.equal(matchByExternalId('espn', eventId), fixture);
    assert.equal(fixture.sourceEventName, eventName);
    assert.equal(fixture.kickoffUtc, `${sourceDate.slice(0, -1)}:00Z`);
    assert.equal(fixture.venue, venue);
    assert.equal(fixture.leagueId, 'eng.1');
    assert.equal(fixture.season, '2026/27');
    assert.equal(fixture.verification, 'confirmed');
    assert.equal(fixture.home.sourceName, homeName);
    assert.equal(fixture.home.externalIds.espn, homeId);
    assert.equal(fixture.away.sourceName, awayName);
    assert.equal(fixture.away.externalIds.espn, awayId);
    assert.equal(fixture.sourceEventName, `${awayName} at ${homeName}`);
    assert.equal(fixture.id, fixture.slug);
    assert.equal(fixture.round, null, 'round is not inferred');
    assert.equal(fixture.score, undefined, 'the scheduled output contains no score');
  }
  assert.equal(MATCH_CENTER_ENGLISH_20261024_20261030_MATCHES.length, 9);
  assert.equal(MATCH_CENTER_ENGLISH_20261018_20261023_MATCHES.length, 6);
  assert.equal(MATCH_CENTER_ENGLISH_MATCHES.length, 320, 'the five Oct 17 and three hundred fifteen received fixtures remain in the league set');
  assert.equal(MATCH_CENTER_SPANISH_MATCHES.length, 300);
  assert.equal(MATCH_CENTER_ALL_MATCHES.length, 620);
  assert.equal(new Set(MATCH_CENTER_ALL_MATCHES.map(match => match.externalIds.espn)).size, 620,
    'all 320 English and 300 Spanish source ids remain unique');
});

test('the English Oct 31–Nov 6 output binds all eleven event IDs, team sides, venues and UTC kickoffs before indexing', () => {
  const verification = MATCH_CENTER_ENGLISH_20261031_20261106_VERIFICATION;
  const dates = '20261031-20261106';
  const expected = [
    ['401879248', '2026-10-31T12:30Z', 'Manchester United at Chelsea', 'Stamford Bridge', '363', 'Chelsea', '360', 'Manchester United'],
    ['401879251', '2026-10-31T15:00Z', 'Leeds United at AFC Bournemouth', 'Vitality Stadium', '349', 'AFC Bournemouth', '357', 'Leeds United'],
    ['401879249', '2026-10-31T15:00Z', 'Nottingham Forest at Brentford', 'Gtech Community Stadium', '337', 'Brentford', '393', 'Nottingham Forest'],
    ['401879247', '2026-10-31T15:00Z', 'Sunderland at Coventry City', 'Coventry Building Society Arena', '388', 'Coventry City', '366', 'Sunderland'],
    ['401878763', '2026-10-31T15:00Z', 'Ipswich Town at Hull City', 'The MKM Stadium', '306', 'Hull City', '373', 'Ipswich Town'],
    ['401879245', '2026-10-31T15:00Z', 'Brighton & Hove Albion at Manchester City', 'Etihad Stadium', '382', 'Manchester City', '331', 'Brighton & Hove Albion'],
    ['401878761', '2026-10-31T17:30Z', 'Crystal Palace at Tottenham Hotspur', 'Tottenham Hotspur Stadium', '367', 'Tottenham Hotspur', '384', 'Crystal Palace'],
    ['401879250', '2026-10-31T20:00Z', 'Fulham at Aston Villa', 'Villa Park', '362', 'Aston Villa', '370', 'Fulham'],
    ['401879246', '2026-11-01T16:30Z', 'Arsenal at Liverpool', 'Anfield', '364', 'Liverpool', '359', 'Arsenal'],
    ['401878762', '2026-11-02T20:00Z', 'Everton at Newcastle United', "St. James' Park", '361', 'Newcastle United', '368', 'Everton'],
    ['401879242', '2026-11-06T20:00Z', 'Coventry City at Everton', 'Hill Dickinson Stadium', '368', 'Everton', '388', 'Coventry City'],
  ];
  assert.equal(verification.receivedOn, '2026-10-17');
  assert.equal(verification.provider, 'espn');
  assert.equal(verification.leagueId, 'eng.1');
  assert.match(verification.method, /لم ينفذ المساعد طلب API/);
  assert.deepEqual(verification.receivedRanges.map(({ dates: range, eventCount, complete }) => [range, eventCount, complete]), [[dates, 11, true]]);
  assert.deepEqual(verification.receivedRanges.map(({ scoreboardEndpoint }) => scoreboardEndpoint), [
    `https://streammasterstore.com/scoreboard.php?league=eng.1&dates=${dates}`,
  ]);
  assert.deepEqual(MATCH_CENTER_ENGLISH_20261031_20261106_RANGES.map(({ dates: range, events }) => [range, events.length]), [[dates, 11]]);
  assert.equal(verification.receivedEvents.length, 11);
  assert.equal(verification.receivedTeams.length, 22);
  assert.deepEqual(verification.receivedEvents.map(({ id, date, name, venue, status, window }) => [id, date, name, venue, status, window]),
    expected.map(([id, date, name, venue]) => [id, date, name, venue, 'STATUS_SCHEDULED', dates]));
  assert.equal(new Set(expected.map(([id]) => id)).size, 11, 'received event ids are unique');

  for (const [eventId, sourceDate, eventName, venue, homeId, homeName, awayId, awayName] of expected) {
    const fixture = MATCH_CENTER_ENGLISH_20261031_20261106_MATCHES.find(match => match.externalIds.espn === eventId);
    assert.ok(fixture, `${eventId}: indexed only after source match`);
    assert.equal(matchByExternalId('espn', eventId), fixture);
    assert.equal(fixture.sourceEventName, eventName);
    assert.equal(fixture.kickoffUtc, `${sourceDate.slice(0, -1)}:00Z`);
    assert.equal(fixture.venue, venue);
    assert.equal(fixture.leagueId, 'eng.1');
    assert.equal(fixture.season, '2026/27');
    assert.equal(fixture.verification, 'confirmed');
    assert.equal(fixture.home.sourceName, homeName);
    assert.equal(fixture.home.externalIds.espn, homeId);
    assert.equal(fixture.away.sourceName, awayName);
    assert.equal(fixture.away.externalIds.espn, awayId);
    assert.equal(fixture.sourceEventName, `${awayName} at ${homeName}`);
    assert.equal(fixture.id, fixture.slug);
    assert.equal(fixture.round, null, 'round is not inferred');
    assert.equal(fixture.score, undefined, 'the scheduled output contains no score');
  }
  assert.equal(MATCH_CENTER_ENGLISH_20261031_20261106_MATCHES.length, 11);
  assert.equal(MATCH_CENTER_ENGLISH_20261024_20261030_MATCHES.length, 9);
  assert.equal(MATCH_CENTER_ENGLISH_20261018_20261023_MATCHES.length, 6);
  assert.equal(MATCH_CENTER_ENGLISH_MATCHES.length, 320);
  assert.equal(MATCH_CENTER_SPANISH_MATCHES.length, 300);
  assert.equal(MATCH_CENTER_ALL_MATCHES.length, 620);
  assert.equal(new Set(MATCH_CENTER_ALL_MATCHES.map(match => match.externalIds.espn)).size, 620,
    'all 320 English and 300 Spanish source ids remain unique');
});

test('the English Nov 7–13 output binds all nine event IDs, team sides, venues and UTC kickoffs before indexing', () => {
  const verification = MATCH_CENTER_ENGLISH_20261107_20261113_VERIFICATION;
  const dates = '20261107-20261113';
  const expected = [
    ['401878758', '2026-11-07T12:30Z', 'Tottenham Hotspur at Leeds United', 'Elland Road', '357', 'Leeds United', '367', 'Tottenham Hotspur'],
    ['401878760', '2026-11-07T15:00Z', 'Hull City at Arsenal', 'Emirates Stadium', '359', 'Arsenal', '306', 'Hull City'],
    ['401879241', '2026-11-07T15:00Z', 'Newcastle United at Fulham', 'Craven Cottage', '370', 'Fulham', '361', 'Newcastle United'],
    ['401878757', '2026-11-07T17:30Z', 'Manchester City at Nottingham Forest', 'The City Ground', '393', 'Nottingham Forest', '382', 'Manchester City'],
    ['401879244', '2026-11-08T14:00Z', 'Brentford at Brighton & Hove Albion', 'American Express Stadium', '331', 'Brighton & Hove Albion', '337', 'Brentford'],
    ['401879243', '2026-11-08T14:00Z', 'Liverpool at Crystal Palace', 'Selhurst Park', '384', 'Crystal Palace', '364', 'Liverpool'],
    ['401878759', '2026-11-08T14:00Z', 'AFC Bournemouth at Ipswich Town', 'Portman Road', '373', 'Ipswich Town', '349', 'AFC Bournemouth'],
    ['401879239', '2026-11-08T14:00Z', 'Chelsea at Sunderland', 'Stadium of Light', '366', 'Sunderland', '363', 'Chelsea'],
    ['401879240', '2026-11-08T16:30Z', 'Aston Villa at Manchester United', 'Old Trafford', '360', 'Manchester United', '362', 'Aston Villa'],
  ];
  assert.equal(verification.receivedOn, '2026-10-17');
  assert.equal(verification.provider, 'espn');
  assert.equal(verification.leagueId, 'eng.1');
  assert.match(verification.method, /لم ينفذ المساعد طلب API/);
  assert.deepEqual(verification.receivedRanges.map(({ dates: range, eventCount, complete }) => [range, eventCount, complete]), [[dates, 9, true]]);
  assert.deepEqual(verification.receivedRanges.map(({ scoreboardEndpoint }) => scoreboardEndpoint), [
    `https://streammasterstore.com/scoreboard.php?league=eng.1&dates=${dates}`,
  ]);
  assert.deepEqual(MATCH_CENTER_ENGLISH_20261107_20261113_RANGES.map(({ dates: range, events }) => [range, events.length]), [[dates, 9]]);
  assert.equal(verification.receivedEvents.length, 9);
  assert.equal(verification.receivedTeams.length, 18);
  assert.deepEqual(verification.receivedEvents.map(({ id, date, name, venue, status, window }) => [id, date, name, venue, status, window]),
    expected.map(([id, date, name, venue]) => [id, date, name, venue, 'STATUS_SCHEDULED', dates]));
  assert.equal(new Set(expected.map(([id]) => id)).size, 9, 'received event ids are unique');

  for (const [eventId, sourceDate, eventName, venue, homeId, homeName, awayId, awayName] of expected) {
    const fixture = MATCH_CENTER_ENGLISH_20261107_20261113_MATCHES.find(match => match.externalIds.espn === eventId);
    assert.ok(fixture, `${eventId}: indexed only after source match`);
    assert.equal(matchByExternalId('espn', eventId), fixture);
    assert.equal(fixture.sourceEventName, eventName);
    assert.equal(fixture.kickoffUtc, `${sourceDate.slice(0, -1)}:00Z`);
    assert.equal(fixture.venue, venue);
    assert.equal(fixture.leagueId, 'eng.1');
    assert.equal(fixture.season, '2026/27');
    assert.equal(fixture.verification, 'confirmed');
    assert.equal(fixture.home.sourceName, homeName);
    assert.equal(fixture.home.externalIds.espn, homeId);
    assert.equal(fixture.away.sourceName, awayName);
    assert.equal(fixture.away.externalIds.espn, awayId);
    assert.equal(fixture.sourceEventName, `${awayName} at ${homeName}`);
    assert.equal(fixture.id, fixture.slug);
    assert.equal(fixture.round, null, 'round is not inferred');
    assert.equal(fixture.score, undefined, 'the scheduled output contains no score');
  }
  assert.equal(MATCH_CENTER_ENGLISH_20261107_20261113_MATCHES.length, 9);
  assert.equal(MATCH_CENTER_ENGLISH_20261031_20261106_MATCHES.length, 11);
  assert.equal(MATCH_CENTER_ENGLISH_20261024_20261030_MATCHES.length, 9);
  assert.equal(MATCH_CENTER_ENGLISH_20261018_20261023_MATCHES.length, 6);
  assert.equal(MATCH_CENTER_ENGLISH_MATCHES.length, 320);
  assert.equal(MATCH_CENTER_SPANISH_MATCHES.length, 300);
  assert.equal(MATCH_CENTER_ALL_MATCHES.length, 620);
  assert.equal(new Set(MATCH_CENTER_ALL_MATCHES.map(match => match.externalIds.espn)).size, 620,
    'all 320 English and 300 Spanish source ids remain unique');
});

test('the empty English Nov 14–20 output is audit-only and does not infer season end', () => {
  const verification = MATCH_CENTER_ENGLISH_20261114_20261120_VERIFICATION;
  const dates = '20261114-20261120';
  const [start, end] = dates.split('-');

  assert.equal(verification.receivedOn, '2026-10-17');
  assert.equal(verification.provider, 'espn');
  assert.equal(verification.leagueId, 'eng.1');
  assert.match(verification.method, /events فارغة/);
  assert.match(verification.method, /لا يُستنتج منها انتهاء الموسم/);
  assert.match(verification.method, /لم ينفّذ المساعد طلب API/);
  assert.deepEqual(verification.receivedRanges.map(({ dates: range, eventCount, complete }) => [range, eventCount, complete]),
    [[dates, 0, true]]);
  assert.deepEqual(verification.receivedRanges.map(({ scoreboardEndpoint }) => scoreboardEndpoint), [
    `https://streammasterstore.com/scoreboard.php?league=eng.1&dates=${dates}`,
  ]);
  assert.deepEqual(MATCH_CENTER_ENGLISH_20261114_20261120_RANGES.map(({ dates: range, events, complete }) => [range, events, complete]),
    [[dates, [], true]]);
  assert.deepEqual(verification.receivedEvents, []);
  assert.deepEqual(verification.receivedTeams, []);

  const previousEnd = MATCH_CENTER_ENGLISH_20261107_20261113_VERIFICATION.receivedRanges.at(-1).dates.split('-')[1];
  const toUtc = day => Date.parse(`${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6, 8)}T00:00:00Z`);
  assert.equal(toUtc(start) - toUtc(previousEnd), 86_400_000,
    'the empty output is recorded immediately after the previous English week');
  assert.deepEqual(MATCH_CENTER_ENGLISH_MATCHES.filter(({ kickoffUtc }) => {
    const day = kickoffUtc.slice(0, 10).replaceAll('-', '');
    return start <= day && day <= end;
  }), [], 'an empty output creates no English fixture or indexed page');
  assert.equal(MATCH_CENTER_ENGLISH_MATCHES.length, 320);
  assert.equal(MATCH_CENTER_ALL_MATCHES.length, 620);
});

test('the English Nov 21–27 output binds all eleven event IDs, team sides, venues and UTC kickoffs before indexing', () => {
  const verification = MATCH_CENTER_ENGLISH_20261121_20261127_VERIFICATION;
  const dates = '20261121-20261127';
  const expected = [
    ['401879233', '2026-11-21T12:30Z', 'Fulham at Manchester City', 'Etihad Stadium', '382', 'Manchester City', '370', 'Fulham'],
    ['401879238', '2026-11-21T15:00Z', 'Nottingham Forest at AFC Bournemouth', 'Vitality Stadium', '349', 'AFC Bournemouth', '393', 'Nottingham Forest'],
    ['401878756', '2026-11-21T15:00Z', 'Sunderland at Aston Villa', 'Villa Park', '362', 'Aston Villa', '366', 'Sunderland'],
    ['401879236', '2026-11-21T15:00Z', 'Leeds United at Chelsea', 'Stamford Bridge', '363', 'Chelsea', '357', 'Leeds United'],
    ['401879235', '2026-11-21T15:00Z', 'Crystal Palace at Coventry City', 'Coventry Building Society Arena', '388', 'Coventry City', '384', 'Crystal Palace'],
    ['401878754', '2026-11-21T15:00Z', 'Ipswich Town at Tottenham Hotspur', 'Tottenham Hotspur Stadium', '367', 'Tottenham Hotspur', '373', 'Ipswich Town'],
    ['401879232', '2026-11-21T17:30Z', 'Arsenal at Newcastle United', "St. James' Park", '361', 'Newcastle United', '359', 'Arsenal'],
    ['401879234', '2026-11-22T14:00Z', 'Brighton & Hove Albion at Hull City', 'The MKM Stadium', '306', 'Hull City', '331', 'Brighton & Hove Albion'],
    ['401878755', '2026-11-22T16:30Z', 'Manchester United at Liverpool', 'Anfield', '364', 'Liverpool', '360', 'Manchester United'],
    ['401879237', '2026-11-23T20:00Z', 'Everton at Brentford', 'Gtech Community Stadium', '337', 'Brentford', '368', 'Everton'],
    ['401879225', '2026-11-27T20:00Z', 'Chelsea at Nottingham Forest', 'The City Ground', '393', 'Nottingham Forest', '363', 'Chelsea'],
  ];
  assert.equal(verification.receivedOn, '2026-10-17');
  assert.equal(verification.provider, 'espn');
  assert.equal(verification.leagueId, 'eng.1');
  assert.match(verification.method, /لم ينفّذ المساعد طلب API/);
  assert.deepEqual(verification.receivedRanges.map(({ dates: range, eventCount, complete }) => [range, eventCount, complete]),
    [[dates, 11, true]]);
  assert.deepEqual(verification.receivedRanges.map(({ scoreboardEndpoint }) => scoreboardEndpoint), [
    `https://streammasterstore.com/scoreboard.php?league=eng.1&dates=${dates}`,
  ]);
  assert.deepEqual(MATCH_CENTER_ENGLISH_20261121_20261127_RANGES.map(({ dates: range, events, complete }) => [range, events.length, complete]),
    [[dates, 11, true]]);
  assert.equal(verification.receivedEvents.length, 11);
  assert.equal(verification.receivedTeams.length, 22);
  assert.deepEqual(verification.receivedEvents.map(({ id, date, name, venue, status, window }) => [id, date, name, venue, status, window]),
    expected.map(([id, date, name, venue]) => [id, date, name, venue, 'STATUS_SCHEDULED', dates]));
  assert.deepEqual(verification.receivedTeams.map(({ event, side, id, name }) => [event, side, id, name]),
    expected.flatMap(([event, , , , homeId, homeName, awayId, awayName]) => [
      [event, 'home', homeId, homeName],
      [event, 'away', awayId, awayName],
    ]));
  assert.equal(new Set(expected.map(([id]) => id)).size, 11, 'received event ids are unique');

  const previousEmptyEnd = MATCH_CENTER_ENGLISH_20261114_20261120_VERIFICATION.receivedRanges.at(-1).dates.split('-')[1];
  const toUtc = day => Date.parse(`${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6, 8)}T00:00:00Z`);
  assert.equal(toUtc(dates.split('-')[0]) - toUtc(previousEmptyEnd), 86_400_000,
    'this populated range immediately follows the audit-only empty week');

  for (const [eventId, sourceDate, eventName, venue, homeId, homeName, awayId, awayName] of expected) {
    const fixture = MATCH_CENTER_ENGLISH_20261121_20261127_MATCHES.find(match => match.externalIds.espn === eventId);
    assert.ok(fixture, `${eventId}: indexed only after source match`);
    assert.equal(matchByExternalId('espn', eventId), fixture);
    assert.equal(fixture.sourceEventName, eventName);
    assert.equal(fixture.kickoffUtc, `${sourceDate.slice(0, -1)}:00Z`);
    assert.equal(fixture.venue, venue);
    assert.equal(fixture.leagueId, 'eng.1');
    assert.equal(fixture.season, '2026/27');
    assert.equal(fixture.verification, 'confirmed');
    assert.equal(fixture.home.sourceName, homeName);
    assert.equal(fixture.home.externalIds.espn, homeId);
    assert.equal(fixture.away.sourceName, awayName);
    assert.equal(fixture.away.externalIds.espn, awayId);
    assert.equal(fixture.sourceEventName, `${awayName} at ${homeName}`);
    assert.equal(fixture.id, fixture.slug);
    assert.equal(fixture.round, null, 'round is not inferred');
    assert.equal(fixture.score, undefined, 'the scheduled output contains no score');
    const eventDay = sourceDate.slice(0, 10).replaceAll('-', '');
    assert.ok(dates.slice(0, 8) <= eventDay && eventDay <= dates.slice(-8), `${eventId}: event falls inside the received weekly range`);
  }
  assert.equal(MATCH_CENTER_ENGLISH_20261121_20261127_MATCHES.length, 11);
  assert.equal(MATCH_CENTER_ENGLISH_MATCHES.length, 320);
  assert.equal(MATCH_CENTER_SPANISH_MATCHES.length, 300);
  assert.equal(MATCH_CENTER_ALL_MATCHES.length, 620);
  assert.equal(new Set(MATCH_CENTER_ALL_MATCHES.map(match => match.externalIds.espn)).size, 620,
    'all 320 English and 300 Spanish source ids remain unique');
});

test('the English Nov 28–Dec 4 output binds all nineteen event IDs, team sides, venues and UTC kickoffs before indexing', () => {
  const verification = MATCH_CENTER_ENGLISH_20261128_20261204_VERIFICATION;
  const dates = '20261128-20261204';
  const expected = [
    ['401879227', '2026-11-28T15:00Z', 'Coventry City at Leeds United', 'Elland Road', '357', 'Leeds United', '388', 'Coventry City'],
    ['401879226', '2026-11-28T15:00Z', 'Brentford at Manchester United', 'Old Trafford', '360', 'Manchester United', '337', 'Brentford'],
    ['401878752', '2026-11-28T17:30Z', 'Aston Villa at Ipswich Town', 'Portman Road', '373', 'Ipswich Town', '362', 'Aston Villa'],
    ['401879229', '2026-11-29T12:00Z', 'Liverpool at Everton', 'Hill Dickinson Stadium', '368', 'Everton', '364', 'Liverpool'],
    ['401879231', '2026-11-29T14:05Z', 'Newcastle United at Brighton & Hove Albion', 'American Express Stadium', '331', 'Brighton & Hove Albion', '361', 'Newcastle United'],
    ['401879230', '2026-11-29T14:05Z', 'Hull City at Crystal Palace', 'Selhurst Park', '384', 'Crystal Palace', '306', 'Hull City'],
    ['401879228', '2026-11-29T14:05Z', 'AFC Bournemouth at Fulham', 'Craven Cottage', '370', 'Fulham', '349', 'AFC Bournemouth'],
    ['401879224', '2026-11-29T14:05Z', 'Tottenham Hotspur at Sunderland', 'Stadium of Light', '366', 'Sunderland', '367', 'Tottenham Hotspur'],
    ['401878753', '2026-11-29T16:30Z', 'Manchester City at Arsenal', 'Emirates Stadium', '359', 'Arsenal', '382', 'Manchester City'],
    ['401879223', '2026-12-02T20:00Z', 'Brighton & Hove Albion at AFC Bournemouth', 'Vitality Stadium', '349', 'AFC Bournemouth', '331', 'Brighton & Hove Albion'],
    ['401878751', '2026-12-02T20:00Z', 'Everton at Aston Villa', 'Villa Park', '362', 'Aston Villa', '368', 'Everton'],
    ['401878750', '2026-12-02T20:00Z', 'Arsenal at Brentford', 'Gtech Community Stadium', '337', 'Brentford', '359', 'Arsenal'],
    ['401879222', '2026-12-02T20:00Z', 'Crystal Palace at Chelsea', 'Stamford Bridge', '363', 'Chelsea', '384', 'Crystal Palace'],
    ['401879221', '2026-12-02T20:00Z', 'Ipswich Town at Coventry City', 'Coventry Building Society Arena', '388', 'Coventry City', '373', 'Ipswich Town'],
    ['401879220', '2026-12-02T20:00Z', 'Nottingham Forest at Hull City', 'The MKM Stadium', '306', 'Hull City', '393', 'Nottingham Forest'],
    ['401879219', '2026-12-02T20:00Z', 'Sunderland at Liverpool', 'Anfield', '364', 'Liverpool', '366', 'Sunderland'],
    ['401879218', '2026-12-02T20:00Z', 'Leeds United at Manchester City', 'Etihad Stadium', '382', 'Manchester City', '357', 'Leeds United'],
    ['401879217', '2026-12-02T20:00Z', 'Manchester United at Newcastle United', "St. James' Park", '361', 'Newcastle United', '360', 'Manchester United'],
    ['401878749', '2026-12-02T20:00Z', 'Fulham at Tottenham Hotspur', 'Tottenham Hotspur Stadium', '367', 'Tottenham Hotspur', '370', 'Fulham'],
  ];
  assert.equal(verification.receivedOn, '2026-10-17');
  assert.equal(verification.provider, 'espn');
  assert.equal(verification.leagueId, 'eng.1');
  assert.match(verification.method, /لم ينفّذ المساعد طلب API/);
  assert.deepEqual(verification.receivedRanges.map(({ dates: range, eventCount, complete }) => [range, eventCount, complete]),
    [[dates, 19, true]]);
  assert.deepEqual(verification.receivedRanges.map(({ scoreboardEndpoint }) => scoreboardEndpoint), [
    `https://streammasterstore.com/scoreboard.php?league=eng.1&dates=${dates}`,
  ]);
  assert.deepEqual(MATCH_CENTER_ENGLISH_20261128_20261204_RANGES.map(({ dates: range, events, complete }) => [range, events.length, complete]),
    [[dates, 19, true]]);
  assert.equal(verification.receivedEvents.length, 19);
  assert.equal(verification.receivedTeams.length, 38);
  assert.deepEqual(verification.receivedEvents.map(({ id, date, name, venue, status, window }) => [id, date, name, venue, status, window]),
    expected.map(([id, date, name, venue]) => [id, date, name, venue, 'STATUS_SCHEDULED', dates]));
  assert.deepEqual(verification.receivedTeams.map(({ event, side, id, name }) => [event, side, id, name]),
    expected.flatMap(([event, , , , homeId, homeName, awayId, awayName]) => [
      [event, 'home', homeId, homeName],
      [event, 'away', awayId, awayName],
    ]));
  assert.equal(new Set(expected.map(([id]) => id)).size, 19, 'received event ids are unique');

  const previousEnd = MATCH_CENTER_ENGLISH_20261121_20261127_VERIFICATION.receivedRanges.at(-1).dates.split('-')[1];
  const toUtc = day => Date.parse(`${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6, 8)}T00:00:00Z`);
  assert.equal(toUtc(dates.split('-')[0]) - toUtc(previousEnd), 86_400_000,
    'this range immediately follows the previous English week');

  for (const [eventId, sourceDate, eventName, venue, homeId, homeName, awayId, awayName] of expected) {
    const fixture = MATCH_CENTER_ENGLISH_20261128_20261204_MATCHES.find(match => match.externalIds.espn === eventId);
    assert.ok(fixture, `${eventId}: indexed only after source match`);
    assert.equal(matchByExternalId('espn', eventId), fixture);
    assert.equal(fixture.sourceEventName, eventName);
    assert.equal(fixture.kickoffUtc, `${sourceDate.slice(0, -1)}:00Z`);
    assert.equal(fixture.venue, venue);
    assert.equal(fixture.leagueId, 'eng.1');
    assert.equal(fixture.season, '2026/27');
    assert.equal(fixture.verification, 'confirmed');
    assert.equal(fixture.home.sourceName, homeName);
    assert.equal(fixture.home.externalIds.espn, homeId);
    assert.equal(fixture.away.sourceName, awayName);
    assert.equal(fixture.away.externalIds.espn, awayId);
    assert.equal(fixture.sourceEventName, `${awayName} at ${homeName}`);
    assert.equal(fixture.id, fixture.slug);
    assert.equal(fixture.round, null, 'round is not inferred');
    assert.equal(fixture.score, undefined, 'the scheduled output contains no score');
    const eventDay = sourceDate.slice(0, 10).replaceAll('-', '');
    assert.ok(dates.slice(0, 8) <= eventDay && eventDay <= dates.slice(-8), `${eventId}: event falls inside the received weekly range`);
  }
  assert.equal(MATCH_CENTER_ENGLISH_20261128_20261204_MATCHES.length, 19);
  assert.equal(MATCH_CENTER_ENGLISH_MATCHES.length, 320);
  assert.equal(MATCH_CENTER_SPANISH_MATCHES.length, 300);
  assert.equal(MATCH_CENTER_ALL_MATCHES.length, 620);
  assert.equal(new Set(MATCH_CENTER_ALL_MATCHES.map(match => match.externalIds.espn)).size, 620,
    'all 320 English and 300 Spanish source ids remain unique');
});

test('the English Dec 5–11 output binds all ten event IDs and distinguishes the eng.1 window from the same-date esp.1 range', () => {
  const verification = MATCH_CENTER_ENGLISH_20261205_20261211_VERIFICATION;
  const dates = '20261205-20261211';
  const expected = [
    ['401879216', '2026-12-05T15:00Z', 'Hull City at AFC Bournemouth', 'Vitality Stadium', '349', 'AFC Bournemouth', '306', 'Hull City'],
    ['401879215', '2026-12-05T15:00Z', 'Crystal Palace at Aston Villa', 'Villa Park', '362', 'Aston Villa', '384', 'Crystal Palace'],
    ['401879214', '2026-12-05T15:00Z', 'Manchester City at Brentford', 'Gtech Community Stadium', '337', 'Brentford', '382', 'Manchester City'],
    ['401879213', '2026-12-05T15:00Z', 'Liverpool at Chelsea', 'Stamford Bridge', '363', 'Chelsea', '364', 'Liverpool'],
    ['401879212', '2026-12-05T15:00Z', 'Fulham at Everton', 'Hill Dickinson Stadium', '368', 'Everton', '370', 'Fulham'],
    ['401879211', '2026-12-05T15:00Z', 'Ipswich Town at Leeds United', 'Elland Road', '357', 'Leeds United', '373', 'Ipswich Town'],
    ['401879210', '2026-12-05T15:00Z', 'Coventry City at Manchester United', 'Old Trafford', '360', 'Manchester United', '388', 'Coventry City'],
    ['401878748', '2026-12-05T15:00Z', 'Sunderland at Newcastle United', "St. James' Park", '361', 'Newcastle United', '366', 'Sunderland'],
    ['401878747', '2026-12-05T15:00Z', 'Brighton & Hove Albion at Nottingham Forest', 'The City Ground', '393', 'Nottingham Forest', '331', 'Brighton & Hove Albion'],
    ['401879209', '2026-12-05T15:00Z', 'Arsenal at Tottenham Hotspur', 'Tottenham Hotspur Stadium', '367', 'Tottenham Hotspur', '359', 'Arsenal'],
  ];
  assert.equal(verification.receivedOn, '2026-10-17');
  assert.equal(verification.provider, 'espn');
  assert.equal(verification.leagueId, 'eng.1');
  assert.match(verification.method, /لم ينفّذ المساعد طلب API/);
  assert.match(verification.method, /منفصلة عن خرج esp\.1/);
  assert.deepEqual(verification.receivedRanges.map(({ dates: range, eventCount, complete }) => [range, eventCount, complete]),
    [[dates, 10, true]]);
  assert.deepEqual(verification.receivedRanges.map(({ scoreboardEndpoint }) => scoreboardEndpoint), [
    `https://streammasterstore.com/scoreboard.php?league=eng.1&dates=${dates}`,
  ]);
  assert.deepEqual(MATCH_CENTER_ENGLISH_20261205_20261211_RANGES.map(({ dates: range, events, complete }) => [range, events.length, complete]),
    [[dates, 10, true]]);
  assert.equal(verification.receivedEvents.length, 10);
  assert.equal(verification.receivedTeams.length, 20);
  assert.deepEqual(verification.receivedEvents.map(({ id, date, name, venue, status, window }) => [id, date, name, venue, status, window]),
    expected.map(([id, date, name, venue]) => [id, date, name, venue, 'STATUS_SCHEDULED', dates]));
  assert.deepEqual(verification.receivedTeams.map(({ event, side, id, name }) => [event, side, id, name]),
    expected.flatMap(([event, , , , homeId, homeName, awayId, awayName]) => [
      [event, 'home', homeId, homeName],
      [event, 'away', awayId, awayName],
    ]));
  assert.equal(new Set(expected.map(([id]) => id)).size, 10, 'received event ids are unique');

  const previousEnd = MATCH_CENTER_ENGLISH_20261128_20261204_VERIFICATION.receivedRanges.at(-1).dates.split('-')[1];
  const toUtc = day => Date.parse(`${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6, 8)}T00:00:00Z`);
  assert.equal(toUtc(dates.split('-')[0]) - toUtc(previousEnd), 86_400_000,
    'this populated English range immediately follows the previous English week');

  for (const [eventId, sourceDate, eventName, venue, homeId, homeName, awayId, awayName] of expected) {
    const fixture = MATCH_CENTER_ENGLISH_20261205_20261211_MATCHES.find(match => match.externalIds.espn === eventId);
    assert.ok(fixture, `${eventId}: indexed only after source match`);
    assert.equal(matchByExternalId('espn', eventId), fixture);
    assert.equal(fixture.sourceEventName, eventName);
    assert.equal(fixture.kickoffUtc, `${sourceDate.slice(0, -1)}:00Z`);
    assert.equal(fixture.venue, venue);
    assert.equal(fixture.leagueId, 'eng.1');
    assert.equal(fixture.season, '2026/27');
    assert.equal(fixture.verification, 'confirmed');
    assert.equal(fixture.home.sourceName, homeName);
    assert.equal(fixture.home.externalIds.espn, homeId);
    assert.equal(fixture.away.sourceName, awayName);
    assert.equal(fixture.away.externalIds.espn, awayId);
    assert.equal(fixture.sourceEventName, `${awayName} at ${homeName}`);
    assert.equal(fixture.id, fixture.slug);
    assert.equal(fixture.round, null, 'round is not inferred');
    assert.equal(fixture.score, undefined, 'the scheduled output contains no score');
    assert.equal(sourceDate.slice(0, 10).replaceAll('-', ''), '20261205');
  }
  assert.equal(MATCH_CENTER_ENGLISH_20261205_20261211_MATCHES.length, 10);
  assert.equal(MATCH_CENTER_ENGLISH_MATCHES.length, 320);
  assert.equal(MATCH_CENTER_SPANISH_MATCHES.length, 300);
  assert.equal(MATCH_CENTER_ALL_MATCHES.length, 620);
  assert.equal(new Set(MATCH_CENTER_ALL_MATCHES.map(match => match.externalIds.espn)).size, 620,
    'all 320 English and 300 Spanish source ids remain unique');
});

test('the English Dec 12–18 output binds all ten event IDs and stays separate from esp.1 for the same dates', () => {
  const verification = MATCH_CENTER_ENGLISH_20261212_20261218_VERIFICATION;
  const dates = '20261212-20261218';
  const expected = [
    ['401878746', '2026-12-12T15:00Z', 'AFC Bournemouth at Arsenal', 'Emirates Stadium', '359', 'Arsenal', '349', 'AFC Bournemouth'],
    ['401878745', '2026-12-12T15:00Z', 'Everton at Brighton & Hove Albion', 'American Express Stadium', '331', 'Brighton & Hove Albion', '368', 'Everton'],
    ['401879208', '2026-12-12T15:00Z', 'Aston Villa at Coventry City', 'Coventry Building Society Arena', '388', 'Coventry City', '362', 'Aston Villa'],
    ['401879207', '2026-12-12T15:00Z', 'Manchester United at Crystal Palace', 'Selhurst Park', '384', 'Crystal Palace', '360', 'Manchester United'],
    ['401879206', '2026-12-12T15:00Z', 'Brentford at Fulham', 'Craven Cottage', '370', 'Fulham', '337', 'Brentford'],
    ['401879205', '2026-12-12T15:00Z', 'Tottenham Hotspur at Hull City', 'The MKM Stadium', '306', 'Hull City', '367', 'Tottenham Hotspur'],
    ['401878744', '2026-12-12T15:00Z', 'Newcastle United at Ipswich Town', 'Portman Road', '373', 'Ipswich Town', '361', 'Newcastle United'],
    ['401878743', '2026-12-12T15:00Z', 'Leeds United at Liverpool', 'Anfield', '364', 'Liverpool', '357', 'Leeds United'],
    ['401878742', '2026-12-12T15:00Z', 'Chelsea at Manchester City', 'Etihad Stadium', '382', 'Manchester City', '363', 'Chelsea'],
    ['401878741', '2026-12-12T15:00Z', 'Nottingham Forest at Sunderland', 'Stadium of Light', '366', 'Sunderland', '393', 'Nottingham Forest'],
  ];
  assert.equal(verification.receivedOn, '2026-10-17');
  assert.equal(verification.provider, 'espn');
  assert.equal(verification.leagueId, 'eng.1');
  assert.match(verification.method, /لم ينفّذ المساعد طلب API/);
  assert.match(verification.method, /لم يتحقق استقلالياً من المصدر/);
  assert.match(verification.method, /نافذة منفصلة عن خرج esp\.1 للفترة نفسها/);
  assert.deepEqual(verification.receivedRanges.map(({ dates: range, eventCount, complete }) => [range, eventCount, complete]),
    [[dates, 10, true]]);
  assert.deepEqual(verification.receivedRanges.map(({ scoreboardEndpoint }) => scoreboardEndpoint), [
    `https://streammasterstore.com/scoreboard.php?league=eng.1&dates=${dates}`,
  ]);
  assert.deepEqual(MATCH_CENTER_ENGLISH_20261212_20261218_RANGES.map(({ dates: range, events, complete }) => [range, events.length, complete]),
    [[dates, 10, true]]);
  assert.equal(verification.receivedEvents.length, 10);
  assert.equal(verification.receivedTeams.length, 20);
  assert.deepEqual(verification.receivedEvents.map(({ id, date, name, venue, status, window }) => [id, date, name, venue, status, window]),
    expected.map(([id, date, name, venue]) => [id, date, name, venue, 'STATUS_SCHEDULED', dates]));
  assert.deepEqual(verification.receivedTeams.map(({ event, side, id, name }) => [event, side, id, name]),
    expected.flatMap(([event, , , , homeId, homeName, awayId, awayName]) => [
      [event, 'home', homeId, homeName],
      [event, 'away', awayId, awayName],
    ]));
  assert.equal(new Set(expected.map(([id]) => id)).size, 10, 'received event ids are unique');

  const previousEnd = MATCH_CENTER_ENGLISH_20261205_20261211_VERIFICATION.receivedRanges.at(-1).dates.split('-')[1];
  const toUtc = day => Date.parse(`${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6, 8)}T00:00:00Z`);
  assert.equal(toUtc(dates.split('-')[0]) - toUtc(previousEnd), 86_400_000,
    'this English range immediately follows the previous English week');

  const sameDatesSpanish = MATCH_CENTER_SPANISH_20261212_20270205_VERIFICATION.receivedRanges
    .find(range => range.dates === dates);
  assert.ok(sameDatesSpanish, 'the independent esp.1 window for these dates remains recorded');
  assert.equal(sameDatesSpanish.eventCount, 10);
  const spanishIds = new Set(MATCH_CENTER_SPANISH_20261212_20270205_VERIFICATION.receivedEvents
    .filter(event => event.window === dates).map(event => event.id));
  assert.equal(spanishIds.size, 10);
  assert.ok(expected.every(([id]) => !spanishIds.has(id)),
    'eng.1 event ids are not substituted with the separate esp.1 event ids');

  for (const [eventId, sourceDate, eventName, venue, homeId, homeName, awayId, awayName] of expected) {
    const fixture = MATCH_CENTER_ENGLISH_20261212_20261218_MATCHES.find(match => match.externalIds.espn === eventId);
    assert.ok(fixture, `${eventId}: indexed only after source match`);
    assert.equal(matchByExternalId('espn', eventId), fixture);
    assert.equal(fixture.sourceEventName, eventName);
    assert.equal(fixture.kickoffUtc, `${sourceDate.slice(0, -1)}:00Z`);
    assert.equal(fixture.venue, venue);
    assert.equal(fixture.leagueId, 'eng.1');
    assert.equal(fixture.season, '2026/27');
    assert.equal(fixture.verification, 'confirmed');
    assert.equal(fixture.home.sourceName, homeName);
    assert.equal(fixture.home.externalIds.espn, homeId);
    assert.equal(fixture.away.sourceName, awayName);
    assert.equal(fixture.away.externalIds.espn, awayId);
    assert.equal(fixture.sourceEventName, `${awayName} at ${homeName}`);
    assert.equal(fixture.id, fixture.slug);
    assert.equal(fixture.round, null, 'round is not inferred');
    assert.equal(fixture.score, undefined, 'the scheduled output contains no score');
    assert.equal(sourceDate.slice(0, 10).replaceAll('-', ''), '20261212');
  }
  assert.equal(MATCH_CENTER_ENGLISH_20261212_20261218_MATCHES.length, 10);
  assert.equal(MATCH_CENTER_ENGLISH_MATCHES.length, 320);
  assert.equal(MATCH_CENTER_SPANISH_MATCHES.length, 300);
  assert.equal(MATCH_CENTER_ALL_MATCHES.length, 620);
  assert.equal(new Set(MATCH_CENTER_ALL_MATCHES.map(match => match.externalIds.espn)).size, 620,
    'all 320 English and 300 Spanish source ids remain unique');
});

test('the English Dec 19–25 output binds all ten event IDs and stays separate from esp.1 for the same dates', () => {
  const verification = MATCH_CENTER_ENGLISH_20261219_20261225_VERIFICATION;
  const dates = '20261219-20261225';
  const expected = [
    ['401878740', '2026-12-19T15:00Z', 'Coventry City at AFC Bournemouth', 'Vitality Stadium', '349', 'AFC Bournemouth', '388', 'Coventry City'],
    ['401879204', '2026-12-19T15:00Z', 'Manchester United at Arsenal', 'Emirates Stadium', '359', 'Arsenal', '360', 'Manchester United'],
    ['401879203', '2026-12-19T15:00Z', 'Newcastle United at Brentford', 'Gtech Community Stadium', '337', 'Brentford', '361', 'Newcastle United'],
    ['401878739', '2026-12-19T15:00Z', 'Ipswich Town at Brighton & Hove Albion', 'American Express Stadium', '331', 'Brighton & Hove Albion', '373', 'Ipswich Town'],
    ['401879202', '2026-12-19T15:00Z', 'Aston Villa at Chelsea', 'Stamford Bridge', '363', 'Chelsea', '362', 'Aston Villa'],
    ['401879201', '2026-12-19T15:00Z', 'Fulham at Leeds United', 'Elland Road', '357', 'Leeds United', '370', 'Fulham'],
    ['401879200', '2026-12-19T15:00Z', 'Tottenham Hotspur at Liverpool', 'Anfield', '364', 'Liverpool', '367', 'Tottenham Hotspur'],
    ['401879199', '2026-12-19T15:00Z', 'Hull City at Manchester City', 'Etihad Stadium', '382', 'Manchester City', '306', 'Hull City'],
    ['401879198', '2026-12-19T15:00Z', 'Everton at Nottingham Forest', 'The City Ground', '393', 'Nottingham Forest', '368', 'Everton'],
    ['401878738', '2026-12-19T15:00Z', 'Crystal Palace at Sunderland', 'Stadium of Light', '366', 'Sunderland', '384', 'Crystal Palace'],
  ];
  assert.equal(verification.receivedOn, '2026-10-17');
  assert.equal(verification.provider, 'espn');
  assert.equal(verification.leagueId, 'eng.1');
  assert.match(verification.method, /لم ينفّذ المساعد طلب API/);
  assert.match(verification.method, /لم يتحقق استقلالياً من المصدر/);
  assert.match(verification.method, /نافذة منفصلة عن خرج esp\.1 للفترة نفسها/);
  assert.deepEqual(verification.receivedRanges.map(({ dates: range, eventCount, complete }) => [range, eventCount, complete]),
    [[dates, 10, true]]);
  assert.deepEqual(verification.receivedRanges.map(({ scoreboardEndpoint }) => scoreboardEndpoint), [
    `https://streammasterstore.com/scoreboard.php?league=eng.1&dates=${dates}`,
  ]);
  assert.deepEqual(MATCH_CENTER_ENGLISH_20261219_20261225_RANGES.map(({ dates: range, events, complete }) => [range, events.length, complete]),
    [[dates, 10, true]]);
  assert.equal(verification.receivedEvents.length, 10);
  assert.equal(verification.receivedTeams.length, 20);
  assert.deepEqual(verification.receivedEvents.map(({ id, date, name, venue, status, window }) => [id, date, name, venue, status, window]),
    expected.map(([id, date, name, venue]) => [id, date, name, venue, 'STATUS_SCHEDULED', dates]));
  assert.deepEqual(verification.receivedTeams.map(({ event, side, id, name }) => [event, side, id, name]),
    expected.flatMap(([event, , , , homeId, homeName, awayId, awayName]) => [
      [event, 'home', homeId, homeName],
      [event, 'away', awayId, awayName],
    ]));
  assert.equal(new Set(expected.map(([id]) => id)).size, 10, 'received event ids are unique');

  const previousEnd = MATCH_CENTER_ENGLISH_20261212_20261218_VERIFICATION.receivedRanges.at(-1).dates.split('-')[1];
  const toUtc = day => Date.parse(`${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6, 8)}T00:00:00Z`);
  assert.equal(toUtc(dates.split('-')[0]) - toUtc(previousEnd), 86_400_000,
    'this English range immediately follows the previous English week');

  const sameDatesSpanish = MATCH_CENTER_SPANISH_20261212_20270205_VERIFICATION.receivedRanges
    .find(range => range.dates === dates);
  assert.ok(sameDatesSpanish, 'the independent esp.1 window for these dates remains recorded');
  assert.equal(sameDatesSpanish.eventCount, 10);
  const spanishIds = new Set(MATCH_CENTER_SPANISH_20261212_20270205_VERIFICATION.receivedEvents
    .filter(event => event.window === dates).map(event => event.id));
  assert.equal(spanishIds.size, 10);
  assert.ok(expected.every(([id]) => !spanishIds.has(id)),
    'eng.1 event ids are not substituted with the separate esp.1 event ids');

  for (const [eventId, sourceDate, eventName, venue, homeId, homeName, awayId, awayName] of expected) {
    const fixture = MATCH_CENTER_ENGLISH_20261219_20261225_MATCHES.find(match => match.externalIds.espn === eventId);
    assert.ok(fixture, `${eventId}: indexed only after source match`);
    assert.equal(matchByExternalId('espn', eventId), fixture);
    assert.equal(fixture.sourceEventName, eventName);
    assert.equal(fixture.kickoffUtc, `${sourceDate.slice(0, -1)}:00Z`);
    assert.equal(fixture.venue, venue);
    assert.equal(fixture.leagueId, 'eng.1');
    assert.equal(fixture.season, '2026/27');
    assert.equal(fixture.verification, 'confirmed');
    assert.equal(fixture.home.sourceName, homeName);
    assert.equal(fixture.home.externalIds.espn, homeId);
    assert.equal(fixture.away.sourceName, awayName);
    assert.equal(fixture.away.externalIds.espn, awayId);
    assert.equal(fixture.sourceEventName, `${awayName} at ${homeName}`);
    assert.equal(fixture.id, fixture.slug);
    assert.equal(fixture.round, null, 'round is not inferred');
    assert.equal(fixture.score, undefined, 'the scheduled output contains no score');
    assert.equal(sourceDate.slice(0, 10).replaceAll('-', ''), '20261219');
  }
  assert.equal(MATCH_CENTER_ENGLISH_20261219_20261225_MATCHES.length, 10);
  assert.equal(MATCH_CENTER_ENGLISH_MATCHES.length, 320);
  assert.equal(MATCH_CENTER_SPANISH_MATCHES.length, 300);
  assert.equal(MATCH_CENTER_ALL_MATCHES.length, 620);
  assert.equal(new Set(MATCH_CENTER_ALL_MATCHES.map(match => match.externalIds.espn)).size, 620,
    'all 320 English and 300 Spanish source ids remain unique');
});

test('all received English follow-up weeks bind source identities, fixtures and separate esp.1 windows', () => {
  const windows = [
    { dates: '20261226-20270101', ranges: MATCH_CENTER_ENGLISH_20261226_20270101_RANGES, verification: MATCH_CENTER_ENGLISH_20261226_20270101_VERIFICATION, matches: MATCH_CENTER_ENGLISH_20261226_20270101_MATCHES, previous: MATCH_CENTER_ENGLISH_20261219_20261225_VERIFICATION, spanishCount: 0 },
    { dates: '20270102-20270108', ranges: MATCH_CENTER_ENGLISH_20270102_20270108_RANGES, verification: MATCH_CENTER_ENGLISH_20270102_20270108_VERIFICATION, matches: MATCH_CENTER_ENGLISH_20270102_20270108_MATCHES, previous: MATCH_CENTER_ENGLISH_20261226_20270101_VERIFICATION, spanishCount: 10 },
    { dates: '20270116-20270122', ranges: MATCH_CENTER_ENGLISH_20270116_20270122_RANGES, verification: MATCH_CENTER_ENGLISH_20270116_20270122_VERIFICATION, matches: MATCH_CENTER_ENGLISH_20270116_20270122_MATCHES, previous: MATCH_CENTER_ENGLISH_20270109_20270115_VERIFICATION, spanishCount: 10 },
    { dates: '20270123-20270129', ranges: MATCH_CENTER_ENGLISH_20270123_20270129_RANGES, verification: MATCH_CENTER_ENGLISH_20270123_20270129_VERIFICATION, matches: MATCH_CENTER_ENGLISH_20270123_20270129_MATCHES, previous: MATCH_CENTER_ENGLISH_20270116_20270122_VERIFICATION, spanishCount: 10 },
    { dates: '20270130-20270205', ranges: MATCH_CENTER_ENGLISH_20270130_20270205_RANGES, verification: MATCH_CENTER_ENGLISH_20270130_20270205_VERIFICATION, matches: MATCH_CENTER_ENGLISH_20270130_20270205_MATCHES, previous: MATCH_CENTER_ENGLISH_20270123_20270129_VERIFICATION, spanishCount: 10 },
    { dates: '20270206-20270212', ranges: MATCH_CENTER_ENGLISH_20270206_20270212_RANGES, verification: MATCH_CENTER_ENGLISH_20270206_20270212_VERIFICATION, matches: MATCH_CENTER_ENGLISH_20270206_20270212_MATCHES, previous: MATCH_CENTER_ENGLISH_20270130_20270205_VERIFICATION, spanishCount: 10 },
    { dates: '20270220-20270226', ranges: MATCH_CENTER_ENGLISH_20270220_20270226_RANGES, verification: MATCH_CENTER_ENGLISH_20270220_20270226_VERIFICATION, matches: MATCH_CENTER_ENGLISH_20270220_20270226_MATCHES, previous: MATCH_CENTER_ENGLISH_20270213_20270219_VERIFICATION, spanishCount: 10 },
    { dates: '20270227-20270305', ranges: MATCH_CENTER_ENGLISH_20270227_20270305_RANGES, verification: MATCH_CENTER_ENGLISH_20270227_20270305_VERIFICATION, matches: MATCH_CENTER_ENGLISH_20270227_20270305_MATCHES, previous: MATCH_CENTER_ENGLISH_20270220_20270226_VERIFICATION, spanishCount: 10 },
    { dates: '20270313-20270319', ranges: MATCH_CENTER_ENGLISH_20270313_20270319_RANGES, verification: MATCH_CENTER_ENGLISH_20270313_20270319_VERIFICATION, matches: MATCH_CENTER_ENGLISH_20270313_20270319_MATCHES, previous: MATCH_CENTER_ENGLISH_20270306_20270312_VERIFICATION, spanishCount: 10 },
    { dates: '20270320-20270326', ranges: MATCH_CENTER_ENGLISH_20270320_20270326_RANGES, verification: MATCH_CENTER_ENGLISH_20270320_20270326_VERIFICATION, matches: MATCH_CENTER_ENGLISH_20270320_20270326_MATCHES, previous: MATCH_CENTER_ENGLISH_20270313_20270319_VERIFICATION, spanishCount: 10 },
    { dates: '20270410-20270416', ranges: MATCH_CENTER_ENGLISH_20270410_20270416_RANGES, verification: MATCH_CENTER_ENGLISH_20270410_20270416_VERIFICATION, matches: MATCH_CENTER_ENGLISH_20270410_20270416_MATCHES, previous: MATCH_CENTER_ENGLISH_20270403_20270409_VERIFICATION, spanishCount: 10 },
    { dates: '20270417-20270423', ranges: MATCH_CENTER_ENGLISH_20270417_20270423_RANGES, verification: MATCH_CENTER_ENGLISH_20270417_20270423_VERIFICATION, matches: MATCH_CENTER_ENGLISH_20270417_20270423_MATCHES, previous: MATCH_CENTER_ENGLISH_20270410_20270416_VERIFICATION, spanishCount: 20 },
    { dates: '20270424-20270430', ranges: MATCH_CENTER_ENGLISH_20270424_20270430_RANGES, verification: MATCH_CENTER_ENGLISH_20270424_20270430_VERIFICATION, matches: MATCH_CENTER_ENGLISH_20270424_20270430_MATCHES, previous: MATCH_CENTER_ENGLISH_20270417_20270423_VERIFICATION, spanishCount: 0 },
    { dates: '20270501-20270507', ranges: MATCH_CENTER_ENGLISH_20270501_20270507_RANGES, verification: MATCH_CENTER_ENGLISH_20270501_20270507_VERIFICATION, matches: MATCH_CENTER_ENGLISH_20270501_20270507_MATCHES, previous: MATCH_CENTER_ENGLISH_20270424_20270430_VERIFICATION, spanishCount: 10 },
    { dates: '20270508-20270514', ranges: MATCH_CENTER_ENGLISH_20270508_20270514_RANGES, verification: MATCH_CENTER_ENGLISH_20270508_20270514_VERIFICATION, matches: MATCH_CENTER_ENGLISH_20270508_20270514_MATCHES, previous: MATCH_CENTER_ENGLISH_20270501_20270507_VERIFICATION, spanishCount: 10 },
    { dates: '20270515-20270521', ranges: MATCH_CENTER_ENGLISH_20270515_20270521_RANGES, verification: MATCH_CENTER_ENGLISH_20270515_20270521_VERIFICATION, matches: MATCH_CENTER_ENGLISH_20270515_20270521_MATCHES, previous: MATCH_CENTER_ENGLISH_20270508_20270514_VERIFICATION, spanishCount: 10 },
    { dates: '20270522-20270528', ranges: MATCH_CENTER_ENGLISH_20270522_20270528_RANGES, verification: MATCH_CENTER_ENGLISH_20270522_20270528_VERIFICATION, matches: MATCH_CENTER_ENGLISH_20270522_20270528_MATCHES, previous: MATCH_CENTER_ENGLISH_20270515_20270521_VERIFICATION, spanishCount: 10 },
    { dates: '20270529-20270604', ranges: MATCH_CENTER_ENGLISH_20270529_20270604_RANGES, verification: MATCH_CENTER_ENGLISH_20270529_20270604_VERIFICATION, matches: MATCH_CENTER_ENGLISH_20270529_20270604_MATCHES, previous: MATCH_CENTER_ENGLISH_20270522_20270528_VERIFICATION, spanishCount: 10 },
  ];
  const expectedCounts = [21, 19, 10, 10, 10, 20, 10, 20, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10];
  const spanishVerifications = [
    MATCH_CENTER_SPANISH_20261212_20270205_VERIFICATION,
    MATCH_CENTER_SPANISH_20270206_20270212_VERIFICATION,
    MATCH_CENTER_SPANISH_20270213_20270219_VERIFICATION,
    MATCH_CENTER_SPANISH_20270220_20270226_VERIFICATION,
    MATCH_CENTER_SPANISH_20270227_20270305_VERIFICATION,
    MATCH_CENTER_SPANISH_20270306_20270312_VERIFICATION,
    MATCH_CENTER_SPANISH_20270313_20270319_VERIFICATION,
    MATCH_CENTER_SPANISH_20270320_20270326_VERIFICATION,
    MATCH_CENTER_SPANISH_20270327_20270402_VERIFICATION,
    MATCH_CENTER_SPANISH_20270403_20270409_VERIFICATION,
    MATCH_CENTER_SPANISH_20270410_20270416_VERIFICATION,
    MATCH_CENTER_SPANISH_20270417_20270423_VERIFICATION,
    MATCH_CENTER_SPANISH_20270424_20270430_VERIFICATION,
    MATCH_CENTER_SPANISH_20270501_20270507_VERIFICATION,
    MATCH_CENTER_SPANISH_20270508_20270514_VERIFICATION,
    MATCH_CENTER_SPANISH_20270515_20270521_VERIFICATION,
    MATCH_CENTER_SPANISH_20270522_20270528_VERIFICATION,
    MATCH_CENTER_SPANISH_20270529_20270604_VERIFICATION,
  ];
  const spanishRanges = spanishVerifications.flatMap(verification => verification.receivedRanges);
  const spanishEvents = spanishVerifications.flatMap(verification => verification.receivedEvents);
  const toUtc = day => Date.parse(`${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6, 8)}T00:00:00Z`);
  let totalReceived = 0;

  assert.equal(windows.length, expectedCounts.length);
  for (let index = 0; index < windows.length; index += 1) {
    const { dates, ranges, verification, matches, previous, spanishCount } = windows[index];
    const expectedCount = expectedCounts[index];
    const sourceEvents = ranges.flatMap(range => range.events);
    assert.equal(verification.receivedOn, '2026-10-17');
    assert.equal(verification.provider, 'espn');
    assert.equal(verification.leagueId, 'eng.1');
    assert.match(verification.method, /لم ينفّذ المساعد طلب API/);
    assert.match(verification.method, /لم يتحقق استقلالياً من المصدر/);
    assert.match(verification.method, /منفصلة عن خرج esp\.1/);
    assert.deepEqual(ranges.map(({ dates: range, events, complete }) => [range, events.length, complete]),
      [[dates, expectedCount, true]]);
    assert.deepEqual(verification.receivedRanges.map(({ dates: range, eventCount, complete }) => [range, eventCount, complete]),
      [[dates, expectedCount, true]]);
    assert.deepEqual(verification.receivedRanges.map(({ scoreboardEndpoint }) => scoreboardEndpoint), [
      `https://streammasterstore.com/scoreboard.php?league=eng.1&dates=${dates}`,
    ]);
    assert.equal(verification.receivedEvents.length, expectedCount);
    assert.equal(verification.receivedTeams.length, expectedCount * 2);
    assert.equal(matches.length, expectedCount);
    assert.equal(new Set(sourceEvents.map(([id]) => id)).size, expectedCount, `${dates}: source IDs unique`);
    assert.deepEqual(verification.receivedEvents.map(({ id, date, name, venue, status, window }) => [id, date, name, venue, status, window]),
      sourceEvents.map(([id, date, name, venue]) => [id, date, name, venue, 'STATUS_SCHEDULED', dates]));
    assert.deepEqual(verification.receivedTeams.map(({ event, side, id, name }) => [event, side, id, name]),
      sourceEvents.flatMap(([event, , , , homeId, homeName, awayId, awayName]) => [
        [event, 'home', homeId, homeName],
        [event, 'away', awayId, awayName],
      ]));

    const startDay = dates.split('-')[0];
    const endDay = dates.split('-')[1];
    const previousEnd = previous.receivedRanges.at(-1).dates.split('-')[1];
    assert.equal(toUtc(startDay) - toUtc(previousEnd), 86_400_000, `${dates}: follows prior English range`);
    const sameDatesSpanish = spanishRanges.find(range => range.dates === dates);
    assert.ok(sameDatesSpanish, `${dates}: distinct esp.1 audit range exists`);
    assert.equal(sameDatesSpanish.eventCount, spanishCount, `${dates}: preserve separate esp.1 count`);
    const spanishIds = new Set(spanishEvents.filter(event => event.window === dates).map(event => event.id));
    assert.equal(spanishIds.size, spanishCount);

    for (const [eventId, sourceDate, eventName, venue, homeId, homeName, awayId, awayName] of sourceEvents) {
      const fixture = matches.find(match => match.externalIds.espn === eventId);
      assert.ok(fixture, `${dates} ${eventId}: fixture indexed`);
      assert.equal(matchByExternalId('espn', eventId), fixture);
      assert.ok(!spanishIds.has(eventId), `${eventId}: not taken from esp.1`);
      assert.equal(fixture.kickoffUtc, `${sourceDate.slice(0, -1)}:00Z`);
      assert.equal(fixture.sourceEventName, eventName);
      assert.equal(fixture.venue, venue);
      assert.equal(fixture.leagueId, 'eng.1');
      assert.equal(fixture.season, '2026/27');
      assert.equal(fixture.verification, 'confirmed');
      assert.equal(fixture.home.externalIds.espn, homeId);
      assert.equal(fixture.home.sourceName, homeName);
      assert.equal(fixture.away.externalIds.espn, awayId);
      assert.equal(fixture.away.sourceName, awayName);
      assert.equal(fixture.id, fixture.slug);
      assert.equal(fixture.round, null, 'round is not inferred');
      assert.equal(fixture.score, undefined, 'scheduled output has no score');
      const eventDay = sourceDate.slice(0, 10).replaceAll('-', '');
      assert.ok(eventDay >= startDay && eventDay <= endDay, `${eventId}: in its source window`);
      assert.ok(!spanishIds.has(eventId), `${eventId}: league source IDs stay separate`);
    }
    totalReceived += expectedCount;
  }

  assert.equal(totalReceived, 220);
  assert.equal(MATCH_CENTER_ENGLISH_MATCHES.length, 320);
  assert.equal(MATCH_CENTER_SPANISH_MATCHES.length, 300);
  assert.equal(MATCH_CENTER_ALL_MATCHES.length, 620);
  assert.equal(new Set(MATCH_CENTER_ALL_MATCHES.map(match => match.externalIds.espn)).size, 620,
    'all 320 English and 300 Spanish source IDs remain unique');
});

test('empty English weeks stay audit-only, separate from esp.1, and do not imply the season ended', () => {
  const emptyWindows = [
    { dates: '20270109-20270115', ranges: MATCH_CENTER_ENGLISH_20270109_20270115_RANGES, verification: MATCH_CENTER_ENGLISH_20270109_20270115_VERIFICATION, previous: MATCH_CENTER_ENGLISH_20270102_20270108_VERIFICATION, next: MATCH_CENTER_ENGLISH_20270116_20270122_VERIFICATION, spanish: MATCH_CENTER_SPANISH_20261212_20270205_VERIFICATION, spanishCount: 10 },
    { dates: '20270213-20270219', ranges: MATCH_CENTER_ENGLISH_20270213_20270219_RANGES, verification: MATCH_CENTER_ENGLISH_20270213_20270219_VERIFICATION, previous: MATCH_CENTER_ENGLISH_20270206_20270212_VERIFICATION, next: MATCH_CENTER_ENGLISH_20270220_20270226_VERIFICATION, spanish: MATCH_CENTER_SPANISH_20270213_20270219_VERIFICATION, spanishCount: 10 },
    { dates: '20270306-20270312', ranges: MATCH_CENTER_ENGLISH_20270306_20270312_RANGES, verification: MATCH_CENTER_ENGLISH_20270306_20270312_VERIFICATION, previous: MATCH_CENTER_ENGLISH_20270227_20270305_VERIFICATION, next: MATCH_CENTER_ENGLISH_20270313_20270319_VERIFICATION, spanish: MATCH_CENTER_SPANISH_20270306_20270312_VERIFICATION, spanishCount: 10 },
    { dates: '20270327-20270402', ranges: MATCH_CENTER_ENGLISH_20270327_20270402_RANGES, verification: MATCH_CENTER_ENGLISH_20270327_20270402_VERIFICATION, previous: MATCH_CENTER_ENGLISH_20270320_20270326_VERIFICATION, next: MATCH_CENTER_ENGLISH_20270403_20270409_VERIFICATION, spanish: MATCH_CENTER_SPANISH_20270327_20270402_VERIFICATION, spanishCount: 0 },
    { dates: '20270403-20270409', ranges: MATCH_CENTER_ENGLISH_20270403_20270409_RANGES, verification: MATCH_CENTER_ENGLISH_20270403_20270409_VERIFICATION, previous: MATCH_CENTER_ENGLISH_20270327_20270402_VERIFICATION, next: MATCH_CENTER_ENGLISH_20270410_20270416_VERIFICATION, spanish: MATCH_CENTER_SPANISH_20270403_20270409_VERIFICATION, spanishCount: 10 },
  ];
  const allSpanishRanges = [
    MATCH_CENTER_SPANISH_20270605_20270607_VERIFICATION,
    MATCH_CENTER_SPANISH_20270608_20270802_VERIFICATION,
  ].flatMap(verification => verification.receivedRanges);
  const toUtc = day => Date.parse(`${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6, 8)}T00:00:00Z`);

  emptyWindows.push({
    dates: '20270605-20270611',
    ranges: MATCH_CENTER_ENGLISH_20270605_20270611_RANGES,
    verification: MATCH_CENTER_ENGLISH_20270605_20270611_VERIFICATION,
    previous: MATCH_CENTER_ENGLISH_20270529_20270604_VERIFICATION,
    next: null,
    spanish: null,
    spanishCount: null,
  });

  for (const empty of emptyWindows) {
    const { dates, ranges, verification, previous, next } = empty;
    assert.equal(verification.receivedOn, '2026-10-17');
    assert.equal(verification.provider, 'espn');
    assert.equal(verification.leagueId, 'eng.1');
    assert.match(verification.method, /events فارغة/);
    assert.match(verification.method, /بلا fixtures/);
    assert.match(verification.method, /لا يُستنتج منها انتهاء الموسم/);
    assert.match(verification.method, /لم ينفّذ المساعد طلب API/);
    assert.match(verification.method, /لم يتحقق استقلالياً من المصدر/);
    assert.deepEqual(ranges.map(({ dates: range, events, complete }) => [range, events.length, complete]), [[dates, 0, true]]);
    assert.deepEqual(verification.receivedRanges.map(({ dates: range, eventCount, complete }) => [range, eventCount, complete]), [[dates, 0, true]]);
    assert.equal(verification.receivedEvents.length, 0);
    assert.equal(verification.receivedTeams.length, 0);
    assert.equal(toUtc(dates.split('-')[0]) - toUtc(previous.receivedRanges.at(-1).dates.split('-')[1]), 86_400_000,
      `${dates}: contiguous after the preceding English range`);
    if (next) {
      assert.equal(toUtc(next.receivedRanges[0].dates.split('-')[0]) - toUtc(dates.split('-')[1]), 86_400_000,
        `${dates}: contiguous before the next English range`);
    }
    const [startDay, endDay] = dates.split('-');
    assert.equal(MATCH_CENTER_ENGLISH_MATCHES.filter(match => {
      const day = match.kickoffUtc.slice(0, 10).replaceAll('-', '');
      return day >= startDay && day <= endDay;
    }).length, 0, `${dates}: no fixtures from an empty output`);

    if (empty.spanish) {
      const spanishRange = empty.spanish.receivedRanges.find(range => range.dates === dates);
      assert.ok(spanishRange, `${dates}: separate esp.1 window retained`);
      assert.equal(spanishRange.eventCount, empty.spanishCount);
      const spanishIds = new Set(empty.spanish.receivedEvents.filter(event => event.window === dates).map(event => event.id));
      assert.equal(spanishIds.size, empty.spanishCount);
    } else {
      assert.equal(allSpanishRanges.some(range => range.dates === dates), false,
        'the short esp.1 20270605-20270607 window is not misrepresented as matching the English week');
      assert.equal(allSpanishRanges.find(range => range.dates === '20270605-20270607')?.eventCount, 0);
      assert.match(verification.method, /لا يُعامل كنطاق مطابق/);
    }
  }

  assert.equal(MATCH_CENTER_ENGLISH_MATCHES.length, 320);
  assert.equal(MATCH_CENTER_SPANISH_MATCHES.length, 300);
  assert.equal(MATCH_CENTER_ALL_MATCHES.length, 620);
  assert.equal(new Set(MATCH_CENTER_ALL_MATCHES.map(match => match.externalIds.espn)).size, 620);
});

test('the eight received esp.1 windows match fixture IDs, home/away IDs and names before indexing', () => {
  const verification = MATCH_CENTER_SPANISH_20261017_20261211_VERIFICATION;
  assert.equal(verification.provider, 'espn');
  assert.equal(verification.leagueId, 'esp.1');
  assert.match(verification.method, /لم ينفذ المساعد طلب API/);
  assert.deepEqual(verification.receivedRanges.map(range => [range.dates, range.eventCount]), [
    ['20261017-20261023', 11],
    ['20261024-20261030', 10],
    ['20261031-20261106', 10],
    ['20261107-20261113', 9],
    ['20261114-20261120', 0],
    ['20261121-20261127', 10],
    ['20261128-20261204', 10],
    ['20261205-20261211', 10],
  ]);
  assert.equal(verification.receivedEvents.length, 70);
  assert.equal(verification.receivedTeams.length, 140);
  assert.equal(MATCH_CENTER_SPANISH_20261017_20261211_MATCHES.length, 70);
  assert.equal(MATCH_CENTER_SPANISH_MATCHES.length, 300);
  assert.equal(MATCH_CENTER_ALL_MATCHES.length, 620);

  const eventIds = verification.receivedEvents.map(event => event.id);
  assert.equal(new Set(eventIds).size, 70, 'event ids are unique in the received batch');
  assert.equal(new Set(MATCH_CENTER_ALL_MATCHES.map(match => match.externalIds.espn)).size, 620, 'no event id is shared across competitions');
  const receivedByEvent = new Map(verification.receivedEvents.map(event => [event.id, event]));
  const teamsByEvent = new Map();
  const canonicalTeamNames = new Map();
  for (const team of verification.receivedTeams) {
    const sides = teamsByEvent.get(team.event) ?? {};
    assert.equal(sides[team.side], undefined, `${team.event}: no duplicate ${team.side} row`);
    sides[team.side] = team;
    teamsByEvent.set(team.event, sides);
    const previousName = canonicalTeamNames.get(team.id);
    assert.ok(previousName === undefined || previousName === team.name, `team id ${team.id} is consistently named`);
    canonicalTeamNames.set(team.id, team.name);
  }
  assert.equal(canonicalTeamNames.size, 20, 'the source ids resolve consistently to the 20 teams in this batch');
  for (const event of verification.receivedEvents) {
    const range = verification.receivedRanges.find(candidate => candidate.dates === event.window);
    assert.ok(range, `${event.id}: retained its received weekly window`);
    const [start, end] = range.dates.split('-');
    const eventDay = event.date.slice(0, 10).replaceAll('-', '');
    assert.ok(start <= eventDay && eventDay <= end, `${event.id}: event date falls inside ${range.dates}`);
  }

  for (const match of MATCH_CENTER_SPANISH_20261017_20261211_MATCHES) {
    const eventId = match.externalIds.espn;
    const event = receivedByEvent.get(eventId);
    const teams = teamsByEvent.get(eventId);
    assert.ok(event, `${match.slug}: event id exists in the received output`);
    assert.equal(event.status, 'STATUS_SCHEDULED');
    assert.ok(teams?.home && teams?.away, `${match.slug}: source carries both team sides`);
    assert.equal(match.leagueId, 'esp.1');
    assert.equal(match.competitionSlug, 'الدوري-الإسباني');
    assert.equal(match.season, '2026/27');
    assert.equal(match.verification, 'confirmed');
    assert.equal(match.sourceEventName, event.name);
    assert.equal(match.venue, event.venue);
    assert.equal(Date.parse(match.kickoffUtc), Date.parse(event.date), `${match.slug}: UTC instant matches`);
    const [awayName, homeName] = event.name.split(' at ');
    assert.equal(teams.home.name, homeName, `${match.slug}: source event's home name`);
    assert.equal(teams.away.name, awayName, `${match.slug}: source event's away name`);
    assert.equal(match.home.externalIds.espn, teams.home.id, `${match.slug}: home team id`);
    assert.equal(match.away.externalIds.espn, teams.away.id, `${match.slug}: away team id`);
    assert.equal(match.home.sourceName, teams.home.name, `${match.slug}: home team name`);
    assert.equal(match.away.sourceName, teams.away.name, `${match.slug}: away team name`);
    assert.equal(matchByExternalId('espn', eventId), match, `${match.slug}: exact event id resolves to this page only`);
    assert.ok(match.slug.startsWith('la-liga-'), `${match.slug}: competition slug is stable`);
    assert.ok(!match.slug.includes(eventId), `${match.slug}: provider event id stays out of the public URL`);
    assert.equal(match.round, null, `${match.slug}: no unprovided round is inferred`);
    assert.equal(match.home.logo, null);
    assert.equal(match.away.logo, null);
    assert.equal(match.externalIds.apifootball, null);
  }
});

test('the complete December 12–18 and reconstructed December 19–25 ranges match the received event and team IDs', () => {
  const verification = MATCH_CENTER_SPANISH_20261212_20270205_VERIFICATION;
  assert.equal(verification.provider, 'espn');
  assert.equal(verification.leagueId, 'esp.1');
  assert.match(verification.method, /بدأ في منتصف JSON/);
  assert.match(verification.method, /لم ينفّذ المساعد طلب API/);
  assert.equal(verification.receivedRanges.some(range => range.complete === false), false, 'all received windows in this batch are complete');
  assert.deepEqual(verification.receivedRanges.map(range => [range.dates, range.eventCount, range.complete]), [
    ['20261212-20261218', 10, true],
    ['20261219-20261225', 10, true],
    ['20261226-20270101', 0, true],
    ['20270102-20270108', 10, true],
    ['20270109-20270115', 10, true],
    ['20270116-20270122', 10, true],
    ['20270123-20270129', 10, true],
    ['20270130-20270205', 10, true],
  ]);
  assert.equal(verification.receivedEvents.length, 70);
  assert.equal(verification.receivedTeams.length, 140);
  assert.equal(MATCH_CENTER_SPANISH_20261212_20270205_MATCHES.length, 70);
  assert.equal(MATCH_CENTER_SPANISH_MATCHES.length, 300);
  assert.equal(MATCH_CENTER_ALL_MATCHES.length, 620);
  assert.deepEqual(
    MATCH_CENTER_SPANISH_20261212_20270205_MATCHES.map(match => match.externalIds.espn),
    verification.receivedEvents.map(event => event.id),
    'fixture IDs are the exact IDs from the visible source objects, in received order',
  );
  assert.equal(new Set(MATCH_CENTER_ALL_MATCHES.map(match => match.externalIds.espn)).size, 620,
    'the visible source event IDs do not collide with any existing fixture');

  const receivedByEvent = new Map(verification.receivedEvents.map(event => [event.id, event]));
  const teamsByEvent = new Map();
  const teamNamesById = new Map();
  const sourceTeams = [
    ...MATCH_CENTER_SPANISH_20261017_20261211_VERIFICATION.receivedTeams,
    ...verification.receivedTeams,
  ];
  for (const team of sourceTeams) {
    const sides = teamsByEvent.get(team.event) ?? {};
    assert.equal(sides[team.side], undefined, `${team.event}: no duplicate ${team.side} row`);
    sides[team.side] = team;
    teamsByEvent.set(team.event, sides);
    const previousName = teamNamesById.get(team.id);
    assert.ok(previousName === undefined || previousName === team.name,
      `team id ${team.id} keeps the same source name across both batches`);
    teamNamesById.set(team.id, team.name);
  }
  assert.equal(teamNamesById.size, 20, 'all source team IDs remain consistent across both received batches');

  for (const event of verification.receivedEvents) {
    const range = verification.receivedRanges.find(candidate => candidate.dates === event.window);
    assert.ok(range, `${event.id}: retained its received weekly window`);
    const [start, end] = range.dates.split('-');
    const eventDay = event.date.slice(0, 10).replaceAll('-', '');
    assert.ok(start <= eventDay && eventDay <= end, `${event.id}: event date falls inside ${range.dates}`);
    assert.equal(event.status, 'STATUS_SCHEDULED');
    assert.ok(teamsByEvent.get(event.id)?.home && teamsByEvent.get(event.id)?.away,
      `${event.id}: both team sides were provided`);
  }

  for (const match of MATCH_CENTER_SPANISH_20261212_20270205_MATCHES) {
    const eventId = match.externalIds.espn;
    const event = receivedByEvent.get(eventId);
    const teams = teamsByEvent.get(eventId);
    assert.ok(event, `${match.slug}: event ID is present in the new source output`);
    assert.equal(match.leagueId, 'esp.1');
    assert.equal(match.competitionSlug, 'الدوري-الإسباني');
    assert.equal(match.season, '2026/27');
    assert.equal(match.verification, 'confirmed');
    assert.equal(match.sourceEventName, event.name);
    assert.equal(match.venue, event.venue);
    assert.equal(Date.parse(match.kickoffUtc), Date.parse(event.date), `${match.slug}: UTC instant matches`);
    const [awayName, homeName] = event.name.split(' at ');
    assert.equal(teams.home.name, homeName, `${match.slug}: source home name`);
    assert.equal(teams.away.name, awayName, `${match.slug}: source away name`);
    assert.equal(match.home.externalIds.espn, teams.home.id, `${match.slug}: exact source home team ID`);
    assert.equal(match.away.externalIds.espn, teams.away.id, `${match.slug}: exact source away team ID`);
    assert.equal(match.home.sourceName, teams.home.name);
    assert.equal(match.away.sourceName, teams.away.name);
    assert.equal(matchByExternalId('espn', eventId), match, `${match.slug}: exact event ID resolves to this fixture`);
    assert.ok(!match.slug.includes(eventId), `${match.slug}: provider event ID is not exposed in the URL`);
    assert.equal(match.round, null, `${match.slug}: no unprovided round is inferred`);
    assert.equal(match.home.logo, null);
    assert.equal(match.away.logo, null);
    assert.equal(match.externalIds.apifootball, null);
  }
});


test('the complete February 6–12 esp.1 output maps all ten received event and team IDs before indexing', () => {
  const verification = MATCH_CENTER_SPANISH_20270206_20270212_VERIFICATION;
  assert.equal(verification.provider, 'espn');
  assert.equal(verification.leagueId, 'esp.1');
  assert.match(verification.method, /لم ينفّذ المساعد طلب API/);
  assert.deepEqual(verification.receivedRanges.map(({ dates, eventCount, complete }) => [dates, eventCount, complete]), [
    ['20270206-20270212', 10, true],
  ]);
  assert.equal(verification.receivedEvents.length, 10);
  assert.equal(verification.receivedTeams.length, 20);
  assert.equal(MATCH_CENTER_SPANISH_20270206_20270212_MATCHES.length, 10);
  assert.equal(MATCH_CENTER_SPANISH_MATCHES.length, 300);
  assert.equal(MATCH_CENTER_ALL_MATCHES.length, 620);

  const expectedEventIds = [
    '401882706', '401882705', '401882700', '401882703', '401882702',
    '401882701', '401882699', '401882704', '401882698', '401882697',
  ];
  assert.deepEqual(verification.receivedEvents.map(event => event.id), expectedEventIds);
  assert.deepEqual(MATCH_CENTER_SPANISH_20270206_20270212_MATCHES.map(match => match.externalIds.espn), expectedEventIds);
  assert.equal(new Set(expectedEventIds).size, 10, 'the received event IDs are unique');
  assert.equal(new Set(MATCH_CENTER_ALL_MATCHES.map(match => match.externalIds.espn)).size, 620,
    'the ten new IDs do not collide with an existing fixture');

  const sourceTeams = [
    ...MATCH_CENTER_SPANISH_20261017_20261211_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20261212_20270205_VERIFICATION.receivedTeams,
    ...verification.receivedTeams,
  ];
  const namesByTeamId = new Map();
  for (const team of sourceTeams) {
    const previousName = namesByTeamId.get(team.id);
    assert.ok(previousName === undefined || previousName === team.name,
      `team ID ${team.id} keeps its received name across weekly batches`);
    namesByTeamId.set(team.id, team.name);
  }
  assert.equal(namesByTeamId.size, 20, 'all received IDs identify the same twenty clubs across the batches');

  const teamsByEvent = new Map();
  for (const team of verification.receivedTeams) {
    const sides = teamsByEvent.get(team.event) ?? {};
    assert.equal(sides[team.side], undefined, `${team.event}: only one ${team.side} team row`);
    sides[team.side] = team;
    teamsByEvent.set(team.event, sides);
  }
  for (const match of MATCH_CENTER_SPANISH_20270206_20270212_MATCHES) {
    const eventId = match.externalIds.espn;
    const event = verification.receivedEvents.find(item => item.id === eventId);
    const teams = teamsByEvent.get(eventId);
    assert.ok(event, `${eventId}: received source event is present`);
    assert.equal(event.window, '20270206-20270212');
    assert.equal(event.date, '2027-02-07T20:00Z');
    assert.equal(event.status, 'STATUS_SCHEDULED');
    assert.equal(match.kickoffUtc, '2027-02-07T20:00:00Z');
    assert.equal(Date.parse(match.kickoffUtc), Date.parse(event.date));
    assert.equal(match.sourceEventName, event.name);
    assert.equal(match.venue, event.venue);
    assert.equal(match.verification, 'confirmed');
    assert.equal(match.round, null, 'no round is inferred');
    assert.equal(match.home.logo, null);
    assert.equal(match.away.logo, null);
    assert.equal(match.externalIds.apifootball, null);
    assert.equal(matchByExternalId('espn', eventId), match);
    const [awayName, homeName] = event.name.split(' at ');
    assert.equal(match.home.sourceName, homeName);
    assert.equal(match.away.sourceName, awayName);
    assert.equal(match.home.externalIds.espn, teams.home.id);
    assert.equal(match.away.externalIds.espn, teams.away.id);
    assert.equal(match.home.sourceName, teams.home.name);
    assert.equal(match.away.sourceName, teams.away.name);
  }
});


test('the complete February 13–19 esp.1 output matches the ten received event and team IDs', () => {
  const verification = MATCH_CENTER_SPANISH_20270213_20270219_VERIFICATION;
  assert.equal(verification.provider, 'espn');
  assert.equal(verification.leagueId, 'esp.1');
  assert.match(verification.method, /لم ينفّذ المساعد طلب API/);
  assert.deepEqual(verification.receivedRanges.map(({ dates, eventCount, complete }) => [dates, eventCount, complete]), [
    ['20270213-20270219', 10, true],
  ]);
  assert.equal(verification.receivedEvents.length, 10);
  assert.equal(verification.receivedTeams.length, 20);
  assert.equal(MATCH_CENTER_SPANISH_20270213_20270219_MATCHES.length, 10);
  assert.equal(MATCH_CENTER_SPANISH_MATCHES.length, 300);
  assert.equal(MATCH_CENTER_ALL_MATCHES.length, 620);

  const expectedEventIds = [
    '401882696', '401882695', '401882694', '401882693', '401882692',
    '401882691', '401882690', '401882689', '401882688', '401882687',
  ];
  assert.deepEqual(verification.receivedEvents.map(event => event.id), expectedEventIds);
  assert.deepEqual(MATCH_CENTER_SPANISH_20270213_20270219_MATCHES.map(match => match.externalIds.espn), expectedEventIds);
  assert.equal(new Set(expectedEventIds).size, 10, 'the newly received IDs are unique');
  assert.equal(new Set(MATCH_CENTER_ALL_MATCHES.map(match => match.externalIds.espn)).size, 620,
    'the new IDs do not collide with an existing fixture');

  const sourceTeams = [
    ...MATCH_CENTER_SPANISH_20261017_20261211_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20261212_20270205_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20270206_20270212_VERIFICATION.receivedTeams,
    ...verification.receivedTeams,
  ];
  const namesByTeamId = new Map();
  for (const team of sourceTeams) {
    const previousName = namesByTeamId.get(team.id);
    assert.ok(previousName === undefined || previousName === team.name,
      `team ID ${team.id} retains its source name across weekly batches`);
    namesByTeamId.set(team.id, team.name);
  }
  assert.equal(namesByTeamId.size, 20, 'all source team IDs still identify the same twenty clubs');

  const teamsByEvent = new Map();
  for (const team of verification.receivedTeams) {
    const sides = teamsByEvent.get(team.event) ?? {};
    assert.equal(sides[team.side], undefined, `${team.event}: one ${team.side} row only`);
    sides[team.side] = team;
    teamsByEvent.set(team.event, sides);
  }
  for (const match of MATCH_CENTER_SPANISH_20270213_20270219_MATCHES) {
    const eventId = match.externalIds.espn;
    const event = verification.receivedEvents.find(item => item.id === eventId);
    const teams = teamsByEvent.get(eventId);
    assert.ok(event, `${eventId}: received event exists`);
    assert.equal(event.window, '20270213-20270219');
    assert.equal(event.date, '2027-02-14T20:00Z');
    assert.equal(event.status, 'STATUS_SCHEDULED');
    assert.equal(match.kickoffUtc, '2027-02-14T20:00:00Z');
    assert.equal(Date.parse(match.kickoffUtc), Date.parse(event.date));
    assert.equal(match.sourceEventName, event.name);
    assert.equal(match.venue, event.venue);
    assert.equal(match.verification, 'confirmed');
    assert.equal(match.round, null, 'no round is inferred');
    assert.equal(match.home.logo, null);
    assert.equal(match.away.logo, null);
    assert.equal(match.externalIds.apifootball, null);
    assert.equal(matchByExternalId('espn', eventId), match);
    const [awayName, homeName] = event.name.split(' at ');
    assert.equal(match.home.sourceName, homeName);
    assert.equal(match.away.sourceName, awayName);
    assert.equal(match.home.externalIds.espn, teams.home.id);
    assert.equal(match.away.externalIds.espn, teams.away.id);
    assert.equal(match.home.sourceName, teams.home.name);
    assert.equal(match.away.sourceName, teams.away.name);
  }
});


test('the complete February 20–26 esp.1 output binds all ten received events and team sides', () => {
  const verification = MATCH_CENTER_SPANISH_20270220_20270226_VERIFICATION;
  assert.equal(verification.provider, 'espn');
  assert.equal(verification.leagueId, 'esp.1');
  assert.match(verification.method, /لم ينفّذ المساعد طلب API/);
  assert.deepEqual(verification.receivedRanges.map(({ dates, eventCount, complete }) => [dates, eventCount, complete]), [
    ['20270220-20270226', 10, true],
  ]);
  assert.equal(verification.receivedEvents.length, 10);
  assert.equal(verification.receivedTeams.length, 20);
  assert.equal(MATCH_CENTER_SPANISH_20270220_20270226_MATCHES.length, 10);
  assert.equal(MATCH_CENTER_SPANISH_MATCHES.length, 300);
  assert.equal(MATCH_CENTER_ALL_MATCHES.length, 620);

  const expectedEventIds = [
    '401882686', '401882685', '401882684', '401882681', '401882683',
    '401882682', '401882680', '401882679', '401882678', '401882677',
  ];
  assert.deepEqual(verification.receivedEvents.map(event => event.id), expectedEventIds);
  assert.deepEqual(MATCH_CENTER_SPANISH_20270220_20270226_MATCHES.map(match => match.externalIds.espn), expectedEventIds);
  assert.equal(new Set(expectedEventIds).size, 10, 'new event IDs are unique within the received week');
  assert.equal(new Set(MATCH_CENTER_ALL_MATCHES.map(match => match.externalIds.espn)).size, 620,
    'none of the new IDs collides with a previously indexed event');

  const sourceTeams = [
    ...MATCH_CENTER_SPANISH_20261017_20261211_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20261212_20270205_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20270206_20270212_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20270213_20270219_VERIFICATION.receivedTeams,
    ...verification.receivedTeams,
  ];
  const namesByTeamId = new Map();
  for (const team of sourceTeams) {
    const previousName = namesByTeamId.get(team.id);
    assert.ok(previousName === undefined || previousName === team.name,
      `source team ID ${team.id} retains its name across weekly batches`);
    namesByTeamId.set(team.id, team.name);
  }
  assert.equal(namesByTeamId.size, 20, 'the weekly outputs still refer to the same twenty clubs');

  const teamsByEvent = new Map();
  for (const team of verification.receivedTeams) {
    const sides = teamsByEvent.get(team.event) ?? {};
    assert.equal(sides[team.side], undefined, `${team.event}: exactly one ${team.side} team row`);
    sides[team.side] = team;
    teamsByEvent.set(team.event, sides);
  }
  for (const match of MATCH_CENTER_SPANISH_20270220_20270226_MATCHES) {
    const eventId = match.externalIds.espn;
    const event = verification.receivedEvents.find(item => item.id === eventId);
    const teams = teamsByEvent.get(eventId);
    assert.ok(event, `${eventId}: event exists in the received source output`);
    assert.equal(event.window, '20270220-20270226');
    assert.equal(event.date, '2027-02-21T20:00Z');
    assert.equal(event.status, 'STATUS_SCHEDULED');
    assert.equal(match.kickoffUtc, '2027-02-21T20:00:00Z');
    assert.equal(Date.parse(match.kickoffUtc), Date.parse(event.date));
    assert.equal(match.sourceEventName, event.name);
    assert.equal(match.venue, event.venue);
    assert.equal(match.verification, 'confirmed');
    assert.equal(match.round, null, 'no round is inferred');
    assert.equal(match.home.logo, null);
    assert.equal(match.away.logo, null);
    assert.equal(match.externalIds.apifootball, null);
    assert.equal(matchByExternalId('espn', eventId), match);
    const [awayName, homeName] = event.name.split(' at ');
    assert.equal(match.home.sourceName, homeName);
    assert.equal(match.away.sourceName, awayName);
    assert.equal(match.home.externalIds.espn, teams.home.id);
    assert.equal(match.away.externalIds.espn, teams.away.id);
    assert.equal(match.home.sourceName, teams.home.name);
    assert.equal(match.away.sourceName, teams.away.name);
  }
});


test('the complete February 27–March 5 esp.1 output matches each received event, venue and team ID', () => {
  const verification = MATCH_CENTER_SPANISH_20270227_20270305_VERIFICATION;
  assert.equal(verification.provider, 'espn');
  assert.equal(verification.leagueId, 'esp.1');
  assert.match(verification.method, /لم ينفّذ المساعد طلب API/);
  assert.deepEqual(verification.receivedRanges.map(({ dates, eventCount, complete }) => [dates, eventCount, complete]), [
    ['20270227-20270305', 10, true],
  ]);
  assert.equal(verification.receivedEvents.length, 10);
  assert.equal(verification.receivedTeams.length, 20);
  assert.equal(MATCH_CENTER_SPANISH_20270227_20270305_MATCHES.length, 10);
  assert.equal(MATCH_CENTER_SPANISH_MATCHES.length, 300);
  assert.equal(MATCH_CENTER_ALL_MATCHES.length, 620);

  const expectedEventIds = [
    '401882676', '401882674', '401882673', '401882672', '401882671',
    '401882670', '401882669', '401882675', '401882668', '401882667',
  ];
  assert.deepEqual(verification.receivedEvents.map(event => event.id), expectedEventIds);
  assert.deepEqual(MATCH_CENTER_SPANISH_20270227_20270305_MATCHES.map(match => match.externalIds.espn), expectedEventIds);
  assert.equal(new Set(expectedEventIds).size, 10, 'the new source event IDs are unique');
  assert.equal(new Set(MATCH_CENTER_ALL_MATCHES.map(match => match.externalIds.espn)).size, 620,
    'none of the new IDs overlaps an existing fixture');

  const sourceTeams = [
    ...MATCH_CENTER_SPANISH_20261017_20261211_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20261212_20270205_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20270206_20270212_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20270213_20270219_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20270220_20270226_VERIFICATION.receivedTeams,
    ...verification.receivedTeams,
  ];
  const namesByTeamId = new Map();
  for (const team of sourceTeams) {
    const previousName = namesByTeamId.get(team.id);
    assert.ok(previousName === undefined || previousName === team.name,
      `team ID ${team.id} retains its source name across the weekly outputs`);
    namesByTeamId.set(team.id, team.name);
  }
  assert.equal(namesByTeamId.size, 20, 'all received batches still identify the same twenty clubs');

  const teamsByEvent = new Map();
  for (const team of verification.receivedTeams) {
    const sides = teamsByEvent.get(team.event) ?? {};
    assert.equal(sides[team.side], undefined, `${team.event}: only one ${team.side} team record`);
    sides[team.side] = team;
    teamsByEvent.set(team.event, sides);
  }
  for (const match of MATCH_CENTER_SPANISH_20270227_20270305_MATCHES) {
    const eventId = match.externalIds.espn;
    const event = verification.receivedEvents.find(item => item.id === eventId);
    const teams = teamsByEvent.get(eventId);
    assert.ok(event, `${eventId}: exists in the user's source output`);
    assert.equal(event.window, '20270227-20270305');
    assert.equal(event.date, '2027-02-28T20:00Z');
    assert.equal(event.status, 'STATUS_SCHEDULED');
    assert.equal(match.kickoffUtc, '2027-02-28T20:00:00Z');
    assert.equal(Date.parse(match.kickoffUtc), Date.parse(event.date));
    assert.equal(match.sourceEventName, event.name);
    assert.equal(match.venue, event.venue);
    assert.equal(match.verification, 'confirmed');
    assert.equal(match.round, null, 'round stays unset because none was supplied');
    assert.equal(match.home.logo, null);
    assert.equal(match.away.logo, null);
    assert.equal(match.externalIds.apifootball, null);
    assert.equal(matchByExternalId('espn', eventId), match);
    const [awayName, homeName] = event.name.split(' at ');
    assert.equal(match.home.sourceName, homeName);
    assert.equal(match.away.sourceName, awayName);
    assert.equal(match.home.externalIds.espn, teams.home.id);
    assert.equal(match.away.externalIds.espn, teams.away.id);
    assert.equal(match.home.sourceName, teams.home.name);
    assert.equal(match.away.sourceName, teams.away.name);
  }
});


test('the complete March 6–12 esp.1 output matches each received event, venue and team ID', () => {
  const verification = MATCH_CENTER_SPANISH_20270306_20270312_VERIFICATION;
  assert.equal(verification.provider, 'espn');
  assert.equal(verification.leagueId, 'esp.1');
  assert.match(verification.method, /لم ينفّذ المساعد طلب API/);
  assert.deepEqual(verification.receivedRanges.map(({ dates, eventCount, complete }) => [dates, eventCount, complete]), [
    ['20270306-20270312', 10, true],
  ]);
  assert.equal(verification.receivedEvents.length, 10);
  assert.equal(verification.receivedTeams.length, 20);
  assert.equal(MATCH_CENTER_SPANISH_20270306_20270312_MATCHES.length, 10);
  assert.equal(MATCH_CENTER_SPANISH_MATCHES.length, 300);
  assert.equal(MATCH_CENTER_ALL_MATCHES.length, 620);

  const expectedEventIds = [
    '401882666', '401882665', '401882661', '401882664', '401882663',
    '401882662', '401882660', '401882659', '401882658', '401882657',
  ];
  assert.deepEqual(verification.receivedEvents.map(event => event.id), expectedEventIds);
  assert.deepEqual(MATCH_CENTER_SPANISH_20270306_20270312_MATCHES.map(match => match.externalIds.espn), expectedEventIds);
  assert.equal(new Set(expectedEventIds).size, 10, 'the new source event IDs are unique');
  assert.equal(new Set(MATCH_CENTER_ALL_MATCHES.map(match => match.externalIds.espn)).size, 620,
    'none of the new IDs overlaps an existing fixture');

  const sourceTeams = [
    ...MATCH_CENTER_SPANISH_20261017_20261211_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20261212_20270205_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20270206_20270212_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20270213_20270219_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20270220_20270226_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20270227_20270305_VERIFICATION.receivedTeams,
    ...verification.receivedTeams,
  ];
  const namesByTeamId = new Map();
  for (const team of sourceTeams) {
    const previousName = namesByTeamId.get(team.id);
    assert.ok(previousName === undefined || previousName === team.name,
      `team ID ${team.id} retains its source name across the weekly outputs`);
    namesByTeamId.set(team.id, team.name);
  }
  assert.equal(namesByTeamId.size, 20, 'all received batches identify the same twenty clubs');

  const teamsByEvent = new Map();
  for (const team of verification.receivedTeams) {
    const sides = teamsByEvent.get(team.event) ?? {};
    assert.equal(sides[team.side], undefined, `${team.event}: only one ${team.side} team record`);
    sides[team.side] = team;
    teamsByEvent.set(team.event, sides);
  }
  for (const match of MATCH_CENTER_SPANISH_20270306_20270312_MATCHES) {
    const eventId = match.externalIds.espn;
    const event = verification.receivedEvents.find(item => item.id === eventId);
    const teams = teamsByEvent.get(eventId);
    assert.ok(event, `${eventId}: exists in the user's source output`);
    assert.equal(event.window, '20270306-20270312');
    assert.equal(event.date, '2027-03-07T20:00Z');
    assert.equal(event.status, 'STATUS_SCHEDULED');
    assert.equal(match.kickoffUtc, '2027-03-07T20:00:00Z');
    assert.equal(Date.parse(match.kickoffUtc), Date.parse(event.date));
    assert.equal(match.sourceEventName, event.name);
    assert.equal(match.venue, event.venue);
    assert.equal(match.verification, 'confirmed');
    assert.equal(match.round, null, 'round stays unset because none was supplied');
    assert.equal(match.home.logo, null);
    assert.equal(match.away.logo, null);
    assert.equal(match.externalIds.apifootball, null);
    assert.equal(matchByExternalId('espn', eventId), match);
    const [awayName, homeName] = event.name.split(' at ');
    assert.equal(match.home.sourceName, homeName);
    assert.equal(match.away.sourceName, awayName);
    assert.equal(match.home.externalIds.espn, teams.home.id);
    assert.equal(match.away.externalIds.espn, teams.away.id);
    assert.equal(match.home.sourceName, teams.home.name);
    assert.equal(match.away.sourceName, teams.away.name);
  }
});


test('the complete March 13–19 esp.1 output matches each received event, venue and team ID', () => {
  const verification = MATCH_CENTER_SPANISH_20270313_20270319_VERIFICATION;
  assert.equal(verification.provider, 'espn');
  assert.equal(verification.leagueId, 'esp.1');
  assert.match(verification.method, /لم ينفّذ المساعد طلب API/);
  assert.deepEqual(verification.receivedRanges.map(({ dates, eventCount, complete }) => [dates, eventCount, complete]), [
    ['20270313-20270319', 10, true],
  ]);
  assert.equal(verification.receivedEvents.length, 10);
  assert.equal(verification.receivedTeams.length, 20);
  assert.equal(MATCH_CENTER_SPANISH_20270313_20270319_MATCHES.length, 10);
  assert.equal(MATCH_CENTER_SPANISH_MATCHES.length, 300);
  assert.equal(MATCH_CENTER_ALL_MATCHES.length, 620);

  const expectedEventIds = [
    '401882656', '401882655', '401882652', '401882653', '401882651',
    '401882650', '401882649', '401882648', '401882654', '401882647',
  ];
  assert.deepEqual(verification.receivedEvents.map(event => event.id), expectedEventIds);
  assert.deepEqual(MATCH_CENTER_SPANISH_20270313_20270319_MATCHES.map(match => match.externalIds.espn), expectedEventIds);
  assert.equal(new Set(expectedEventIds).size, 10, 'the new source event IDs are unique');
  assert.equal(new Set(MATCH_CENTER_ALL_MATCHES.map(match => match.externalIds.espn)).size, 620,
    'none of the new IDs overlaps an existing fixture');

  const sourceTeams = [
    ...MATCH_CENTER_SPANISH_20261017_20261211_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20261212_20270205_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20270206_20270212_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20270213_20270219_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20270220_20270226_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20270227_20270305_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20270306_20270312_VERIFICATION.receivedTeams,
    ...verification.receivedTeams,
  ];
  const namesByTeamId = new Map();
  for (const team of sourceTeams) {
    const previousName = namesByTeamId.get(team.id);
    assert.ok(previousName === undefined || previousName === team.name,
      `team ID ${team.id} retains its source name across the weekly outputs`);
    namesByTeamId.set(team.id, team.name);
  }
  assert.equal(namesByTeamId.size, 20, 'all received batches identify the same twenty clubs');

  const teamsByEvent = new Map();
  for (const team of verification.receivedTeams) {
    const sides = teamsByEvent.get(team.event) ?? {};
    assert.equal(sides[team.side], undefined, `${team.event}: only one ${team.side} team record`);
    sides[team.side] = team;
    teamsByEvent.set(team.event, sides);
  }
  for (const match of MATCH_CENTER_SPANISH_20270313_20270319_MATCHES) {
    const eventId = match.externalIds.espn;
    const event = verification.receivedEvents.find(item => item.id === eventId);
    const teams = teamsByEvent.get(eventId);
    assert.ok(event, `${eventId}: exists in the user's source output`);
    assert.equal(event.window, '20270313-20270319');
    assert.equal(event.date, '2027-03-14T18:00Z');
    assert.equal(event.status, 'STATUS_SCHEDULED');
    assert.equal(match.kickoffUtc, '2027-03-14T18:00:00Z');
    assert.equal(Date.parse(match.kickoffUtc), Date.parse(event.date));
    assert.equal(match.sourceEventName, event.name);
    assert.equal(match.venue, event.venue);
    assert.equal(match.verification, 'confirmed');
    assert.equal(match.round, null, 'round stays unset because none was supplied');
    assert.equal(match.home.logo, null);
    assert.equal(match.away.logo, null);
    assert.equal(match.externalIds.apifootball, null);
    assert.equal(matchByExternalId('espn', eventId), match);
    const [awayName, homeName] = event.name.split(' at ');
    assert.equal(match.home.sourceName, homeName);
    assert.equal(match.away.sourceName, awayName);
    assert.equal(match.home.externalIds.espn, teams.home.id);
    assert.equal(match.away.externalIds.espn, teams.away.id);
    assert.equal(match.home.sourceName, teams.home.name);
    assert.equal(match.away.sourceName, teams.away.name);
  }
});


test('the complete March 20–26 esp.1 output matches each received event, venue and team ID', () => {
  const verification = MATCH_CENTER_SPANISH_20270320_20270326_VERIFICATION;
  assert.equal(verification.provider, 'espn');
  assert.equal(verification.leagueId, 'esp.1');
  assert.match(verification.method, /لم ينفّذ المساعد طلب API/);
  assert.deepEqual(verification.receivedRanges.map(({ dates, eventCount, complete }) => [dates, eventCount, complete]), [
    ['20270320-20270326', 10, true],
  ]);
  assert.equal(verification.receivedEvents.length, 10);
  assert.equal(verification.receivedTeams.length, 20);
  assert.equal(MATCH_CENTER_SPANISH_20270320_20270326_MATCHES.length, 10);
  assert.equal(MATCH_CENTER_SPANISH_MATCHES.length, 300);
  assert.equal(MATCH_CENTER_ALL_MATCHES.length, 620);

  const expectedEventIds = [
    '401882646', '401882645', '401882644', '401882643', '401882642',
    '401882641', '401882640', '401882639', '401882638', '401882637',
  ];
  assert.deepEqual(verification.receivedEvents.map(event => event.id), expectedEventIds);
  assert.deepEqual(MATCH_CENTER_SPANISH_20270320_20270326_MATCHES.map(match => match.externalIds.espn), expectedEventIds);
  assert.equal(new Set(expectedEventIds).size, 10, 'the new source event IDs are unique');
  assert.equal(new Set(MATCH_CENTER_ALL_MATCHES.map(match => match.externalIds.espn)).size, 620,
    'none of the new IDs overlaps an existing fixture');

  const sourceTeams = [
    ...MATCH_CENTER_SPANISH_20261017_20261211_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20261212_20270205_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20270206_20270212_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20270213_20270219_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20270220_20270226_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20270227_20270305_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20270306_20270312_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20270313_20270319_VERIFICATION.receivedTeams,
    ...verification.receivedTeams,
  ];
  const namesByTeamId = new Map();
  for (const team of sourceTeams) {
    const previousName = namesByTeamId.get(team.id);
    assert.ok(previousName === undefined || previousName === team.name,
      `team ID ${team.id} retains its source name across the weekly outputs`);
    namesByTeamId.set(team.id, team.name);
  }
  assert.equal(namesByTeamId.size, 20, 'all received batches identify the same twenty clubs');

  const teamsByEvent = new Map();
  for (const team of verification.receivedTeams) {
    const sides = teamsByEvent.get(team.event) ?? {};
    assert.equal(sides[team.side], undefined, `${team.event}: only one ${team.side} team record`);
    sides[team.side] = team;
    teamsByEvent.set(team.event, sides);
  }
  for (const match of MATCH_CENTER_SPANISH_20270320_20270326_MATCHES) {
    const eventId = match.externalIds.espn;
    const event = verification.receivedEvents.find(item => item.id === eventId);
    const teams = teamsByEvent.get(eventId);
    assert.ok(event, `${eventId}: exists in the user's source output`);
    assert.equal(event.window, '20270320-20270326');
    assert.equal(event.date, '2027-03-21T18:00Z');
    assert.equal(event.status, 'STATUS_SCHEDULED');
    assert.equal(match.kickoffUtc, '2027-03-21T18:00:00Z');
    assert.equal(Date.parse(match.kickoffUtc), Date.parse(event.date));
    assert.equal(match.sourceEventName, event.name);
    assert.equal(match.venue, event.venue);
    assert.equal(match.verification, 'confirmed');
    assert.equal(match.round, null, 'round stays unset because none was supplied');
    assert.equal(match.home.logo, null);
    assert.equal(match.away.logo, null);
    assert.equal(match.externalIds.apifootball, null);
    assert.equal(matchByExternalId('espn', eventId), match);
    const [awayName, homeName] = event.name.split(' at ');
    assert.equal(match.home.sourceName, homeName);
    assert.equal(match.away.sourceName, awayName);
    assert.equal(match.home.externalIds.espn, teams.home.id);
    assert.equal(match.away.externalIds.espn, teams.away.id);
    assert.equal(match.home.sourceName, teams.home.name);
    assert.equal(match.away.sourceName, teams.away.name);
  }
});


test('the complete April 3–9 esp.1 output matches each received event, venue and team ID', () => {
  const verification = MATCH_CENTER_SPANISH_20270403_20270409_VERIFICATION;
  const previous = MATCH_CENTER_SPANISH_20270327_20270402_VERIFICATION;
  assert.equal(verification.receivedOn, '2026-10-17');
  assert.equal(verification.provider, 'espn');
  assert.equal(verification.leagueId, 'esp.1');
  assert.match(verification.method, /لم ينفّذ المساعد طلب API/);
  assert.deepEqual(verification.receivedRanges.map(({ dates, eventCount, complete }) => [dates, eventCount, complete]), [
    ['20270403-20270409', 10, true],
  ]);
  assert.deepEqual(verification.receivedRanges.map(({ scoreboardEndpoint }) => scoreboardEndpoint), [
    'https://streammasterstore.com/scoreboard.php?league=esp.1&dates=20270403-20270409',
  ]);
  assert.equal(verification.receivedEvents.length, 10);
  assert.equal(verification.receivedTeams.length, 20);
  assert.equal(MATCH_CENTER_SPANISH_20270403_20270409_MATCHES.length, 10);
  assert.equal(MATCH_CENTER_SPANISH_MATCHES.length, 300);
  assert.equal(MATCH_CENTER_ALL_MATCHES.length, 620);

  const expectedEventIds = [
    '401882636', '401882632', '401882634', '401882633', '401882631',
    '401882630', '401882629', '401882635', '401882628', '401882627',
  ];
  assert.deepEqual(verification.receivedEvents.map(event => event.id), expectedEventIds);
  assert.deepEqual(MATCH_CENTER_SPANISH_20270403_20270409_MATCHES.map(match => match.externalIds.espn), expectedEventIds);
  assert.equal(new Set(expectedEventIds).size, 10, 'the new source event IDs are unique');
  assert.equal(new Set(MATCH_CENTER_ALL_MATCHES.map(match => match.externalIds.espn)).size, 620,
    'none of the new IDs overlaps an existing fixture');

  const sourceTeams = [
    ...MATCH_CENTER_SPANISH_20261017_20261211_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20261212_20270205_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20270206_20270212_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20270213_20270219_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20270220_20270226_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20270227_20270305_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20270306_20270312_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20270313_20270319_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20270320_20270326_VERIFICATION.receivedTeams,
    ...verification.receivedTeams,
  ];
  const namesByTeamId = new Map();
  for (const team of sourceTeams) {
    const previousName = namesByTeamId.get(team.id);
    assert.ok(previousName === undefined || previousName === team.name,
      `team ID ${team.id} retains its source name across the weekly outputs`);
    namesByTeamId.set(team.id, team.name);
  }
  assert.equal(namesByTeamId.size, 20, 'all received batches identify the same twenty clubs');

  const toUtc = day => Date.parse(`${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6, 8)}T00:00:00Z`);
  const previousEnd = previous.receivedRanges.at(-1).dates.split('-')[1];
  const currentStart = verification.receivedRanges[0].dates.split('-')[0];
  assert.equal(toUtc(currentStart) - toUtc(previousEnd), 86_400_000,
    'this populated range follows the previously recorded empty week without a gap');
  assert.deepEqual(previous.receivedEvents, []);
  assert.deepEqual(previous.receivedTeams, []);

  const teamsByEvent = new Map();
  for (const team of verification.receivedTeams) {
    const sides = teamsByEvent.get(team.event) ?? {};
    assert.equal(sides[team.side], undefined, `${team.event}: only one ${team.side} team record`);
    sides[team.side] = team;
    teamsByEvent.set(team.event, sides);
  }
  for (const match of MATCH_CENTER_SPANISH_20270403_20270409_MATCHES) {
    const eventId = match.externalIds.espn;
    const event = verification.receivedEvents.find(item => item.id === eventId);
    const teams = teamsByEvent.get(eventId);
    assert.ok(event, `${eventId}: exists in the user's source output`);
    assert.equal(event.window, '20270403-20270409');
    assert.equal(event.date, '2027-04-04T18:00Z');
    assert.equal(event.status, 'STATUS_SCHEDULED');
    assert.equal(match.kickoffUtc, '2027-04-04T18:00:00Z');
    assert.equal(Date.parse(match.kickoffUtc), Date.parse(event.date));
    assert.equal(match.sourceEventName, event.name);
    assert.equal(match.venue, event.venue);
    assert.equal(match.verification, 'confirmed');
    assert.equal(match.round, null, 'round stays unset because none was supplied');
    assert.equal(match.home.logo, null);
    assert.equal(match.away.logo, null);
    assert.equal(match.externalIds.apifootball, null);
    assert.equal(matchByExternalId('espn', eventId), match);
    const [awayName, homeName] = event.name.split(' at ');
    assert.equal(match.home.sourceName, homeName);
    assert.equal(match.away.sourceName, awayName);
    assert.equal(match.home.externalIds.espn, teams.home.id);
    assert.equal(match.away.externalIds.espn, teams.away.id);
    assert.equal(match.home.sourceName, teams.home.name);
    assert.equal(match.away.sourceName, teams.away.name);
  }
});


test('the complete April 10–16 esp.1 output matches each received event, venue and team ID', () => {
  const verification = MATCH_CENTER_SPANISH_20270410_20270416_VERIFICATION;
  const previous = MATCH_CENTER_SPANISH_20270403_20270409_VERIFICATION;
  assert.equal(verification.receivedOn, '2026-10-17');
  assert.equal(verification.provider, 'espn');
  assert.equal(verification.leagueId, 'esp.1');
  assert.match(verification.method, /لم ينفّذ المساعد طلب API/);
  assert.deepEqual(verification.receivedRanges.map(({ dates, eventCount, complete }) => [dates, eventCount, complete]), [
    ['20270410-20270416', 10, true],
  ]);
  assert.deepEqual(verification.receivedRanges.map(({ scoreboardEndpoint }) => scoreboardEndpoint), [
    'https://streammasterstore.com/scoreboard.php?league=esp.1&dates=20270410-20270416',
  ]);
  assert.equal(verification.receivedEvents.length, 10);
  assert.equal(verification.receivedTeams.length, 20);
  assert.equal(MATCH_CENTER_SPANISH_20270410_20270416_MATCHES.length, 10);
  assert.equal(MATCH_CENTER_SPANISH_MATCHES.length, 300);
  assert.equal(MATCH_CENTER_ALL_MATCHES.length, 620);

  const expectedEventIds = [
    '401882626', '401882625', '401882624', '401882623', '401882622',
    '401882621', '401882620', '401882619', '401882618', '401882617',
  ];
  assert.deepEqual(verification.receivedEvents.map(event => event.id), expectedEventIds);
  assert.deepEqual(MATCH_CENTER_SPANISH_20270410_20270416_MATCHES.map(match => match.externalIds.espn), expectedEventIds);
  assert.equal(new Set(expectedEventIds).size, 10, 'the new source event IDs are unique');
  assert.equal(new Set(MATCH_CENTER_ALL_MATCHES.map(match => match.externalIds.espn)).size, 620,
    'none of the new IDs overlaps an existing fixture');

  const sourceTeams = [
    ...MATCH_CENTER_SPANISH_20261017_20261211_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20261212_20270205_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20270206_20270212_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20270213_20270219_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20270220_20270226_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20270227_20270305_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20270306_20270312_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20270313_20270319_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20270320_20270326_VERIFICATION.receivedTeams,
    ...previous.receivedTeams,
    ...verification.receivedTeams,
  ];
  const namesByTeamId = new Map();
  for (const team of sourceTeams) {
    const previousName = namesByTeamId.get(team.id);
    assert.ok(previousName === undefined || previousName === team.name,
      `team ID ${team.id} retains its source name across the weekly outputs`);
    namesByTeamId.set(team.id, team.name);
  }
  assert.equal(namesByTeamId.size, 20, 'all received batches identify the same twenty clubs');

  const toUtc = day => Date.parse(`${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6, 8)}T00:00:00Z`);
  const previousEnd = previous.receivedRanges.at(-1).dates.split('-')[1];
  const currentStart = verification.receivedRanges[0].dates.split('-')[0];
  assert.equal(toUtc(currentStart) - toUtc(previousEnd), 86_400_000,
    'this populated range follows the previous received week without a gap');

  const teamsByEvent = new Map();
  for (const team of verification.receivedTeams) {
    const sides = teamsByEvent.get(team.event) ?? {};
    assert.equal(sides[team.side], undefined, `${team.event}: only one ${team.side} team record`);
    sides[team.side] = team;
    teamsByEvent.set(team.event, sides);
  }
  for (const match of MATCH_CENTER_SPANISH_20270410_20270416_MATCHES) {
    const eventId = match.externalIds.espn;
    const event = verification.receivedEvents.find(item => item.id === eventId);
    const teams = teamsByEvent.get(eventId);
    assert.ok(event, `${eventId}: exists in the user's source output`);
    assert.equal(event.window, '20270410-20270416');
    assert.equal(event.date, '2027-04-11T18:00Z');
    assert.equal(event.status, 'STATUS_SCHEDULED');
    assert.equal(match.kickoffUtc, '2027-04-11T18:00:00Z');
    assert.equal(Date.parse(match.kickoffUtc), Date.parse(event.date));
    assert.equal(match.sourceEventName, event.name);
    assert.equal(match.venue, event.venue);
    assert.equal(match.verification, 'confirmed');
    assert.equal(match.round, null, 'round stays unset because none was supplied');
    assert.equal(match.home.logo, null);
    assert.equal(match.away.logo, null);
    assert.equal(match.externalIds.apifootball, null);
    assert.equal(matchByExternalId('espn', eventId), match);
    const [awayName, homeName] = event.name.split(' at ');
    assert.equal(match.home.sourceName, homeName);
    assert.equal(match.away.sourceName, awayName);
    assert.equal(match.home.externalIds.espn, teams.home.id);
    assert.equal(match.away.externalIds.espn, teams.away.id);
    assert.equal(match.home.sourceName, teams.home.name);
    assert.equal(match.away.sourceName, teams.away.name);
  }
});


test('the complete April 17–23 esp.1 output matches all twenty received events, dates and team IDs', () => {
  const verification = MATCH_CENTER_SPANISH_20270417_20270423_VERIFICATION;
  const previous = MATCH_CENTER_SPANISH_20270410_20270416_VERIFICATION;
  assert.equal(verification.receivedOn, '2026-10-17');
  assert.equal(verification.provider, 'espn');
  assert.equal(verification.leagueId, 'esp.1');
  assert.match(verification.method, /لم ينفّذ المساعد طلب API/);
  assert.deepEqual(verification.receivedRanges.map(({ dates, eventCount, complete }) => [dates, eventCount, complete]), [
    ['20270417-20270423', 20, true],
  ]);
  assert.deepEqual(verification.receivedRanges.map(({ scoreboardEndpoint }) => scoreboardEndpoint), [
    'https://streammasterstore.com/scoreboard.php?league=esp.1&dates=20270417-20270423',
  ]);
  assert.equal(verification.receivedEvents.length, 20);
  assert.equal(verification.receivedTeams.length, 40);
  assert.equal(MATCH_CENTER_SPANISH_20270417_20270423_MATCHES.length, 20);
  assert.equal(MATCH_CENTER_SPANISH_MATCHES.length, 300);
  assert.equal(MATCH_CENTER_ALL_MATCHES.length, 620);

  const expectedEventIds = [
    '401882616', '401882615', '401882611', '401882613', '401882612',
    '401882610', '401882609', '401882608', '401882614', '401882607',
    '401882606', '401882605', '401882604', '401882603', '401882602',
    '401882601', '401882600', '401882599', '401882598', '401882597',
  ];
  assert.deepEqual(verification.receivedEvents.map(event => event.id), expectedEventIds);
  assert.deepEqual(MATCH_CENTER_SPANISH_20270417_20270423_MATCHES.map(match => match.externalIds.espn), expectedEventIds);
  assert.equal(new Set(expectedEventIds).size, 20, 'the new source event IDs are unique');
  assert.equal(new Set(MATCH_CENTER_ALL_MATCHES.map(match => match.externalIds.espn)).size, 620,
    'none of the new IDs overlaps an existing fixture');

  const expectedDates = [
    ...Array(10).fill('2027-04-18T18:00Z'),
    ...Array(10).fill('2027-04-21T18:00Z'),
  ];
  assert.deepEqual(verification.receivedEvents.map(event => event.date), expectedDates);
  const sourceTeams = [
    ...MATCH_CENTER_SPANISH_20261017_20261211_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20261212_20270205_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20270206_20270212_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20270213_20270219_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20270220_20270226_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20270227_20270305_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20270306_20270312_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20270313_20270319_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20270320_20270326_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20270403_20270409_VERIFICATION.receivedTeams,
    ...previous.receivedTeams,
    ...verification.receivedTeams,
  ];
  const namesByTeamId = new Map();
  for (const team of sourceTeams) {
    const previousName = namesByTeamId.get(team.id);
    assert.ok(previousName === undefined || previousName === team.name,
      `team ID ${team.id} retains its source name across the weekly outputs`);
    namesByTeamId.set(team.id, team.name);
  }
  assert.equal(namesByTeamId.size, 20, 'all received batches identify the same twenty clubs');

  const toUtc = day => Date.parse(`${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6, 8)}T00:00:00Z`);
  const previousEnd = previous.receivedRanges.at(-1).dates.split('-')[1];
  const currentStart = verification.receivedRanges[0].dates.split('-')[0];
  assert.equal(toUtc(currentStart) - toUtc(previousEnd), 86_400_000,
    'this populated range follows the previous received week without a gap');

  const teamsByEvent = new Map();
  for (const team of verification.receivedTeams) {
    const sides = teamsByEvent.get(team.event) ?? {};
    assert.equal(sides[team.side], undefined, `${team.event}: only one ${team.side} team record`);
    sides[team.side] = team;
    teamsByEvent.set(team.event, sides);
  }
  for (const match of MATCH_CENTER_SPANISH_20270417_20270423_MATCHES) {
    const eventId = match.externalIds.espn;
    const event = verification.receivedEvents.find(item => item.id === eventId);
    const teams = teamsByEvent.get(eventId);
    assert.ok(event, `${eventId}: exists in the user's source output`);
    assert.equal(event.window, '20270417-20270423');
    assert.equal(event.status, 'STATUS_SCHEDULED');
    assert.equal(match.leagueId, 'esp.1');
    assert.equal(match.kickoffUtc, `${event.date.slice(0, 16)}:00Z`);
    assert.equal(Date.parse(match.kickoffUtc), Date.parse(event.date));
    assert.equal(match.sourceEventName, event.name);
    assert.equal(match.venue, event.venue);
    assert.equal(match.verification, 'confirmed');
    assert.equal(match.round, null, 'round stays unset because none was supplied');
    assert.equal(match.home.logo, null);
    assert.equal(match.away.logo, null);
    assert.equal(match.externalIds.apifootball, null);
    assert.equal(matchByExternalId('espn', eventId), match);
    const [awayName, homeName] = event.name.split(' at ');
    assert.equal(match.home.sourceName, homeName);
    assert.equal(match.away.sourceName, awayName);
    assert.equal(match.home.externalIds.espn, teams.home.id);
    assert.equal(match.away.externalIds.espn, teams.away.id);
    assert.equal(match.home.sourceName, teams.home.name);
    assert.equal(match.away.sourceName, teams.away.name);
  }
});


test('the complete May 1–7 esp.1 output matches each received event, venue and team ID', () => {
  const verification = MATCH_CENTER_SPANISH_20270501_20270507_VERIFICATION;
  const previous = MATCH_CENTER_SPANISH_20270424_20270430_VERIFICATION;
  assert.equal(verification.receivedOn, '2026-10-17');
  assert.equal(verification.provider, 'espn');
  assert.equal(verification.leagueId, 'esp.1');
  assert.match(verification.method, /لم ينفّذ المساعد طلب API/);
  assert.deepEqual(verification.receivedRanges.map(({ dates, eventCount, complete }) => [dates, eventCount, complete]), [
    ['20270501-20270507', 10, true],
  ]);
  assert.deepEqual(verification.receivedRanges.map(({ scoreboardEndpoint }) => scoreboardEndpoint), [
    'https://streammasterstore.com/scoreboard.php?league=esp.1&dates=20270501-20270507',
  ]);
  assert.equal(verification.receivedEvents.length, 10);
  assert.equal(verification.receivedTeams.length, 20);
  assert.equal(MATCH_CENTER_SPANISH_20270501_20270507_MATCHES.length, 10);
  assert.equal(MATCH_CENTER_SPANISH_MATCHES.length, 300);
  assert.equal(MATCH_CENTER_ALL_MATCHES.length, 620);

  const expectedEventIds = [
    '401882596', '401882591', '401882594', '401882593', '401882592',
    '401882590', '401882589', '401882588', '401882595', '401882587',
  ];
  assert.deepEqual(verification.receivedEvents.map(event => event.id), expectedEventIds);
  assert.deepEqual(MATCH_CENTER_SPANISH_20270501_20270507_MATCHES.map(match => match.externalIds.espn), expectedEventIds);
  assert.equal(new Set(expectedEventIds).size, 10, 'the new source event IDs are unique');
  assert.equal(new Set(MATCH_CENTER_ALL_MATCHES.map(match => match.externalIds.espn)).size, 620,
    'none of the new IDs overlaps an existing fixture');
  assert.deepEqual(verification.receivedEvents.map(event => event.date), Array(10).fill('2027-05-02T18:00Z'));

  const sourceTeams = [
    ...MATCH_CENTER_SPANISH_20261017_20261211_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20261212_20270205_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20270206_20270212_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20270213_20270219_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20270220_20270226_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20270227_20270305_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20270306_20270312_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20270313_20270319_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20270320_20270326_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20270403_20270409_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20270410_20270416_VERIFICATION.receivedTeams,
    ...MATCH_CENTER_SPANISH_20270417_20270423_VERIFICATION.receivedTeams,
    ...verification.receivedTeams,
  ];
  const namesByTeamId = new Map();
  for (const team of sourceTeams) {
    const previousName = namesByTeamId.get(team.id);
    assert.ok(previousName === undefined || previousName === team.name,
      `team ID ${team.id} retains its source name across the weekly outputs`);
    namesByTeamId.set(team.id, team.name);
  }
  assert.equal(namesByTeamId.size, 20, 'all received batches identify the same twenty clubs');

  const toUtc = day => Date.parse(`${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6, 8)}T00:00:00Z`);
  const previousEnd = previous.receivedRanges.at(-1).dates.split('-')[1];
  const currentStart = verification.receivedRanges[0].dates.split('-')[0];
  assert.equal(toUtc(currentStart) - toUtc(previousEnd), 86_400_000,
    'this populated range follows the previous audit-only empty week without a gap');
  assert.deepEqual(previous.receivedEvents, []);
  assert.deepEqual(previous.receivedTeams, []);

  const teamsByEvent = new Map();
  for (const team of verification.receivedTeams) {
    const sides = teamsByEvent.get(team.event) ?? {};
    assert.equal(sides[team.side], undefined, `${team.event}: only one ${team.side} team record`);
    sides[team.side] = team;
    teamsByEvent.set(team.event, sides);
  }
  for (const match of MATCH_CENTER_SPANISH_20270501_20270507_MATCHES) {
    const eventId = match.externalIds.espn;
    const event = verification.receivedEvents.find(item => item.id === eventId);
    const teams = teamsByEvent.get(eventId);
    assert.ok(event, `${eventId}: exists in the user's source output`);
    assert.equal(event.window, '20270501-20270507');
    assert.equal(event.date, '2027-05-02T18:00Z');
    assert.equal(event.status, 'STATUS_SCHEDULED');
    assert.equal(match.kickoffUtc, '2027-05-02T18:00:00Z');
    assert.equal(Date.parse(match.kickoffUtc), Date.parse(event.date));
    assert.equal(match.leagueId, 'esp.1');
    assert.equal(match.sourceEventName, event.name);
    assert.equal(match.venue, event.venue);
    assert.equal(match.verification, 'confirmed');
    assert.equal(match.round, null, 'round stays unset because none was supplied');
    assert.equal(match.home.logo, null);
    assert.equal(match.away.logo, null);
    assert.equal(match.externalIds.apifootball, null);
    assert.equal(matchByExternalId('espn', eventId), match);
    const [awayName, homeName] = event.name.split(' at ');
    assert.equal(match.home.sourceName, homeName);
    assert.equal(match.away.sourceName, awayName);
    assert.equal(match.home.externalIds.espn, teams.home.id);
    assert.equal(match.away.externalIds.espn, teams.away.id);
    assert.equal(match.home.sourceName, teams.home.name);
    assert.equal(match.away.sourceName, teams.away.name);
  }
});

test('the complete May 8–14 esp.1 output matches every event, venue, team id and kickoff before indexing', () => {
  const verification = MATCH_CENTER_SPANISH_20270508_20270514_VERIFICATION;
  const previousEmpty = MATCH_CENTER_SPANISH_20270424_20270430_VERIFICATION;
  const previousWeek = MATCH_CENTER_SPANISH_20270501_20270507_VERIFICATION;
  assert.equal(verification.receivedOn, '2026-10-17');
  assert.equal(verification.provider, 'espn');
  assert.equal(verification.leagueId, 'esp.1');
  assert.match(verification.method, /لم ينفّذ المساعد طلب API/);
  assert.deepEqual(verification.receivedRanges.map(({ dates, eventCount, complete }) => [dates, eventCount, complete]), [
    ['20270508-20270514', 10, true],
  ]);
  assert.deepEqual(verification.receivedRanges.map(({ scoreboardEndpoint }) => scoreboardEndpoint), [
    'https://streammasterstore.com/scoreboard.php?league=esp.1&dates=20270508-20270514',
  ]);
  assert.equal(verification.receivedEvents.length, 10);
  assert.equal(verification.receivedTeams.length, 20);
  assert.equal(MATCH_CENTER_SPANISH_20270508_20270514_MATCHES.length, 10);
  assert.equal(MATCH_CENTER_SPANISH_MATCHES.length, 300);
  assert.equal(MATCH_CENTER_ALL_MATCHES.length, 620);

  // Exact values copied from the user's output, in its source order:
  // [event, UTC date, event name, venue, home ID/name, away ID/name].
  const expected = [
    ['401882586', '2027-05-09T18:00Z', 'Levante at Alavés', 'Mendizorrotza', '96', 'Alavés', '1538', 'Levante'],
    ['401882585', '2027-05-09T18:00Z', 'Málaga at Athletic Club', 'San Mamés', '93', 'Athletic Club', '99', 'Málaga'],
    ['401882583', '2027-05-09T18:00Z', 'Elche at Getafe', 'Estadio Coliseum', '2922', 'Getafe', '3751', 'Elche'],
    ['401882582', '2027-05-09T18:00Z', 'Real Sociedad at Osasuna', 'El Sadar', '97', 'Osasuna', '89', 'Real Sociedad'],
    ['401882581', '2027-05-09T18:00Z', 'Sevilla at Racing Santander', 'El Sardineros', '87', 'Racing Santander', '243', 'Sevilla'],
    ['401882580', '2027-05-09T18:00Z', 'Deportivo at Rayo Vallecano', 'Estadio de Vallecas', '101', 'Rayo Vallecano', '90', 'Deportivo'],
    ['401882584', '2027-05-09T18:00Z', 'Espanyol at Real Betis', 'Estadio La Cartuja', '244', 'Real Betis', '88', 'Espanyol'],
    ['401882579', '2027-05-09T18:00Z', 'Barcelona at Real Madrid', 'Santiago Bernabéu', '86', 'Real Madrid', '83', 'Barcelona'],
    ['401882578', '2027-05-09T18:00Z', 'Atlético Madrid at Valencia', 'Mestalla Stadium', '94', 'Valencia', '1068', 'Atlético Madrid'],
    ['401882577', '2027-05-09T18:00Z', 'Celta Vigo at Villarreal', 'Estadio de la Cerámica', '102', 'Villarreal', '85', 'Celta Vigo'],
  ];
  assert.deepEqual(verification.receivedEvents.map(({ id, date, name, venue }) => [id, date, name, venue]),
    expected.map(row => row.slice(0, 4)));
  assert.deepEqual(verification.receivedEvents.map(event => [event.status, event.window]),
    expected.map(() => ['STATUS_SCHEDULED', '20270508-20270514']));
  assert.deepEqual(verification.receivedTeams.map(({ event, side, id, name }) => [event, side, id, name]),
    expected.flatMap(([event, , , , homeId, homeName, awayId, awayName]) => [
      [event, 'home', homeId, homeName],
      [event, 'away', awayId, awayName],
    ]));

  const expectedEventIds = expected.map(([id]) => id);
  assert.deepEqual(MATCH_CENTER_SPANISH_20270508_20270514_MATCHES.map(match => match.externalIds.espn), expectedEventIds);
  assert.equal(new Set(expectedEventIds).size, 10, 'the source event IDs are unique');
  assert.equal(new Set(MATCH_CENTER_ALL_MATCHES.map(match => match.externalIds.espn)).size, 620,
    'none of the new event IDs overlaps another fixture');
  assert.deepEqual(verification.receivedEvents.map(event => event.date), Array(10).fill('2027-05-09T18:00Z'));

  const previousNamesByTeamId = new Map(previousWeek.receivedTeams.map(team => [team.id, team.name]));
  assert.equal(previousNamesByTeamId.size, 20, 'the prior received week records all twenty source team identities');
  for (const team of verification.receivedTeams) {
    assert.equal(previousNamesByTeamId.get(team.id), team.name, `team ${team.id} keeps its source name across consecutive weeks`);
  }

  const toUtc = day => Date.parse(`${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6, 8)}T00:00:00Z`);
  const previousEnd = previousWeek.receivedRanges.at(-1).dates.split('-')[1];
  const currentStart = verification.receivedRanges[0].dates.split('-')[0];
  assert.equal(toUtc(currentStart) - toUtc(previousEnd), 86_400_000,
    'the new populated range follows the previous populated week without a gap');
  const emptyEnd = previousEmpty.receivedRanges.at(-1).dates.split('-')[1];
  assert.equal(toUtc(previousWeek.receivedRanges[0].dates.split('-')[0]) - toUtc(emptyEnd), 86_400_000,
    'the May 1–7 week follows the audit-only empty week without a gap');
  assert.deepEqual(previousEmpty.receivedEvents, []);
  assert.deepEqual(previousEmpty.receivedTeams, []);

  const teamsByEvent = new Map();
  for (const team of verification.receivedTeams) {
    const sides = teamsByEvent.get(team.event) ?? {};
    assert.equal(sides[team.side], undefined, `${team.event}: only one ${team.side} team record`);
    sides[team.side] = team;
    teamsByEvent.set(team.event, sides);
  }
  for (const [index, match] of MATCH_CENTER_SPANISH_20270508_20270514_MATCHES.entries()) {
    const [eventId, date, eventName, venue, homeId, homeName, awayId, awayName] = expected[index];
    const event = verification.receivedEvents[index];
    const teams = teamsByEvent.get(eventId);
    assert.equal(match.externalIds.espn, eventId);
    assert.equal(event.id, eventId);
    assert.equal(event.date, date);
    assert.equal(event.name, eventName);
    assert.equal(event.venue, venue);
    assert.equal(event.status, 'STATUS_SCHEDULED');
    assert.equal(match.kickoffUtc, '2027-05-09T18:00:00Z');
    assert.equal(Date.parse(match.kickoffUtc), Date.parse(event.date));
    assert.equal(match.leagueId, 'esp.1');
    assert.equal(match.sourceEventName, event.name);
    assert.equal(match.venue, event.venue);
    assert.equal(match.verification, 'confirmed');
    assert.equal(match.round, null, 'round stays unset because none was supplied');
    assert.equal(match.home.logo, null);
    assert.equal(match.away.logo, null);
    assert.equal(match.externalIds.apifootball, null);
    assert.equal(matchByExternalId('espn', eventId), match);
    assert.equal(match.home.externalIds.espn, homeId);
    assert.equal(match.home.sourceName, homeName);
    assert.equal(match.away.externalIds.espn, awayId);
    assert.equal(match.away.sourceName, awayName);
    const [sourceAwayName, sourceHomeName] = event.name.split(' at ');
    assert.equal(match.home.sourceName, sourceHomeName);
    assert.equal(match.away.sourceName, sourceAwayName);
    assert.equal(teams.home.id, homeId);
    assert.equal(teams.home.name, homeName);
    assert.equal(teams.away.id, awayId);
    assert.equal(teams.away.name, awayName);
  }
});

test('the complete May 15–21 esp.1 output matches every event, venue, team id and kickoff before indexing', () => {
  const verification = MATCH_CENTER_SPANISH_20270515_20270521_VERIFICATION;
  const previous = MATCH_CENTER_SPANISH_20270508_20270514_VERIFICATION;
  assert.equal(verification.receivedOn, '2026-10-17');
  assert.equal(verification.provider, 'espn');
  assert.equal(verification.leagueId, 'esp.1');
  assert.match(verification.method, /لم ينفّذ المساعد طلب API/);
  assert.deepEqual(verification.receivedRanges.map(({ dates, eventCount, complete }) => [dates, eventCount, complete]), [
    ['20270515-20270521', 10, true],
  ]);
  assert.deepEqual(verification.receivedRanges.map(({ scoreboardEndpoint }) => scoreboardEndpoint), [
    'https://streammasterstore.com/scoreboard.php?league=esp.1&dates=20270515-20270521',
  ]);
  assert.equal(verification.receivedEvents.length, 10);
  assert.equal(verification.receivedTeams.length, 20);
  assert.equal(MATCH_CENTER_SPANISH_20270515_20270521_MATCHES.length, 10);
  assert.equal(MATCH_CENTER_SPANISH_MATCHES.length, 300);
  assert.equal(MATCH_CENTER_ALL_MATCHES.length, 620);

  // Exact values copied from the user's output, in its source order:
  // [event, UTC date, event name, venue, home ID/name, away ID/name].
  const expected = [
    ['401882576', '2027-05-16T18:00Z', 'Rayo Vallecano at Atlético Madrid', 'Riyadh Air Metropolitano', '1068', 'Atlético Madrid', '101', 'Rayo Vallecano'],
    ['401882575', '2027-05-16T18:00Z', 'Alavés at Deportivo', 'Riazor', '90', 'Deportivo', '96', 'Alavés'],
    ['401882574', '2027-05-16T18:00Z', 'Athletic Club at Elche', 'Estadio Martínez Valero', '3751', 'Elche', '93', 'Athletic Club'],
    ['401882573', '2027-05-16T18:00Z', 'Valencia at Espanyol', 'RCDE Stadium', '88', 'Espanyol', '94', 'Valencia'],
    ['401882572', '2027-05-16T18:00Z', 'Getafe at Levante', 'Estadi Ciutat de València', '1538', 'Levante', '2922', 'Getafe'],
    ['401882571', '2027-05-16T18:00Z', 'Celta Vigo at Málaga', 'La Rosaleda', '99', 'Málaga', '85', 'Celta Vigo'],
    ['401882570', '2027-05-16T18:00Z', 'Real Betis at Osasuna', 'El Sadar', '97', 'Osasuna', '244', 'Real Betis'],
    ['401882569', '2027-05-16T18:00Z', 'Racing Santander at Real Madrid', 'Santiago Bernabéu', '86', 'Real Madrid', '87', 'Racing Santander'],
    ['401882568', '2027-05-16T18:00Z', 'Barcelona at Real Sociedad', 'Reale Arena', '89', 'Real Sociedad', '83', 'Barcelona'],
    ['401882567', '2027-05-16T18:00Z', 'Villarreal at Sevilla', 'Ramón Sánchez Pizjuán Stadium', '243', 'Sevilla', '102', 'Villarreal'],
  ];
  assert.deepEqual(verification.receivedEvents.map(({ id, date, name, venue }) => [id, date, name, venue]),
    expected.map(row => row.slice(0, 4)));
  assert.deepEqual(verification.receivedEvents.map(event => [event.status, event.window]),
    expected.map(() => ['STATUS_SCHEDULED', '20270515-20270521']));
  assert.deepEqual(verification.receivedTeams.map(({ event, side, id, name }) => [event, side, id, name]),
    expected.flatMap(([event, , , , homeId, homeName, awayId, awayName]) => [
      [event, 'home', homeId, homeName],
      [event, 'away', awayId, awayName],
    ]));

  const expectedEventIds = expected.map(([id]) => id);
  assert.deepEqual(MATCH_CENTER_SPANISH_20270515_20270521_MATCHES.map(match => match.externalIds.espn), expectedEventIds);
  assert.equal(new Set(expectedEventIds).size, 10, 'the source event IDs are unique');
  assert.equal(new Set(MATCH_CENTER_ALL_MATCHES.map(match => match.externalIds.espn)).size, 620,
    'none of the new event IDs overlaps another fixture');
  assert.deepEqual(verification.receivedEvents.map(event => event.date), Array(10).fill('2027-05-16T18:00Z'));

  const previousNamesByTeamId = new Map(previous.receivedTeams.map(team => [team.id, team.name]));
  assert.equal(previousNamesByTeamId.size, 20, 'the prior received week records all twenty source team identities');
  for (const team of verification.receivedTeams) {
    assert.equal(previousNamesByTeamId.get(team.id), team.name, `team ${team.id} keeps its source name across consecutive weeks`);
  }

  const toUtc = day => Date.parse(`${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6, 8)}T00:00:00Z`);
  const previousEnd = previous.receivedRanges.at(-1).dates.split('-')[1];
  const currentStart = verification.receivedRanges[0].dates.split('-')[0];
  assert.equal(toUtc(currentStart) - toUtc(previousEnd), 86_400_000,
    'the new populated range follows the previous weekly window without a gap');

  const teamsByEvent = new Map();
  for (const team of verification.receivedTeams) {
    const sides = teamsByEvent.get(team.event) ?? {};
    assert.equal(sides[team.side], undefined, `${team.event}: only one ${team.side} team record`);
    sides[team.side] = team;
    teamsByEvent.set(team.event, sides);
  }
  for (const [index, match] of MATCH_CENTER_SPANISH_20270515_20270521_MATCHES.entries()) {
    const [eventId, date, eventName, venue, homeId, homeName, awayId, awayName] = expected[index];
    const event = verification.receivedEvents[index];
    const teams = teamsByEvent.get(eventId);
    assert.equal(match.externalIds.espn, eventId);
    assert.equal(event.id, eventId);
    assert.equal(event.date, date);
    assert.equal(event.name, eventName);
    assert.equal(event.venue, venue);
    assert.equal(event.status, 'STATUS_SCHEDULED');
    assert.equal(match.kickoffUtc, '2027-05-16T18:00:00Z');
    assert.equal(Date.parse(match.kickoffUtc), Date.parse(event.date));
    assert.equal(match.leagueId, 'esp.1');
    assert.equal(match.sourceEventName, event.name);
    assert.equal(match.venue, event.venue);
    assert.equal(match.verification, 'confirmed');
    assert.equal(match.round, null, 'round stays unset because none was supplied');
    assert.equal(match.home.logo, null);
    assert.equal(match.away.logo, null);
    assert.equal(match.externalIds.apifootball, null);
    assert.equal(matchByExternalId('espn', eventId), match);
    assert.equal(match.home.externalIds.espn, homeId);
    assert.equal(match.home.sourceName, homeName);
    assert.equal(match.away.externalIds.espn, awayId);
    assert.equal(match.away.sourceName, awayName);
    const [sourceAwayName, sourceHomeName] = event.name.split(' at ');
    assert.equal(match.home.sourceName, sourceHomeName);
    assert.equal(match.away.sourceName, sourceAwayName);
    assert.equal(teams.home.id, homeId);
    assert.equal(teams.home.name, homeName);
    assert.equal(teams.away.id, awayId);
    assert.equal(teams.away.name, awayName);
  }
});

test('the complete May 22–28 esp.1 output matches every event, venue, team id and kickoff before indexing', () => {
  const verification = MATCH_CENTER_SPANISH_20270522_20270528_VERIFICATION;
  const previous = MATCH_CENTER_SPANISH_20270515_20270521_VERIFICATION;
  assert.equal(verification.receivedOn, '2026-10-17');
  assert.equal(verification.provider, 'espn');
  assert.equal(verification.leagueId, 'esp.1');
  assert.match(verification.method, /لم ينفّذ المساعد طلب API/);
  assert.deepEqual(verification.receivedRanges.map(({ dates, eventCount, complete }) => [dates, eventCount, complete]), [
    ['20270522-20270528', 10, true],
  ]);
  assert.deepEqual(verification.receivedRanges.map(({ scoreboardEndpoint }) => scoreboardEndpoint), [
    'https://streammasterstore.com/scoreboard.php?league=esp.1&dates=20270522-20270528',
  ]);
  assert.equal(verification.receivedEvents.length, 10);
  assert.equal(verification.receivedTeams.length, 20);
  assert.equal(MATCH_CENTER_SPANISH_20270522_20270528_MATCHES.length, 10);
  assert.equal(MATCH_CENTER_SPANISH_MATCHES.length, 300);
  assert.equal(MATCH_CENTER_ALL_MATCHES.length, 620);

  // Exact values copied from the user's output, in its source order:
  // [event, UTC date, event name, venue, home ID/name, away ID/name].
  const expected = [
    ['401882566', '2027-05-23T18:00Z', 'Real Madrid at Alavés', 'Mendizorrotza', '96', 'Alavés', '86', 'Real Madrid'],
    ['401882565', '2027-05-23T18:00Z', 'Athletic Club at Atlético Madrid', 'Riyadh Air Metropolitano', '1068', 'Atlético Madrid', '93', 'Athletic Club'],
    ['401882562', '2027-05-23T18:00Z', 'Málaga at Barcelona', 'Spotify Camp Nou', '83', 'Barcelona', '99', 'Málaga'],
    ['401882564', '2027-05-23T18:00Z', 'Real Sociedad at Celta Vigo', 'Balaidos', '85', 'Celta Vigo', '89', 'Real Sociedad'],
    ['401882563', '2027-05-23T18:00Z', 'Espanyol at Deportivo', 'Riazor', '90', 'Deportivo', '88', 'Espanyol'],
    ['401882561', '2027-05-23T18:00Z', 'Levante at Racing Santander', 'El Sardineros', '87', 'Racing Santander', '1538', 'Levante'],
    ['401882560', '2027-05-23T18:00Z', 'Real Betis at Rayo Vallecano', 'Estadio de Vallecas', '101', 'Rayo Vallecano', '244', 'Real Betis'],
    ['401882559', '2027-05-23T18:00Z', 'Getafe at Sevilla', 'Ramón Sánchez Pizjuán Stadium', '243', 'Sevilla', '2922', 'Getafe'],
    ['401882558', '2027-05-23T18:00Z', 'Elche at Valencia', 'Mestalla Stadium', '94', 'Valencia', '3751', 'Elche'],
    ['401882557', '2027-05-23T18:00Z', 'Osasuna at Villarreal', 'Estadio de la Cerámica', '102', 'Villarreal', '97', 'Osasuna'],
  ];
  assert.deepEqual(verification.receivedEvents.map(({ id, date, name, venue }) => [id, date, name, venue]),
    expected.map(row => row.slice(0, 4)));
  assert.deepEqual(verification.receivedEvents.map(event => [event.status, event.window]),
    expected.map(() => ['STATUS_SCHEDULED', '20270522-20270528']));
  assert.deepEqual(verification.receivedTeams.map(({ event, side, id, name }) => [event, side, id, name]),
    expected.flatMap(([event, , , , homeId, homeName, awayId, awayName]) => [
      [event, 'home', homeId, homeName],
      [event, 'away', awayId, awayName],
    ]));

  const expectedEventIds = expected.map(([id]) => id);
  assert.deepEqual(MATCH_CENTER_SPANISH_20270522_20270528_MATCHES.map(match => match.externalIds.espn), expectedEventIds);
  assert.equal(new Set(expectedEventIds).size, 10, 'the source event IDs are unique');
  assert.equal(new Set(MATCH_CENTER_ALL_MATCHES.map(match => match.externalIds.espn)).size, 620,
    'none of the new event IDs overlaps another fixture');
  assert.deepEqual(verification.receivedEvents.map(event => event.date), Array(10).fill('2027-05-23T18:00Z'));

  const previousNamesByTeamId = new Map(previous.receivedTeams.map(team => [team.id, team.name]));
  assert.equal(previousNamesByTeamId.size, 20, 'the prior received week records all twenty source team identities');
  for (const team of verification.receivedTeams) {
    assert.equal(previousNamesByTeamId.get(team.id), team.name, `team ${team.id} keeps its source name across consecutive weeks`);
  }

  const toUtc = day => Date.parse(`${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6, 8)}T00:00:00Z`);
  const previousEnd = previous.receivedRanges.at(-1).dates.split('-')[1];
  const currentStart = verification.receivedRanges[0].dates.split('-')[0];
  assert.equal(toUtc(currentStart) - toUtc(previousEnd), 86_400_000,
    'the new populated range follows the previous weekly window without a gap');

  const teamsByEvent = new Map();
  for (const team of verification.receivedTeams) {
    const sides = teamsByEvent.get(team.event) ?? {};
    assert.equal(sides[team.side], undefined, `${team.event}: only one ${team.side} team record`);
    sides[team.side] = team;
    teamsByEvent.set(team.event, sides);
  }
  for (const [index, match] of MATCH_CENTER_SPANISH_20270522_20270528_MATCHES.entries()) {
    const [eventId, date, eventName, venue, homeId, homeName, awayId, awayName] = expected[index];
    const event = verification.receivedEvents[index];
    const teams = teamsByEvent.get(eventId);
    assert.equal(match.externalIds.espn, eventId);
    assert.equal(event.id, eventId);
    assert.equal(event.date, date);
    assert.equal(event.name, eventName);
    assert.equal(event.venue, venue);
    assert.equal(event.status, 'STATUS_SCHEDULED');
    assert.equal(match.kickoffUtc, '2027-05-23T18:00:00Z');
    assert.equal(Date.parse(match.kickoffUtc), Date.parse(event.date));
    assert.equal(match.leagueId, 'esp.1');
    assert.equal(match.sourceEventName, event.name);
    assert.equal(match.venue, event.venue);
    assert.equal(match.verification, 'confirmed');
    assert.equal(match.round, null, 'round stays unset because none was supplied');
    assert.equal(match.home.logo, null);
    assert.equal(match.away.logo, null);
    assert.equal(match.externalIds.apifootball, null);
    assert.equal(matchByExternalId('espn', eventId), match);
    assert.equal(match.home.externalIds.espn, homeId);
    assert.equal(match.home.sourceName, homeName);
    assert.equal(match.away.externalIds.espn, awayId);
    assert.equal(match.away.sourceName, awayName);
    const [sourceAwayName, sourceHomeName] = event.name.split(' at ');
    assert.equal(match.home.sourceName, sourceHomeName);
    assert.equal(match.away.sourceName, sourceAwayName);
    assert.equal(teams.home.id, homeId);
    assert.equal(teams.home.name, homeName);
    assert.equal(teams.away.id, awayId);
    assert.equal(teams.away.name, awayName);
  }
});

test('the complete May 29–June 4 esp.1 output matches every event, venue, team id and kickoff before indexing', () => {
  const verification = MATCH_CENTER_SPANISH_20270529_20270604_VERIFICATION;
  const previous = MATCH_CENTER_SPANISH_20270522_20270528_VERIFICATION;
  assert.equal(verification.receivedOn, '2026-10-17');
  assert.equal(verification.provider, 'espn');
  assert.equal(verification.leagueId, 'esp.1');
  assert.match(verification.method, /لم ينفّذ المساعد طلب API/);
  assert.deepEqual(verification.receivedRanges.map(({ dates, eventCount, complete }) => [dates, eventCount, complete]), [
    ['20270529-20270604', 10, true],
  ]);
  assert.deepEqual(verification.receivedRanges.map(({ scoreboardEndpoint }) => scoreboardEndpoint), [
    'https://streammasterstore.com/scoreboard.php?league=esp.1&dates=20270529-20270604',
  ]);
  assert.equal(verification.receivedEvents.length, 10);
  assert.equal(verification.receivedTeams.length, 20);
  assert.equal(MATCH_CENTER_SPANISH_20270529_20270604_MATCHES.length, 10);
  assert.equal(MATCH_CENTER_SPANISH_MATCHES.length, 300);
  assert.equal(MATCH_CENTER_ALL_MATCHES.length, 620);

  // Exact values copied from the user's output, in its source order:
  // [event, UTC date, event name, venue, home ID/name, away ID/name].
  const expected = [
    ['401882556', '2027-05-30T18:00Z', 'Rayo Vallecano at Athletic Club', 'San Mamés', '93', 'Athletic Club', '101', 'Rayo Vallecano'],
    ['401882554', '2027-05-30T18:00Z', 'Racing Santander at Elche', 'Estadio Martínez Valero', '3751', 'Elche', '87', 'Racing Santander'],
    ['401882553', '2027-05-30T18:00Z', 'Alavés at Espanyol', 'RCDE Stadium', '88', 'Espanyol', '96', 'Alavés'],
    ['401882552', '2027-05-30T18:00Z', 'Barcelona at Getafe', 'Estadio Coliseum', '2922', 'Getafe', '83', 'Barcelona'],
    ['401882551', '2027-05-30T18:00Z', 'Celta Vigo at Levante', 'Estadi Ciutat de València', '1538', 'Levante', '85', 'Celta Vigo'],
    ['401882550', '2027-05-30T18:00Z', 'Sevilla at Málaga', 'La Rosaleda', '99', 'Málaga', '243', 'Sevilla'],
    ['401882549', '2027-05-30T18:00Z', 'Valencia at Osasuna', 'El Sadar', '97', 'Osasuna', '94', 'Valencia'],
    ['401882555', '2027-05-30T18:00Z', 'Atlético Madrid at Real Betis', 'Estadio La Cartuja', '244', 'Real Betis', '1068', 'Atlético Madrid'],
    ['401882548', '2027-05-30T18:00Z', 'Deportivo at Real Madrid', 'Santiago Bernabéu', '86', 'Real Madrid', '90', 'Deportivo'],
    ['401882547', '2027-05-30T18:00Z', 'Villarreal at Real Sociedad', 'Reale Arena', '89', 'Real Sociedad', '102', 'Villarreal'],
  ];
  assert.deepEqual(verification.receivedEvents.map(({ id, date, name, venue }) => [id, date, name, venue]),
    expected.map(row => row.slice(0, 4)));
  assert.deepEqual(verification.receivedEvents.map(event => [event.status, event.window]),
    expected.map(() => ['STATUS_SCHEDULED', '20270529-20270604']));
  assert.deepEqual(verification.receivedTeams.map(({ event, side, id, name }) => [event, side, id, name]),
    expected.flatMap(([event, , , , homeId, homeName, awayId, awayName]) => [
      [event, 'home', homeId, homeName],
      [event, 'away', awayId, awayName],
    ]));

  const expectedEventIds = expected.map(([id]) => id);
  assert.deepEqual(MATCH_CENTER_SPANISH_20270529_20270604_MATCHES.map(match => match.externalIds.espn), expectedEventIds);
  assert.equal(new Set(expectedEventIds).size, 10, 'the source event IDs are unique');
  assert.equal(new Set(MATCH_CENTER_ALL_MATCHES.map(match => match.externalIds.espn)).size, 620,
    'none of the new event IDs overlaps another fixture');
  assert.deepEqual(verification.receivedEvents.map(event => event.date), Array(10).fill('2027-05-30T18:00Z'));

  const previousNamesByTeamId = new Map(previous.receivedTeams.map(team => [team.id, team.name]));
  assert.equal(previousNamesByTeamId.size, 20, 'the prior received week records all twenty source team identities');
  for (const team of verification.receivedTeams) {
    assert.equal(previousNamesByTeamId.get(team.id), team.name, `team ${team.id} keeps its source name across consecutive weeks`);
  }

  const toUtc = day => Date.parse(`${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6, 8)}T00:00:00Z`);
  const previousEnd = previous.receivedRanges.at(-1).dates.split('-')[1];
  const currentStart = verification.receivedRanges[0].dates.split('-')[0];
  assert.equal(toUtc(currentStart) - toUtc(previousEnd), 86_400_000,
    'the new populated range follows the previous weekly window without a gap');

  const teamsByEvent = new Map();
  for (const team of verification.receivedTeams) {
    const sides = teamsByEvent.get(team.event) ?? {};
    assert.equal(sides[team.side], undefined, `${team.event}: only one ${team.side} team record`);
    sides[team.side] = team;
    teamsByEvent.set(team.event, sides);
  }
  for (const [index, match] of MATCH_CENTER_SPANISH_20270529_20270604_MATCHES.entries()) {
    const [eventId, date, eventName, venue, homeId, homeName, awayId, awayName] = expected[index];
    const event = verification.receivedEvents[index];
    const teams = teamsByEvent.get(eventId);
    assert.equal(match.externalIds.espn, eventId);
    assert.equal(event.id, eventId);
    assert.equal(event.date, date);
    assert.equal(event.name, eventName);
    assert.equal(event.venue, venue);
    assert.equal(event.status, 'STATUS_SCHEDULED');
    assert.equal(match.kickoffUtc, '2027-05-30T18:00:00Z');
    assert.equal(Date.parse(match.kickoffUtc), Date.parse(event.date));
    assert.equal(match.leagueId, 'esp.1');
    assert.equal(match.sourceEventName, event.name);
    assert.equal(match.venue, event.venue);
    assert.equal(match.verification, 'confirmed');
    assert.equal(match.round, null, 'round stays unset because none was supplied');
    assert.equal(match.home.logo, null);
    assert.equal(match.away.logo, null);
    assert.equal(match.externalIds.apifootball, null);
    assert.equal(matchByExternalId('espn', eventId), match);
    assert.equal(match.home.externalIds.espn, homeId);
    assert.equal(match.home.sourceName, homeName);
    assert.equal(match.away.externalIds.espn, awayId);
    assert.equal(match.away.sourceName, awayName);
    const [sourceAwayName, sourceHomeName] = event.name.split(' at ');
    assert.equal(match.home.sourceName, sourceHomeName);
    assert.equal(match.away.sourceName, sourceAwayName);
    assert.equal(teams.home.id, homeId);
    assert.equal(teams.home.name, homeName);
    assert.equal(teams.away.id, awayId);
    assert.equal(teams.away.name, awayName);
  }
});

test('every stored value traces to the received source payload, and nothing beyond it was filled in', () => {
  // Rule 2: the fixture id and team ids come from the source itself. Each match
  // must be found verbatim in the payload that was actually received.
  assert.equal(allMatchesVerified(), true);
  assert.equal(MATCH_CENTER_VERIFICATION.provider, 'espn');
  assert.match(MATCH_CENTER_VERIFICATION.endpoint, /eng\.1\/scoreboard\?dates=20261017/);
  assert.equal(MATCH_CENTER_VERIFICATION.receivedEvents.length, 5);

  for (const match of MATCH_CENTER_MATCHES) {
    assert.equal(match.verification, 'confirmed');
    assert.equal(match.leagueId, 'eng.1');
    assert.match(match.kickoffUtc, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/, `${match.slug}: stored as UTC`);

    const received = MATCH_CENTER_VERIFICATION.receivedEvents.find(event => event.id === match.externalIds.espn);
    assert.ok(received, `${match.slug}: id ${match.externalIds.espn} exists in the received payload`);
    assert.equal(received.inTrial, true, `${match.slug} is one of the trial fixtures`);
    // Same instant, even though ESPN sends "T14:00Z" and we store "T14:00:00Z".
    assert.equal(Date.parse(received.date), Date.parse(match.kickoffUtc), `${match.slug}: kickoff instant`);
    // Venue verbatim, including the ASCII apostrophe in St. James' Park.
    assert.equal(match.venue, received.venue, `${match.slug}: venue verbatim`);
    assert.equal(match.sourceEventName, received.name, `${match.slug}: event name verbatim`);
    // The documented derivation rule: "{away} at {home}".
    const [awayName, homeName] = received.name.split(' at ');
    assert.equal(match.home.sourceName, homeName, `${match.slug}: home sourceName from the source string`);
    assert.equal(match.away.sourceName, awayName, `${match.slug}: away sourceName from the source string`);
    // Looking the match up by its confirmed id resolves, and only to itself.
    assert.equal(matchByExternalId('espn', match.externalIds.espn), match);
    assert.equal(matchByFixtureId(MATCH_CENTER_MATCHES, 'espn', match.externalIds.espn), match);

    // What the source did NOT tell us stays empty -- no rounding out the record.
    assert.equal(match.externalIds.apifootball, null, `${match.slug}: no guessed API-Football id`);
    assert.equal(match.home.logo, null, 'no logo is downloaded or self-hosted');
    assert.equal(match.away.logo, null);
    assert.equal(match.round, null, 'matchday was not in the payload');
    // Team ids were absent from the first payload, then confirmed by the P0
    // payload (2026-10-16): each stored id must trace to `receivedTeams`.
    const homeReceived = MATCH_CENTER_VERIFICATION.receivedTeams.find(t => t.event === match.externalIds.espn && t.side === 'home');
    const awayReceived = MATCH_CENTER_VERIFICATION.receivedTeams.find(t => t.event === match.externalIds.espn && t.side === 'away');
    assert.equal(match.home.externalIds.espn, homeReceived?.id, `${match.slug}: home team id traces to P0`);
    assert.equal(match.away.externalIds.espn, awayReceived?.id, `${match.slug}: away team id traces to P0`);
    assert.equal(homeReceived?.name, match.home.sourceName, `${match.slug}: home team name in P0`);
    assert.equal(awayReceived?.name, match.away.sourceName, `${match.slug}: away team name in P0`);
  }

  // The two additional Oct 17 events keep their original event source rows.
  // Their team IDs were later confirmed by exact IDs/names in the user's Oct
  // 24–30 output, and the source name's documented "away at home" rule binds sides.
  const crossReferenceVerification = MATCH_CENTER_ENGLISH_20261017_CROSS_REFERENCE_VERIFICATION;
  assert.equal(crossReferenceVerification.provider, 'espn');
  assert.equal(crossReferenceVerification.leagueId, 'eng.1');
  assert.equal(crossReferenceVerification.sourceWindow, '20261024-20261030');
  assert.match(crossReferenceVerification.method, /معرّفات الفرق أُعيد ربطها بالاسم المطابق/);
  assert.equal(MATCH_CENTER_ENGLISH_20261017_CROSS_REFERENCED_EVENTS.length, 2);
  assert.equal(MATCH_CENTER_ENGLISH_20261017_CROSS_REFERENCED_MATCHES.length, 2);
  assert.deepEqual(crossReferenceVerification.events, MATCH_CENTER_ENGLISH_20261017_CROSS_REFERENCED_EVENTS);
  for (const source of MATCH_CENTER_ENGLISH_20261017_CROSS_REFERENCED_EVENTS) {
    const original = MATCH_CENTER_VERIFICATION.receivedEvents.find(event => event.id === source.id);
    assert.ok(original, `${source.id}: original 2026-10-17 event was received`);
    assert.equal(original.inTrial, false);
    assert.equal(source.date, original.date);
    assert.equal(source.name, original.name);
    assert.equal(source.venue, original.venue);
    const [awayName, homeName] = source.name.split(' at ');
    assert.equal(source.home.name, homeName);
    assert.equal(source.away.name, awayName);
    for (const side of ['home', 'away']) {
      const team = source[side];
      const witness = MATCH_CENTER_ENGLISH_20261024_20261030_VERIFICATION.receivedTeams.find(
        received => received.event === team.sourceEventId && received.name === team.name && received.id === team.id,
      );
      assert.ok(witness, `${source.id} ${side} team ${team.name}/${team.id} has a source-event witness`);
    }
    const fixture = MATCH_CENTER_ENGLISH_20261017_CROSS_REFERENCED_MATCHES.find(
      match => match.externalIds.espn === source.id,
    );
    assert.ok(fixture, `${source.id}: cross-referenced fixture exists`);
    assert.equal(matchByExternalId('espn', source.id), fixture);
    assert.equal(matchByFixtureId(MATCH_CENTER_MATCHES, 'espn', source.id), null,
      'the three original trial fixtures remain an unchanged subset');
    assert.equal(fixture.kickoffUtc, `${source.date.slice(0, -1)}:00Z`);
    assert.equal(fixture.sourceEventName, source.name);
    assert.equal(fixture.venue, source.venue);
    assert.equal(fixture.home.sourceName, source.home.name);
    assert.equal(fixture.home.externalIds.espn, source.home.id);
    assert.equal(fixture.away.sourceName, source.away.name);
    assert.equal(fixture.away.externalIds.espn, source.away.id);
  }

  // IDs that are not ours still resolve to nothing: no fallback to team name or
  // kickoff time (rule 3).
  for (const foreign of ['704123', '', null, undefined]) {
    assert.equal(matchByExternalId('espn', foreign), null, `id ${JSON.stringify(foreign)} is not indexed`);
  }
  const outside = MATCH_CENTER_VERIFICATION.receivedEvents.filter(event => !event.inTrial);
  assert.equal(outside.length, 2);
  assert.ok(outside.every(event => MATCH_CENTER_ENGLISH_20261017_CROSS_REFERENCED_EVENTS.some(
    source => source.id === event.id,
  )), 'both earlier non-trial events are now safely cross-referenced from source team IDs');
});

test('binding by league and kickoff time alone collides, which is why the fixture id is the only acceptable key', () => {
  // The brief assumed two simultaneous kickoffs; the source shows three at
  // 14:00Z in eng.1 that day, one of them outside the trial. A time-based key
  // would therefore be ambiguous three ways, not two.
  const events = MATCH_CENTER_VERIFICATION.receivedEvents;
  const at1400 = events.filter(event => Date.parse(event.date) === Date.parse('2026-10-17T14:00:00Z'));
  assert.equal(at1400.length, 3, 'Chelsea/Everton is at 11:30Z, so exactly three share 14:00Z');
  assert.deepEqual(at1400.map(event => event.id).sort(), ['401878770', '401879259', '401879262']);
  assert.ok(at1400.some(event => !event.inTrial), 'one of the three is not ours');

  // Every one of the five ids is distinct, so the id key is unambiguous.
  assert.equal(new Set(events.map(event => event.id)).size, events.length);
  // And each of our three resolves to exactly one match, never two.
  for (const match of MATCH_CENTER_MATCHES) {
    const hits = MATCH_CENTER_MATCHES.filter(other => String(other.externalIds.espn) === String(match.externalIds.espn));
    assert.equal(hits.length, 1, `${match.slug}: unique id`);
  }
  // Venue is also unique here, but it is a display field, not a key: the same
  // ground can host many fixtures, so binding on it would break later.
  const byVenue = venue => MATCH_CENTER_VERIFICATION.receivedEvents.filter(event => event.venue === venue);
  for (const match of MATCH_CENTER_MATCHES) assert.equal(byVenue(match.venue).length, 1, `${match.venue} on this day`);
});

test('the trial kickoffs render as briefed in Cairo and Mecca on the exact trial day', () => {
  const byId = id => MATCH_CENTER_MATCHES.find(match => match.id === id);
  assert.equal(kickoffLabel(byId('manchester-city-ipswich-town').kickoffUtc, 'Africa/Cairo'), '١٧:٠٠');
  assert.equal(kickoffLabel(byId('brentford-liverpool').kickoffUtc, 'Asia/Riyadh'), '١٧:٠٠');
  assert.equal(kickoffLabel(byId('newcastle-united-aston-villa').kickoffUtc, 'Africa/Cairo'), '١٩:٣٠');
  assert.equal(kickoffLabel(byId('newcastle-united-aston-villa').kickoffUtc, 'Asia/Riyadh'), '١٩:٣٠');
  assert.equal(formatInZone(byId('manchester-city-ipswich-town').kickoffUtc, 'Europe/London', { weekday: 'long' }), 'السبت');
});

test('a fixture is requestable only with a confirmed event ID and both source team IDs from the same provider', () => {
  const confirmed = MATCH_CENTER_MATCHES[0];
  assert.equal(isVerified(confirmed), true);

  const flaggedButEmpty = { ...confirmed, externalIds: { espn: null, apifootball: null } };
  assert.equal(isVerified(flaggedButEmpty), false, 'a confirmed flag and no event ID are insufficient');
  const blank = { ...confirmed, externalIds: { espn: '   ', apifootball: null } };
  assert.equal(isVerified(blank), false, 'whitespace is not an event ID');
  assert.equal(isVerified({ ...confirmed, home: { ...confirmed.home, externalIds: { espn: null } } }), false, 'a missing source home-team ID is not inferred from its name');
  assert.equal(isVerified({ ...confirmed, away: { ...confirmed.away, externalIds: { espn: ' ' } } }), false, 'a blank source away-team ID is not accepted');

  const pending = { ...confirmed, verification: 'pending' };
  assert.equal(isVerified(pending), false, 'IDs without source confirmation are not enough');
  assert.equal(isVerified(null), false);
  assert.equal(isVerified(undefined), false);
  assert.equal(isVerified({}), false);

  assert.ok(MATCH_CENTER_ALL_MATCHES.length >= 620, 'the full current registry and future additions are included');
  assert.equal(MATCH_CENTER_ALL_MATCHES.every(match => isVerified(match)), true, 'all current pages have source event + home/away IDs');
  assert.equal(allMatchesVerified(), true);

  // All identities are provider-scoped: an event from one provider cannot be
  // paired with team IDs from another provider.
  const numeric = {
    ...confirmed,
    externalIds: { espn: null, apifootball: 1215492 },
    home: { ...confirmed.home, externalIds: { espn: null, apifootball: 101 } },
    away: { ...confirmed.away, externalIds: { espn: null, apifootball: 202 } },
  };
  assert.equal(isVerified(numeric), true);
  assert.equal(matchByFixtureId([numeric], 'apifootball', 1215492), numeric);
  assert.equal(matchByFixtureId([numeric], 'apifootball', '1215492'), numeric, 'number and string resolve alike');
  assert.equal(matchByFixtureId([numeric], 'espn', 1215492), null, 'IDs do not cross providers');
});

/* ── The `summary?event=` probe (2026-10-16) ─────────────────────────
   These tests are the gate between "the source provides it" and "the site
   shows it". Most of the seventeen keys are excluded by the brief rather
   than by technology, and an exclusion that lives only in a comment will
   not survive the first rendering pass. */

test('every key the summary response actually carries has a recorded verdict, and no verdict is orphaned', () => {
  // Forward direction: a key that appears in the response can never be
  // rendered by default, because it has no verdict to justify it.
  for (const key of MATCH_CENTER_SUMMARY_PROBE.topLevelKeys) {
    assert.notEqual(summaryKeyVerdict(key), null, `${key} arrives in the response but has no verdict`);
  }
  // Reverse direction: a verdict for a key that does not exist is a stale
  // record, and a stale record is how a forbidden key gets re-admitted later.
  for (const entry of MATCH_CENTER_SUMMARY_PROBE.usage) {
    assert.ok(
      MATCH_CENTER_SUMMARY_PROBE.topLevelKeys.includes(entry.key),
      `${entry.key} has a verdict but was not in the probed response`,
    );
  }
  // An unprobed key resolves to null rather than to a permissive default.
  assert.equal(summaryKeyVerdict('lineups'), null);
  assert.equal(summaryKeyVerdict('oddsProvider'), null);
  assert.equal(summaryKeyVerdict(''), null);
});

test('the keys the brief forbids are recorded forbidden, whatever the source offers', () => {
  const forbidden = forbiddenSummaryKeys();
  // Rule 9: provider predictions and win probabilities are not statistics.
  for (const key of ['odds', 'hasOdds', 'pickcenter']) {
    assert.ok(forbidden.includes(key), `${key} must stay forbidden`);
    assert.equal(summaryKeyVerdict(key), 'forbidden');
  }
  // Rule 13: no ticket offers that do not exist; the site sells nothing.
  assert.equal(summaryKeyVerdict('ticketsInfo'), 'forbidden');
  // Rule 12: no copied articles.
  assert.equal(summaryKeyVerdict('news'), 'forbidden');
  // Rule 12: channel names live in the documentation section only, so
  // `broadcasts` is confined rather than forbidden — it is used, in one place.
  assert.equal(summaryKeyVerdict('broadcasts'), 'confined');
  // Rule 6: a squad list is not an announced lineup. Presenting `rosters` as
  // a formation would be guessing player names.
  assert.equal(summaryKeyVerdict('rosters'), 'confined');
  // Rule 11: standings exist here, but production already serves eng.1 from
  // one shared cached source; reading it per match would triple the calls.
  assert.equal(summaryKeyVerdict('standings'), 'available-not-used');
});

test('the four aggregate metrics stay unusable until their containing key and sample period are known', () => {
  const { observed } = MATCH_CENTER_SUMMARY_PROBE;
  // The probe output did not name the key that carries them, so it is null —
  // and rule 9 forbids drawing a radar without declaring the sample.
  assert.equal(observed.metricNamesContainingKey, null);
  // Probes P1/P3 resolved lastFiveGames as the Form source; leaders stays
  // unresolved and unused (its aggregates belong to an unknown sample).
  assert.equal(summaryKeyVerdict('lastFiveGames'), 'available');
  assert.equal(summaryKeyVerdict('leaders'), 'unresolved');

  // What *is* established: two sides, identical metric names, same order.
  assert.equal(observed.metricNamesBySide.length, 2);
  assert.deepEqual(observed.metricNamesBySide[0], observed.metricNamesBySide[1]);
  // Homogeneity across sides is necessary but not sufficient: same names from
  // two different periods would still be a forbidden comparison.
  assert.ok(observed.metricNamesBySide[0].length <= MAX_AXES, 'if it resolves, it fits the six-axis ceiling');
  assert.ok(observed.metricNamesBySide[0].length >= MIN_AXES, 'and it would clear the three-axis floor');
  // No metric name may be silently reused as an in-match statistic.
  for (const name of observed.metricNamesBySide[0]) {
    assert.match(name, /^(goalDifference|totalGoals|goalAssists|goalsConceded)$/);
  }
});

test('lineups, head-to-head and player ratings are confirmed absent, not merely unfetched', () => {
  const { observed, topLevelKeys } = MATCH_CENTER_SUMMARY_PROBE;
  // Lineups: the key is not in the response at all, and the probe returned [].
  assert.ok(!topLevelKeys.includes('lineups'));
  assert.deepEqual(observed.lineups, []);
  // Head-to-head: the `h2h` key itself was empty in the pre-match probe, but
  // probes P1/P3 confirmed `seasonseries` carries the record — verdict moved
  // to available with the probe record as its source, not by assumption.
  assert.deepEqual(observed.headToHead, []);
  assert.equal(summaryKeyVerdict('seasonseries'), 'available');
  // Ratings: ESPN has no such key at any nesting the probe reached. This is a
  // permanent limit, so it is asserted as absence rather than as pending.
  for (const key of ['ratings', 'playerRatings', 'playerStatistics', 'playerStats']) {
    assert.ok(!topLevelKeys.includes(key), `${key} would contradict the recorded limit`);
  }
  // And the odds that *do* arrive are present in the record, so the exclusion
  // is a decision rather than an oversight.
  assert.equal(observed.oddsCount, 2);
});

test('the boxscore cannot be judged from a pre-match probe', () => {
  // Empty before kickoff is the expected state, not evidence of absence, so
  // the verdict is `unresolved`; no live tab is exposed until an in-progress
  // source read provides renderable events/statistics (rule 7).
  assert.equal(MATCH_CENTER_SUMMARY_PROBE.matchStateAtProbe, 'pre-match');
  assert.equal(summaryKeyVerdict('boxscore'), 'available');
  assert.ok(
    MATCH_CENTER_SUMMARY_PROBE.unresolved.some(item => item.includes('boxscore')),
    'the follow-up probe must be recorded as outstanding',
  );
  // The probe subject is one of the three trial fixtures, bound by id.
  const subject = matchByExternalId('espn', MATCH_CENTER_SUMMARY_PROBE.subjectEventId);
  assert.equal(subject?.slug, MATCH_CENTER_SUMMARY_PROBE.subjectSlug);
});


test('the empty March 27–April 2 esp.1 window is recorded without inferring the season end', () => {
  const sample = MATCH_CENTER_SPANISH_20270327_20270402_VERIFICATION;
  const previous = MATCH_CENTER_SPANISH_20270320_20270326_VERIFICATION;
  const dates = '20270327-20270402';
  assert.equal(sample.receivedOn, '2026-10-17');
  assert.equal(sample.provider, 'espn');
  assert.equal(sample.leagueId, 'esp.1');
  assert.match(sample.method, /لم ينفّذ المساعد طلب API/);
  assert.match(sample.method, /لا تُستنتج نهاية الموسم/);
  assert.deepEqual(sample.receivedRanges.map(({ dates: range, eventCount }) => [range, eventCount]), [[dates, 0]]);
  assert.deepEqual(sample.receivedRanges.map(({ scoreboardEndpoint }) => scoreboardEndpoint), [
    `https://streammasterstore.com/scoreboard.php?league=esp.1&dates=${dates}`,
  ]);
  assert.deepEqual(sample.receivedEvents, []);
  assert.deepEqual(sample.receivedTeams, []);

  const toUtc = day => Date.parse(`${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6, 8)}T00:00:00Z`);
  const previousEnd = previous.receivedRanges.at(-1).dates.split('-')[1];
  const currentStart = sample.receivedRanges[0].dates.split('-')[0];
  assert.equal(toUtc(currentStart) - toUtc(previousEnd), 86_400_000,
    'the empty window follows the prior received week without a gap');
  const noFixtures = MATCH_CENTER_SPANISH_MATCHES.filter(match =>
    match.kickoffUtc >= '2027-03-27T00:00:00Z' && match.kickoffUtc < '2027-04-03T00:00:00Z');
  assert.deepEqual(noFixtures, [], 'an empty output creates no fixture or indexed page');
  assert.equal(MATCH_CENTER_SPANISH_MATCHES.length, 300);
  assert.equal(MATCH_CENTER_ALL_MATCHES.length, 620);
});


test('the empty April 24–30 esp.1 window is recorded without inferring the season end', () => {
  const sample = MATCH_CENTER_SPANISH_20270424_20270430_VERIFICATION;
  const previous = MATCH_CENTER_SPANISH_20270417_20270423_VERIFICATION;
  const dates = '20270424-20270430';
  assert.equal(sample.receivedOn, '2026-10-17');
  assert.equal(sample.provider, 'espn');
  assert.equal(sample.leagueId, 'esp.1');
  assert.match(sample.method, /events فارغة/);
  assert.match(sample.method, /لا تُستنتج نهاية الموسم/);
  assert.match(sample.method, /لم ينفّذ المساعد طلب API/);
  assert.deepEqual(sample.receivedRanges.map(({ dates: range, eventCount }) => [range, eventCount]), [[dates, 0]]);
  assert.deepEqual(sample.receivedRanges.map(({ scoreboardEndpoint }) => scoreboardEndpoint), [
    `https://streammasterstore.com/scoreboard.php?league=esp.1&dates=${dates}`,
  ]);
  assert.deepEqual(sample.receivedEvents, []);
  assert.deepEqual(sample.receivedTeams, []);

  const toUtc = day => Date.parse(`${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6, 8)}T00:00:00Z`);
  const previousEnd = previous.receivedRanges.at(-1).dates.split('-')[1];
  const currentStart = sample.receivedRanges[0].dates.split('-')[0];
  assert.equal(toUtc(currentStart) - toUtc(previousEnd), 86_400_000,
    'the empty window follows the previous twenty-match output without a gap');
  const noFixtures = MATCH_CENTER_SPANISH_MATCHES.filter(match =>
    match.kickoffUtc >= '2027-04-24T00:00:00Z' && match.kickoffUtc < '2027-05-01T00:00:00Z');
  assert.deepEqual(noFixtures, [], 'an empty output creates no fixture or indexed page');
  assert.equal(MATCH_CENTER_SPANISH_MATCHES.length, 300);
  assert.equal(MATCH_CENTER_ALL_MATCHES.length, 620);
});

test('the empty June 5–7 esp.1 window bridges the scheduled and already-recorded empty ranges without inferring the season end', () => {
  const sample = MATCH_CENTER_SPANISH_20270605_20270607_VERIFICATION;
  const previous = MATCH_CENTER_SPANISH_20270529_20270604_VERIFICATION;
  const next = MATCH_CENTER_SPANISH_20270608_20270802_VERIFICATION;
  const dates = '20270605-20270607';
  assert.equal(sample.receivedOn, '2026-10-17');
  assert.equal(sample.provider, 'espn');
  assert.equal(sample.leagueId, 'esp.1');
  assert.match(sample.method, /events فارغة/);
  assert.match(sample.method, /لم ينفّذ المساعد طلب API/);
  assert.match(sample.method, /لا تُستنتج نهاية الموسم/);
  assert.deepEqual(sample.receivedRanges.map(({ dates: range, eventCount }) => [range, eventCount]), [[dates, 0]]);
  assert.deepEqual(sample.receivedRanges.map(({ scoreboardEndpoint }) => scoreboardEndpoint), [
    `https://streammasterstore.com/scoreboard.php?league=esp.1&dates=${dates}`,
  ]);
  assert.deepEqual(sample.receivedEvents, []);
  assert.deepEqual(sample.receivedTeams, []);

  const toUtc = day => Date.parse(`${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6, 8)}T00:00:00Z`);
  const previousEnd = previous.receivedRanges.at(-1).dates.split('-')[1];
  const currentStart = sample.receivedRanges[0].dates.split('-')[0];
  const currentEnd = sample.receivedRanges.at(-1).dates.split('-')[1];
  const nextStart = next.receivedRanges[0].dates.split('-')[0];
  assert.equal(toUtc(currentStart) - toUtc(previousEnd), 86_400_000,
    'the empty range follows the final scheduled May window without a gap');
  assert.equal(toUtc(nextStart) - toUtc(currentEnd), 86_400_000,
    'the already-recorded empty June windows continue without a gap');

  const noFixtures = MATCH_CENTER_SPANISH_MATCHES.filter(match =>
    match.kickoffUtc >= '2027-06-05T00:00:00Z' && match.kickoffUtc < '2027-06-08T00:00:00Z');
  assert.deepEqual(noFixtures, [], 'an empty output creates no fixture or indexed page');
  assert.equal(MATCH_CENTER_SPANISH_MATCHES.length, 300);
  assert.equal(MATCH_CENTER_ALL_MATCHES.length, 620);
});


test('eight empty esp.1 weekly windows are recorded without inferring the season end', () => {
  const sample = MATCH_CENTER_SPANISH_20270608_20270802_VERIFICATION;
  const windows = [
    '20270608-20270614',
    '20270615-20270621',
    '20270622-20270628',
    '20270629-20270705',
    '20270706-20270712',
    '20270713-20270719',
    '20270720-20270726',
    '20270727-20270802',
  ];
  assert.equal(sample.receivedOn, '2026-10-16');
  assert.equal(sample.provider, 'espn');
  assert.equal(sample.leagueId, 'esp.1');
  assert.match(sample.method, /لم ينفّذ المساعد/);
  assert.deepEqual(sample.receivedRanges.map(({ dates, eventCount }) => [dates, eventCount]), windows.map(dates => [dates, 0]));
  assert.deepEqual(
    sample.receivedRanges.map(({ scoreboardEndpoint }) => scoreboardEndpoint),
    windows.map(dates => `https://streammasterstore.com/scoreboard.php?league=esp.1&dates=${dates}`),
  );
  assert.deepEqual(sample.receivedEvents, []);
  assert.deepEqual(sample.receivedTeams, []);

  const toUtc = day => Date.parse(`${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6, 8)}T00:00:00Z`);
  for (let i = 1; i < sample.receivedRanges.length; i += 1) {
    const previousEnd = sample.receivedRanges[i - 1].dates.split('-')[1];
    const currentStart = sample.receivedRanges[i].dates.split('-')[0];
    assert.equal(toUtc(currentStart) - toUtc(previousEnd), 86_400_000, 'the eight weekly queries are contiguous');
  }

  const noSourceEvents = MATCH_CENTER_MATCHES.filter(match =>
    match.leagueId === 'esp.1' && match.kickoffUtc >= '2027-06-08T00:00:00Z' && match.kickoffUtc < '2027-08-03T00:00:00Z');
  assert.deepEqual(noSourceEvents, [], 'do not create fixtures from eight empty responses');
});

test('the next eight empty esp.1 windows continue contiguously without inferring the season end', () => {
  const sample = MATCH_CENTER_SPANISH_20270803_20270927_VERIFICATION;
  const previous = MATCH_CENTER_SPANISH_20270608_20270802_VERIFICATION;
  const windows = [
    '20270803-20270809',
    '20270810-20270816',
    '20270817-20270823',
    '20270824-20270830',
    '20270831-20270906',
    '20270907-20270913',
    '20270914-20270920',
    '20270921-20270927',
  ];
  assert.equal(sample.receivedOn, '2026-10-16');
  assert.equal(sample.provider, 'espn');
  assert.equal(sample.leagueId, 'esp.1');
  assert.match(sample.method, /لم ينفّذ المساعد/);
  assert.deepEqual(sample.receivedRanges.map(({ dates, eventCount }) => [dates, eventCount]), windows.map(dates => [dates, 0]));
  assert.deepEqual(
    sample.receivedRanges.map(({ scoreboardEndpoint }) => scoreboardEndpoint),
    windows.map(dates => `https://streammasterstore.com/scoreboard.php?league=esp.1&dates=${dates}`),
  );
  assert.deepEqual(sample.receivedEvents, []);
  assert.deepEqual(sample.receivedTeams, []);

  const toUtc = day => Date.parse(`${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6, 8)}T00:00:00Z`);
  const previousEnd = previous.receivedRanges.at(-1).dates.split('-')[1];
  assert.equal(toUtc(windows[0].split('-')[0]) - toUtc(previousEnd), 86_400_000, 'continuous from the previous empty batch');
  for (let i = 1; i < sample.receivedRanges.length; i += 1) {
    const previousWindowEnd = sample.receivedRanges[i - 1].dates.split('-')[1];
    const currentStart = sample.receivedRanges[i].dates.split('-')[0];
    assert.equal(toUtc(currentStart) - toUtc(previousWindowEnd), 86_400_000, 'the weekly queries are contiguous');
  }

  const noSourceEvents = MATCH_CENTER_MATCHES.filter(match =>
    match.leagueId === 'esp.1' && match.kickoffUtc >= '2027-08-03T00:00:00Z' && match.kickoffUtc < '2027-09-28T00:00:00Z');
  assert.deepEqual(noSourceEvents, [], 'do not create fixtures from empty responses');
});

test('the third eight empty esp.1 windows continue contiguously without inferring the season end', () => {
  const sample = MATCH_CENTER_SPANISH_20270928_20271122_VERIFICATION;
  const previous = MATCH_CENTER_SPANISH_20270803_20270927_VERIFICATION;
  const windows = [
    '20270928-20271004',
    '20271005-20271011',
    '20271012-20271018',
    '20271019-20271025',
    '20271026-20271101',
    '20271102-20271108',
    '20271109-20271115',
    '20271116-20271122',
  ];
  assert.equal(sample.receivedOn, '2026-10-17');
  assert.equal(sample.provider, 'espn');
  assert.equal(sample.leagueId, 'esp.1');
  assert.match(sample.method, /لم ينفّذ المساعد/);
  assert.deepEqual(sample.receivedRanges.map(({ dates, eventCount }) => [dates, eventCount]), windows.map(dates => [dates, 0]));
  assert.deepEqual(
    sample.receivedRanges.map(({ scoreboardEndpoint }) => scoreboardEndpoint),
    windows.map(dates => `https://streammasterstore.com/scoreboard.php?league=esp.1&dates=${dates}`),
  );
  assert.deepEqual(sample.receivedEvents, []);
  assert.deepEqual(sample.receivedTeams, []);

  const toUtc = day => Date.parse(`${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6, 8)}T00:00:00Z`);
  const previousEnd = previous.receivedRanges.at(-1).dates.split('-')[1];
  assert.equal(toUtc(windows[0].split('-')[0]) - toUtc(previousEnd), 86_400_000, 'continuous from the previous empty batch');
  for (let i = 1; i < sample.receivedRanges.length; i += 1) {
    const previousWindowEnd = sample.receivedRanges[i - 1].dates.split('-')[1];
    const currentStart = sample.receivedRanges[i].dates.split('-')[0];
    assert.equal(toUtc(currentStart) - toUtc(previousWindowEnd), 86_400_000, 'the weekly queries are contiguous');
  }

  const noSourceEvents = MATCH_CENTER_MATCHES.filter(match =>
    match.leagueId === 'esp.1' && match.kickoffUtc >= '2027-09-28T00:00:00Z' && match.kickoffUtc < '2027-11-23T00:00:00Z');
  assert.deepEqual(noSourceEvents, [], 'do not create fixtures from empty responses');
});

test('the fourth eight empty esp.1 windows continue contiguously without inferring the season end', () => {
  const sample = MATCH_CENTER_SPANISH_20271123_20280117_VERIFICATION;
  const previous = MATCH_CENTER_SPANISH_20270928_20271122_VERIFICATION;
  const windows = [
    '20271123-20271129',
    '20271130-20271206',
    '20271207-20271213',
    '20271214-20271220',
    '20271221-20271227',
    '20271228-20280103',
    '20280104-20280110',
    '20280111-20280117',
  ];
  assert.equal(sample.receivedOn, '2026-10-17');
  assert.match(sample.scopeNote, /ينتهي خلال 2027/);
  assert.equal(sample.provider, 'espn');
  assert.equal(sample.leagueId, 'esp.1');
  assert.match(sample.method, /لم ينفّذ المساعد/);
  assert.deepEqual(sample.receivedRanges.map(({ dates, eventCount }) => [dates, eventCount]), windows.map(dates => [dates, 0]));
  assert.deepEqual(
    sample.receivedRanges.map(({ scoreboardEndpoint }) => scoreboardEndpoint),
    windows.map(dates => `https://streammasterstore.com/scoreboard.php?league=esp.1&dates=${dates}`),
  );
  assert.deepEqual(sample.receivedEvents, []);
  assert.deepEqual(sample.receivedTeams, []);

  const toUtc = day => Date.parse(`${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6, 8)}T00:00:00Z`);
  const previousEnd = previous.receivedRanges.at(-1).dates.split('-')[1];
  assert.equal(toUtc(windows[0].split('-')[0]) - toUtc(previousEnd), 86_400_000, 'continuous from the previous empty batch');
  for (let i = 1; i < sample.receivedRanges.length; i += 1) {
    const previousWindowEnd = sample.receivedRanges[i - 1].dates.split('-')[1];
    const currentStart = sample.receivedRanges[i].dates.split('-')[0];
    assert.equal(toUtc(currentStart) - toUtc(previousWindowEnd), 86_400_000, 'the weekly queries are contiguous');
  }

  const noSourceEvents = MATCH_CENTER_MATCHES.filter(match =>
    match.leagueId === 'esp.1' && match.kickoffUtc >= '2027-11-23T00:00:00Z' && match.kickoffUtc < '2028-01-18T00:00:00Z');
  assert.deepEqual(noSourceEvents, [], 'do not create fixtures from empty responses');
});

test('the fifth eight empty esp.1 windows remain contiguous audit-only data outside the 2027 season', () => {
  const sample = MATCH_CENTER_SPANISH_20280118_20280313_VERIFICATION;
  const previous = MATCH_CENTER_SPANISH_20271123_20280117_VERIFICATION;
  const windows = [
    '20280118-20280124',
    '20280125-20280131',
    '20280201-20280207',
    '20280208-20280214',
    '20280215-20280221',
    '20280222-20280228',
    '20280229-20280306',
    '20280307-20280313',
  ];
  assert.equal(sample.receivedOn, '2026-10-17');
  assert.equal(sample.outOfSeason, true);
  assert.match(sample.scopeNote, /خارج نطاق الموسم/);
  assert.equal(sample.provider, 'espn');
  assert.equal(sample.leagueId, 'esp.1');
  assert.match(sample.method, /لم ينفّذ المساعد/);
  assert.deepEqual(sample.receivedRanges.map(({ dates, eventCount }) => [dates, eventCount]), windows.map(dates => [dates, 0]));
  assert.deepEqual(
    sample.receivedRanges.map(({ scoreboardEndpoint }) => scoreboardEndpoint),
    windows.map(dates => `https://streammasterstore.com/scoreboard.php?league=esp.1&dates=${dates}`),
  );
  assert.deepEqual(sample.receivedEvents, []);
  assert.deepEqual(sample.receivedTeams, []);

  const toUtc = day => Date.parse(`${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6, 8)}T00:00:00Z`);
  const previousEnd = previous.receivedRanges.at(-1).dates.split('-')[1];
  assert.equal(toUtc(windows[0].split('-')[0]) - toUtc(previousEnd), 86_400_000, 'continuous from the previous empty batch');
  for (let i = 1; i < sample.receivedRanges.length; i += 1) {
    const previousWindowEnd = sample.receivedRanges[i - 1].dates.split('-')[1];
    const currentStart = sample.receivedRanges[i].dates.split('-')[0];
    assert.equal(toUtc(currentStart) - toUtc(previousWindowEnd), 86_400_000, 'the weekly queries are contiguous');
  }

  const noSourceEvents = MATCH_CENTER_MATCHES.filter(match =>
    match.leagueId === 'esp.1' && match.kickoffUtc >= '2028-01-18T00:00:00Z' && match.kickoffUtc < '2028-03-14T00:00:00Z');
  assert.deepEqual(noSourceEvents, [], 'do not create fixtures from empty responses');
});
