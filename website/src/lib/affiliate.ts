/**
 * خريطة معرّفات الشركاء (affiliates.json) لتحويل الروابط المباشرة
 * إلى بوابة الإحالة المعتمدة (/go.php?p=...&src=...).
 */

export const AFFILIATE_PARTNERS: Record<string, { slug: string; pattern: RegExp }> = {
  bein: {
    slug: "bein",
    pattern: /(?:bein\.com|beinsports\.com|beinsportsxtra\.com)/i,
  },
  tod: {
    slug: "tod",
    pattern: /(?:tod\.tv)/i,
  },
  shahid: {
    slug: "shahid",
    pattern: /(?:shahid\.mbc\.net)/i,
  },
  osn: {
    slug: "osn",
    pattern: /(?:osnplus\.com|osn\.com)/i,
  },
  netflix: {
    slug: "netflix",
    pattern: /(?:netflix\.com)/i,
  },
  prime: {
    slug: "prime",
    pattern: /(?:primevideo\.com)/i,
  },
  starzplay: {
    slug: "starzplay",
    pattern: /(?:starzplay\.com)/i,
  },
  disney: {
    slug: "disney",
    pattern: /(?:disneyplus\.com|disney\.com)/i,
  },
  dazn: {
    slug: "dazn",
    pattern: /(?:dazn\.com)/i,
  },
  fifaplus: {
    slug: "fifaplus",
    pattern: /(?:fifa\.com|plus\.fifa\.com)/i,
  },
  pluto: {
    slug: "pluto",
    pattern: /(?:pluto\.tv)/i,
  },
};

/**
 * تحويل رابط وجهة رسمية إلى رابط بوابة الإحالة إن كان للجهة شريك مسجّل،
 * وإلا يُعاد الرابط الأصلي كما هو.
 */
export function getDestinationUrl(url: string, source: string = "watch-guide"): string {
  try {
    for (const key of Object.keys(AFFILIATE_PARTNERS)) {
      const partner = AFFILIATE_PARTNERS[key];
      if (partner.pattern.test(url)) {
        return `/go.php?p=${encodeURIComponent(partner.slug)}&src=${encodeURIComponent(source)}`;
      }
    }
  } catch {
    // في حال حدوث أي خطأ، نبقى على الرابط الأصلي
  }
  return url;
}
