<?php
declare(strict_types=1);
putenv('SM_DATA_DIR=/private');
putenv('SM_SPORTSDB_KEY=qaOnlyNotARealCredential');
require '/app/lib/sportsdb_source.php';
require '/app/lib/event_summary.php';
require '/app/standings.php';
require '/app/before-standings.php';

$n = 0;
function check(bool $ok, string $why): void {
    global $n;
    if (!$ok) throw new RuntimeException('FAIL: ' . $why);
    echo 'ok ' . (++$n) . ' - ' . $why . "\n";
}
function ev(string $state, int $at, string $name = '', string $id = '1'): array {
    return ['id' => $id, 'date' => gmdate('c', $at), 'competitions' => [[
        'date' => gmdate('c', $at), 'status' => ['type' => ['state' => $state, 'completed' => $state === 'post', 'name' => $name]]
    ]]];
}
$now = strtotime('2026-10-17T18:00:00Z');
$pre = ev('pre', $now + 3000); $live = ev('in', $now - 3000); $done = ev('post', $now - 172801);
$cancel = ev('pre', $now + 100000, 'STATUS_CANCELED'); $postpone = ev('pre', $now + 100000, 'STATUS_POSTPONED');
foreach ([['empty', [], 3600, false], ['scheduled', [$pre], 900, false], ['live', [$live], 60, false],
    ['mixed', [$done, $pre], 60, false], ['recently finished', [ev('post', $now - 200)], 60, false],
    ['finished', [$done], 0, true], ['neutral exceptions', [$done, $cancel, $postpone], 0, true],
    ['only neutral', [$cancel, $postpone], 900, false], ['exact freeze boundary', [ev('post', $now - 172800)], 60, false],
    ['unknown date', [['status' => ['type' => ['completed' => true, 'state' => 'post']]]], 60, false]] as [$label, $events, $ttl, $frozen]) {
    check(sm_source_event_policy($events, $now) === ['ttl' => $ttl, 'frozen' => $frozen], 'policy: ' . $label);
}

require '/app/curl-double.php';
require '/app/lib/espn-curl-double.php';
$GLOBALS['curl_batches']=0;$GLOBALS['curl_batch_sizes']=[];$GLOBALS['curl_fixture']=['events'=>[$pre]];
$parallel=SMCurlQA\sm_espn_days('eng.1',['20261101','20261102'],null,$now);
check($GLOBALS['curl_batches']===1 && $GLOBALS['curl_batch_sizes']===[2] && $parallel['20261101']['ok'],'real curl_multi branch batches two due days');
SMCurlQA\sm_espn_days('eng.1',['20261101','20261102'],null,$now+899);
check($GLOBALS['curl_batches']===1,'cached ESPN units do not reach curl_multi');
$policy=fn($payload,$at)=>sm_source_event_policy($payload['events'],$at);
$count=0;$finished=function()use(&$count,$now){$count++;return ['ok'=>true,'payload'=>['events'=>[ev('post',$now)]]];};
$file=sm_source_dir('transition').'/completed.json';
sm_source_load($file,$finished,$policy,$now);
sm_source_load($file,$finished,$policy,$now+172801);
sm_source_load($file,$finished,$policy,$now+999999);
check($count===2 && sm_source_read($file)['frozen'],'a recent completed unit becomes frozen after two days');

// All ESPN competitions, independent day files, overlapping windows and curl_multi-compatible batches.
foreach (['eng.1','esp.1','ita.1','ger.1','fra.1','uefa.champions','uefa.europa','fifa.worldq.caf','fifa.worldq.uefa','fifa.friendly'] as $league) {
    $calls = [];
    $transport = function ($requested, $days) use (&$calls, $pre, $live, $done): array {
        $calls[] = $days; $out = [];
        foreach ($days as $d) $out[$d] = ['ok' => true, 'events' => match ((string) $d) {
            '20261014' => [$done], '20261017' => [$live], '20261018' => [$pre], default => []
        }];
        return $out;
    };
    $days = ['20261014','20261017','20261018','20261019'];
    $first = sm_espn_days($league, $days, $transport, $now);
    check(count($calls) === 1 && count($calls[0]) === 4 && $first['20261017']['cache'] === 'MISS', "$league cold batch");
    sm_espn_days($league, $days, $transport, $now + 59);
    check(count($calls) === 1, "$league cache hit all units");
    sm_espn_days($league, $days, $transport, $now + 60);
    check(count($calls) === 2 && array_map('strval', $calls[1]) === ['20261017'], "$league refresh only live day");
    $failures = 0;
    $fail = function ($l, $days) use (&$failures): array {
        $failures++; return array_fill_keys($days, sm_source_error('UPSTREAM_RATE_LIMITED', 503));
    };
    $stale = sm_espn_days($league, ['20261017'], $fail, $now + 120)['20261017'];
    check($stale['cache'] === 'STALE' && $stale['stale_code'] === 'UPSTREAM_RATE_LIMITED' && $stale['age'] === 60, "$league failure retains successful age");
    sm_espn_days($league, ['20261017'], $fail, $now + 121);
    check($failures === 1, "$league failure backoff");
    $expired = sm_espn_days($league, ['20261017'], $fail, $now + 661)['20261017'];
    check(!$expired['ok'] && $expired['code'] === 'UPSTREAM_RATE_LIMITED', "$league live stale ceiling from fetched_at");
    sm_espn_days($league, ['20261017'], $fail, $now + 662);
    check($failures === 2, "$league expired backup still backs off");
    $cold = sm_espn_days($league, ['20261020'], $fail, $now)['20261020'];
    sm_espn_days($league, ['20261020'], $fail, $now + 1);
    check(!$cold['ok'] && $cold['http'] === 503 && $failures === 3, "$league negative cache without successful copy");
    sm_espn_days($league, ['20261014'], $transport, $now + 864000);
    check(count($calls) === 2, "$league frozen unit never fetched again");
    sm_espn_days($league, ['20261018'], $transport, $now + 900);
    sm_espn_days($league, ['20261019'], $transport, $now + 3600);
    check(count($calls) === 4, "$league scheduled and empty TTL expiry");
}
foreach ([499 => true, 500 => false, 501 => false] as $count => $expected) {
    $res = classify_upstream_response(0, 200, json_encode(['events' => array_fill(0, $count, $pre)]));
    check($res['ok'] === $expected && ($expected || $res['code'] === 'UPSTREAM_TRUNCATED'), "ESPN event count $count");
}
foreach ([[28, 0, null, 'UPSTREAM_TIMEOUT'], [7, 0, null, 'UPSTREAM_CONNECT_FAILED'],
    [1, 0, null, 'UPSTREAM_NETWORK_ERROR'], [0, 429, '{}', 'UPSTREAM_RATE_LIMITED'],
    [0, 503, '{}', 'UPSTREAM_HTTP_503'], [0, 200, '{', 'UPSTREAM_INVALID_JSON']] as [$errno,$status,$body,$code]) {
    check(classify_upstream_response($errno,$status,$body)['code'] === $code, 'ESPN diagnostic ' . $code);
}

// Round transport is injected below the real SportsDB decoder, truncation guard and normalizer.
foreach (['egy.1','sau.1'] as $league) {
    $raw = ['idEvent' => '42', 'strHomeTeam' => 'Home', 'strAwayTeam' => 'Away',
        'dateEvent' => '2026-10-17', 'strTime' => '16:00:00', 'strStatus' => '1H'];
    $calls = 0;
    $transport = function ($url) use (&$calls,$raw,$league): array {
        $calls++;
        check(strpos($url, 'eventsround.php?id=' . ROUND_LEAGUES[$league]) !== false, "$league original provider and league id");
        return ['errno' => 0, 'status' => 200, 'body' => json_encode(['events' => [$raw]])];
    };
    $res = load_round($league, '2026-2027', 7, $transport, $now);
    check($res['ok'] && $res['events'][0]['competitions'][0]['competitors'][0]['score'] === null, "$league absent score stays null");
    load_round($league, '2026-2027', 7, $transport, $now + 59);
    check($calls === 1, "$league round live hit");
    $failCalls = 0;
    $fail = function () use (&$failCalls): array { $failCalls++; return ['errno'=>0,'status'=>429,'body'=>'{}']; };
    $stale = load_round($league,'2026-2027',7,$fail,$now+60);
    load_round($league,'2026-2027',7,$fail,$now+61);
    check($stale['cache'] === 'STALE' && $stale['stale_code'] === 'UPSTREAM_RATE_LIMITED' && $failCalls === 1, "$league stale and backoff");
    $expired = load_round($league,'2026-2027',7,$fail,$now+601);
    load_round($league,'2026-2027',7,$fail,$now+602);
    check(!$expired['ok'] && $failCalls === 2, "$league expired live and backoff");
    $truncated = function () use ($raw): array { return ['errno'=>0,'status'=>200,'body'=>json_encode(['events'=>array_fill(0,15,$raw)])]; };
    check(load_round($league,'2026-2027',8,$truncated,$now)['code'] === 'UPSTREAM_TRUNCATED', "$league round truncation");
    $empty = function (): array { return ['errno'=>0,'status'=>200,'body'=>'{"events":null}']; };
    check(load_round($league,'2026-2027',9,$empty,$now)['events'] === [], "$league null events is empty round");
    foreach (['FT','NS','PST','CANC'] as $i => $state) {
        $raw['strStatus']=$state; $raw['dateEvent']='2026-10-10';
        $f = fn() => ['errno'=>0,'status'=>200,'body'=>json_encode(['events'=>[$raw]])];
        $r=load_round($league,'2026-2027',10+$i,$f,$now);
        $rec=sm_source_read(round_store_dir().'/'.ROUND_LEAGUES[$league].'-2026-2027-r'.(10+$i).'.json');
        check($rec['frozen'] === ($state==='FT') && $rec['ttl'] === ($state==='FT'?0:900), "$league state $state");
    }
    $file=round_store_dir().'/'.ROUND_LEAGUES[$league].'-2026-2027-r10.json';
    $old=sm_source_read($file);$old['events']=$old['payload']['events'];unset($old['payload'],$old['schema']);sm_source_write($file,$old);
    $migrated=load_round($league,'2026-2027',10,$fail,$now+999999);
    check($migrated['ok'] && $failCalls===2 && sm_source_read($file)['schema']===1, "$league legacy frozen record retained");
}

foreach (['egy.1','sau.1'] as $league) {
    for ($round=1; $round<=40; $round++) {
        $date=strtotime('2025-09-28T18:00:00Z')+($round-1)*86400;
        $events=[ev('post',$date,'STATUS_FULL_TIME',(string)$round)];
        sm_source_write(round_store_dir().'/'.ROUND_LEAGUES[$league].'-2025-2026-r'.$round.'.json',
            ['schema'=>1,'checked_at'=>$now,'fetched_at'=>$now,'ttl'=>0,'frozen'=>true,'error'=>null,'payload'=>['events'=>$events]]);
    }
    $found=round_day_events($league,'2025-10-17');
    check($found['ok'] && count($found['events'])===1 && $found['events'][0]['id']==='20', "$league binary search and UTC day filter preserved");
    $next=round_day_events($league,'2025-10-18');
    check($next['events'][0]['id']==='21', "$league neighboring day uses independent round");
}
foreach ([[429,0,false,true,'{}','UPSTREAM_RATE_LIMITED'], [503,0,false,true,'{}','UPSTREAM_HTTP_503'],
    [0,28,false,false,'','UPSTREAM_TIMEOUT'], [0,7,false,false,'','UPSTREAM_NETWORK'],
    [200,0,false,true,'{','UPSTREAM_INVALID_JSON'], [200,0,true,false,'','UPSTREAM_TOO_LARGE']] as [$status,$errno,$large,$success,$body,$code]) {
    try { sm_st_decode($status,$errno,$large,$success,$body); throw new LogicException('accepted invalid response'); }
    catch (RuntimeException $e) { check($e->getMessage()===$code, 'standings shared transport classifier: '.$code); }
}
$http429=classify_upstream_response(0,429,null);
check($http429['code']==='UPSTREAM_RATE_LIMITED','HTTP 429 without a body is not misclassified as a network error');

// Summary has its own source-state policy and immutable successful timestamps.
foreach (['pre','in','post'] as $i=>$state) {
    $id=(string)(800+$i);$event=ev($state,$state==='post'?$now-200000:$now,'',$id);
    $header=['id'=>$id,'competitions'=>$event['competitions']]; $calls=0;
    $t=function()use($header,&$calls){$calls++;return ['status'=>200,'errno'=>0,'body'=>json_encode(['header'=>$header])];};
    $first=sm_summary_load('eng.1',$id,$t,$now);
    sm_summary_load('eng.1',$id,$t,$now+59);
    check($first['ok'] && $calls===1,"summary $state hit");
    $later=sm_summary_load('eng.1',$id,$t,$now+60);
    check($calls===($state==='in'?2:1),"summary $state TTL/freeze");
    $badCalls=0;$bad=function()use(&$badCalls){$badCalls++;return ['status'=>429,'body'=>'{}'];};
    $at=$state==='pre'?$now+900:$now+120;
    $r=sm_summary_load('eng.1',$id,$bad,$at);
    sm_summary_load('eng.1',$id,$bad,$at+1);
    check($state==='post' ? $badCalls===0 : ($state==='pre' ? (!$r['ok'] && $badCalls===1) : ($r['cache']==='STALE' && $r['stale_code']==='UPSTREAM_HTTP_429' && $badCalls===1)),"summary $state failure/freeze/backoff");
}
$bad=fn()=>['status'=>200,'body'=>'{'];
check(sm_summary_load('eng.1','900',$bad,$now)['code']==='UPSTREAM_INVALID_JSON','summary invalid JSON without backup');
check(!sm_summary_load('eng.1','901',fn()=>['status'=>0,'errno'=>28],$now)['ok'],'summary timeout without backup');

// Every standings provider uses existing snapshot inputs through before/after normalizers.
$fixtures=json_decode(file_get_contents('/app/fixtures.json'),true);
foreach (glob('/private/espn-days/*-20261017.json') as $file) unlink($file);
foreach (glob('/private/smp_sportsdb_rounds/*-r7.json') as $file) unlink($file);
foreach (sm_st_known_leagues() as $league=>$config) {
    $raw=$fixtures[$league];
    $before=before_sm_st_normalize_for($league,$raw,$now);
    $after=sm_st_normalize_for($league,$raw,$now);
    check($before===$after,"standings snapshot unchanged: $league");
    $calls=0;$t=function()use($raw,&$calls){$calls++;return $raw;};
    $dir=sm_source_dir('standings-test');
    $first=sm_st_service($league,$now,$dir,$t);
    $hit=sm_st_service($league,$now+899,$dir,$t);
    check($first['body']['cache']==='MISS' && $hit['body']['cache']==='HIT' && $calls===1,"standings $league 900s without live proof");
    $failCalls=0;$fail=function()use(&$failCalls){$failCalls++;throw new RuntimeException('UPSTREAM_RATE_LIMITED');};
    $stale=sm_st_service($league,$now+900,$dir,$fail);
    $again=sm_st_service($league,$now+901,$dir,$fail);
    check($stale['body']['cache']==='STALE' && $stale['body']['code']==='UPSTREAM_RATE_LIMITED' && $stale['body']['fetchedAt']===$first['body']['fetchedAt'] && $failCalls===1,"standings $league failure backoff and age");
    $recovered=sm_st_service($league,$now+960,$dir,$t);
    check($recovered['body']['cache']==='MISS' && $calls===2,"standings $league recovery at retry boundary");
    $expired=sm_st_service($league,$now+960+86400,$dir,$fail);
    sm_st_service($league,$now+960+86401,$dir,$fail);
    check($expired['status']===503 && $failCalls===2,"standings $league expired backup backoff");
    $bad=$raw;
    if ($league==='egy.1') array_pop($bad['groups'][0]['standings']);
    else array_pop($bad['children'][0]['standings']['entries']);
    $missing=sm_st_service($league,$now,sm_source_dir('incomplete'),fn()=>$bad);
    check($missing['body']['code']==='UPSTREAM_INCOMPLETE' && !isset($missing['body']['entries']),"standings $league incomplete rejected");
    $poisonDir=sm_source_dir('poison-guard');
    sm_st_service($league,$now,$poisonDir,fn()=>$raw);
    $prior=sm_source_read($poisonDir.'/'.$league.'.json');
    $refused=sm_st_service($league,$now+900,$poisonDir,fn()=>$bad);
    $after=sm_source_read($poisonDir.'/'.$league.'.json');
    check($refused['body']['cache']==='STALE' && $refused['body']['code']==='UPSTREAM_INCOMPLETE'
        && $after['payload']===$prior['payload'] && $after['fetched_at']===$prior['fetched_at']
        && $after['checked_at']===$now+900,"standings $league incomplete refresh cannot poison successful payload");
    $negativeCalls=0;$no=function()use(&$negativeCalls){$negativeCalls++;throw new RuntimeException('UPSTREAM_TIMEOUT');};
    sm_st_service($league,$now,sm_source_dir('negative'),$no);
    sm_st_service($league,$now+59,sm_source_dir('negative'),$no);
    check($negativeCalls===1,"standings $league no-copy backoff");
}
// Fresh shared live records shorten an already cached 900s table to 120s.
foreach (['eng.1','egy.1'] as $league) {
    $file=$league==='eng.1'?sm_source_dir('espn-days').'/eng.1-20261017.json':round_store_dir().'/4829-2026-2027-r7.json';
    $dir=sm_source_dir('dynamic-'.$league);$calls=0;$t=function()use(&$calls,$fixtures,$league){$calls++;return $fixtures[$league];};
    sm_st_service($league,$now,$dir,$t);
    sm_source_write($file,['schema'=>1,'checked_at'=>$now+120,'fetched_at'=>$now+120,'ttl'=>60,'frozen'=>false,'error'=>null,'payload'=>['events'=>[$live]]]);
    check(sm_st_match_ttl($league,$now+125)===120,"standings $league detects live shared unit");
    sm_st_service($league,$now+120,$dir,$t);
    check($calls===2,"standings $league live 120s refresh");
}
check(sm_st_match_ttl('ksa.1',$now)===900,'ksa.1 not silently added or mapped in matches');
$redacted=sm_st_service('eng.1',$now,sm_source_dir('redaction'),function(){throw new RuntimeException('qaOnlyNotARealCredential private path');});
check($redacted['body']['code']==='UPSTREAM_UNAVAILABLE' && strpos(json_encode($redacted),'qaOnly')===false,'arbitrary exception secrets redacted');
$normalized=normalize_sportsdb_event(['idEvent'=>'nulls','strHomeTeam'=>'H','strAwayTeam'=>'A','dateEvent'=>'2026-10-17','strTime'=>'18:00:00']);
check($normalized['competitions'][0]['venue']['fullName']===null && $normalized['competitions'][0]['competitors'][1]['score']===null,'missing venue and scores stay null');
foreach (glob('/private/*/*.json') as $file) {
    $record=json_decode(file_get_contents($file),true);
    foreach (['schema','checked_at','fetched_at','ttl','frozen','error','payload'] as $key) {
        if (!array_key_exists($key,$record)) throw new RuntimeException('record missing '.$key);
    }
    if (strpos(file_get_contents($file),'qaOnlyNotARealCredential')!==false) throw new RuntimeException('credential persisted');
}
putenv('SM_SPORTSDB_KEY=unsafe/value');
$keyCalls=0;
$missingKey=fetch_round('egy.1','2026-2027',1,function()use(&$keyCalls){$keyCalls++;return [];});
check($missingKey['code']==='UPSTREAM_KEY_MISSING' && $keyCalls===0,'missing or unsafe SportsDB credential fails before transport');
putenv('SM_HIGHLIGHTLY_KEY=qaOnlyNotARealCredential');
check(sm_st_highlightly_key()==='qaOnlyNotARealCredential','Highlightly still reads its credential from environment only');
putenv('SM_HIGHLIGHTLY_KEY');
check(!glob('/private/*/write-*'),'atomic writes leave no temporary files');
echo 'ALL SOURCE TESTS PASSED: '.$n.' assertions; PHP '.PHP_VERSION."\n";
