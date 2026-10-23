/* ==========================================================================
   تدقيق استهداف الصفحات القائمة — أداة قراءة فقط
   --------------------------------------------------------------------------
   تقرأ الشجرة *المنشورة* (بعد `npm run build`) وتُخرج لكل صفحة قابلة للفهرسة:
   الكلمة المستهدفة من keywords.mjs، وهل هي في <title>/H1/الوصف بعد التطبيع
   العربي، وعدد كلمات <main>، وعدد الأقسام/الجداول، ووجود FAQPage، والروابط
   الداخلة إليها من كل الشجرة.

   التشغيل: node scripts/audit-targeting.mjs
   المخرجات: ملخّص في الطرفية + ملف JSON في /tmp (أو AUDIT_OUT)
========================================================================== */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { KEYWORDS } from "../src/keywords.mjs";
import { normalizeArabic } from "../src/lib/xtream.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const norm = (s) => normalizeArabic(String(s || ""));

// 1) indexable routes from sitemap
const sm = fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8");
const routes = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map((m) => decodeURI(m[1].replace("https://streammasterstore.com", "")))
  .filter(Boolean);

// 2) per-page metrics
const pages = [];
for (const route of routes) {
  const dir = route.replace(/^\/|\/$/g, "");
  const file = path.join(ROOT, dir, "index.html");
  if (!fs.existsSync(file)) { pages.push({ route, missing: true }); continue; }
  const html = fs.readFileSync(file, "utf8");
  const title = (html.match(/<title>([^<]*)/) || [])[1] || "";
  const desc = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || "";
  const h1raw = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || "";
  const h1 = h1raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const body = html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<svg[\s\S]*?<\/svg>/g, " ");
  const main = (body.match(/<main[\s\S]*?<\/main>/) || [body])[0];
  const text = main.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ").trim();
  const words = text.split(" ").filter(Boolean).length;
  const h2 = (main.match(/<h2/g) || []).length;
  const tables = (main.match(/<table/g) || []).length;
  const faq = /"@type":\s*"FAQPage"/.test(html);
  const ld = [...html.matchAll(/<script[^>]*ld\+json[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join(" ");
  const types = [...new Set([...ld.matchAll(/"@type":\s*"([^"]+)"/g)].map((m) => m[1]))];
  const noindex = /<meta name="robots" content="[^"]*noindex/.test(html);
  const key = route === "/" ? "/" : route.replace(/\/$/, "");
  const kw = KEYWORDS[key] || null;
  pages.push({ route, title, desc, h1, words, h2, tables, faq, types, noindex, kw });
}

// 3) inlinks across published tree
const inc = new Map();
function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (["node_modules", ".git", "website", "admin-dashboard", "_assets", "images", "fonts"].includes(e.name)) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name === "index.html") {
      const rel = "/" + path.relative(ROOT, path.dirname(p)).replace(/\\/g, "/") + "/";
      const html = fs.readFileSync(p, "utf8");
      for (const m of html.matchAll(/href="(\/[^"#?]*)"/g)) {
        let h = m[1];
        if (!h.endsWith("/") && !/\.[a-z0-9]{2,5}$/i.test(h)) h += "/";
        if (h === rel) continue;
        inc.set(h, (inc.get(h) || 0) + 1);
      }
    }
  }
}
walk(ROOT);

const n = (x) => (x == null ? null : x);
const out = pages.filter((p) => !p.missing).map((p) => {
  const k = p.kw;
  const primary = k?.primary || null;
  return {
    route: p.route,
    primary,
    intent: k?.intent || null,
    secondaryCount: k?.secondary?.length || 0,
    inTitle: primary ? norm(p.title).includes(norm(primary)) : null,
    inH1: primary ? norm(p.h1).includes(norm(primary)) : null,
    inDesc: primary ? norm(p.desc).includes(norm(primary)) : null,
    titleLen: p.title.split("|")[0].trim().length,
    descLen: p.desc.length,
    words: p.words, h2: p.h2, tables: p.tables, faq: p.faq,
    types: p.types.join(","),
    inlinks: inc.get(p.route) || 0,
    title: p.title, h1: p.h1, desc: p.desc,
  };
});
fs.writeFileSync(process.env.AUDIT_OUT || "/tmp/targeting-audit.json", JSON.stringify(out, null, 1));
console.log("pages:", out.length);
const miss = (f) => out.filter((p) => p.primary && p[f] === false).length;
console.log("primary declared:", out.filter((p) => p.primary).length);
console.log("kw missing -> title:", miss("inTitle"), "| h1:", miss("inH1"), "| desc:", miss("inDesc"));
console.log("words<500:", out.filter((p) => p.words < 500).length, "| <300:", out.filter((p) => p.words < 300).length);
console.log("median words:", out.map((p) => p.words).sort((a, b) => a - b)[Math.floor(out.length / 2)]);
console.log("w/o FAQ:", out.filter((p) => !p.faq).length, "| w/o table:", out.filter((p) => !p.tables).length);
