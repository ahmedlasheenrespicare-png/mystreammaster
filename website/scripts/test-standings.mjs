import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { load } from 'cheerio';
import { STANDINGS_LEAGUES, validateStandings, renderFixtureStandings, renderStandingsRows } from '../public/_assets/fixture-standings.js';

const website = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const snapshot = JSON.parse(await fs.readFile(path.join(website, 'src/content/fixture-standings-snapshot.json'), 'utf8'));
const standingsDocumentation = await fs.readFile(path.join(website, 'legacy/manchester-united-atletico/index.html'), 'utf8');
const fresh = () => structuredClone(snapshot.tables[0]);

for (const config of STANDINGS_LEAGUES) {
  test(`standings: complete published ${config.id} snapshot validates without deriving ranks`, () => {
    const data = snapshot.tables.find(table => table.league === config.id);
    const result = validateStandings({ ...data, entries: [...data.entries].reverse() }, config.id);
    assert.equal(result.entries.length, config.count);
    assert.deepEqual(result.entries.map(row => row.teamId), data.entries.map(row => row.teamId));
    assert.equal(result.season, 2026);
  });
}

test('standings: all 76 rows and four reviewed focus ranks are baked into static HTML', () => {
  const $ = load(renderFixtureStandings(snapshot));
  assert.equal($('tbody tr').length, 76);
  for (const [league, team, rank] of [['uefa.champions','360',13],['uefa.champions','1068',15],['eng.1','360',13],['esp.1','1068',2]]) {
    assert.equal($(`[data-standing-league="${league}"] [data-summary-team="${team}"] [data-summary-rank]`).text(), String(rank));
  }
  assert.equal($('table caption').length, 3);
  assert.equal($('[role="region"][tabindex="0"]').length, 3);
  assert.equal($('script, iframe, img').length, 0);
  assert.equal($('.fs-source cite').length, 0, 'provider attribution is centralized, not repeated below each table');
  const docs = load(standingsDocumentation);
  assert.ok(docs('#source-espn-data cite').text().includes('ESPN'));
  assert.equal(docs('#source-espn-data [data-documented-league]').length, 3);
  assert.doesNotMatch($.text(), /UEFA|ESPN|FotMob/);
  assert.equal($('a[href*="espn"]').length, 0, 'standings add no external ESPN viewing destination');
});

test('standings: missing values remain unavailable and an actual zero remains zero', () => {
  const data = fresh(); data.entries[0].points = null; data.entries[1].points = 0; delete data.entries[2].wins;
  const result = validateStandings(data, data.league);
  const $ = load(`<table><tbody>${renderStandingsRows(result)}</tbody></table>`);
  assert.equal($('[data-standing-team="160"] [data-standing-field="points"]').text(), 'غير متاح');
  assert.equal($('[data-standing-team="83"] [data-standing-field="points"]').text(), '0');
  assert.equal(result.entries[2].wins, null);
});

test('standings: signed deductions and source goal difference are not recalculated', () => {
  const data = fresh(); data.entries[0].points = -3; data.entries[0].goalDifference = -4;
  const result = validateStandings(data, data.league);
  assert.equal(result.entries[0].points, -3);
  assert.equal(result.entries[0].goalDifference, -4);
  assert.equal(result.entries[0].rank, 1);
});

for (const [name, change] of [
  ['wrong league', data => { data.league = 'eng.1'; }],
  ['wrong phase', data => { data.phase = 'knockout'; }],
  ['partial table', data => { data.entries.pop(); }],
  ['duplicate team', data => { data.entries[1].teamId = data.entries[0].teamId; }],
  ['duplicate rank', data => { data.entries[1].rank = data.entries[0].rank; }],
  ['missing season', data => { delete data.season; }],
  ['invalid timestamp', data => { data.fetchedAt = 'not a date'; }],
  ['invalid integer', data => { data.entries[0].points = '11/20'; }],
  ['negative played count', data => { data.entries[0].played = -1; }],
]) {
  test(`standings: rejects ${name}, rather than publishing a guessed table`, () => {
    const data = fresh(); change(data);
    assert.throws(() => validateStandings(data, 'uefa.champions'), /INVALID_STANDINGS/);
  });
}

test('standings: provider strings cannot inject HTML', () => {
  const data = fresh(); data.entries[0].name = '<img src=x onerror=alert(1)>';
  const $ = load(`<table><tbody>${renderStandingsRows(validateStandings(data, data.league))}</tbody></table>`);
  assert.equal($('img, script').length, 0);
  assert.ok($('tbody').text().includes('<img src=x onerror=alert(1)>'));
});

test('standings PHP: closed upstream, timeout/size/redirect controls, private atomic cache', async () => {
  const php = (await Promise.all(['standings.php','php-lib/source_store.php'].map(file => fs.readFile(path.join(website,'public',file),'utf8')))).join('\n');
  for (const needle of ['SM_ST_LEAGUES', 'https://site.web.api.espn.com/apis/v2/sports/soccer/',
    'CURLOPT_FOLLOWLOCATION => false', 'CURLOPT_SSL_VERIFYPEER => true', 'CURLOPT_SSL_VERIFYHOST => 2',
    'CURLOPT_CONNECTTIMEOUT => 4', 'CURLOPT_TIMEOUT => 10', 'SM_ST_MAX_BYTES = 524288',
    'SM_ST_TTL = 120', 'SM_ST_STALE_TTL = 86400', 'LOCK_EX',
    'tempnam(dirname($file)', '@rename($temporary, $file)', 'Cache-Control: no-store', 'X-Robots-Tag: noindex, nofollow',
    "count($_GET) !== 1", "sm_source_dir('standings')"]) assert.ok(php.includes(needle), needle);
  assert.ok(!php.includes("$_GET['url']") && !php.includes('HTTP_COOKIE') && !php.includes('Access-Control-Allow-Origin: *'));
});

const native = spawnSync('php',['-v'],{ encoding:'utf8' });
const wasmCli = path.join(website,'../tests/source-store/php.mjs');
let hasWasm = false; try { await fs.access(path.join(website,'../tests/source-store/node_modules/@php-wasm/node/package.json')); hasWasm = true; } catch {}

test('standings PHP runtime: normalization, cache lifecycle, failure preservation and HTTP validation', { skip: native.status !== 0 && !hasWasm ? 'PHP runtime not installed; run with native PHP or the isolated QA runtime documented in README.' : false }, async () => {
  const base = path.join(website,'playwright-report'); await fs.mkdir(base,{ recursive:true });
  const temp = await fs.mkdtemp(path.join(base,'standings-php-'));
  const fieldMap = { played:'gamesPlayed', wins:'wins', draws:'ties', losses:'losses', goalsFor:'pointsFor', goalsAgainst:'pointsAgainst', goalDifference:'pointDifferential', points:'points' };
  const uids = { 'uefa.champions':'s:600~l:775', 'eng.1':'s:600~l:700', 'esp.1':'s:600~l:740' };
  const raw = Object.fromEntries(snapshot.tables.map(data => [data.league, { uid:uids[data.league], children:[{ name:data.league==='uefa.champions'?'League Phase':'Domestic league', standings:{ name:'overall', season:data.season, entries:data.entries.map(row => ({ team:{ id:row.teamId, displayName:row.name }, stats:[{name:'rank',value:row.rank},...Object.entries(fieldMap).map(([key,name])=>({name,value:row[key]}))] })) } }] }]));
  const phpString = value => `'${value.replace(/\\/g,'\\\\').replace(/'/g,"\\'")}'`;
  await fs.writeFile(path.join(temp,'raw.json'), JSON.stringify(raw));
  const program = `<?php
require ${phpString(path.join(website,'public/standings.php'))};
$fixtures=json_decode(file_get_contents(__DIR__.'/raw.json'),true);
$assert=function($ok,$why){if(!$ok)throw new RuntimeException($why);};
$reject=function($raw,$league)use($assert){try{sm_st_normalize($raw,$league,1792100000);}catch(RuntimeException $e){$assert(in_array($e->getMessage(),['UPSTREAM_SCHEMA_CHANGED','UPSTREAM_INCOMPLETE'],true),'schema diagnostic');return;}throw new RuntimeException('invalid schema accepted');};
foreach(SM_ST_LEAGUES as $league=>$config){$data=sm_st_normalize($fixtures[$league],$league,1792100000);$assert(count($data['entries'])===$config['count'],'complete table');$assert($data['season']===2026,'season');}
$league='uefa.champions';$raw=$fixtures[$league];$now=1792100000;
$assert(sm_st_number(0)===0 && sm_st_number('0')===0,'real zero');
foreach([null,false,'','11/20','—',1.2,INF,-1] as $value)$assert(sm_st_number($value)===null,'reject invalid numeric');
$assert(sm_st_number('-3',true)===-3,'signed deductions');
$bad=$raw;$bad['uid']='s:600~l:700';$reject($bad,$league);
$bad=$raw;$bad['children'][0]['name']='Quarter-finals';$reject($bad,$league);
$bad=$raw;array_pop($bad['children'][0]['standings']['entries']);$reject($bad,$league);
$bad=$raw;$bad['children'][0]['standings']['entries'][1]['team']['id']='160';$reject($bad,$league);
$bad=$raw;$bad['children'][0]['standings']['entries'][1]['stats'][0]['value']=1;$reject($bad,$league);
$bad=$raw;unset($bad['children'][0]['standings']['season']);$reject($bad,$league);
$bad=$raw;$bad['children'][]=$bad['children'][0];$reject($bad,$league);
$changed=$raw;
foreach($changed['children'][0]['standings']['entries'][0]['stats'] as &$stat){if($stat['name']==='points')$stat['value']=-3;if($stat['name']==='wins')$stat['value']='11/20';}unset($stat);
$data=sm_st_normalize($changed,$league,$now);$assert($data['entries'][0]['points']===-3 && $data['entries'][0]['wins']===null && $data['entries'][0]['rank']===1,'no arithmetic corrections');
$dir=__DIR__.'/cache';$calls=0;
$transport=function($requested)use($raw,&$calls,$assert,$league){$assert($requested===$league,'closed league transport');$calls++;return $raw;};
$first=sm_st_service($league,$now,$dir,$transport);$assert($first['status']===200 && $first['body']['cache']==='MISS' && $calls===1,'initial upstream read');
$hit=sm_st_service($league,$now+50,$dir,$transport);$assert($hit['body']['cache']==='HIT' && $calls===1 && $hit['body']['ageSeconds']===50,'TTL cache hit');
$fail=function(){throw new RuntimeException('UPSTREAM_TIMEOUT');};
$stale=sm_st_service($league,$now+901,$dir,$fail);$assert($stale['status']===200 && $stale['body']['stale']===true && $stale['body']['cache']==='STALE','stale fallback');
$assert($stale['body']['fetchedAt']===$first['body']['fetchedAt'] && $stale['body']['ageSeconds']===901,'no false fresh timestamp');
$cacheBefore=file_get_contents($dir.'/'.$league.'.json');
$invalid=sm_st_service($league,$now+902,$dir,function(){return ['children'=>[]];});
$assert($invalid['body']['code']==='UPSTREAM_TIMEOUT' && file_get_contents($dir.'/'.$league.'.json')===$cacheBefore,'backoff preserves last failure and payload');
$next=sm_st_service($league,$now+961,$dir,$transport);$assert($next['body']['stale']===false && $next['body']['fetchedAt']!==$first['body']['fetchedAt'] && $calls===2,'recovery');
$expired=sm_st_service($league,$now+962+SM_ST_STALE_TTL,$dir,$fail);$assert($expired['status']===503 && !isset($expired['body']['entries']),'expired backup not served');
$invalidLeague=sm_st_service('../../metadata',$now,$dir,$transport);$assert($invalidLeague['status']===400 && $calls===2,'reject arbitrary league without fetch');
$other=sm_st_service('eng.1',$now,$dir,function(){throw new RuntimeException('/secret/private/path');});$assert($other['body']['code']==='UPSTREAM_UNAVAILABLE','no leaked transport paths');
$assert(count(glob($dir.'/write-*'))===0,'no temporary write debris');
$_SERVER['REQUEST_METHOD']='POST';$_GET=['league'=>$league];ob_start();sm_st_http();$post=json_decode(ob_get_clean(),true);$assert(http_response_code()===405 && $post['code']==='METHOD_NOT_ALLOWED','reject POST');
$_SERVER['REQUEST_METHOD']='GET';$_GET=['league'=>[$league]];ob_start();sm_st_http();$array=json_decode(ob_get_clean(),true);$assert(http_response_code()===400 && $array['code']==='INVALID_LEAGUE','reject array query');
$_GET=['league'=>$league,'url'=>'http://127.0.0.1'];ob_start();sm_st_http();$url=json_decode(ob_get_clean(),true);$assert(http_response_code()===400 && $url['code']==='INVALID_LEAGUE','reject extra URL parameter');
echo "PASS PHP: real parser, all leagues, invalid inputs, zero/null, TTL hit, stale timestamp, cache poisoning prevention, recovery, expiry, request allowlist and error redaction.\\n";
`;
  try {
    const filename=path.join(temp,'test.php'); await fs.writeFile(filename,program);
    const result=native.status===0 ? spawnSync('php',[filename],{encoding:'utf8',timeout:60_000}) : spawnSync(process.execPath,[wasmCli,filename],{encoding:'utf8',timeout:60_000});
    assert.equal(result.status,0,`${result.stdout}\n${result.stderr}\n${result.error || ''}`);
    assert.match(result.stdout,/PASS PHP:/);
  } finally { await fs.rm(temp,{recursive:true,force:true}); }
});
