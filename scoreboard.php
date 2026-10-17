<?php
/**
 * scoreboard.php — وسيط جدول المباريات عبر خادم الموقع مع تخزين مؤقت وتشخيص للأخطاء
 * ---------------------------------------------------------------------------------
 * المصادر المعتمدة:
 *  1. ESPN Site API v2: للبطولات الأوروبية والدولية (مع تفكيك النطاق الزمني إلى أيام مفردة
 *     dates=YYYYMMDD&limit=500 لأن ESPN أوقفت قبول النطاقات dates=YYYYMMDD-YYYYMMDD).
 *  2. TheSportsDB API v1 (eventsround.php) للدوريين اللذين لا توفرهما ESPN:
 *     - الدوري المصري egy.1 -> 4829 (الدوري المصري الممتاز)
 *     - الدوري السعودي sau.1 -> 4668 (دوري روشن)
 *     المفتاح المجاني 123 (أو SM_SPORTSDB_KEY من بيئة الخادم). نقطة eventsday.php لم تعد
 *     مناسبة لأنها تُرجع 3 مباريات لليوم فقط، وeventsseason.php تُرجع 15 حدثاً فقط للموسم.
 *     لذلك تُجلب الجولة كاملة (eventsround) ثم تُخزَّن كملف لكل جولة، وتُحدَّد الجولة
 *     التي تغطي اليوم المطلوب بالبحث الثنائي على الجولات 1..40.
 *     - الجولات المنتهية تُجمَّد ولا تُعاد طلبها أبداً.
 *     - الجولات الجارية تُحدَّث كل 60 ثانية، والجولات المجدولة كل 900 ثانية، والفارغة كل 3600 ثانية.
 *     - إن تعذّر الجلب تُعاد النسخة المخزنة مع رمز تشخيص ويُوسم الرد بـ STALE.
 *  تُطبَّع الأحداث إلى نفس بنية events (ESPN). أي قيمة غائبة تصير null دون تخمين.
 */

declare(strict_types=1);

const SITE_ORIGIN        = 'https://streammasterstore.com';
const UPSTREAM_BASE      = 'https://site.api.espn.com/apis/site/v2/sports/soccer';
const SPORTSDB_BASE      = 'https://www.thesportsdb.com/api/v1/json';
const SPORTSDB_KEY_DEF   = '123';   // مفتاح TheSportsDB المجاني العام؛ يُستبدل بـ SM_SPORTSDB_KEY عند ضبطه
const UPSTREAM_LIMIT     = 500;  // الحد الأقصى المدعوم من ESPN دون اقتطاع صامت
const CACHE_TTL          = 45;   // صلاحية الكاش الطازج بالثواني (التحديث التلقائي في الصفحة كل 60 ثانية)
const STALE_TTL          = 600;  // صلاحية النسخة الاحتياطية عند تعطل المصدر مؤقتاً (10 دقائق)
const RATE_LIMIT         = 240;  // أقصى عدد طلبات لكل عنوان IP عند غياب الكاش
const RATE_WINDOW        = 60;   // نافذة حساب معدل الطلبات بالثواني
const CONNECT_TIMEOUT    = 6;    // مهلة فتح الاتصال بالمصدر بالثواني
const REQUEST_TIMEOUT    = 12;   // المهلة الكلية لطلب المصدر بالثواني
const MAX_SPAN_DAYS      = 7;    // أقصى مدى زمني مسموح في معامل dates
const ROUND_MAX          = 40;   // أقصى رقم جولة يُبحث عنه في الموسم
const ROUND_TRUNCATE_AT  = 15;   // جولة بهذا العدد أو أكثر تُعدّ مقتطعة من المصدر (UPSTREAM_TRUNCATED)
const ROUND_TTL_LIVE     = 60;   // تحديث الجولة الجارية
const ROUND_TTL_SCHEDULED = 900; // تحديث الجولة المجدولة بالكامل (NS)
const ROUND_TTL_EMPTY    = 3600; // جولة فارغة (ما بعد نهاية الموسم أو لم تُنشر بعد)
const UPSTREAM_UA        = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

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

/** البطولات التي تُجلب من TheSportsDB (eventsround) لعدم توفرها في ESPN -> معرّف TheSportsDB */
const ROUND_LEAGUES = [
    'egy.1' => 4829, // Egyptian Premier League (الدوري المصري الممتاز)
    'sau.1' => 4668, // Saudi-Arabian Pro League (دوري روشن السعودي)
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

// ───────────────────────── التحقق من المدخلات وتفكيك التواريخ ─────────────────────────
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

/**
 * يتحقق من معامل dates ويُرجع مصفوفة الأيام المفردة ['YYYYMMDD', ...] ومفتاح النطاق.
 *
 * @return array{key: string, days: list<string>}|null
 */
function expand_dates(string $dates): ?array {
    if (!preg_match('/^(\d{8})(?:-(\d{8}))?$/', $dates, $m)) {
        return null;
    }
    $start = parse_compact_date($m[1]);
    if ($start === null) {
        return null;
    }
    if (!isset($m[2]) || $m[2] === '' || $m[2] === $m[1]) {
        return ['key' => $m[1], 'days' => [$m[1]]];
    }
    $end = parse_compact_date($m[2]);
    if ($end === null || $end < $start) {
        return null;
    }
    $spanDays = (int) round(($end - $start) / 86400);
    if ($spanDays > MAX_SPAN_DAYS) {
        return null;
    }
    $days = [];
    for ($i = 0; $i <= $spanDays; $i++) {
        $days[] = gmdate('Ymd', $start + ($i * 86400));
    }
    return ['key' => $m[1] . '-' . $m[2], 'days' => $days];
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
$expanded = expand_dates($rawDates);
if ($expanded === null) {
    fail_json(400, 'INVALID_DATES', 'نطاق التاريخ غير صالح أو خارج المدى المسموح.', ['league' => $league]);
}
$datesKey = $expanded['key'];
$dayList  = $expanded['days'];

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

// ───────────────────────── بناء الروابط وتطبيع البيانات ─────────────────────────
function single_day_upstream_url(string $league, string $ymd): string {
    return sprintf('%s/%s/scoreboard?dates=%s&limit=%d', UPSTREAM_BASE, rawurlencode($league), rawurlencode($ymd), UPSTREAM_LIMIT);
}

/**
 * مفتاح TheSportsDB: متغير البيئة SM_SPORTSDB_KEY إن كان بصيغة آمنة، وإلا المفتاح المجاني 123.
 * المفتاح لا يُعاد في أي استجابة أو رسالة خطأ.
 */
function sportsdb_key(): string {
    $env = getenv('SM_SPORTSDB_KEY');
    if (is_string($env)) {
        $env = trim($env);
        if (preg_match('/^[A-Za-z0-9]{1,32}$/', $env)) {
            return $env;
        }
    }
    return SPORTSDB_KEY_DEF;
}

/**
 * يحوّل حدثاً واحداً من TheSportsDB إلى بنية حدث ESPN القياسية.
 */
function normalize_sportsdb_event(array $item): ?array {
    $id   = trim((string) ($item['idEvent'] ?? ''));
    $home = trim((string) ($item['strHomeTeam'] ?? ''));
    $away = trim((string) ($item['strAwayTeam'] ?? ''));
    if ($id === '' || $home === '' || $away === '') {
        return null;
    }

    $rawTs = trim((string) ($item['strTimestamp'] ?? ''));
    if ($rawTs === '') {
        $dateEvent = trim((string) ($item['dateEvent'] ?? ''));
        $strTime   = trim((string) ($item['strTime'] ?? '00:00:00'));
        if ($dateEvent === '') {
            return null;
        }
        if (preg_match('/^\d{2}:\d{2}$/', $strTime)) {
            $strTime .= ':00';
        }
        $rawTs = $dateEvent . 'T' . ($strTime !== '' ? $strTime : '00:00:00');
    }
    if (!preg_match('/(Z|[+-]\d{2}:\d{2})$/i', $rawTs)) {
        $rawTs .= 'Z';
    }
    if (strtotime($rawTs) === false) {
        return null;
    }

    $postponed = strtolower(trim((string) ($item['strPostponed'] ?? 'no'))) === 'yes';
    $rawStatus = strtoupper(trim((string) ($item['strStatus'] ?? 'NS')));

    $state     = 'pre';
    $completed = false;
    $typeName  = 'STATUS_SCHEDULED';
    $clock     = '';

    if ($postponed || in_array($rawStatus, ['PST', 'POST', 'POSTPONED'], true)) {
        $typeName = 'STATUS_POSTPONED';
    } elseif (in_array($rawStatus, ['CANC', 'CAN', 'CANCELED', 'CANCELLED'], true)) {
        $typeName = 'STATUS_CANCELED';
    } elseif (in_array($rawStatus, ['SUSP', 'SUSPENDED', 'INT'], true)) {
        $typeName = 'STATUS_SUSPENDED';
    } elseif (in_array($rawStatus, ['ABD', 'ABANDONED'], true)) {
        $typeName = 'STATUS_ABANDONED';
    } elseif (in_array($rawStatus, ['DELAY', 'DELAYED'], true)) {
        $typeName = 'STATUS_DELAYED';
    } elseif (in_array($rawStatus, ['FT', 'AET', 'PEN', 'FINISHED', 'AFTER EXTRA TIME'], true)) {
        $state     = 'post';
        $completed = true;
        $typeName  = 'STATUS_FULL_TIME';
    } elseif (in_array($rawStatus, ['1H', '2H', 'HT', 'ET', 'BT', 'P', 'LIVE', 'IN'], true) || preg_match('/^\d+\'?$/', $rawStatus)) {
        $state    = 'in';
        $typeName = 'STATUS_IN_PROGRESS';
        $clockMap = [
            'HT' => 'بين الشوطين',
            '1H' => 'الشوط الأول',
            '2H' => 'الشوط الثاني',
            'ET' => 'وقت إضافي',
            'BT' => 'استراحة',
            'P'  => 'ركلات ترجيح',
        ];
        $clock = $clockMap[$rawStatus] ?? (preg_match('/^\d+$/', $rawStatus) ? $rawStatus . '′' : 'مباشر');
    }

    $homeScore = isset($item['intHomeScore']) && $item['intHomeScore'] !== null && $item['intHomeScore'] !== ''
        ? (string) $item['intHomeScore']
        : null;
    $awayScore = isset($item['intAwayScore']) && $item['intAwayScore'] !== null && $item['intAwayScore'] !== ''
        ? (string) $item['intAwayScore']
        : null;

    $homeTeam = ['displayName' => $home];
    if (!empty($item['strHomeTeamBadge']) && is_string($item['strHomeTeamBadge'])) {
        $homeTeam['logo'] = $item['strHomeTeamBadge'];
    }
    $awayTeam = ['displayName' => $away];
    if (!empty($item['strAwayTeamBadge']) && is_string($item['strAwayTeamBadge'])) {
        $awayTeam['logo'] = $item['strAwayTeamBadge'];
    }

    $venue = trim((string) ($item['strVenue'] ?? ''));

    $statusObj = [
        'type' => [
            'state'       => $state,
            'completed'   => $completed,
            'name'        => $typeName,
            'shortDetail' => $clock !== '' ? $clock : $typeName,
        ],
    ];
    if ($clock !== '') {
        $statusObj['displayClock'] = $clock;
    }

    return [
        'id'           => $id,
        'date'         => $rawTs,
        'competitions' => [[
            'id'          => $id,
            'date'        => $rawTs,
            'venue'       => ['fullName' => $venue !== '' ? $venue : null],
            'status'      => $statusObj,
            'competitors' => [
                ['homeAway' => 'home', 'score' => $homeScore, 'team' => $homeTeam],
                ['homeAway' => 'away', 'score' => $awayScore, 'team' => $awayTeam],
            ],
        ]],
    ];
}

/**
 * تصنيف أخطاء النقل (cURL / HTTP) المشتركة. يُرجع null إذا كان النقل سليماً.
 * errno = -2 يعني عدم توفر أي وسيلة اتصال خارجي على الخادم.
 */
function transport_error(int $errno, int $status, ?string $body): ?array {
    if ($errno === -2) {
        return ['ok' => false, 'http' => 500, 'code' => 'HTTP_CLIENT_UNAVAILABLE', 'message' => 'وسائل الاتصال الخارجي (cURL / allow_url_fopen) غير مفعلة على الخادم.'];
    }
    if ($errno !== 0 || !is_string($body)) {
        if ($errno === 28) {
            return ['ok' => false, 'http' => 504, 'code' => 'UPSTREAM_TIMEOUT', 'message' => 'انتهت مهلة انتظار رد المصدر.'];
        }
        if ($errno === 6) {
            return ['ok' => false, 'http' => 502, 'code' => 'DNS_LOOKUP_FAILED', 'message' => 'تعذر حل اسم نطاق مصدر المباريات (DNS).'];
        }
        if ($errno === 7) {
            return ['ok' => false, 'http' => 502, 'code' => 'UPSTREAM_CONNECT_FAILED', 'message' => 'رفض مصدر المباريات الاتصال أو تعذر الوصول إليه.'];
        }
        if (in_array($errno, [35, 51, 58, 60], true)) {
            return ['ok' => false, 'http' => 502, 'code' => 'UPSTREAM_SSL_ERROR', 'message' => 'فشل التحقق من شهادة الأمان (SSL) مع المصدر.'];
        }
        return ['ok' => false, 'http' => 502, 'code' => 'UPSTREAM_NETWORK_ERROR', 'message' => 'تعذر إتمام الاتصال بالمصدر (cURL ' . $errno . ').'];
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
    return null;
}

/**
 * يصنّف رد ESPN (البطولات غير المدعومة من TheSportsDB) ويُرجع events الخام كما هي.
 */
function classify_upstream_response(int $errno, int $status, ?string $body): array {
    $transport = transport_error($errno, $status, $body);
    if ($transport !== null) {
        return $transport;
    }

    $decoded = @json_decode((string) $body, true);
    if (!is_array($decoded) || !array_key_exists('events', $decoded) || !is_array($decoded['events'])) {
        return [
            'ok'      => false,
            'http'    => 502,
            'code'    => 'UPSTREAM_INVALID_JSON',
            'message' => 'استجابة المصدر لا تحتوي على قائمة مباريات صالحة.',
        ];
    }

    return ['ok' => true, 'events' => $decoded['events']];
}

/**
 * طلب HTTP(S) واحد يُرجع errno و status و body. يستخدم cURL، ثم allow_url_fopen احتياطاً.
 *
 * @return array{errno: int, status: int, body: ?string}
 */
function http_get(string $url): array {
    $headers = [
        'Accept: application/json',
        'Accept-Language: en-US,en;q=0.9',
    ];
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
            CURLOPT_USERAGENT      => UPSTREAM_UA,
            CURLOPT_HTTPHEADER     => $headers,
        ]);
        $body   = curl_exec($ch);
        $errno  = curl_errno($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        return ['errno' => $errno, 'status' => $status, 'body' => is_string($body) ? $body : null];
    }
    if (filter_var(ini_get('allow_url_fopen'), FILTER_VALIDATE_BOOL)) {
        $context = stream_context_create([
            'http' => [
                'method'        => 'GET',
                'timeout'       => REQUEST_TIMEOUT,
                'ignore_errors' => true,
                'header'        => implode("\r\n", array_merge($headers, ['User-Agent: ' . UPSTREAM_UA])) . "\r\n",
            ],
            'ssl' => [
                'verify_peer'      => true,
                'verify_peer_name' => true,
            ],
        ]);
        $body   = @file_get_contents($url, false, $context);
        $status = 0;
        if (isset($http_response_header) && is_array($http_response_header)) {
            foreach ($http_response_header as $line) {
                if (preg_match('#^HTTP/\S+\s+(\d{3})#', $line, $m)) {
                    $status = (int) $m[1];
                }
            }
        }
        if (!is_string($body) || $status === 0) {
            return ['errno' => 7, 'status' => 0, 'body' => null];
        }
        return ['errno' => 0, 'status' => $status, 'body' => $body];
    }
    return ['errno' => -2, 'status' => 0, 'body' => null];
}

/**
 * يجلب ESPN أياماً مفردة بالتوازي (curl_multi) ثم يدمج events دون تكرار.
 * TheSportsDB لا يمر من هنا؛ يُعالج عبر مخزن الجولات أدناه.
 *
 * @param list<string> $days
 */
function fetch_espn_days(string $league, array $days): array {
    $headers = [
        'Accept: application/json',
        'Accept-Language: en-US,en;q=0.9',
    ];
    $results = [];

    if (function_exists('curl_multi_init') && count($days) > 1) {
        $mh      = curl_multi_init();
        $handles = [];
        foreach ($days as $ymd) {
            $ch = curl_init(single_day_upstream_url($league, $ymd));
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_FOLLOWLOCATION => false,
                CURLOPT_PROTOCOLS      => CURLPROTO_HTTPS,
                CURLOPT_CONNECTTIMEOUT => CONNECT_TIMEOUT,
                CURLOPT_TIMEOUT        => REQUEST_TIMEOUT,
                CURLOPT_SSL_VERIFYPEER => true,
                CURLOPT_SSL_VERIFYHOST => 2,
                CURLOPT_ENCODING       => '',
                CURLOPT_USERAGENT      => UPSTREAM_UA,
                CURLOPT_HTTPHEADER     => $headers,
            ]);
            curl_multi_add_handle($mh, $ch);
            $handles[$ymd] = $ch;
        }
        $active = null;
        do {
            $mrc = curl_multi_exec($mh, $active);
            if ($active) {
                curl_multi_select($mh, 0.2);
            }
        } while ($active && $mrc === CURLM_OK);

        foreach ($handles as $ymd => $ch) {
            $body   = curl_multi_getcontent($ch);
            $errno  = curl_errno($ch);
            $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_multi_remove_handle($mh, $ch);
            curl_close($ch);
            $results[$ymd] = classify_upstream_response($errno, $status, is_string($body) ? $body : null);
        }
        curl_multi_close($mh);
    } else {
        foreach ($days as $ymd) {
            $resp = http_get(single_day_upstream_url($league, $ymd));
            $results[$ymd] = classify_upstream_response($resp['errno'], $resp['status'], $resp['body']);
        }
    }

    return merge_day_results($days, $results);
}

// ───────────────────────── مخزن جولات TheSportsDB ─────────────────────────
/**
 * مجلد تخزين الجولات: SM_DATA_DIR إن ضُبط، وإلا مجلد النظام المؤقت.
 * يُفضّل ضبطه خارج public_html ليبقى عبر إعادة تشغيل الخادم.
 */
function round_store_dir(): string {
    $env  = getenv('SM_DATA_DIR');
    $base = (is_string($env) && trim($env) !== '')
        ? rtrim(trim($env), '/\\')
        : rtrim(sys_get_temp_dir(), '/\\');
    $dir = $base . '/smp_sportsdb_rounds';
    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }
    return $dir;
}

/** موسم TheSportsDB بصيغة 2026-2027 يُحدَّد من تاريخ اليوم المطلوب (الموسم يبدأ تقريباً في يوليو). */
function season_label(string $iso): string {
    $y = (int) substr($iso, 0, 4);
    $m = (int) substr($iso, 5, 2);
    return $m >= 7 ? $y . '-' . ($y + 1) : ($y - 1) . '-' . $y;
}

/** اليوم بتوقيت UTC (Y-m-d) لحدث مُطبَّع، أو null. */
function event_utc_day(array $event): ?string {
    $date = $event['date'] ?? null;
    if (!is_string($date)) {
        return null;
    }
    $ts = strtotime($date);
    return $ts === false ? null : gmdate('Y-m-d', $ts);
}

/**
 * سياسة التحديث لجولة: فارغة، أو مجمّدة (منتهية)، أو جارية، أو مجدولة.
 * الأحداث الملغاة أو المؤجلة لا تُحسب ضمن "المنتهية" و"الجارية".
 *
 * @return array{ttl: int, frozen: bool}
 */
function round_policy(array $events, int $now): array {
    if (count($events) === 0) {
        return ['ttl' => ROUND_TTL_EMPTY, 'frozen' => false];
    }
    $neutral   = ['STATUS_POSTPONED', 'STATUS_CANCELED', 'STATUS_ABANDONED'];
    $live      = ['STATUS_SUSPENDED', 'STATUS_DELAYED'];
    $active    = 0;
    $allDone   = true;
    $inPlay    = false;
    $latestTs  = 0;
    foreach ($events as $ev) {
        $type = $ev['competitions'][0]['status']['type'] ?? [];
        $name = (string) ($type['name'] ?? '');
        if (in_array($name, $neutral, true)) {
            continue;
        }
        $active++;
        if (empty($type['completed'])) {
            $allDone = false;
        }
        if (in_array($type['state'] ?? '', ['in', 'post'], true) || in_array($name, $live, true)) {
            $inPlay = true;
        }
        $ts = strtotime((string) ($ev['date'] ?? ''));
        if ($ts !== false && $ts > $latestTs) {
            $latestTs = $ts;
        }
    }
    if ($active === 0) {
        return ['ttl' => ROUND_TTL_SCHEDULED, 'frozen' => false];
    }
    // التجميد يتطلب مرور يومين على آخر مباراة مجدولة، حماية من جولة لم تكتمل قائمتها بعد
    if ($allDone && ($now - $latestTs) > 2 * 86400) {
        return ['ttl' => 0, 'frozen' => true];
    }
    if ($inPlay || $allDone) {
        return ['ttl' => ROUND_TTL_LIVE, 'frozen' => false];
    }
    return ['ttl' => ROUND_TTL_SCHEDULED, 'frozen' => false];
}

function read_round_record(string $file): ?array {
    if (!is_file($file)) {
        return null;
    }
    $raw = @file_get_contents($file);
    if (!is_string($raw) || $raw === '') {
        return null;
    }
    $data = @json_decode($raw, true);
    if (!is_array($data) || !isset($data['checked_at'], $data['fetched_at'], $data['events']) || !is_array($data['events'])) {
        return null;
    }
    return $data;
}

function write_round_record(string $file, array $record): void {
    $encoded = json_encode($record, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if (!is_string($encoded)) {
        return;
    }
    $tmp = $file . '.tmp.' . getmypid() . '.' . mt_rand(1000, 9999);
    if (@file_put_contents($tmp, $encoded, LOCK_EX) !== false) {
        @rename($tmp, $file);
    } else {
        @unlink($tmp);
    }
}

function round_is_fresh(array $record, int $now): bool {
    if (!empty($record['frozen'])) {
        return true;
    }
    return ($now - (int) $record['checked_at']) < (int) ($record['ttl'] ?? 0);
}

/**
 * يجلب جولة واحدة من TheSportsDB (eventsround.php) ويطبّعها.
 * الجولة الفارغة (events: null) تُعاد كقائمة فارغة وليست خطأ.
 *
 * @return array{ok: true, events: list<array>}|array<string, mixed>
 */
function fetch_round(string $league, string $season, int $round): array {
    $url = sprintf(
        '%s/%s/eventsround.php?id=%d&r=%d&s=%s',
        SPORTSDB_BASE,
        sportsdb_key(),
        ROUND_LEAGUES[$league],
        $round,
        rawurlencode($season)
    );
    $resp = http_get($url);
    $transport = transport_error($resp['errno'], $resp['status'], $resp['body']);
    if ($transport !== null) {
        return $transport;
    }

    $decoded = @json_decode((string) $resp['body'], true);
    if (!is_array($decoded) || !array_key_exists('events', $decoded)) {
        return ['ok' => false, 'http' => 502, 'code' => 'UPSTREAM_INVALID_JSON', 'message' => 'استجابة المصدر البديل لا تحتوي على بنية مباريات صالحة.'];
    }
    $raw = $decoded['events'] ?? [];
    if (!is_array($raw)) {
        return ['ok' => false, 'http' => 502, 'code' => 'UPSTREAM_INVALID_JSON', 'message' => 'استجابة المصدر البديل لا تحتوي على قائمة مباريات صالحة.'];
    }
    if (count($raw) >= ROUND_TRUNCATE_AT) {
        return ['ok' => false, 'http' => 502, 'code' => 'UPSTREAM_TRUNCATED', 'message' => 'الجولة المُعادة من المصدر قد تكون مقتطعة؛ رُفضت حفاظاً على دقة الجدول.'];
    }

    $events = [];
    foreach ($raw as $item) {
        if (is_array($item)) {
            $ev = normalize_sportsdb_event($item);
            if ($ev !== null) {
                $events[] = $ev;
            }
        }
    }
    return ['ok' => true, 'events' => $events];
}

/**
 * يُرجع جولة من المخزن إن كانت طازجة، وإلا يجلبها. عند تعذّر الجلب يُعاد المخزون مع رمز الخطأ.
 *
 * @return array{ok: true, events: list<array>, stale_code: ?string}|array<string, mixed>
 */
function load_round(string $league, string $season, int $round): array {
    $file = round_store_dir() . '/' . ROUND_LEAGUES[$league] . '-' . $season . '-r' . $round . '.json';
    $now  = time();
    $rec  = read_round_record($file);

    if ($rec !== null && round_is_fresh($rec, $now)) {
        return ['ok' => true, 'events' => $rec['events'], 'stale_code' => $rec['error'] ?? null];
    }

    $fetched = fetch_round($league, $season, $round);
    if (($fetched['ok'] ?? false) === true) {
        $policy = round_policy($fetched['events'], $now);
        write_round_record($file, [
            'checked_at' => $now,
            'fetched_at' => $now,
            'ttl'        => $policy['ttl'],
            'frozen'     => $policy['frozen'],
            'error'      => null,
            'events'     => $fetched['events'],
        ]);
        return ['ok' => true, 'events' => $fetched['events'], 'stale_code' => null];
    }

    if ($rec !== null) {
        // تعذّر الجلب: نُعيد المخزون، ونؤجّل المحاولة التالية حسب سياسة الجولة (لا نُغرق المصدر بالطلبات)
        $isLive  = (int) ($rec['ttl'] ?? 0) === ROUND_TTL_LIVE;
        $age     = $now - (int) $rec['fetched_at'];
        if (!$isLive || $age < STALE_TTL) {
            $rec['checked_at'] = $now;
            $rec['error']      = (string) $fetched['code'];
            write_round_record($file, $rec);
            return ['ok' => true, 'events' => $rec['events'], 'stale_code' => (string) $fetched['code']];
        }
    }
    return $fetched;
}

/** جولات حُمّلت في الطلب الحالي؛ تمنع تكرار قراءة الجولة نفسها أثناء البحث الثنائي. */
function load_round_memo(string $league, string $season, int $round): array {
    static $memo = [];
    $key = $league . '|' . $season . '|' . $round;
    if (!isset($memo[$key])) {
        $memo[$key] = load_round($league, $season, $round);
    }
    return $memo[$key];
}

/**
 * يُرجع مباريات يوم UTC واحد (ISO Y-m-d) من الجولة التي تغطيه، عبر بحث ثنائي على أرقام الجولات.
 * - جولة فارغة = ما بعد نهاية الموسم، فيُبحث في الأدنى.
 * - إن لم تغطِّ أي جولة اليوم فلا مباريات في ذلك اليوم.
 *
 * @return array{ok: true, events: list<array>, stale_code: ?string}|array<string, mixed>
 */
function round_day_events(string $league, string $iso): array {
    $season    = season_label($iso);
    $lo        = 1;
    $hi        = ROUND_MAX;
    $staleCode = null;

    while ($lo <= $hi) {
        $mid = intdiv($lo + $hi, 2);
        $res = load_round_memo($league, $season, $mid);
        if (($res['ok'] ?? false) !== true) {
            return $res;
        }
        if ($staleCode === null && $res['stale_code'] !== null) {
            $staleCode = $res['stale_code'];
        }
        $events = $res['events'];
        if (count($events) === 0) {
            $hi = $mid - 1;
            continue;
        }
        $minDay = null;
        $maxDay = null;
        foreach ($events as $ev) {
            $d = event_utc_day($ev);
            if ($d === null) {
                continue;
            }
            $minDay = $minDay === null || $d < $minDay ? $d : $minDay;
            $maxDay = $maxDay === null || $d > $maxDay ? $d : $maxDay;
        }
        if ($minDay === null) {
            return ['ok' => true, 'events' => [], 'stale_code' => $staleCode];
        }
        if ($iso < $minDay) {
            $hi = $mid - 1;
        } elseif ($iso > $maxDay) {
            $lo = $mid + 1;
        } else {
            $dayEvents = array_values(array_filter($events, static fn(array $ev): bool => event_utc_day($ev) === $iso));
            return ['ok' => true, 'events' => $dayEvents, 'stale_code' => $staleCode];
        }
    }
    return ['ok' => true, 'events' => [], 'stale_code' => $staleCode];
}

/**
 * يجلب أياماً مفردة من المصدر المناسب ثم يدمج مصفوفة events دون تكرار.
 *
 * @param list<string> $days
 */
function fetch_upstream_days(string $league, array $days): array {
    if (isset(ROUND_LEAGUES[$league])) {
        $results = [];
        foreach ($days as $ymd) {
            $iso = substr($ymd, 0, 4) . '-' . substr($ymd, 4, 2) . '-' . substr($ymd, 6, 2);
            $results[$ymd] = round_day_events($league, $iso);
        }
        return merge_day_results($days, $results);
    }
    return fetch_espn_days($league, $days);
}

/**
 * يدمج نتائج الأيام المفردة في مصفوفة events واحدة دون تكرار، ويُرجع أول خطأ إن وُجد.
 * إن كانت إحدى النتائج معتمدة على نسخة مخزنة بعد تعذّر الجلب يُعاد stale_code.
 *
 * @param list<string> $days
 */
function merge_day_results(array $days, array $results): array {
    $events     = [];
    $seenIds    = [];
    $firstError = null;
    $staleCode  = null;

    foreach ($days as $ymd) {
        $res = $results[$ymd] ?? null;
        if (!is_array($res) || ($res['ok'] ?? false) !== true) {
            if ($firstError === null && is_array($res)) {
                $firstError = $res;
            }
            continue;
        }
        if ($staleCode === null && isset($res['stale_code']) && is_string($res['stale_code'])) {
            $staleCode = $res['stale_code'];
        }
        foreach ($res['events'] as $event) {
            if (!is_array($event)) {
                continue;
            }
            $id = isset($event['id']) ? (string) $event['id'] : '';
            if ($id !== '') {
                if (isset($seenIds[$id])) {
                    continue;
                }
                $seenIds[$id] = true;
            }
            $events[] = $event;
        }
    }

    if ($firstError !== null) {
        return $firstError;
    }

    $encoded = json_encode(['events' => $events], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if (!is_string($encoded)) {
        return ['ok' => false, 'http' => 502, 'code' => 'UPSTREAM_INVALID_JSON', 'message' => 'تعذر ترميز بيانات المباريات.'];
    }
    return ['ok' => true, 'body' => $encoded, 'stale_code' => $staleCode];
}

// ───────────────────────── التنفيذ الرئيسي ─────────────────────────
$dir       = cache_dir();
prune_old_cache($dir);
$cacheKey  = hash('sha256', 'v5|' . $league . '|' . $datesKey);
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

$result = fetch_upstream_days($league, $dayList);

// الكتابة تسبق فك القفل حتى لا يعيد طلب آخر الجلب في الفجوة بين الكتابة والفك
$isFresh = $result['ok'] === true && empty($result['stale_code']);
if ($isFresh) {
    write_cache($cacheFile, $league, $datesKey, $result['body']);
}
if ($lockFp !== false) {
    @flock($lockFp, LOCK_UN);
    @fclose($lockFp);
}

if ($isFresh) {
    send_scoreboard($result['body'], 'MISS', 0, CACHE_TTL, 'OK');
}

// 3a) الجولة المخزنة أُعيدت بعد تعذّر الجلب: نُرجعها موسومة STALE ولا نكتبها كنسخة طازجة
if ($result['ok'] === true) {
    send_scoreboard($result['body'], 'STALE', 0, 15, (string) $result['stale_code']);
}

// 3b) في حال تعطل المصدر ووجود نسخة مخبأة حديثة نسبياً، نُرجعها مع رمز التشخيص
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
