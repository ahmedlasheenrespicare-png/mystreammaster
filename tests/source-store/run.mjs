import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { PHP } from '@php-wasm/universal';
import { loadNodeRuntime } from '@php-wasm/node';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const php = new PHP(await loadNodeRuntime('8.3', { emscriptenOptions: { processId: process.pid } }));
// An isolated VFS, no network or production data. GLOB_BRACE is the only compatibility
// substitution in production source; the real code keeps native PHP's GLOB_BRACE.
php.mkdir('/app/php-lib'); php.mkdir('/private');
for (const filename of ['scoreboard.php', 'match-center.php', 'standings.php', 'php-lib/source_store.php', 'php-lib/espn_source.php', 'php-lib/sportsdb_source.php', 'php-lib/event_summary.php']) {
  const code = await fs.readFile(path.join(root, filename), 'utf8');
  php.writeFile('/app/' + filename, code.replaceAll('GLOB_BRACE', '0'));
}
// Same real normalization inputs through both revisions, not a hand-written expected shape.
let baseline = execFileSync('git', ['show', 'c7eb4f3:standings.php'], { cwd: root, encoding: 'utf8' });
baseline = baseline.replace(/\b(sm_st_[a-z_]+)\b/g, 'before_$1').replace(/\bSM_ST_[A-Z_]+\b/g, 'BEFORE_$&');
php.writeFile('/app/before-standings.php', baseline);
const snapshot = JSON.parse(await fs.readFile(path.join(root, 'website/src/content/standings-snapshot.json'), 'utf8'));
const uids = { 'eng.1': 's:600~l:700', 'esp.1': 's:600~l:740', 'uefa.champions': 's:600~l:775', 'fra.1': 's:600~l:710', 'ger.1': 's:600~l:720', 'ita.1': 's:600~l:730', 'ksa.1': 's:600~l:21231' };
const fields = { played: 'gamesPlayed', wins: 'wins', draws: 'ties', losses: 'losses', goalsFor: 'pointsFor', goalsAgainst: 'pointsAgainst', goalDifference: 'pointDifferential', points: 'points' };
const fixtures = {};
for (const table of snapshot.tables) {
  if (table.provider === 'Highlightly') {
    fixtures[table.league] = { league: { id: 199067, season: 2026 }, groups: [{ name: 'Premier League', standings: table.entries.map(r => ({ position: r.rank, points: r.points, team: { id: +r.teamId, name: r.name }, total: { games: r.played, wins: r.wins, draws: r.draws, loses: r.losses, scoredGoals: r.goalsFor, receivedGoals: r.goalsAgainst } })) }] };
  } else fixtures[table.league] = { uid: uids[table.league], children: [{ name: table.league === 'uefa.champions' ? 'League Phase' : 'Domestic league', standings: { name: 'overall', season: table.season, entries: table.entries.map(r => ({ team: { id: r.teamId, displayName: r.name }, stats: [{ name: 'rank', value: r.rank }, ...Object.entries(fields).map(([k, name]) => ({ name, value: r[k] }))] })) } }] };
}
php.writeFile('/app/fixtures.json', JSON.stringify(fixtures));
// Namespace only for extension doubles: transport and cache logic are otherwise unchanged.
php.writeFile('/app/php-lib/espn-curl-double.php', (await fs.readFile(path.join(root, 'php-lib/espn_source.php'), 'utf8')).replace('declare(strict_types=1);', 'declare(strict_types=1); namespace SMCurlQA;'));
php.writeFile('/app/curl-double.php', await fs.readFile(new URL('./curl-double.php', import.meta.url), 'utf8'));
php.writeFile('/app/test.php', await fs.readFile(new URL('./test.php', import.meta.url), 'utf8'));
try {
  const result = await php.run({ scriptPath: '/app/test.php' });
  process.stdout.write(result.text);
  assert.ok(!result.errors.includes('qaOnlyNotARealCredential'), 'credential absent from logs');
  assert.ok(!result.text.includes('qaOnlyNotARealCredential'), 'credential absent from output');
  assert.equal(result.exitCode, 0, result.errors);
  assert.ok(result.text.includes('ALL SOURCE TESTS PASSED'));

  // Execute the actual HTTP controllers against shared records, not rewritten controllers.
  const epoch = Math.floor(Date.now() / 1000);
  const mc = await fs.readFile(path.join(root, 'match-center.php'), 'utf8');
  const binding = [...mc.matchAll(/'([a-z0-9-]+)'\s*=>\s*\[\s*'event'\s*=>\s*'(\d+)'\s*,\s*'league'\s*=>\s*'([a-z0-9.]+)'\s*,\s*'day'\s*=>\s*'(\d{8})'/g)][0];
  assert.ok(binding);
  const [, slug, id, league, day] = binding;
  const event = { id, date: `${day.slice(0,4)}-${day.slice(4,6)}-${day.slice(6,8)}T15:00:00Z`, competitions: [{
    status: { type: { state: 'pre', completed: false, name: 'STATUS_SCHEDULED' } },
    competitors: [{ homeAway: 'home', team: { id: '1', displayName: 'Home' }, score: null }, { homeAway: 'away', team: { id: '2', displayName: 'Away' }, score: null }],
  }] };
  event.competitions[0].date = event.date;
  const record = payload => ({ schema: 1, checked_at: epoch, fetched_at: epoch, ttl: 900, frozen: false, error: null, payload, stale_ttl: 600 });
  const dayFile = `/private/espn-days/${league}-${day}.json`;
  const summaryFile = `/private/espn-summaries/${league}-${id}.json`;
  const sourceDay = record({ events: [event] });
  const sourceSummary = record({ header: { id, competitions: event.competitions } });
  php.writeFile(dayFile, JSON.stringify(sourceDay));
  php.writeFile(summaryFile, JSON.stringify(sourceSummary));
  const request = (file, query) => php.run({ scriptPath: '/app/' + file, relativeUri: '/' + file + '?' + query, env: { SM_DATA_DIR: '/private' }, $_SERVER: { DOCUMENT_ROOT: '/app', REMOTE_ADDR: '192.0.2.1' } });
  const boardQuery = `league=${league}&dates=${day}`;
  const miss = await request('scoreboard.php', boardQuery);
  assert.equal(miss.headers['x-matches-cache'][0], 'MISS', miss.text);
  assert.equal(miss.headers['access-control-allow-origin'][0], 'https://streammasterstore.com');
  assert.equal(miss.headers['x-content-type-options'][0], 'nosniff');
  const hit = await request('scoreboard.php', boardQuery);
  assert.equal(hit.headers['x-matches-cache'][0], 'HIT');
  assert.deepEqual(JSON.parse(hit.text), { events: [event] });
  const center = await request('match-center.php', 'match=' + slug);
  assert.equal(JSON.parse(center.text).event, id, center.text);
  assert.equal(JSON.parse(center.text).score.home, null);
  const centerHit = await request('match-center.php', 'match=' + slug);
  assert.equal(centerHit.headers['x-match-center-cache'][0], 'HIT');
  assert.equal(php.readFileAsText(dayFile), JSON.stringify(sourceDay), 'both endpoints reuse the very same day record without fetching');
  console.log('ok HTTP - scoreboard MISS/HIT, unchanged events; match-center reuses the exact source file');

  const responseFile = '/private/scoreboard-responses/' + crypto.createHash('sha256').update(`v6|${league}|${day}`).digest('hex') + '.json';
  php.unlink(responseFile);
  php.unlink(`/private/match-center-responses/response_${slug}.json`);
  const stale = { ...sourceDay, checked_at: epoch, fetched_at: epoch - 100, ttl: 60, error: 'UPSTREAM_TIMEOUT' };
  php.writeFile(dayFile, JSON.stringify(stale));
  const staleResponse = await request('scoreboard.php', boardQuery);
  assert.equal(staleResponse.headers['x-matches-cache'][0], 'STALE', staleResponse.text);
  assert.equal(staleResponse.headers['x-diagnostic-code'][0], 'UPSTREAM_TIMEOUT');
  assert.equal(php.fileExists(responseFile), false, 'STALE is never written to the response cache');
  const centerStale = await request('match-center.php', 'match=' + slug);
  assert.equal(JSON.parse(centerStale.text).cache, 'STALE', centerStale.text);
  assert.equal(centerStale.headers['x-diagnostic-code'][0], 'UPSTREAM_TIMEOUT');
  assert.equal(php.fileExists(`/private/match-center-responses/response_${slug}.json`), false);
  php.writeFile(dayFile, JSON.stringify({ ...stale, fetched_at: null, payload: null, error: 'UPSTREAM_RATE_LIMITED', error_http: 503 }));
  for (let i = 0; i < 2; i++) {
    const failed = await request('scoreboard.php', boardQuery);
    assert.equal(failed.httpStatusCode, 503);
    assert.equal(JSON.parse(failed.text).code, 'UPSTREAM_RATE_LIMITED');
  }
  console.log('ok HTTP - shared STALE diagnostics, no fresh writes, negative-cache 429 responses');

  for (const [setting, diagnostic] of [['', 'SM_DATA_DIR_UNSET'], ['/app/public_html/cache', 'SM_DATA_DIR_UNSAFE']]) {
    const response = await php.run({ code: `<?php require '/app/php-lib/source_store.php'; echo sm_source_dir('probe');`, env: { SM_DATA_DIR: setting }, $_SERVER: { DOCUMENT_ROOT: '/app' } });
    assert.ok(response.errors.includes(diagnostic));
    assert.ok(!response.text.startsWith('/app/'));
  }
  assert.equal(await fs.readFile(path.join(root, 'standings.php'), 'utf8'), await fs.readFile(path.join(root, 'website/public/standings.php'), 'utf8'));
  assert.equal(await fs.readFile(path.join(root, 'php-lib/source_store.php'), 'utf8'), await fs.readFile(path.join(root, 'website/public/php-lib/source_store.php'), 'utf8'));
  // The Vite publicDir is the only way a build can copy PHP into the root, so
  // its removal is what stops `npm run build` from recreating lib/.
  assert.equal(await fs.stat(path.join(root, 'website/public/lib')).then(() => true, () => false), false,
    'website/public/lib must stay deleted, otherwise every build recreates the frozen lib/');

  // Regression: lib/ cannot be written over FTP (550 lib/.htaccess: Permission
  // denied), so the library moved to php-lib/. lib/** stays excluded: the old
  // folder remains on the server as a rollback, but the repo must never try to
  // upload it again.
  const deploy = await fs.readFile(path.join(root, '.github/workflows/deploy.yml'), 'utf8');
  assert.match(deploy, /^\s*lib\/\*\*\s*$/m, 'deploy.yml must exclude the frozen lib/** path');
  assert.match(deploy, /مسار عالق غير قابل للكتابة عبر FTP/, 'the exclusion must state why it exists');
  assert.ok(!/^\s*php-lib\/\*\*\s*$/m.test(deploy), 'deploy.yml must ship php-lib/**');
  const libGuard = await fs.readFile(path.join(root, 'php-lib/.htaccess'), 'utf8');
  assert.match(libGuard, /Require all denied/, 'php-lib/.htaccess must deny direct web access');
  assert.match(libGuard, /\(php\|inc\|json\|md\)/, 'php-lib/.htaccess must cover PHP files');
  console.log('ok DEPLOY - PHP library shipped from php-lib, frozen lib/ excluded, and blocked from direct HTTP access');
  console.log('ALL HTTP AND DEPLOYMENT COPY TESTS PASSED');
} catch (error) {
  console.error(error.response?.errors || error);
  process.exitCode = 1;
} finally { php.exit(); }
// The pinned WASM runtime can retain its internal TCP proxy after PHP exit.
// This is a one-shot test runner: terminate only AFTER all assertions/cleanup,
// preserving a failing exit code instead of waiting for the proxy idle timeout.
process.exit(process.exitCode ?? 0);
