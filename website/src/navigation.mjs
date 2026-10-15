/* ==========================================================================
   خريطة التنقل الموحّدة للموقع — مصدر واحد للهيدر في كل الصفحات
   --------------------------------------------------------------------------
   • يستخدمها هيدر React (src/components/Header.tsx) في الصفحات الجديدة
   • ويستخدمها هيدر الصفحات القديمة (scripts/legacy-shell.mjs) وقت البناء
   فأي رابط يُضاف هنا يظهر في الهيدر على كل صفحات الموقع تلقائياً.

   الروابط مكتوبة بلا شرطة بادئة ("channels/") — كل هيدر يضيف بادئة النشر
   الخاصة به. أقسام الرئيسية تُكتب بالمعرّف فقط ("pricing") وتتحول إلى "/#pricing".
   ملف JS خالص (مع أنواع في navigation.d.mts) ليعمل في Node و Vite بلا بناء.
========================================================================== */

/** أقسام الصفحة الرئيسية بنفس ترتيب ظهورها في الصفحة */
export const HOME_SECTIONS = [
  { id: "live-player", label: "دليل المشاهدة الرسمية", desc: "روابط القنوات والمنصات الرسمية", icon: "📡" },
  { id: "xtream", label: "مشغّل الاشتراك", desc: "شغّل باقتك من المتصفح", icon: "▶️" },
  { id: "pricing", label: "الباقات والأسعار", desc: "نوفا وإيستار وموكا", icon: "💳" },
  { id: "server-finder", label: "مساعد الاختيار", desc: "أي سيرفر يناسبك؟", icon: "🧭" },
  { id: "servers-compare", label: "مقارنة السيرفرات", desc: "الفروق بالتفصيل", icon: "⚖️" },
  { id: "channels", label: "القنوات والمنصات", desc: "+15,000 قناة حية", icon: "📺" },
  { id: "setup", label: "طريقة التشغيل", desc: "على كل الشاشات", icon: "🛠️" },
  { id: "showcase", label: "مكتبة المحتوى", desc: "أفلام ومسلسلات ورياضة", icon: "🎬" },
  { id: "blog-teaser", label: "أحدث المقالات", desc: "اعرف قبل أن تشترك", icon: "📰" },
  { id: "reviews", label: "آراء العملاء", desc: "تقييمات المشتركين", icon: "⭐" },
  { id: "faq", label: "الأسئلة الشائعة", desc: "إجابات سريعة", icon: "❓" },
];

/** صفحات السيرفرات — تُعرض كبطاقات في القائمة المنسدلة */
export const SERVER_PAGES = [
  { code: "nova", label: "سيرفر نوفا", desc: "الأقوى للمباريات", emoji: "⚽", grad: "from-[#2b4eff] to-[#7c5cff]" },
  { code: "istar", label: "سيرفر إيستار", desc: "أفلام ومسلسلات 4K", emoji: "🎬", grad: "from-[#7c5cff] to-[#3effe0]" },
  { code: "moka", label: "سيرفر موكا", desc: "اقتصادي وثابت", emoji: "⚡", grad: "from-[#d8ff3e] to-[#3effe0]" },
];

/**
 * مجموعات الهيدر — كل مجموعة قائمة منسدلة واحدة.
 * المجموعة "home" تعرض HOME_SECTIONS، و"servers" تعرض بطاقات SERVER_PAGES.
 */
export const NAV_GROUPS = [
  {
    key: "home",
    label: "الرئيسية",
    match: [""],
    links: [{ href: "", label: "الصفحة الرئيسية", desc: "العودة إلى أعلى الصفحة" }],
  },
  {
    key: "servers",
    label: "السيرفرات والباقات",
    match: ["servers", "store", "cart", "nova", "istar", "moka"],
    links: [
      { href: "servers/", label: "كل السيرفرات", desc: "الباقات مع جدول المقارنة" },
      { href: "store/", label: "المتجر", desc: "اختر باقتك وأضفها للسلة" },
      { href: "cart/", label: "سلة المشتريات", desc: "راجع طلبك وأكمله" },
    ],
  },
  {
    key: "watch",
    label: "القنوات والبث",
    match: ["matches", "channels", "live-free.html", "world-cup-2026", "predictions", "watch-legal.html"],
    links: [
      { href: "matches/", label: "مواعيد المباريات", desc: "النتائج والمواعيد بتوقيتك" },
      { href: "channels/", label: "مكتبة القنوات", desc: "ابحث في كل القنوات" },
      { href: "live-free.html", label: "مشغّل الويب الذكي", desc: "شغّل اشتراكك واستعرض المميزات" },
      { href: "world-cup-2026/", label: "كأس العالم 2026", desc: "المواعيد والقنوات الناقلة" },
      { href: "predictions/", label: "توقعات المباريات", desc: "تحليلات قبل كل مباراة" },
      { href: "watch-legal.html", label: "المشاهدة القانونية", desc: "الاشتراكات الرسمية" },
    ],
  },
  {
    key: "tournaments",
    label: "البطولات والمنتخبات",
    /* مسارات كاملة (بادئة) — تفوز على مطابقة المقطع الأول في activeGroupKey */
    match: [
      "matches/الدوري-الإنجليزي", "matches/دوري-أبطال-أوروبا", "matches/الدوري-السعودي",
      "world-cup-2026/المغرب", "world-cup-2026/مصر", "world-cup-2026/الجزائر", "world-cup-2026/تونس",
      "world-cup-2026/السعودية", "world-cup-2026/قطر", "world-cup-2026/العراق", "world-cup-2026/الأردن",
    ],
    links: [
      { href: "matches/الدوري-الإنجليزي/", label: "مباريات الدوري الإنجليزي", desc: "الجدول والقنوات الناقلة", icon: "🏴" },
      { href: "matches/دوري-أبطال-أوروبا/", label: "مباريات دوري أبطال أوروبا", desc: "المواعيد والنتائج", icon: "🏆" },
      { href: "matches/الدوري-السعودي/", label: "مباريات الدوري السعودي", desc: "الجدول والتوقيتات", icon: "🇸🇦" },
      { href: "world-cup-2026/المغرب/", label: "منتخب المغرب", desc: "المباريات والتوقيتات", icon: "🇲🇦" },
      { href: "world-cup-2026/مصر/", label: "منتخب مصر", desc: "المباريات والتوقيتات", icon: "🇪🇬" },
      { href: "world-cup-2026/الجزائر/", label: "منتخب الجزائر", desc: "المباريات والتوقيتات", icon: "🇩🇿" },
      { href: "world-cup-2026/تونس/", label: "منتخب تونس", desc: "المباريات والتوقيتات", icon: "🇹🇳" },
      { href: "world-cup-2026/السعودية/", label: "منتخب السعودية", desc: "المباريات والتوقيتات", icon: "🇸🇦" },
      { href: "world-cup-2026/قطر/", label: "منتخب قطر", desc: "المباريات والتوقيتات", icon: "🇶🇦" },
      { href: "world-cup-2026/العراق/", label: "منتخب العراق", desc: "المباريات والتوقيتات", icon: "🇮🇶" },
      { href: "world-cup-2026/الأردن/", label: "منتخب الأردن", desc: "المباريات والتوقيتات", icon: "🇯🇴" },
    ],
  },
  {
    key: "blog",
    label: "المقالات",
    match: ["blog"],
    links: [
      { href: "blog/", label: "كل المقالات والدلائل", desc: "أرشيف المدونة كاملاً" },
      { href: "blog/choose-iptv-server/", label: "كيف تختار سيرفرك؟", desc: "نوفا أم إيستار أم موكا" },
      { href: "blog/iptv-samsung-lg-setup/", label: "التشغيل على سامسونج و LG", desc: "خطوات مفصّلة" },
      { href: "blog/test-iptv-server-stability/", label: "اختبار ثبات السيرفر", desc: "7 اختبارات قبل الدفع" },
    ],
  },
  {
    key: "help",
    label: "المساعدة",
    match: ["faq", "about", "status", "search", "privacy", "terms", "refund"],
    links: [
      { href: "faq/", label: "الأسئلة الشائعة", desc: "كل ما يسأل عنه المشتركون" },
      { href: "status/", label: "حالة الخدمة", desc: "حالة السيرفرات الآن" },
      { href: "search/", label: "البحث في الموقع", desc: "ابحث في الصفحات والمقالات" },
      { href: "about/", label: "من نحن", desc: "تعرّف على ستريم ماستر" },
    ],
    legal: [
      { href: "privacy/", label: "الخصوصية" },
      { href: "terms/", label: "الشروط" },
      { href: "refund/", label: "الاسترجاع" },
    ],
  },
];

/**
 * أي مجموعة تخص المسار الحالي؟ (لتمييز عنصر الهيدر النشط)
 * المطابقة بالأطول: مدخلات المطابقة قد تكون مقطعاً أول ("matches") أو مساراً
 * كاملاً كبادئة ("matches/الدوري-الإنجليزي") — فيفوز الأدق عند التعارض.
 * @param {string} path مسار بلا بادئة النشر مثل "/nova" أو "/blog/xxx/"
 */
export function activeGroupKey(path) {
  const raw = String(path || "/");
  let decoded = raw;
  try {
    decoded = decodeURI(raw);
  } catch {
    /* مسار غير صالح الترميز — نستخدمه كما هو */
  }
  const clean = decoded.replace(/^\/+/, "").replace(/\/+$/, "");
  const first = clean.split("/")[0];
  let bestKey = "";
  let bestLen = 0;
  for (const group of NAV_GROUPS) {
    for (const entry of group.match) {
      const hit =
        entry === first ||
        (entry.includes("/") && (clean === entry || clean.startsWith(`${entry}/`)));
      if (hit && entry.length > bestLen) {
        bestKey = group.key;
        bestLen = entry.length;
      }
    }
  }
  return bestKey;
}
