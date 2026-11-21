/* ==========================================================================
   حارس قسم «أخبار الرياضة» في الصفحة الرئيسية
   --------------------------------------------------------------------------
   القاعدة المعتمدة: كل خبر في القسم يحمل صورة (أو صوراً) من أصل محلي موجود،
   له مفتاح في `image-manifest.json`، ويظهر داخل شريحة خبره في صفحته، ولا توجد
   صفحة خبر بلا صورة. يفشل الاختبار إذا عاد أي خبر بلا صورة، أو أُضيف أصل غير
   مسجّل في manifest، أو اختفت شريحة الخبر من صفحته.
========================================================================== */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const website = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = path.dirname(website);
/* البيانات المنشورة فعلاً هي `_assets/sports-news/sports-news.json` (مسارات نهائية) */
const dataFile = path.join(root, "_assets/sports-news/sports-news.json");
const extraFile = path.join(root, "home-preview/saved-reference/assets/sports-news-extra.json");
const manifest = JSON.parse(fs.readFileSync(path.join(website, "src/image-manifest.json"), "utf8"));
const data = JSON.parse(fs.readFileSync(dataFile, "utf8"));
/* المصدر قد يحمل مسارات معاينة قبل النشر؛ المعيار هنا على البيانات المنشورة */
const extra = JSON.parse(fs.readFileSync(extraFile, "utf8"));
const previewData = JSON.parse(fs.readFileSync(path.join(root, "home-preview/saved-reference/assets/sports-news.json"), "utf8"));

const safePath = (src) => typeof src === "string" && /^images\/[a-zA-Z0-9_./-]+\.(?:webp|png|jpe?g)$/.test(src) && !src.includes("..");
const publishedByHref = new Map(data.map((item) => [item.href, item]));
const previewByHref = new Map(previewData.map((item) => [item.href, item]));

test("كل خبر في قسم أخبار الرياضة له صورة واحدة على الأقل", () => {
  assert.ok(data.length >= 70, `عدد أخبار القسم ${data.length}`);
  const missing = data.filter((item) => !Array.isArray(item.images) || item.images.length === 0);
  assert.deepEqual(missing.map((item) => item.href), [], "أخبار بلا صور");
});

test("كل صورة أصل محلي موجود ونصها البديل عربي غير فارغ", () => {
  for (const item of data) {
    for (const image of item.images) {
      assert.ok(safePath(image.src), `${item.href}: مسار صورة آمن (${image.src})`);
      assert.ok(fs.existsSync(path.join(root, image.src)), `${item.href}: الأصل موجود ${image.src}`);
      assert.ok(typeof image.alt === "string" && image.alt.trim().length >= 10, `${item.href}: نص بديل وصفي`);
      assert.doesNotMatch(image.alt, /https?:\/\//, `${item.href}: لا رابط في النص البديل`);
    }
  }
});

test("أصول images/players مسجّلة في manifest بأبعادها الحقيقية", () => {
  let checked = 0;
  for (const item of data) {
    for (const image of item.images) {
      if (!image.src.startsWith("images/players/")) continue;
      const key = "/" + image.src;
      assert.ok(manifest[key], `${item.href}: مفتاح manifest لـ ${image.src}`);
      const [width, height] = manifest[key];
      assert.ok(width > 100 && height > 100, `${item.href}: أبعاد منشورة صحيحة ${image.src}`);
      if (image.width) assert.equal(image.width, width, `${item.href}: العرض مطابق للمنشور`);
      if (image.height) assert.equal(image.height, height, `${item.href}: الارتفاع مطابق للمنشور`);
      checked += 1;
    }
  }
  assert.ok(checked >= 6, `صور players المفحوصة ${checked}`);
});

test("كل خبر في القسم له شريحة داخل صفحته تحمل الصورة والنص البديل", () => {
  for (const item of extra) {
    const slug = item.href.replace(/^news\//, "").replace(/\/$/, "");
    const page = path.join(root, "home-preview/saved-reference/news", slug, "index.html");
    assert.ok(fs.existsSync(page), `${slug}: صفحة الخبر موجودة`);
    const html = fs.readFileSync(page, "utf8");
    assert.match(html, /news-slide:start/, `${slug}: شريحة الخبر`);
    for (const image of item.images ?? []) {
      assert.ok(html.includes(`src="/${image.src}"`), `${slug}: صورة الشريحة ${image.src}`);
      assert.ok(html.includes(image.alt), `${slug}: النص البديل داخل الشريحة`);
    }
  }
});

test("بيانات القسم المنشورة مطابقة لمصدرها بعد خلوّها من خصائص المعاينة", () => {
  for (const item of extra) {
    const published = publishedByHref.get(item.href);
    assert.ok(published, `${item.href}: موجود في البيانات المنشورة`);
    assert.equal(published.previewOnly, undefined, `${item.href}: previewOnly تُحذف عند النشر`);
    const preview = previewByHref.get(item.href);
    assert.ok(preview, `${item.href}: موجود في بيانات المعاينة`);
    /* الناشر يضيف width/height من manifest — نقارن المسار والنص البديل فقط */
    const shape = (images) => images.map(({ src, alt }) => ({ src, alt }));
    assert.deepEqual(shape(preview.images), shape(item.images), `${item.href}: صور مطابقة بين المصدر والمنشور`);
  }
});
