<?php
/**
 * إحصائيات الأفلييت — محمية بنفس جلسة لوحة التحكم (SMP_ADMIN).
 * الوصول: /admin-dashboard/affiliate-stats.php بعد تسجيل الدخول.
 */
declare(strict_types=1);
header('X-Robots-Tag: noindex, nofollow, noarchive');
header('Cache-Control: no-store');
header('X-Frame-Options: DENY');

session_set_cookie_params([
    'lifetime' => 0, 'path' => '/admin-dashboard/',
    'secure' => !empty($_SERVER['HTTPS']), 'httponly' => true, 'samesite' => 'Strict',
]);
session_name('SMP_ADMIN');
session_start();

if (empty($_SESSION['auth']) || (int)($_SESSION['expires'] ?? 0) < time()) {
    header('Location: /admin-dashboard/');
    exit;
}

$clicks = json_decode((string)@file_get_contents(__DIR__ . '/../clicks.json'), true) ?: [];
$conf   = json_decode((string)@file_get_contents(__DIR__ . '/../affiliates.json'), true) ?: [];
$parts  = $conf['partners'] ?? [];

$total  = $clicks['total']  ?? [];
$unique = $clicks['unique'] ?? [];
$daily  = $clicks['daily']  ?? [];
$source = $clicks['source'] ?? [];
arsort($total);
$sum = array_sum($total);
$last7 = array_slice($daily, -7, null, true);
function e(string $s): string { return htmlspecialchars($s, ENT_QUOTES, 'UTF-8'); }
?><!DOCTYPE html>
<html lang="ar" dir="rtl"><head>
    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-N7VT67MW57"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());

      gtag('config', 'G-N7VT67MW57');
    </script><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>إحصائيات الشركاء</title>
<style>
body{font-family:system-ui,Tahoma,sans-serif;background:#0b1220;color:#e2e8f0;margin:0;padding:24px}
.wrap{max-width:900px;margin:0 auto}
h1{font-size:22px;margin:0 0 4px} .sub{color:#94a3b8;font-size:14px;margin-bottom:20px}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:24px}
.kpi{background:#0f172a;border:1px solid #1e293b;border-radius:12px;padding:14px}
.kpi b{display:block;font-size:26px;color:#60a5fa} .kpi span{font-size:13px;color:#94a3b8}
table{width:100%;border-collapse:collapse;font-size:14px;margin-bottom:26px}
th,td{padding:9px 10px;text-align:right;border-bottom:1px solid #1e293b}
th{background:#111c33;color:#cbd5e1}
.bar{height:7px;border-radius:4px;background:#2563eb}
a{color:#60a5fa} .foot{color:#64748b;font-size:13px}
</style></head><body><div class="wrap">
<h1>📊 إحصائيات روابط الشركاء</h1>
<div class="sub">تُحتسب النقرات عبر <code>/go.php?p=slug&src=مصدر</code> — <a href="/admin-dashboard/">← لوحة التحكم</a></div>

<div class="kpis">
  <div class="kpi"><b><?= number_format($sum) ?></b><span>إجمالي النقرات</span></div>
  <div class="kpi"><b><?= number_format(array_sum($unique)) ?></b><span>زوّار فريدون (اليوم)</span></div>
  <div class="kpi"><b><?= count($parts) ?></b><span>شركاء مفعّلون</span></div>
  <div class="kpi"><b><?= number_format(array_sum($daily[date('Y-m-d')] ?? [])) ?></b><span>نقرات اليوم</span></div>
</div>

<h3>حسب الشريك</h3>
<table><tr><th>الشريك</th><th>التصنيف</th><th>النقرات</th><th>النسبة</th></tr>
<?php if (!$total): ?><tr><td colspan="4">لا توجد نقرات بعد.</td></tr><?php endif; ?>
<?php foreach ($total as $slug => $n):
  $pct = $sum ? round($n * 100 / $sum) : 0; ?>
  <tr><td><?= e($parts[$slug]['name'] ?? $slug) ?></td>
      <td><?= e($parts[$slug]['cat'] ?? '—') ?></td>
      <td><?= number_format($n) ?></td>
      <td><div class="bar" style="width:<?= max(2,$pct) ?>%"></div><small><?= $pct ?>%</small></td></tr>
<?php endforeach; ?>
</table>

<h3>آخر 7 أيام</h3>
<table><tr><th>اليوم</th><th>النقرات</th></tr>
<?php if (!$last7): ?><tr><td colspan="2">—</td></tr><?php endif; ?>
<?php foreach (array_reverse($last7, true) as $d => $row): ?>
  <tr><td><?= e($d) ?></td><td><?= number_format(array_sum($row)) ?></td></tr>
<?php endforeach; ?>
</table>

<h3>حسب مصدر النقرة</h3>
<table><tr><th>المصدر</th><th>النقرات</th></tr>
<?php if (!$source): ?><tr><td colspan="2">—</td></tr><?php endif; ?>
<?php foreach ($source as $s => $row): ?>
  <tr><td><?= e($s) ?></td><td><?= number_format(array_sum($row)) ?></td></tr>
<?php endforeach; ?>
</table>

<p class="foot">لتفعيل الربح: افتح <code>affiliates.json</code> وضع رابط الأفلييت الخاص بك مكان <code>url</code> لكل شريك. لا تُخزَّن عناوين IP — تُجزَّأ يومياً فقط لحساب الزوّار الفريدين.</p>
</div></body></html>
