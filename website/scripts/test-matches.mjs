import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DIAGNOSTIC_LABELS,
  LEAGUES,
  hasCompleteScore,
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
test('a displayed home-away score must be complete while preserving a genuine zero', () => {
  assert.equal(hasCompleteScore(2, 1), true);
  assert.equal(hasCompleteScore(0, 0), true);
  assert.equal(hasCompleteScore(2, null), false);
  assert.equal(hasCompleteScore(undefined, 1), false);
  assert.equal(hasCompleteScore(1.5, 1), false);
});
test('parseScoreboard matches home and away by homeAway property regardless of competitor array order', () => {
  const reversedEvent = {
    id: 'test-reversed',
    date: '2026-10-17T15:00:00Z',
    competitions: [{
      competitors: [
        { homeAway: 'away', score: '3', team: { id: 'away-1', displayName: 'Away Team' } },
        { homeAway: 'home', score: '1', team: { id: 'home-1', displayName: 'Home Team' } },
      ],
      status: { type: { state: 'in', name: 'STATUS_IN_PROGRESS' }, displayClock: "55′" },
    }],
  };
  const parsed = parseScoreboard({ events: [reversedEvent] }, league);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].home.name, 'Home Team');
  assert.equal(parsed[0].home.score, 1);
  assert.equal(parsed[0].away.name, 'Away Team');
  assert.equal(parsed[0].away.score, 3);
});
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
  /* Regression: every diagnostic the match path can emit must have a real
     label, otherwise the page shows "خطأ غير محدد" instead of the cause. */
  for (const code of ['UPSTREAM_KEY_MISSING', 'UPSTREAM_TRUNCATED', 'SOURCE_STORE_UNAVAILABLE', 'UPSTREAM_NETWORK', 'UPSTREAM_UNAVAILABLE']) {
    assert.notEqual(describeDiagnostic(code), 'خطأ غير محدد أثناء جلب البيانات', `${code} needs an explicit label`);
  }
  assert.equal(describeDiagnostic('UPSTREAM_BRAND_NEW_CODE'), 'خطأ من مصدر البيانات أثناء جلب المباريات');
});
test('scoreboard.php whitelist, cache headers, and diagnostic codes match frontend contract', async () => {
  const phpPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../scoreboard.php');
  const source = (await Promise.all([phpPath, path.join(path.dirname(phpPath), 'php-lib/espn_source.php')].map(file => fs.readFile(file, 'utf8')))).join('\n');
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
test('every diagnostic code the match path can emit is translated by the frontend', async () => {
  const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const files = ['scoreboard.php', 'php-lib/source_store.php', 'php-lib/espn_source.php', 'php-lib/sportsdb_source.php', 'php-lib/event_summary.php'];
  const source = (await Promise.all(files.map(file => fs.readFile(path.join(dir, file), 'utf8')))).join('\n');
  /* Literal codes only: 'UPSTREAM_HTTP_' . $status is built at runtime and is
     covered by the UPSTREAM_HTTP_### pattern in describeDiagnostic(). */
  const codes = new Set(Array.from(source.matchAll(/'((?:UPSTREAM|SOURCE_STORE)_[A-Z_]+)'/g), m => m[1])
    .filter(code => !code.endsWith('_')));
  assert.ok(codes.size > 5, `expected several upstream codes, found ${codes.size}`);
  const untranslated = [...codes].filter(code => !(code in DIAGNOSTIC_LABELS));
  assert.deepEqual(untranslated, [], `missing frontend labels: ${untranslated.join(', ')}`);
});

/* ==========================================================================
   مسبار بوابة المباريات — حكمه هو ما يثبت أن المصدر يخدم معرّف البطولة،
   فيُحكَّم هنا على استجابات مصنوعة بنفس بنية المصدر. لا شبكة خارجية: خادم
   محلي فقط. يُحكم بـ parseScoreboard نفسه الذي تعرض به الصفحة الجدول.
   ========================================================================== */
const probe = await import('./probe-matches-leagues.mjs');

const probeEvent = (id, date, home = 'الأهلي', away = 'الترجي') => ({
  id,
  date,
  competitions: [{
    competitors: [
      { homeAway: 'home', score: '1', team: { displayName: home } },
      { homeAway: 'away', score: '0', team: { displayName: away } },
    ],
    status: { type: { completed: true, state: 'post' } },
  }],
});

const probeWindow = { from: '2026-10-20', to: '2026-10-22' };

test('المسبار: يقبل استجابة سليمة ويحلّلها بمنطق العرض نفسه', () => {
  const judged = probe.judgeMatchesProbe(
    {
      leagues: [{ slug: 'caf.champions', name: 'CAF Champions League' }],
      events: [probeEvent('1', '2026-10-25T18:00:00Z')],
    },
    'caf.champions',
  );
  assert.equal(judged.slug, 'caf.champions');
  assert.equal(judged.name, 'CAF Champions League');
  assert.equal(judged.events.length, 1);
  assert.equal(judged.events[0].home, 'الأهلي');
  assert.equal(judged.events[0].state, 'finished');
});

test('المسبار: يرفض بطولة تُعيد معرّفاً غير المطلوب، ويرفض بنية بلا أحداث', () => {
  /* أخطر حالة: المصدر يعيد 200 ببيانات بطولة أخرى، فيُعرض جدول مزيّف */
  assert.throws(
    () => probe.judgeMatchesProbe({ leagues: [{ slug: 'eng.1' }], events: [] }, 'caf.champions'),
    /SOURCE_ID_MISMATCH/,
  );
  assert.throws(
    () => probe.judgeMatchesProbe({ leagues: [{ slug: 'afc.champions' }] }, 'afc.champions'),
    /INVALID_SCOREBOARD/,
  );
  assert.throws(() => probe.judgeMatchesProbe(null, 'caf.champions'), /UPSTREAM_INVALID_JSON/);
});

/* القيد الموثّق للمصدر: ESPN يرفض نطاق التواريخ (HTTP 400
   «Failed to get events endpoint.») — مُثبت لبطلات قائمة أصلاً (eng.1)
   كما للبطولات القارية، فليس علامة على معرّف خاطئ. لذلك يسأل المسبار
   يوماً واحداً في كل طلب، تماماً كما يفعل scoreboard.php. يحرس هذا
   الاختبار ألا يعود المسبار إلى صيغة النطاق فيُبلغ فشلاً كاذباً. */
test('المسبار: يوم واحد في كل طلب — لا نطاق تواريخ يرفضه المصدر', () => {
  assert.deepEqual(probe.probeDays('2026-10-20', '2026-10-22'), ['2026-10-20', '2026-10-21', '2026-10-22']);
  const url = probe.probeUrl('caf.champions', '2026-10-25');
  assert.match(url, /\/apis\/site\/v2\/sports\/soccer\/caf\.champions\/scoreboard\?dates=20261025&limit=500$/);
  /* لا شرطة بين تاريخين: نطاق كهذا يُرجع 400 من المصدر لكل البطولات */
  assert.doesNotMatch(url, /dates=\d{8}-\d{8}/);
});

test('المسبار يعمل على خادم محلي: نجاح، ودمج الأيام، وردّ HTTP غير سليم', async () => {
  const http = await import('node:http');
  const served = new Set(['caf.champions', 'afc.champions']);
  const requested = [];
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1');
    const league = decodeURIComponent(url.pathname.split('/')[6] || '');
    const dates = url.searchParams.get('dates') || '';
    requested.push({ league, dates });
    if (!served.has(league)) {
      response.writeHead(404).end('{}');
      return;
    }
    response.writeHead(200, { 'Content-Type': 'application/json' });
    /* يوم 21 فيه مباراتان، ويوم 22 فيه مباراة واحدة مكرّرة مع يوم 21 */
    const events = dates === '20261021'
      ? [probeEvent('1', '2026-10-21T18:00:00Z'), probeEvent('2', '2026-10-21T20:00:00Z')]
      : dates === '20261022'
        ? [probeEvent('2', '2026-10-21T20:00:00Z'), probeEvent('3', '2026-10-22T18:00:00Z', 'الهلال', 'السد')]
        : [];
    response.end(JSON.stringify({ leagues: [{ slug: league }], events }));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const good = await probe.probeMatchesLeague('caf.champions', { ...probeWindow, base });
    assert.equal(good.daysRequested, 3, 'يوم واحد لكل طلب');
    assert.equal(good.daysWithEvents, 2);
    assert.equal(good.events, 3, 'الحدث المكرّر بين يومين يُحسب مرة واحدة');
    assert.equal(good.slug, 'caf.champions');
    /* كل طلب يحمل يوماً مفرداً — لا نطاق */
    assert.ok(requested.every((entry) => /^\d{8}$/.test(entry.dates)));
    assert.deepEqual(requested.map((entry) => entry.dates), ['20261020', '20261021', '20261022']);
    await assert.rejects(() => probe.probeMatchesLeague('caf.confed', { ...probeWindow, base }), /UPSTREAM_HTTP_404/);
    /* معرّف غير مسجّل في LEAGUES يُرفض قبل أي طلب */
    await assert.rejects(() => probe.probeMatchesLeague('made.up', { ...probeWindow, base }), /UNKNOWN_LEAGUE/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

/* البطولات القارية الثلاث في الجدول: معرّفاتها مسجّلة في المصدر الوحيد
   (LEAGUES) وتطابق وسيط الخادم — ويبقى إثبات خدمتها لدى ESPN بمسبار
   مستقل، فلا يُفترض أن التسجيل في القائمة يعني التغطية. */
test('البطولات القارية مُسجّلة في مصدر واحد ومطابقة لقائمة وسيط الخادم', async () => {
  const continental = [
    { id: 'caf.champions', name: 'دوري أبطال أفريقيا' },
    { id: 'caf.confed', name: 'كأس الكونفدرالية الأفريقية' },
    { id: 'afc.champions', name: 'دوري أبطال آسيا للنخبة' },
  ];
  for (const entry of continental) {
    const found = LEAGUES.find((league) => league.id === entry.id);
    assert.ok(found, `${entry.id} غير مسجّل في LEAGUES`);
    assert.equal(found.name, entry.name);
    /* كل معرّف مسجّل يملك رابط وسيط صالحاً — ولا معرّف مكرر */
    assert.equal(scoreboardUrl(entry.id, '2026-10-25'), `/scoreboard.php?league=${encodeURIComponent(entry.id)}&dates=20261024-20261026`);
    assert.equal(LEAGUES.filter((league) => league.id === entry.id).length, 1);
  }
  /* ترتيبها بين المسابقات القارية والمسابقات الدولية ثابت في العرض */
  const ids = LEAGUES.map((league) => league.id);
  assert.deepEqual(ids.slice(9, 13), ['caf.champions', 'caf.confed', 'afc.champions', 'fifa.worldq.caf']);
  assert.equal(new Set(ids).size, ids.length, 'لا معرّف مكرر في قائمة البطولات');
});
