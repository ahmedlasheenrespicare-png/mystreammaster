/* ==========================================================================
   النسخة الإنجليزية — الصفحات التجارية فقط (الرئيسية، السيرفرات الأربعة،
   الأسئلة). خريطة الأزواج اللغوية مصدر واحد لمبدّل اللغة ووسوم hreflang:
   أي صفحة إنجليزية جديدة تُسجَّل هنا وفي navigation.mjs (EN_PAGES).
========================================================================== */

/** أزواج (عربي ↔ إنجليزي) للصفحات التجارية — المسارات بلا بادئة النشر */
export const LOCALE_PAIRS: { ar: string; en: string }[] = [
  { ar: "/", en: "/en" },
  { ar: "/nova", en: "/en/nova" },
  { ar: "/istar", en: "/en/istar" },
  { ar: "/moka", en: "/en/moka" },
  { ar: "/x", en: "/en/x" },
  { ar: "/faq", en: "/en/faq" },
];

/** مسارات النسخة الإنجليزية كلها */
export const EN_PATHS = LOCALE_PAIRS.map((p) => p.en);

export function isEnPath(path: string): boolean {
  return path === "/en" || path.startsWith("/en/");
}

/** مقابل المسار الحالي في اللغة الأخرى (للمبدّل وhreflang) */
export function counterpartPath(path: string): string {
  if (isEnPath(path)) {
    return LOCALE_PAIRS.find((p) => p.en === path)?.ar ?? "/";
  }
  return LOCALE_PAIRS.find((p) => p.ar === path)?.en ?? "/en";
}

/**
 * رابط المبدّل جاهزاً لـ href: ينتهي بشرطة مائلة دائماً (إلا الجذر).
 * السبب تقني بحت: كل صفحة على الموقع تُنشر كمجلد (‎/en/‎ ويحمل canonical
 * بشرطة ختامية)، فرابط بلا شرطة يعني 301 إضافياً في كل نقرة داخلية —
 * وقد ظهرت النسختان مفهرستان في Search Console (‎/en‎ و‎/en/‎) لأن 770
 * رابطاً داخلياً كانت تشير إلى الصيغة الخاطئة.
 */
export function counterpartHref(path: string): string {
  const target = counterpartPath(path);
  return target === "/" ? "/" : `${target.replace(/\/+$/, "")}/`;
}
