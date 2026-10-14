/* ==========================================================================
   عقد بروكسي HLS في /proxy.php — بصمة المشغّل + تحويل 302 + Range + الجلسة
   --------------------------------------------------------------------------
   بيئة الاختبار لا تشغّل PHP (الاستضافة فقط تشغّله)، لذلك نفحص مصدر الملف
   نفسه — نفس الأسلوب المتبع مع scoreboard.php في test-matches.mjs.
   الهدف: أي تعديل يكسر أحد هذه العقود يسقط في CI قبل النشر.

   التشغيل:  npm test
========================================================================== */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { SMARTERS_USER_AGENT, UA_PARAM, UA_PRESET_SMARTERS } from "../src/lib/xtream.mjs";

const PHP_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../proxy.php");
const source = await fs.readFile(PHP_PATH, "utf8");

/* يقطع كل سطر من المصدر حتى نهاية الملف (للفحص المتكرر) */
function has(...needles) {
  for (const needle of needles) {
    assert.ok(source.includes(needle), `proxy.php يجب أن يحتوي: ${needle}`);
  }
}

/* ١ — بصمة المشغّل: نفس القيمة الحرفية ونفس اسم المعامل المتفق عليه مع المشغّل */
test("proxy.php يرسل بصمة IPTV Smarters/VLC التي يطلبها المشغّل", () => {
  assert.equal(UA_PRESET_SMARTERS, "smarters");
  has(
    `const UA_PARAM = '${UA_PARAM}';`,
    `'${UA_PRESET_SMARTERS}' => '${SMARTERS_USER_AGENT}',`,
    "function upstream_user_agent()",
    "CURLOPT_USERAGENT       => $userAgent,"
  );

  /* القيمة الحرفية كاملة وبلا تعديل — السيرفرات تطابقها نصياً */
  assert.equal(
    source.includes("iptv_smarters_player_lite/1.4.2 VLC/3.1.2 LibVLC/3.1.2"),
    true,
    "بصمة Smarters/VLC يجب أن تكون مطابقة حرفياً لقيمة المشغّل"
  );

  /* القائمة مغلقة: لا User-Agent عشوائي من الزائر (الوسيط ليس أداة تمويه) */
  assert.ok(
    source.includes("array_key_exists($preset, UA_PRESETS)"),
    "البصمات المقبولة يجب أن تأتي من قائمة مغلقة فقط"
  );
  assert.ok(
    source.includes("function requested_ua_preset()"),
    "دالة فحص البصمة المطلوبة مفقودة"
  );
});

/* ٢ — البصمة ثابتة عبر كل قفزات التحويل (بعض السيرفرات تربط الجلسة بها) */
test("proxy.php يحافظ على بصمة واحدة ثابتة عبر قفزات إعادة التوجيه", () => {
  const fn = source.slice(
    source.indexOf("function safe_request("),
    source.indexOf("/** استخراج الرابط المطلوب")
  );
  assert.ok(fn.length > 500, "لم نجد جسم safe_request");

  /* البصمة تُحسب مرة واحدة قبل الحلقة لا داخلها */
  const beforeLoop = fn.slice(0, fn.indexOf("while (true)"));
  assert.ok(
    beforeLoop.includes("$userAgent = upstream_user_agent();"),
    "User-Agent يجب أن يُحسب مرة واحدة قبل حلقة التحويلات"
  );
  assert.equal(
    fn.includes("$_SERVER['HTTP_USER_AGENT'] ??"),
    false,
    "لا يجوز قراءة بصمة المتصفح داخل حلقة الطلب (تُقرأ مرة واحدة فقط)"
  );
});

/* ٣ — متابعة تحويل 302 يدوياً مع تحقق أمني من كل وجهة */
test("proxy.php يتابع تحويل 302/301/307/308 ويتحقق من كل وجهة", () => {
  has(
    "CURLOPT_FOLLOWLOCATION  => false,",
    "if (in_array($code, [301, 302, 303, 307, 308], true) && $loc !== '' && $hops < MAX_REDIRECTS) {",
    "$url = resolve_relative_url($url, $loc);",
    "CURLINFO_REDIRECT_URL"
  );

  const fn = source.slice(
    source.indexOf("function safe_request("),
    source.indexOf("/** استخراج الرابط المطلوب")
  );
  /* التحقق الأمني (SSRF) داخل الحلقة — كل قفزة تُفحص لا الأولى فقط */
  const loop = fn.slice(fn.indexOf("while (true)"));
  assert.ok(
    loop.indexOf("$url  = validate_url($url);") < loop.indexOf("curl_init"),
    "validate_url يجب أن يُنفَّذ قبل كل طلب (كل قفزة تحويل)"
  );
});

/* ٤ — Range: يُمرَّر للسيرفر الأصلي ويبقى عبر القفزات، وترد حالة 206 كما هي */
test("proxy.php يحافظ على Range ويعيد حالة الرد الجزئي (206) و Content-Range", () => {
  has(
    "if (!empty($_SERVER['HTTP_RANGE'])) {",
    "$rangeHeaders[] = 'Range: ' . (string) $_SERVER['HTTP_RANGE'];",
    "safe_request($url, $headerOpts, false, $rangeHeaders);"
  );

  /* ترويسة Range تُمرَّر كـ customHeaders فتُعاد في كل قفزة تحويل */
  const fn = source.slice(
    source.indexOf("function safe_request("),
    source.indexOf("/** استخراج الرابط المطلوب")
  );
  assert.ok(
    fn.includes("upstream_headers_for($host, $customHeaders)"),
    "رؤوس المستدعي (ومنها Range) يجب أن تُرسل في كل قفزة"
  );

  /* حالة الرد النهائي تُعاد كما هي — بدونها يظن المتصفح أن الملف اكتمل */
  has(
    "if ($finalCode >= 100) http_response_code($finalCode);",
    "'content-range'",
    "'accept-ranges'",
    "$flushHead();"
  );

  /* رؤوس قفزات التحويل لا تُمرَّر (Content-Length الخاص بصفحة 302 مثلاً) */
  assert.ok(
    source.includes("$finalCode    = (int) $m[1];\n            $finalHeaders = [];"),
    "يجب تصفير رؤوس كل قفزة عند وصول سطر حالة جديد"
  );
  /* ولا نعد بطول أكبر مما نمرّره فعلياً (حد MAX_BYTES) */
  assert.ok(
    source.includes("(int) $value <= MAX_BYTES"),
    "Content-Length يُمرَّر فقط ضمن حد MAX_BYTES"
  );
});

/* ٥ — معاملات الوسيط لا تتسرب للسيرفر الأصلي في مسار /h/ و /x/ */
test("proxy.php يحذف معاملاته الخاصة (smpua) من استعلام السيرفر الأصلي", () => {
  has("function upstream_query_string()", "$qs = upstream_query_string();");
  const fn = source.slice(
    source.indexOf("function upstream_query_string()"),
    source.indexOf("/** التقاط Set-Cookie")
  );
  assert.ok(fn.includes(`if ($key === UA_PARAM) continue;`), "يجب حذف smpua من الاستعلام");
});

/* ٦ — جلسة HLS: البصمة ومعاملات الجلسة تصل لكل رابط داخل القائمة */
test("proxy.php يحفظ البصمة ومعاملات الجلسة في كل روابط قائمة HLS", () => {
  has(
    "function with_ua_suffix(",
    "function session_query_for(",
    "function proxied_child_url(",
    "return with_ua_suffix('/proxy.php?url=' . urlencode($abs));"
  );

  const rewrite = source.slice(
    source.indexOf("function rewrite_m3u8("),
    source.indexOf("// ───────────────────────── المنطق الأساسي")
  );
  assert.ok(rewrite.length > 200, "لم نجد جسم rewrite_m3u8");
  /* المقاطع ومفاتيح فك التشفير (URI="…") تمر عبر نفس الدالة */
  assert.equal(
    rewrite.match(/proxied_child_url\(/g)?.length,
    2,
    "سطر القائمة و URI=\"…\" (مفتاح/قائمة فرعية) يجب أن يمرّا عبر proxied_child_url"
  );
  assert.ok(
    rewrite.includes("with_ua_suffix(str_starts_with($t, '/')"),
    "القوائم المعاد كتابتها مسبقاً يجب أن تحتفظ بالبصمة أيضاً"
  );

  /* معاملات الجلسة تُنسخ بحذر: نفس المضيف + رابط بلا استعلام خاص */
  const session = source.slice(
    source.indexOf("function session_query_for("),
    source.indexOf("/** رابط وسيط لسطر داخل قائمة")
  );
  assert.ok(
    session.includes("parse_url($childUrl, PHP_URL_HOST)") &&
      session.includes("parse_url($childUrl, PHP_URL_QUERY) !== null"),
    "لا تُنسخ معاملات الجلسة لمضيف آخر أو لرابط يحمل توقيعه الخاص"
  );
});

/* ٧ — كوكيز الجلسة بين قفزات التحويل (جرة في الذاكرة فقط) */
test("proxy.php يعيد كوكيز الجلسة المستلمة في قفزة التحويل التالية", () => {
  has(
    "function collect_set_cookie(",
    "function cookie_header(",
    "if ($jar) $headers[] = 'Cookie: ' . cookie_header($jar);",
    "collect_set_cookie($jar, $header);"
  );
  /* الجرة تُمرَّر بالمرجع وتُجمع حتى مع دالة رؤوس المستدعي (بث المقاطع) */
  assert.ok(
    source.includes("function ($ch, $header) use (&$jar, $callerHeaderFn)"),
    "دالة الرؤوس يجب أن تدمج التقاط الكوكيز مع دالة المستدعي"
  );
  assert.equal(
    source.includes("CURLOPT_COOKIEFILE"),
    false,
    "لا تُكتب الكوكيز على القرص إطلاقاً"
  );
});

/* ٨ — الحدود الأمنية القائمة لم تُكسر أثناء التعديل */
test("proxy.php يحتفظ بحدود SSRF و CORS و معدل الطلبات", () => {
  has(
    "function is_public_ip(",
    "function is_blocked_hostname(",
    "FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE",
    "function rate_limit()",
    "function is_allowed_origin(",
    "header('Access-Control-Expose-Headers: Content-Range, Content-Length, Accept-Ranges');",
    "if (strlen($url) > 2048) fail(414, 'Url too long');"
  );
  /* Range مسموح في طلبات CORS (بدونه يرفض المتصفح الرد الجزئي) */
  assert.ok(
    source.includes("header('Access-Control-Allow-Headers: Range, Content-Type, Origin, Accept');"),
    "ترويسة Range يجب أن تبقى مسموحة في CORS"
  );
});
