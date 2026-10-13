/* تحميل كسول لمكتبة mpegts.js (MPEG-TS الخام عبر MSE) —
   تُستدعى فقط عند الحاجة عند تشغيل روابط .ts، وتُسقط بوضوح عند فشل الشبكة. */

type MpegtsModule = typeof import("mpegts.js")["default"];

let pending: Promise<MpegtsModule> | null = null;

export function loadMpegts(): Promise<MpegtsModule> {
  if (!pending) {
    pending = import("mpegts.js")
      .then((mod) => mod.default)
      .catch((err) => {
        pending = null;
        throw err;
      });
  }
  return pending;
}
