<?php
/**
 * أداة مؤقتة لتوليد كلمة مرور الإدارة.
 * الاستخدام: /admin-dashboard/make-hash.php?p=كلمة_المرور_الجديدة
 * ثم انسخ القيمتين إلى index.php و **احذف هذا الملف فوراً**.
 */
header('Content-Type: text/plain; charset=utf-8');
$p = $_GET['p'] ?? '';
if ($p === '') { exit("مرّر كلمة المرور: make-hash.php?p=...\n"); }
$salt = bin2hex(random_bytes(16));
$hash = hash_pbkdf2('sha256', $p, $salt, 200000, 64, false);
echo "const ADMIN_SALT = '$salt';\nconst ADMIN_HASH = '$hash';\n\n⚠️ احذف هذا الملف بعد الاستخدام.\n";
