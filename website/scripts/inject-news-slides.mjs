/* ==========================================================================
   شريحة الخبر داخل صفحة الخبر — حقن آلي ومتكرّر بلا تكرار
   --------------------------------------------------------------------------
   القاعدة المعتمدة: كل خبر في `featured-news.ts` يجب أن تظهر شريحته (نفس
   تذكرة الصفحة الرئيسية: شارة التصنيف، التاريخ، العنوان، الوصف، وصورة اللاعب
   المقصوصة) داخل صفحته `/news/<slug>/`.

   - المصدر الوحيد للبيانات: `src/content/featured-news.ts` (لا نسخ يدوي).
   - الصفحات ثابتة في `public/news/<slug>/index.html`؛ يُحقن القالب بين
     علامتَي `news-slide:start` و`news-slide:end` وتُستبدل عند إعادة التشغيل،
     فلا تتكرر الشرائح أبداً.
   - التنسيق في وسم `<style id="news-slide-style">` واحد داخل `<head>`.
   - التشغيل: `node scripts/inject-news-slides.mjs`
   - الاختبار الحارس: `scripts/test-news-slides.mjs` (يفشل البناء/التست إذا
     أُضيف خبر بلا شريحة داخل صفحته).
========================================================================== */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const website = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const newsDir = path.join(website, "public/news");
const START = "<!-- news-slide:start -->";
const END = "<!-- news-slide:end -->";
const STYLE_OPEN = '<style id="news-slide-style">';
const STYLE_CLOSE = "</style>";

/* --------------------------------------------------------------------------
   قراءة FEATURED_NEWS من ملف TypeScript بلا حزمة بناء: الكتلة مصفوفة كائنات
   JavaScript خالصة، فنستخرجها بين `[` و`];` مع مطابقة الأقواس خارج النصوص.
-------------------------------------------------------------------------- */
export function readFeaturedNews() {
  const source = fs.readFileSync(path.join(website, "src/content/featured-news.ts"), "utf8");
  const anchor = source.indexOf("FEATURED_NEWS: FeaturedNewsItem[] =");
  if (anchor === -1) throw new Error("FEATURED_NEWS not found in featured-news.ts");
  /* `[` بعد إشارة المساواة — لا القوسان في `FeaturedNewsItem[]` */
  const start = source.indexOf("= [", anchor) + 2;
  let depth = 0;
  let quote = null;
  let end = -1;
  for (let i = start; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (ch === "\\") i += 1;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") { quote = ch; continue; }
    if (ch === "[") depth += 1;
    else if (ch === "]") {
      depth -= 1;
      if (depth === 0) { end = i + 1; break; }
    }
  }
  if (end === -1) throw new Error("FEATURED_NEWS array is not balanced");
  const literal = source.slice(start, end);
  const items = new Function(`return ${literal};`)();
  if (!Array.isArray(items) || items.length === 0) throw new Error("FEATURED_NEWS is empty");
  return items;
}

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const slugOf = (href) => href.replace(/^news\//, "").replace(/\/$/, "");

/* --------------------------------------------------------------------------
   شريحة الخبر — نفس مفردات تذكرة الصفحة الرئيسية على خلفية داكنة
-------------------------------------------------------------------------- */
export function slideMarkup(item) {
  const images = Array.isArray(item.images) ? item.images : [];
  const badges = Array.isArray(item.teamBadges) ? item.teamBadges : [];
  const media = images
    .map((image) => `<img src="${escapeHtml("/" + image.src.replace(/^\//, ""))}" alt="${escapeHtml(image.alt)}" loading="lazy" decoding="async" />`)
    .join("");
  return `${START}
      <section class="news-slide${images.length > 1 ? " news-slide--multi" : ""}" aria-label="شريحة الخبر">
        <div class="news-slide__panel">
          <span class="news-slide__ray" aria-hidden="true"></span>
          <span class="news-slide__line news-slide__line--top" aria-hidden="true"></span>
          <span class="news-slide__line news-slide__line--bottom" aria-hidden="true"></span>
          <span class="news-slide__line news-slide__line--right" aria-hidden="true"></span>
          <span class="news-slide__ribbon" aria-hidden="true"><span>${escapeHtml(item.category)}</span></span>
          <p class="news-slide__head">
            ${badges.map((badge) => `<img src="${escapeHtml("/" + badge.replace(/^\//, ""))}" alt="" aria-hidden="true" loading="lazy" decoding="async" />`).join("")}
            <span>${escapeHtml(item.dateLabel)}</span>
          </p>
          <div class="news-slide__text">
            <p class="news-slide__title">${escapeHtml(item.title)}</p>
            <p class="news-slide__desc">${escapeHtml(item.description)}</p>
            ${item.score ? `<p class="news-slide__score"><span dir="ltr">${escapeHtml(item.score)}</span></p>` : ""}
          </div>
          ${media ? `<div class="news-slide__media">${media}</div>` : ""}
        </div>
      </section>
      ${END}`;
}

export const slideStyle = `${STYLE_OPEN}
    /* شريحة الخبر داخل صفحة الخبر — تذكرة داكنة بهوية الموقع، بلا خطوط خارجية */
    .news-slide {
      position: relative; margin: 22px 0 6px; padding: 1px; border-radius: 12px;
      background: radial-gradient(circle 230px at 0% 0%, #d8ff3e, #0b0b0f);
      box-shadow: 0 16px 34px rgba(11, 11, 15, 0.18); overflow: hidden;
    }
    .news-slide__panel {
      position: relative; display: flex; align-items: flex-end; min-height: 236px;
      padding: 20px 22px 20px; border-radius: 11px; border: 1px solid #232327;
      background: radial-gradient(circle 300px at 0% 0%, #2c2c33, #0b0b0f);
      overflow: hidden; color: #f6f4ec; line-height: 1.7;
    }
    .news-slide__ray {
      position: absolute; top: -26px; left: 32%; width: 220px; height: 46px; border-radius: 100px;
      background: radial-gradient(circle, #e8ff8a, rgba(216, 255, 62, 0.2) 60%, transparent 72%);
      filter: blur(10px); transform: rotate(40deg); opacity: 0.5; pointer-events: none;
    }
    .news-slide__line { position: absolute; pointer-events: none; }
    .news-slide__line--top, .news-slide__line--bottom {
      left: 8%; right: 8%; height: 1px;
      background: linear-gradient(90deg, transparent, rgba(246, 244, 236, 0.16), transparent);
    }
    .news-slide__line--top { top: 12%; }
    .news-slide__line--bottom { bottom: 12%; }
    .news-slide__line--right {
      top: 8%; bottom: 8%; right: 10%; width: 1px;
      background: linear-gradient(180deg, transparent, rgba(246, 244, 236, 0.16), transparent);
    }
    .news-slide__ribbon { position: absolute; top: 0; left: 0; width: 104px; height: 104px; overflow: hidden; z-index: 3; pointer-events: none; }
    .news-slide__ribbon > span {
      position: absolute; left: -24px; top: 22px; display: block; width: 152px; transform: rotate(-45deg);
      background: linear-gradient(45deg, #8a9c2a 0%, #d8ff3e 51%, #a6c532 100%);
      box-shadow: 0 5px 10px rgba(0, 0, 0, 0.23); padding: 4px 2px; text-align: center;
      font-size: 8.5px; font-weight: 800; line-height: 1.15; color: #0b0b0f;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }
    .news-slide__head {
      position: absolute; top: 14px; left: 96px; z-index: 3; margin: 0;
      display: flex; align-items: center; gap: 6px;
      font-size: 11px; font-weight: 800; color: rgba(255, 255, 255, 0.72);
    }
    .news-slide__head img { width: 18px; height: 18px; object-fit: contain; }
    /* النص في الجهة المقابلة للصورة داخل RTL: هوامش تلقائية تدفعه للطرف الآخر */
    .news-slide__text {
      position: relative; z-index: 2; display: flex; flex-direction: column; gap: 6px;
      max-width: 56%; margin-inline-start: auto;
    }
    .news-slide__title { margin: 0; font-size: 19px; font-weight: 800; line-height: 1.35; color: #f6f4ec; }
    .news-slide__desc {
      margin: 0; font-size: 12.5px; line-height: 1.65; color: rgba(246, 244, 236, 0.7);
      display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
    }
    .news-slide__score { margin: 2px 0 0; }
    .news-slide__score span {
      display: inline-block; border-radius: 999px; padding: 2px 12px;
      background: rgba(216, 255, 62, 0.14); border: 1px solid rgba(216, 255, 62, 0.35);
      font-size: 12px; font-weight: 800; color: #d8ff3e;
    }
    .news-slide__media {
      position: absolute; top: 10px; bottom: 10px; right: 10px; z-index: 1;
      width: 42%; display: flex; align-items: flex-end; justify-content: center; gap: 2px;
      pointer-events: none; isolation: isolate;
    }
    /* هالة خفيفة خلف الشخص تفصله عن اللوح الداكن بلا خلفية صلبة */
    .news-slide__media::before {
      content: ""; position: absolute; inset: 4% 2%; z-index: 0; border-radius: 50%;
      background: radial-gradient(circle at 50% 58%, rgba(216, 255, 62, 0.17), rgba(216, 255, 62, 0.05) 52%, transparent 74%);
      filter: blur(8px);
    }
    .news-slide__media img { position: relative; z-index: 1; }
    .news-slide__media img {
      flex: 0 1 auto; min-width: 0; height: 100%; width: auto; max-width: 100%; object-fit: contain;
      filter: drop-shadow(0 8px 14px rgba(0, 0, 0, 0.5));
    }
    /* أكثر من صورة: تتقاسم العرض بالتساوي بلا تراكب وبلا قصّ */
    .news-slide--multi .news-slide__media { width: 54%; }
    .news-slide--multi .news-slide__text { max-width: 38%; }
    .news-slide--multi .news-slide__title { font-size: 17px; }
    .news-slide--multi .news-slide__media img { flex: 1 1 0; width: 100%; height: 100%; }
    @media (max-width: 640px) {
      .news-slide__panel { flex-direction: column; align-items: stretch; padding: 16px; min-height: 0; }
      .news-slide__text { max-width: none; }
      .news-slide__media {
        position: relative; inset: auto; order: -1; width: 100%; height: 216px;
        margin: 4px 0 12px; gap: 6px;
      }
      .news-slide__media img { height: 216px; max-width: 100%; }
      .news-slide--multi .news-slide__media { width: 100%; height: 200px; }
      .news-slide--multi .news-slide__media img { height: 200px; flex: 1 1 0; min-width: 0; object-fit: contain; }
      .news-slide--multi .news-slide__text { max-width: none; margin-inline-start: 0; }
      .news-slide--multi .news-slide__title { font-size: 17px; }
      .news-slide__title { font-size: 17px; }
      .news-slide__head { position: static; order: -2; justify-content: flex-start; margin-bottom: 8px; padding-left: 58px; }
      .news-slide__text { margin-inline-start: 0; }
      .news-slide__line--right, .news-slide__line--bottom { display: none; }
    }
  ${STYLE_CLOSE}`;

/* --------------------------------------------------------------------------
   الحقن — استبدال الوسم والتنسيق إن وُجدا، وإلا إدراج الشريحة بعد سطر
   البيانات (`p.meta`) وقبل ملخص الخبر.
-------------------------------------------------------------------------- */
export function injectSlide(html, item) {
  let out = html;

  const markerStart = out.indexOf(START);
  if (markerStart !== -1) {
    const markerEnd = out.indexOf(END, markerStart);
    if (markerEnd === -1) throw new Error("news-slide:start without end");
    out = out.slice(0, markerStart) + slideMarkup(item) + out.slice(markerEnd + END.length);
  } else {
    const meta = /<p class="meta">[\s\S]*?<\/p>\s*/.exec(out);
    const h1 = /<\/h1>\s*/.exec(out);
    const insertAt = meta ? meta.index + meta[0].length : h1 ? h1.index + h1[0].length : -1;
    if (insertAt === -1) throw new Error("no insertion anchor (p.meta / h1)");
    out = out.slice(0, insertAt) + slideMarkup(item) + "\n    " + out.slice(insertAt);
  }

  const styleStart = out.indexOf(STYLE_OPEN);
  if (styleStart !== -1) {
    const styleEnd = out.indexOf(STYLE_CLOSE, styleStart);
    out = out.slice(0, styleStart) + slideStyle + out.slice(styleEnd + STYLE_CLOSE.length);
  } else {
    out = out.replace("</head>", `  ${slideStyle}\n</head>`);
  }
  return out;
}

export function main() {
  const items = readFeaturedNews();
  let updated = 0;
  const missing = [];
  for (const item of items) {
    const slug = slugOf(item.href);
    const file = path.join(newsDir, slug, "index.html");
    if (!fs.existsSync(file)) { missing.push(slug); continue; }
    const before = fs.readFileSync(file, "utf8");
    const after = injectSlide(before, item);
    if (after !== before) {
      fs.writeFileSync(file, after);
      updated += 1;
    }
  }
  console.log(`news slides: ${items.length} entries, ${updated} page(s) updated, ${missing.length} missing page(s)`);
  if (missing.length) console.log(`  missing: ${missing.join(", ")}`);
  return { total: items.length, updated, missing };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
