/* ==========================================================================
   عقد `match-center.php` — وسيط مركز المباراة
   --------------------------------------------------------------------------
   على عرف `test-proxy-php.mjs` و`test-embed-php.mjs`: فحوص على **مصدر** الملف،
   لأن بيئة الاختبار لا تشغّل PHP. وهذا يعني صراحةً أن هذه الفحوص تثبت وجود
   الحدود في الكود، **ولا تثبت أن الملف يعمل** — فلا بديل عن تجربة فعلية على
   الخادم قبل الاعتماد عليه (مسجّل في التقرير §13.6).

   أهم فحص هنا عابر للغتين: جدول الربط في PHP يجب أن يطابق تعريفات المباريات
   في `content/match-center.mjs` حرفياً. لو تباعدا لجلبت الصفحة بيانات مباراة
   أخرى — وهو بالضبط ما يمنعه البند 3، وأخطر ما يمكن أن يحدث بصمت.
========================================================================== */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MATCH_CENTER_ALL_MATCHES, MATCH_CENTER_MATCHES } from '../src/content/match-center.mjs';

const website = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.dirname(website);
const PHP_PATH = path.join(root, 'match-center.php');
const source = await fs.readFile(PHP_PATH, 'utf8');

/** كل ما يحتاجه الفحص من جدول الربط في PHP. */
function phpBindings() {
  const pattern = /'([a-z0-9-]+)'\s*=>\s*\[\s*'event'\s*=>\s*'(\d+)'\s*,\s*'league'\s*=>\s*'([a-z0-9.]+)'\s*,\s*'day'\s*=>\s*'(\d{8})'\s*\]/g;
  const out = new Map();
  for (const match of source.matchAll(pattern)) {
    out.set(match[1], { event: match[2], league: match[3], day: match[4] });
  }
  return out;
}

test('the PHP binding table matches the JS fixtures exactly — slug, event id, league and day', () => {
  const bindings = phpBindings();
  // Content-only matches (e.g. UCL analysis pages) have no ESPN event ID and
  // therefore no PHP binding; only fixtures with a confirmed event ID are bound.
  const boundFixtures = MATCH_CENTER_ALL_MATCHES.filter(f => f.externalIds.espn != null);
  assert.equal(bindings.size, boundFixtures.length, 'every fixture with an event id must be bound in the server table');

  for (const fixture of boundFixtures) {
    const bound = bindings.get(fixture.slug);
    assert.ok(bound, `${fixture.slug} is missing from the PHP table`);
    // Rule 3: bound by fixture id, not by team name or kickoff.
    assert.equal(bound.event, String(fixture.externalIds.espn), `${fixture.slug}: event id drifted from the verified source`);
    assert.equal(bound.league, fixture.leagueId, `${fixture.slug}: league drifted`);
    // The cache day must be the kickoff day in UTC, or the shared scoreboard
    // read is fetched for the wrong date and the event is not found in it.
    assert.equal(bound.day, fixture.kickoffUtc.slice(0, 10).replaceAll('-', ''), `${fixture.slug}: cache day`);
  }

  // And nothing extra: an unbound slug in the table would be a page nobody
  // verified, served because the allowlist grew quietly.
  const slugs = new Set(MATCH_CENTER_ALL_MATCHES.map(fixture => fixture.slug));
  for (const slug of bindings.keys()) {
    assert.ok(slugs.has(slug), `${slug} is in the PHP table but has no verified fixture definition`);
  }
});

test('the two 14:00Z fixtures are bound to different event ids, so they cannot be confused', () => {
  // Three eng.1 fixtures start 14:00Z on 2026-10-17. If the table keyed on
  // kickoff time, two of them would collide; keyed on slug -> event id they
  // cannot.
  const bindings = phpBindings();
  const ids = [...bindings.values()].map(entry => entry.event);
  assert.equal(new Set(ids).size, ids.length, 'duplicate event id in the binding table');
  const at1400 = MATCH_CENTER_MATCHES.filter(fixture => fixture.kickoffUtc === '2026-10-17T14:00:00Z');
  assert.equal(at1400.length, 2, 'the trial has two fixtures at this instant');
  const theirIds = at1400.map(fixture => bindings.get(fixture.slug).event);
  assert.equal(new Set(theirIds).size, 2, 'both must resolve to distinct events');
  assert.equal(bindings.get('manchester-city-ipswich-town').event, '401879259');
  assert.equal(bindings.get('brentford-liverpool').event, '401879262');
  assert.equal(bindings.get('newcastle-united-aston-villa').event, '401879258');
});

test('the visitor supplies a slug and nothing else: no upstream id, url, league or key', () => {
  // Rule 11: the browser talks only to our server by relative URL, and we do
  // not accept arbitrary upstream URLs from the visitor. Every $_GET read in
  // the file must be the slug alone.
  const reads = [...source.matchAll(/\$_GET\[\s*'([^']+)'\s*\]/g)].map(match => match[1]);
  assert.deepEqual([...new Set(reads)], ['match'], `unexpected query parameters read: ${reads.join(', ')}`);
  assert.ok(!/\$_REQUEST|\$_POST|\$_COOKIE/.test(source), 'only GET is read');

  // The allowlist is closed and an unknown slug is refused before any fetch.
  assert.match(source, /!isset\(MC_MATCHES\[\$slug\]\)/);
  assert.match(source, /mc_fail\(404, 'UNKNOWN_MATCH'/);
  // The upstream URL is built from constants, never from input.
  assert.match(source, /MC_UPSTREAM_BASE\s*=\s*'https:\/\/site\.api\.espn\.com/);
  for (const builder of ['mc_upstream_scoreboard', 'mc_upstream_summary']) {
    const start = source.indexOf(`function ${builder}`);
    const body = source.slice(start, source.indexOf('}', source.indexOf('return', start)) + 1);
    assert.match(body, /rawurlencode/, `${builder} must encode what it interpolates`);
    assert.ok(!body.includes('$_GET'), `${builder} must not read request input`);
  }
});

test('outbound requests keep the SSRF and TLS limits the other endpoints use', () => {
  for (const needle of [
    'CURLOPT_FOLLOWLOCATION => false',
    'CURLOPT_PROTOCOLS      => CURLPROTO_HTTPS',
    'CURLOPT_SSL_VERIFYPEER => true',
    'CURLOPT_SSL_VERIFYHOST => 2',
    'CURLOPT_CONNECTTIMEOUT => MC_CONNECT_TIMEOUT',
    'CURLOPT_TIMEOUT        => MC_REQUEST_TIMEOUT',
  ]) {
    assert.ok(source.includes(needle), `match-center.php يجب أن يحتوي: ${needle}`);
  }
  // A missing curl extension must fail closed, not fall back to an
  // unrestricted fetch such as file_get_contents on a remote URL.
  assert.match(source, /if \(!function_exists\('curl_init'\)\)/);
  assert.ok(!/file_get_contents\(\s*\$url/.test(source), 'no unguarded remote read');
});

test('team logos leave the server https-only, matching the rule already in production', () => {
  // Same condition as lib/matches.mjs and safeLogoUrl in the contract, so the
  // project does not carry three different limits for one concern.
  assert.match(source, /function mc_logo\(mixed \$value\): \?string/);
  assert.match(source, /str_starts_with\(\$value, 'https:\/\/'\)/);
  // Every competitor's logo passes through it, so neither side can bypass the
  // check, and the payload takes the already-filtered value.
  assert.match(source, /'logo'\s*=> mc_logo\(\$team\['logo'\] \?\? null\)/);
  assert.match(source, /'home' => \$home\['team'\]\['logo'\] \?\? null/);
  assert.match(source, /'away' => \$away\['team'\]\['logo'\] \?\? null/);
});

test('unverified fields are declared absent rather than guessed', () => {
  // Ratings and season comparisons remain outside the verified integration.
  for (const field of ['ratings', 'seasonComparison', 'seasonSample']) {
    assert.match(source, new RegExp(`'${field}'\\s*=>\\s*null`), `${field} must be sent as null`);
  }
  assert.match(source, /'lineups'\s*=>\s*\$lineups/);
  assert.match(source, /sm_summary_lineups\(\$summaryRaw, \$binding\['event'\], \$binding\['league'\]/);
  // Events default to an empty list outside detail states; the UI suppresses
  // an empty tab. Statistics likewise stay null until the source returns values.
  assert.match(source, /if \(\$isDetail\) \{\s*\$events\s+= mc_read_events\(\$summaryRaw, \$header\['competitors'\]\);/);
  assert.match(source, /\$statistics\s+= mc_read_statistics\(\$summaryRaw, \$header\['competitors'\]\);/);
  // Default outside detail states stays empty/null — never a pre-match guess.
  // And an event item lacking a minute or a type is dropped, not published.
  assert.match(source, /if \(\$minute === null\) \{\s*continue;/);
});

test('every response declares its provider and the identity of the match it carries', () => {
  // The transport rejects a payload with no provider (its vocabulary cannot be
  // resolved) and one with no match identity (it cannot be bound). Both must be
  // present or the page shows a failure instead of data.
  assert.match(source, /'provider' => 'espn'/);
  assert.match(source, /'match'\s*=> \$slug/);
  assert.match(source, /'event'\s*=> \$binding\['event'\]/);
  // readAt comes from our server clock: it is the reference for rejecting
  // older responses, so it must always be present and ISO-8601 UTC.
  assert.match(source, /'readAt'\s*=> gmdate\('Y-m-d\\TH:i:s\\Z', \$now\)/);
});

test('binding picks the event by id alone, never by team name or kickoff time', () => {
  const start = source.indexOf('function mc_pick_event');
  const body = source.slice(start, start + 900);
  assert.match(body, /\$event\['id'\]/);
  assert.ok(!/displayName/.test(body), 'name matching would break on a source rename');
  assert.ok(!/\['date'\]/.test(body), 'time matching would collide: three eng.1 fixtures start 14:00Z');
});

test('the detail read is gated on the source state, not on elapsed time', () => {
  // Rule 6: the clock must not push a match into a state. Rule 11: do not
  // gate events/statistics on source state; the shared summary also supplies pre-match XI.
  assert.match(source, /const MC_DETAIL_STATUS_NAMES = \[/);
  assert.match(source, /in_array\(\$stateName, MC_DETAIL_STATUS_NAMES, true\)/);
  assert.match(source, /in_array\(\$stateCode, \['in', 'post'\], true\)/);
  assert.match(source, /if \(\$isDetail\) \{/);
  assert.ok(!/time\(\)\s*-\s*\$kickoff/.test(source), 'no elapsed-time reasoning');
});

test('the scoreboard read is shared by competition and day, not per match', () => {
  // Rule 11: one shared server cache. Keying by league+day reuses one upstream
  // response for every registered fixture on that slate; keying by match repeats it.
  assert.match(source, /sm_espn_days\(\$binding\['league'\], \[\$binding\['day'\]\]\)/);
  assert.match(source, /sm_summary_load\(\$binding\['league'\], \$binding\['event'\]/);
  assert.ok(!/'sb_' \. \$slug/.test(source), 'the scoreboard cache must not be keyed per match');
});

test('a stale copy is served with a diagnostic and never presented as fresh', () => {
  // Rule 11: do not write «محدث الآن» because of a retry or a stale cached copy.
  assert.match(source, /\$cacheHit = \$unit\['cache'\]/);
  assert.match(source, /if \(\$cacheHit !== 'STALE'\) \{/);
  assert.match(source, /mc_diagnostic\(\$unit\['stale_code'\]\)/);
  assert.ok(source.includes("return 'UPSTREAM_HTTP_429'"));
  assert.match(source, /header\('X-Match-Center-Cache: ' \. \$cacheState\)/);
  // A max-age of zero for anything not a HIT, so a browser cannot re-serve it.
  assert.match(source, /\$maxAge = \$cacheHit === 'HIT' \? max\(0, MC_CACHE_TTL - \$age\) : 0/);
  assert.match(source, /'Cache-Control: no-store, no-cache, must-revalidate'/);
});

test('the endpoint keeps the same rate limiting and header discipline as scoreboard.php', () => {
  for (const needle of [
    'X-Content-Type-Options: nosniff',
    'X-Robots-Tag: noindex, nofollow',
    "header('Retry-After: ' . MC_RATE_WINDOW)",
    "mc_fail(429, 'RATE_LIMITED'",
    'Access-Control-Expose-Headers: X-Match-Center-Cache, X-Cache-Age, X-Diagnostic-Code',
  ]) {
    assert.ok(source.includes(needle), `match-center.php يجب أن يحتوي: ${needle}`);
  }
  // The data endpoint is not an indexable page: the prerendered centres are.
  assert.match(source, /X-Robots-Tag: noindex/);
});

test('the endpoint uses shared source libraries without executing other HTTP controllers', () => {
  // Rule 13: no changes to existing PHP. The check is on code, not on prose:
  // the file names scoreboard.php in comments precisely to say it does not
  // modify it, and a comment mention is not a dependency.
  const code = source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/.*$/gm, ' ')
    .replace(/^\s*#(?!\[).*/gm, ' ');
  // The shared library moved to php-lib/ after lib/ turned out to be unwritable
  // over FTP; the loader is the only include path and takes fixed file names.
  assert.deepEqual([...code.matchAll(/sm_lib\('([^']+)'\)/g)].map(m => m[1]), ['espn_source.php', 'event_summary.php']);
  assert.match(code, /__DIR__\.'\/php-lib'/, 'the loader must read php-lib/');
  assert.ok(!/'\/lib'/.test(code), 'the loader must not keep the frozen lib/ fallback');
  assert.ok(!code.includes('scoreboard.php'), 'no code reference to scoreboard.php');
  assert.ok(!code.includes('standings.php'), 'no code reference to standings.php');
  assert.ok(!code.includes('proxy.php'), 'no code reference to proxy.php');
  // And it declares strict types like the rest of the backend.
  assert.ok(source.startsWith('<?php'), 'starts with the PHP tag');
  assert.match(source, /declare\(strict_types=1\);/);
  assert.ok(!source.includes('?>'), 'no closing tag, so no trailing whitespace can leak into the response');
});

test('no credential can reach the response', () => {
  // Rule 2: an API key stays server-side and is never printed into JS or HTML.
  // ESPN needs none, and if a keyed provider is added the key belongs here only.
  assert.ok(!/\$_GET\[\s*'key'|\$_GET\[\s*'token'|\$_GET\[\s*'api/.test(source));
  assert.ok(!/api[_-]?key\s*=\s*['"][A-Za-z0-9]{8,}/i.test(source), 'no literal key in the source');
  // The payload is an explicit field list, not the upstream body passed
  // through, so a field we never intended to expose cannot ride along.
  const payloadBlock = source.slice(source.indexOf('$payload = ['));
  assert.ok(payloadBlock.length > 0, 'the payload assignment must exist');
  for (const field of ['provider', 'match', 'event', 'readAt', 'status', 'score', 'logos', 'events']) {
    assert.match(payloadBlock, new RegExp(`'${field}'\\s*=>`), `the payload must state ${field} explicitly`);
  }
  assert.ok(!/'raw'\s*=>/.test(payloadBlock), 'the raw upstream body is not forwarded');
  assert.ok(!/'odds'|'pickcenter'|'ticketsInfo'|'news'/.test(payloadBlock),
    'fields forbidden by rules 9, 12 and 13 are not forwarded at all');
});

test('the form and head-to-head readers are wired to their confirmed summary keys', () => {
  // Phase 2 (owner approval 2026-10-16): lastFiveGames and seasonseries were
  // confirmed by probes P1/P3 before any reader was written for them
  // (MATCH_CENTER_FINISHED_PROBE / MATCH_CENTER_PREMATCH_PROBE).
  assert.match(source, /function mc_read_form\(array \$summary, array \$competitors\)/);
  assert.match(source, /function mc_read_h2h\(array \$summary\)/);
  assert.match(source, /\$summary\['lastFiveGames'\]/);
  assert.match(source, /\$summary\['seasonseries'\]/);
  // Summary is fetched even before kickoff now, but events are only parsed
  // for detail states: a pre-match response cannot leak events into «مباشر».
  assert.match(source, /\$events\s+= mc_read_events\(\$summaryRaw, \$header\['competitors'\]\);/);
  const payloadBlock = source.slice(source.indexOf('$payload = ['));
  assert.match(payloadBlock, /'form'\s*=>/);
  assert.match(payloadBlock, /'h2h'\s*=>/);
});

test('stage 2: statistics reader binds sides by team id and never derives shots off target', () => {
  // الشكل المؤكد بـ P1: boxscore.teams[{team.id,statistics[{name,value|displayValue}]}].
  assert.match(source, /function mc_read_statistics\(array \$summary, array \$competitors\): \?array/);
  assert.match(source, /const MC_STAT_LABELS = \[/);
  // الأسماء الـ28 المؤكدة في المسبار (espn-summary-probe.json → rawStatNames)، لا أكثر.
  const probe = JSON.parse(readFileSync(new URL('../docs/espn-summary-probe.json', import.meta.url), 'utf8'));
  const confirmed = [...new Set(probe.results.flatMap(result => result.rawStatNames ?? []))];
  assert.equal(confirmed.length, 28);
  const labelsBlock = source.slice(source.indexOf('const MC_STAT_LABELS = ['), source.indexOf('];', source.indexOf('const MC_STAT_LABELS = [')));
  for (const name of confirmed) {
    assert.match(labelsBlock, new RegExp(`'${name}'\\s*=>`), `stat label map must include ${name}`);
  }
  assert.equal((labelsBlock.match(/=>\s*\[/g) ?? []).length, 28, 'exactly the 28 confirmed names, nothing invented');
  // النسب الست وحدها بوحدة %؛ والعدّ والمحاولات بلا وحدة.
  for (const name of ['possessionPct', 'passPct', 'shotPct', 'crossPct', 'longballPct', 'tacklePct']) {
    assert.match(labelsBlock, new RegExp(`'${name}'\\s*=> \\['[^']+', '%'\\]`), `${name} is a percentage`);
  }
  assert.equal((labelsBlock.match(/'%'\]/g) ?? []).length, 6);
  // مقياس النسب يوحَّد (0–100): الكسر (0,1] يُحوَّل إلى نقاط مئوية، وما خرج عن [0,100] يصير null.
  assert.match(source, /function mc_pct\(mixed \$value\): int\|float\|null/);
  assert.match(source, /if \(\$number > 0 && \$number <= 1\) \{\s*\$number = round\(\$number \* 100, 1\);/);
  assert.match(source, /return \(\$number < 0 \|\| \$number > 100\) \? null : \$number;/);
  assert.match(source, /MC_STAT_LABELS\[\$name\]\[1\] === '%' \? mc_pct\(\$raw\) : mc_num\(\$raw\)/);
  // لا اشتقاق: «خارج المرمى» غير موجودة بالاسم في قائمة P1 ولا تُحسب بطرح.
  assert.doesNotMatch(source, /shotsOffTarget/);
  // الربط بهوية الفريق لا بترتيب المصفوفة، والصف يُحذف فقط إذا غاب عند
  // الجانبين معاً — الصفر الحقيقي المرسل يبقى صفراً.
  assert.match(source, /\$sideOfTeam\[\$id\] = \$competitor\['homeAway'\]/);
  assert.match(source, /if \(\$home === null && \$away === null\) \{\s*continue;/);
  assert.match(source, /function mc_num\(mixed \$value\): int\|float\|null/);
  // قبل البداية لا تُقرأ الإحصائيات (قيم P3 قبل البداية غير مُتحقق منها).
  assert.match(source, /if \(\$isDetail\) \{\s*\$events\s+= mc_read_events/);
  assert.match(source, /'statistics'\s+=> \$statistics,/);
});

test('source stoppages are excluded at the proxy, never rendered as English noise', () => {
  // `Start Delay` / `End Delay` are logged twice (one per team) and add
  // nothing the match clock does not already say.
  assert.match(source, /const MC_NOISE_EVENT_TYPES = \['start delay', 'end delay', 'delay', 'delay over'\]/);
  assert.match(source, /in_array\(strtolower\(\$text\), MC_NOISE_EVENT_TYPES, true\)/);
});

test('stage 2: mc_read_events implements the P1-confirmed keyEvents shape', () => {
  // أحداث الإطار (Kickoff/Halftime/…) ليست أحداث خط زمني — تُستبعد بالنص.
  assert.match(source, /const MC_FRAME_EVENT_TYPES = \['kickoff', 'halftime'/);
  assert.match(source, /in_array\(strtolower\(\$text\), MC_FRAME_EVENT_TYPES, true\)/);
  // الدقيقة والبدل الضائع من clock.displayValue، والتفصيل shortText فقط.
  assert.ok(source.includes("/(\\d+)(?:\\+(\\d+))?/"), 'minute parses from clock.displayValue');
  assert.match(source, /isset\(\$m\[2\]\) && \$m\[2\] !== '' \? \(int\) \$m\[2\] : null/);
  assert.match(source, /'detail'\s+=> mc_str\(\$item\['shortText'\] \?\? null\)/);
  assert.doesNotMatch(source, /\$item\['text'\] \?\? ''/);
  // المشاركون: [0] الفاعل دائماً؛ الثاني في قناة assist للتبديل وحده
  // (الخارج)، فلا يُدّعى للمشارك الثاني في الهدف دور «مساعدة» غير مؤكد.
  assert.match(source, /'player'\s+=> \$participants\[0\] \?\? \['id' => null, 'name' => null\]/);
  assert.match(source, /'assist'\s+=> \$isSubstitution \? \(\$participants\[1\] \?\? null\) : null/);
  // معرّف المصدر محفوظ (بصمة الإعلان لا تتغير عند تصحيح VAR).
  assert.match(source, /'id'\s+=> mc_str\(\$item\['id'\] \?\? null\) \?\? \('k' \. \$index\)/);
});
