import analysisCollection from "./content/match-analysis.json";
/* ==========================================================================
   بيانات SEO لكل مسار — مصدر واحد يستخدمه:
   • الموقع عند التنقّل بين الصفحات (تحديث العنوان والوصف)
   • سكربت البناء المسبق (Prerender) الذي يكتبها داخل HTML كل صفحة

   قواعد البيانات المنظّمة هنا (مطابقة لإرشادات جوجل):
   • كيان WebPage لكل صفحة قابلة للفهرسة + BreadcrumbList مطابق لمسار
     التنقّل الظاهر في الصفحة نفسها.
   • كيانا Organization وWebSite يظهران مرة واحدة فقط (الصفحة الرئيسية)،
     وبقية الصفحات تشير إليهما بـ @id دون تكرار تعريفهما.
   • لا FAQPage إلا حيث تظهر الأسئلة وإجاباتها فعلاً في HTML الصفحة،
     ولا أسعار في Product/Offer إلا المعروضة فعلاً على الصفحة.
========================================================================== */

import { absolute, BRAND_EN, BRAND_NAME, SITE_URL, WHATSAPP_DISPLAY } from "./config";
import { AVAILABLE_DURATIONS, EN_HOME_FAQS, EN_PLAN_FAQS, FAQ_SECTIONS, FAQ_SECTIONS_EN, FAQS, PRICING_PLANS, TRIAL_FAQS } from "./data";
import { LOCALE_PAIRS } from "./i18n";
import { BLOG_POSTS } from "./content/posts";
import { LEAGUE_LANDINGS, TEAM_LANDINGS } from "./content/competitions";
import { CHANNEL_CATEGORY_PAGES } from "./content/channel-categories";
import { allMatchesVerified, matchByRoute } from "./content/match-center.mjs";
import { dayLabelInZone, kickoffLabel } from "./lib/match-center.mjs";
import { keywordsFor } from "./keywords.mjs";

export interface SeoMeta {
  title: string;
  description: string;
  canonical: string;
  robots: string;
  ogType: "website" | "article";
  /** صورة المشاركة المطلقة — خاصة بالصفحة، بمقاس 1200×630 */
  ogImage: string;
  ogImageAlt: string;
  jsonLd: Record<string, unknown>[];
  /** لغة الصفحة — تحكم lang/dir وog:locale وinLanguage */
  lang: "ar" | "en";
  /** روابط hreflang للصفحات التجارية ذات النسختين (عربي/إنجليزي) */
  alternates?: { hreflang: string; href: string }[];
  /**
   * لون شريط المتصفح لهذه الصفحة. غيابه يعني «اترك القيمة العامة» — ولا تُنسخ
   * القيمة العامة هنا، بل تُقرأ من القالب نفسه حتى لا يتباعد تعريفان لها.
   */
  themeColor?: string;
  /** الكلمة التي تملكها الصفحة. null = صفحة لا تستهدف كلمة (قانونية/وظيفية) */
  primaryKeyword?: string | null;
  secondaryKeywords?: string[];
  intent?: "transactional" | "comparison" | "informational" | "editorial" | "legal" | "navigational";
}

const OG_IMAGE = `${SITE_URL}/images/og-default.png`;

/* ==========================================================================
   صورة المشاركة الخاصة بكل صفحة — 1200×630
   --------------------------------------------------------------------------
   القاعدة ٣ تشترط صورة مشاركة **خاصة بالصفحة**. كانت كل صفحات الموقع تُبنى من
   قالب index.html واحد فتخرج كلها بنفس og:image (الصورة العامة)، بينما كان
   og:image:alt وحده يختلف — فصارت 39 صفحة تتشارك صورة واحدة.

   هذه الخريطة هي مكان الربط الوحيد: مفتاحها المسار بلا الشرطتين، وقيمتها اسم
   الملف داخل /images/og/. أي مسار بلا مقابل يعود إلى صورة الرئيسية.
========================================================================== */
const ogImageFor = (file: string): string => `${SITE_URL}/images/og/${file}.png`;

const OG_BY_ROUTE: Record<string, string> = {
  /* الصفحات الثابتة */
  "": "home",
  "store": "store",
  "servers": "servers",
  "faq": "faq",
  /* النسخة الإنجليزية — تشارك صور نظيراتها العربية */
  "en": "home",
  "en/nova": "nova",
  "en/istar": "istar",
  "en/moka": "moka",
  "en/x": "x",
  "en/faq": "faq",
  "channels": "channels",
  "channels/sports": "channels-sports",
  "channels/news": "channels-news",
  "channels/movies": "channels-movies",
  "channels/entertainment": "channels-entertainment",
  "channels/platforms": "channels-platforms",
  "channels/documentaries": "channels-documentaries",
  "channels/kids": "channels-kids",
  "channels/music": "channels-music",
  "channels/religious": "channels-religious",
  "matches": "matches",
  "match-center": "matches",
  "nova": "nova",
  "istar": "istar",
  "moka": "moka",
  "x": "x",
  "blog": "blog",
  /* صفحة وظيفية (noindex) — لا تُشارك، فتبقى على صورة الرئيسية */
  "cart": "home",
  /* مقالات المدونة */
  "blog/test-iptv-server-stability": "blog-test-iptv-stability",
  "blog/iptv-samsung-lg-setup": "blog-iptv-samsung-lg-setup",
  "blog/choose-iptv-server": "blog-choose-iptv-server",
  "blog/video-resolution-hd-fhd-4k": "blog-video-resolution",
  "blog/internet-speed-for-video-streaming": "blog-internet-speed",
  "blog/hdr-and-frame-rate-explained": "blog-hdr-frame-rate",
  "blog/android-tv-boxes-buying-guide": "blog-android-tv-boxes",
  "blog/phone-and-computer-viewing-setup": "blog-phone-computer-setup",
  "blog/risks-of-unverified-apps": "blog-risks-of-unverified-apps",
  "blog/what-is-unlicensed-streaming": "blog-what-is-unlicensed-streaming",
  "blog/افضل-اشتراك-iptv-2026": "best-iptv-2026",
  "blog/افضل-سيرفر-iptv-في-مصر": "blog-iptv-egypt",
  /* صفحات هبوط البطولات — /matches/{slug} */
  "matches/الدوري-الإنجليزي": "league-premier-league",
  "matches/الدوري-السعودي": "league-saudi-pro-league",
  "matches/دوري-أبطال-أوروبا": "league-uefa-champions",
  "matches/الدوري-الإسباني": "league-la-liga",
  "matches/الدوري-الفرنسي": "league-ligue-1",
  "matches/الدوري-الألماني": "league-bundesliga",
  "matches/الدوري-الإيطالي": "league-serie-a",
  "matches/الدوري-المصري": "league-egyptian-premier",
  /* صفحات المنتخبات — /world-cup-2026/{slug} */
  "world-cup-2026/المغرب": "wc-morocco",
  "world-cup-2026/مصر": "wc-egypt",
  "world-cup-2026/الجزائر": "wc-algeria",
  "world-cup-2026/تونس": "wc-tunisia",
  "world-cup-2026/السعودية": "wc-saudi-arabia",
  "world-cup-2026/قطر": "wc-qatar",
  "world-cup-2026/العراق": "wc-iraq",
  "world-cup-2026/الأردن": "wc-jordan",
};
const OG_IMAGE_ALT = `${BRAND_NAME} — خدمات الربط التقني وإعداد مشغلات البث`;
const ORG_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;
/* تاريخ نشر/تحديث الصفحات الثابتة في هذه النسخة من الموقع */
const PAGES_DATE = "2026-10-14";
/* تاريخ نشر صفحات هبوط البطولات والمنتخبات */
const LANDING_DATE = "2026-10-15";
/* تاريخ إدخال قسم «جدول الترتيب» في صفحات البطولات — تغيّر جوهري في محتوى
   الصفحات نفسها، فيتقدّم dateModified مرة واحدة هنا، لا مع كل دورة تحديث
   بيانات (منعاً لتغيير التاريخ بلا تغيير محتوى). صفحة جديدة لها تاريخها
   الخاص في `landing.date` ويتقدّم عليها. */
const STANDINGS_DATE = "2026-10-16";
/* تاريخ صفحات مركز المباراة. **ثابت عمداً**: البند 13 يمنع تغيير
   `dateModified` مع كل تحديث، وإلا أعاد الموقع إعلان الصفحة جديدة كل 60 ثانية
   مع كل دورة قراءة — وهذا إساءة استخدام واضحة لبيانات منظّمة. */
const MATCH_CENTER_DATE = "2026-10-17";
/* البند 4: الصفحة داكنة، فـ`theme-color` العامة الكريمية `#faf9f6` ترسم شريط
   متصفح فاتحاً فوق صفحة كحلية. تُضبط لكل مسار بدل تغيير القيمة العامة التي
   تخص 47 صفحة أخرى ليست من هذه المهمة. */
const MATCH_CENTER_NIGHT = "#080b12";

export const INDEX_ROBOTS =
  "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";

/* الصفة القانونية/التقنية للمنصة — نص واحد يُستخدم في بيانات المنظمة والمنتج
   حتى لا يختلف وصف النشاط بين صفحة وأخرى في نتائج البحث. */
export const ORG_ROLE =
  "خدمات ربط تقني وإعداد مشغلات البث ودليل المشاهدة الرسمية";

const ORG_DESCRIPTION =
  "منصة خدمات الربط التقني والدعم الفني لإعداد تطبيقات المشغلات ودليل المشاهدة الرسمية في السعودية والخليج ومصر — تفعيل قوائم التشغيل (M3U / Xtream Codes) الصادرة من المزود الخارجي وإعدادها على الشاشات والأجهزة. الموقع لا يستضيف المحتوى ولا يبثّه ولا يعيد بثّه.";

/* تنظيم الموقع — يُعرَّف مرة واحدة في الصفحة الرئيسية فقط */
const organizationLd = {
  "@type": "Organization",
  "@id": ORG_ID,
  name: `${BRAND_NAME} — ${BRAND_EN}`,
  url: `${SITE_URL}/`,
  logo: `${SITE_URL}/icon-512.png`,
  description: ORG_DESCRIPTION,
  contactPoint: {
    "@type": "ContactPoint",
    telephone: `+${WHATSAPP_DISPLAY.replace(/[^\d]/g, "")}`,
    contactType: "customer support",
    availableLanguage: ["Arabic", "English"],
  },
};

/* موقع الويب — يُعرَّف مرة واحدة في الصفحة الرئيسية فقط */
const websiteLd = {
  "@type": "WebSite",
  "@id": WEBSITE_ID,
  url: `${SITE_URL}/`,
  name: `${BRAND_NAME} — ${BRAND_EN}`,
  inLanguage: "ar",
  publisher: { "@id": ORG_ID },
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_URL}/search/?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

/* ── لماذا لا يُنشر كيان `SportsEvent` على صفحات مركز المباراة ──────────
   البند 13 يشترط أن تكون بيانات الحدث «حقيقية ومكتملة — لا كيان حدث ناقصاً».
   وفحص المشروع القائم `scripts/test-event-jsonld.mjs` (ويُشفّر إرشادات جوجل)
   يشترط في كل كيان حدث: `name` و`startDate` و`location` **وأيضاً** `endDate`
   و`image` و`performer` و`organizer` و`eventStatus` و`eventAttendanceMode`،
   وللملعب الواحد عنواناً تفصيلياً: `streetAddress` و`addressLocality`
   و`postalCode` و`addressCountry`.

   ومن المصدر المؤكد (تقرير §12) نملك ثلاثة فقط: الاسم، `startDate`، واسم
   الملعب. والباقي لا يُجمع بصدق:
   • `endDate` — مباراة **مجدولة** لا نهاية معلنة لها؛ واشتقاقها «بداية + ساعتين»
     اختراع رقم، والبند 2 يمنع الوعد بما لا يغطيه المصدر.
   • `image` — البند 12 يمنع الصور بلا إذن، وصورة العلامة العامة ليست صورة الحدث.
   • `organizer` — لم يرد في الحمولة، ولا تُنسب جهة تنظيم بلا مصدر.
   • العنوان التفصيلي — الحمولة حملت اسم الملعب وحده، فالشارع والمدينة والرمز
     البريدي ليست منه، واستنتاجها تخمين.

   لذلك تُنشر `WebPage` و`BreadcrumbList` (كلاهما كامل وحقيقي) ويُحجب كيان
   الحدث، بدل نشر كيان ناقص يخرق البند 13 أو حقول مختلَقة تخرق البند 2 —
   ودون تليين الفحص القائم لتمرير كيان ناقص (البند 14). يُعاد النظر في كيان
   الحدث حين تُتحقق هذه الحقول من مصدر، لا قبل ذلك.
────────────────────────────────────────────────────────────────────── */

function breadcrumbs(items: { name: string; path: string }[], canonical: string) {
  return {
    "@type": "BreadcrumbList",
    "@id": `${canonical}#breadcrumb`,
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: absolute(it.path),
    })),
  };
}

interface WebPageOpts {
  canonical: string;
  name: string;
  description: string;
  published?: string;
  modified?: string;
  /** لغة الصفحة (inLanguage) — الافتراضي العربية */
  lang?: string;
  /** معرّف الكيان الرئيسي في الصفحة (منتج/مقال/أسئلة) إن وُجد */
  mainEntityId?: string;
  /** هل تُرفق قائمة مسار التنقل؟ (الرئيسية هي جذر المسار فلا قائمة لها) */
  withBreadcrumb?: boolean;
}

/* صورة الصفحة تُشتق من رابطها عبر نفس خريطة صور المشاركة، فيبقى وصف الصفحة
   في البيانات المنظّمة متسقاً مع صورة مشاركتها بدل الإشارة إلى صورة عامة. */
function ogImageFromCanonical(canonical: string): string {
  const route = decodeURIComponent(canonical.replace(SITE_URL, "")).replace(/^\/|\/$/g, "");
  return ogImageFor(OG_BY_ROUTE[route] ?? "home");
}

function webPageLd(o: WebPageOpts) {
  const ld: Record<string, unknown> = {
    "@type": "WebPage",
    "@id": `${o.canonical}#webpage`,
    url: o.canonical,
    name: o.name,
    description: o.description,
    inLanguage: o.lang ?? "ar",
    isPartOf: { "@id": WEBSITE_ID },
    datePublished: o.published ?? PAGES_DATE,
    dateModified: o.modified ?? o.published ?? PAGES_DATE,
    primaryImageOfPage: {
      "@type": "ImageObject",
      url: ogImageFromCanonical(o.canonical),
      width: 1200,
      height: 630,
    },
  };
  if (o.mainEntityId) ld.mainEntity = { "@id": o.mainEntityId };
  if (o.withBreadcrumb !== false) ld.breadcrumb = { "@id": `${o.canonical}#breadcrumb` };
  return ld;
}

function faqLd(canonical: string, faqs: { q: string; a: string }[]) {
  return {
    "@type": "FAQPage",
    "@id": `${canonical}#faq`,
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export function getSeo(path: string): SeoMeta {
  const clean = `/${path.replace(/^\/+|\/+$/g, "")}`;
  const routeKey = clean.replace(/^\/|\/$/g, "");
  /* النسخة الإنجليزية (الصفحات التجارية فقط): لغة الصفحة وروابط hreflang
     تُحسب من المسار وحده، فتتوارثها كل الفروع التي تنتشر من base */
  const pair = LOCALE_PAIRS.find((p) => p.ar === clean || p.en === clean);
  /* الكلمة والقصد من خريطة keywords.mjs الموحَّدة — بيانات وصفية داخلية فقط،
     لا تُطبَع في HTML ولا تضيف أي وسم. المسارات غير المعلَّنة ترث null/navigational. */
  const kw = keywordsFor(clean);
  const base: SeoMeta = {
    lang: clean === "/en" || clean.startsWith("/en/") ? "en" : "ar",
    primaryKeyword: kw.primary,
    secondaryKeywords: kw.secondary ?? [],
    intent: kw.intent,
    ...(pair
      ? {
          alternates: [
            { hreflang: "ar", href: absolute(pair.ar.replace(/^\//, "")) },
            { hreflang: "en", href: absolute(pair.en.replace(/^\//, "")) },
            { hreflang: "x-default", href: absolute(pair.ar.replace(/^\//, "")) },
          ],
        }
      : {}),
    title: `${BRAND_NAME} | ربط تقني وإعداد مشغلات البث 2026`,
    description:
      "خدمات ربط تقني وإعداد مشغلات البث (M3U / Xtream Codes) على سامسونج وLG وأندرويد وApple TV، مع دليل القنوات المفتوحة وخيارات المشاهدة الرسمية ودعم فني بالعربية.",
    canonical: absolute(""),
    robots: INDEX_ROBOTS,
    ogType: "website",
    ogImage: ogImageFor(OG_BY_ROUTE[routeKey] ?? "home"),
    ogImageAlt: OG_IMAGE_ALT,
    jsonLd: [],
  };

  /* ===== سلة المشتريات: صفحة وظيفية لا تُفهرس ===== */
  if (clean === "/cart") {
    return {
      ...base,
      title: `سلة المشتريات | ${BRAND_NAME}`,
      description:
        "راجع الباقات المختارة في سلة المشتريات وأكمل طلب التفعيل والربط التقني مع فريق ستريم ماستر برو عبر واتساب.",
      canonical: absolute("cart"),
      robots: "noindex, follow",
      /* صفحة وظيفية لا تستهدف كلمة — إعلان صريح لا مجرد غياب حقل */
      primaryKeyword: null,
      secondaryKeywords: [],
      intent: "navigational",
      jsonLd: [],
    };
  }

  /* ===== المتجر ===== */
  if (clean === "/store") {
    const canonical = absolute("store");
    const crumbs = breadcrumbs(
      [
        { name: "الرئيسية", path: "" },
        { name: "المتجر", path: "store" },
      ],
      canonical
    );
    return {
      ...base,
      title: `متجر الاشتراكات | ${BRAND_NAME}`,
      description:
        "تصفّح باقات التفعيل والربط التقني لسيرفرات نوفا وإيستار وموكا وX: أسعار سنوية واضحة، تفعيل فوري خلال دقائق، ودعم فني بالعربية على مدار الساعة.",
      canonical,
      ogImageAlt: `متجر اشتراكات ${BRAND_NAME} — باقات نوفا وإيستار وموكا وX`,
      jsonLd: [
        webPageLd({
          canonical,
          name: `متجر الاشتراكات | ${BRAND_NAME}`,
          description:
            "تصفّح باقات التفعيل والربط التقني لسيرفرات نوفا وإيستار وموكا وX: أسعار سنوية واضحة، تفعيل فوري خلال دقائق، ودعم فني بالعربية على مدار الساعة.",
          mainEntityId: `${canonical}#plans`,
        }),
        crumbs,
        {
          "@type": "ItemList",
          "@id": `${canonical}#plans`,
          name: "باقات التفعيل والربط التقني",
          itemListElement: PRICING_PLANS.map((p, i) => ({
            "@type": "ListItem",
            position: i + 1,
            item: { "@id": `${absolute(`${p.serverCode}/`)}#product` },
          })),
        },
      ],
    };
  }

  /* ===== مقارنة السيرفرات ===== */
  if (clean === "/servers") {
    const canonical = absolute("servers");
    return {
      ...base,
      title: `السيرفرات والباقات | ${BRAND_NAME}`,
      description:
        "قارن سيرفرات نوفا وإيستار وموكا وX: عدد القنوات والمكتبة والجودة والأجهزة المدعومة والأسعار، واختر باقة التفعيل والربط التقني المناسبة لسرعتك وجهازك.",
      canonical,
      ogImageAlt: `مقارنة سيرفرات ${BRAND_NAME} — نوفا وإيستار وموكا وX`,
      jsonLd: [
        webPageLd({
          canonical,
          name: `السيرفرات والباقات | ${BRAND_NAME}`,
          description:
            "قارن سيرفرات نوفا وإيستار وموكا وX: عدد القنوات والمكتبة والجودة والأجهزة المدعومة والأسعار، واختر باقة التفعيل والربط التقني المناسبة لسرعتك وجهازك.",
        }),
        breadcrumbs(
          [
            { name: "الرئيسية", path: "" },
            { name: "السيرفرات والباقات", path: "servers" },
          ],
          canonical
        ),
      ],
    };
  }

  /* ===== الأسئلة الشائعة (تظهر كلها فعلاً في الصفحة) ===== */
  if (clean === "/faq") {
    const canonical = absolute("faq");
    const description =
      "أكثر من 25 إجابة مفصلة عن التفعيل والربط التقني وإعداد المشغلات: استلام بيانات الاشتراك، الدفع وحالات الاسترجاع، الأجهزة المدعومة، والتجديد والترقية بين نوفا وإيستار وموكا وX.";
    return {
      ...base,
      title: `الأسئلة الشائعة | ${BRAND_NAME}`,
      description,
      canonical,
      ogImageAlt: `الأسئلة الشائعة — ${BRAND_NAME}`,
      jsonLd: [
        webPageLd({
          canonical,
          name: `الأسئلة الشائعة | ${BRAND_NAME}`,
          description,
          mainEntityId: `${canonical}#faq`,
        }),
        breadcrumbs(
          [
            { name: "الرئيسية", path: "" },
            { name: "الأسئلة الشائعة", path: "faq" },
          ],
          canonical
        ),
        /* أسئلة أقسام صفحة الأسئلة كلها ظاهرة فعلاً فيها بنفس هذا الترتيب */
        faqLd(canonical, FAQ_SECTIONS.flatMap((s) => s.faqs)),
      ],
    };
  }

  /* ===== التجربة المجانية (أسئلتها السبعة ظاهرة كلها في الصفحة) ===== */
  if (clean === "/trial") {
    const canonical = absolute("trial");
    const title = `تجربة IPTV مجانية 6 ساعات | ${BRAND_NAME}`;
    const description =
      "اطلب كود فحص وتجربة مجانياً من المزود الخارجي لمدة 6 ساعات: افحص توافق المشغّل مع جهازك وثبات البث وجودة الصورة على اتصالك قبل دفع أي مبلغ، وبدون بطاقة أو التزام.";
    return {
      ...base,
      title,
      description,
      canonical,
      ogImageAlt: `تجربة IPTV مجانية 6 ساعات — ${BRAND_NAME}`,
      jsonLd: [
        webPageLd({
          canonical,
          name: title,
          description,
          published: "2026-10-15",
          mainEntityId: `${canonical}#faq`,
        }),
        breadcrumbs(
          [
            { name: "الرئيسية", path: "" },
            { name: "التجربة المجانية", path: "trial" },
          ],
          canonical
        ),
        /* أسئلة التجربة السبعة ظاهرة كلها في قسم أسئلة الصفحة بنفس الترتيب */
        faqLd(canonical, TRIAL_FAQS),
      ],
    };
  }

  /* ===== النسخة الإنجليزية — الصفحات التجارية فقط (/en) ===== */
  if (clean === "/en" || clean.startsWith("/en/")) {
    const enPlan = PRICING_PLANS.find((p) => clean === `/en/${p.serverCode}`);
    if (clean === "/en") {
      const canonical = absolute("en");
      const title = `Streaming Player Setup & Technical Activation | ${BRAND_EN}`;
      const description =
        "Technical activation and player setup for M3U and Xtream Codes on Samsung, LG, Android and Apple TV — with an official viewing guide and technical support.";
      return {
        ...base,
        title,
        description,
        canonical,
        ogImageAlt: `${BRAND_EN} — technical activation and streaming player setup`,
        jsonLd: [
          webPageLd({ canonical, name: title, description, lang: "en", published: "2026-10-15", mainEntityId: `${canonical}#faq` }),
          breadcrumbs([{ name: "Home", path: "en" }], canonical),
          /* الأسئلة الستة ظاهرة كلها في قسم الأسئلة بالرئيسية الإنجليزية */
          faqLd(canonical, EN_HOME_FAQS),
        ],
      };
    }
    if (enPlan) {
      const canonical = absolute(`en/${enPlan.serverCode}`);
      const price = enPlan.prices["12"].USD;
      const title = `${enPlan.en.name} — Technical Activation & Player Setup | ${BRAND_EN}`;
      const description = `Technical activation & player setup package for the ${enPlan.en.name}: provider-issued subscription data, device setup and technical support — from $${price} per year.`;
      return {
        ...base,
        title,
        description,
        canonical,
        ogImageAlt: `${enPlan.en.name} — technical activation package by ${BRAND_EN}`,
        jsonLd: [
          webPageLd({ canonical, name: title, description, lang: "en", published: "2026-10-15", mainEntityId: `${canonical}#product` }),
          breadcrumbs(
            [
              { name: "Home", path: "en" },
              { name: enPlan.en.name, path: `en/${enPlan.serverCode}` },
            ],
            canonical
          ),
          {
            "@type": "Product",
            "@id": `${canonical}#product`,
            name: `${enPlan.en.name} — technical activation package`,
            description: `${enPlan.en.description} The service provided by this website is technical activation, linking and technical support; the server specifications themselves are announced by the independent external provider.`,
            brand: { "@type": "Brand", name: BRAND_EN },
            category: "Technical setup and activation service",
            url: canonical,
            image: OG_IMAGE,
            offers: AVAILABLE_DURATIONS.flatMap((months) => {
              const price = enPlan.prices[months];
              return price ? [{
                "@type": "Offer",
                name: `${Number(months)} months`,
                price: String(price.USD),
                priceCurrency: "USD",
                availability: "https://schema.org/InStock",
                url: canonical,
              }] : [];
            }),
          },
          /* الأسئلة الأربعة ظاهرة كلها في صفحة السيرفر الإنجليزية */
          faqLd(canonical, EN_PLAN_FAQS),
        ],
      };
    }
    if (clean === "/en/faq") {
      const canonical = absolute("en/faq");
      const title = `FAQ — Activation, Payment, Devices & Renewals | ${BRAND_EN}`;
      const description =
        "Answers in English about technical activation and player setup: receiving your subscription details, payment and refunds, supported devices and switching servers.";
      return {
        ...base,
        title,
        description,
        canonical,
        ogImageAlt: `Frequently asked questions — ${BRAND_EN}`,
        jsonLd: [
          webPageLd({ canonical, name: title, description, lang: "en", published: "2026-10-15", mainEntityId: `${canonical}#faq` }),
          breadcrumbs(
            [
              { name: "Home", path: "en" },
              { name: "FAQ", path: "en/faq" },
            ],
            canonical
          ),
          /* أسئلة الأقسام الأربعة ظاهرة كلها في الصفحة بنفس هذا الترتيب */
          faqLd(canonical, FAQ_SECTIONS_EN.flatMap((s) => s.faqs)),
        ],
      };
    }
  }

  if (clean === "/match-center") {
    const canonical = absolute("match-center");
    const description =
      "مركز المباراة — كل المباريات المغطاة في مكان واحد: نتائج مباشرة، تشكيلات، أحداث وإحصائيات، مع تحليلات دوري أبطال أوروبا.";
    return {
      ...base,
      title: `مركز المباراة | ${BRAND_NAME}`,
      description,
      canonical,
      ogImageAlt: `مركز المباراة — ${BRAND_NAME}`,
      jsonLd: [
        webPageLd({
          canonical,
          name: `مركز المباراة | ${BRAND_NAME}`,
          description,
        }),
        breadcrumbs(
          [
            { name: "الرئيسية", path: "" },
            { name: "مركز المباراة", path: "match-center" },
          ],
          canonical
        ),
      ],
    };
  }

  if (clean === "/matches") {
    const canonical = absolute("matches");
    const description =
      "جدول مباريات كرة القدم للأسبوع الماضي والقادم، ونتائج محدثة تلقائيًا كل دقيقة بتوقيت مكة ومصر والتوقيت العالمي UTC، ضمن البطولات المتاحة.";
    return {
      ...base,
      title: `مواعيد المباريات والنتائج | ${BRAND_NAME}`,
      description,
      canonical,
      ogImageAlt: `مواعيد المباريات والنتائج — ${BRAND_NAME}`,
      jsonLd: [
        webPageLd({
          canonical,
          name: `مواعيد المباريات والنتائج | ${BRAND_NAME}`,
          description,
        }),
        breadcrumbs(
          [
            { name: "الرئيسية", path: "" },
            { name: "مواعيد المباريات", path: "matches" },
          ],
          canonical
        ),
      ],
    };
  }

  /* ===== مركز المباراة — /matches/{البطولة}/{المباراة} ===== */
  const centerMatch = matchByRoute(clean);
  if (centerMatch) {
    const canonical = absolute(`matches/${centerMatch.competitionSlug}/${centerMatch.slug}`);
    /* البوابة: كيان الحدث والفهرسة معاً معلقان على تأكيد المعرّفات من المصدر.
       مباراة غير مطابَقة لا تُفهرس ولا تُنشر بكيان حدث ناقص (البندان 2 و13). */
    const verified = allMatchesVerified();
    const cleanMeta = (value: unknown): string | null => typeof value === 'string' && value.trim() ? value.trim() : null;
    const homeName = cleanMeta(centerMatch.home?.name);
    const awayName = cleanMeta(centerMatch.away?.name);
    const competitionName = cleanMeta(centerMatch.competitionName);
    const venue = cleanMeta(centerMatch.venue);
    let kickoff: string | null = null;
    if (cleanMeta(centerMatch.kickoffUtc)) {
      try {
        kickoff = `${dayLabelInZone(centerMatch.kickoffUtc, "Africa/Cairo")} ${kickoffLabel(centerMatch.kickoffUtc, "Africa/Cairo")} بتوقيت القاهرة`;
      } catch { kickoff = null; }
    }
    const competitionCrumb = centerMatch.leagueId === 'eng.1' && competitionName
      ? [{ name: competitionName, path: `matches/${centerMatch.competitionSlug}` }]
      : [];
    const matchName = [homeName, awayName].filter((name): name is string => Boolean(name)).join(' ضد ') || 'مركز المباراة';
    const title = `${matchName} — مركز المباراة | ${BRAND_NAME}`;
    /* تبقى meta description وog:description وtwitter:description من الحقول
       الموجودة فعلاً فقط؛ غياب الموعد أو المسابقة أو الملعب لا ينتج بديلاً. */
    const descriptionParts = [
      homeName && awayName ? `مركز مباراة ${homeName} و${awayName}` : matchName,
      competitionName ? `في ${competitionName}` : null,
      kickoff,
      venue ? `ملعب ${venue}` : null,
      'النتيجة من المصدر.',
    ].filter((part): part is string => Boolean(part));
    const description = descriptionParts.join('، ');
    const jsonLd: Record<string, unknown>[] = [
      webPageLd({
        canonical,
        name: title,
        description,
        published: MATCH_CENTER_DATE,
        modified: MATCH_CENTER_DATE,
      }),
      breadcrumbs(
        [
          { name: "الرئيسية", path: "" },
          { name: "مركز المباراة", path: "match-center" },
          ...competitionCrumb,
          ...(matchName !== 'مركز المباراة' ? [{ name: [cleanMeta(centerMatch.home.shortName) ?? homeName, cleanMeta(centerMatch.away.shortName) ?? awayName].filter((name): name is string => Boolean(name)).join(' × '), path: `matches/${centerMatch.competitionSlug}/${centerMatch.slug}` }] : []),
        ],
        canonical
      ),
    ];
    /* لا كيان حدث هنا — السبب مسجّل في التعليق أعلى هذا الملف. */
    return {
      ...base,
      title,
      description,
      canonical,
      robots: verified ? INDEX_ROBOTS : "noindex, follow",
      ogType: "website",
      /* صورة مشاركة خاصة بالمباراة (مرحلة 3): مولّدة محلياً من بيانات
         التعريف الموثقة فقط، بلا أي نتيجة قبل البداية. النهائية
         (`match-<slug>-final.png`) لا تُربط هنا إلا بعد توليدها من
         قراءة مؤكدة — توليدها سابقاً كان سيعرض نتيجة غير موجودة. */
      ogImage: ogImageFor(`match-${centerMatch.slug}`),
      ogImageAlt: `${matchName} — ${BRAND_NAME}`,
      themeColor: MATCH_CENTER_NIGHT,
      jsonLd,
    };
  }

  /* ===== صفحات هبوط البطولات — /matches/{البطولة} ===== */
  const leagueLanding = LEAGUE_LANDINGS.find((l) => clean === `/matches/${l.slug}`);
  if (leagueLanding) {
    const canonical = absolute(`matches/${leagueLanding.slug}`);
    return {
      ...base,
      title: leagueLanding.title,
      description: leagueLanding.description,
      canonical,
      ogImageAlt: `${leagueLanding.h1} — ${BRAND_NAME}`,
      jsonLd: [
        webPageLd({
          canonical,
          name: leagueLanding.title,
          description: leagueLanding.description,
          published: leagueLanding.date ?? LANDING_DATE,
          modified: leagueLanding.modified ?? leagueLanding.date ?? STANDINGS_DATE,
          mainEntityId: `${canonical}#faq`,
        }),
        breadcrumbs(
          [
            { name: "الرئيسية", path: "" },
            { name: "مواعيد المباريات", path: "matches" },
            { name: leagueLanding.h1, path: `matches/${leagueLanding.slug}` },
          ],
          canonical
        ),
        /* الأسئلة ظاهرة فعلاً في الصفحة (عناصر details) */
        faqLd(canonical, leagueLanding.faq),
      ],
    };
  }

  /* ===== صفحات المنتخبات العربية — /world-cup-2026/{المنتخب} ===== */
  const teamLanding = TEAM_LANDINGS.find((t) => clean === `/world-cup-2026/${t.slug}`);
  if (teamLanding) {
    const canonical = absolute(`world-cup-2026/${teamLanding.slug}`);
    return {
      ...base,
      title: teamLanding.title,
      description: teamLanding.description,
      canonical,
      ogImageAlt: `${teamLanding.h1} — ${BRAND_NAME}`,
      jsonLd: [
        webPageLd({
          canonical,
          name: teamLanding.title,
          description: teamLanding.description,
          published: LANDING_DATE,
          modified: LANDING_DATE,
          mainEntityId: `${canonical}#faq`,
        }),
        breadcrumbs(
          [
            { name: "الرئيسية", path: "" },
            { name: "كأس العالم 2026", path: "world-cup-2026" },
            { name: teamLanding.h1, path: `world-cup-2026/${teamLanding.slug}` },
          ],
          canonical
        ),
        /* الأسئلة ظاهرة فعلاً في الصفحة (عناصر details) */
        faqLd(canonical, teamLanding.faq),
      ],
    };
  }

  /* ===== الصفحة الرئيسية ===== */
  if (clean === "/") {
    const canonical = absolute("");
    return {
      ...base,
      canonical,
      jsonLd: [
        organizationLd,
        websiteLd,
        webPageLd({
          canonical,
          name: base.title,
          description: base.description,
          modified: "2026-10-15",
          mainEntityId: `${SITE_URL}/#product`,
          withBreadcrumb: false,
        }),
        {
          "@type": "Product",
          "@id": `${SITE_URL}/#product`,
          name: "باقة ربط تقني وتفعيل لمشغلات البث 2026",
          description:
            "باقات ربط تقني وتفعيل مع سيرفرات المزودين الخارجيين ودعم فني لإعداد الأجهزة الذكية على مدار الساعة. المواصفات الفنية للسيرفر (عدد القنوات والمكتبة والجودة) يوفّرها المزود الخارجي، والموقع لا يستضيف المحتوى ولا يبثّه ولا يعيد بثّه.",
          brand: { "@type": "Brand", name: BRAND_EN },
          category: "Technical setup and activation service",
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "USD",
            lowPrice: String(
              Math.min(...PRICING_PLANS.map((plan) => plan.prices[AVAILABLE_DURATIONS[0]].USD))
            ),
            highPrice: String(
              Math.max(...PRICING_PLANS.map((plan) => plan.prices[AVAILABLE_DURATIONS[0]].USD))
            ),
            offerCount: String(PRICING_PLANS.length),
            availability: "https://schema.org/InStock",
          },
          url: absolute(""),
          image: OG_IMAGE,
        },
        /* الأسئلة الثمانية ظاهرة كلها في قسم الأسئلة بالرئيسية */
        faqLd(canonical, FAQS),
      ],
    };
  }

  /* ===== صفحات الباقات ===== */
  const plan = PRICING_PLANS.find((p) => clean === `/${p.serverCode}`);
  if (plan) {
    const cheapest = plan.prices["12"].USD;
    const nameOnly = plan.serverName.split("(")[0].trim();
    const canonical = absolute(`${plan.serverCode}/`);
    const description = `${plan.description} خدمتنا هي التفعيل والربط التقني والدعم الفني — تبدأ من ${cheapest} دولار سنوياً.`;
    return {
      ...base,
      title: `${nameOnly} — باقة تفعيل وربط تقني | ${BRAND_NAME}`,
      description,
      canonical,
      ogImageAlt: `${nameOnly} — باقة تفعيل وربط تقني من ${BRAND_NAME}`,
      jsonLd: [
        webPageLd({
          canonical,
          name: `${nameOnly} — باقة تفعيل وربط تقني | ${BRAND_NAME}`,
          description,
          mainEntityId: `${canonical}#product`,
        }),
        breadcrumbs(
          [
            { name: "الرئيسية", path: "/" },
            { name: "السيرفرات والباقات", path: "/servers/" },
            { name: nameOnly, path: `/${plan.serverCode}/` },
          ],
          canonical
        ),
        {
          "@type": "Product",
          "@id": `${canonical}#product`,
          name: plan.serverName,
          description: `${plan.description} الخدمة المقدَّمة من الموقع هي التفعيل والربط التقني والدعم الفني؛ أما مواصفات السيرفر فهي لدى المزود الخارجي المستقل.`,
          brand: { "@type": "Brand", name: BRAND_EN },
          category: "Technical setup and activation service",
          url: canonical,
          image: OG_IMAGE,
          offers: AVAILABLE_DURATIONS.flatMap((months) => {
            const price = plan.prices[months];
            return price ? [{
              "@type": "Offer",
              name: `${Number(months)} شهر`,
              price: String(price.USD),
              priceCurrency: "USD",
              availability: "https://schema.org/InStock",
              url: canonical,
            }] : [];
          }),
        },
      ],
    };
  }

  /* ===== صفحة القنوات ===== */
  if (clean === "/channels") {
    const canonical = absolute("channels/");
    const title = "فهرس القنوات لدى المزوّدين وروابط الجهات الرسمية";
    const description =
      "فهرس وصفي لأسماء وتصنيفات القنوات التي يدرجها مزودون خارجيون، مع صفحات مستقلة لروابط الجهات الرسمية. لا يتضمن الفهرس روابط بث؛ تفاصيل المحتوى والتوفر لدى كل جهة.";
    return {
      ...base,
      title,
      description,
      canonical,
      ogImageAlt: "فهرس قنوات المزوّدين ودليل روابط الجهات الرسمية",
      jsonLd: [
        webPageLd({
          canonical,
          name: title,
          description,
          modified: "2026-10-15",
        }),
        breadcrumbs(
          [
            { name: "الرئيسية", path: "/" },
            { name: "القنوات", path: "/channels/" },
          ],
          canonical
        ),
      ],
    };
  }

  /* ===== صفحات تصنيفات دليل المشاهدة الرسمية ===== */
  const channelCategory = CHANNEL_CATEGORY_PAGES.find((category) => clean === `/channels/${category.slug}`);
  if (channelCategory) {
    const seoBySlug: Record<string, { title: string; description: string; imageAlt: string }> = {
      sports: {
        title: "القنوات الرياضية وروابط مواقعها الرسمية في دليل المشاهدة",
        description: "دليل الجهات الرياضية وروابط مواقعها الرسمية لمعرفة الباقات وخيارات المتابعة؛ الحقوق والتوفر قد يختلفان حسب البلد، ولا يشغّل هذا الموقع أي بث رياضي. راجع الشروط.",
        imageAlt: "القنوات والمنصات الرياضية — دليل المشاهدة الرسمية",
      },
      news: {
        title: "القنوات الإخبارية وروابط مواقع الجهات الرسمية في الدليل",
        description: "قائمة جهات الأخبار وروابط مواقعها الرسمية للاطلاع على طرق المتابعة والمحتوى المتاح؛ تختلف الخدمات حسب المنطقة، ولا يستضيف هذا الموقع بثاً إخبارياً. راجع المصدر.",
        imageAlt: "القنوات والجهات الإخبارية — دليل المشاهدة الرسمية",
      },
      movies: {
        title: "قنوات الأفلام وروابط الجهات الرسمية في دليل المشاهدة",
        description: "قائمة قنوات الأفلام وروابط مواقع الجهات المالكة للاطلاع على محتوى كل جهة؛ لا يعرض الموقع أفلاماً أو يقدّم بثاً أو يضمن توفر عنوان محدد. تحقق لدى الجهة.",
        imageAlt: "قنوات الأفلام — دليل روابط الجهات الرسمية",
      },
      entertainment: {
        title: "القنوات الترفيهية وروابط مواقع الجهات الرسمية في الدليل",
        description: "دليل روابط جهات الترفيه ومواقعها الأصلية؛ راجع كل جهة لمعرفة محتواها وخيارات الوصول والتوفر في منطقتك، من دون بث داخل الموقع. والمعلومات الكاملة لدى الجهة.",
        imageAlt: "قنوات الترفيه — دليل المشاهدة الرسمية",
      },
      platforms: {
        title: "منصات المشاهدة وروابط الجهات الرسمية وخيارات الوصول",
        description: "قائمة منصات المشاهدة وروابطها الرسمية؛ راجع كل منصة لمكتبتها واشتراكاتها والتوفر الجغرافي، فالموقع لا يبيع اشتراكاتها أو يستضيف محتواها. تحقق من التفاصيل لدى المنصة.",
        imageAlt: "منصات المشاهدة — روابط المواقع الرسمية",
      },
      documentaries: {
        title: "القنوات الوثائقية وروابط الجهات الرسمية في دليل المشاهدة",
        description: "جهات الوثائقيات المسجلة في الدليل مع روابط مواقعها الأصلية؛ تحقق من البرامج وطرق المتابعة والتوفر لدى الجهة، فالموقع لا يستضيف أو يعيد بث المواد. راجع الجهة للتفاصيل.",
        imageAlt: "القنوات الوثائقية — دليل المشاهدة الرسمية",
      },
      kids: {
        title: "قنوات الأطفال وروابط المواقع الرسمية في دليل المشاهدة",
        description: "دليل الجهات المدرجة للأطفال وروابط مواقعها الرسمية؛ راجع كل جهة للمحتوى والقيود العمرية والتوفر في منطقتك، فهذا الموقع لا يستضيف بثاً للأطفال. تابع التفاصيل في الموقع الرسمي.",
        imageAlt: "قنوات الأطفال — دليل روابط الجهات الرسمية",
      },
      music: {
        title: "قنوات الموسيقى وروابط الجهات الرسمية في دليل المشاهدة",
        description: "قائمة الجهات الموسيقية وروابط مواقعها الأصلية لمعرفة طرق الاستماع أو المشاهدة والتوفر؛ لا يشغّل الموقع الموسيقى ولا يستضيفها أو يعيد بثها. تفقّد موقع الجهة.",
        imageAlt: "القنوات الموسيقية — دليل المشاهدة الرسمية",
      },
      religious: {
        title: "القنوات الدينية وروابط مواقع الجهات الرسمية في الدليل",
        description: "روابط الجهات المصنفة دينية لمراجعة البرامج وخيارات الوصول المنشورة لديها؛ قد يختلف التوفر حسب المنطقة، ولا يستضيف هذا الموقع أي بث. راجع موقع الجهة للتفاصيل.",
        imageAlt: "القنوات الدينية — دليل روابط الجهات الرسمية",
      },
    };
    const categorySeo = seoBySlug[channelCategory.slug];
    if (!categorySeo) throw new Error(`Missing SEO metadata for channel category: ${channelCategory.slug}`);

    const canonical = absolute(`channels/${channelCategory.slug}/`);
    const listId = `${canonical}#itemlist`;
    const published = "2026-10-15";
    const itemList = {
      "@type": "ItemList",
      "@id": listId,
      name: channelCategory.h1,
      description: channelCategory.intro[0],
      url: canonical,
      numberOfItems: channelCategory.items.length,
      itemListOrder: "https://schema.org/ItemListUnordered",
      itemListElement: channelCategory.items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item: item.url,
      })),
    };

    return {
      ...base,
      title: categorySeo.title,
      description: categorySeo.description,
      canonical,
      ogImageAlt: categorySeo.imageAlt,
      jsonLd: [
        webPageLd({
          canonical,
          name: channelCategory.h1,
          description: categorySeo.description,
          published,
          modified: published,
          mainEntityId: listId,
        }),
        breadcrumbs(
          [
            { name: "الرئيسية", path: "/" },
            { name: "القنوات", path: "/channels/" },
            { name: channelCategory.label, path: `/channels/${channelCategory.slug}/` },
          ],
          canonical
        ),
        itemList,
      ],
    };
  }

  /* ===== المدوّنة ===== */
  if (clean === "/blog") {
    const canonical = absolute("blog/");
    const description =
      "دلائل عملية: كيف تختبر ثبات السيرفر، وطريقة تشغيل الاشتراك على شاشات سامسونج وLG، وكيف تختار السيرفر المناسب لسرعتك.";
    return {
      ...base,
      title: `مقالات ودلائل تشغيل الـ IPTV | ${BRAND_NAME}`,
      description,
      canonical,
      ogImageAlt: `مدونة ${BRAND_NAME} — مقالات ودلائل تشغيل`,
      jsonLd: [
        webPageLd({
          canonical,
          name: `مقالات ودلائل تشغيل الـ IPTV | ${BRAND_NAME}`,
          description,
          mainEntityId: `${canonical}#blog`,
        }),
        breadcrumbs(
          [
            { name: "الرئيسية", path: "/" },
            { name: "المدوّنة", path: "/blog/" },
          ],
          canonical
        ),
        {
          "@type": "Blog",
          "@id": `${canonical}#blog`,
          name: `مدوّنة ${BRAND_NAME}`,
          url: canonical,
          blogPost: BLOG_POSTS.map((p) => ({
            "@type": "BlogPosting",
            headline: p.title,
            url: absolute(`blog/${p.slug}/`),
            datePublished: p.date,
          })),
        },
      ],
    };
  }

  const post = BLOG_POSTS.find((p) => clean === `/blog/${p.slug}`);
  if (post) {
    const canonical = absolute(`blog/${post.slug}/`);
    const fullTitle = `${post.title} | ${BRAND_NAME}`;
    const jsonLd: Record<string, unknown>[] = [
      webPageLd({
        canonical,
        name: fullTitle,
        description: post.description,
        published: post.date,
        modified: post.updated ?? post.date,
        mainEntityId: `${canonical}#article`,
      }),
      breadcrumbs(
        [
          { name: "الرئيسية", path: "/" },
          { name: "المدوّنة", path: "/blog/" },
          { name: post.title, path: `/blog/${post.slug}/` },
        ],
        canonical
      ),
      {
        "@type": "BlogPosting",
        "@id": `${canonical}#article`,
        headline: post.title,
        description: post.description,
        datePublished: post.date,
        dateModified: post.updated ?? post.date,
        inLanguage: "ar",
        mainEntityOfPage: { "@id": `${canonical}#webpage` },
        author: { "@type": "Organization", name: BRAND_NAME, url: `${SITE_URL}/` },
        publisher: { "@id": ORG_ID },
        image: ogImageFromCanonical(canonical),
        /* عدد الكلمات لكل نص المقال — الفقرات والبنود والخطوات والجداول والملاحظات،
           لا الفقرات وحدها (كان يُحتسب 140 كلمة لمقال من 1100+). */
        wordCount:
          [post.intro, ...(post.faq ?? []).flatMap((f) => [f.q, f.a])]
            .join(" ")
            .split(/\s+/)
            .filter(Boolean).length +
          post.sections.reduce(
            (n, s) =>
              n +
              [
                ...(s.paragraphs ?? []),
                ...(s.bullets ?? []),
                ...(s.steps ?? []),
                ...(s.table ? [...s.table.head, ...s.table.rows.flat()] : []),
                ...(s.note ? [s.note] : []),
              ]
                .join(" ")
                .split(/\s+/)
                .filter(Boolean).length,
            0
          ),
      },
    ];
    /* أسئلة المقال ظاهرة فعلاً أسفل نصّه (عناصر details) */
    if (post.faq && post.faq.length > 0) jsonLd.push(faqLd(canonical, post.faq));
    return {
      ...base,
      /* العناوين الطويلة تُنشر بلا لاحقة العلامة حتى لا تُقتطع في النتائج */
      title: fullTitle.length > 72 ? post.title : fullTitle,
      description: post.description,
      canonical,
      ogType: "article",
      ogImageAlt: post.title,
      jsonLd,
    };
  }

  /* ===== صفحة غير موجودة ===== */
  return {
    ...base,
    title: `الصفحة غير موجودة | ${BRAND_NAME}`,
    description: "الصفحة التي تبحث عنها غير متوفرة — تصفّح الباقات أو القنوات من الصفحة الرئيسية.",
    canonical: absolute(""),
    robots: "noindex, follow",
    jsonLd: [],
  };
}

/* تحديث وسوم الرأس أثناء التنقّل داخل الموقع (بدون إعادة تحميل) */
/* القيمة الأصلية لـ`theme-color` كما وردت في القالب — تُحفظ مرة واحدة. */
let originalThemeColor: string | null = null;

export function applySeoToDocument(path: string) {
  if (typeof document === "undefined") return;
  const seo = getSeo(path);
  document.title = seo.title;
  const setMeta = (selector: string, attr: string, value: string) => {
    let el = document.head.querySelector(selector) as HTMLMetaElement | null;
    if (!el) {
      el = document.createElement("meta");
      const m = /\[([a-z:]+)="([^"]+)"\]/.exec(selector);
      if (m) el.setAttribute(m[1], m[2]);
      document.head.appendChild(el);
    }
    el.setAttribute(attr, value);
  };
  /* القيمة العامة تُقرأ من القالب عند أول تنقّل وتُستعاد عند مغادرة الصفحة
     الداكنة — فلا يُنسخ رقم `index.html` هنا فيتباعد عنه. */
  if (originalThemeColor === null) {
    originalThemeColor = document.head.querySelector('meta[name="theme-color"]')?.getAttribute("content") ?? "";
  }
  setMeta('meta[name="theme-color"]', "content", seo.themeColor ?? originalThemeColor);
  setMeta('meta[name="description"]', "content", seo.description);
  setMeta('meta[name="robots"]', "content", seo.robots);
  setMeta('meta[property="og:title"]', "content", seo.title);
  setMeta('meta[property="og:description"]', "content", seo.description);
  setMeta('meta[property="og:url"]', "content", seo.canonical);
  setMeta('meta[property="og:type"]', "content", seo.ogType);
  /* صورة المشاركة تتغيّر مع الصفحة مثل باقي الوسوم — وإلا بقيت صورة الصفحة
     الأولى ظاهرة عند التنقّل داخل الموقع */
  setMeta('meta[property="og:image"]', "content", seo.ogImage);
  setMeta('meta[property="og:image:width"]', "content", "1200");
  setMeta('meta[property="og:image:height"]', "content", "630");
  setMeta('meta[name="twitter:image"]', "content", seo.ogImage);
  setMeta('meta[property="og:image:alt"]', "content", seo.ogImageAlt);
  setMeta('meta[name="twitter:title"]', "content", seo.title);
  setMeta('meta[name="twitter:description"]', "content", seo.description);
  setMeta('meta[name="twitter:image:alt"]', "content", seo.ogImageAlt);

  let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.rel = "canonical";
    document.head.appendChild(link);
  }
  link.href = seo.canonical;

  /* لغة المستند واتجاهه وروابط hreflang تتبع لغة الصفحة الحالية */
  document.documentElement.lang = seo.lang;
  document.documentElement.dir = seo.lang === "en" ? "ltr" : "rtl";
  setMeta('meta[property="og:locale"]', "content", seo.lang === "en" ? "en_US" : "ar_SA");
  document.head.querySelectorAll('link[rel="alternate"][hreflang]').forEach((el) => el.remove());
  for (const alt of seo.alternates ?? []) {
    const l = document.createElement("link");
    l.rel = "alternate";
    l.hreflang = alt.hreflang;
    l.href = alt.href;
    document.head.appendChild(l);
  }
}

/* Legacy analysis SEO is owned here too. The build synchronizes the <head>
   snapshots in legacy/ for existing source-level validators. Do not edit those
   generated SEO tags: change this registry instead. Tracking is never replaced. */
const LEGACY_ANALYSIS_SEO: Record<string, SeoMeta> = {
  "match-analysis": {
    "title": "دوري أبطال أوروبا 2026/2027 | تحليل مباريات الجولة الثانية",
    "description": "تقارير الجولة الثانية لدوري أبطال أوروبا 2026/27: روما وريال مدريد، وسيتي وباريس، وأتلتيكو ويونايتد، وجالاتا سراي وبرشلونة؛ التشكيل والأرقام والمراجعات العربية.",
    "canonical": "__SITE__/match-analysis/",
    "robots": "index, follow, max-image-preview:large",
    "ogType": "website",
    "ogImage": "__SITE__/images/matches/match-analysis-og.png",
    "ogImageAlt": "تحليل المباريات — أربعة تقارير من الجولة الثانية لدوري أبطال أوروبا",
    "lang": "ar",
    "jsonLd": [
      {
        "@type": "WebPage",
        "@id": "__SITE__/match-analysis/#webpage",
        "url": "__SITE__/match-analysis/",
        "name": "دوري أبطال أوروبا 2026/2027 | تحليل مباريات الجولة الثانية",
        "description": "تقارير الجولة الثانية لدوري أبطال أوروبا 2026/27: روما وريال مدريد، وسيتي وباريس، وأتلتيكو ويونايتد، وجالاتا سراي وبرشلونة؛ التشكيل والأرقام والمراجعات العربية.",
        "inLanguage": "ar",
        "datePublished": "2026-10-16",
        "dateModified": "2026-10-16",
        "primaryImageOfPage": {
          "@type": "ImageObject",
          "url": "__SITE__/images/matches/match-analysis-og.png",
          "width": 1200,
          "height": 630
        },
        "breadcrumb": {
          "@id": "__SITE__/match-analysis/#breadcrumb"
        }
      },
      {
        "@type": "CollectionPage",
        "@id": "__SITE__/match-analysis/#collection",
        "url": "__SITE__/match-analysis/",
        "name": "دوري أبطال أوروبا — موسم 2026/2027 — الجولة الثانية",
        "isPartOf": {
          "@id": "__SITE__/match-analysis/#webpage"
        }
      },
      {
        "@type": "BreadcrumbList",
        "@id": "__SITE__/match-analysis/#breadcrumb",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "الرئيسية",
            "item": "__SITE__/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "تحليل المباريات",
            "item": "__SITE__/match-analysis/"
          }
        ]
      }
    ]
  },
  "manchester-city-psg": {
    "title": "مانشستر سيتي 2–4 باريس | تحليل مباراة 14 أكتوبر 2026",
    "description": "مانشستر سيتي 2–4 باريس سان جيرمان: تقرير مباراة 14 أكتوبر 2026 في دوري أبطال أوروبا، مع التشكيل والتقييمات والإحصائيات والتحليل والمراجع الرسمية.",
    "canonical": "__SITE__/manchester-city-psg/",
    "robots": "index, follow, max-image-preview:large",
    "ogType": "website",
    "ogImage": "__SITE__/images/matches/manchester-city-psg-og.png",
    "ogImageAlt": "مانشستر سيتي 2–4 باريس سان جيرمان · 14 أكتوبر 2026",
    "lang": "ar",
    "jsonLd": [
      {
        "@type": "WebPage",
        "@id": "__SITE__/manchester-city-psg/#webpage",
        "url": "__SITE__/manchester-city-psg/",
        "name": "مانشستر سيتي 2–4 باريس | تحليل مباراة 14 أكتوبر 2026",
        "description": "مانشستر سيتي 2–4 باريس سان جيرمان: تقرير مباراة 14 أكتوبر 2026 في دوري أبطال أوروبا، مع التشكيل والتقييمات والإحصائيات والتحليل والمراجع الرسمية.",
        "inLanguage": "ar",
        "citation": [
          "https://www.uefa.com/uefachampionsleague/match/2049580--man-city-vs-paris/",
          "https://www.mancity.com/news/mens/city-v-psg-14-october-match-report-63927601"
        ],
        "dateModified": "2026-10-16",
        "datePublished": "2026-10-16",
        "primaryImageOfPage": {
          "@type": "ImageObject",
          "url": "__SITE__/images/matches/manchester-city-psg-og.png",
          "width": 1200,
          "height": 630
        },
        "breadcrumb": {
          "@id": "__SITE__/manchester-city-psg/#breadcrumb"
        }
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "متى مباراة مانشستر سيتي وباريس سان جيرمان؟",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "أُقيمت المباراة الأربعاء 14 أكتوبر 2026 وفق نتائج UEFA. توقيت الانطلاق المقدّم من صاحب الموقع: 22:00 بتوقيت مصر ومكة، الموافق 19:00 UTC."
            }
          },
          {
            "@type": "Question",
            "name": "أين تُقام المباراة؟",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "أُقيم اللقاء على ملعب مدينة مانشستر (الاتحاد)، على أرض مانشستر سيتي، وفق ورقة UEFA الرسمية."
            }
          },
          {
            "@type": "Question",
            "name": "ما القنوات الناقلة للمباراة؟",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "تعتمد القنوات والمنصات الناقلة على البطولة وبلد المشاهدة. لم نؤكد ناقلاً لهذا اللقاء؛ راجع دليل المشاهدة الرسمية وإعلان الجهة المالكة للحقوق في بلدك."
            }
          },
          {
            "@type": "Question",
            "name": "هل يوجد بث مباشر داخل الصفحة؟",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "انتهت المباراة. الصفحة لا تستضيف بثاً أو إعادة؛ تفتح روابط الملخص لدى النادي وخيارات المشاهدة الرسمية في صفحات الجهات الأصلية."
            }
          },
          {
            "@type": "Question",
            "name": "أين التشكيل والنتيجة والإحصائيات؟",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "تشكيل البداية والبدلاء ودقائق التبديلات والتقييمات موجودة أعلاه. التقييمات من FotMob فقط؛ غياب الدرجة يظهر «غير متاح»، ولا تُنقل تقييمات مباراة أخرى."
            }
          }
        ]
      },
      {
        "@type": "BreadcrumbList",
        "@id": "__SITE__/manchester-city-psg/#breadcrumb",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "الرئيسية",
            "item": "__SITE__/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "تحليل المباريات",
            "item": "__SITE__/match-analysis/"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "المواجهة الأوروبية",
            "item": "__SITE__/manchester-city-psg/"
          }
        ]
      }
    ]
  },
  "manchester-city-psg/watch": {
    "title": "متابعة سيتي وباريس | النتيجة والمشاهدة الرسمية",
    "description": "انتهت مواجهة مانشستر سيتي وباريس سان جيرمان بنتيجة 2–4 يوم 14 أكتوبر 2026، وفق المراجع الرسمية. تابع مواعيد المباريات القادمة ودليل المشاهدة الرسمية.",
    "canonical": "__SITE__/manchester-city-psg/watch/",
    "robots": "index, follow, max-image-preview:large",
    "ogType": "website",
    "ogImage": "__SITE__/images/matches/manchester-city-psg-watch-og.png",
    "ogImageAlt": "مانشستر سيتي 2–4 باريس سان جيرمان · 14 أكتوبر 2026",
    "lang": "ar",
    "jsonLd": [
      {
        "@type": "WebPage",
        "@id": "__SITE__/manchester-city-psg/watch/#webpage",
        "url": "__SITE__/manchester-city-psg/watch/",
        "name": "متابعة سيتي وباريس | النتيجة والمشاهدة الرسمية",
        "description": "انتهت مواجهة مانشستر سيتي وباريس سان جيرمان بنتيجة 2–4 يوم 14 أكتوبر 2026، وفق المراجع الرسمية. تابع مواعيد المباريات القادمة ودليل المشاهدة الرسمية.",
        "inLanguage": "ar",
        "datePublished": "2026-10-16",
        "dateModified": "2026-10-16",
        "primaryImageOfPage": {
          "@type": "ImageObject",
          "url": "__SITE__/images/matches/manchester-city-psg-watch-og.png",
          "width": 1200,
          "height": 630
        },
        "breadcrumb": {
          "@id": "__SITE__/manchester-city-psg/watch/#breadcrumb"
        }
      },
      {
        "@type": "BreadcrumbList",
        "@id": "__SITE__/manchester-city-psg/watch/#breadcrumb",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "الرئيسية",
            "item": "__SITE__/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "تحليل المباريات",
            "item": "__SITE__/match-analysis/"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "صفحة المواجهة",
            "item": "__SITE__/manchester-city-psg/"
          },
          {
            "@type": "ListItem",
            "position": 4,
            "name": "المتابعة",
            "item": "__SITE__/manchester-city-psg/watch/"
          }
        ]
      }
    ]
  },
  "roma-real-madrid": {
    "title": "روما 3–4 ريال مدريد | نتيجة مباراة 14 أكتوبر 2026",
    "description": "روما 3–4 ريال مدريد: تقرير مباراة 14 أكتوبر 2026 في دوري أبطال أوروبا، مع التشكيل والتقييمات والإحصائيات والتحليل والمراجع الرسمية.",
    "canonical": "__SITE__/roma-real-madrid/",
    "robots": "index, follow, max-image-preview:large",
    "ogType": "website",
    "ogImage": "__SITE__/images/matches/roma-real-madrid-og.png",
    "ogImageAlt": "روما 3–4 ريال مدريد · 14 أكتوبر 2026",
    "lang": "ar",
    "jsonLd": [
      {
        "@type": "WebPage",
        "@id": "__SITE__/roma-real-madrid/#webpage",
        "url": "__SITE__/roma-real-madrid/",
        "name": "روما 3–4 ريال مدريد | نتيجة مباراة 14 أكتوبر 2026",
        "description": "روما 3–4 ريال مدريد: تقرير مباراة 14 أكتوبر 2026 في دوري أبطال أوروبا، مع التشكيل والتقييمات والإحصائيات والتحليل والمراجع الرسمية.",
        "inLanguage": "ar",
        "citation": [
          "https://www.uefa.com/uefachampionsleague/match/2049581--roma-vs-real-madrid/",
          "https://www.realmadrid.com/en-US/news/football/first-team/reports/cronica-roma-real-madrid-14-10-2026"
        ],
        "dateModified": "2026-10-16",
        "datePublished": "2026-10-16",
        "primaryImageOfPage": {
          "@type": "ImageObject",
          "url": "__SITE__/images/matches/roma-real-madrid-og.png",
          "width": 1200,
          "height": 630
        },
        "breadcrumb": {
          "@id": "__SITE__/roma-real-madrid/#breadcrumb"
        }
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "متى مباراة روما وريال مدريد؟",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "أُقيمت المباراة الأربعاء 14 أكتوبر 2026 في الجولة الثانية من دوري أبطال أوروبا، الساعة 19:00 UTC، الموافق 22:00 بتوقيت مصر ومكة."
            }
          },
          {
            "@type": "Question",
            "name": "أين تُقام المباراة؟",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "أُقيم اللقاء على ملعب الأولمبيكو، على أرض روما، وفق ورقة UEFA الرسمية."
            }
          },
          {
            "@type": "Question",
            "name": "ما القنوات الناقلة للمباراة؟",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "تعتمد القنوات والمنصات الناقلة على البطولة وبلد المشاهدة. لم نؤكد ناقلاً لهذا اللقاء؛ راجع دليل المشاهدة الرسمية وإعلان الجهة المالكة للحقوق في بلدك."
            }
          },
          {
            "@type": "Question",
            "name": "هل يوجد بث مباشر داخل الصفحة؟",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "انتهت المباراة. الصفحة لا تستضيف بثاً أو إعادة؛ تفتح روابط الملخص لدى النادي وخيارات المشاهدة الرسمية في صفحات الجهات الأصلية."
            }
          },
          {
            "@type": "Question",
            "name": "أين التشكيل والنتيجة والإحصائيات؟",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "تشكيل البداية والبدلاء ودقائق التبديلات والتقييمات موجودة أعلاه. التقييمات من FotMob فقط؛ غياب الدرجة يظهر «غير متاح»، ولا تُنقل تقييمات مباراة أخرى."
            }
          }
        ]
      },
      {
        "@type": "BreadcrumbList",
        "@id": "__SITE__/roma-real-madrid/#breadcrumb",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "الرئيسية",
            "item": "__SITE__/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "تحليل المباريات",
            "item": "__SITE__/match-analysis/"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "المواجهة الأوروبية",
            "item": "__SITE__/roma-real-madrid/"
          }
        ]
      }
    ]
  },
  "roma-real-madrid/watch": {
    "title": "متابعة روما وريال مدريد | النتيجة والمشاهدة الرسمية",
    "description": "انتهت مواجهة روما وريال مدريد بنتيجة 3–4 يوم 14 أكتوبر 2026، وفق المراجع الرسمية. تابع مواعيد المباريات القادمة ودليل المشاهدة الرسمية.",
    "canonical": "__SITE__/roma-real-madrid/watch/",
    "robots": "index, follow, max-image-preview:large",
    "ogType": "website",
    "ogImage": "__SITE__/images/matches/roma-real-madrid-watch-og.png",
    "ogImageAlt": "روما 3–4 ريال مدريد · 14 أكتوبر 2026",
    "lang": "ar",
    "jsonLd": [
      {
        "@type": "WebPage",
        "@id": "__SITE__/roma-real-madrid/watch/#webpage",
        "url": "__SITE__/roma-real-madrid/watch/",
        "name": "متابعة روما وريال مدريد | النتيجة والمشاهدة الرسمية",
        "description": "انتهت مواجهة روما وريال مدريد بنتيجة 3–4 يوم 14 أكتوبر 2026، وفق المراجع الرسمية. تابع مواعيد المباريات القادمة ودليل المشاهدة الرسمية.",
        "inLanguage": "ar",
        "datePublished": "2026-10-16",
        "dateModified": "2026-10-16",
        "primaryImageOfPage": {
          "@type": "ImageObject",
          "url": "__SITE__/images/matches/roma-real-madrid-watch-og.png",
          "width": 1200,
          "height": 630
        },
        "breadcrumb": {
          "@id": "__SITE__/roma-real-madrid/watch/#breadcrumb"
        }
      },
      {
        "@type": "BreadcrumbList",
        "@id": "__SITE__/roma-real-madrid/watch/#breadcrumb",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "الرئيسية",
            "item": "__SITE__/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "تحليل المباريات",
            "item": "__SITE__/match-analysis/"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "صفحة المواجهة",
            "item": "__SITE__/roma-real-madrid/"
          },
          {
            "@type": "ListItem",
            "position": 4,
            "name": "المتابعة",
            "item": "__SITE__/roma-real-madrid/watch/"
          }
        ]
      }
    ]
  },
    "galatasaray-barcelona": {
      "title": "جالاتا سراي 1–4 برشلونة | تحليل الجولة الثانية 2026",
      "description": "تحليل فوز برشلونة 4–1 على جالاتا سراي في الجولة الثانية لدوري الأبطال 2026/27: ملخص الأهداف والتشكيل وتقييمات اللاعبين والإحصائيات ومراجعة عربية موثقة.",
      "canonical": "__SITE__/galatasaray-barcelona/",
      "robots": "index, follow, max-image-preview:large",
      "ogType": "article",
      "ogImage": "__SITE__/images/matches/galatasaray-barcelona-og.png",
      "ogImageAlt": "جالاتا سراي 1–4 برشلونة · 13 أكتوبر 2026",
      "lang": "ar",
      "jsonLd": [
        {
          "@type": "WebPage",
          "@id": "__SITE__/galatasaray-barcelona/#webpage",
          "url": "__SITE__/galatasaray-barcelona/",
          "name": "جالاتا سراي 1–4 برشلونة | تحليل الجولة الثانية 2026",
          "description": "تحليل فوز برشلونة 4–1 على جالاتا سراي في الجولة الثانية لدوري الأبطال 2026/27: ملخص الأهداف والتشكيل وتقييمات اللاعبين والإحصائيات ومراجعة عربية موثقة.",
          "inLanguage": "ar",
          "citation": [
            "https://www.uefa.com/uefachampionsleague/match/2049576--galatasaray-vs-barcelona/",
            "https://www.fcbarcelona.com/en/football/first-team/news/4591863/galatasaray-1-4-fc-barcelona-heaven-in-hell"
          ],
          "dateModified": "2026-10-16",
          "datePublished": "2026-10-16",
          "primaryImageOfPage": {
            "@type": "ImageObject",
            "url": "__SITE__/images/matches/galatasaray-barcelona-og.png",
            "width": 1200,
            "height": 630
          },
          "breadcrumb": {
            "@id": "__SITE__/galatasaray-barcelona/#breadcrumb"
          },
          "mainEntity": {
            "@id": "__SITE__/galatasaray-barcelona/#article"
          }
        },
        {
          "@type": "Article",
          "@id": "__SITE__/galatasaray-barcelona/#article",
          "url": "__SITE__/galatasaray-barcelona/",
          "headline": "جالاتا سراي 1–4 برشلونة | تحليل الجولة الثانية 2026",
          "description": "تحليل فوز برشلونة 4–1 على جالاتا سراي في الجولة الثانية لدوري الأبطال 2026/27: ملخص الأهداف والتشكيل وتقييمات اللاعبين والإحصائيات ومراجعة عربية موثقة.",
          "inLanguage": "ar",
          "datePublished": "2026-10-16",
          "dateModified": "2026-10-16",
          "image": {
            "@type": "ImageObject",
            "url": "__SITE__/images/matches/galatasaray-barcelona-og.png",
            "width": 1200,
            "height": 630
          },
          "author": {
            "@id": "__SITE__/#organization"
          },
          "publisher": {
            "@id": "__SITE__/#organization"
          },
          "mainEntityOfPage": {
            "@id": "__SITE__/galatasaray-barcelona/#webpage"
          },
          "citation": [
            "https://www.uefa.com/uefachampionsleague/match/2049576--galatasaray-vs-barcelona/",
            "https://www.fcbarcelona.com/en/football/first-team/news/4591863/galatasaray-1-4-fc-barcelona-heaven-in-hell"
          ]
        },
        {
          "@type": "FAQPage",
          "mainEntity": [
            {
              "@type": "Question",
              "name": "متى مباراة جالاتا سراي وبرشلونة؟",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "أُقيمت المباراة الثلاثاء 13 أكتوبر 2026 في الجولة الثانية من دوري أبطال أوروبا، الساعة 19:00 UTC، الموافق 22:00 بتوقيت مصر ومكة."
              }
            },
            {
              "@type": "Question",
              "name": "أين تُقام المباراة؟",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "أُقيم اللقاء على ملعب رامس بارك، على أرض جالاتا سراي، وفق ورقة UEFA الرسمية."
              }
            },
            {
              "@type": "Question",
              "name": "ما القنوات الناقلة للمباراة؟",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "تعتمد القنوات والمنصات الناقلة على البطولة وبلد المشاهدة. لم نؤكد ناقلاً لهذا اللقاء؛ راجع دليل المشاهدة الرسمية وإعلان الجهة المالكة للحقوق في بلدك."
              }
            },
            {
              "@type": "Question",
              "name": "هل يوجد بث مباشر داخل الصفحة؟",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "انتهت المباراة. الصفحة لا تستضيف بثاً أو إعادة؛ تفتح روابط الملخص لدى النادي وخيارات المشاهدة الرسمية في صفحات الجهات الأصلية."
              }
            },
            {
              "@type": "Question",
              "name": "أين التشكيل والنتيجة والإحصائيات؟",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "تشكيل البداية والبدلاء ودقائق التبديلات والتقييمات موجودة أعلاه. التقييمات من FotMob فقط؛ غياب الدرجة يظهر «غير متاح»، ولا تُنقل تقييمات مباراة أخرى."
              }
            }
          ]
        },
        {
          "@type": "BreadcrumbList",
          "@id": "__SITE__/galatasaray-barcelona/#breadcrumb",
          "itemListElement": [
            {
              "@type": "ListItem",
              "position": 1,
              "name": "الرئيسية",
              "item": "__SITE__/"
            },
            {
              "@type": "ListItem",
              "position": 2,
              "name": "تحليل المباريات",
              "item": "__SITE__/match-analysis/"
            },
            {
              "@type": "ListItem",
              "position": 3,
              "name": "المواجهة الأوروبية",
              "item": "__SITE__/galatasaray-barcelona/"
            }
          ]
        }
      ]
    },
    "galatasaray-barcelona/watch": {
      "title": "متابعة جالاتا سراي وبرشلونة | دليل المشاهدة الرسمية",
      "description": "نتيجة جالاتا سراي وبرشلونة 1–4 في الجولة الثانية يوم 13 أكتوبر 2026؛ صفحة المتابعة ودليل المشاهدة الرسمية ومواعيد المباريات القادمة، دون بث أو إعادة هنا.",
      "canonical": "__SITE__/galatasaray-barcelona/watch/",
      "robots": "index, follow, max-image-preview:large",
      "ogType": "website",
      "ogImage": "__SITE__/images/matches/galatasaray-barcelona-watch-og.png",
      "ogImageAlt": "جالاتا سراي 1–4 برشلونة · 13 أكتوبر 2026",
      "lang": "ar",
      "jsonLd": [
        {
          "@type": "WebPage",
          "@id": "__SITE__/galatasaray-barcelona/watch/#webpage",
          "url": "__SITE__/galatasaray-barcelona/watch/",
          "name": "متابعة جالاتا سراي وبرشلونة | دليل المشاهدة الرسمية",
          "description": "نتيجة جالاتا سراي وبرشلونة 1–4 في الجولة الثانية يوم 13 أكتوبر 2026؛ صفحة المتابعة ودليل المشاهدة الرسمية ومواعيد المباريات القادمة، دون بث أو إعادة هنا.",
          "inLanguage": "ar",
          "datePublished": "2026-10-16",
          "dateModified": "2026-10-16",
          "primaryImageOfPage": {
            "@type": "ImageObject",
            "url": "__SITE__/images/matches/galatasaray-barcelona-watch-og.png",
            "width": 1200,
            "height": 630
          },
          "breadcrumb": {
            "@id": "__SITE__/galatasaray-barcelona/watch/#breadcrumb"
          },
          "mainEntity": {
            "@id": "__SITE__/galatasaray-barcelona/#article"
          },
          "about": {
            "@id": "__SITE__/galatasaray-barcelona/#webpage"
          }
        },
        {
          "@type": "BreadcrumbList",
          "@id": "__SITE__/galatasaray-barcelona/watch/#breadcrumb",
          "itemListElement": [
            {
              "@type": "ListItem",
              "position": 1,
              "name": "الرئيسية",
              "item": "__SITE__/"
            },
            {
              "@type": "ListItem",
              "position": 2,
              "name": "تحليل المباريات",
              "item": "__SITE__/match-analysis/"
            },
            {
              "@type": "ListItem",
              "position": 3,
              "name": "صفحة المواجهة",
              "item": "__SITE__/galatasaray-barcelona/"
            },
            {
              "@type": "ListItem",
              "position": 4,
              "name": "المتابعة",
              "item": "__SITE__/galatasaray-barcelona/watch/"
            }
          ]
        }
      ]
    },
  "manchester-united-atletico": {
    "title": "أتلتيكو 2–0 مانشستر يونايتد | تحليل الجولة الثانية",
    "description": "تحليل فوز أتلتيكو مدريد 2–0 على مانشستر يونايتد في الجولة الثانية لدوري أبطال أوروبا 2026/27؛ النتيجة والتشكيل والإحصائيات والمراجعات العربية ومصادرها.",
    "canonical": "__SITE__/manchester-united-atletico/",
    "robots": "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
    "ogType": "website",
    "ogImage": "__SITE__/images/matches/manchester-united-atletico-og.png",
    "ogImageAlt": "مانشستر يونايتد × أتلتيكو مدريد في دوري أبطال أوروبا",
    "lang": "ar",
    "jsonLd": [
      {
        "@type": "SportsEvent",
        "@id": "__SITE__/manchester-united-atletico/#match",
        "name": "أتلتيكو مدريد ضد مانشستر يونايتد — دوري أبطال أوروبا",
        "description": "مواجهة أتلتيكو مدريد (صاحب الأرض) ومانشستر يونايتد في الجولة الثانية من مرحلة الدوري لدوري أبطال أوروبا 2026/27.",
        "sport": "Soccer",
        "startDate": "2026-10-13T19:00:00Z",
        "endDate": "2026-10-13T20:50:00Z",
        "eventStatus": "https://schema.org/EventScheduled",
        "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
        "url": "__SITE__/manchester-united-atletico/",
        "image": [
          "__SITE__/images/matches/manchester-united-atletico-og.png"
        ],
        "location": {
          "@type": "Place",
          "name": "رياض إير ميتروبوليتانو",
          "address": {
            "@type": "PostalAddress",
            "streetAddress": "Av. de Luis Aragonés, 4",
            "addressLocality": "Madrid",
            "postalCode": "28022",
            "addressRegion": "Comunidad de Madrid",
            "addressCountry": "ES"
          }
        },
        "performer": [
          {
            "@type": "SportsTeam",
            "name": "أتلتيكو مدريد"
          },
          {
            "@type": "SportsTeam",
            "name": "مانشستر يونايتد"
          }
        ],
        "homeTeam": {
          "@type": "SportsTeam",
          "name": "أتلتيكو مدريد"
        },
        "awayTeam": {
          "@type": "SportsTeam",
          "name": "مانشستر يونايتد"
        },
        "organizer": {
          "@type": "Organization",
          "name": "UEFA",
          "url": "https://www.uefa.com/uefachampionsleague/"
        }
      },
      {
        "@type": "WebPage",
        "@id": "__SITE__/manchester-united-atletico/#webpage",
        "url": "__SITE__/manchester-united-atletico/",
        "name": "أتلتيكو 2–0 مانشستر يونايتد | تحليل الجولة الثانية",
        "description": "تحليل فوز أتلتيكو مدريد 2–0 على مانشستر يونايتد في الجولة الثانية لدوري أبطال أوروبا 2026/27؛ النتيجة والتشكيل والإحصائيات والمراجعات العربية ومصادرها.",
        "inLanguage": "ar-EG",
        "datePublished": "2026-10-13",
        "dateModified": "2026-10-16",
        "primaryImageOfPage": {
          "@type": "ImageObject",
          "url": "__SITE__/images/matches/manchester-united-atletico-og.png",
          "width": 1200,
          "height": 630
        },
        "mainEntity": {
          "@id": "__SITE__/manchester-united-atletico/#match"
        },
        "breadcrumb": {
          "@id": "__SITE__/manchester-united-atletico/#breadcrumb"
        }
      },
      {
        "@type": "BreadcrumbList",
        "@id": "__SITE__/manchester-united-atletico/#breadcrumb",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "الرئيسية",
            "item": "__SITE__/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "تحليل المباريات",
            "item": "__SITE__/match-analysis/"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "المواجهة الأوروبية",
            "item": "__SITE__/manchester-united-atletico/"
          }
        ]
      },
      {
        "@type": "FAQPage",
        "@id": "__SITE__/manchester-united-atletico/#faq",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "متى موعد مباراة مانشستر يونايتد وأتلتيكو مدريد؟",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "تقام المباراة يوم الثلاثاء 13 أكتوبر 2026، في الساعة 10:00 مساءً بتوقيت القاهرة (19:00 UTC)."
            }
          },
          {
            "@type": "Question",
            "name": "أين تُقام مباراة أتلتيكو مدريد ومانشستر يونايتد؟",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "تقام المباراة على ملعب رياض إير ميتروبوليتانو في مدريد، إسبانيا."
            }
          },
          {
            "@type": "Question",
            "name": "انتهت المباراة — أين أتابع المباريات القادمة؟",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "زر المشاهدة ينقلك إلى صفحة المتابعة داخل الموقع، وهي تعرض تنويه انتهاء اللقاء وروابط مواعيد المباريات القادمة والقنوات الناقلة الرسمية عبر دليل المشاهدة الرسمية."
            }
          }
        ]
      }
    ]
  },
  "manchester-united-atletico/watch": {
    "title": "متابعة أتلتيكو ومانشستر يونايتد | النتيجة والمشاهدة الرسمية",
    "description": "انتهت مباراة مانشستر يونايتد وأتلتيكو مدريد (13 أكتوبر 2026). لا يوجد بث مباشر داخل الموقع — تابع ستريم ماستر لمواعيد المباريات القادمة والقنوات والباقات.",
    "canonical": "__SITE__/manchester-united-atletico/watch/",
    "robots": "index, follow, max-image-preview:large, max-snippet:-1",
    "ogType": "website",
    "ogImage": "__SITE__/images/matches/manchester-united-atletico-watch-og.png",
    "ogImageAlt": "انتهت مباراة مانشستر يونايتد وأتلتيكو مدريد — تابع المباريات القادمة",
    "lang": "ar",
    "jsonLd": [
      {
        "@type": "WebPage",
        "@id": "__SITE__/manchester-united-atletico/watch/#webpage",
        "url": "__SITE__/manchester-united-atletico/watch/",
        "name": "متابعة أتلتيكو ومانشستر يونايتد | النتيجة والمشاهدة الرسمية",
        "inLanguage": "ar",
        "description": "انتهت مباراة مانشستر يونايتد وأتلتيكو مدريد (13 أكتوبر 2026). لا يوجد بث مباشر داخل الموقع — تابع ستريم ماستر لمواعيد المباريات القادمة والقنوات والباقات.",
        "isPartOf": {
          "@id": "__SITE__/#website"
        },
        "datePublished": "2026-10-13",
        "dateModified": "2026-10-16",
        "primaryImageOfPage": {
          "@type": "ImageObject",
          "url": "__SITE__/images/matches/manchester-united-atletico-watch-og.png",
          "width": 1200,
          "height": 630
        },
        "breadcrumb": {
          "@id": "__SITE__/manchester-united-atletico/watch/#breadcrumb"
        },
        "about": {
          "@id": "__SITE__/manchester-united-atletico/#match"
        }
      },
      {
        "@type": "BreadcrumbList",
        "@id": "__SITE__/manchester-united-atletico/watch/#breadcrumb",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "الرئيسية",
            "item": "__SITE__/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "تحليل المباريات",
            "item": "__SITE__/match-analysis/"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "صفحة المواجهة",
            "item": "__SITE__/manchester-united-atletico/"
          },
          {
            "@type": "ListItem",
            "position": 4,
            "name": "المتابعة",
            "item": "__SITE__/manchester-united-atletico/watch/"
          }
        ]
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "هل يوجد بث مباشر لهذه المباراة داخل الموقع؟",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "لا. هذه صفحة متابعة داخلية توضّح أن المباراة انتهت؛ لا يُعرض أي بث مباشر ولا يُخزَّن أي رابط بث. لاستكمال المتابعة استخدم مصدراً مرخصاً ومتاحاً في منطقتك عبر دليل المشاهدة الرسمية."
            }
          },
          {
            "@type": "Question",
            "name": "أين أرى النتيجة النهائية وإحصائيات المباراة؟",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "في صفحة المواجهة: صندوق النتيجة ولوحة «إحصائيات المباراة» يقرآن من مصدر النتائج نفسه المستخدم في صفحة مواعيد المباريات."
            }
          },
          {
            "@type": "Question",
            "name": "كيف أتابع المباريات القادمة؟",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "افتح مواعيد المباريات واختر منطقتك الزمنية، ثم حدّد البطولة أو ابحث عن فريقك. ولتشغيل الباقات على أجهزتك، اطلب تجربة مجانية أو تصفّح المتجر."
            }
          }
        ]
      }
    ]
  }
};

export function getLegacyAnalysisSeo(route: string): SeoMeta | null {
  const key = route.replace(/^\/+|\/+$/g, "");
  const source = LEGACY_ANALYSIS_SEO[key];
  if (!source) return null;
  const seo: SeoMeta = JSON.parse(JSON.stringify(source).split("__SITE__").join(SITE_URL));
  if (key === "match-analysis") {
    const webpage = seo.jsonLd.find(node => node["@type"] === "WebPage")!;
    const collection = seo.jsonLd.find(node => node["@type"] === "CollectionPage")!;
    webpage.mainEntity = { "@id": collection["@id"] };
    collection.mainEntity = {
      "@type": "ItemList", "@id": `${seo.canonical}#matches`,
      numberOfItems: analysisCollection.reports.length,
      itemListElement: analysisCollection.reports.map((report, index) => ({
        "@type": "ListItem", position: index + 1,
        name: `${report.home} × ${report.away}`,
        url: absolute(report.slug), item: { "@id": `${absolute(report.slug)}#webpage` },
      })),
    };
  }
  return seo;
}
