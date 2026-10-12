<?php
/**
 * proxy.php — بروكسي HLS آمن (نسخة مُصحّحة أمنياً)
 * -------------------------------------------------
 * الإصلاحات مقابل النسخة السابقة:
 *  1. قائمة بيضاء صارمة للنطاقات (منع SSRF).
 *  2. منع المخططات غير http/https ومنع العناوين الداخلية/الخاصة (127.*, 10.*, 169.254.*, ::1 ...).
 *  3. إيقاف اتباع إعادة التوجيه تلقائياً + التحقق اليدوي من وجهة كل redirect.
 *  4. تقييد CORS على نطاق الموقع فقط بدل "*".
 *  5. تفعيل التحقق من شهادة SSL.
 *  6. حد معدّل بسيط (Rate limit) لكل IP لمنع استنزاف الباندويدث.
 *  7. تحديد حجم أقصى للاستجابة ومنع تمرير Content-Length خاطئ.
 */

declare(strict_types=1);

// ───────────────────────── الإعدادات ─────────────────────────
const SITE_ORIGIN   = 'https://streammasterstore.com';
const MAX_REDIRECTS = 3;
const RATE_LIMIT    = 240;   // أقصى عدد طلبات
const RATE_WINDOW   = 60;    // خلال كم ثانية
const MAX_BYTES     = 20 * 1024 * 1024; // 20MB لكل جزء

/** النطاقات المسموح بجلبها (يشمل النطاقات الفرعية تلقائياً). */
const ALLOWED_DOMAINS = [
    'akamaized.net','cloudfront.net','streamlock.net','edgenextcdn.net','hibridcdn.net',
    'getaj.net','thehlive.com','itworkscdn.net','kwikmotion.com','fasttvcdn.com',
    'mncdn.com','ercdn.net','mangomolo.com','mgmlcdn.com','cdnsun.net','easybroadcast.io',
    'alarabiya.net','skynewsarabia.com','france24.com','rttv.com','presstv.ir','alalam.ir',
    'telewebion.ir','trt.com.tr','asharq.com','mobtada.com','vidgyor.com','amagi.tv',
    'esite-lab.com','b-cdn.net','jwp.services','bozztv.com','wowza.com','anystream.uk',
    'livekadeh.com','live247stream.com','octivid.com','streamakaci.tv','pfs.gdn',
    'cloudflarestream.com','immergo.tv','infomaniak.com','unified-streaming.com',
    'mux.dev','antik.sk','erbvr.com','5centscdn.com','myco.io','streambrothers.com',
    'streamingconnect.tv','streamlane.tv','logichost.in','host247.net','gulfsat.com',
    'dvcloud.tv','contaboserver.net','zeuscdn724.com','vedge.infomaniak.com',
    'fastpublish.me','bestream.io','tactivemedia.com','premio.link','mada.ps','furrera.ps',
    'najah.edu','panet.com','ishtartv.com','zaytonatube.com','yementdy.tv','livaat.com',
    'abnvideos.com','mosaiquefm.net','tanitweb.net','starmenajo.com','afintl.com',
    'dabangasudan.org','saharamedias.net','marjaeyattv.com','paltodaytv.com','nowtelly.com',
    'miracleonline.org','i-news.tv','elheddaftv.com','channel8.com','cdnbridge.tv',
    'bradosti.net','beitolabbas.tv','asil.tv','alawla.tv','alissahost.net','alaimma.tv',
    'alrayyancdn.vidgyor.com','spacetoongo.com','godstands.tv','icopts.app','afghantv.app',
    'ktvlive.online','ghaasiflu.online','vodu.store','pulsarstarsolutions.com',
    'addresses-sat.com','alabbassia.com','atvsat.com','badinan.xyz','shams.tv',
    'platform-iuoamc.uk','softverse.b-cdn.net','mbc.net','online.tm','ch14.tv',
];

/**
 * القائمة البيضاء النهائية = النطاقات المدمجة أعلاه + ملف allowed-domains.txt (إن وُجد).
 * هكذا تُضاف قنوات جديدة بتحديث ملف نصّي واحد دون لمس كود البروكسي.
 */
function allowed_domains(): array {
    static $cache = null;
    if ($cache !== null) return $cache;
    $list = ALLOWED_DOMAINS;
    $file = __DIR__ . '/allowed-domains.txt';
    if (is_file($file)) {
        foreach (file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
            $line = strtolower(trim($line));
            if ($line === '' || $line[0] === '#') continue;
            if (preg_match('/^[a-z0-9.-]+$/', $line)) $list[] = $line;
        }
    }
    return $cache = array_values(array_unique($list));
}

// ───────────────────────── رؤوس CORS ─────────────────────────
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin === SITE_ORIGIN || $origin === 'https://www.streammasterstore.com') {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
} else {
    header('Access-Control-Allow-Origin: ' . SITE_ORIGIN);
}
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Range, Content-Type');
header('X-Content-Type-Options: nosniff');
header('X-Accel-Buffering: no');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') { http_response_code(204); exit; }
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET')     { fail(405, 'Method not allowed'); }

// ───────────────────────── دوال مساعدة ─────────────────────────
function fail(int $code, string $msg) {
    http_response_code($code);
    header('Content-Type: text/plain; charset=utf-8');
    echo $msg;
    exit;
}

/** هل العنوان IP عام (غير داخلي)؟ */
function is_public_ip(string $ip): bool {
    return (bool) filter_var(
        $ip,
        FILTER_VALIDATE_IP,
        FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE
    );
}

/** تحقق كامل من الرابط: المخطط + النطاق في القائمة البيضاء + كل عناوين الـ DNS عامة. */
function validate_url(string $url): string {
    if (!filter_var($url, FILTER_VALIDATE_URL)) fail(400, 'Invalid url');

    $parts  = parse_url($url);
    $scheme = strtolower($parts['scheme'] ?? '');
    if (!in_array($scheme, ['http', 'https'], true)) fail(400, 'Scheme not allowed');

    $host = strtolower($parts['host'] ?? '');
    if ($host === '') fail(400, 'Invalid host');
    if (isset($parts['port']) && !in_array((int)$parts['port'], [80, 443, 8080, 8443, 1935], true)) {
        fail(403, 'Port not allowed');
    }

    $allowed = false;
    foreach (allowed_domains() as $d) {
        if ($host === $d || str_ends_with($host, '.' . $d)) { $allowed = true; break; }
    }
    if (!$allowed) fail(403, 'Host not allowed');

    // منع تمرير اسم يشير إلى شبكة داخلية (DNS rebinding / SSRF)
    $ips = [];
    foreach ((array) @dns_get_record($host, DNS_A | DNS_AAAA) as $rec) {
        if (!empty($rec['ip']))   $ips[] = $rec['ip'];
        if (!empty($rec['ipv6'])) $ips[] = $rec['ipv6'];
    }
    if (!$ips) {
        $resolved = gethostbyname($host);
        if ($resolved !== $host) $ips[] = $resolved;
    }
    if (!$ips) fail(502, 'DNS resolution failed');
    foreach ($ips as $ip) {
        if (!is_public_ip($ip)) fail(403, 'Private address blocked');
    }
    return $url;
}

/** حد معدّل بسيط قائم على ملفات مؤقتة. */
function rate_limit(): void {
    $ip  = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    $f   = sys_get_temp_dir() . '/smp_rl_' . md5($ip);
    $now = time();
    $data = ['t' => $now, 'n' => 0];
    if (is_file($f)) {
        $raw = @json_decode((string) @file_get_contents($f), true);
        if (is_array($raw) && ($now - (int) $raw['t']) < RATE_WINDOW) $data = $raw;
    }
    $data['n']++;
    @file_put_contents($f, json_encode($data), LOCK_EX);
    if ($data['n'] > RATE_LIMIT) {
        header('Retry-After: ' . RATE_WINDOW);
        fail(429, 'Too many requests');
    }
}

/** تطبيع المسارات النسبية (../ و ./). */
function resolve_path(string $url): string {
    $p = parse_url($url);
    if (!isset($p['path'], $p['host'], $p['scheme'])) return $url;
    $segments = [];
    foreach (explode('/', $p['path']) as $seg) {
        if ($seg === '.' || $seg === '') { if ($seg === '' && !$segments) $segments[] = ''; continue; }
        if ($seg === '..') { if (count($segments) > 1) array_pop($segments); continue; }
        $segments[] = $seg;
    }
    $path = implode('/', $segments);
    if ($path === '' || $path[0] !== '/') $path = '/' . ltrim($path, '/');
    return $p['scheme'] . '://' . $p['host']
        . (isset($p['port']) ? ':' . $p['port'] : '')
        . $path
        . (isset($p['query']) ? '?' . $p['query'] : '');
}

function referer_for(string $host): string {
    if (str_contains($host, 'edgenextcdn.net') || str_contains($host, 'hibridcdn.net')) return 'https://shahid.mbc.net/';
    if (str_contains($host, 'akamaized.net'))  return 'https://www.france24.com/';
    if (str_contains($host, 'getaj.net'))      return 'https://www.aljazeera.net/';
    return SITE_ORIGIN . '/';
}

/** تنفيذ طلب مع اتباع يدوي لإعادة التوجيه والتحقق من كل وجهة. */
function safe_request(string $url, array $extraOpts, bool $returnBody): array {
    $hops = 0;
    while (true) {
        $url  = validate_url($url);
        $host = strtolower(parse_url($url, PHP_URL_HOST) ?: '');
        $ch   = curl_init($url);
        curl_setopt_array($ch, $extraOpts + [
            CURLOPT_RETURNTRANSFER  => $returnBody,
            CURLOPT_FOLLOWLOCATION  => false,
            CURLOPT_PROTOCOLS       => CURLPROTO_HTTP | CURLPROTO_HTTPS,
            CURLOPT_CONNECTTIMEOUT  => 8,
            CURLOPT_SSL_VERIFYPEER  => true,
            CURLOPT_SSL_VERIFYHOST  => 2,
            CURLOPT_USERAGENT       => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36',
            CURLOPT_HTTPHEADER      => ['Referer: ' . referer_for($host), 'Origin: ' . rtrim(referer_for($host), '/')],
        ]);
        $body = curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $loc  = (string) curl_getinfo($ch, CURLINFO_REDIRECT_URL);
        curl_close($ch);

        if (in_array($code, [301, 302, 303, 307, 308], true) && $loc !== '' && $hops < MAX_REDIRECTS) {
            $url = str_starts_with($loc, 'http') ? $loc : resolve_path(dirname($url) . '/' . $loc);
            $hops++;
            continue;
        }
        return [$code, $body, $url];
    }
}

// ───────────────────────── المنطق الأساسي ─────────────────────────
rate_limit();

$url = (string) ($_GET['url'] ?? '');
if ($url === '' && isset($_GET['b64'])) {
    $decoded = base64_decode((string) $_GET['b64'], true);
    if ($decoded !== false) $url = $decoded;
}
$url = trim($url);
if ($url === '') fail(400, 'Missing url');
if (strlen($url) > 2048) fail(414, 'Url too long');

$url  = validate_url($url);            // تحقق أولي (المخطط/النطاق)
$url  = validate_url(resolve_path($url)); // ثم تطبيع المسار وإعادة التحقق
$path = (string) parse_url($url, PHP_URL_PATH);
$isM3U8 = str_contains($path, '.m3u8') || str_contains($path, '.m3u');

// ── قوائم التشغيل: نجلبها ونعيد كتابة روابطها لتمر عبر البروكسي ──
if ($isM3U8) {
    [$code, $content, $finalUrl] = safe_request($url, [
        CURLOPT_TIMEOUT    => 10,
        CURLOPT_HTTPHEADER => ['Accept: application/vnd.apple.mpegurl, */*'],
    ], true);

    if ($code >= 400 || $content === false || $content === null) {
        fail($code >= 400 ? $code : 502, 'Upstream error ' . $code);
    }

    header('Content-Type: application/vnd.apple.mpegurl; charset=utf-8');
    header('Cache-Control: no-cache, no-store, must-revalidate');
    header('Pragma: no-cache');

    $base = rtrim(dirname($finalUrl), '/') . '/';
    $out  = '';
    foreach (preg_split('/\R/', (string) $content) as $line) {
        $t = trim($line);
        if ($t === '') { $out .= "\n"; continue; }

        if (preg_match('/URI="([^"]+)"/', $line, $m)) {
            $abs = preg_match('#^https?://#i', $m[1]) ? $m[1] : $base . $m[1];
            $abs = resolve_path($abs);
            $out .= str_replace('URI="' . $m[1] . '"', 'URI="proxy.php?url=' . urlencode($abs) . '"', $line) . "\n";
            continue;
        }
        if (str_starts_with($t, 'proxy.php?url=')) { $out .= $t . "\n"; continue; }
        if ($t[0] === '#') { $out .= $line . "\n"; continue; }

        $abs = preg_match('#^https?://#i', $t) ? $t : $base . $t;
        $out .= 'proxy.php?url=' . urlencode(resolve_path($abs)) . "\n";
    }
    echo $out;
    exit;
}

// ── مقاطع ts/mp4: بث مباشر متدفّق ──
header('Cache-Control: public, max-age=2');
$sent = 0;
$headerOpts = [
    CURLOPT_TIMEOUT        => 60,
    CURLOPT_BUFFERSIZE     => 16384,
    CURLOPT_WRITEFUNCTION  => function ($ch, $data) use (&$sent) {
        $sent += strlen($data);
        if ($sent > MAX_BYTES) return 0; // قطع الاتصال عند تجاوز الحد
        echo $data;
        if (ob_get_level() > 0) @ob_flush();
        flush();
        return strlen($data);
    },
    CURLOPT_HEADERFUNCTION => function ($ch, $header) {
        $h = trim($header);
        // نمرّر Content-Type فقط — Content-Length قد لا يطابق المُخرج المتدفّق
        if (stripos($h, 'Content-Type:') === 0 && !headers_sent()) header($h);
        return strlen($header);
    },
];
if (!empty($_SERVER['HTTP_RANGE'])) {
    $headerOpts[CURLOPT_RANGE] = str_replace('bytes=', '', (string) $_SERVER['HTTP_RANGE']);
}
safe_request($url, $headerOpts, false);
