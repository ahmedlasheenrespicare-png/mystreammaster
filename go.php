<?php
/**
 * مُحوِّل روابط الشركاء مع تتبّع النقرات.
 * الاستخدام: /go.php?p=bein   (اختياري: &src=live لمعرفة مصدر النقرة)
 * الروابط تُقرأ من affiliates.json — لا توجد وجهة خارجية إلا ما هو مذكور فيه (منع Open Redirect).
 */
declare(strict_types=1);

header('X-Robots-Tag: noindex, nofollow');
header('Referrer-Policy: no-referrer-when-downgrade');
header('Cache-Control: no-store');

const CLICKS_FILE = __DIR__ . '/clicks.json';

$slug = (string)($_GET['p'] ?? '');
$src  = (string)($_GET['src'] ?? 'direct');

if (!preg_match('/^[a-z0-9_-]{1,32}$/', $slug) || !preg_match('/^[a-z0-9_-]{0,32}$/', $src)) {
    http_response_code(400);
    exit('معرّف غير صالح');
}

$conf = json_decode((string)@file_get_contents(__DIR__ . '/affiliates.json'), true);
$p = $conf['partners'][$slug] ?? null;
if (!$p || empty($p['url'])) {
    http_response_code(404);
    exit('الشريك غير موجود');
}

$dest = (string)$p['url'];
// الوجهة يجب أن تكون https خارجية صحيحة
$parts = parse_url($dest);
if (($parts['scheme'] ?? '') !== 'https' || empty($parts['host'])) {
    http_response_code(500);
    exit('رابط شريك غير صالح');
}

// ---- تسجيل النقرة (ملف JSON بسيط مع قفل) ----
$ip   = (string)($_SERVER['REMOTE_ADDR'] ?? '');
$hash = substr(hash('sha256', $ip . date('Y-m-d') . $slug), 0, 16); // زائر فريد/يوم بلا تخزين IP
$day  = date('Y-m-d');

$fh = @fopen(CLICKS_FILE, 'c+');
if ($fh) {
    if (flock($fh, LOCK_EX)) {
        $raw  = stream_get_contents($fh);
        $data = json_decode($raw ?: '[]', true);
        if (!is_array($data)) $data = [];
        $data['total'][$slug]        = ($data['total'][$slug] ?? 0) + 1;
        $data['daily'][$day][$slug]  = ($data['daily'][$day][$slug] ?? 0) + 1;
        $data['source'][$src][$slug] = ($data['source'][$src][$slug] ?? 0) + 1;
        if (!isset($data['uniq'][$hash])) {
            $data['uniq'][$hash] = 1;
            $data['unique'][$slug] = ($data['unique'][$slug] ?? 0) + 1;
        }
        // تنظيف: احتفظ بآخر 90 يوماً وبصمات اليوم فقط
        if (isset($data['daily']) && count($data['daily']) > 90) {
            $data['daily'] = array_slice($data['daily'], -90, null, true);
        }
        if (($data['uniq_day'] ?? '') !== $day) { $data['uniq'] = [$hash => 1]; $data['uniq_day'] = $day; }

        ftruncate($fh, 0); rewind($fh);
        fwrite($fh, json_encode($data, JSON_UNESCAPED_UNICODE));
        fflush($fh); flock($fh, LOCK_UN);
    }
    fclose($fh);
}

header('Location: ' . $dest, true, 302);
exit;
