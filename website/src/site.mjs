/* ==========================================================================
   مصدر واحد للنطاق والقيم المشتقة منه — يعمل في Node و Vite معاً
   --------------------------------------------------------------------------
   المشكلة التي يحلّها هذا الملف: config.ts يقرأ النطاق من import.meta.env،
   وهو غير موجود في سكربتات البناء التي تعمل بـ Node مباشرةً، فكان كل سكربت
   يعيد كتابة النطاق والبريد يدوياً. هذه الوحدة ملف JS خالص (مثل
   navigation.mjs) فتصلح للاستيراد من الاثنين.

   تُستخدم في:
   • src/config.ts            — يصدّرها لتطبيق React (مصدر المكوّنات)
   • scripts/legacy-shell.mjs — قالب هيدر وفوتر الصفحات القديمة

   فأي تغيير نطاق أو بريد يتم في مكان واحد فقط.
========================================================================== */

/* import.meta.env متاح في Vite فقط، و process.env في Node؛ يُقرأ أيّهما متاحاً
   بنفس ترتيب الأولوية السابق (متغيّر البيئة ثم قيمة الإنتاج الافتراضية). */
const fromVite =
  typeof import.meta !== "undefined" ? import.meta.env?.VITE_SITE_URL : undefined;
const fromNode =
  typeof process !== "undefined" ? process.env?.VITE_SITE_URL : undefined;

/** العنوان الأساسي للموقع — بلا شرطة ختامية */
export const SITE_URL = String(
  fromVite || fromNode || "https://streammasterstore.com",
).replace(/\/+$/, "");

/** النطاق بلا بروتوكول ولا شرطة ختامية */
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "");

/** بريد الدعم الرسمي — يُشتق من النطاق نفسه */
export const SUPPORT_EMAIL = `support@${SITE_HOST}`;
