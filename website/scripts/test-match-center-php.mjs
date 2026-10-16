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
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MATCH_CENTER_MATCHES } from '../src/content/match-center.mjs';

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
  assert.equal(bindings.size, MATCH_CENTER_MATCHES.length, 'every fixture must be bound in the server table');

  for (const fixture of MATCH_CENTER_MATCHES) {
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
  const slugs = new Set(MATCH_CENTER_MATCHES.map(fixture => fixture.slug));
  for (const slug of bindings.keys()) {
    assert.ok(slugs.has(slug), `${slug} is in the PHP table but is not a trial fixture`);
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
  // Rule 2: never promise what the integration does not cover. Report 12.5
  // established that statistics, lineups and h2h shapes are unverified, and
  // that ESPN has no player ratings at all.
  for (const field of ['statistics', 'lineups', 'ratings', 'seasonComparison', 'seasonSample']) {
    assert.match(source, new RegExp(`'${field}'\\s*=>\\s*null`), `${field} must be sent as null`);
  }
  assert.ok(source.includes('ESPN لا يوفّر تقييمات لاعبين إطلاقاً'), 'the permanent ratings limit is documented in the file');
  // Events default to an empty list, which the UI renders as «غير متاح».
  assert.match(source, /\$events = \[\];/);
  // And an event item lacking a minute or a type is dropped, not published.
  assert.match(source, /if \(\$minute === null \|\| \$text === null\) \{\s*continue;/);
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
  // request what cannot be there - before kickoff the probe found lineups and
  // h2h empty, so fetching summary then is pure waste.
  assert.match(source, /const MC_DETAIL_STATUS_NAMES = \[/);
  assert.match(source, /in_array\(\$stateName, MC_DETAIL_STATUS_NAMES, true\)/);
  assert.match(source, /in_array\(\$stateCode, \['in', 'post'\], true\)/);
  assert.match(source, /if \(\$isDetail\) \{/);
  assert.ok(!/time\(\)\s*-\s*\$kickoff/.test(source), 'no elapsed-time reasoning');
});

test('the scoreboard read is shared across the three matches, not per match', () => {
  // Rule 11: one shared server cache. Keying by league+day means one upstream
  // request serves all three fixtures; keying by match would triple it.
  assert.match(source, /\$scoreboardKey = 'sb_' \. \$binding\['league'\] \. '_' \. \$binding\['day'\]/);
  assert.match(source, /\$summaryKey\s*= 'sm_' \. \$binding\['event'\]/);
  assert.ok(!/'sb_' \. \$slug/.test(source), 'the scoreboard cache must not be keyed per match');
});

test('a stale copy is served with a diagnostic and never presented as fresh', () => {
  // Rule 11: do not write «محدث الآن» because of a retry or a stale cached copy.
  assert.match(source, /\$cacheHit = \$age <= MC_CACHE_TTL \? 'HIT' : 'STALE'/);
  assert.match(source, /\$diagnostic = \$result\['status'\] > 0 \? 'UPSTREAM_HTTP_' \. \$result\['status'\] : 'UPSTREAM_UNREACHABLE'/);
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

test('the file is self-contained and does not touch the existing endpoints', () => {
  // Rule 13: no changes to existing PHP. The check is on code, not on prose:
  // the file names scoreboard.php in comments precisely to say it does not
  // modify it, and a comment mention is not a dependency.
  const code = source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/.*$/gm, ' ')
    .replace(/^\s*#(?!\[).*/gm, ' ');
  assert.ok(!/\b(require|include)(_once)?\b/.test(code), 'no includes at all');
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
