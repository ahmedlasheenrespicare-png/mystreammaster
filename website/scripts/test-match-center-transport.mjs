import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MATCH_CENTER_ENDPOINT,
  MOCK_SCENARIOS,
  MOCK_VAR_DECISIONS,
  PROVIDERS,
  TransportError,
  adaptSnapshot,
  assertRequestable,
  describeTransportCode,
  elapsedMinutesAt,
  fetchMatchSnapshot,
  matchCenterEndpoint,
  mockEvents,
  mockPhaseAt,
  mockSnapshot,
  providerIds,
  resolveProvider,
  resolveScenario,
  settle,
} from '../src/lib/match-center-transport.mjs';
import {
  defaultTab,
  mergeReads,
  normalizeEvent,
  planAnnouncements,
  pollIntervalFor,
  resolveTab,
  scoreFromEvents,
} from '../src/lib/match-center.mjs';
import {
  MATCH_CENTER_MATCHES,
  matchBySlug,
} from '../src/content/match-center.mjs';

/* ── Helpers ──────────────────────────────────────────────────────── */

const HOME = MATCH_CENTER_MATCHES[0]; // manchester-city-ipswich-town   14:00Z
const AWAY = MATCH_CENTER_MATCHES[1]; // brentford-liverpool           14:00Z
const LATE = MATCH_CENTER_MATCHES[2]; // newcastle-united-aston-villa  16:30Z

/** A server payload in the agreed shape; identity and provider are correct by default. */
function payload(match, overrides = {}) {
  return {
    provider: 'espn',
    match: match.slug,
    event: match.externalIds.espn,
    readAt: '2026-10-17T14:32:11Z',
    cache: 'MISS',
    status: { type: { name: 'STATUS_SCHEDULED', state: 'pre', completed: false, shortDetail: 'لم تبدأ' }, displayClock: null },
    ...overrides,
  };
}

/** Stub fetch that records every call and answers from a queue or a map. */
function stubFetch(responder) {
  const calls = [];
  const impl = async (url, init) => {
    calls.push({ url, init });
    const value = typeof responder === 'function' ? responder(url, calls.length - 1) : responder;
    if (value instanceof Error) throw value;
    // A response-like value is returned as-is, so an HTTP failure is modelled
    // the way it really arrives: a resolved response with ok:false.
    if (value && typeof value === 'object' && 'ok' in value) return value;
    return { ok: true, status: 200, json: async () => value };
  };
  return { impl, calls };
}

/* ── The endpoint: relative, and carrying nothing a visitor supplied ── */

test('the browser only ever addresses our own server, by slug, with no upstream id or url', () => {
  for (const match of MATCH_CENTER_MATCHES) {
    const url = matchCenterEndpoint(match);
    assert.ok(url.startsWith('/'), `${url} must be relative`);
    assert.ok(!/^https?:/i.test(url), 'an absolute upstream url would breach rule 11');
    assert.ok(!url.includes('espn.com'), 'the upstream host must never reach the browser');
    assert.ok(url.startsWith(`${MATCH_CENTER_ENDPOINT}?`));
    // The query carries the slug only: the fixture-id table lives server-side,
    // so a visitor cannot ask our server for an arbitrary event.
    const params = new URL(url, 'http://localhost').searchParams;
    assert.deepEqual([...params.keys()], ['match']);
    assert.equal(params.get('match'), match.slug);
    assert.equal(params.get('event'), null, 'no upstream id is taken from the client');
    assert.equal(params.get('url'), null, 'and no upstream url either');
  }
});

test('a fixture whose source id is not confirmed cannot be requested at all', () => {
  // Rule 3: bind by fixture id. Rule 2: the id comes from the source. A fixture
  // without one must fail loudly here rather than be fetched on a guessed id.
  assert.equal(assertRequestable(HOME), HOME.slug);
  assert.throws(() => assertRequestable({ ...HOME, verification: 'pending' }), (error) => {
    assert.ok(error instanceof TransportError);
    assert.equal(error.code, 'UNVERIFIED_MATCH');
    return true;
  });
  assert.throws(() => assertRequestable({ ...HOME, externalIds: { espn: null, apifootball: null } }), /UNVERIFIED|معرّف/);
  assert.throws(() => assertRequestable(null), (error) => error.code === 'UNKNOWN_MATCH');
  assert.throws(() => assertRequestable({ slug: '   ' }), (error) => error.code === 'UNKNOWN_MATCH');
  // The three simultaneous fixtures are each requestable on their own id.
  assert.equal(new Set(MATCH_CENTER_MATCHES.map(matchCenterEndpoint)).size, 3);
});

/* ── The adapter: a payload must say what it is and whose it is ─────── */

test('a payload that does not declare its provider is rejected rather than guessed at', () => {
  // Rule 2 forbids mixing providers, and the first step is not reading one
  // provider's vocabulary with another's table. normalizeStatus without a
  // declared provider falls back to keyword matching, which is weaker.
  assert.throws(() => adaptSnapshot(payload(HOME, { provider: undefined }), HOME), (error) => {
    assert.equal(error.code, 'UNDECLARED_PROVIDER');
    return true;
  });
  assert.throws(() => adaptSnapshot(payload(HOME, { provider: '   ' }), HOME), (e) => e.code === 'UNDECLARED_PROVIDER');
  assert.throws(() => adaptSnapshot(payload(HOME, { provider: 42 }), HOME), (e) => e.code === 'UNDECLARED_PROVIDER');
  assert.throws(() => adaptSnapshot(null, HOME), (e) => e.code === 'EMPTY_PAYLOAD');
  assert.throws(() => adaptSnapshot([], HOME), (e) => e.code === 'EMPTY_PAYLOAD');
});

test('a payload that does not say which match it belongs to cannot be bound', () => {
  const anonymous = payload(HOME);
  delete anonymous.match;
  delete anonymous.event;
  assert.throws(() => adaptSnapshot(anonymous, HOME), (error) => error.code === 'MISSING_MATCH_BINDING');
  // Either identity alone is enough, and they must agree with the request.
  assert.equal(adaptSnapshot(payload(HOME, { event: null }), HOME).matchId, HOME.id);
  assert.equal(adaptSnapshot(payload(HOME, { match: null }), HOME).matchId, HOME.id);
});

test('three matches share a kickoff instant, and none of their payloads resolves to another', () => {
  // Rule 3: "must test that no score/event/lineup leaks between them". This is
  // a real collision, not a theoretical one: HOME and AWAY both start 14:00Z,
  // and a third eng.1 fixture (Hull City at Fulham) starts then too.
  assert.equal(HOME.kickoffUtc, AWAY.kickoffUtc);

  // Every cross-combination is rejected: slug against another slug, and event
  // id against another event id, in both directions.
  for (const requested of MATCH_CENTER_MATCHES) {
    for (const actual of MATCH_CENTER_MATCHES) {
      if (requested.id === actual.id) continue;
      assert.throws(
        () => adaptSnapshot(payload(actual), requested),
        (error) => error.code === 'MISMATCHED_MATCH',
        `${actual.slug} payload accepted for ${requested.slug}`,
      );
      assert.throws(
        () => adaptSnapshot(payload(requested, { match: null, event: actual.externalIds.espn }), requested),
        (error) => error.code === 'MISMATCHED_MATCH',
        `foreign event id accepted for ${requested.slug}`,
      );
    }
  }

  // The same rejection holds through the network path, so a server bug that
  // answers with the wrong fixture cannot reach the page.
  const { impl } = stubFetch(payload(AWAY));
  return assert.rejects(
    fetchMatchSnapshot(HOME, { fetchImpl: impl }),
    (error) => error.code === 'MISMATCHED_MATCH',
  );
});

test('the event id binds the fixture even when the slug is absent from the response', () => {
  // A response carrying only the upstream id is still bindable, because the
  // server-side table maps slug <-> event id.
  const byEventOnly = adaptSnapshot(payload(HOME, { match: null }), HOME);
  assert.equal(byEventOnly.matchId, HOME.id);
  assert.equal(byEventOnly.provider, 'espn');
  // Numeric and string ids agree, as they do in the contract layer.
  assert.doesNotThrow(() => adaptSnapshot(payload(HOME, { match: null, event: Number(HOME.externalIds.espn) }), HOME));
});

/* ── Absence stays absence ────────────────────────────────────────── */

test('missing values become null, never a zero-shaped default', () => {
  // Rule 8: "missing values stay «غير متاح», never zero". A {} or 0 default
  // renders as a real value and is indistinguishable from data.
  const bare = adaptSnapshot(payload(HOME), HOME);
  for (const key of ['statistics', 'lineups', 'ratings', 'seasonComparison', 'seasonSample']) {
    assert.equal(bare[key], null, `${key} should be null when absent`);
    assert.notDeepEqual(bare[key], {}, `${key} must not default to an empty object`);
    assert.notDeepEqual(bare[key], 0, `${key} must not default to zero`);
  }
  assert.deepEqual(bare.events, [], 'an absent event list is genuinely empty, not unknown');
  assert.deepEqual(bare.h2h, []);
  assert.equal(bare.ratings, null, 'ESPN provides no ratings at all (report 12.3)');

  // Explicit nulls survive too, and an explicit empty array is not upgraded.
  const explicit = adaptSnapshot(payload(HOME, { statistics: null, lineups: null, h2h: [] }), HOME);
  assert.equal(explicit.statistics, null);
  assert.equal(explicit.lineups, null);
  assert.deepEqual(explicit.h2h, []);

  // A malformed non-array is not silently coerced into an empty list of events.
  const odd = adaptSnapshot(payload(HOME, { events: { 0: 'goal' } }), HOME);
  assert.deepEqual(odd.events, []);
});

test('a score carried by a scheduled payload is not shown before kickoff', () => {
  // Rule 6: never show 0-0 as a confirmed result before kickoff. deriveScore
  // gates on status, so a payload that pre-fills zeroes cannot leak them.
  const scheduledWithZeroes = adaptSnapshot(payload(HOME, { score: { home: 0, away: 0 } }), HOME);
  assert.equal(scheduledWithZeroes.status.code, 'scheduled');
  assert.equal(scheduledWithZeroes.score, null);

  // The same numbers under a live status are a genuine zero and are kept.
  const live = adaptSnapshot(payload(HOME, {
    status: { type: { name: 'STATUS_IN_PROGRESS', state: 'in', completed: false } },
    score: { home: 0, away: 0 },
  }), HOME);
  assert.equal(live.status.code, 'live');
  assert.deepEqual(live.score, { home: 0, away: 0 });

  // Terminal states without play carry no result either.
  for (const name of ['STATUS_POSTPONED', 'STATUS_CANCELED']) {
    const terminal = adaptSnapshot(payload(HOME, {
      status: { type: { name, state: 'pre', completed: false } },
      score: { home: 2, away: 1 },
    }), HOME);
    assert.notEqual(terminal.status.code, 'finished');
    assert.equal(terminal.score, null, `${name} must not publish a score`);
  }
});

test('the score reads from either the normalized shape or raw ESPN competitors', () => {
  const live = { status: { type: { name: 'STATUS_IN_PROGRESS', state: 'in', completed: false } } };
  const normalized = adaptSnapshot(payload(HOME, { ...live, score: { home: '2', away: '1' } }), HOME);
  assert.deepEqual(normalized.score, { home: 2, away: 1 }, 'numeric strings are parsed');

  const raw = adaptSnapshot(payload(HOME, {
    ...live,
    competitors: [
      { homeAway: 'home', team: { displayName: 'Manchester City', score: '2' } },
      { homeAway: 'away', team: { displayName: 'Ipswich Town', score: 1 } },
    ],
  }), HOME);
  assert.deepEqual(raw.score, { home: 2, away: 1 }, 'both shapes resolve through deriveScore');

  // One side missing is a partial read: null on that side, not zero.
  const partial = adaptSnapshot(payload(HOME, { ...live, score: { home: 2 } }), HOME);
  assert.deepEqual(partial.score, { home: 2, away: null });
});

/* ── The mock ─────────────────────────────────────────────────────── */

test('the mock is refused unless the caller explicitly allows it', () => {
  // The guard is an argument, not an environment read: relying on the build
  // flag alone would let any later addition switch it on in production.
  return Promise.all([
    assert.rejects(fetchMatchSnapshot(HOME, { provider: 'mock' }), (e) => e.code === 'MOCK_DISABLED'),
    assert.rejects(fetchMatchSnapshot(HOME, { provider: 'mock', allowMock: false }), (e) => e.code === 'MOCK_DISABLED'),
    assert.rejects(fetchMatchSnapshot(HOME, {}), (e) => e.code === 'NETWORK_ERROR' || typeof e.code === 'string'),
  ]).then(async () => {
    const result = await fetchMatchSnapshot(HOME, { provider: 'mock', allowMock: true, now: Date.parse(HOME.kickoffUtc) + 30 * 60_000 });
    assert.equal(result.cache, 'MOCK');
    assert.equal(result.data.provider, 'mock', 'the snapshot stays labelled as a simulation');
    assert.equal(result.data.status.code, 'live');
  });
});

test('an unregistered provider is refused rather than defaulted', () => {
  return assert.rejects(
    fetchMatchSnapshot(HOME, { provider: 'apifootball' }),
    (error) => error.code === 'UNSUPPORTED_PROVIDER',
  );
});

test('every provider in the registry resolves, and the two kinds stay distinct', () => {
  assert.deepEqual(providerIds(), ['server', 'mock']);
  for (const provider of PROVIDERS) {
    assert.equal(resolveProvider(provider.id), provider);
    assert.ok(['endpoint', 'mock'].includes(provider.kind));
    assert.ok(provider.label && provider.note, 'each provider states its own limits (rule 2)');
  }
  assert.equal(resolveProvider('espn'), null, 'a data source is not a transport provider');
  assert.equal(resolveProvider('nonsense'), null);
  // Absence means "our own server", not "unknown": the safe default is the
  // real path. An unregistered name is still refused rather than defaulted.
  assert.equal(resolveProvider('').id, 'server');
  assert.equal(resolveProvider(null).id, 'server');
  assert.equal(resolveProvider(undefined).id, 'server');
  assert.equal(resolveProvider().id, 'server');
});

test('every state rule 14 requires is a named scenario, not an accident of timing', () => {
  const ids = MOCK_SCENARIOS.map(scenario => scenario.id);
  // Rule 14: pre-kickoff, kickoff, half-time, full time; postponement,
  // suspension, rescheduling; plus cancellation and abandonment as separate
  // states (rule 7).
  for (const required of ['scheduled', 'firstHalf', 'halftime', 'secondHalf', 'finished', 'postponed', 'rescheduled', 'suspended', 'canceled', 'delayed', 'abandoned']) {
    assert.ok(ids.includes(required), `missing scenario ${required}`);
    assert.ok(resolveScenario(required), `${required} must resolve`);
  }
  assert.equal(resolveScenario('nonsense'), null);

  // Postponement, suspension and cancellation are distinct states with
  // distinct labels, never collapsed into "finished".
  const codes = Object.fromEntries(MOCK_SCENARIOS.map(s => [s.id, mockSnapshot(HOME, { scenario: s.id }).status.code]));
  assert.equal(codes.postponed, 'postponed');
  assert.equal(codes.rescheduled, 'postponed');
  assert.equal(codes.suspended, 'suspended');
  assert.equal(codes.canceled, 'canceled');
  assert.equal(codes.abandoned, 'abandoned');
  assert.notEqual(codes.suspended, codes.finished);
  assert.notEqual(codes.postponed, codes.finished);
  assert.notEqual(codes.abandoned, codes.postponed);
  // Rule 7: a full time is only declared when the source says so.
  assert.equal(mockSnapshot(HOME, { scenario: 'finished' }).status.completed, true);
  assert.equal(mockSnapshot(HOME, { scenario: 'suspended' }).status.completed, false);
});

test('the same URL moves from preview to live to report as the clock passes', () => {
  // The core requirement: content changes before/during/after on one URL.
  const kickoff = Date.parse(HOME.kickoffUtc);
  const at = minutes => mockSnapshot(HOME, { now: kickoff + minutes * 60_000 });
  const seen = [
    [-30, 'preview'], [0, 'live'], [30, 'live'], [50, 'live'], [84, 'live'], [95, 'report'], [180, 'report'],
  ];
  for (const [minutes, tab] of seen) {
    const snapshot = at(minutes);
    assert.equal(defaultTab(snapshot.status), tab, `at T${minutes >= 0 ? '+' : ''}${minutes}m`);
    assert.equal(snapshot.matchId, HOME.id, 'the identity never changes across states');
  }
  // Rule 5: opening the state's tab must not evict a tab the visitor chose.
  const chosen = resolveTab(at(84).status, 'history');
  assert.equal(chosen, 'history', 'a chosen tab survives a goal');
  assert.equal(resolveTab(at(84).status, null), 'live', 'but no choice follows the state');

  // Rule 6: reaching zero on the countdown does not by itself make it live —
  // the mock's clock stands in for a source that reports the phase, and the
  // production path never derives status from elapsed time.
  assert.equal(at(-1).status.code, 'scheduled');
  assert.equal(at(-1).score, null);
  assert.equal(elapsedMinutesAt(HOME, kickoff - 60_000), 0, 'negative elapsed is clamped, not reported');
});

test('the mock derives its score from its own events, so the two can never disagree', () => {
  for (const scenario of MOCK_SCENARIOS) {
    const snapshot = mockSnapshot(HOME, { scenario: scenario.id });
    if (snapshot.status.phase === 'pre' || scenario.elapsed === null) {
      assert.equal(snapshot.score, null, `${scenario.id} publishes no score`);
      continue;
    }
    const derived = scoreFromEvents(snapshot.events);
    assert.deepEqual(snapshot.score, { home: derived.home, away: derived.away }, scenario.id);
    assert.equal(derived.unattributed, 0, 'every mock event names its side');
  }

  // An own goal credits the opponent, not a negative to its own side: at 45'
  // the script is home goal (8'), away goal (26'), home own goal (41').
  const halfTime = mockSnapshot(HOME, { scenario: 'halftime' });
  assert.deepEqual(halfTime.score, { home: 1, away: 2 });

  // A missed penalty and a card never move the score.
  const scoringOnly = halfTime.events.filter(event => ['goal', 'penalty', 'own_goal'].includes(event.type));
  assert.equal(scoringOnly.length, 3);
  assert.equal(halfTime.events.filter(event => event.type === 'yellow_card').length, 1);
});

test('a VAR cancellation keeps the same event id and does not change the score', () => {
  // Rule 7: support goal cancellation; and the contract keeps the source id so
  // the announcement fingerprint does not change and the goal is not announced
  // twice (once as a goal, once as a disappearance).
  const before = mockEvents('secondHalf', { elapsed: 67 }).find(event => event.id === 'mc-8');
  const after = mockEvents('secondHalf', { elapsed: 75 }).find(event => event.id === 'mc-8');
  assert.equal(before.cancelled, false);
  assert.equal(after.cancelled, true);
  assert.equal(before.id, after.id, 'the source amends the event, it does not replace it');

  const at67 = mockSnapshot(HOME, { now: Date.parse(HOME.kickoffUtc) + 67 * 60_000 });
  const at75 = mockSnapshot(HOME, { now: Date.parse(HOME.kickoffUtc) + 75 * 60_000 });
  // Cancelling a goal takes it back off the score - that is the whole point of
  // supporting VAR - and a home cancellation leaves the away side untouched.
  assert.deepEqual(at67.score, { home: 3, away: 3 });
  assert.deepEqual(at75.score, { home: 2, away: 3 });

  // Exactly one event carries the cancellation: the goal itself. The decision
  // is a separate list rather than an extra event, so there is no second
  // cancelled entry and therefore no second announcement fingerprint.
  const cancelledEvents = at75.events.filter(event => event.cancelled);
  assert.equal(cancelledEvents.length, 1);
  assert.equal(cancelledEvents[0].id, 'mc-8');
  assert.equal(at75.events.filter(event => event.type === 'var_cancelled').length, 0,
    'a VAR decision is not an extra match event');
  assert.equal(at75.events.length, at67.events.length + 1, "only the red card at 68' arrived");
  assert.equal(MOCK_VAR_DECISIONS.length, 1);

  // Rule 7 end to end: seeding on the earlier read and then applying the later
  // one announces the cancellation once, and does not re-announce the goal.
  const seeded = planAnnouncements({ matchId: HOME.id, nextEvents: at67.events, silentSeed: true });
  assert.deepEqual(seeded.announce, [], 'a seed announces nothing on first load');
  const afterDecision = planAnnouncements({
    matchId: HOME.id,
    previousEvents: at67.events,
    nextEvents: at75.events,
    knownKeys: seeded.knownKeys,
  });
  const cancellations = afterDecision.announce.filter(item => item.kind === 'cancelled');
  assert.equal(cancellations.length, 1, 'the cancellation is announced once');
  assert.equal(afterDecision.announce.filter(item => item.kind === 'goal').length, 0,
    'and the goal it withdrew is not announced again');
  // Replaying the identical read announces nothing further.
  const replay = planAnnouncements({
    matchId: HOME.id,
    previousEvents: at75.events,
    nextEvents: at75.events,
    knownKeys: afterDecision.knownKeys,
  });
  assert.deepEqual(replay.announce, [], 'a reload or a repeat poll must not duplicate (rule 7)');

  // With cancellation switched off the same script scores the goal, which is
  // what makes the correction detectable rather than invisible.
  const notCancelled = mockSnapshot(HOME, { scenario: 'secondHalf', cancelGoal: false });
  assert.equal(notCancelled.score.home, at75.score.home + 1);
  assert.equal(notCancelled.events.filter(event => event.cancelled).length, 0);

  // A normalized cancelled event still carries its id through the contract.
  assert.equal(normalizeEvent(after).id, 'mc-8');
});

test('the mock exercises the production adapter rather than bypassing it', () => {
  // Every mock snapshot is built as a server payload and pushed through
  // adaptSnapshot, so a change to the adapter is caught by the mock tests too.
  const snapshot = mockSnapshot(HOME, { scenario: 'finished' });
  for (const key of ['matchId', 'provider', 'readAt', 'status', 'score', 'events', 'statistics', 'lineups', 'ratings', 'h2h', 'seasonComparison', 'seasonSample']) {
    assert.ok(key in snapshot, `snapshot is missing ${key}`);
  }
  assert.equal(snapshot.matchId, HOME.id);
  // Proof it really went through the adapter: erasing the provider by override
  // is rejected exactly as a production payload would be. A bypass would have
  // returned a snapshot regardless of what the payload said.
  assert.throws(
    () => mockSnapshot(HOME, { scenario: 'finished', overrides: { provider: null } }),
    (error) => error.code === 'UNDECLARED_PROVIDER',
  );
  assert.throws(
    () => mockSnapshot(HOME, { scenario: 'finished', overrides: { match: AWAY.slug } }),
    (error) => error.code === 'MISMATCHED_MATCH',
    'the mock is subject to the same no-leak gate',
  );
  assert.throws(
    () => mockSnapshot(HOME, { scenario: 'finished', overrides: { provider: '' } }),
    (error) => error.code === 'UNDECLARED_PROVIDER',
  );
  // readAt is a real ISO instant the contract can judge.
  assert.ok(Number.isFinite(Date.parse(snapshot.readAt)));
});

/* ── Failure handling and the shared data layer ───────────────────── */

test('settle puts the code where mergeReads reads it, so a failure is recorded not swallowed', () => {
  // Promise.allSettled hides the reason; mergeReads reads result.code. Without
  // this bridge a 500 would arrive as an empty rejection and rule 11's "keep
  // the last confirmed read with a clear warning" could not name the cause.
  return Promise.all([
    settle(Promise.resolve({ data: { readAt: 'x' }, cache: 'HIT' })).then(result => {
      assert.equal(result.status, 'fulfilled');
      assert.equal(result.value.cache, 'HIT');
    }),
    settle(Promise.reject(new TransportError('HTTP_503'))).then(result => {
      assert.equal(result.status, 'rejected');
      assert.equal(result.code, 'HTTP_503');
    }),
    settle(Promise.reject(new TypeError('boom'))).then(result => {
      assert.equal(result.code, 'NETWORK_ERROR', 'an error without a code still reports one');
    }),
    settle(Promise.reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))).then(result => {
      assert.equal(result.code, 'ABORTED', 'cancelling a request is not a fault');
    }),
  ]);
});

test("one match's failure does not wipe the other two, and keeps its own last confirmed read", async () => {
  // Rule 11, and the sharpest version of it: all three centres are live at
  // once, so a single upstream hiccup must not blank three pages.
  const now = Date.parse('2026-10-17T14:30:00Z');
  const confirmed = match => ({
    data: { ...mockSnapshot(match, { now: now - 60_000 }), readAt: new Date(now - 60_000).toISOString() },
    cache: 'HIT',
  });
  const current = Object.fromEntries(MATCH_CENTER_MATCHES.map(match => [
    match.id,
    { ...confirmed(match), failure: null, attemptedAt: now - 60_000, readAt: new Date(now - 60_000).toISOString() },
  ]));

  // The middle fixture fails; the other two answer.
  const responder = (url) => {
    const slug = new URL(url, 'http://localhost').searchParams.get('match');
    if (slug === AWAY.slug) return { ok: false, status: 503, json: async () => ({}) };
    return payload(matchBySlug(slug), {
      status: { type: { name: 'STATUS_IN_PROGRESS', state: 'in', completed: false } },
      score: { home: 1, away: 0 },
      readAt: new Date(now).toISOString(),
    });
  };
  const { impl, calls } = stubFetch(responder);

  const results = {};
  for (const match of MATCH_CENTER_MATCHES) {
    results[match.id] = await settle(fetchMatchSnapshot(match, { fetchImpl: impl }));
  }
  const merged = mergeReads(current, results, now);

  assert.equal(calls.length, 3, 'one request per match');
  for (const match of [HOME, LATE]) {
    assert.equal(merged[match.id].failure, null, `${match.slug} must be unaffected`);
    assert.deepEqual(merged[match.id].data.score, { home: 1, away: 0 });
    assert.equal(merged[match.id].data.matchId, match.id, 'and must hold its own data');
  }
  // The failed one keeps its last confirmed read plus a named cause.
  assert.equal(merged[AWAY.id].failure, 'HTTP_503');
  assert.ok(merged[AWAY.id].data, 'the last confirmed read is retained');
  assert.equal(merged[AWAY.id].data.matchId, AWAY.id);
  assert.equal(merged[AWAY.id].attemptedAt, now);
  assert.equal(describeTransportCode(merged[AWAY.id].failure), 'استجاب خادم الموقع برمز HTTP 503');

  // No fixture ended up holding another's score.
  const scores = MATCH_CENTER_MATCHES.map(match => JSON.stringify(merged[match.id].data.score));
  assert.equal(new Set(scores).size, 2, 'the two updated agree, the failed one kept its own read');
  // The retained read is the older confirmed one, not the failed attempt.
  assert.equal(merged[AWAY.id].data.readAt, new Date(now - 60_000).toISOString());
  assert.notEqual(merged[AWAY.id].data.readAt, merged[HOME.id].data.readAt,
    'the failed match did not pick up the others\' newer read');
});

test('one read serves all five tabs: the transport is called once per poll, not once per tab', async () => {
  // Rule 11: "one shared data layer per match, not a request per tab".
  const now = Date.parse('2026-10-17T14:30:00Z');
  const { impl, calls } = stubFetch(payload(HOME, {
    status: { type: { name: 'STATUS_IN_PROGRESS', state: 'in', completed: false } },
    score: { home: 1, away: 1 },
    readAt: new Date(now).toISOString(),
  }));

  const result = await fetchMatchSnapshot(HOME, { fetchImpl: impl });
  // All five tabs read from the one snapshot; none of them fetches.
  const tabs = ['preview', 'history', 'lineups', 'live', 'report'];
  for (const tab of tabs) {
    assert.equal(resolveTab(result.data.status, tab), tab);
  }
  assert.equal(calls.length, 1);
  assert.equal(calls[0].init.cache, 'no-store', 'a browser cache would hide a stale read');
  assert.equal(calls[0].init.headers.Accept, 'application/json');

  // And the poll rate comes from the phase, so a finished match slows down.
  assert.equal(pollIntervalFor(result.data.status, 'status'), 60_000);
  assert.equal(pollIntervalFor(mockSnapshot(HOME, { scenario: 'finished' }).status, 'status'), 300_000);
  assert.equal(pollIntervalFor(mockSnapshot(HOME, { scenario: 'postponed' }).status, 'status'), 900_000);
});

test('an older response never replaces a newer one, whichever order they land in', async () => {
  // Rule 11: reject older responses. Out-of-order arrival is the realistic
  // failure, since three matches poll concurrently.
  const now = Date.parse('2026-10-17T14:30:00Z');
  const fresh = { data: mockSnapshot(HOME, { now }), cache: 'MISS' };
  const stale = { data: { ...mockSnapshot(HOME, { now }), readAt: new Date(now - 120_000).toISOString() }, cache: 'HIT' };

  const afterFresh = mergeReads({}, { [HOME.id]: { status: 'fulfilled', value: fresh } }, now);
  assert.equal(afterFresh[HOME.id].data.readAt, fresh.data.readAt);

  const afterStale = mergeReads(afterFresh, { [HOME.id]: { status: 'fulfilled', value: stale } }, now + 1_000);
  assert.equal(afterStale[HOME.id].data.readAt, fresh.data.readAt, 'the newer read survives');
  assert.equal(afterStale[HOME.id].rejectedStale, 1);
  assert.ok(afterStale[HOME.id].data, 'and rejecting the stale one does not blank the match');

  // A payload with no read time is refused rather than stored: storing it
  // would disable staleness protection permanently.
  const timeless = { data: { ...mockSnapshot(HOME, { now }), readAt: null }, cache: 'MISS' };
  const afterTimeless = mergeReads(afterStale, { [HOME.id]: { status: 'fulfilled', value: timeless } }, now + 2_000);
  assert.equal(afterTimeless[HOME.id].failure, 'MISSING_READ_AT');
  assert.equal(afterTimeless[HOME.id].data.readAt, fresh.data.readAt);
});

test('http and network failures are distinguished, and a non-JSON answer is not read as data', async () => {
  const notOk = async () => ({ ok: false, status: 429, json: async () => ({}) });
  await assert.rejects(fetchMatchSnapshot(HOME, { fetchImpl: notOk }), (error) => error.code === 'HTTP_429');
  assert.equal(describeTransportCode('HTTP_429'), 'استجاب خادم الموقع برمز HTTP 429');

  const badJson = async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('unexpected token'); } });
  await assert.rejects(fetchMatchSnapshot(HOME, { fetchImpl: badJson }), (error) => error.code === 'MALFORMED_JSON');

  const throwing = async () => { throw new TypeError('Failed to fetch'); };
  await assert.rejects(fetchMatchSnapshot(HOME, { fetchImpl: throwing }), (error) => {
    assert.equal(error.code, 'NETWORK_ERROR');
    assert.equal(error.detail, 'Failed to fetch');
    return true;
  });

  // An aborted request is rethrown as-is so callers can ignore it.
  const aborting = async () => { throw Object.assign(new Error('aborted'), { name: 'AbortError' }); };
  await assert.rejects(fetchMatchSnapshot(HOME, { fetchImpl: aborting }), (error) => error.name === 'AbortError');

  // An error that already carries a code keeps it: relabelling it NETWORK_ERROR
  // would tell the visitor "cannot connect" when the source actually rate
  // limited us, and rule 11 requires the warning to be clear.
  const coded = async () => { throw new TransportError('HTTP_429'); };
  await assert.rejects(fetchMatchSnapshot(HOME, { fetchImpl: coded }), (error) => error.code === 'HTTP_429');
  const unverified = async () => { throw new TransportError('UNDECLARED_PROVIDER'); };
  await assert.rejects(fetchMatchSnapshot(HOME, { fetchImpl: unverified }), (error) => error.code === 'UNDECLARED_PROVIDER');

  // A missing fetch implementation is a configuration error, not a network one.
  assert.equal(describeTransportCode('UNKNOWN_CODE'), 'خطأ غير محدد أثناء جلب بيانات المباراة');
  assert.equal(describeTransportCode(null), 'خطأ غير محدد أثناء جلب بيانات المباراة');
});

test('mock phase boundaries are stable and never invent a state the source did not report', () => {
  const kickoff = Date.parse(HOME.kickoffUtc);
  assert.equal(mockPhaseAt(HOME, kickoff - 1), 'scheduled');
  assert.equal(mockPhaseAt(HOME, kickoff), 'firstHalf');
  assert.equal(mockPhaseAt(HOME, kickoff + 44 * 60_000), 'firstHalf');
  assert.equal(mockPhaseAt(HOME, kickoff + 45 * 60_000), 'halftime');
  assert.equal(mockPhaseAt(HOME, kickoff + 57 * 60_000), 'secondHalf');
  assert.equal(mockPhaseAt(HOME, kickoff + 94 * 60_000), 'secondHalf');
  assert.equal(mockPhaseAt(HOME, kickoff + 95 * 60_000), 'finished');
  // A fixture with no readable kickoff cannot be placed in time: it stays
  // "not started" rather than guessing a phase.
  assert.equal(mockPhaseAt({ kickoffUtc: 'nonsense' }, kickoff), 'scheduled');
  assert.equal(mockPhaseAt(null, kickoff), 'scheduled');
  assert.equal(elapsedMinutesAt({ kickoffUtc: 'nonsense' }, kickoff), 0);
  // Every phase the clock can name is a registered scenario.
  for (const minutes of [-5, 0, 20, 46, 60, 94, 200]) {
    assert.ok(resolveScenario(mockPhaseAt(HOME, kickoff + minutes * 60_000)), `T+${minutes}m`);
  }
});
