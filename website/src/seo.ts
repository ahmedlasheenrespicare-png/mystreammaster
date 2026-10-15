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
import { AVAILABLE_DURATIONS, FAQS, PRICING_PLANS } from "./data";
import { BLOG_POSTS } from "./content/posts";
import { LEAGUE_LANDINGS, TEAM_LANDINGS } from "./content/competitions";

export interface SeoMeta {
  title: string;
  description: string;
  canonical: string;
  robots: string;
  ogType: "website" | "article";
  ogImageAlt: string;
  jsonLd: Record<string, unknown>[];
}

const OG_IMAGE = `${SITE_URL}/images/og-default.png`;
const OG_IMAGE_ALT = `${BRAND_NAME} — خدمات الربط التقني وإعداد مشغلات البث`;
const ORG_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;
/* تاريخ نشر/تحديث الصفحات الثابتة في هذه النسخة من الموقع */
const PAGES_DATE = "2026-10-14";
/* تاريخ نشر صفحات هبوط البطولات والمنتخبات */
const LANDING_DATE = "2026-10-15";

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
  /** معرّف الكيان الرئيسي في الصفحة (منتج/مقال/أسئلة) إن وُجد */
  mainEntityId?: string;
  /** هل تُرفق قائمة مسار التنقل؟ (الرئيسية هي جذر المسار فلا قائمة لها) */
  withBreadcrumb?: boolean;
}

function webPageLd(o: WebPageOpts) {
  const ld: Record<string, unknown> = {
    "@type": "WebPage",
    "@id": `${o.canonical}#webpage`,
    url: o.canonical,
    name: o.name,
    description: o.description,
    inLanguage: "ar",
    isPartOf: { "@id": WEBSITE_ID },
    datePublished: o.published ?? PAGES_DATE,
    dateModified: o.modified ?? o.published ?? PAGES_DATE,
    primaryImageOfPage: {
      "@type": "ImageObject",
      url: OG_IMAGE,
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
  const base: SeoMeta = {
    title: `${BRAND_NAME} | ربط تقني وإعداد مشغلات البث 2026`,
    description:
      "خدمات ربط تقني وإعداد مشغلات البث (M3U / Xtream Codes) على سامسونج وLG وأندرويد وApple TV، مع دليل القنوات المفتوحة وخيارات المشاهدة الرسمية ودعم فني بالعربية.",
    canonical: absolute(""),
    robots: INDEX_ROBOTS,
    ogType: "website",
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
        "تصفّح باقات التفعيل والربط التقني لسيرفرات نوفا وإيستار وموكا: أسعار سنوية واضحة، تفعيل فوري خلال دقائق، ودعم فني بالعربية على مدار الساعة.",
      canonical,
      ogImageAlt: `متجر اشتراكات ${BRAND_NAME} — باقات نوفا وإيستار وموكا`,
      jsonLd: [
        webPageLd({
          canonical,
          name: `متجر الاشتراكات | ${BRAND_NAME}`,
          description:
            "تصفّح باقات التفعيل والربط التقني لسيرفرات نوفا وإيستار وموكا: أسعار سنوية واضحة، تفعيل فوري خلال دقائق، ودعم فني بالعربية على مدار الساعة.",
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
        "قارن سيرفرات نوفا وإيستار وموكا: عدد القنوات والمكتبة والجودة والأجهزة المدعومة والأسعار، واختر باقة التفعيل والربط التقني المناسبة لسرعتك وجهازك.",
      canonical,
      ogImageAlt: `مقارنة سيرفرات ${BRAND_NAME} — نوفا وإيستار وموكا`,
      jsonLd: [
        webPageLd({
          canonical,
          name: `السيرفرات والباقات | ${BRAND_NAME}`,
          description:
            "قارن سيرفرات نوفا وإيستار وموكا: عدد القنوات والمكتبة والجودة والأجهزة المدعومة والأسعار، واختر باقة التفعيل والربط التقني المناسبة لسرعتك وجهازك.",
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
      "إجابات الأسئلة الشائعة حول التفعيل والربط التقني: استلام بيانات الاشتراك، التجربة المجانية، سرعة الإنترنت المطلوبة، الأجهزة المدعومة، وطرق الدفع والدعم.";
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
        faqLd(canonical, FAQS),
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
          published: LANDING_DATE,
          modified: LANDING_DATE,
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
            lowPrice: "25",
            highPrice: "45",
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
          offers: AVAILABLE_DURATIONS.map((months) => ({
            "@type": "Offer",
            name: `${Number(months)} شهر`,
            price: String(plan.prices[months].USD),
            priceCurrency: "USD",
            availability: "https://schema.org/InStock",
            url: canonical,
          })),
        },
      ],
    };
  }

  /* ===== صفحة القنوات ===== */
  if (clean === "/channels") {
    const canonical = absolute("channels/");
    const description =
      "تصفّح القنوات المفتوحة التي تُشاهد من مصادرها الرسمية، ودليل قنوات المزودين الخارجيين الرياضية والإخبارية والعربية — بحث فوري وتصنيفات كاملة وروابط رسمية.";
    return {
      ...base,
      title: `دليل وفهرس القنوات والتصنيفات | ${BRAND_NAME}`,
      description,
      canonical,
      ogImageAlt: `دليل وفهرس القنوات — ${BRAND_NAME}`,
      jsonLd: [
        webPageLd({
          canonical,
          name: `دليل وفهرس القنوات والتصنيفات | ${BRAND_NAME}`,
          description,
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
        image: OG_IMAGE,
        wordCount: post.sections.reduce(
          (n, s) => n + (s.paragraphs?.join(" ").split(/\s+/).length ?? 0),
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
  setMeta('meta[name="description"]', "content", seo.description);
  setMeta('meta[name="robots"]', "content", seo.robots);
  setMeta('meta[property="og:title"]', "content", seo.title);
  setMeta('meta[property="og:description"]', "content", seo.description);
  setMeta('meta[property="og:url"]', "content", seo.canonical);
  setMeta('meta[property="og:type"]', "content", seo.ogType);
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
}
