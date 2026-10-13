<?php
/**
 * scoreboard.php — وسيط جدول المباريات عبر خادم الموقع مع تخزين مؤقت وتشخيص للأخطاء
 * ---------------------------------------------------------------------------------
 * يجلب بيانات جدول المباريات من واجهة ESPN العامة نيابةً عن المتصفح لتفادي:
 *  - حظر المتصفح للطلبات العابرة للنطاقات (CORS / أدوات الحماية والخصوصية).
 *  - استنزاف المصدر بطلبات مكررة من كل زائر، عبر تخزين مؤقت على الخادم.
 *  - غموض سبب الفشل، بإرجاع رمز تشخيص واضح (code) في كل استجابة خطأ أو ترويسة.
 */

declare(strict_types=1);

const SITE_ORIGIN     = 'https://streammasterstore.com';
const UPSTREAM_BASE   = 'https://site.api.espn.com/apis/site/v2/sports/soccer';
const CACHE_TTL       = 45;   // صلاحية الكاش الطازج بالثواني (التحديث التلقائي في الصفحة كل 60 ثانية)
const STALE_TTL       = 600;  // صلاحية النسخة الاحتياطية عند تعطل المصدر مؤقتاً (10 دقائق)
const RATE_LIMIT      = 240;  // أقصى عدد طلبات لكل عنوان IP عند غياب الكاش
const RATE_WINDOW     = 60;   // نافذة حساب معدل الطلبات بالثواني
const CONNECT_TIMEOUT = 6;    // مهلة فتح الاتصال بالمصدر بالثواني
const REQUEST_TIMEOUT = 12;   // المهلة الكلية لطلب المصدر بالثواني
const MAX_SPAN_DAYS   = 7;    // أقصى مدى زمني مسموح في معامل dates

const ALLOWED_LEAGUES = [
    'eng.1',
    'esp.1',
    'ita.1',
    'ger.1',
    'fra.1',
    'sau.1',
    'egy.1',
    'uefa.champions',
    'uefa.europa',
    'fifa.worldq.caf',
    'fifa.worldq.uefa',
    'fifa.friendly',
];

// ───────────────────────── الترويسات الأساسية و CORS ─────────────────────────
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin === SITE_ORIGIN || $origin === 'https://www.streammasterstore.com') {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
} else {
    header('Access-Control-Allow-Origin: ' . SITE_ORIGIN);
}
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Accept, Content-Type');
header('Access-Control-Expose-Headers: X-Matches-Cache, X-Cache-Age, X-Diagnostic-Code');
header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex, nofollow');

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'OPTIONS') {
    http_response_code(204);
    exit;
}

/**
 * إنهاء الطلب باستجابة JSON تحمل رمز تشخيص واضح.
 */
function fail_json(int $status, string $code, string $message, array $extra = []): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, no-cache, must-revalidate');
    header('X-Matches-Cache: BYPASS');
    header('X-Diagnostic-Code: ' . $code);
    echo json_encode(array_merge([
        'ok'      => false,
        'code'    => $code,
        'message' => $message,
    ], $extra), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/**
 * إرسال بيانات جدول المباريات مع ترويسات التخزين المؤقت والتشخيص.
 */
function send_scoreboard(string $payload, string $cacheState, int $age, int $maxAge, string $diagnostic = 'OK'): void {
    http_response_code(200);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: public, max-age=' . max(0, $maxAge) . ', stale-while-revalidate=30');
    header('X-Matches-Cache: ' . $cacheState);
    header('X-Cache-Age: ' . max(0, $age));
    header('X-Diagnostic-Code: ' . $diagnostic);
    echo $payload;
    exit;
}

if ($method !== 'GET') {
    fail_json(405, 'METHOD_NOT_ALLOWED', 'الطريقة غير مسموحة؛ يُدعم GET فقط.');
}

// ───────────────────────── التحقق من المدخلات ─────────────────────────
function parse_compact_date(string $ymd): ?int {
    if (!preg_match('/^(\d{4})(\d{2})(\d{2})$/', $ymd, $m)) {
        return null;
    }
    $year  = (int) $m[1];
    $month = (int) $m[2];
    $day   = (int) $m[3];
    if ($year < 2020 || $year > 2035 || !checkdate($month, $day, $year)) {
        return null;
    }
    $ts = gmmktime(12, 0, 0, $month, $day, $year);
    return $ts === false ? null : $ts;
}

function dates_from_day(string $day): ?string {
    if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $day, $m)) {
        return null;
    }
    $year  = (int) $m[1];
    $month = (int) $m[2];
    $d     = (int) $m[3];
    if ($year < 2020 || $year > 2035 || !checkdate($month, $d, $year)) {
        return null;
    }
    $ts = gmmktime(12, 0, 0, $month, $d, $year);
    if ($ts === false) {
        return null;
    }
    return gmdate('Ymd', $ts - 86400) . '-' . gmdate('Ymd', $ts + 86400);
}

function validate_dates(string $dates): ?string {
    if (!preg_match('/^(\d{8})(?:-(\d{8}))?$/', $dates, $m)) {
        return null;
    }
    $start = parse_compact_date($m[1]);
    if ($start === null) {
        return null;
    }
    if (!isset($m[2]) || $m[2] === '') {
        return $m[1];
    }
    $end = parse_compact_date($m[2]);
    if ($end === null || $end < $start) {
        return null;
    }
    if (($end - $start) > MAX_SPAN_DAYS * 86400) {
        return null;
    }
    return $m[1] . '-' . $m[2];
}

$league = trim((string) ($_GET['league'] ?? ''));
if ($league === '' || !in_array($league, ALLOWED_LEAGUES, true)) {
    fail_json(400, 'INVALID_LEAGUE', 'البطولة المطلوبة غير صالحة أو غير مدعومة.', ['league' => $league]);
}

$rawDates = trim((string) ($_GET['dates'] ?? ''));
if ($rawDates === '' && isset($_GET['day'])) {
    $computed = dates_from_day(trim((string) $_GET['day']));
    if ($computed !== null) {
        $rawDates = $computed;
    }
}
$dates = validate_dates($rawDates);
if ($dates === null) {
    fail_json(400, 'INVALID_DATES', 'نطاق التاريخ غير صالح أو خارج المدى المسموح.', ['league' => $league]);
}

// ───────────────────────── التخزين المؤقت وحد المعدل ─────────────────────────
function cache_dir(): string {
    $dir = rtrim(sys_get_temp_dir(), '/\\') . '/smp_scoreboard_cache';
    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }
    return $dir;
}

function read_cache(string $file): ?array {
    if (!is_file($file)) {
        return null;
    }
    $raw = @file_get_contents($file);
    if (!is_string($raw) || $raw === '') {
        return null;
    }
    $data = @json_decode($raw, true);
    if (!is_array($data) || !isset($data['stored_at'], $data['payload']) || !is_string($data['payload'])) {
        return null;
    }
    return $data;
}

function write_cache(string $file, string $league, string $dates, string $payload): void {
    $dir = dirname($file);
    if (!is_dir($dir) || !is_writable($dir)) {
        return;
    }
    $record = json_encode([
        'stored_at' => time(),
        'league'    => $league,
        'dates'     => $dates,
        'payload'   => $payload,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if (!is_string($record)) {
        return;
    }
    $tmp = $file . '.tmp.' . getmypid() . '.' . mt_rand(1000, 9999);
    if (@file_put_contents($tmp, $record, LOCK_EX) !== false) {
        @rename($tmp, $file);
    } else {
        @unlink($tmp);
    }
}

function prune_old_cache(string $dir): void {
    if (mt_rand(1, 50) !== 1 || !is_dir($dir)) {
        return;
    }
    $cutoff = time() - (STALE_TTL * 2);
    foreach ((array) @glob($dir . '/*.{json,lock}', GLOB_BRACE) as $path) {
        if (is_string($path) && is_file($path) && (int) @filemtime($path) < $cutoff) {
            @unlink($path);
        }
    }
}

function rate_limit(): void {
    $ip   = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    $file = rtrim(sys_get_temp_dir(), '/\\') . '/smp_sb_rl_' . md5($ip);
    $now  = time();
    $data = ['t' => $now, 'n' => 0];
    if (is_file($file)) {
        $raw = @json_decode((string) @file_get_contents($file), true);
        if (is_array($raw) && isset($raw['t'], $raw['n']) && ($now - (int) $raw['t']) < RATE_WINDOW) {
            $data = $raw;
        }
    }
    $data['n'] = (int) $data['n'] + 1;
    @file_put_contents($file, json_encode($data), LOCK_EX);
    if ($data['n'] > RATE_LIMIT) {
        header('Retry-After: ' . RATE_WINDOW);
        fail_json(429, 'RATE_LIMITED', 'تم تجاوز الحد المؤقت للطلبات. يرجى المحاولة بعد قليل.');
    }
}

// ───────────────────────── جلب البيانات من المصدر (ESPN) ─────────────────────────
function fetch_upstream(string $url): array {
    $headers = [
        'Accept: application/json',
        'Accept-Language: en-US,en;q=0.9',
    ];
    $userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_PROTOCOLS      => CURLPROTO_HTTPS,
            CURLOPT_CONNECTTIMEOUT => CONNECT_TIMEOUT,
            CURLOPT_TIMEOUT        => REQUEST_TIMEOUT,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_ENCODING       => '',
            CURLOPT_USERAGENT      => $userAgent,
            CURLOPT_HTTPHEADER     => $headers,
        ]);
        $body   = curl_exec($ch);
        $errno  = curl_errno($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($errno !== 0 || !is_string($body)) {
            if ($errno === 28) { // CURLE_OPERATION_TIMEDOUT
                return ['ok' => false, 'http' => 504, 'code' => 'UPSTREAM_TIMEOUT', 'message' => 'انتهت مهلة انتظار رد المصدر (ESPN).'];
            }
            if ($errno === 6) { // CURLE_COULDNT_RESOLVE_HOST
                return ['ok' => false, 'http' => 502, 'code' => 'DNS_LOOKUP_FAILED', 'message' => 'تعذر حل اسم نطاق مصدر المباريات (DNS).'];
            }
            if ($errno === 7) { // CURLE_COULDNT_CONNECT
                return ['ok' => false, 'http' => 502, 'code' => 'UPSTREAM_CONNECT_FAILED', 'message' => 'رفض مصدر المباريات الاتصال أو تعذر الوصول إليه.'];
            }
            if (in_array($errno, [35, 51, 58, 60], true)) {
                return ['ok' => false, 'http' => 502, 'code' => 'UPSTREAM_SSL_ERROR', 'message' => 'فشل التحقق من شهادة الأمان (SSL) مع المصدر.'];
            }
            return ['ok' => false, 'http' => 502, 'code' => 'UPSTREAM_NETWORK_ERROR', 'message' => 'تعذر إتمام الاتصال بالمصدر (cURL ' . $errno . ').'];
        }
    } elseif (filter_var(ini_get('allow_url_fopen'), FILTER_VALIDATE_BOOL)) {
        $context = stream_context_create([
            'http' => [
                'method'        => 'GET',
                'timeout'       => REQUEST_TIMEOUT,
                'ignore_errors' => true,
                'header'        => implode("\r\n", array_merge($headers, ['User-Agent: ' . $userAgent])) . "\r\n",
            ],
            'ssl' => [
                'verify_peer'      => true,
                'verify_peer_name' => true,
            ],
        ]);
        $body = @file_get_contents($url, false, $context);
        $status = 0;
        if (isset($http_response_header) && is_array($http_response_header)) {
            foreach ($http_response_header as $line) {
                if (preg_match('#^HTTP/\S+\s+(\d{3})#', $line, $m)) {
                    $status = (int) $m[1];
                }
            }
        }
        if (!is_string($body) || $status === 0) {
            return ['ok' => false, 'http' => 502, 'code' => 'UPSTREAM_CONNECT_FAILED', 'message' => 'تعذر الاتصال بمصدر المباريات من الخادم.'];
        }
    } else {
        return ['ok' => false, 'http' => 500, 'code' => 'HTTP_CLIENT_UNAVAILABLE', 'message' => 'وسائل الاتصال الخارجي (cURL / allow_url_fopen) غير مفعلة على الخادم.'];
    }

    if ($status === 429) {
        return [
            'ok'              => false,
            'http'            => 503,
            'code'            => 'UPSTREAM_RATE_LIMITED',
            'upstream_status' => 429,
            'message'         => 'رفض المصدر الطلب مؤقتاً بسبب كثرة الطلبات (HTTP 429).',
        ];
    }

    if ($status < 200 || $status >= 300) {
        return [
            'ok'              => false,
            'http'            => $status === 503 ? 503 : 502,
            'code'            => 'UPSTREAM_HTTP_' . $status,
            'upstream_status' => $status,
            'message'         => 'استجاب المصدر برمز خطأ HTTP ' . $status . '.',
        ];
    }

    $decoded = @json_decode($body, true);
    if (!is_array($decoded) || !isset($decoded['events']) || !is_array($decoded['events'])) {
        return [
            'ok'      => false,
            'http'    => 502,
            'code'    => 'UPSTREAM_INVALID_JSON',
            'message' => 'استجابة المصدر لا تحتوي على بنية مباريات صالحة.',
        ];
    }

    return ['ok' => true, 'body' => $body];
}

// ───────────────────────── التنفيذ الرئيسي ─────────────────────────
$dir       = cache_dir();
prune_old_cache($dir);
$cacheKey  = hash('sha256', $league . '|' . $dates);
$cacheFile = $dir . '/' . $cacheKey . '.json';
$lockFile  = $dir . '/' . $cacheKey . '.lock';

// 1) إرجاع فوري إذا كانت النسخة المخبأة طازجة
$cached = read_cache($cacheFile);
if ($cached !== null) {
    $age = max(0, time() - (int) $cached['stored_at']);
    if ($age < CACHE_TTL) {
        send_scoreboard($cached['payload'], 'HIT', $age, CACHE_TTL - $age, 'OK');
    }
}

rate_limit();

// 2) قفل لكل مفتاح لمنع تكرار الطلبات المتزامنة نحو المصدر (Cache Stampede)
$lockFp = @fopen($lockFile, 'c');
if ($lockFp !== false) {
    @flock($lockFp, LOCK_EX);
    $cached = read_cache($cacheFile);
    if ($cached !== null) {
        $age = max(0, time() - (int) $cached['stored_at']);
        if ($age < CACHE_TTL) {
            @flock($lockFp, LOCK_UN);
            @fclose($lockFp);
            send_scoreboard($cached['payload'], 'HIT', $age, CACHE_TTL - $age, 'OK');
        }
    }
}

$upstreamUrl = sprintf('%s/%s/scoreboard?dates=%s&limit=1000', UPSTREAM_BASE, rawurlencode($league), rawurlencode($dates));
$result      = fetch_upstream($upstreamUrl);

if ($result['ok'] === true) {
    write_cache($cacheFile, $league, $dates, $result['body']);
    if ($lockFp !== false) {
        @flock($lockFp, LOCK_UN);
        @fclose($lockFp);
    }
    send_scoreboard($result['body'], 'MISS', 0, CACHE_TTL, 'OK');
}

if ($lockFp !== false) {
    @flock($lockFp, LOCK_UN);
    @fclose($lockFp);
}

// 3) في حال تعطل المصدر مؤقتاً ووجود نسخة مخبأة حديثة نسبياً، نُرجعها مع رمز التشخيص
if ($cached !== null) {
    $age = max(0, time() - (int) $cached['stored_at']);
    if ($age < STALE_TTL) {
        send_scoreboard($cached['payload'], 'STALE', $age, 15, (string) $result['code']);
    }
}

$extra = ['league' => $league];
if (isset($result['upstream_status'])) {
    $extra['upstream_status'] = (int) $result['upstream_status'];
}
fail_json((int) $result['http'], (string) $result['code'], (string) $result['message'], $extra);
