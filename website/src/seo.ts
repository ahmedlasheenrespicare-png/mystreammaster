/* ==========================================================================
   بيانات SEO لكل مسار — مصدر واحد يستخدمه:
   • الموقع عند التنقّل بين الصفحات (تحديث العنوان والوصف)
   • سكربت البناء المسبق (Prerender) الذي يكتبها داخل HTML كل صفحة
========================================================================== */

import { absolute, BRAND_EN, BRAND_NAME, SITE_URL, WHATSAPP_DISPLAY } from "./config";
import { AVAILABLE_DURATIONS, FAQS, PRICING_PLANS } from "./data";
import { BLOG_POSTS } from "./content/posts";

export interface SeoMeta {
  title: string;
  description: string;
  canonical: string;
  robots: string;
  ogType: "website" | "article";
  jsonLd: Record<string, unknown>[];
}

const OG_IMAGE = `${SITE_URL}/images/og-default.png`;

/* الصفة القانونية/التقنية للمنصة — نص واحد يُستخدم في بيانات المنظمة والمنتج
   حتى لا يختلف وصف النشاط بين صفحة وأخرى في نتائج البحث. */
export const ORG_ROLE =
  "خدمات ربط تقني وإعداد مشغلات البث ودليل المشاهدة الرسمية";

const ORG_DESCRIPTION =
  "منصة خدمات ربط تقني في السعودية والخليج ومصر: تفعيل قوائم التشغيل (M3U / Xtream Codes) الصادرة من المزود الخارجي، وإعداد مشغلات البث على الشاشات والأجهزة، ودعم فني بالعربية، مع دليل للمشاهدة الرسمية للقنوات والمنصات. الموقع لا يستضيف المحتوى ولا يبثّه ولا يعيد بثّه.";

/* تنظيم الموقع — يظهر في كل الصفحات */
const organizationLd = {
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
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

function breadcrumbs(items: { name: string; path: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: absolute(it.path),
    })),
  };
}

export function getSeo(path: string): SeoMeta {
  const clean = `/${path.replace(/^\/+|\/+$/g, "")}`;
  const base: SeoMeta = {
    title: `${BRAND_NAME} | ${ORG_ROLE} 2026`,
    description:
      "خدمات ربط تقني وإعداد مشغلات البث (M3U / Xtream Codes) على شاشات سامسونج وLG وأندرويد وApple TV، مع دليل القنوات المفتوحة وخيارات المشاهدة الرسمية — تفعيل فوري ودعم فني بالعربية.",
    canonical: absolute(""),
    robots: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
    ogType: "website",
    jsonLd: [organizationLd],
  };

  const pageTitles: Record<string, string> = { "/store": "متجر الاشتراكات", "/servers": "السيرفرات والباقات", "/cart": "سلة المشتريات", "/faq": "الأسئلة الشائعة" };
  if (pageTitles[clean]) return { ...base, title: `${pageTitles[clean]} | ${BRAND_NAME}`, canonical: absolute(clean), robots: clean === "/cart" ? "noindex, follow" : base.robots };

  if (clean === "/matches") return {
    ...base,
    title: `مواعيد المباريات والنتائج | ${BRAND_NAME}`,
    description: "جدول مباريات كرة القدم للأسبوع الماضي والقادم، ونتائج محدثة تلقائيًا كل دقيقة بتوقيت مكة ومصر والتوقيت العالمي UTC، ضمن البطولات المتاحة.",
    canonical: absolute("matches"),
    jsonLd: [...base.jsonLd, breadcrumbs([{ name: "الرئيسية", path: "" }, { name: "مواعيد المباريات", path: "matches" }])],
  };

  /* ===== الصفحة الرئيسية ===== */
  if (clean === "/") {
    return {
      ...base,
      jsonLd: [
        organizationLd,
        breadcrumbs([{ name: "الرئيسية", path: "/" }]),
        {
          "@type": "Product",
          "@id": `${SITE_URL}/#product`,
          name: "باقة تفعيل وربط تقني لمشغلات البث 2026",
          description:
            "خدمة تفعيل وربط تقني لمشغلات البث على جهازك: إعداد قوائم التشغيل (M3U / Xtream Codes) الصادرة من المزود الخارجي، وضبط الجودة والأجهزة، ودعم فني طوال مدة الباقة. المواصفات الفنية للسيرفر (عدد القنوات والمكتبة والجودة) يوفّرها المزود الخارجي، والموقع لا يستضيف المحتوى ولا يبثّه.",
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
        {
          "@type": "FAQPage",
          mainEntity: FAQS.slice(0, 6).map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        },
      ],
    };
  }

  /* ===== صفحات الباقات ===== */
  const plan = PRICING_PLANS.find((p) => clean === `/${p.serverCode}`);
  if (plan) {
    const cheapest = plan.prices["12"].USD;
    const nameOnly = plan.serverName.split("(")[0].trim();
    return {
      ...base,
      title: `${nameOnly} — باقة تفعيل وربط تقني (IPTV ${plan.quality}) | ${BRAND_NAME}`,
      description: `${plan.description} المواصفات الفنية (${plan.channelsCount} و${plan.vodCount}) يوفّرها سيرفر المزود الخارجي، وتشمل خدمتنا التفعيل والربط التقني والدعم الفني — تبدأ من ${cheapest} دولار سنوياً.`,
      canonical: absolute(`${plan.serverCode}/`),
      jsonLd: [
        organizationLd,
        breadcrumbs([
          { name: "الرئيسية", path: "/" },
          { name: nameOnly, path: `/${plan.serverCode}/` },
        ]),
        {
          "@type": "Product",
          name: plan.serverName,
          description: `${plan.description} الخدمة المقدَّمة من الموقع هي التفعيل والربط التقني والدعم الفني؛ أما مواصفات السيرفر فهي لدى المزود الخارجي المستقل.`,
          brand: { "@type": "Brand", name: BRAND_EN },
          category: "Technical setup and activation service",
          url: absolute(`${plan.serverCode}/`),
          image: OG_IMAGE,
          offers: AVAILABLE_DURATIONS.map(months => ({
            "@type": "Offer",
            name: `${Number(months)} شهر`,
            price: String(plan.prices[months].USD),
            priceCurrency: "USD",
            availability: "https://schema.org/InStock",
            url: absolute(`${plan.serverCode}/`),
          })),
        },
      ],
    };
  }

  /* ===== صفحة القنوات ===== */
  if (clean === "/channels") {
    return {
      ...base,
      title: `دليل القنوات المفتوحة وقنوات المزودين | ${BRAND_NAME}`,
      description:
        "تصفّح القنوات المفتوحة التي تُشاهد مباشرة من مصادرها الرسمية، ودليل القنوات الرياضية والإخبارية والعربية لدى المزودين الخارجيين ضمن باقاتهم — بحث فوري وتصنيفات كاملة، مع روابط الاشتراك الرسمي للمنصات المشفّرة.",
      canonical: absolute("channels/"),
      jsonLd: [
        organizationLd,
        breadcrumbs([
          { name: "الرئيسية", path: "/" },
          { name: "القنوات", path: "/channels/" },
        ]),
      ],
    };
  }

  /* ===== المدوّنة ===== */
  if (clean === "/blog") {
    return {
      ...base,
      title: `مقالات ودلائل تشغيل الـ IPTV | ${BRAND_NAME}`,
      description:
        "دلائل عملية: كيف تختبر ثبات السيرفر، وطريقة تشغيل الاشتراك على شاشات سامسونج وLG، وكيف تختار السيرفر المناسب لسرعتك.",
      canonical: absolute("blog/"),
      jsonLd: [
        organizationLd,
        breadcrumbs([
          { name: "الرئيسية", path: "/" },
          { name: "المدوّنة", path: "/blog/" },
        ]),
        {
          "@type": "Blog",
          name: `مدوّنة ${BRAND_NAME}`,
          url: absolute("blog/"),
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
    return {
      ...base,
      title: `${post.title} | ${BRAND_NAME}`,
      description: post.description,
      canonical: absolute(`blog/${post.slug}/`),
      ogType: "article",
      jsonLd: [
        organizationLd,
        breadcrumbs([
          { name: "الرئيسية", path: "/" },
          { name: "المدوّنة", path: "/blog/" },
          { name: post.title, path: `/blog/${post.slug}/` },
        ]),
        {
          "@type": "BlogPosting",
          headline: post.title,
          description: post.description,
          datePublished: post.date,
          dateModified: post.date,
          inLanguage: "ar",
          mainEntityOfPage: absolute(`blog/${post.slug}/`),
          author: { "@type": "Organization", name: BRAND_NAME },
          publisher: { "@id": `${SITE_URL}/#organization` },
          image: OG_IMAGE,
          wordCount: post.sections.reduce(
            (n, s) => n + (s.paragraphs?.join(" ").split(/\s+/).length ?? 0),
            0
          ),
        },
      ],
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
  setMeta('meta[name="twitter:title"]', "content", seo.title);
  setMeta('meta[name="twitter:description"]', "content", seo.description);

  let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.rel = "canonical";
    document.head.appendChild(link);
  }
  link.href = seo.canonical;
}
