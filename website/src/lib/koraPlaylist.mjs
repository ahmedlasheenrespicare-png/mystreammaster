/* ==========================================================================
   قارئ قائمة قنوات Kora (kora-live.m3u8)
   --------------------------------------------------------------------------
   كان هذا المنطق مكتوباً داخل LivePlayer.tsx ولا يمكن اختباره.
   نُقل هنا كملف JS خالص (بلا JSX/TS) لسببين:
     1) يستورده المشغل عبر Vite كما هو — لا نسخة مكرّرة من نفس المنطق
     2) تستورده اختبارات node:test مباشرة (scripts/test-playlist.mjs)
   الأنواع (TypeScript) في الملف المجاور koraPlaylist.d.mts
========================================================================== */

export const FALLBACK_CHANNEL_NAME = "مباراة مباشرة";
/* tvg-logo في ملف Kora رابط favicon طويل وليس رمزاً — لا يصلح كأيقونة داخل
   البطاقة الصغيرة فنستبدله دائماً بإيموجي كرة حتى لا ينكسر شكل القائمة */
export const FALLBACK_CHANNEL_LOGO = "⚽";
/* «Live» القادمة من مولّد الملف تُعرض كما هي (إنجليزية) داخل زر التصنيف
   فنوحّدها دائماً إلى «مباريات مباشرة» لتطابق الاسم الذي يراه الزائر */
export const LIVE_CATEGORY = "مباريات مباشرة";

/**
 * يقرأ نص ملف m3u8 ويُرجع القنوات: سطر #EXTINF يليه رابط بث.
 * يتجاهل أي نص ليس قائمة m3u8 (يُرجع مصفوفة فارغة).
 * @param {string} text محتوى ملف m3u8
 * @returns {{name: string, logo: string, cat: string, url: string}[]}
 */
export function parseKoraPlaylist(text) {
  if (typeof text !== "string" || !text.includes("#EXTM3U")) return [];

  const lines = text.split(/\r?\n/);
  const out = [];
  let pending = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith("#EXTINF:")) {
      const name = line.slice(line.lastIndexOf(",") + 1).trim() || FALLBACK_CHANNEL_NAME;
      const rawCat = /group-title="([^"]*)"/.exec(line)?.[1]?.trim();
      const cat = !rawCat || /^live$/i.test(rawCat) ? LIVE_CATEGORY : rawCat;
      pending = { name, logo: FALLBACK_CHANNEL_LOGO, cat };
    } else if (pending && /^https?:\/\//i.test(line)) {
      out.push({ ...pending, url: line });
      pending = null;
    }
  }

  return out;
}
