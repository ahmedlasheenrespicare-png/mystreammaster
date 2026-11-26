<?php
/** Server-rendered readable league data. The interactive world remains unchanged.
 * URLs and source identifiers are fixed below; visitor input cannot choose a host,
 * filesystem path, data source or arbitrary upstream. PHP 7.4+.
 */
declare(strict_types=1);

const SM_LP_PLACEHOLDER = '<!--SM_LEAGUE_DATA--><noscript><p>لا تتوفر البيانات المباشرة في النسخة الثابتة. أعد المحاولة لاحقًا.</p></noscript>';

const SM_LP_ROUTES = [
    'champions-league' => ['uefa.champions', 'uefa.champions'],
    'premier-league' => ['eng.1', 'eng.1'],
    'ligue-1' => ['fra.1', 'fra.1'],
    'la-liga' => ['esp.1', 'esp.1'],
    'bundesliga' => ['ger.1', 'ger.1'],
    'serie-a' => ['ita.1', 'ita.1'],
    'saudi-pro-league' => ['ksa.1', 'sau.1'],
    'egyptian-premier-league' => ['egy.1', 'egy.1'],
];

function sm_lp_escape($value): string {
    return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}
function sm_lp_number($value): string {
    return is_int($value) || is_float($value) ? sm_lp_escape($value) : 'غير متاح';
}
function sm_lp_rate($value, $played): string {
    if ((!is_int($value) && !is_float($value)) || (!is_int($played) && !is_float($played)) || $played <= 0) return 'غير متاح';
    return number_format($value / $played, 2, '.', '');
}
function sm_lp_table(array $headings, array $rows): string {
    $result = '<div class="table-scroll" role="region" aria-label="جدول البيانات، قابل للتمرير أفقيًا" tabindex="0"><table><thead><tr>';
    foreach ($headings as $heading) $result .= '<th scope="col">'.sm_lp_escape($heading).'</th>';
    $result .= '</tr></thead><tbody>';
    foreach ($rows as $row) {
        $result .= '<tr>';
        foreach ($row as $cell) $result .= '<td>'.sm_lp_escape($cell).'</td>';
        $result .= '</tr>';
    }
    return $result.'</tbody></table></div>';
}
function sm_lp_unavailable(): string {
    return '<p class="notice">تعذّر تحميل البيانات من المصدر حاليًا. يرجى إعادة المحاولة لاحقًا.</p>';
}
/** The exact validated output of sm_st_service, shared with standings.php. */
function sm_lp_standings(array $result, string $view): string {
    $data = $result['body'] ?? null;
    if (($result['status'] ?? 0) !== 200 || !is_array($data) || ($data['ok'] ?? false) !== true || !is_array($data['entries'] ?? null)) return sm_lp_unavailable();
    $rows = [];
    $entries = $view === 'overview' ? array_slice($data['entries'], 0, 5) : $data['entries'];
    foreach ($entries as $team) {
        if (!is_array($team) || !is_string($team['name'] ?? null)) return sm_lp_unavailable();
        if ($view === 'stats') {
            $rows[] = [sm_lp_number($team['rank'] ?? null), $team['name'], sm_lp_number($team['played'] ?? null), sm_lp_rate($team['goalsFor'] ?? null, $team['played'] ?? null), sm_lp_rate($team['goalsAgainst'] ?? null, $team['played'] ?? null), sm_lp_rate($team['points'] ?? null, $team['played'] ?? null)];
        } else {
            $rows[] = [sm_lp_number($team['rank'] ?? null), $team['name'], sm_lp_number($team['played'] ?? null), sm_lp_number($team['wins'] ?? null), sm_lp_number($team['draws'] ?? null), sm_lp_number($team['losses'] ?? null), sm_lp_number($team['goalsFor'] ?? null), sm_lp_number($team['goalsAgainst'] ?? null), sm_lp_number($team['points'] ?? null)];
        }
    }
    $fetched = $data['fetchedAt'] ?? '';
    $date = 'غير متاح';
    if (is_string($fetched) && trim($fetched) !== '') {
        try { $date = (new DateTimeImmutable($fetched))->setTimezone(new DateTimeZone('Africa/Cairo'))->format('Y-m-d H:i'); }
        catch (Throwable $error) { /* Never invent a timestamp. */ }
    }
    $stale = ($data['stale'] ?? false) === true || ($data['cache'] ?? '') === 'STALE';
    $note = ($stale ? 'تنبيه: بيانات المصدر قديمة · ' : '').'آخر قراءة: '.$date.' بتوقيت القاهرة · '.($data['provider'] ?? '').' · موسم '.($data['season'] ?? 'غير متاح').'.';
    $headings = $view === 'stats' ? ['المركز', 'الفريق', 'لعب', 'هجوم / مباراة', 'دفاع / مباراة', 'نقاط / مباراة'] : ['المركز', 'الفريق', 'لعب', 'فاز', 'تعادل', 'خسر', 'له', 'عليه', 'النقاط'];
    return '<div data-server-league-data="true"><p class="notice">'.sm_lp_escape($note).'</p>'.sm_lp_table($headings, $rows).'</div>';
}
/** Fixed same-origin scoreboard proxy, not a caller-supplied URL. */
function sm_lp_scoreboard(string $league, DateTimeImmutable $day): ?array {
    if (!function_exists('curl_init')) return null;
    $dates = $day->modify('-1 day')->format('Ymd').'-'.$day->modify('+1 day')->format('Ymd');
    $url = 'https://streammasterstore.com/scoreboard.php?league='.rawurlencode($league).'&dates='.$dates;
    $headers = []; $body = '';
    $ch = curl_init($url);
    if ($ch === false) return null;
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => false, CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_CONNECTTIMEOUT => 3, CURLOPT_TIMEOUT => 8,
        CURLOPT_HTTPHEADER => ['Accept: application/json'],
        CURLOPT_HEADERFUNCTION => static function ($curl, string $line) use (&$headers): int {
            $parts = explode(':', $line, 2);
            if (count($parts) === 2) $headers[strtolower(trim($parts[0]))] = trim($parts[1]);
            return strlen($line);
        },
        CURLOPT_WRITEFUNCTION => static function ($curl, string $chunk) use (&$body): int {
            if (strlen($body) + strlen($chunk) > 5242880) return 0;
            $body .= $chunk; return strlen($chunk);
        },
    ]);
    $ok = curl_exec($ch); $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
    if ($ok === false || $code !== 200) return null;
    $data = json_decode($body, true);
    if (!is_array($data) || ($data['ok'] ?? true) === false || !is_array($data['events'] ?? null)) return null;
    return ['data' => $data, 'stale' => strtoupper($headers['x-matches-cache'] ?? '') === 'STALE'];
}
function sm_lp_score($value): ?int {
    if (is_int($value) && $value >= 0) return $value;
    if (is_string($value) && preg_match('/^\d{1,5}$/D', $value)) return (int) $value;
    return null;
}
/** Render only valid events falling on today's Cairo calendar day. */
function sm_lp_matches(?array $result, DateTimeImmutable $day): string {
    if ($result === null || !is_array($result['data']['events'] ?? null)) return sm_lp_unavailable();
    $zone = new DateTimeZone('Africa/Cairo'); $rows = []; $seen = [];
    $specialLabels = ['STATUS_POSTPONED'=>'مؤجلة', 'STATUS_CANCELED'=>'ملغاة', 'STATUS_CANCELLED'=>'ملغاة', 'STATUS_SUSPENDED'=>'متوقفة', 'STATUS_DELAYED'=>'متأخرة', 'STATUS_ABANDONED'=>'أُلغيت بعد بدايتها'];
    foreach ($result['data']['events'] as $event) {
        if (!is_array($event) || empty($event['id']) || isset($seen[(string)$event['id']])) continue;
        $competition = $event['competitions'][0] ?? null;
        if (!is_array($competition) || !is_array($competition['competitors'] ?? null)) continue;
        $sides = [];
        foreach ($competition['competitors'] as $side) {
            $role = $side['homeAway'] ?? '';
            $name = $side['team']['displayName'] ?? $side['team']['name'] ?? null;
            if (in_array($role, ['home','away'], true) && is_string($name) && trim($name) !== '') $sides[$role] = ['name' => $name, 'score' => sm_lp_score($side['score'] ?? null)];
        }
        if (!isset($sides['home'], $sides['away'])) continue;
        $rawDate = $competition['date'] ?? $event['date'] ?? null;
        if (!is_string($rawDate) || $rawDate === '') continue;
        try { $kickoff = (new DateTimeImmutable($rawDate))->setTimezone($zone); } catch (Throwable $error) { continue; }
        if ($kickoff->format('Y-m-d') !== $day->format('Y-m-d')) continue;
        $seen[(string)$event['id']] = true;
        $status = $competition['status'] ?? $event['status'] ?? [];
        $type = is_array($status['type'] ?? null) ? $status['type'] : [];
        $name = (string) ($type['name'] ?? '');
        $special = preg_match('/postpon|cancel|suspend|delay|abandon/i', $name) === 1;
        $state = $special ? 'other' : (($type['completed'] ?? false) === true ? 'finished' : (($type['state'] ?? '') === 'in' ? 'live' : 'scheduled'));
        $score = ($state === 'live' || $state === 'finished') && $sides['home']['score'] !== null && $sides['away']['score'] !== null
            ? $sides['home']['score'].' : '.$sides['away']['score'] : ($state === 'scheduled' ? $kickoff->format('H:i') : 'غير متاح');
        $detail = $state === 'scheduled' ? 'بتوقيت القاهرة' : ($state === 'finished' ? 'انتهت' : ($state === 'live' ? (string)($status['displayClock'] ?? $type['shortDetail'] ?? 'مباشر').' · مباشر' : ($specialLabels[$name] ?? 'تغيّر موعد المباراة')));
        $rows[] = ['time' => $kickoff->getTimestamp(), 'values' => [$sides['home']['name'], $score, $sides['away']['name'], $detail]];
    }
    usort($rows, static function (array $a, array $b): int { return $a['time'] <=> $b['time']; });
    $note = $day->format('Y-m-d').' · توقيت القاهرة'.(!empty($result['stale']) ? ' · تنبيه: بيانات المصدر قديمة' : '').(!$rows ? ' · لا توجد مباريات مؤكدة لهذا اليوم.' : '');
    $table = $rows ? sm_lp_table(['صاحب الأرض', 'النتيجة / الموعد', 'الضيف', 'الحالة'], array_column($rows, 'values')) : '';
    return '<div data-server-league-data="true"><p class="notice">'.sm_lp_escape($note).'</p>'.$table.'</div>';
}
function sm_lp_handle(?callable $standingsLoader = null, ?callable $matchesLoader = null): void {
    @ini_set('display_errors', '0');
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if (!in_array($method, ['GET', 'HEAD'], true)) { http_response_code(405); header('Allow: GET, HEAD'); return; }
    $path = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH);
    if (!is_string($path) || !preg_match('~^/leagues/([a-z0-9-]+)/(?:((?:standings|stats|matches))/)?$~D', $path, $match) || !isset(SM_LP_ROUTES[$match[1]])) { http_response_code(404); return; }
    $slug = $match[1]; $view = $match[2] ?? 'overview';
    $file = __DIR__.'/leagues/'.$slug.'/'.($view === 'overview' ? '' : $view.'/').'index.html';
    $html = @file_get_contents($file);
    if (!is_string($html) || strpos($html, SM_LP_PLACEHOLDER) === false) { http_response_code(503); header('Retry-After: 60'); return; }
    $markup = sm_lp_unavailable();
    try {
        if ($view === 'matches') {
            $day = new DateTimeImmutable('now', new DateTimeZone('Africa/Cairo'));
            $league = SM_LP_ROUTES[$slug][1];
            $result = $matchesLoader ? $matchesLoader($league, $day) : sm_lp_scoreboard($league, $day);
            $markup = sm_lp_matches($result, $day);
        } elseif ($standingsLoader || is_file(__DIR__.'/standings.php')) {
            $league = SM_LP_ROUTES[$slug][0];
            if ($standingsLoader) $result = $standingsLoader($league);
            else {
                require_once __DIR__.'/standings.php';
                $result = sm_st_service($league, time(), sm_source_dir('standings'));
            }
            $markup = sm_lp_standings($result, $view);
        }
    } catch (Throwable $error) { $markup = sm_lp_unavailable(); }
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-cache, max-age=0');
    header('X-Content-Type-Options: nosniff');
    if ($method !== 'HEAD') echo str_replace(SM_LP_PLACEHOLDER, $markup, $html);
}
if (isset($_SERVER['SCRIPT_FILENAME']) && realpath($_SERVER['SCRIPT_FILENAME']) === __FILE__) sm_lp_handle();
