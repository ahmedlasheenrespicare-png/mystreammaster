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
    if (NOINDEX.has(rel)) {
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
    if (NOINDEX.has(rel)) continue;
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
    assert.ok(!NOINDEX.has(rel), `sitemap يشير إلى صفحة noindex: ${url}`);
  }
});
