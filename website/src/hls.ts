/* ==========================================================================
   تحميل hls.js عند الطلب (Lazy)
   --------------------------------------------------------------------------
   مكتبة hls.js وحدها ~460KB (أكبر من كل الموقع) — لا داعي لتحميلها عند فتح
   الصفحة، بل عند أول ضغط على «تشغيل» في أي مشغل. التحميل يتم مرة واحدة فقط
   ثم تُخزَّن النتيجة في الذاكرة ويستفيد منها المشغلان (العام والاشتراك).
========================================================================== */

type HlsConstructor = typeof import("hls.js")["default"];

let hlsPromise: Promise<HlsConstructor> | null = null;

export function loadHls(): Promise<HlsConstructor> {
  if (!hlsPromise) {
    hlsPromise = import("hls.js")
      .then((mod) => mod.default)
      .catch((err) => {
        hlsPromise = null; /* اسمح بإعادة المحاولة عند فشل الشبكة */
        throw err;
      });
  }
  return hlsPromise;
}

/* هل المتصفح يدعم HLS أصلاً (سفاري/جوال) بدون مكتبة؟ */
export function canPlayNativeHls(video: HTMLVideoElement | null): boolean {
  return !!video && video.canPlayType("application/vnd.apple.mpegurl") !== "";
}
