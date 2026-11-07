/* ==========================================================================
   حارس شريحة الخبر — القاعدة المعتمدة بعد كل طلب/دمج
   --------------------------------------------------------------------------
   كل خبر في `featured-news.ts` يجب أن تظهر شريحته داخل صفحته `/news/<slug>/`:
   شارة التصنيف، التاريخ، العنوان، الوصف، وصورته (أو صوره) مع نصها البديل.
   الاختبار يفشل إذا أُضيف خبر بلا شريحة، أو شريحة بعنوان/صورة قديمة، أو وسم
   تنسيق مفقود، أو تكرّرت الشريحة في الصفحة.
========================================================================== */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFeaturedNews, slugOf } from "./inject-news-slides.mjs";

const website = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const newsDir = path.join(website, "public/news");
const START = "<!-- news-slide:start -->";
const END = "<!-- news-slide:end -->";

const pageFor = (slug) => fs.readFileSync(path.join(newsDir, slug, "index.html"), "utf8");
const escapeHtml = (value) =>
  String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const items = readFeaturedNews();

test("كل خبر مميز له صفحة وشريحة واحدة فقط داخل الصفحة", () => {
  assert.ok(items.length >= 56, `عدد الأخبار المميزة ${items.length}`);
  for (const item of items) {
    const slug = slugOf(item.href);
    const file = path.join(newsDir, slug, "index.html");
    assert.ok(fs.existsSync(file), `${slug}: صفحة الخبر موجودة`);
    const html = pageFor(slug);
    assert.equal(html.split(START).length - 1, 1, `${slug}: وسم بداية واحد`);
    assert.equal(html.split(END).length - 1, 1, `${slug}: وسم نهاية واحد`);
  }
});

test("نص الشريحة مطابق لمصدر الأخبار: التصنيف والتاريخ والعنوان والوصف", () => {
  for (const item of items) {
    const slug = slugOf(item.href);
    const start = pageFor(slug).indexOf(START);
    const end = pageFor(slug).indexOf(END);
    const block = pageFor(slug).slice(start, end);
    assert.match(block, /class="news-slide[ "]/ , `${slug}: الشريحة موجودة`);
    assert.ok(block.includes(escapeHtml(item.category)), `${slug}: التصنيف`);
    assert.ok(block.includes(escapeHtml(item.dateLabel)), `${slug}: التاريخ`);
    assert.ok(block.includes(escapeHtml(item.title)), `${slug}: العنوان`);
    assert.ok(block.includes(escapeHtml(item.description)), `${slug}: الوصف`);
    if (item.score) assert.ok(block.includes(escapeHtml(item.score)), `${slug}: النتيجة`);
  }
});

test("صور الشريحة هي صور الخبر نفسها بنصوصها البديلة وبلا أصل خارجي", () => {
  for (const item of items) {
    const slug = slugOf(item.href);
    const html = pageFor(slug);
    const block = html.slice(html.indexOf(START), html.indexOf(END));
    assert.doesNotMatch(block, /https?:\/\//, `${slug}: لا أصل خارجي داخل الشريحة`);
    assert.doesNotMatch(block, /<script/i, `${slug}: لا سكربت داخل الشريحة`);
    for (const image of item.images ?? []) {
      const src = "/" + image.src.replace(/^\//, "");
      assert.ok(block.includes(`src="${escapeHtml(src)}"`), `${slug}: صورة ${src}`);
      assert.ok(block.includes(`alt="${escapeHtml(image.alt)}"`), `${slug}: نص بديل ${src}`);
    }
    for (const badge of item.teamBadges ?? []) {
      assert.ok(block.includes(`src="${escapeHtml("/" + badge.replace(/^\//, ""))}"`), `${slug}: شعار ${badge}`);
    }
  }
});

test("وسم تنسيق الشريحة واحد في كل صفحة، والشريحة تسبق متن الخبر", () => {
  const pages = fs.readdirSync(newsDir, { withFileTypes: true }).filter((entry) => entry.isDirectory());
  assert.ok(pages.length >= 56, `عدد صفحات الأخبار ${pages.length}`);
  for (const page of pages) {
    const html = pageFor(page.name);
    assert.equal(html.split('<style id="news-slide-style">').length - 1, 1, `${page.name}: وسم تنسيق واحد`);
    assert.ok(html.includes(".news-slide__media"), `${page.name}: تنسيق الصورة`);
    assert.ok(html.indexOf(START) > html.indexOf("<h1>"), `${page.name}: الشريحة بعد العنوان الرئيسي`);
    assert.ok(html.indexOf(START) < html.indexOf("</main>"), `${page.name}: الشريحة داخل المتن`);
  }
});

test("الشرائح متوافقة مع الجوال وبلا حركة إجبارية", () => {
  const html = pageFor(slugOf(items[0].href));
  const style = html.slice(html.indexOf('<style id="news-slide-style">'), html.indexOf("</style>", html.indexOf('<style id="news-slide-style">')));
  assert.match(style, /@media \(max-width: 640px\)/, "نقطة كسر الجوال");
  assert.doesNotMatch(style, /animation|@keyframes/, "لا حركة إجبارية");
  assert.match(style, /object-fit: contain/, "الصورة كاملة بلا قصّ");
});
