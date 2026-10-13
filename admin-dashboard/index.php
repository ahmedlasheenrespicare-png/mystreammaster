<?php
/**
 * بوابة لوحة التحكم — مصادقة على الخادم (جلسة PHP).
 * لا تُرسل لوحة التحكم إلى المتصفح إلا بعد تسجيل دخول صحيح.
 *
 * لتغيير كلمة المرور: شغّل admin-dashboard/make-hash.php?p=كلمتك_الجديدة
 * ثم ضع القيمتين الناتجتين مكان ADMIN_SALT و ADMIN_HASH بالأسفل، واحذف make-hash.php.
 */
declare(strict_types=1);

// كلمة المرور الحالية موجودة في الملف NEW_ADMIN_PASSWORD.txt المرفق — غيّرها فوراً بعد أول دخول.
const ADMIN_SALT  = 'e21a799ec9b4e83ad8a1a24e5c40af83';
const ADMIN_HASH  = '2e43184d198a33126d04a90df3aaeef71e4f16a75d6edafcc48ac2490fb27902';
const ITERATIONS  = 200000;
const SESSION_TTL = 3600 * 4;   // 4 ساعات
const MAX_TRIES   = 5;          // محاولات فاشلة قبل الحظر المؤقت
const LOCK_TIME   = 900;        // 15 دقيقة

header('X-Robots-Tag: noindex, nofollow, noarchive');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('X-Frame-Options: DENY');
header('Referrer-Policy: no-referrer');

session_set_cookie_params([
    'lifetime' => 0,
    'path'     => '/admin-dashboard/',
    'secure'   => !empty($_SERVER['HTTPS']),
    'httponly' => true,
    'samesite' => 'Strict',
]);
session_name('SMP_ADMIN');
session_start();

// تسجيل الخروج
if (isset($_GET['logout'])) {
    $_SESSION = [];
    session_destroy();
    header('Location: /admin-dashboard/');
    exit;
}

function lock_file(): string {
    return sys_get_temp_dir() . '/smp_admin_' . md5($_SERVER['REMOTE_ADDR'] ?? '0');
}
function tries(): array {
    $f = lock_file();
    if (is_file($f)) {
        $d = json_decode((string) @file_get_contents($f), true);
        if (is_array($d) && (time() - (int) $d['t']) < LOCK_TIME) return $d;
    }
    return ['t' => time(), 'n' => 0];
}

$error = '';
$locked = false;
$state  = tries();
if ($state['n'] >= MAX_TRIES) $locked = true;

// محاولة تسجيل الدخول
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST' && !$locked) {
    $csrfOk = isset($_POST['csrf'], $_SESSION['csrf']) && hash_equals($_SESSION['csrf'], (string) $_POST['csrf']);
    $pass   = (string) ($_POST['password'] ?? '');
    $calc   = hash_pbkdf2('sha256', $pass, ADMIN_SALT, ITERATIONS, 64, false);

    if ($csrfOk && hash_equals(ADMIN_HASH, $calc)) {
        session_regenerate_id(true);
        $_SESSION['auth']    = true;
        $_SESSION['expires'] = time() + SESSION_TTL;
        @unlink(lock_file());
        header('Location: /admin-dashboard/');
        exit;
    }
    $state['n']++;
    @file_put_contents(lock_file(), json_encode($state), LOCK_EX);
    $error = $csrfOk ? 'كلمة مرور خاطئة' : 'انتهت صلاحية النموذج، حاول مجدداً';
    if ($state['n'] >= MAX_TRIES) $locked = true;
}

// جلسة صالحة ⇒ اعرض اللوحة
if (!empty($_SESSION['auth']) && ($_SESSION['expires'] ?? 0) > time()) {
    $file = __DIR__ . '/private/_dashboard.html';
    if (!is_file($file)) { http_response_code(500); exit('Dashboard file missing'); }
    header('Content-Type: text/html; charset=utf-8');
    readfile($file);
    exit;
}

// نموذج الدخول
$_SESSION['csrf'] = bin2hex(random_bytes(32));
?>
<!doctype html>
<html lang="ar" dir="rtl">
<head>
    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-N7VT67MW57"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());

      gtag('config', 'G-N7VT67MW57');
    </script>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>تسجيل دخول الإدارة</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{min-height:100vh;display:grid;place-items:center;background:#0b0718;
       font-family:system-ui,'Segoe UI',Tahoma,'Noto Sans Arabic',sans-serif;color:#e5e7eb;padding:20px}
  .card{width:100%;max-width:380px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);
        border-radius:18px;padding:32px;box-shadow:0 20px 60px rgba(0,0,0,.5)}
  h1{font-size:19px;margin-bottom:6px}
  p.sub{font-size:13px;color:#9ca3af;margin-bottom:22px}
  label{display:block;font-size:13px;font-weight:700;margin-bottom:8px}
  input{width:100%;height:46px;border-radius:12px;border:1px solid rgba(255,255,255,.12);
        background:rgba(0,0,0,.3);color:#fff;padding:0 14px;font-size:15px}
  input:focus{outline:none;border-color:#dc2626}
  button{width:100%;height:46px;margin-top:18px;border:0;border-radius:12px;cursor:pointer;
         background:linear-gradient(135deg,#dc2626,#991b1b);color:#fff;font-size:15px;font-weight:800}
  .err{margin-top:14px;padding:10px 12px;border-radius:10px;background:rgba(220,38,38,.15);
       border:1px solid rgba(220,38,38,.4);color:#fca5a5;font-size:13px}
  a.back{display:block;text-align:center;margin-top:18px;color:#9ca3af;font-size:13px;text-decoration:none}
</style>
</head>
<body>
<div class="card">
  <h1>🔒 لوحة التحكم</h1>
  <p class="sub">هذه المنطقة محمية. أدخل كلمة المرور للمتابعة.</p>
  <?php if ($locked): ?>
    <div class="err">تم تجاوز عدد المحاولات. حاول بعد 15 دقيقة.</div>
  <?php else: ?>
    <form method="post" autocomplete="off">
      <input type="hidden" name="csrf" value="<?= htmlspecialchars($_SESSION['csrf'], ENT_QUOTES) ?>">
      <label for="password">كلمة المرور</label>
      <input id="password" name="password" type="password" required autofocus>
      <button type="submit">دخول</button>
    </form>
    <?php if ($error): ?><div class="err"><?= htmlspecialchars($error, ENT_QUOTES) ?></div><?php endif; ?>
  <?php endif; ?>
  <a class="back" href="/">← العودة للموقع</a>
</div>
</body>
</html>
