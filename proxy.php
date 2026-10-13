<?php
/**
 * proxy.php — بروكسي HLS و Xtream آمن (متوافق مع مشغل البث المباشر ومشغل الاشتراك)
 * ---------------------------------------------------------------------------------
 * يدعم:
 *  - /proxy.php?url=<encoded-url>   (المسار الأساسي في البث المباشر ومشغل الاشتراك)
 *  - /proxy.php?u=<encoded-url>     (متوافق مع Cloudflare Worker)
 *  - /proxy.php?b64=<base64-url>
 *  - /proxy.php/h/<host>/<path>     (مسار https المباشر المتوافق مع Worker)
 *  - /proxy.php/x/<host>/<path>     (مسار http المباشر لسيرفرات Xtream بلا TLS)
 *
 * الحماية الأمنية:
 *  1. منع SSRF: فحص المخطط (http/https فقط) + منع النطاقات الداخلية + فحص DNS لكل IP عام.
 *  2. إيقاف اتباع إعادة التوجيه التلقائي والتحقق الأمني من كل وجهة redirect.
 *  3. تقييد CORS على نطاقات الموقع المسموحة فقط.
 *  4. تخطي صفحة تحذير ngrok تلقائياً (ngrok-skip-browser-warning).
 *  5. دعم واجهة Xtream (player_api.php) وقوائم M3U8 (مع حل المسارات النسبية والجذرية) ومقاطع TS.
 */

declare(strict_types=1);

// ───────────────────────── الإعدادات ─────────────────────────
const SITE_ORIGIN   = 'https://streammasterstore.com';
const MAX_REDIRECTS = 5;
const RATE_LIMIT    = 360;   // أقصى عدد طلبات
const RATE_WINDOW   = 60;    // خلال كم ثانية
const MAX_BYTES     = 20 * 1024 * 1024; // 20MB لكل جزء

const ALLOWED_ORIGINS = [
    'https://streammasterstore.com',
    'https://www.streammasterstore.com',
    'https://ahmedlasheenrespicare-png.github.io',
];

/** المنافذ الداخلية الحساسة المحظورة (قواعد بيانات / بريد / إدارة) */
const BLOCKED_PORTS = [
    21, 22, 23, 25, 110, 143, 445, 465, 587, 993, 995,
    1433, 1521, 3306, 3389, 5432, 5900, 6379, 9200, 11211, 27017,
];

/** النطاقات المسموح بجلبها في القائمة المدمجة + allowed-domains.txt */
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

function is_allowed_origin(string $origin): bool {
    if ($origin === '') return false;
    if (in_array($origin, ALLOWED_ORIGINS, true)) return true;
    if (preg_match('#^https?://(localhost|127\.0\.0\.1)(:\d+)?$#i', $origin)) return true;
    if (preg_match('#^https://[a-z0-9-]+\.e2b\.app$#i', $origin)) return true;
    return false;
}

// ───────────────────────── رؤوس CORS ─────────────────────────
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (is_allowed_origin($origin)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
} else {
    header('Access-Control-Allow-Origin: ' . SITE_ORIGIN);
}
header('Access-Control-Allow-Methods: GET, HEAD, OPTIONS');
header('Access-Control-Allow-Headers: Range, Content-Type, Origin, Accept');
header('Access-Control-Expose-Headers: Content-Range, Content-Length, Accept-Ranges');
header('X-Content-Type-Options: nosniff');
header('X-Accel-Buffering: no');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') { http_response_code(204); exit; }
if (!in_array($_SERVER['REQUEST_METHOD'] ?? 'GET', ['GET', 'HEAD'], true)) {
    fail(405, 'Method not allowed');
}

// ───────────────────────── دوال مساعدة ─────────────────────────
function fail(int $code, string $msg) {
    http_response_code($code);
    header('Content-Type: text/plain; charset=utf-8');
    echo $msg;
    exit;
}

/** هل العنوان IP عام (غير داخلي/خاص/محجوز)؟ */
function is_public_ip(string $ip): bool {
    return (bool) filter_var(
        $ip,
        FILTER_VALIDATE_IP,
        FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE
    );
}

/** هل المضيف الداخلي محظور؟ */
function is_blocked_hostname(string $host): bool {
    $h = strtolower(trim($host, '[]'));
    if ($h === '') return true;
    if (
        $h === 'localhost' ||
        str_ends_with($h, '.localhost') ||
        str_ends_with($h, '.local') ||
        str_ends_with($h, '.internal') ||
        str_ends_with($h, '.home.arpa')
    ) {
        return true;
    }
    if (!str_contains($h, '.')) return true;
    return false;
}

/** هل المضيف نفق ngrok؟ */
function is_ngrok_host(string $host): bool {
    return (bool) preg_match('/(^|\.)ngrok(-free)?\.(dev|app|io|com)$/i', $host);
}

/** تحقق كامل من الرابط: المخطط + المنفذ + منع المضيفات الخاصة + كل عناوين الـ DNS عامة. */
function validate_url(string $url): string {
    if (!filter_var($url, FILTER_VALIDATE_URL)) fail(400, 'Invalid url');

    $parts  = parse_url($url);
    $scheme = strtolower($parts['scheme'] ?? '');
    if (!in_array($scheme, ['http', 'https'], true)) fail(400, 'Scheme not allowed');

    $host = strtolower($parts['host'] ?? '');
    if ($host === '' || is_blocked_hostname($host)) fail(403, 'Host not allowed');

    if (isset($parts['port'])) {
        $port = (int) $parts['port'];
        if ($port < 1 || $port > 65535 || in_array($port, BLOCKED_PORTS, true)) {
            fail(403, 'Port not allowed');
        }
        if ($port !== 80 && $port !== 443 && $port < 1024) {
            fail(403, 'Port not allowed');
        }
    }

    // إذا كان المضيف IP مباشر، نتحقق أنه IP عام
    if (filter_var($host, FILTER_VALIDATE_IP)) {
        if (!is_public_ip($host)) fail(403, 'Private address blocked');
        return $url;
    }

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
    if (!isset($p['host'], $p['scheme'])) return $url;
    $rawPath = $p['path'] ?? '/';
    $segments = [];
    foreach (explode('/', $rawPath) as $seg) {
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

/** حل رابط نسبي أو جذري (/path أو seg.ts) مقابل الرابط الأساسي تماماً مثل new URL(rel, base) */
function resolve_relative_url(string $baseUrl, string $rel): string {
    $rel = trim($rel);
    if ($rel === '') return $baseUrl;
    if (preg_match('#^https?://#i', $rel)) return resolve_path($rel);

    $p = parse_url($baseUrl);
    if (!isset($p['scheme'], $p['host'])) return $rel;
    $origin = $p['scheme'] . '://' . $p['host'] . (isset($p['port']) ? ':' . $p['port'] : '');

    if (str_starts_with($rel, '//')) {
        return resolve_path($p['scheme'] . ':' . $rel);
    }
    if ($rel[0] === '/') {
        return resolve_path($origin . $rel);
    }
    $basePath = $p['path'] ?? '/';
    $dir = preg_replace('#/[^/]*$#', '/', $basePath) ?: '/';
    return resolve_path($origin . $dir . $rel);
}

/** رؤوس Referer الخاصة ببعض شبكات CDN العامة فقط (سيرفرات Xtream لا يُرسل لها Origin خارجي) */
function upstream_headers_for(string $host, array $extraHeaders = []): array {
    $headers = $extraHeaders;
    if (str_contains($host, 'edgenextcdn.net') || str_contains($host, 'hibridcdn.net')) {
        $headers[] = 'Referer: https://shahid.mbc.net/';
        $headers[] = 'Origin: https://shahid.mbc.net';
    } elseif (str_contains($host, 'akamaized.net')) {
        $headers[] = 'Referer: https://www.france24.com/';
    } elseif (str_contains($host, 'getaj.net')) {
        $headers[] = 'Referer: https://www.aljazeera.net/';
    }
    if (is_ngrok_host($host)) {
        $headers[] = 'ngrok-skip-browser-warning: true';
    }
    return $headers;
}

/** تنفيذ طلب مع اتباع يدوي لإعادة التوجيه والتحقق من كل وجهة. */
function safe_request(string $url, array $extraOpts, bool $returnBody, array $customHeaders = []): array {
    $hops = 0;
    while (true) {
        $url  = validate_url($url);
        $host = strtolower(parse_url($url, PHP_URL_HOST) ?: '');
        $contentType = '';
        $ch   = curl_init($url);
        $opts = [
            CURLOPT_RETURNTRANSFER  => $returnBody,
            CURLOPT_FOLLOWLOCATION  => false,
            CURLOPT_PROTOCOLS       => CURLPROTO_HTTP | CURLPROTO_HTTPS,
            CURLOPT_CONNECTTIMEOUT  => 8,
            CURLOPT_SSL_VERIFYPEER  => false,
            CURLOPT_SSL_VERIFYHOST  => 0,
            CURLOPT_USERAGENT       => $_SERVER['HTTP_USER_AGENT'] ?? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36',
            CURLOPT_HTTPHEADER      => upstream_headers_for($host, $customHeaders),
        ];
        foreach ($extraOpts as $k => $v) {
            $opts[$k] = $v;
        }
        curl_setopt_array($ch, $opts);
        $body = curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $loc  = (string) curl_getinfo($ch, CURLINFO_REDIRECT_URL);
        $contentType = (string) curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
        curl_close($ch);

        if (in_array($code, [301, 302, 303, 307, 308], true) && $loc !== '' && $hops < MAX_REDIRECTS) {
            $url = resolve_relative_url($url, $loc);
            $hops++;
            continue;
        }
        return [$code, $body, $url, $contentType];
    }
}

/** استخراج الرابط المطلوب من ?url= أو ?u= أو ?b64= أو المسار /h/ و /x/ */
function extract_target_url(): string {
    $url = (string) ($_GET['url'] ?? $_GET['u'] ?? '');
    if ($url === '' && isset($_GET['b64'])) {
        $decoded = base64_decode((string) $_GET['b64'], true);
        if ($decoded !== false) $url = $decoded;
    }
    if ($url !== '') return trim($url);

    $pathInfo = (string) ($_SERVER['PATH_INFO'] ?? '');
    if ($pathInfo !== '' && preg_match('#^/(h|x)/([^/]+)(/.*)?$#', $pathInfo, $m)) {
        $scheme = $m[1] === 'x' ? 'http' : 'https';
        $restPath = $m[3] ?? '/';
        $qs = (string) ($_SERVER['QUERY_STRING'] ?? '');
        return $scheme . '://' . $m[2] . $restPath . ($qs !== '' ? '?' . $qs : '');
    }
    return '';
}

/** إعادة كتابة قائمة M3U8 بحيث تمر جميع المقاطع والقوائم الفرعية عبر /proxy.php?url= */
function rewrite_m3u8(string $content, string $finalUrl): string {
    $out = '';
    foreach (preg_split('/\R/', $content) as $line) {
        $t = trim($line);
        if ($t === '') { $out .= "\n"; continue; }

        if (preg_match('/URI="([^"]+)"/', $line, $m)) {
            $abs = resolve_relative_url($finalUrl, $m[1]);
            $out .= str_replace('URI="' . $m[1] . '"', 'URI="/proxy.php?url=' . urlencode($abs) . '"', $line) . "\n";
            continue;
        }
        if (str_starts_with($t, 'proxy.php?url=') || str_starts_with($t, '/proxy.php?url=')) {
            $out .= (str_starts_with($t, '/') ? $t : '/' . $t) . "\n";
            continue;
        }
        if ($t[0] === '#') { $out .= $line . "\n"; continue; }

        $abs = resolve_relative_url($finalUrl, $t);
        $out .= '/proxy.php?url=' . urlencode($abs) . "\n";
    }
    return $out;
}

// ───────────────────────── المنطق الأساسي ─────────────────────────
rate_limit();

$url = extract_target_url();
if ($url === '') fail(400, 'Missing url');
if (strlen($url) > 2048) fail(414, 'Url too long');

$url  = validate_url($url);               // تحقق أولي (المخطط/النطاق)
$url  = validate_url(resolve_path($url)); // ثم تطبيع المسار وإعادة التحقق
$path = (string) parse_url($url, PHP_URL_PATH);

$isPlayerApi = str_contains($path, 'player_api.php') || str_contains($path, 'get.php');
$isM3U8      = str_contains($path, '.m3u8') || str_contains($path, '.m3u');

// ── ١) واجهة بيانات الاشتراك (player_api.php / get.php) ──
if ($isPlayerApi) {
    [$code, $content, $finalUrl, $ct] = safe_request($url, [
        CURLOPT_TIMEOUT => 25,
    ], true, ['Accept: application/json, text/plain, */*']);

    if ($code >= 400 || $content === false || $content === null) {
        fail($code >= 400 ? $code : 502, 'Upstream error ' . $code);
    }

    header('Cache-Control: no-store');
    if (str_starts_with(ltrim((string) $content), '#EXTM3U')) {
        header('Content-Type: application/vnd.apple.mpegurl; charset=utf-8');
        echo rewrite_m3u8((string) $content, $finalUrl);
        exit;
    }

    header('Content-Type: ' . ($ct !== '' ? $ct : 'application/json; charset=utf-8'));
    echo (string) $content;
    exit;
}

// ── ٢) قوائم التشغيل M3U8: نجلبها ونعيد كتابة روابطها لتمر عبر البروكسي ──
if ($isM3U8) {
    [$code, $content, $finalUrl] = safe_request($url, [
        CURLOPT_TIMEOUT => 12,
    ], true, ['Accept: application/vnd.apple.mpegurl, application/x-mpegURL, */*']);

    if ($code >= 400 || $content === false || $content === null) {
        fail($code >= 400 ? $code : 502, 'Upstream error ' . $code);
    }

    header('Content-Type: application/vnd.apple.mpegurl; charset=utf-8');
    header('Cache-Control: no-cache, no-store, must-revalidate');
    header('Pragma: no-cache');

    echo rewrite_m3u8((string) $content, $finalUrl);
    exit;
}

// ── ٣) مقاطع ts/mp4: بث مباشر متدفّق ──
header('Cache-Control: public, max-age=2');
$sent = 0;
$rangeHeaders = [];
if (!empty($_SERVER['HTTP_RANGE'])) {
    $rangeHeaders[] = 'Range: ' . (string) $_SERVER['HTTP_RANGE'];
}
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
        if (stripos($h, 'Content-Type:') === 0 && !headers_sent()) header($h);
        if (stripos($h, 'Content-Range:') === 0 && !headers_sent()) header($h);
        return strlen($header);
    },
];
safe_request($url, $headerOpts, false, $rangeHeaders);
