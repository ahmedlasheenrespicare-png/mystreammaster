/* ==========================================================================
   حارس سياسة AdSense — يمنع عودة المُحمِّل إلى صفحة لا يجوز الإعلان عليها
   --------------------------------------------------------------------------
   سياسة Google Publisher تمنع الإعلانات على: الصفحات الفارغة/النحيفة، وواجهات
   الألعاب، وواجهات المشغّلات. أُخرجت هذه الصفحات مرة واحدة يدوياً عبر
   NO_ADS_ROUTES وNO_ADS_PAGES؛ وهذا الحارس يمنع أن تعود إليها بالخطأ عند
   إضافة مسار جديد أو تغيير قالب.

   القاعدة: أي صفحة تحمل مُحمِّل adsbygoogle ويقلّ نصّها المرئي عن
   MIN_ADS_WORDS كلمة ⇒ فشل بناء صريح، لا تحذير.

   العتبة 150 كلمة: أدنى صفحة إعلانية معتمدة حالياً 285 كلمة
   (`/channels/religious/`)، فالهامش كافٍ ولا يفشل البناء على محتوى قائم.
========================================================================== */

export const MIN_ADS_WORDS = 150;

/** كلمات النص المرئي: من <main> إن وُجد، وإلا من <body>، بعد إسقاط السكربتات
    والأنماط وSVG والقوالب — مطابق لطريقة قياس تقرير الاستهداف. */
export function visibleWords(html) {
  const body = String(html).replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<template[\s\S]*?<\/template>/gi, " ");
  const main = body.match(/<main[\s\S]*?<\/main>/i);
  const scope = main ? main[0] : body;
  return scope
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .split(/\s+/)
    .filter(Boolean).length;
}

export function hasAdLoader(html) {
  return /googlesyndication|adsbygoogle\.js/i.test(String(html));
}

/**
 * يرمي خطأً إن كانت الصفحة تحمل الإعلانات ونصّها أقل من الحد.
 * `route` يظهر في رسالة الخطأ ليعرف المُصلح أين المشكلة.
 */
export function assertAdsAllowed(html, route) {
  if (!hasAdLoader(html)) return { words: visibleWords(html), ads: false };
  const words = visibleWords(html);
  if (words < MIN_ADS_WORDS) {
    throw new Error(
      `صفحة تحمل إعلانات AdSense ونصّها ${words} كلمة (< ${MIN_ADS_WORDS}): ${route}\n` +
        "أضفها إلى NO_ADS_ROUTES في scripts/prerender.mjs أو NO_ADS_PAGES في " +
        "scripts/publish-static.mjs، أو أغنِ محتواها.",
    );
  }
  return { words, ads: true };
}
