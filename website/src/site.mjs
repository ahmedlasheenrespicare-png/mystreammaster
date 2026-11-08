/* ==========================================================================
   مصدر واحد للنطاق وبيانات التواصل — يعمل في Node و Vite معاً
   --------------------------------------------------------------------------
   المشكلة التي يحلّها هذا الملف: config.ts يقرأ النطاق من import.meta.env،
   وهو غير موجود في سكربتات البناء التي تعمل بـ Node مباشرةً، فكان كل سكربت
   يعيد كتابة بيانات التواصل يدوياً. هذه الوحدة ملف JS خالص (مثل
   navigation.mjs) فتصلح للاستيراد من الاثنين.

   تُستخدم في:
   • src/config.ts            — يصدّرها لتطبيق React (مصدر المكوّنات)
   • scripts/legacy-shell.mjs — قالب هيدر وفوتر الصفحات القديمة

   فأي تغيير في النطاق أو البريد أو رقم واتساب يتم في مكان واحد فقط.
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

/** رقم واتساب الدولي بصيغة wa.me (من دون علامة +) وصيغته المقروءة في الواجهة. */
export const WHATSAPP_NUMBER = "201090415657";
export const WHATSAPP_DISPLAY = "+20 109 041 5657";
