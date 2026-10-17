<?php
/**
 * scoreboard.php — وسيط جدول المباريات عبر خادم الموقع مع تخزين مؤقت وتشخيص للأخطاء
 * ---------------------------------------------------------------------------------
 * المصادر المعتمدة:
 *  1. ESPN Site API v2: للبطولات الأوروبية والدولية (مع تفكيك النطاق الزمني إلى أيام مفردة
 *     dates=YYYYMMDD&limit=500 لأن ESPN أوقفت قبول النطاقات dates=YYYYMMDD-YYYYMMDD).
 *  2. TheSportsDB API v1: للدوري السعودي (sau.1 -> 4668) لأن نقطة نهاية ESPN لا توفّره
 *     وتردّ عليه بـ HTTP 400. تُطبّع استجابة TheSportsDB إلى نفس بنية events المعتمدة في الواجهة.
 *  3. Highlightly Football API (soccer.highlightly.net/matches) للدوري المصري (egy.1 -> leagueId 199067).
 *     حلّ TheSportsDB محله لأن مفتاحه المجاني "3" أُوقف من المصدر. تُطبَّع استجابته
 *     إلى نفس بنية events (ESPN) دون تخمين: أي قيمة غائبة تصير null.
 *     المفتاح يُقرأ من الخادم فقط: متغير البيئة SM_HIGHLIGHTLY_KEY ثم
 *     <المجلد الأب لـ public_html>/SM_HIGHLIGHTLY_KEY/key.txt، ويُرسل في ترويسة x-rapidapi-key.
 */

declare(strict_types=1);

const SITE_ORIGIN       = 'https://streammasterstore.com';
const UPSTREAM_BASE     = 'https://site.api.espn.com/apis/site/v2/sports/soccer';
const SPORTSDB_DAY_URL  = 'https://www.thesportsdb.com/api/v1/json/3/eventsday.php';
const UPSTREAM_LIMIT    = 500;  // الحد الأقصى المدعوم من ESPN دون اقتطاع صامت
const CACHE_TTL         = 45;   // صلاحية الكاش الطازج بالثواني (التحديث التلقائي في الصفحة كل 60 ثانية)
const STALE_TTL         = 600;  // صلاحية النسخة الاحتياطية عند تعطل المصدر مؤقتاً (10 دقائق)
const RATE_LIMIT        = 240;  // أقصى عدد طلبات لكل عنوان IP عند غياب الكاش
const RATE_WINDOW       = 60;   // نافذة حساب معدل الطلبات بالثواني
const CONNECT_TIMEOUT   = 6;    // مهلة فتح الاتصال بالمصدر بالثواني
const REQUEST_TIMEOUT   = 12;   // المهلة الكلية لطلب المصدر بالثواني
const MAX_SPAN_DAYS     = 7;    // أقصى مدى زمني مسموح في معامل dates

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

/** البطولات التي تُجلب من TheSportsDB لعدم توفرها في ESPN */
const SPORTSDB_LEAGUES = [
    'sau.1' => '4668', // Saudi-Arabian Pro League (دوري روشن السعودي)
];

/**
 * البطولات التي تُجلب من Highlightly (soccer.highlightly.net/matches).
 * المعرّف ومنطقة التوقيت مأخوذان من مسبار 2026-10-17 (standings-probe-report.json)
 * ومن توثيق المصدر؛ الخطة المجانية Basic = 100 طلب/يوم، والمفتاح يُقرأ من الخادم فقط.
 */
const HIGHLIGHTLY_MATCHES_URL = 'https://soccer.highlightly.net/matches';
const HIGHLIGHTLY_LEAGUES = [
    'egy.1' => ['leagueId' => 199067, 'timezone' => 'Africa/Cairo'], // الدوري المصري الممتاز
];
const HIGHLIGHTLY_PAGE_LIMIT = 100; // الحد الافتراضي للمصدر عند غياب limit
const HIGHLIGHTLY_MAX_PAGES  = 3;   // سقف صفحات لكل يوم، لحماية زمن التنفيذ وحصة الطلبات

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
    if (isset(SPORTSDB_LEAGUES[$league])) {
        $isoDay = substr($ymd, 0, 4) . '-' . substr($ymd, 4, 2) . '-' . substr($ymd, 6, 2);
        return sprintf('%s?d=%s&l=%s', SPORTSDB_DAY_URL, rawurlencode($isoDay), rawurlencode(SPORTSDB_LEAGUES[$league]));
    }
    return sprintf('%s/%s/scoreboard?dates=%s&limit=%d', UPSTREAM_BASE, rawurlencode($league), rawurlencode($ymd), UPSTREAM_LIMIT);
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
            'venue'       => ['fullName' => trim((string) ($item['strVenue'] ?? ''))],
            'status'      => $statusObj,
            'competitors' => [
                ['homeAway' => 'home', 'score' => $homeScore, 'team' => $homeTeam],
                ['homeAway' => 'away', 'score' => $awayScore, 'team' => $awayTeam],
            ],
        ]],
    ];
}

/**
 * مفتاح Highlightly: متغير البيئة أولاً، ثم ملف على الخادم خارج جذر الموقع.
 * الملف: <المجلد الأب لـ public_html>/SM_HIGHLIGHTLY_KEY/key.txt (سطر واحد: المفتاح).
 * مطابق لطريقة standings.php؛ لا يُقرأ من المستودع ولا يُعاد في أي استجابة أو سجل.
 */
function highlightly_key(): ?string {
    $env = getenv('SM_HIGHLIGHTLY_KEY');
    if (is_string($env) && trim($env) !== '') {
        return trim($env);
    }
    $root = isset($_SERVER['DOCUMENT_ROOT']) ? rtrim((string) $_SERVER['DOCUMENT_ROOT'], '/\\') : '';
    if ($root === '') {
        return null;
    }
    $file = dirname($root) . '/SM_HIGHLIGHTLY_KEY/key.txt';
    if (!is_file($file) || !is_readable($file)) {
        return null;
    }
    $value = trim((string) @file_get_contents($file));
    return $value !== '' ? $value : null;
}

/** نص غير فارغ من قيمة مصدر، أو null إن لم تكن نصاً صالحاً. */
function highlightly_text($value): ?string {
    if (!is_string($value)) {
        return null;
    }
    $text = trim($value);
    return $text !== '' ? $text : null;
}

/** معرّف رقمي/نصي من المصدر كنص، أو null. */
function highlightly_id($value): ?string {
    if (is_int($value) && $value > 0) {
        return (string) $value;
    }
    if (is_string($value) && preg_match('/^[1-9]\d{0,17}$/', trim($value))) {
        return trim($value);
    }
    return null;
}

/**
 * يحوّل حالة Highlightly (state.description) إلى حالة ESPN التي تفهمها الواجهة.
 * الجدول مأخوذ من توثيق المصدر؛ أي حالة غير معروفة تصير STATUS_UNKNOWN ولا تُخمَّن.
 *
 * @return array{state: string, completed: bool, name: string, label: string, minuteBased: bool}
 */
function highlightly_status(?string $description): array {
    $map = [
        'Not started'               => ['pre',  false, 'STATUS_SCHEDULED',   '',                  false],
        'To be announced'           => ['pre',  false, 'STATUS_SCHEDULED',   '',                  false],
        'First half'                => ['in',   false, 'STATUS_IN_PROGRESS', 'الشوط الأول',       true],
        'Second half'               => ['in',   false, 'STATUS_IN_PROGRESS', 'الشوط الثاني',      true],
        'Half time'                 => ['in',   false, 'STATUS_IN_PROGRESS', 'بين الشوطين',       false],
        'Break time'                => ['in',   false, 'STATUS_IN_PROGRESS', 'استراحة',           false],
        'Extra time'                => ['in',   false, 'STATUS_IN_PROGRESS', 'وقت إضافي',         true],
        'Penalties'                 => ['in',   false, 'STATUS_IN_PROGRESS', 'ركلات ترجيح',       false],
        'In progress'               => ['in',   false, 'STATUS_IN_PROGRESS', 'مباشر',             false],
        'Finished'                  => ['post', true,  'STATUS_FULL_TIME',   '',                  false],
        'Finished after extra time' => ['post', true,  'STATUS_FULL_TIME',   '',                  false],
        'Finished after penalties'  => ['post', true,  'STATUS_FULL_TIME',   '',                  false],
        'Awarded'                   => ['post', true,  'STATUS_FORFEIT',     '',                  false],
        'Postponed'                 => ['pre',  false, 'STATUS_POSTPONED',   '',                  false],
        'Cancelled'                 => ['pre',  false, 'STATUS_CANCELED',    '',                  false],
        'Suspended'                 => ['pre',  false, 'STATUS_SUSPENDED',   '',                  false],
        'Interrupted'               => ['pre',  false, 'STATUS_SUSPENDED',   '',                  false],
        'Abandoned'                 => ['pre',  false, 'STATUS_ABANDONED',   '',                  false],
    ];
    if ($description !== null && isset($map[$description])) {
        [$state, $completed, $name, $label, $minuteBased] = $map[$description];
        return ['state' => $state, 'completed' => $completed, 'name' => $name, 'label' => $label, 'minuteBased' => $minuteBased];
    }
    return ['state' => 'pre', 'completed' => false, 'name' => 'STATUS_UNKNOWN', 'label' => '', 'minuteBased' => false];
}

/**
 * يحوّل مباراة واحدة من Highlightly إلى بنية حدث ESPN القياسية (events ← competitions ← competitors).
 * لا يُصلح ولا يُخمّن: القيمة الغائبة تصير null، والمباراة التي يغيب معرّفها أو اسم أحد فريقيها
 * أو تاريخها تُستبعد. الحقول المأخوذة من التوثيق فقط؛ المصدر لا يرسل ملعباً فيُرجَّع venue.fullName = null.
 */
function highlightly_normalize_match(array $item, int $leagueId): ?array {
    $league = $item['league'] ?? null;
    if (!is_array($league) || (int) ($league['id'] ?? 0) !== $leagueId) {
        return null;
    }
    $id       = highlightly_id($item['id'] ?? null);
    $homeRaw  = is_array($item['homeTeam'] ?? null) ? $item['homeTeam'] : null;
    $awayRaw  = is_array($item['awayTeam'] ?? null) ? $item['awayTeam'] : null;
    $homeName = $homeRaw !== null ? highlightly_text($homeRaw['name'] ?? null) : null;
    $awayName = $awayRaw !== null ? highlightly_text($awayRaw['name'] ?? null) : null;
    $rawDate  = highlightly_text($item['date'] ?? null);
    if ($id === null || $homeName === null || $awayName === null || $rawDate === null) {
        return null;
    }
    if (!preg_match('/(Z|[+-]\d{2}:\d{2})$/i', $rawDate)) {
        $rawDate .= 'Z';
    }
    if (strtotime($rawDate) === false) {
        return null;
    }

    $state      = is_array($item['state'] ?? null) ? $item['state'] : [];
    $description = highlightly_text($state['description'] ?? null);
    $status     = highlightly_status($description);
    $clockRaw   = $state['clock'] ?? null;
    $minute     = is_int($clockRaw) && $clockRaw >= 0 ? $clockRaw : null;

    $homeScore = null;
    $awayScore = null;
    $current   = highlightly_text(is_array($state['score'] ?? null) ? ($state['score']['current'] ?? null) : null);
    if ($current !== null && preg_match('/^(\d{1,3})\s*-\s*(\d{1,3})$/', $current, $m)) {
        $homeScore = $m[1];
        $awayScore = $m[2];
    }

    $statusObj = [
        'type' => [
            'state'       => $status['state'],
            'completed'   => $status['completed'],
            'name'        => $status['name'],
            'shortDetail' => $status['label'] !== '' ? $status['label'] : ($description ?? $status['name']),
        ],
    ];
    if ($status['state'] === 'in') {
        if ($status['minuteBased'] && $minute !== null) {
            $statusObj['displayClock'] = $minute . '′';
        } elseif ($status['label'] !== '') {
            $statusObj['displayClock'] = $status['label'];
        }
    }

    $teamFor = static function (array $raw, string $name): array {
        $team = ['displayName' => $name];
        $teamId = highlightly_id($raw['id'] ?? null);
        if ($teamId !== null) {
            $team['id'] = $teamId;
        }
        $logo = highlightly_text($raw['logo'] ?? null);
        if ($logo !== null && strncmp($logo, 'https://', 8) === 0) {
            $team['logo'] = $logo;
        }
        return $team;
    };

    return [
        'id'           => $id,
        'date'         => $rawDate,
        'competitions' => [[
            'id'          => $id,
            'date'        => $rawDate,
            'venue'       => ['fullName' => null],
            'status'      => $statusObj,
            'competitors' => [
                ['homeAway' => 'home', 'score' => $homeScore, 'team' => $teamFor($homeRaw, $homeName)],
                ['homeAway' => 'away', 'score' => $awayScore, 'team' => $teamFor($awayRaw, $awayName)],
            ],
        ]],
    ];
}

/**
 * يحلّل جسم استجابة يوم واحد من Highlightly ({data: [...], pagination: {totalCount}}).
 * يُرجع events بالبنية الموحدة مع عدد العناصر المستلمة وإجماليها لدعم الصفحات.
 */
function highlightly_parse_day_body(string $league, string $body): array {
    $decoded = json_decode($body, true, 64);
    if (!is_array($decoded) || !isset($decoded['data']) || !is_array($decoded['data'])) {
        return ['ok' => false, 'http' => 502, 'code' => 'UPSTREAM_INVALID_JSON', 'message' => 'استجابة المصدر لا تحتوي على قائمة مباريات صالحة.'];
    }
    $leagueId = (int) HIGHLIGHTLY_LEAGUES[$league]['leagueId'];
    $rows     = $decoded['data'];
    $events   = [];
    foreach ($rows as $item) {
        if (!is_array($item)) {
            continue;
        }
        $event = highlightly_normalize_match($item, $leagueId);
        if ($event !== null) {
            $events[] = $event;
        }
    }
    if (count($rows) > 0 && count($events) === 0) {
        // كل الصفوف غير قابلة للقراءة بالعقد الموثّق: الشكل تغيّر، لا نعرض شيئاً مختلقاً
        return ['ok' => false, 'http' => 502, 'code' => 'UPSTREAM_SCHEMA_CHANGED', 'message' => 'تغيّر شكل استجابة المصدر ولم تُقرأ أي مباراة منه.'];
    }
    $total = null;
    $pagination = $decoded['pagination'] ?? null;
    if (is_array($pagination) && isset($pagination['totalCount']) && is_int($pagination['totalCount'])) {
        $total = $pagination['totalCount'];
    }
    return ['ok' => true, 'events' => $events, 'received' => count($rows), 'total' => $total];
}

/**
 * يجلب مباريات يوم واحد من Highlightly (مع الصفحات عند الحاجة) ويُرجع نفس شكل نتيجة classify_upstream_response.
 */
function highlightly_fetch_day(string $league, string $ymd): array {
    $key = highlightly_key();
    if ($key === null) {
        return ['ok' => false, 'http' => 503, 'code' => 'UPSTREAM_KEY_MISSING', 'message' => 'مفتاح مصدر المواعيد غير مُهيّأ على الخادم.'];
    }
    if (!function_exists('curl_init')) {
        return ['ok' => false, 'http' => 500, 'code' => 'HTTP_CLIENT_UNAVAILABLE', 'message' => 'وسائل الاتصال الخارجي (cURL) غير مفعلة على الخادم.'];
    }
    $config   = HIGHLIGHTLY_LEAGUES[$league];
    $isoDay   = substr($ymd, 0, 4) . '-' . substr($ymd, 4, 2) . '-' . substr($ymd, 6, 2);
    $events   = [];
    $offset   = 0;
    $seen     = [];

    for ($page = 0; $page < HIGHLIGHTLY_MAX_PAGES; $page++) {
        $url = HIGHLIGHTLY_MATCHES_URL
            . '?leagueId=' . (int) $config['leagueId']
            . '&date=' . rawurlencode($isoDay)
            . '&timezone=' . rawurlencode($config['timezone'])
            . '&limit=' . HIGHLIGHTLY_PAGE_LIMIT
            . '&offset=' . $offset;
        $ch = curl_init($url);
        if ($ch === false) {
            return ['ok' => false, 'http' => 502, 'code' => 'UPSTREAM_NETWORK_ERROR', 'message' => 'تعذر تهيئة الاتصال بالمصدر.'];
        }
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_PROTOCOLS      => CURLPROTO_HTTPS,
            CURLOPT_CONNECTTIMEOUT => CONNECT_TIMEOUT,
            CURLOPT_TIMEOUT        => REQUEST_TIMEOUT,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_ENCODING       => '',
            CURLOPT_USERAGENT      => 'StreamMaster-Scoreboard/1.0',
            CURLOPT_HTTPHEADER     => ['Accept: application/json', 'x-rapidapi-key: ' . $key],
        ]);
        $body   = curl_exec($ch);
        $errno  = curl_errno($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        // لا تُمرَّر أي معلومة عن المفتاح إلى الاستجابة أو السجل: الرسائل ثابتة من الكود
        $res = classify_upstream_response($league, $errno, $status, is_string($body) ? $body : null);
        if (($res['ok'] ?? false) !== true) {
            return $res;
        }
        foreach ($res['events'] as $event) {
            $id = (string) $event['id'];
            if (!isset($seen[$id])) {
                $seen[$id] = true;
                $events[]  = $event;
            }
        }
        $received = (int) $res['received'];
        $total    = $res['total'];
        $offset  += $received;
        // إن أعلن المصدر الإجمالي نتابع حتى نبلغه؛ وإن غاب الإجمالي نتابع فقط إذا امتلأت الصفحة
        $more = $total !== null ? ($offset < $total) : ($received >= HIGHLIGHTLY_PAGE_LIMIT);
        if ($received === 0 || !$more) {
            return ['ok' => true, 'events' => $events];
        }
    }
    // تجاوزنا سقف الصفحات والمصدر ما زال يعلن المزيد: لا نُكمل صامتاً بنتيجة ناقصة
    return ['ok' => false, 'http' => 502, 'code' => 'UPSTREAM_PAGE_LIMIT', 'message' => 'عدد المباريات في هذا اليوم يتجاوز ما يمكن جلبه من المصدر.'];
}

function classify_upstream_response(string $league, int $errno, int $status, ?string $body): array {
    $isSportsDb = isset(SPORTSDB_LEAGUES[$league]);

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

    if (isset(HIGHLIGHTLY_LEAGUES[$league])) {
        return highlightly_parse_day_body($league, $body);
    }

    $decoded = @json_decode($body, true);
    if (!is_array($decoded) || !array_key_exists('events', $decoded)) {
        return [
            'ok'      => false,
            'http'    => 502,
            'code'    => 'UPSTREAM_INVALID_JSON',
            'message' => 'استجابة المصدر لا تحتوي على بنية مباريات صالحة.',
        ];
    }

    // TheSportsDB يُرجع {"events": null} عند خلو اليوم من المباريات
    if ($isSportsDb) {
        if (isset($decoded['Message']) && is_string($decoded['Message']) && stripos($decoded['Message'], 'Invalid') !== false) {
            return [
                'ok'      => false,
                'http'    => 502,
                'code'    => 'UPSTREAM_INVALID_JSON',
                'message' => 'رفض المصدر البديل معرّف البطولة.',
            ];
        }
        $rawEvents = is_array($decoded['events']) ? $decoded['events'] : [];
        $normalized = [];
        foreach ($rawEvents as $item) {
            if (is_array($item)) {
                $ev = normalize_sportsdb_event($item);
                if ($ev !== null) {
                    $normalized[] = $ev;
                }
            }
        }
        return ['ok' => true, 'events' => $normalized];
    }

    if (!is_array($decoded['events'])) {
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
 * يجلب أياماً مفردة متعددة من المصدر المناسب بالتوازي ثم يدمج مصفوفة events دون تكرار.
 *
 * @param list<string> $days
 */
function fetch_upstream_days(string $league, array $days): array {
    if (isset(HIGHLIGHTLY_LEAGUES[$league])) {
        // Highlightly: طلبات متسلسلة لكل يوم (الصفحات تحتاج تتابعاً)، ثم الدمج المشترك
        $results = [];
        foreach ($days as $ymd) {
            $results[$ymd] = highlightly_fetch_day($league, $ymd);
        }
        return merge_day_results($days, $results);
    }

    $headers = [
        'Accept: application/json',
        'Accept-Language: en-US,en;q=0.9',
    ];
    $userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
    $results   = [];

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
                CURLOPT_USERAGENT      => $userAgent,
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
            $results[$ymd] = classify_upstream_response($league, $errno, $status, is_string($body) ? $body : null);
        }
        curl_multi_close($mh);
    } elseif (function_exists('curl_init')) {
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
                CURLOPT_USERAGENT      => $userAgent,
                CURLOPT_HTTPHEADER     => $headers,
            ]);
            $body   = curl_exec($ch);
            $errno  = curl_errno($ch);
            $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            $results[$ymd] = classify_upstream_response($league, $errno, $status, is_string($body) ? $body : null);
        }
    } elseif (filter_var(ini_get('allow_url_fopen'), FILTER_VALIDATE_BOOL)) {
        foreach ($days as $ymd) {
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
            $body   = @file_get_contents(single_day_upstream_url($league, $ymd), false, $context);
            $status = 0;
            if (isset($http_response_header) && is_array($http_response_header)) {
                foreach ($http_response_header as $line) {
                    if (preg_match('#^HTTP/\S+\s+(\d{3})#', $line, $m)) {
                        $status = (int) $m[1];
                    }
                }
            }
            if (!is_string($body) || $status === 0) {
                $results[$ymd] = ['ok' => false, 'http' => 502, 'code' => 'UPSTREAM_CONNECT_FAILED', 'message' => 'تعذر الاتصال بمصدر المباريات من الخادم.'];
            } else {
                $results[$ymd] = classify_upstream_response($league, 0, $status, $body);
            }
        }
    } else {
        return ['ok' => false, 'http' => 500, 'code' => 'HTTP_CLIENT_UNAVAILABLE', 'message' => 'وسائل الاتصال الخارجي (cURL / allow_url_fopen) غير مفعلة على الخادم.'];
    }

    return merge_day_results($days, $results);
}

/**
 * يدمج نتائج الأيام المفردة في مصفوفة events واحدة دون تكرار، ويُرجع أول خطأ إن وُجد.
 *
 * @param list<string> $days
 */
function merge_day_results(array $days, array $results): array {
    $events     = [];
    $seenIds    = [];
    $firstError = null;

    foreach ($days as $ymd) {
        $res = $results[$ymd] ?? null;
        if (!is_array($res) || ($res['ok'] ?? false) !== true) {
            if ($firstError === null && is_array($res)) {
                $firstError = $res;
            }
            continue;
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
    return ['ok' => true, 'body' => $encoded];
}

// ───────────────────────── التنفيذ الرئيسي ─────────────────────────
$dir       = cache_dir();
prune_old_cache($dir);
$cacheKey  = hash('sha256', 'v4|' . $league . '|' . $datesKey);
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

if ($result['ok'] === true) {
    write_cache($cacheFile, $league, $datesKey, $result['body']);
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
