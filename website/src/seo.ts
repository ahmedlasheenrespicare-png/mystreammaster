/* ==========================================================================
   بيانات SEO لكل مسار — مصدر واحد يستخدمه:
   • الموقع عند التنقّل بين الصفحات (تحديث العنوان والوصف)
   • سكربت البناء المسبق (Prerender) الذي يكتبها داخل HTML كل صفحة
========================================================================== */

import { absolute, BRAND_EN, BRAND_NAME, SITE_URL, WHATSAPP_DISPLAY } from "./config";
import { AVAILABLE_DURATIONS, FAQS, PRICING_PLANS } from "./data";
import { BLOG_POSTS, type PostSection } from "./content/posts";

export interface SeoMeta {
  title: string;
  description: string;
  canonical: string;
  robots: string;
  ogType: "website" | "article";
  jsonLd: Record<string, unknown>[];
}

const OG_IMAGE = `${SITE_URL}/images/og-default.png`;

/* تنظيم الموقع — يظهر في كل الصفحات */
const organizationLd = {
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: `${BRAND_NAME} — ${BRAND_EN}`,
  url: `${SITE_URL}/`,
  logo: `${SITE_URL}/icon-512.png`,
  description: "اشتراكات وسيرفرات IPTV بثبات عالٍ بدون تقطيع في السعودية والخليج ومصر",
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

/* عدد كلمات النصّ السردي في قسم — يُستخدم في wordCount داخل البيانات المنظّمة */
function wordsIn(section: PostSection): number {
  const paragraphs = section.blocks
    ? section.blocks.flatMap((b) => ("p" in b ? [b.p] : []))
    : section.paragraphs ?? [];
  const text = paragraphs.join(" ").replace(/\s+/g, " ").trim();
  return text ? text.split(" ").length : 0;
}

export function getSeo(path: string): SeoMeta {
  const clean = `/${path.replace(/^\/+|\/+$/g, "")}`;
  const base: SeoMeta = {
    title: `${BRAND_NAME} | افضل اشتراك IPTV 2026 بدون تقطيع`,
    description:
      "اشتراكات وسيرفرات IPTV بثبات 99.9% في السعودية والخليج ومصر — قنوات رياضية وإخبارية ومكتبة أفلام، تفعيل فوري وتجربة مجانية.",
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
          name: "اشتراك سيرفر IPTV بدون تقطيع 2026",
          description:
            "اشتراكات IPTV أصلية بجودة 4K/Full HD مع تفعيل فوري وضمان ثبات طوال مدة الاشتراك.",
          brand: { "@type": "Brand", name: BRAND_EN },
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
      title: `${nameOnly} — اشتراك IPTV ${plan.quality} | ${BRAND_NAME}`,
      description: `${plan.description} ${plan.channelsCount} و${plan.vodCount} — يبدأ من ${cheapest} دولار سنوياً مع تفعيل فوري وتجربة مجانية.`,
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
          description: plan.description,
          brand: { "@type": "Brand", name: BRAND_EN },
          category: "IPTV Subscription",
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
      title: `قائمة القنوات المتوفرة في الاشتراك | ${BRAND_NAME}`,
      description:
        "تصفّح القنوات الرياضية والإخبارية والعربية وقنوات الأطفال والوثائقيات المتوفرة داخل الاشتراك — بحث فوري وتصنيفات كاملة.",
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
          dateModified: post.updated || post.date,
          inLanguage: "ar",
          mainEntityOfPage: absolute(`blog/${post.slug}/`),
          author: { "@type": "Organization", name: BRAND_NAME },
          publisher: { "@id": `${SITE_URL}/#organization` },
          image: OG_IMAGE,
          wordCount: post.sections.reduce((n, s) => n + wordsIn(s), 0),
        },
        /* أسئلة المقال — تُعلن لمحرك البحث كبيانات منظّمة ليعرضها ضمن النتائج */
        ...(post.faq && post.faq.length > 0
          ? [
              {
                "@type": "FAQPage",
                mainEntity: post.faq.map((f) => ({
                  "@type": "Question",
                  name: f.q,
                  acceptedAnswer: { "@type": "Answer", text: f.a },
                })),
              },
            ]
          : []),
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
