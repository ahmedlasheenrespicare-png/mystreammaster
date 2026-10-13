/* أنواع وحدة قراءة قائمة قنوات Kora — تُطابق src/lib/koraPlaylist.mjs
   (الملف التنفيذي JS خالص ليعمل في Node و Vite بلا خطوة بناء) */

export interface ParsedChannel {
  name: string;
  logo: string;
  cat: string;
  url: string;
}

export declare const FALLBACK_CHANNEL_NAME: string;
export declare const FALLBACK_CHANNEL_LOGO: string;
export declare const LIVE_CATEGORY: string;

export declare function parseKoraPlaylist(text: string): ParsedChannel[];
