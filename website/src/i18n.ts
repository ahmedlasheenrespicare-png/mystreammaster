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
