<?php
/**
 * embed.php — وسيط تضمين صفحة المشغّل الخاص (خلف /player/…)
 * ---------------------------------------------------------------------------------
 * صفحة /player.html تُضمِّن <iframe src="/player/five_channels_full.html">، وهذا
 * الملف هو الذي يجلب المحتوى من الأصل الحقيقي (نفق البث الخاص) ويعيده للزائر —
 * فلا يظهر رابط النفق في مصدر الصفحة ولا في رؤوس CSP، ويتغير الرابط بتعديل سطر
 * واحد في stream-embed.conf.
 *
 * المخططات المدعومة:
 *   /player/<path>?<query>        ← القاعدة الأساسية (يعيد توجيهها .htaccess إلى هنا)
 *   /embed.php?u=player&p=<path>  ← الصيغة المباشرة نفسها (تعمل بلا mod_rewrite)
 *
 * الحماية الأمنية:
 *   1) الأصل لا يأتي من الزائر أبداً: alias → stream-embed.conf (قائمة مغلقة).
 *   2) مضيف الأصل يجب أن يكون مذكوراً نصاً في allowed-domains.txt (مطابقة تامة).
 *   3) منع SSRF: كل عناوين DNS للمضيف يجب أن تكون عامة (بلا نطاقات خاصة/محجوزة).
 *   4) بلا اتباع تحويلات تلقائي: كل قفزة تُفحص من جديد، وتحويلات المضيفات الأخرى
 *      لا تُتبع بل تُعاد للزائر (302) بعد إعادة كتابة وجهتها.
 *   5) HTML فقط يُخزَّن في الذاكرة (≤4MB) ويُعاد كتابته؛ وما عداه يُبث متدفقاً.
 *
 * ملاحظة: allowed-domains.txt كانت حتى الآن قائمة توثيقية (proxy.php يعرّف
 * allowed_domains() ولا يناديها) — هذا الملف هو أول من يطبقها فعلياً.
 *
 * القواعد الحرجة (قراءة الإعدادات/القائمة، حل الرابط، إعادة كتابة HTML) موجودة
 * بنسخة JS قابلة للاختبار في website/scripts/embed-rewrite.mjs، ويفحص
 * website/scripts/test-embed-php.mjs أن النسختين متطابقتان.
 */

declare(strict_types=1);

// ───────────────────────── الإعدادات ─────────────────────────
const EMBED_PREFIX       = '/player/';   // يجب أن تطابق قاعدة .htaccess
const EMBED_CONF_FILE    = 'stream-embed.conf';
const EMBED_ALLOW_FILE   = 'allowed-domains.txt';
const EMBED_MAX_HTML     = 4 * 1024 * 1024;   // 4MB لمستند HTML يُعاد كتابته
const EMBED_MAX_STREAM   = 64 * 1024 * 1024;  // حد البث المتدفق لكل طلب
const EMBED_MAX_REDIRECT = 3;
const EMBED_RATE_LIMIT   = 900;   // طلباً
const EMBED_RATE_WINDOW  = 60;    // خلال ثوانٍ

/** سياسة أمان المستند المُضمَّن — نفس القواعد في embed-rewrite.mjs */
const EMBED_CSP = "default-src 'self'; "
    . "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
    . "style-src 'self' 'unsafe-inline' https:; "
    . "img-src 'self' data: blob: https:; "
    . "media-src 'self' https: blob:; "
    . "connect-src 'self' https: wss: blob:; "
    . "font-src 'self' data:; "
    . "object-src 'none'; base-uri 'none'; form-action 'none'; "
    . "frame-ancestors 'self'; upgrade-insecure-requests";

const EMBED_DEFAULT_UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36';

/* رؤوس لا يجوز تمريرها (hop-by-hop أو تخص اتصال الوسيط بالسيرفر الأصلي) */
const EMBED_SKIP_RESPONSE_HEADERS = [
    'transfer-encoding', 'connection', 'keep-alive', 'proxy-authenticate',
    'proxy-authorization', 'te', 'trailer', 'upgrade', 'content-encoding',
    'set-cookie', 'last-modified', 'etag', 'content-security-policy',
    'content-security-policy-report-only', 'x-frame-options', 'x-content-type-options',
    'strict-transport-security', 'referrer-policy', 'permissions-policy',
    'cross-origin-opener-policy', 'cross-origin-embedder-policy',
    'cross-origin-resource-policy', 'access-control-allow-origin',
];

// ───────────────────────── دوال مساعدة ─────────────────────────
function embed_fail(int $code, string $title, string $detail): never {
    http_response_code($code);
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Robots-Tag: noindex, nofollow');
    $safeTitle  = htmlspecialchars($title, ENT_QUOTES, 'UTF-8');
    $safeDetail = htmlspecialchars($detail, ENT_QUOTES, 'UTF-8');
    echo '<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">'
        . '<meta name="viewport" content="width=device-width, initial-scale=1">'
        . '<meta name="robots" content="noindex, nofollow">'
        . "<title>{$safeTitle}</title></head>"
        . '<body style="margin:0;background:#0b0b0f;color:#fff;font-family:system-ui,sans-serif;'
        . 'display:grid;place-items:center;min-height:100vh;text-align:center;padding:24px">'
        . '<div style="max-width:520px">'
        . "<h1 style=\"font-size:20px;margin:0 0 10px\">{$safeTitle}</h1>"
        . "<p style=\"color:#ffffffa6;line-height:1.9;margin:0;font-size:14px\">{$safeDetail}</p>"
        . '</div></body></html>';
    exit;
}

/** قراءة ملف من جذر المستودع (بلا مسار خارجه) */
function embed_read_root_file(string $name): string {
    $path = __DIR__ . '/' . $name;
    if (!is_file($path)) return '';
    return (string) @file_get_contents($path);
}

/** يقرأ أسطر `alias = origin` من stream-embed.conf — نفس قواعد parseEmbedConfig في JS */
function embed_config(): array {
    static $cache = null;
    if ($cache !== null) return $cache;
    $map = [];
    foreach (preg_split('/\R/', embed_read_root_file(EMBED_CONF_FILE)) ?: [] as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#') continue;
        $eq = strpos($line, '=');
        if ($eq === false || $eq === 0) continue;
        $alias  = strtolower(trim(substr($line, 0, $eq)));
        $origin = rtrim(trim(substr($line, $eq + 1)), '/');
        if (!preg_match('/^[a-z0-9][a-z0-9._-]*$/', $alias)) continue;
        if (!preg_match('#^https?://[^\s/]+$#i', $origin)) continue;
        $map[$alias] = $origin;
    }
    return $cache = $map;
}

/** النطاقات المسموحة من allowed-domains.txt — نفس قواعد parseAllowedHosts في JS */
function embed_allowed_hosts(): array {
    static $cache = null;
    if ($cache !== null) return $cache;
    $hosts = [];
    foreach (preg_split('/\R/', embed_read_root_file(EMBED_ALLOW_FILE)) ?: [] as $line) {
        $line = strtolower(trim($line));
        if ($line === '' || $line[0] === '#') continue;
        if (preg_match('/^[a-z0-9.-]+$/', $line)) $hosts[$line] = true;
    }
    return $cache = $hosts;
}

/**
 * هل المضيف مسموحاً؟ مطابق تماماً لمدخل في القائمة أو مضيف فرعي له (بحد فاصل
 * عند النقطة) — نفس isHostAllowed في JS. المطابقة اللاحقة ضرورية لأن مضيف نفق
 * البث المؤقت يتغير مع كل إعادة تشغيل، فيكفي تسجيل نطاقه الأم.
 */
function embed_host_allowed(string $host): bool {
    $h = strtolower(trim($host, '[]'));
    if ($h === '') return false;
    $hosts = embed_allowed_hosts();
    if (isset($hosts[$h])) return true;
    foreach ($hosts as $entry => $_) {
        if (str_ends_with($h, '.' . $entry)) return true;
    }
    return false;
}

/** هل العنوان IP عام؟ (منع تمرير عنوان داخلي حتى لو نجح اسم المضيف) */
function embed_is_public_ip(string $ip): bool {
    return (bool) filter_var(
        $ip,
        FILTER_VALIDATE_IP,
        FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE
    );
}

/** فحص DNS: كل عناوين المضيف يجب أن تكون عامة (منع DNS rebinding/SSRF) */
function embed_host_is_public(string $host): bool {
    if (filter_var($host, FILTER_VALIDATE_IP)) return embed_is_public_ip($host);

    $ips = [];
    foreach ((array) @dns_get_record($host, DNS_A | DNS_AAAA) as $rec) {
        if (!empty($rec['ip']))   $ips[] = $rec['ip'];
        if (!empty($rec['ipv6'])) $ips[] = $rec['ipv6'];
    }
    if (!$ips) {
        $resolved = gethostbyname($host);
        if ($resolved !== $host) $ips[] = $resolved;
    }
    if (!$ips) return false;
    foreach ($ips as $ip) {
        if (!embed_is_public_ip($ip)) return false;
    }
    return true;
}

/**
 * يبني رابط السيرفر الأصلي — نفس upstreamUrlFor في JS.
 * يرجع null إن حاول المسار الخروج من الأصل (../) أو كان الرابط تالفاً.
 */
function embed_upstream_url(string $origin, string $rest): ?string {
    if ($rest === '' || str_contains($rest, "\0")) return null;
    $clean = '/' . ltrim($rest, '/');

    /* ../ لا يجوز أن تخرج من الأصل: أول مقطع يخرج عن الجذر يرفض الطلب */
    $depth = 0;
    foreach (explode('/', (string) (parse_url($clean, PHP_URL_PATH) ?: $clean)) as $segment) {
        if ($segment === '..') {
            $depth--;
            if ($depth < 0) return null;
        } elseif ($segment !== '.' && $segment !== '') {
            $depth++;
        }
    }

    $base  = rtrim($origin, '/') . '/';
    $url   = embed_resolve_relative($base, $clean);
    if ($url === null) return null;
    if (strtolower((string) parse_url($url, PHP_URL_HOST)) !== strtolower((string) parse_url($base, PHP_URL_HOST))) {
        return null; // المسار خرج من الأصل
    }
    return $url;
}

/** حل رابط نسبي/جذري مقابل أساس (new URL(rel, base)) مع تطبيع ../ */
function embed_resolve_relative(string $baseUrl, string $rel): ?string {
    $p = parse_url($baseUrl);
    if (!isset($p['scheme'], $p['host'])) return null;
    $origin = $p['scheme'] . '://' . $p['host'] . (isset($p['port']) ? ':' . $p['port'] : '');

    $isAbsolute = (bool) preg_match('#^https?://#i', $rel);
    $target = $isAbsolute ? $rel : ($rel !== '' && $rel[0] === '/' ? $origin . $rel : $rel);

    $q = parse_url($target, PHP_URL_QUERY);
    $rawPath = (string) (parse_url($target, PHP_URL_PATH) ?: '/');
    $segments = [];
    foreach (explode('/', $rawPath) as $seg) {
        if ($seg === '.' || ($seg === '' && $segments)) continue;
        if ($seg === '..') { if (count($segments) > 1) array_pop($segments); continue; }
        $segments[] = $seg;
    }
    $path = implode('/', $segments);
    if ($path === '' || $path[0] !== '/') $path = '/' . ltrim($path, '/');

    $schemeHost = $isAbsolute
        ? ((string) parse_url($target, PHP_URL_SCHEME)) . '://' . ((string) parse_url($target, PHP_URL_HOST))
        : $origin;
    return $schemeHost . $path . (is_string($q) ? '?' . $q : '');
}

/* --------------------------------------------------------------------------
   إعادة كتابة HTML — نفس القواعد في proxyHtmlUrls / injectCspMeta (JS)
-------------------------------------------------------------------------- */

/**
 * الروابط الجذرية (/assets/app.js) تُحوَّل إلى /player/assets/app.js حتى تبقى
 * داخل الوسيط. النسبية تُترك (يحلها المتصفح مقابل /player/<dir>/ تلقائياً)،
 * والكاملة (https://…) تُترك (CSP يسمح بـ https للوسائط والصور).
 */
function embed_proxy_html_urls(string $html): string {
    $attrs = 'src|href|poster|data-src|data-href|data-poster';

    $out = preg_replace_callback(
        '#((?:^|[\s"\'])(' . $attrs . ')\s*=\s*)(["\'])/(?!(/|' . preg_quote(EMBED_PREFIX, '#') . '))#i',
        static fn (array $m): string => $m[1] . $m[3] . EMBED_PREFIX,
        $html
    );
    if (!is_string($out)) $out = $html;

    /* srcset يحمل عدة روابط مفصولة بفواصل — تُعالج مرشّحاً مرشّحاً */
    $out = preg_replace_callback(
        '#\bsrcset\s*=\s*(["\'])([\s\S]*?)\1#i',
        static function (array $m): string {
            $parts   = [];
            $changed = false;
            foreach (explode(',', $m[2]) as $candidate) {
                $trimmed = trim($candidate);
                if ($trimmed === '') { $parts[] = $candidate; continue; }
                $bits = preg_split('/\s+/', $trimmed) ?: [];
                $url  = $bits[0] ?? '';
                $isRoot = $url !== '' && $url[0] === '/' && !str_starts_with($url, '//');
                if (!$isRoot || str_starts_with($url, EMBED_PREFIX)) { $parts[] = $candidate; continue; }
                $bits[0] = EMBED_PREFIX . substr($url, 1);
                $parts[] = implode(' ', $bits);
                $changed = true;
            }
            /* بلا تغيير: يُترك النص كما هو حتى لا تتغير مسافات srcset النسبي */
            return $changed ? 'srcset=' . $m[1] . implode(', ', $parts) . $m[1] : $m[0];
        },
        (string) $out
    );

    return is_string($out) ? $out : $html;
}

/** حقن سياسة الأمان كأول عنصر في <head> */
function embed_inject_csp_meta(string $html): string {
    $tag = '<meta http-equiv="Content-Security-Policy" content="' . htmlspecialchars(EMBED_CSP, ENT_QUOTES, 'UTF-8') . '">';
    if (preg_match('#<head[^>]*>#i', $html)) {
        return (string) preg_replace('#<head[^>]*>#i', '$0' . $tag, $html, 1);
    }
    if (preg_match('#<html[^>]*>#i', $html)) {
        return (string) preg_replace('#<html[^>]*>#i', '$0<head>' . $tag . '</head>', $html, 1);
    }
    return $tag . $html;
}

/** حد معدّل بسيط قائم على ملفات مؤقتة (نفس أسلوب proxy.php) */
function embed_rate_limit(): void {
    $ip   = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    $file = sys_get_temp_dir() . '/smp_embed_rl_' . md5($ip);
    $now  = time();
    $data = ['t' => $now, 'n' => 0];
    if (is_file($file)) {
        $raw = @json_decode((string) @file_get_contents($file), true);
        if (is_array($raw) && ($now - (int) $raw['t']) < EMBED_RATE_WINDOW) $data = $raw;
    }
    $data['n']++;
    @file_put_contents($file, json_encode($data), LOCK_EX);
    if ((int) $data['n'] > EMBED_RATE_LIMIT) {
        header('Retry-After: ' . EMBED_RATE_WINDOW);
        embed_fail(429, 'طلبات كثيرة', 'تجاوزت حد الطلبات في الدقيقة. أعد المحاولة بعد قليل.');
    }
}

/** جلب من الأصل بلا اتباع تحويلات — يعيد [الحالة، الجسم، الرؤوس، الوجهة، نوع المحتوى] */
function embed_fetch(string $url, bool $stream, array $passthrough): array {
    $headers = [];
    $body    = '';
    $status  = 0;

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL            => $url,
        CURLOPT_FOLLOWLOCATION => false,          // كل قفزة تُفحص هنا يدوياً
        CURLOPT_RETURNTRANSFER => !$stream,
        CURLOPT_HEADER         => !$stream,
        CURLOPT_TIMEOUT        => 120,
        CURLOPT_CONNECTTIMEOUT => 20,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_USERAGENT      => trim((string) ($_SERVER['HTTP_USER_AGENT'] ?? '')) ?: EMBED_DEFAULT_UA,
        CURLOPT_HTTPHEADER     => $passthrough,
        CURLOPT_HEADERFUNCTION => function ($ch, $line) use (&$headers) {
            $line = trim($line);
            if ($line !== '' && str_contains($line, ':')) {
                [$name, $value] = explode(':', $line, 2);
                $name = strtolower(trim($name));
                if ($name !== '' && !in_array($name, EMBED_SKIP_RESPONSE_HEADERS, true)) {
                    $headers[$name][] = trim($value);
                }
            }
            return strlen($line);
        },
    ]);

    if ($stream) {
        $sent = 0;
        $headSent = false;
        curl_setopt($ch, CURLOPT_WRITEFUNCTION, function ($ch, $chunk) use (&$sent, &$headSent, &$status, &$headers) {
            if (!$headSent) {
                $headSent = true;
                if ($status >= 100) http_response_code($status);
                foreach ($headers as $name => $values) {
                    foreach ($values as $value) header($name . ': ' . $value, false);
                }
            }
            $sent += strlen($chunk);
            if ($sent > EMBED_MAX_STREAM) return 0; // قطع عند تجاوز الحد
            echo $chunk;
            if (ob_get_level() > 0) @ob_flush();
            flush();
            return strlen($chunk);
        });
    }

    $response   = curl_exec($ch);
    $status     = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $contentType = (string) curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    $error      = curl_error($ch);
    curl_close($ch);

    if ($response === false) {
        embed_fail(502, 'تعذر الوصول إلى مشغّل البث', $error !== '' ? $error : 'انتهت مهلة الاتصال بالأصل.');
    }
    if ($stream) return [$status, '', $headers, '', $contentType];

    $raw = (string) $response;
    /* curl يضع الرؤوس قبل الجسم (HEADER=true) — نفصلهما ونعيد تحليل الرؤوس */
    $headers = [];
    $body    = $raw;
    $blocks  = preg_split("/\r\n\r\n|\n\n/", $raw, 2);
    if (is_array($blocks) && count($blocks) === 2 && preg_match('#^HTTP/#i', $blocks[0])) {
        $headers = [];
        foreach (preg_split('/\R/', $blocks[0]) ?: [] as $line) {
            $line = trim($line);
            if ($line === '' || !str_contains($line, ':')) continue;
            [$name, $value] = explode(':', $line, 2);
            $name = strtolower(trim($name));
            if ($name !== '' && !in_array($name, EMBED_SKIP_RESPONSE_HEADERS, true)) {
                $headers[$name][] = trim($value);
            }
        }
        $body = $blocks[1];
    }
    /* مستند HTML أكبر من الحد لا يُعاد كتابته بأمان — نرفضه بدل تمريره ناقصاً */
    if (strlen($body) > EMBED_MAX_HTML) {
        embed_fail(502, 'مستند المشغّل أكبر من الحد', 'حجم المستند يتجاوز ' . (EMBED_MAX_HTML / 1048576) . 'MB.');
    }

    return [$status, $body, $headers, (string) ($headers['location'][0] ?? ''), $contentType];
}

// ───────────────────────── المنطق الأساسي ─────────────────────────
if (!in_array($_SERVER['REQUEST_METHOD'] ?? 'GET', ['GET', 'HEAD'], true)) {
    embed_fail(405, 'طريقة غير مسموحة', 'هذا الوسيط يخدم GET و HEAD فقط.');
}

embed_rate_limit();

/* ١) تحديد الأصل: alias من قائمة مغلقة (لا يقبل الوسيط رابطاً من الزائر) */
$alias = strtolower(trim((string) ($_GET['u'] ?? 'player')));
$config = embed_config();
if (!isset($config[$alias])) {
    embed_fail(404, 'مصدر التضمين غير معرّف', "لا يوجد أصل باسم «{$alias}» في " . EMBED_CONF_FILE . '.');
}
$origin = $config[$alias];

$originHost = strtolower((string) parse_url($origin, PHP_URL_HOST));
if (!embed_host_allowed($originHost)) {
    embed_fail(403, 'مضيف الأصل غير مسموح', "أضف {$originHost} إلى " . EMBED_ALLOW_FILE . ' ثم أعد المحاولة.');
}
if (!embed_host_is_public($originHost)) {
    embed_fail(403, 'مضيف الأصل غير صالح', 'المضيف لا يشير إلى عنوان عام.');
}

/* ٢) المسار المطلوب: /player/<rest> (عبر .htaccess) أو ?p=<rest> مباشرة */
$rest = (string) ($_GET['p'] ?? $_SERVER['PATH_INFO'] ?? '');
if ($rest === '') $rest = '/';
if (str_starts_with($rest, EMBED_PREFIX)) $rest = substr($rest, strlen(EMBED_PREFIX) - 1);

$url = embed_upstream_url($origin, $rest);
if ($url === null) embed_fail(400, 'مسار غير صالح', 'المسار المطلوب يخرج عن أصل المصدر.');

/* ٣) رؤوس تُمرَّر للأصل (الاستعلام يصل كاملاً لأنه جزء من الرابط) */
$accept = trim((string) ($_SERVER['HTTP_ACCEPT'] ?? ''));
$passthrough = [
    'Accept: ' . ($accept !== '' ? $accept : '*/*'),
    'Accept-Language: ' . (trim((string) ($_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '')) ?: 'ar,en;q=0.8'),
];
if (!empty($_SERVER['HTTP_RANGE'])) $passthrough[] = 'Range: ' . (string) $_SERVER['HTTP_RANGE'];

/* ٤) الجلب مع فحص كل قفزة تحويل (بلا تحويل لمضيف خارج الأصل) */
$status = 0; $body = ''; $headers = []; $location = ''; $contentType = '';
for ($hop = 0; $hop <= EMBED_MAX_REDIRECT; $hop++) {
    [$status, $body, $headers, $location, $contentType] = embed_fetch($url, false, $passthrough);

    if (!in_array($status, [301, 302, 303, 307, 308], true)) break;
    if ($location === '') break;

    $next = embed_resolve_relative($url, $location);
    if ($next === null) break;
    $nextHost = strtolower((string) parse_url($next, PHP_URL_HOST));
    if ($nextHost !== $originHost || !embed_host_allowed($nextHost)) {
        /* تحويل إلى مضيف آخر: لا نتبعه — نعيده للزائر ليجلبه مباشرة */
        header('Location: ' . $next, true, 302);
        header('Cache-Control: no-store');
        exit;
    }
    $url = $next;
    $location = '';
}

/* ٥) الرد: HTML يُعاد كتابته، وما عداه يُبث كما هو */
$isHtml = stripos($contentType, 'text/html') !== false
    || stripos((string) ($headers['content-type'][0] ?? ''), 'text/html') !== false;

header('X-Robots-Tag: noindex, nofollow');
header('X-Content-Type-Options: nosniff');

if ($status >= 400 || !$isHtml) {
    /* مسارات/أخطاء/وسائط: نبثها من الأصل مباشرة (تحافظ على Range والحجم) */
    if ($status >= 400) {
        http_response_code($status >= 100 ? $status : 502);
        header('Content-Type: ' . ($contentType !== '' ? $contentType : 'text/plain; charset=utf-8'));
        header('Cache-Control: no-store');
        echo $body;
        exit;
    }
    header('Cache-Control: public, max-age=30');
    [$status, $body, $headers, $location, $contentType] = embed_fetch($url, true, $passthrough);
    exit;
}

if (trim((string) $body) === '') {
    embed_fail(502, 'رد فارغ من مشغّل البث', 'الأصل رد بلا محتوى — تحقق من أن النفق يعمل وأن المسار صحيح.');
}

http_response_code($status >= 100 ? $status : 200);
header('Content-Type: ' . (str_contains(strtolower($contentType), 'charset') ? $contentType : 'text/html; charset=utf-8'));
header('Cache-Control: no-store');
header('Content-Security-Policy: ' . EMBED_CSP);

$html = embed_proxy_html_urls((string) $body);
echo embed_inject_csp_meta($html);
