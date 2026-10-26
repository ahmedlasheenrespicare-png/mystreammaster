/* ==========================================================================
   البناء المسبق (Prerender)
   --------------------------------------------------------------------------
   يحوّل كل مسار في الموقع إلى ملف HTML ثابت يحتوي المحتوى كاملاً:
     dist/index.html            ← /
     dist/channels/index.html   ← /channels
     dist/nova/index.html            ← /nova   (وكذلك istar و moka و x)
     dist/blog/index.html       ← /blog
     dist/blog/<slug>/index.html← كل مقال
     dist/404.html              ← أي مسار غير موجود (GitHub Pages يستخدمه تلقائياً)

   الفائدة: محرك البحث والزائر يريان المحتوى مباشرة في HTML، ثم يعمل الموقع
   كتطبيق تفاعلي عادي بعد التحميل (hydration). كما يُولَّد sitemap.xml تلقائياً.
========================================================================== */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { assertAdsAllowed } from "./ads-guard.mjs";
import {
  assertKeywordInTitle,
  assertTitleLength,
  findDuplicateKeywords,
  noteBrandInTitle,
} from "./seo-guard.mjs";
import { hasKeywordEntry } from "../src/keywords.mjs";

const DIST = "dist";
const SSR_ENTRY = "dist-ssr/entry-server.js";
const SEO_REPORT = path.join("docs", "seo-report.txt");

/* كتابة تقرير المخالفات بلا طوابع زمنية حتى يبقى الناتج حتمياً (git status نظيف).
   المخالفات وحدها تُفشل SEO_STRICT=1؛ التحذيرات وملاحظات البراند معلوماتية. */
async function writeSeoReport(stats) {
  await fs.mkdir("docs", { recursive: true });
  const lines = [
    "# تقرير حرّاس SEO — مولَّد تلقائياً في كل بناء",
    "# الوضع الافتراضي تحذير فقط؛ SEO_STRICT=1 يحوّل المخالفات المانعة إلى فشل بناء.",
    "# هذا التقرير حوكمة يمنع تكرار الخطأ، وليس وعداً بتحسّن ترتيب.",
    "#",
    `# ملخص ${stats.phase}: ${stats.totalRoutes} مساراً | ${stats.indexable} مفهرساً مفحوصاً | ${stats.skippedNoindex} مستثنى (noindex)`,
    `# مخالفات مانعة: ${stats.violations.length} (كلمة غائبة ${stats.keywordMisses} · طول >60: ${stats.lengthBlocking} · تكرار: ${stats.duplicates} · تغطية ناقصة: ${stats.coverageGaps})`,
    `# ملاحظات غير مانعة: تحذير طول 55–60: ${stats.warnings.length} · براند في العنوان (سياسة): ${stats.brandNotes.length}`,
    "",
  ];
  const sections = [
    ["## مخالفات مانعة (تُفشل SEO_STRICT=1)", stats.violations],
    ["## تحذيرات طول العنوان (55–60 حرفاً بدون اللاحقة، غير مانعة)", stats.warnings],
    ["## ملاحظات سياسية — البراند في العنوان (غير مانعة)", stats.brandNotes],
  ];
  for (const [heading, items] of sections) {
    lines.push(heading, "");
    lines.push(items.length ? items.join("\n\n") : "✅ لا شيء.");
    lines.push("", "");
  }
  await fs.writeFile(SEO_REPORT, `${lines.join("\n").replace(/\n+$/, "")}\n`, "utf8");
}

const SITE_URL = (process.env.VITE_SITE_URL || "https://streammasterstore.com").replace(/\/+$/, "");

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* استبدال آمن (بلا تفسير $ في النص البديل) */
function replaceTag(html, pattern, replacement) {
  return html.replace(pattern, () => replacement);
}

function applyHead(template, seo) {
  let out = template;

  out = replaceTag(out, /<title>[\s\S]*?<\/title>/, `<title>${esc(seo.title)}</title>`);
  /* وصف الصفحة: القالب قد يكتب الوسم على أكثر من سطر، فنستخدم نمطاً متسامحاً
     مع المسافات والأسطر — وإن لم يوجد الوسم أصلاً نضيفه قبل </head>. */
  out = replaceTag(
    out,
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${esc(seo.description)}" />`
  );
  if (!/<meta\s+name="description"/.test(out)) {
    out = out.replace("</head>", `    <meta name="description" content="${esc(seo.description)}" />\n  </head>`);
  }
  /* canonical: نفس المعالجة (قد يكون على سطر واحد أو موزّعاً) */
  const canonicalTag = `<link rel="canonical" href="${seo.canonical}" />`;
  if (/<link\s+rel="canonical"/.test(out)) {
    out = replaceTag(out, /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/, canonicalTag);
  } else {
    out = out.replace("</head>", `    ${canonicalTag}\n  </head>`);
  }

  const pairs = [
    ['property="og:title"', seo.title],
    ['property="og:description"', seo.description],
    ['property="og:url"', seo.canonical],
    ['property="og:type"', seo.ogType],
    /* صورة المشاركة خاصة بالصفحة — الأبعاد ثابتة 1200×630 لكل صور /images/og/ */
    ['property="og:image"', seo.ogImage],
    ['property="og:image:width"', "1200"],
    ['property="og:image:height"', "630"],
    ['name="twitter:image"', seo.ogImage],
    ['name="twitter:title"', seo.title],
    ['name="twitter:description"', seo.description],
    ['name="twitter:url"', seo.canonical],
    ['property="og:image:alt"', seo.ogImageAlt],
    ['name="twitter:image:alt"', seo.ogImageAlt],
    ['name="robots"', seo.robots],
  ];

  for (const [attr, value] of pairs) {
    const attrRe = attr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
    const re = new RegExp(`<meta ${attrRe} content="[^"]*"\\s*\\/?>`);
    const tag = `<meta ${attr} content="${esc(value)}" />`;
    if (re.test(out)) out = replaceTag(out, re, tag);
    else out = out.replace("</head>", `    ${tag}\n  </head>`);
  }

  /* لون شريط المتصفح: يُستبدل فقط للمسارات التي تعلن لوناً خاصاً (صفحة مركز
     المباراة الداكنة). وباقي المسارات تبقى على قيمة القالب العامة، فلا يُلمس
     ما لا يخصّ هذه المهمة. */
  if (seo.themeColor) {
    const themeRe = /<meta name="theme-color" content="[^"]*"\s*\/?>/;
    const themeTag = `<meta name="theme-color" content="${esc(seo.themeColor)}" />`;
    if (themeRe.test(out)) out = replaceTag(out, themeRe, themeTag);
    else out = out.replace("</head>", `    ${themeTag}\n  </head>`);
  }

  /* روابط hreflang للصفحات التجارية ذات النسختين (عربي/إنجليزي) */
  if (seo.alternates && seo.alternates.length > 0) {
    const links = seo.alternates
      .map((a) => `    <link rel="alternate" hreflang="${a.hreflang}" href="${a.href}" />`)
      .join("\n");
    out = out.replace("</head>", `${links}\n  </head>`);
  }

  /* لغة واجهة المشاركة الاجتماعية تتبع لغة الصفحة */
  if (seo.lang === "en") {
    out = out.replace(
      '<meta property="og:locale" content="ar_SA" />',
      '<meta property="og:locale" content="en_US" />\n    <meta property="og:locale:alternate" content="ar_SA" />'
    );
  }

  /* بيانات منظّمة (JSON-LD) خاصة بكل صفحة */
  if (seo.jsonLd && seo.jsonLd.length > 0) {
    const ld = JSON.stringify({ "@context": "https://schema.org", "@graph": seo.jsonLd });
    out = out.replace(
      "</head>",
      `    <script type="application/ld+json" id="page-jsonld">${ld.replace(/<\/script>/gi, "<\\/script>")}</script>\n  </head>`
    );
  }

  return out;
}

/* صفحات مستثناة من إعلانات AdSense نهائياً: 404 والسلة (والبحث وصفحة عدم
   الاتصال صفحتان قديمتان تُستثنيان من مصدريهما في website/legacy).
   جوجل يعتبر هذه الصفحات مواضع إعلانية غير صالحة ووجود الإعلانات عليها
   يعرّض حساب الناشر للخطر، فيُحذف مُحمِّل adsbygoogle من HTML المُسلَّم
   لها فقط — بينما يبقى GA4 كما هو دون أي مساس (قاعدة مطلقة). */
const NO_ADS_ROUTES = new Set([
  "/cart",
  "/__notfound__",
  /* صفحات وظيفية بلا محتوى يُذكر (74 و106 كلمة) أو واجهة لعبة توقعات.
     إعلانات Google على «واجهات الألعاب» والصفحات الفارغة مخالفة صريحة. */
  "/predictions",
  "/status",
]);
const ADSENSE_COMMENT = /<!-- Google AdSense[^>]*-->\s*/;
const ADSENSE_LOADER =
  /<script[^>]*pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js[^>]*>\s*<\/script>/;

function stripAdsense(html, route) {
  const out = html.replace(ADSENSE_COMMENT, "").replace(ADSENSE_LOADER, "");
  if (out.includes("googlesyndication")) {
    throw new Error(`مُحمِّل AdSense ما زال موجوداً في صفحة مستثناة: ${route}`);
  }
  return out;
}

function writeRouteHtml(template, route, body) {
  const withBody = template.includes('<div id="root"></div>')
    ? template.replace('<div id="root"></div>', `<div id="root">${body}</div>`)
    : template;
  /* حارس AdSense: لا إعلانات على صفحة نصّها أقل من الحد (سياسة Google) */
  assertAdsAllowed(withBody, route);
  const dir = route === "/" ? DIST : path.join(DIST, route);
  return fs.mkdir(dir, { recursive: true }).then(() =>
    fs.writeFile(path.join(dir, "index.html"), withBody)
  );
}

/* lastmod = تاريخ آخر تعديل فعلي للمصدر، لا تاريخ البناء.
   كتابة «اليوم» في كل بناء تعلّم Google أن يتجاهل الوسم نهائياً (يوصي
   صراحةً بأن يكون lastmod موثوقاً)، فيفقد الموقع أسرع إشارة تحديث لديه.
   المصدر: تاريخ آخر commit لمس ملفات المحتوى/المكوّنات التي تُبنى منها
   الصفحة. وإن تعذّر الوصول إلى git (بناء بلا تاريخ) يُحذف الوسم بدل
   إرسال قيمة كاذبة: الغياب الصادق أفضل من الحضور الزائف. */
const LASTMOD_SOURCES = {
  home: ['src/App.tsx', 'src/components/Hero.tsx', 'src/seo.ts'],
  blog: ['src/content/posts.ts', 'src/seo.ts'],
  other: ['src/seo.ts'],
};

function gitTime(websiteDir, paths) {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%ct', '--', ...paths], {
      cwd: websiteDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return out ? Number(out) * 1000 : 0;
  } catch {
    return 0;
  }
}

function lastmodTable(websiteDir) {
  const table = {};
  for (const [key, paths] of Object.entries(LASTMOD_SOURCES)) {
    const time = gitTime(websiteDir, paths);
    if (time) table[key] = new Date(time).toISOString().slice(0, 10);
  }
  return table;
}

function sitemap(routes, lastmods = {}) {
  const urls = routes
    .map((r) => {
      const slug = decodeURIComponent(r.replace(/^\//, ''));
      const key = r === '/' ? 'home' : slug === 'blog' || slug.startsWith('blog/') ? 'blog' : 'other';
      const lastmod = lastmods[key];
      /* encodeURI يرمّز السلاجات العربية ويبقي بنية الرابط — نفس صيغة sitemap-0.xml */
      const loc = `    <loc>${encodeURI(`${SITE_URL}/${r === "/" ? "" : r.replace(/^\//, "") + "/"}`)}</loc>`;
      return [
        '  <url>',
        loc,
        ...(lastmod ? [`    <lastmod>${lastmod}</lastmod>`] : []),
        `    <changefreq>${r === '/' ? 'daily' : 'weekly'}</changefreq>`,
        `    <priority>${r === '/' ? '1.0' : '0.8'}</priority>`,
        '  </url>',
      ].join('\n');
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

async function main() {
  const template = await fs.readFile(path.join(DIST, "index.html"), "utf8");

  if (/(src|href)="\.\//.test(template)) {
    console.warn(
      "⚠️  تنبيه: قالب HTML يستخدم مسارات نسبية (./) — تأكد أن VITE_BASE مضبوط على مسار مطلق قبل النشر."
    );
  }

  const { getAllRoutes, renderPage } = await import(path.resolve(SSR_ENTRY));
  const routes = getAllRoutes();
  const indexableRoutes = [];

  /* حرّاس SEO على الصفحات المفهرسة فقط: صفحات noindex (تفاصيل المباريات
     والصفحات الوظيفية) لا تظهر في نتائج البحث فلا تُفرض عليها قواعد العناوين.
     تُجمَع المخالفات المانعة في تقرير، والبناء يفشل بها فقط مع SEO_STRICT=1. */
  const strict = process.env.SEO_STRICT === "1";
  const violations = [];
  const warnings = [];
  const brandNotes = [];
  const entries = [];
  let indexableGuarded = 0;
  let skippedNoindex = 0;
  let keywordMisses = 0;
  let lengthBlocking = 0;
  let coverageGaps = 0;

  let count = 0;
  for (const route of routes) {
    const { html, seo } = renderPage(route);
    const noindex = String(seo.robots ?? "").startsWith("noindex");
    if (noindex) {
      skippedNoindex++;
    } else {
      indexableGuarded++;
      entries.push({ route, primary: seo.primaryKeyword ?? null, intent: seo.intent });
      /* حارس التغطية: كل صفحة قابلة للفهرسة يجب أن يكون لها مدخل في الخريطة */
      if (!hasKeywordEntry(route)) {
        violations.push(`صفحة قابلة للفهرسة بلا مدخل في خريطة الكلمات → ${route}`);
        coverageGaps++;
      }
      const keywordViolation = assertKeywordInTitle(route, seo.title, seo.primaryKeyword ?? null);
      if (keywordViolation) {
        violations.push(keywordViolation);
        keywordMisses++;
      }
      const length = assertTitleLength(route, seo.title);
      violations.push(...length.violations);
      lengthBlocking += length.violations.length;
      warnings.push(...length.warnings);
      const brandNote = noteBrandInTitle(route, seo.title);
      if (brandNote) brandNotes.push(brandNote);
    }
    const headed = applyHead(template, seo);
    const withAds = NO_ADS_ROUTES.has(route) ? stripAdsense(headed, route) : headed;
    /* الصفحات الإنجليزية تُسلَّم بـ lang="en" dir="ltr" بدل قالب العربية */
    const page =
      route === "/en" || route.startsWith("/en/")
        ? withAds.replace('<html lang="ar" dir="rtl">', '<html lang="en" dir="ltr">')
        : withAds;
    await writeRouteHtml(page, route, html);
    if (!String(seo.robots || "").startsWith("noindex")) indexableRoutes.push(route);
    count++;
    console.log(`  ✓ ${route.padEnd(38)} ${seo.title.slice(0, 46)}`);
  }

  /* صفحة 404 */
  const notFound = renderPage("/__notfound__");
  const notFoundHtml = stripAdsense(
    applyHead(template, { ...notFound.seo, robots: "noindex, follow" }),
    "/__notfound__"
  );
  await fs.writeFile(
    path.join(DIST, "404.html"),
    notFoundHtml.replace('<div id="root"></div>', `<div id="root">${notFound.html}</div>`)
  );

  /* حارس التكرار: كلمة واحدة لا يملكها مساران (والقصد التجاري لا يتكرر).
     صفحة 404 noindex لا تُفحَص ولا تُدرَج في الخريطة. */
  const duplicateViolations = findDuplicateKeywords(entries);
  violations.push(...duplicateViolations);
  await writeSeoReport({
    phase: "صفحات React (prerender)",
    totalRoutes: routes.length,
    indexable: indexableGuarded,
    skippedNoindex,
    violations,
    warnings,
    brandNotes,
    keywordMisses,
    lengthBlocking,
    duplicates: duplicateViolations.length,
    coverageGaps,
  });
  if (violations.length) {
    console.error(
      `\n⚠️  ${violations.length} مخالفة SEO مانعة (الصفحات المفهرسة) — التقرير في website/docs/seo-report.txt`
    );
    if (strict) throw new Error(`SEO strict: ${violations.length} مخالفة مانعة`);
  } else {
    console.log("\n✅ حرّاس SEO: لا مخالفات مانعة في الصفحات المفهرسة المرسومة مسبقاً");
  }

  /* خريطة الموقع */
  await fs.writeFile(path.join(DIST, "sitemap.xml"), sitemap(indexableRoutes, lastmodTable(path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."))));

  console.log(`\n✅ تم الرسم المسبق ${count} مساراً + 404.html + sitemap.xml`);
}

main().catch((err) => {
  console.error("❌ فشل البناء المسبق:", err);
  process.exit(1);
});
