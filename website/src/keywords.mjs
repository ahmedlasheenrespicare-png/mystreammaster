/* ==========================================================================
   خريطة الكلمات المستهدفة — مصدر واحد لقصد كل مسار
   --------------------------------------------------------------------------
   • مسار واحد = كلمة أساسية واحدة = قصد واحد.
   • primary = null إعلان صريح: صفحة قانونية/وظيفية لا تستهدف كلمة.
   • لا تكرّر primary بين مسارين — الحارس في scripts/seo-guard.mjs يرفض.
   • المفاتيح مكتوبة في صيغتها المُطبَّعة (بلا شرطة ختامية) لأن normalizeRoute
     يزيل الشرطة الختامية قبل البحث — تماماً كما يفعل normalizePath في router.tsx.
   • ملف JS خالص (مع أنواع في keywords.d.mts) ليعمل في Node (سكربتات البناء)
     وفي Vite (تطبيق React) بلا خطوة بناء خاصة — نفس نمط site.mjs/navigation.mjs.
========================================================================== */

export const KEYWORDS = {
  "/": {
    primary: "ربط تقني",
    secondary: ["دليل المشاهدة", "إعداد مشغلات", "M3U"],
    intent: "transactional",
  },
  "/about": { primary: "من نحن", intent: "navigational" },
  "/blog": { primary: "أدلة تشغيل", intent: "informational" },
  "/blog/android-tv-boxes-buying-guide": { primary: "صناديق Android TV", intent: "informational" },
  "/blog/choose-iptv-server": { primary: "اختيار سيرفر IPTV", intent: "informational" },
  "/blog/hdr-and-frame-rate-explained": { primary: "HDR", intent: "informational" },
  /* صفحة تحريرية بلا استهداف كلمي — قرار مصيرها (حذف/نقل/إبقاء) بيد المالك */
  "/blog/http-protocols": { primary: null, intent: "editorial" },
  "/blog/internet-speed-for-video-streaming": { primary: "سرعة الإنترنت", intent: "informational" },
  "/blog/iptv-samsung-lg-setup": { primary: "إعداد IPTV على سامسونج", intent: "informational" },
  "/blog/iptv-على-apple-tv": { primary: "إعداد مشغّل IPTV", intent: "informational" },
  "/blog/iptv-مقابل-netflix-وشاهد": { primary: "IPTV مقابل Netflix", intent: "comparison" },
  "/blog/phone-and-computer-viewing-setup": { primary: "المشاهدة على الهاتف", intent: "informational" },
  "/blog/risks-of-unverified-apps": { primary: "التطبيقات غير الموثوقة", intent: "informational" },
  "/blog/test-iptv-server-stability": { primary: "ثبات سيرفر IPTV", intent: "informational" },
  "/blog/video-resolution-hd-fhd-4k": { primary: "دقة الصورة", intent: "informational" },
  "/blog/what-is-unlicensed-streaming": { primary: "بث محتوى بدون ترخيص", intent: "informational" },
  "/blog/أهمية-الدعم-الفني-في-اشتراكات-iptv": { primary: "الدعم الفني", intent: "informational" },
  "/blog/افضل-اشتراك-iptv-2026": { primary: "اشتراك IPTV 2026", intent: "informational" },
  "/blog/افضل-قنوات-iptv-الرياضية": { primary: "القنوات الرياضية الناقلة", intent: "informational" },
  "/blog/الدول-العربية-في-كأس-العالم-2026": { primary: "المنتخبات العربية", intent: "informational" },
  "/blog/تثبيت-iptv-على-samsung-smart-tv": { primary: "Samsung Smart TV", intent: "informational" },
  "/blog/كأس-العالم-2026-iptv": { primary: "كأس العالم 2026", intent: "informational" },
  "/blog/مقارنة-نوفا-ايستار-موكا": { primary: "مقارنة نوفا", intent: "comparison" },
  "/blog/نهائي-دوري-أبطال-أوروبا-2026": { primary: "نهائي دوري أبطال أوروبا", intent: "informational" },
  "/blog/هل-iptv-آمن": { primary: "هل IPTV آمن", intent: "informational" },
  "/channels": { primary: "دليل القنوات", intent: "informational" },
  "/channels/documentaries": { primary: "القنوات الوثائقية", intent: "informational" },
  "/channels/entertainment": { primary: "قنوات الترفيه", intent: "informational" },
  "/channels/kids": { primary: "قنوات الأطفال", intent: "informational" },
  "/channels/movies": { primary: "قنوات الأفلام", intent: "informational" },
  "/channels/music": { primary: "القنوات الموسيقية", intent: "informational" },
  "/channels/news": { primary: "القنوات الإخبارية", intent: "informational" },
  "/channels/platforms": { primary: "منصات المشاهدة", intent: "informational" },
  "/channels/religious": { primary: "القنوات الدينية", intent: "informational" },
  "/channels/sports": { primary: "القنوات الرياضية", intent: "informational" },
  "/en": { primary: "technical activation", intent: "transactional" },
  "/en/faq": { primary: "FAQ", intent: "informational" },
  "/en/istar": { primary: "iStar Pro Server", intent: "transactional" },
  "/en/moka": { primary: "Moka Server", intent: "transactional" },
  "/en/nova": { primary: "Nova Server", intent: "transactional" },
  "/faq": { primary: "أسئلة تفعيل IPTV", intent: "informational" },
  "/galatasaray-barcelona": { primary: "جالاتا سراي", intent: "editorial" },
  "/galatasaray-barcelona/watch": { primary: "متابعة جالاتا سراي", intent: "editorial" },
  "/istar": { primary: "باقة إيستار", intent: "transactional" },
  "/manchester-city-psg": { primary: "مانشستر سيتي", intent: "editorial" },
  "/manchester-city-psg/watch": { primary: "متابعة سيتي", intent: "editorial" },
  "/manchester-united-atletico": { primary: "أتلتيكو", intent: "editorial" },
  "/manchester-united-atletico/watch": { primary: "متابعة أتلتيكو", intent: "editorial" },
  "/match-analysis": { primary: "تحليل مباريات", intent: "editorial" },
  "/match-center": { primary: "مركز المباراة", intent: "informational" },
  "/matches": { primary: "مواعيد المباريات", intent: "informational" },
  "/matches/الدوري-الألماني": { primary: "مباريات الدوري الألماني", intent: "informational" },
  "/matches/الدوري-الإسباني": { primary: "مباريات الدوري الإسباني", intent: "informational" },
  "/matches/الدوري-الإنجليزي": { primary: "مباريات الدوري الإنجليزي", intent: "informational" },
  "/matches/الدوري-الإيطالي": { primary: "مباريات الدوري الإيطالي", intent: "informational" },
  "/matches/الدوري-السعودي": { primary: "مباريات الدوري السعودي", intent: "informational" },
  "/matches/الدوري-الفرنسي": { primary: "مباريات الدوري الفرنسي", intent: "informational" },
  "/matches/الدوري-المصري": { primary: "مباريات الدوري المصري", intent: "informational" },
  "/matches/دوري-أبطال-أوروبا": { primary: "دوري أبطال أوروبا", intent: "informational" },
  "/moka": { primary: "باقة موكا", intent: "transactional" },
  "/nova": { primary: "باقة نوفا", intent: "transactional" },
  "/predictions": { primary: "توقعات المباريات", intent: "editorial" },
  /* صفحات قانونية: لا تُنافس على كلمة — null إعلان صريح لا فراغ بيانات */
  "/privacy": { primary: null, intent: "legal" },
  "/refund": { primary: null, intent: "legal" },
  "/terms": { primary: null, intent: "legal" },
  "/roma-real-madrid": { primary: "روما", intent: "editorial" },
  "/roma-real-madrid/watch": { primary: "متابعة روما", intent: "editorial" },
  "/servers": { primary: "مقارنة السيرفرات", intent: "comparison" },
  "/status": { primary: "حالة الخدمة", intent: "navigational" },
  "/store": { primary: "سعر باقات التفعيل", intent: "transactional" },
  "/trial": { primary: "تجربة IPTV مجانية", intent: "transactional" },
  "/watch-legal.html": { primary: "المشاهدة القانونية", intent: "informational" },
  "/world-cup-2026": { primary: "كأس العالم FIFA 2026", intent: "informational" },
  "/world-cup-2026/الأردن": { primary: "منتخب الأردن", intent: "informational" },
  "/world-cup-2026/الجزائر": { primary: "منتخب الجزائر", intent: "informational" },
  "/world-cup-2026/السعودية": { primary: "منتخب السعودية", intent: "informational" },
  "/world-cup-2026/العراق": { primary: "منتخب العراق", intent: "informational" },
  "/world-cup-2026/المغرب": { primary: "منتخب المغرب", intent: "informational" },
  "/world-cup-2026/تونس": { primary: "منتخب تونس", intent: "informational" },
  "/world-cup-2026/قطر": { primary: "منتخب قطر", intent: "informational" },
  "/world-cup-2026/مصر": { primary: "منتخب مصر", intent: "informational" },
};

/**
 * تطبيع المسار: بلا شرطة ختامية، مع فك ترميز السلاجات العربية.
 * يطابق سلوك normalizePath في src/router.tsx (فك الترميز + توحيد البادئة +
 * إزالة الشرطة الختامية) حتى تُعثَر على مفاتيح الخريطة من مسارات المتصفح
 * ومن مسارات ملفات البناء على حد سواء.
 */
export function normalizeRoute(route) {
  let out = String(route ?? "/");
  try {
    out = decodeURI(out);
  } catch {
    /* مسار غير صالح الترميز — نستخدمه كما هو */
  }
  out = `/${out.replace(/^\/+/, "")}`;
  if (out !== "/" && !/\.[a-z0-9]+$/i.test(out)) out = out.replace(/\/+$/, "");
  return out || "/";
}

/** كلمة المسار أو إعلان صريح بأنه بلا استهداف (primary: null) */
export function keywordsFor(route) {
  return KEYWORDS[normalizeRoute(route)] ?? { primary: null, intent: "navigational" };
}

/**
 * هل المسار مُغطّى صراحةً في الخريطة؟ يفصل «صفحة بلا استهداف (primary: null)»
 * عن «صفحة نُسيت من الخريطة» — تستخدمه حرّاسات التغطية وقت البناء.
 */
export function hasKeywordEntry(route) {
  return Object.prototype.hasOwnProperty.call(KEYWORDS, normalizeRoute(route));
}
