/* ==========================================================================
   فحص SEO الشامل لكل الصفحات المنشورة (جذر المستودع)
   --------------------------------------------------------------------------
   يفرض قائمة الفحص التالية على كل صفحة قابلة للفهرسة:
     • <title> فريد (≤80 حرفاً) + meta description فريد (70–175 حرفاً)
     • canonical مطلق يطابق مسار الصفحة + robots = index, follow صراحة
     • og:* وtwitter:* كاملة + og:image:alt وأبعاد الصورة معلنة
     • lang="ar" dir="rtl" (أو lang="en" dir="ltr" لصفحات /en الإنجليزية) + h1 واحد فقط
     • JSON-LD صالح: WebPage كامل الحقول + BreadcrumbList مطابق لمسار
       التنقّل الظاهر، وOrganization/WebSite في الرئيسية فقط
     • FAQPage لا يحمل إلا أسئلة ظاهرة فعلاً، وProduct لا يعرض إلا
       أسعاراً ظاهرة فعلاً (القاعدة الذهبية: لا بيانات لا يراها المستخدم)
     • كل مسار قابل للفهرسة موجود في sitemap (مع lastmod/priority)،
       وغير محظور في robots.txt، ومربوط من صفحة أخرى (لا صفحات يتيمة)
   الصفحات المستثناة صفحات وظيفية noindex بطبيعتها (404، البحث، السلة،
   مشغّل الويب الذكي المحظور في robots.txt، وصفحة عدم الاتصال).
========================================================================== */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const website = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.dirname(website);
const SITE = 'https://streammasterstore.com';

const NOINDEX = new Set([
  '404.html',
  'offline.html',
  'live-free.html',
  'player.html',
  'search/index.html',
  'cart/index.html',
]);
/* صفحات تفاصيل المباريات الفردية داخل أي بطولة — noindex مقصود */
const isMatchDetailPage = (rel) => {
  // matches/{competition}/{match-slug}/index.html  (3+ segments after matches/)
  const parts = rel.replace(/\/index\.html$/, '').split('/');
  return parts[0] === 'matches' && parts.length >= 3;
};
const SKIP_DIRS = new Set(['.git', 'node_modules', 'website', 'admin-dashboard', 'dist', 'dist-ssr']);

async function htmlFiles(dir, out = []) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await htmlFiles(full, out);
    else if (entry.name.endsWith('.html')) out.push(path.relative(root, full).split(path.sep).join('/'));
  }
  return out;
}

const routeOf = (rel) =>
  rel === 'index.html' ? '/' : rel.endsWith('/index.html') ? `/${rel.slice(0, -'index.html'.length)}` : `/${rel}`;
const urlOf = (rel) => SITE + routeOf(rel);

function meta(html, attr, key) {
  const a = new RegExp(`<meta[^>]+${attr}=["']${key.replace(/[:]/g, '\\:')}["'][^>]*content=["']([^"']*)["']`, 'i');
  const b = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*${attr}=["']${key.replace(/[:]/g, '\\:')}["']`, 'i');
  return (html.match(a) || html.match(b) || [])[1]?.trim() ?? null;
}

function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');
}

function ldNodes(html, rel) {
  const nodes = [];
  for (const m of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    let data;
    try {
      data = JSON.parse(m[1].trim());
    } catch (e) {
      throw new Error(`${rel}: JSON-LD غير صالح (${e.message})`);
    }
    const items = Array.isArray(data) ? data : Array.isArray(data['@graph']) ? data['@graph'] : [data];
    nodes.push(...items.filter((n) => n && typeof n === 'object'));
  }
  return nodes;
}

const typesOf = (n) => (Array.isArray(n['@type']) ? n['@type'] : [n['@type']]);

let pagesPromise;
function loadPages() {
  pagesPromise ??= (async () => {
    const files = (await htmlFiles(root)).sort();
    const pages = new Map();
    for (const rel of files) {
      pages.set(rel, await fs.readFile(path.join(root, rel), 'utf8'));
    }
    return pages;
  })();
  return pagesPromise;
}

const sitemapUrls = async (file) => {
  const xml = await fs.readFile(path.join(root, file), 'utf8');
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => decodeURIComponent(m[1]));
};

test('بيانات <head> كاملة وفريدة لكل صفحة قابلة للفهرسة', async () => {
  const pages = await loadPages();
  const titles = new Map();
  const descriptions = new Map();
  for (const [rel, html] of pages) {
    if (NOINDEX.has(rel) || isMatchDetailPage(rel)) {
      assert.match(meta(html, 'name', 'robots') || '', /noindex/i, `${rel}: صفحة وظيفية يجب أن تكون noindex`);
      continue;
    }
    const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]?.replace(/\s+/g, ' ').trim();
    assert.ok(title, `${rel}: بلا <title>`);
    assert.ok(title.length <= 80, `${rel}: العنوان طويل (${title.length}): ${title}`);
    assert.ok(!titles.has(title), `${rel}: عنوان مكرر مع ${titles.get(title)}`);
    titles.set(title, rel);

    const desc = meta(html, 'name', 'description');
    assert.ok(desc, `${rel}: بلا meta description`);
    assert.ok(desc.length >= 70 && desc.length <= 175, `${rel}: وصف بطول ${desc.length}`);
    assert.ok(!descriptions.has(desc), `${rel}: وصف مكرر مع ${descriptions.get(desc)}`);
    descriptions.set(desc, rel);

    const canonical = (html.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i) ||
      html.match(/<link[^>]+href=["']([^"']+)["'][^>]*rel=["']canonical["']/i) || [])[1];
    assert.equal(canonical && decodeURIComponent(canonical), urlOf(rel), `${rel}: canonical لا يطابق المسار`);

    assert.match(meta(html, 'name', 'robots') || '', /^index, follow/, `${rel}: robots ليست index, follow صراحة`);
    /* الصفحات الإنجليزية /en: lang="en" dir="ltr" — استثناء صريح باعتماد المالك */
    const isEnglish = rel.startsWith("en/");
    assert.match(html, isEnglish ? /<html[^>]+lang="en"/ : /<html[^>]+lang="ar"/, `${rel}: lang غير مطابقة للغة الصفحة`);
    assert.match(html, isEnglish ? /<html[^>]+dir="ltr"/ : /<html[^>]+dir="rtl"/, `${rel}: dir غير مطابقة للغة الصفحة`);

    for (const [attr, key] of [
      ['property', 'og:title'], ['property', 'og:description'], ['property', 'og:url'],
      ['property', 'og:image'], ['property', 'og:image:width'], ['property', 'og:image:height'],
      ['property', 'og:image:alt'],
      ['name', 'twitter:card'], ['name', 'twitter:title'], ['name', 'twitter:description'],
      ['name', 'twitter:image'], ['name', 'twitter:image:alt'],
    ]) {
      assert.ok(meta(html, attr, key), `${rel}: ينقصه ${key}`);
    }

    const h1s = [...html.matchAll(/<h1\b/gi)].length;
    assert.equal(h1s, 1, `${rel}: عدد h1 هو ${h1s}`);
  }
});

test('JSON-LD: WebPage كامل + Breadcrumb مطابق للظاهر + المنظمة في الرئيسية فقط', async () => {
  const pages = await loadPages();
  for (const [rel, html] of pages) {
    if (NOINDEX.has(rel)) continue;
    const nodes = ldNodes(html, rel);
    const types = nodes.flatMap(typesOf);
    const isHome = rel === 'index.html';

    assert.equal(types.filter((t) => t === 'Organization').length, isHome ? 1 : 0,
      `${rel}: Organization يجب أن يظهر في الرئيسية فقط`);
    assert.equal(types.filter((t) => t === 'WebSite').length, isHome ? 1 : 0,
      `${rel}: WebSite يجب أن يظهر في الرئيسية فقط`);

    const webPage = nodes.find((n) => typesOf(n).includes('WebPage'));
    assert.ok(webPage, `${rel}: بلا كيان WebPage`);
    for (const field of ['@id', 'url', 'name', 'description', 'inLanguage', 'datePublished', 'dateModified', 'primaryImageOfPage']) {
      assert.ok(webPage[field], `${rel}: WebPage ينقصه ${field}`);
    }
    assert.match(String(webPage.datePublished), /^\d{4}-\d{2}-\d{2}/, `${rel}: datePublished`);
    assert.match(String(webPage.dateModified), /^\d{4}-\d{2}-\d{2}/, `${rel}: dateModified`);

    if (!isHome) {
      const crumb = nodes.find((n) => typesOf(n).includes('BreadcrumbList'));
      assert.ok(crumb, `${rel}: بلا BreadcrumbList`);
      assert.ok(webPage.breadcrumb, `${rel}: WebPage لا يشير إلى breadcrumb`);
      const items = [...crumb.itemListElement].sort((a, b) => a.position - b.position);
      assert.equal(decodeURIComponent(items.at(-1).item), urlOf(rel), `${rel}: آخر عنصر في المسار لا يطابق الصفحة`);
      const nav = html.match(/<nav[^>]+aria-label=["'][^"']*(?:مسار|Breadcrumb)[^"']*["'][^>]*>([\s\S]*?)<\/nav>/i);
      assert.ok(nav, `${rel}: لا يوجد مسار تنقّل ظاهر يطابق BreadcrumbList`);
      const navText = visibleText(nav[1]);
      for (const item of items) {
        assert.ok(navText.includes(item.name), `${rel}: عنصر المسار «${item.name}» غير ظاهر في التنقّل`);
      }
    }

    /* القاعدة الذهبية: أي سؤال في FAQPage يجب أن يظهر نصّه في الصفحة */
    const text = visibleText(html);
    for (const node of nodes.filter((n) => typesOf(n).includes('FAQPage'))) {
      for (const q of node.mainEntity || []) {
        assert.ok(text.includes(q.name), `${rel}: سؤال FAQPage غير ظاهر: ${q.name}`);
      }
    }
    /* وأي منتج بأسعار يجب أن يعرض سعراً ظاهراً فعلاً */
    for (const node of nodes.filter((n) => typesOf(n).includes('Product'))) {
      if (node.offers) assert.match(text, /(\d+([.,]\d+)?\s*(ر\.س|\$|دولار|ج\.م|د\.إ)|\$\s*\d+([.,]\d+)?)/, `${rel}: Product بلا سعر ظاهر`);
    }
  }
});

test('الاكتشاف: sitemap كامل بـ lastmod/priority، ولا يتيم، ولا محظور في robots', async () => {
  const pages = await loadPages();
  const inSitemap = new Set([...(await sitemapUrls('sitemap.xml')), ...(await sitemapUrls('sitemap-0.xml'))]);
  for (const file of ['sitemap.xml', 'sitemap-0.xml']) {
    const xml = await fs.readFile(path.join(root, file), 'utf8');
    for (const block of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
      assert.match(block[1], /<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/, `${file}: رابط بلا lastmod: ${block[1].slice(0, 90)}`);
      assert.match(block[1], /<priority>[\d.]+<\/priority>/, `${file}: رابط بلا priority`);
    }
  }

  const robots = await fs.readFile(path.join(root, 'robots.txt'), 'utf8');
  const starBlock = robots.split(/User-agent:/i).find((b) => b.trim().startsWith('*')) || '';
  const disallowed = [...starBlock.matchAll(/^Disallow:\s*(\S+)/gim)].map((m) => m[1]);

  const allHrefs = new Set();
  for (const html of pages.values()) {
    for (const m of html.matchAll(/href=["']([^"']+)["']/gi)) {
      try { allHrefs.add(decodeURIComponent(new URL(m[1], SITE).pathname)); } catch { /* رابط خارجي/خاص */ }
    }
  }

  for (const rel of pages.keys()) {
    if (NOINDEX.has(rel) || isMatchDetailPage(rel)) continue;
    const url = urlOf(rel);
    assert.ok(inSitemap.has(url), `${rel}: غير موجود في أي sitemap`);
    const route = routeOf(rel);
    assert.ok(!disallowed.some((d) => d !== '/' && route.startsWith(d)), `${rel}: محظور في robots.txt (${route})`);
    if (rel !== 'index.html') {
      assert.ok(allHrefs.has(route), `${rel}: صفحة يتيمة — لا رابط داخلي إليها (${route})`);
    }
  }
  for (const url of inSitemap) {
    const route = decodeURIComponent(new URL(url).pathname);
    const rel = route === '/' ? 'index.html' : route.endsWith('/') ? `${route.slice(1)}index.html` : route.slice(1);
    assert.ok(pages.has(rel), `sitemap يشير إلى صفحة غير موجودة: ${url}`);
    assert.ok(!NOINDEX.has(rel) && !isMatchDetailPage(rel), `sitemap يشير إلى صفحة noindex: ${url}`);
  }
});

/* حراسة التكرار بين الخريطتين — الخطأ الذي وقع فعلاً (أكتوبر 2026):
   مقال صار صفحة React فدخل الخريطة المولَّدة، وبقي سطره القديم في
   sitemap-0.xml، فأعلن الموقع 84 رابطاً مقابل 83 صفحة قابلة للفهرسة.
   القاعدة: sitemap-0.xml للمسارات القديمة اليدوية فقط، وما يولّده البناء
   لا يُكرَّر يدوياً. */
test('الخريطتان لا تتنازعان رابطاً واحداً (لا تكرار بين المولَّد واليدوي)', async () => {
  const generated = new Set(await sitemapUrls('sitemap.xml'));
  const manual = await sitemapUrls('sitemap-0.xml');
  const duplicates = manual.filter((url) => generated.has(url));
  assert.deepEqual(duplicates, [], `رابط مكرر في sitemap.xml وsitemap-0.xml: ${duplicates.join(' · ')}`);
});

/* ==========================================================================
   حراسة صفحات الأخبار — الخطأ الذي وقع فعلاً (٢٥ أكتوبر ٢٠٢٦):
   أُضيف الخبر الخامس news/inter-fiorentina-2-1 إلى website/public/news/
   وارتبط من كاروسيل الرئيسية، لكن سطره اليدوي لم يُضَف إلى sitemap-0.xml،
   فبقي صفحة قابلة للفهرسة خارج كل خريطة — ومصدر اكتشافه الوحيد كاروسيل
   دائري يتبدّل، أي خطر يتيم حقيقي.
   السبب أن loadPages() يفحص جذر المستودع فقط، وجذر news/ مخرج بناء لا
   مصدر: في CI تُشغَّل الاختبارات قبل `npm run build`، فالصفحة لم تكن
   موجودة في الجذر أصلاً ولم يفحصها أي شيء.
   لذلك تُقرأ هنا **بذرة** الصفحات (website/public/news) لا مخرجها.
   الاتجاهان محروسان: كل صفحة بذرة في خريطة، وكل سطر خبر في الخريطة له بذرة.
   ========================================================================== */
async function newsSources() {
  const dir = path.join(website, 'public', 'news');
  const out = new Map();
  let entries = [];
  try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return out; }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const file = path.join(dir, entry.name, 'index.html');
    try { out.set(entry.name, await fs.readFile(file, 'utf8')); } catch { /* مجلد بلا صفحة */ }
  }
  return out;
}

test('صفحات الأخبار: كل بذرة مُعلنة في خريطة، ومؤهّلة للفهرسة، ولها صورة مشاركة على القرص', async () => {
  const sources = await newsSources();
  assert.ok(sources.size > 0, 'لا صفحات أخبار في website/public/news');

  /* الخريطة اليدوية تُقرأ من **مصدرها** (website/public) لا من نسختها في الجذر:
     الجذر مخرج بناء، وأي سطر يُضاف هناك فقط يُمحى عند أول بناء. */
  const manualSource = path.join(website, 'public', 'sitemap-0.xml');
  const manualXml = await fs.readFile(manualSource, 'utf8');
  const manual = [...manualXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => decodeURIComponent(m[1]));
  const generated = new Set(await sitemapUrls('sitemap.xml'));
  const inSitemap = new Set([...generated, ...manual]);

  for (const [slug, html] of sources) {
    const url = `${SITE}/news/${slug}/`;
    const rel = `news/${slug}/index.html`;

    /* ١) الاكتشاف — الصفحة في خريطة واحدة على الأقل */
    assert.ok(inSitemap.has(url), `${rel}: غير معلنة في أي sitemap — صفحة قابلة للفهرسة بلا خريطة`);

    /* ٢) canonical مطلق يطابق مسارها، وrobots تسمح بالفهرسة صراحةً */
    const canonical = (html.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i) || [])[1];
    assert.equal(canonical && decodeURIComponent(canonical), url, `${rel}: canonical لا يطابق المسار`);
    assert.match(meta(html, 'name', 'robots') || '', /^index, follow/, `${rel}: robots ليست index, follow صراحة`);

    /* ٣) عنوان ووصف فريدان بالطول المطلوب — بلا عنوان لا نتيجة بحث أصلاً */
    const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]?.replace(/\s+/g, ' ').trim();
    assert.ok(title, `${rel}: بلا <title>`);
    assert.ok(title.length <= 80, `${rel}: العنوان طويل (${title.length})`);
    const desc = meta(html, 'name', 'description');
    assert.ok(desc && desc.length >= 70 && desc.length <= 175, `${rel}: وصف بطول ${desc?.length}`);

    /* ٤) صورة المشاركة: بطاقة كبيرة + الأبعاد معلنة + الملف موجود فعلاً */
    assert.equal(meta(html, 'name', 'twitter:card'), 'summary_large_image', `${rel}: twitter:card ليست summary_large_image`);
    for (const key of ['og:image', 'og:image:width', 'og:image:height', 'og:image:alt', 'twitter:image', 'twitter:image:alt']) {
      assert.ok(meta(html, 'property', key) || meta(html, 'name', key), `${rel}: ينقصه ${key}`);
    }
    const image = meta(html, 'property', 'og:image');
    const imagePath = decodeURIComponent(new URL(image).pathname).replace(/^\//, '');
    /* المصدر هو website/public: صورة موجودة في الجذر وحده تنجو اليوم لأنها
       مُلتزمة هناك، لكن أول بناء ينظّف المخرج يُفقدها. لذلك يُشترط المصدر. */
    const inSource = await fs.access(path.join(website, 'public', imagePath)).then(() => true, () => false);
    assert.ok(inSource, `${rel}: og:image غير موجود في المصدر website/public (${imagePath})`);
    const inBuild = await fs.access(path.join(root, imagePath)).then(() => true, () => false);
    assert.ok(inBuild, `${rel}: og:image غير موجود في المخرج المنشور (${imagePath}) — أعد البناء`);

    /* ٥) h1 واحد، وبيانات منظّمة أخبارية كاملة */
    assert.equal([...html.matchAll(/<h1\b/gi)].length, 1, `${rel}: عدد h1 ليس ١`);
    const nodes = ldNodes(html, rel);
    const types = nodes.flatMap(typesOf);
    for (const required of ['NewsArticle', 'WebPage', 'BreadcrumbList']) {
      assert.ok(types.includes(required), `${rel}: بلا كيان ${required}`);
    }
    const article = nodes.find((n) => typesOf(n).includes('NewsArticle'));
    /* author وpublisher من خصائص Article المطلوبة لدى Google — بلا أحدهما
       لا يظهر الخبر كنتيجة مقال غنية حتى لو فُهرس. */
    for (const field of ['headline', 'description', 'datePublished', 'dateModified', 'image', 'author', 'publisher']) {
      assert.ok(article[field], `${rel}: NewsArticle ينقصه ${field}`);
    }
  }

  /* انحراف النسختين يخفي سطراً أُضيف في مكان لم يُبنَ بعد — يُفحص صراحةً.
     بعد فحص الصفحات حتى تظهر الرسالة الأخصّ أولاً. */
  const published = await fs.readFile(path.join(root, 'sitemap-0.xml'), 'utf8');
  assert.equal(published.trim(), manualXml.trim(),
    'نسخة sitemap-0.xml في الجذر لا تطابق مصدرها في website/public — أعد البناء');

  /* الاتجاه المعاكس: لا سطر خبر في الخريطة بلا بذرة تقابله */
  const declared = [...manual, ...generated].filter((u) => /\/news\/[^/]+\/$/.test(u));
  for (const url of declared) {
    const slug = decodeURIComponent(new URL(url).pathname).replace(/^\/news\/|\/$/g, '');
    assert.ok(sources.has(slug), `sitemap يشير إلى خبر بلا صفحة مصدر: ${url}`);
  }
});

/* ── صور الصفحات المفهرسة: لا صورة مكسورة، ولا صورة بلا أبعاد، ولا صورة
   ثقيلة بلا نسخة حديثة ─────────────────────────────────────────────────
   هذا الحارس يحمي مكسبين: (١) نقل الصور من PNG ثقيل إلى WebP/AVIF خفّض
   نقل صور الرئيسية من ١٩ ميغابايت إلى أقل من ٣، و(٢) إعلان width/height
   منع انزياح التخطيط (CLS). أي صورة جديدة بلا نسخة حديثة أو بلا أبعاد
   تُسقط هذا الفحص قبل أن تصل إلى الإنتاج. */
test('صور الصفحات المفهرسة: موجودة، بأبعاد معلنة، ولها نسخة حديثة', async () => {
  const files = await htmlFiles(root);
  const missing = [];
  const noDims = [];
  const noVariant = [];
  let checked = 0;

  for (const rel of files) {
    if (NOINDEX.has(rel) || isMatchDetailPage(rel)) continue;
    const html = await fs.readFile(path.join(root, rel), 'utf8');

    for (const tag of html.match(/<img\b[^>]*>/gi) || []) {
      const src = (tag.match(/\ssrc=["']([^"']+)["']/i) || [])[1];
      if (!src || /^(https?:|data:|\/\/)/i.test(src)) continue;
      const urlPath = src.startsWith('/') ? src : `/${src}`;
      if (!/\.(png|jpe?g|webp|avif)$/i.test(urlPath.split('?')[0])) continue;
      checked++;

      const rel0 = decodeURIComponent(urlPath.split('?')[0]).replace(/^\//, '');
      const exists = await fs.access(path.join(root, rel0)).then(() => true, () => false);
      const existsInSource = await fs.access(path.join(website, 'public', rel0)).then(() => true, () => false);
      if (!exists && !existsInSource) { missing.push(`${rel}: ${src}`); continue; }

      if (!/\swidth=["']([^"']+)["']/i.test(tag) || !/\sheight=["']([^"']+)["']/i.test(tag)) {
        noDims.push(`${rel}: ${src}`);
      }

      /* الصور داخل <picture> تختار الصيغة بنفسها عبر <source> */
      if (new RegExp(src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\S]{0,400}<\\/picture>').test(html)) continue;
      if (/\.(png|jpe?g)$/i.test(urlPath)) {
        const stem = urlPath.replace(/\.(png|jpe?g)$/i, '');
        const variant = await Promise.all(['.webp', '.avif'].map((ext) =>
          fs.access(path.join(website, 'public', decodeURIComponent(stem + ext).replace(/^\//, ''))).then(() => true, () => false)));
        if (!variant.some(Boolean)) noVariant.push(`${rel}: ${src}`);
      }
    }
  }

  assert.ok(checked > 500, `عدد الصور المفحوصة صغير بشكل مريب (${checked})`);
  assert.deepEqual(missing.slice(0, 8), [], `صور بإشارة إلى ملف غير موجود (${missing.length})`);
  assert.deepEqual(noDims.slice(0, 8), [], `صور بلا width/height (${noDims.length})`);
  assert.deepEqual(noVariant.slice(0, 8), [], `صور raster بلا نسخة WebP/AVIF (${noVariant.length})`);
});

/* ── hreflang: لا تكديس أكواد دول على نفس الرابط ─────────────────────────
   قالب قديم أعلن تسع وسوم (ar, ar-SA, ar-AE, … x-default) كلها تشير إلى
   نفس الصفحة، وهو تعارض يدفع Google إلى تجاهل الوسوم كلها. */
test('hreflang بلا تكديس أكواد دول على الرابط نفسه', async () => {
  const files = await htmlFiles(root);
  const offenders = [];

  for (const rel of files) {
    const html = await fs.readFile(path.join(root, rel), 'utf8');
    const tags = [...html.matchAll(/<link[^>]+hreflang=["']([^"']+)["'][^>]*>/gi)].map((m) => ({
      lang: m[1].toLowerCase(),
      href: (m[0].match(/href=["']([^"']+)["']/i) || [])[1] || '',
    }));
    if (tags.length <= 3) continue;

    const byHref = new Map();
    for (const tag of tags) byHref.set(tag.href, (byHref.get(tag.href) || 0) + 1);
    for (const [href, count] of byHref) {
      if (count > 3) offenders.push(`${rel}: ${count} وسوم لنفس الرابط ${href}`);
    }
  }

  assert.deepEqual(offenders.slice(0, 8), [], `hreflang مكدّس (${offenders.length} صفحة)`);
});

/* ── sitemap المولّد: lastmod تاريخي لا «اليوم» ──────────────────────────
   كتابة تاريخ البناء في كل تشغيل تعلّم محركات البحث تجاهل الوسم. الفحص:
   لا lastmod في المستقبل، والوسم إمّا غائب (بناء بلا تاريخ git) أو صادق. */
test('sitemap.xml: lastmod ليس تاريخ بناء متجدداً', async () => {
  const xml = await fs.readFile(path.join(root, 'sitemap.xml'), 'utf8');
  const urlBlocks = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => m[1]);
  assert.ok(urlBlocks.length > 50, `عدد مسارات الخريطة المولّدة صغير (${urlBlocks.length})`);

  const today = new Date().toISOString().slice(0, 10);
  const future = [];
  for (const block of urlBlocks) {
    const lastmod = (block.match(/<lastmod>([^<]+)<\/lastmod>/) || [])[1];
    if (lastmod && lastmod > today) future.push(`${block.match(/<loc>([^<]+)<\/loc>/)[1]} → ${lastmod}`);
  }
  assert.deepEqual(future, [], 'lastmod في المستقبل — خطأ في حساب التاريخ');
});
