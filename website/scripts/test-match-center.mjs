import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {
  MATCH_CODES,
  PHASES,
  POLL_INTERVALS,
  POST_MATCH_WINDOW_MS,
  STATUS_LABELS,
  TABS,
  buildComparison,
  countdownParts,
  defaultTab,
  deriveScore,
  detectScoreCorrection,
  eventKey,
  formatInZone,
  freshnessLabel,
  isStaleRead,
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
  resolveTab,
  shouldStopPolling,
} from '../src/lib/match-center.mjs';
import {
  MATCH_CENTER_COMPETITION,
  MATCH_CENTER_MATCHES,
  allMatchesVerified,
  matchByExternalId,
  matchBySlug,
  matchCenterRoutes,
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
  assert.equal(fresh.honest, true);

  const staleCache = freshnessLabel({ readAt: '2026-10-17T14:50:00Z', cache: 'STALE', now });
  assert.notEqual(staleCache.text, 'محدَّث الآن');
  assert.equal(staleCache.honest, false);
  assert.match(staleCache.text, /نسخة مخزّنة/);

  const failed = freshnessLabel({ readAt: '2026-10-17T15:00:00Z', cache: 'MISS', now, failed: true });
  assert.equal(failed.honest, false);
  assert.match(failed.text, /تعذر التحديث/);

  const missing = freshnessLabel({ readAt: null, now, failed: false });
  assert.equal(missing.honest, false);

  // A successful-but-old read is described by its real age, not as "now".
  const old = freshnessLabel({ readAt: '2026-10-17T14:55:00Z', cache: 'MISS', now });
  assert.notEqual(old.text, 'محدَّث الآن');
  assert.match(old.text, /قبل/);
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

const AXES = [
  { key: 'possession', label: 'الاستحواذ', unit: '%', home: 62, away: 38 },
  { key: 'shots', label: 'التسديدات', unit: 'تسديدة', home: 14, away: 7 },
  { key: 'passes', label: 'التمريرات', unit: 'تمريرة', home: 540, away: 310 },
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
    { key: 'possession', label: 'الاستحواذ', home: 60, away: 40, mode: 'match' },
    { key: 'shots_avg', label: 'متوسط التسديدات', home: 12, away: 9, mode: 'season' },
    { key: 'passes', label: 'التمريرات', home: 500, away: 400, mode: 'match' },
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
  const many = Array.from({ length: 7 }, (_, index) => ({ key: `k${index}`, label: `محور ${index}`, home: index + 1, away: index + 2 }));
  const result = buildComparison(many);
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'TOO_MANY_AXES');
  assert.match(result.message, /ستة محاور/);
  // Exactly six is allowed.
  assert.equal(buildComparison(many.slice(0, 6)).ok, true);
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

test('three independent stable routes sit under the existing league page, with no state or score in any segment', () => {
  // Rule 3: an independent, stable URL per match that survives the transition
  // from preview to live to the final report.
  const routes = matchCenterRoutes();
  assert.equal(routes.length, 3);
  assert.equal(new Set(routes).size, 3, 'unique');
  const stateWords = ['preview', 'live', 'report', 'halftime', 'finished', 'scheduled', 'postponed', 'lineups', 'history'];
  for (const route of routes) {
    assert.ok(route.startsWith(`/matches/${MATCH_CENTER_COMPETITION.slug}/`), `${route} is nested under the league page`);
    assert.ok(route.endsWith('/'), `${route} ends with a slash like every other route`);
    const segments = route.split('/').filter(Boolean);
    // Checked per segment on purpose: "live" appears inside "liverpool", and a
    // substring test would fail for a reason that has nothing to do with state.
    assert.ok(!segments.some(segment => stateWords.includes(segment)), `${route} carries no state segment`);
    assert.ok(!segments.some(segment => /^\d+-\d+$/.test(segment)), `${route} carries no score`);
    assert.ok(!/\d{4}-\d{2}-\d{2}/.test(route), `${route} carries no kickoff date`);
    assert.ok(!/[?#]/.test(route), `${route} has no query or fragment`);
  }
  // Route construction has a single source of truth.
  for (const match of MATCH_CENTER_MATCHES) {
    assert.equal(matchPath(match.competitionSlug, match.slug), `/matches/${match.competitionSlug}/${match.slug}/`);
    assert.equal(matchBySlug(match.slug), match);
  }
  assert.equal(matchBySlug('no-such-match'), null);
});

test('unverified fixtures stay honestly unverified: no guessed ids, no invented source names, no indexing', () => {
  // Rule 13 forbids incomplete event entities; the gate is `verification`.
  assert.equal(allMatchesVerified(), false);
  for (const match of MATCH_CENTER_MATCHES) {
    assert.equal(match.verification, 'pending');
    assert.equal(match.externalIds.espn, null, `${match.slug}: no guessed ESPN id`);
    assert.equal(match.externalIds.apifootball, null, `${match.slug}: no guessed API-Football id`);
    assert.equal(match.home.sourceName, null, `${match.slug}: source name not invented`);
    assert.equal(match.away.sourceName, null);
    assert.equal(match.home.logo, null, 'no logo is downloaded or self-hosted');
    assert.equal(match.away.logo, null);
    assert.equal(match.round, null, 'matchday comes from the source');
    assert.equal(match.leagueId, 'eng.1');
    assert.match(match.kickoffUtc, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/, `${match.slug}: stored as UTC`);
  }
  // Looking up by an id we do not have must return nothing, never fall back to
  // a team-name or kickoff-time guess (rule 3).
  assert.equal(matchByExternalId('espn', '704123'), null);
  assert.equal(matchByExternalId('espn', ''), null);
  assert.equal(matchByExternalId('espn', null), null);
  assert.equal(matchByFixtureId(MATCH_CENTER_MATCHES, 'espn', '704123'), null);
  assert.equal(matchByFixtureId(MATCH_CENTER_MATCHES, 'espn', ''), null);
});

test('the trial kickoffs render as briefed in Cairo and Mecca on the exact trial day', () => {
  const byId = id => MATCH_CENTER_MATCHES.find(match => match.id === id);
  assert.equal(kickoffLabel(byId('manchester-city-ipswich-town').kickoffUtc, 'Africa/Cairo'), '١٧:٠٠');
  assert.equal(kickoffLabel(byId('brentford-liverpool').kickoffUtc, 'Asia/Riyadh'), '١٧:٠٠');
  assert.equal(kickoffLabel(byId('newcastle-united-aston-villa').kickoffUtc, 'Africa/Cairo'), '١٩:٣٠');
  assert.equal(kickoffLabel(byId('newcastle-united-aston-villa').kickoffUtc, 'Asia/Riyadh'), '١٩:٣٠');
  assert.equal(formatInZone(byId('manchester-city-ipswich-town').kickoffUtc, 'Europe/London', { weekday: 'long' }), 'السبت');
});

test('once ids are confirmed the gate flips, and the lookup starts resolving by fixture id', () => {
  // Proves the pending state is a gate, not a dead end: the same definitions
  // with real ids become verifiable and addressable.
  const confirmed = MATCH_CENTER_MATCHES.map((match, index) => ({
    ...match,
    verification: 'confirmed',
    externalIds: { ...match.externalIds, espn: `70000${index}` },
  }));
  assert.equal(confirmed.every(match => match.verification === 'confirmed'), true);
  assert.equal(matchByFixtureId(confirmed, 'espn', '700001').slug, 'brentford-liverpool');
  // A confirmation without any id is not a confirmation.
  const empty = MATCH_CENTER_MATCHES.map(match => ({ ...match, verification: 'confirmed' }));
  const allConfirmed = matches => matches.every(match =>
    match.verification === 'confirmed'
    && Object.values(match.externalIds || {}).some(id => id !== null && String(id).trim() !== ''));
  assert.equal(allConfirmed(empty), false);
  assert.equal(allConfirmed(confirmed), true);
});
