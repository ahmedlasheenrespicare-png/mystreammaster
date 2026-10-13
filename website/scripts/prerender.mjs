/* ==========================================================================
   البناء المسبق (Prerender)
   --------------------------------------------------------------------------
   يحوّل كل مسار في الموقع إلى ملف HTML ثابت يحتوي المحتوى كاملاً:
     dist/index.html            ← /
     dist/channels/index.html   ← /channels
     dist/nova/index.html       ← /nova   (وكذلك ultra و istar و moka)
     dist/blog/index.html       ← /blog
     dist/blog/<slug>/index.html← كل مقال
     dist/404.html              ← أي مسار غير موجود (GitHub Pages يستخدمه تلقائياً)

   الفائدة: محرك البحث والزائر يريان المحتوى مباشرة في HTML، ثم يعمل الموقع
   كتطبيق تفاعلي عادي بعد التحميل (hydration). كما يُولَّد sitemap.xml تلقائياً.
========================================================================== */

import fs from "node:fs/promises";
import path from "node:path";

const DIST = "dist";
const SSR_ENTRY = "dist-ssr/entry-server.js";

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
  out = replaceTag(
    out,
    /<meta name="description" content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${esc(seo.description)}" />`
  );
  out = replaceTag(
    out,
    /<link rel="canonical" href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${seo.canonical}" />`
  );

  const pairs = [
    ['property="og:title"', seo.title],
    ['property="og:description"', seo.description],
    ['property="og:url"', seo.canonical],
    ['property="og:type"', seo.ogType],
    ['name="twitter:title"', seo.title],
    ['name="twitter:description"', seo.description],
    ['name="twitter:url"', seo.canonical],
    ['name="robots"', seo.robots],
  ];

  for (const [attr, value] of pairs) {
    const re = new RegExp(`<meta ${attr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} content="[^"]*"\\s*\\/?>`);
    const tag = `<meta ${attr} content="${esc(value)}" />`;
    if (re.test(out)) out = replaceTag(out, re, tag);
    else out = out.replace("</head>", `    ${tag}\n  </head>`);
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

function writeRouteHtml(template, route, body) {
  const withBody = template.includes('<div id="root"></div>')
    ? template.replace('<div id="root"></div>', `<div id="root">${body}</div>`)
    : template;
  const dir = route === "/" ? DIST : path.join(DIST, route);
  return fs.mkdir(dir, { recursive: true }).then(() =>
    fs.writeFile(path.join(dir, "index.html"), withBody)
  );
}

function sitemap(routes) {
  const today = new Date().toISOString().slice(0, 10);
  const urls = routes
    .map(
      (r) => `  <url>
    <loc>${SITE_URL}/${r === "/" ? "" : r.replace(/^\//, "") + "/"}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${r === "/" ? "daily" : "weekly"}</changefreq>
    <priority>${r === "/" ? "1.0" : "0.8"}</priority>
  </url>`
    )
    .join("\n");

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

  let count = 0;
  for (const route of routes) {
    const { html, seo } = renderPage(route);
    const page = applyHead(template, seo);
    await writeRouteHtml(page, route, html);
    count++;
    console.log(`  ✓ ${route.padEnd(38)} ${seo.title.slice(0, 46)}`);
  }

  /* صفحة 404 */
  const notFound = renderPage("/__notfound__");
  const notFoundHtml = applyHead(template, { ...notFound.seo, robots: "noindex, follow" });
  await fs.writeFile(
    path.join(DIST, "404.html"),
    notFoundHtml.replace('<div id="root"></div>', `<div id="root">${notFound.html}</div>`)
  );

  /* خريطة الموقع */
  await fs.writeFile(path.join(DIST, "sitemap.xml"), sitemap(routes));

  console.log(`\n✅ تم الرسم المسبق ${count} مساراً + 404.html + sitemap.xml`);
}

main().catch((err) => {
  console.error("❌ فشل البناء المسبق:", err);
  process.exit(1);
});
