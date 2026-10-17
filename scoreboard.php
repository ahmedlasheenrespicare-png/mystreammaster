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
 *     المفتاح من SM_SPORTSDB_KEY أو ملف الخادم الخاص فقط. نقطة eventsday.php لم تعد
 *     مناسبة لأنها تُرجع 3 مباريات لليوم فقط، وeventsseason.php تُرجع 15 حدثاً فقط للموسم.
 *     لذلك تُجلب الجولة كاملة (eventsround) ثم تُخزَّن كملف لكل جولة، وتُحدَّد الجولة
 *     التي تغطي اليوم المطلوب بالبحث الثنائي على الجولات 1..40.
 *     - الجولات المنتهية تُجمَّد ولا تُعاد طلبها أبداً.
 *     - الجولات الجارية تُحدَّث كل 60 ثانية، والجولات المجدولة كل 900 ثانية، والفارغة كل 3600 ثانية.
 *     - إن تعذّر الجلب تُعاد النسخة المخزنة مع رمز تشخيص ويُوسم الرد بـ STALE.
 *  تُطبَّع الأحداث إلى نفس بنية events (ESPN). أي قيمة غائبة تصير null دون تخمين.
 */

declare(strict_types=1);
require_once __DIR__ . '/lib/espn_source.php';
require_once __DIR__ . '/lib/sportsdb_source.php';

const SITE_ORIGIN        = 'https://streammasterstore.com';

const CACHE_TTL          = 45;   // صلاحية الكاش الطازج بالثواني (التحديث التلقائي في الصفحة كل 60 ثانية)
const STALE_TTL          = 600;  // صلاحية النسخة الاحتياطية عند تعطل المصدر مؤقتاً (10 دقائق)
const RATE_LIMIT         = 240;  // أقصى عدد طلبات لكل عنوان IP عند غياب الكاش
const RATE_WINDOW        = 60;   // نافذة حساب معدل الطلبات بالثواني

const MAX_SPAN_DAYS      = 7;    // أقصى مدى زمني مسموح في معامل dates

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
    $dir = sm_source_dir('scoreboard-responses');
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
    sm_source_write($file, ['stored_at' => time(), 'league' => $league, 'dates' => $dates, 'payload' => $payload]);
}

function prune_old_cache(string $dir): void {
    if (mt_rand(1, 50) !== 1 || !is_dir($dir)) {
        return;
    }
    $cutoff = time() - (STALE_TTL * 2);
    foreach ((array) @glob($dir . '/*.{json,lock}', GLOB_BRACE) as $path) {
        if (is_string($path) && substr($path, -5) === '.json' && is_file($path) && (int) @filemtime($path) < $cutoff) {
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
    $results = sm_espn_days($league, $days);
    foreach ($results as &$res) {
        if ($res['ok']) $res['events'] = $res['payload']['events'];
    }
    unset($res);
    return merge_day_results($days, $results);
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
    $sourceAge  = 0;

    foreach ($days as $ymd) {
        $res = $results[$ymd] ?? null;
        if (!is_array($res) || ($res['ok'] ?? false) !== true) {
            if ($firstError === null && is_array($res)) {
                $firstError = $res;
            }
            continue;
        }
        $sourceAge = max($sourceAge, (int) ($res['age'] ?? 0));
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
    return ['ok' => true, 'body' => $encoded, 'stale_code' => $staleCode, 'age' => $sourceAge];
}

// ───────────────────────── التنفيذ الرئيسي ─────────────────────────
$dir       = cache_dir();
prune_old_cache($dir);
$cacheKey  = hash('sha256', 'v6|' . $league . '|' . $datesKey);
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
    send_scoreboard($result['body'], 'STALE', (int) ($result['age'] ?? 0), 0, (string) $result['stale_code']);
}

$extra = ['league' => $league];
if (isset($result['upstream_status'])) {
    $extra['upstream_status'] = (int) $result['upstream_status'];
}
fail_json((int) $result['http'], (string) $result['code'], (string) $result['message'], $extra);
