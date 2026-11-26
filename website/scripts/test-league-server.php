<?php
declare(strict_types=1);
require __DIR__.'/../../league-page.php';
function check_lp(bool $condition, string $message): void { if (!$condition) { fwrite(STDERR, $message."\n"); exit(1); } }
$entry = ['rank'=>1, 'name'=>'<script>alert(1)</script>', 'played'=>10, 'wins'=>5, 'draws'=>2, 'losses'=>3, 'goalsFor'=>20, 'goalsAgainst'=>10, 'points'=>17];
$valid = ['status'=>200, 'body'=>['ok'=>true,'entries'=>[$entry], 'provider'=>'ESPN', 'season'=>2026, 'stale'=>true, 'fetchedAt'=>'2026-11-21T12:00:00Z']];
$table = sm_lp_standings($valid, 'standings');
check_lp(strpos($table, 'بيانات المصدر قديمة') !== false, 'stale standings must be marked');
check_lp(strpos($table, '<script>') === false && strpos($table, '&lt;script&gt;') !== false, 'team names must be escaped');
check_lp(strpos($table, '<tbody>') !== false && strpos($table, '>17</td>') !== false, 'standings must render in the initial HTML');
$rates = sm_lp_standings($valid, 'stats');
check_lp(strpos($rates, '>2.00</td>') !== false && strpos($rates, '>1.70</td>') !== false, 'rates use only standings fields');
$entry['played'] = 0; $entry['goalsFor'] = null; $valid['body']['entries'] = [$entry];
check_lp(strpos(sm_lp_standings($valid, 'stats'), 'غير متاح') !== false, 'missing rates cannot be invented');
check_lp(strpos(sm_lp_standings(['status'=>503], 'standings'), 'تعذّر') !== false, 'source failure must be explicit');
$withoutTime = $valid; unset($withoutTime['body']['fetchedAt']);
check_lp(strpos(sm_lp_standings($withoutTime, 'standings'), 'آخر قراءة: غير متاح') !== false, 'a missing timestamp must never become the current time');
$day = new DateTimeImmutable('2026-11-21T12:00:00', new DateTimeZone('Africa/Cairo'));
$event = ['id'=>'1', 'date'=>'2026-11-21T18:00:00Z', 'competitions'=>[['competitors'=>[
    ['homeAway'=>'away','score'=>'0','team'=>['displayName'=>'Away']],
    ['homeAway'=>'home','score'=>'2','team'=>['displayName'=>'<Home>']],
], 'status'=>['type'=>['state'=>'post','completed'=>true,'name'=>'STATUS_FULL_TIME']]]]];
$board = ['data'=>['events'=>[$event, $event]], 'stale'=>true];
$matches = sm_lp_matches($board, $day);
check_lp(substr_count($matches, '<tr>') === 2, 'duplicate events must be removed');
check_lp(strpos($matches, '2 : 0') !== false && strpos($matches, '&lt;Home&gt;') !== false, 'score and escaped names must be shown');
check_lp(strpos($matches, 'بيانات المصدر قديمة') !== false, 'stale scoreboard must be marked');
$event['date'] = '2026-11-20T20:00:00Z';
check_lp(strpos(sm_lp_matches(['data'=>['events'=>[$event]], 'stale'=>false], $day), 'لا توجد مباريات') !== false, 'exclude other Cairo days');
check_lp(strpos(sm_lp_matches(null, $day), 'تعذّر') !== false, 'failed scoreboard must not look empty');
check_lp(SM_LP_ROUTES['saudi-pro-league'] === ['ksa.1','sau.1'], 'Saudi source IDs must match the world');
// Exercise the actual controller/template insertion with a PHP-only fake source.
$_SERVER['REQUEST_METHOD'] = 'GET';
$_SERVER['REQUEST_URI'] = '/leagues/premier-league/standings/';
$entry['played'] = 10; $entry['goalsFor'] = 20; $valid['body']['entries'] = [$entry];
ob_start(); sm_lp_handle(static function (string $league) use ($valid): array { check_lp($league === 'eng.1', 'wrong standings source'); return $valid; }); $html = ob_get_clean();
check_lp(strpos($html, '<!--SM_LEAGUE_DATA-->') === false && strpos($html, 'لا تتوفر البيانات المباشرة في النسخة الثابتة') === false, 'controller must replace the entire static fallback');
check_lp(strpos($html, '&lt;script&gt;') !== false && strpos($html, '<tbody>') !== false, 'no-JS response must contain escaped table data');
check_lp(strpos($html, 'rel="canonical" href="https://streammasterstore.com/leagues/premier-league/standings/"') !== false, 'canonical must survive rendering');
$_SERVER['REQUEST_URI'] = '/leagues/saudi-pro-league/matches/';
ob_start(); sm_lp_handle(null, static function (string $league, DateTimeImmutable $day): array { check_lp($league === 'sau.1', 'wrong Saudi match source'); return ['data'=>['events'=>[]], 'stale'=>false]; }); $html = ob_get_clean();
check_lp(strpos($html, 'لا توجد مباريات مؤكدة') !== false, 'controller renders an empty day explicitly');
$_SERVER['REQUEST_URI'] = '/leagues/../../standings/'; http_response_code(200);
ob_start(); sm_lp_handle(); $html = ob_get_clean();
check_lp(http_response_code() === 404 && $html === '', 'unrecognised routes cannot read arbitrary files');
echo "league server renderer tests passed\n";
