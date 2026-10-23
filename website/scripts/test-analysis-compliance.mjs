// Additional safeguards, not replacements for the site's existing SEO/UI tests.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {load} from 'cheerio';
import {getLegacyAnalysisSeo} from '../dist-ssr/entry-server.js';
const website = new URL('../', import.meta.url);
const routes = ['match-analysis','manchester-city-psg','manchester-city-psg/watch','roma-real-madrid','roma-real-madrid/watch','manchester-united-atletico','manchester-united-atletico/watch','galatasaray-barcelona','galatasaray-barcelona/watch'];
const gaLoader = 'https://www.googletagmanager.com/gtag/js?id=G-N7VT67MW57';
const adLoader = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8373438380621206';
const normalize = text => text.replace(/\s+/g, ' ').trim();
for (const route of routes) {
  test(`analysis compliance: ${route} uses the central SEO and complete static HTML`, async () => {
    const seo = getLegacyAnalysisSeo(route);
    assert.ok(seo);
    const source = load(await fs.readFile(new URL(`legacy/${route}/index.html`, website), 'utf8'));
    const published = load(await fs.readFile(new URL(`../${route}/index.html`, website), 'utf8'));
    if (!route.startsWith('manchester-united-atletico')) {
      const canonicalSource = load(await fs.readFile(new URL(`src/pages/analysis/${route}/index.html`, website), 'utf8'));
      assert.equal(canonicalSource('title,meta[name="description"],link[rel="canonical"],head script[type="application/ld+json"]').length, 0, 'SEO must not have a second editable source');
      assert.equal(normalize(canonicalSource('main').html()), normalize(source('main').html()), 'legacy body is a derived snapshot of src/, not an independent page');
      assert.equal(canonicalSource(`script[src="${gaLoader}"]`).length, 1);
      assert.equal(canonicalSource(`script[src="${adLoader}"]`).length, 1);
    }
    for (const [label, $] of [['source', source], ['published', published]]) {
      assert.equal($('html').attr('lang'), 'ar'); assert.equal($('html').attr('dir'), 'rtl');
      assert.equal($('main h1').length, 1);
      assert.equal($('title').text(), seo.title);
      assert.equal($('meta[name="description"]').attr('content'), seo.description);
      assert.equal($('meta[name="robots"]').attr('content'), seo.robots);
      assert.equal($('link[rel="canonical"]').attr('href'), seo.canonical);
      assert.equal($('meta[property="og:image"]').attr('content'), seo.ogImage);
      assert.equal($('meta[name="twitter:image"]').attr('content'), seo.ogImage);
      for (const key of ['og:image:width','og:image:height','og:image:alt']) assert.ok($(`meta[property="${key}"]`).attr('content'));
      assert.ok($('meta[name="twitter:image:alt"]').attr('content'));
      const graph = JSON.parse($('script[type="application/ld+json"]').text())['@graph'];
      assert.deepEqual(graph, seo.jsonLd);
      assert.equal($(`script[src="${gaLoader}"]`).length, 1);
      /* صفحات watch الأربع أُخرجت من برنامج الإعلانات في النشر (محتواها 86–91
         كلمة، والإعلان على صفحة بلا محتوى مخالف لسياسة AdSense). يبقى
         المُحمِّل في المصدر فقط، ويُشترط غيابه في الملف المنشور. */
      const adsExpected = label === 'published' && route.endsWith('/watch') ? 0 : 1;
      assert.equal($(`script[src="${adLoader}"]`).length, adsExpected,
        `AdSense loader count mismatch (${label}) on ${route}`);
      assert.equal($('script').toArray().filter(e => $(e).text().includes("gtag('config', 'G-N7VT67MW57')")).length, 1);
      assert.equal($('link[href*="fonts.googleapis"],link[href*="fonts.gstatic"]').length, 0);
      assert.equal($('main iframe,main video,.ma-banner,.ma-photo-credit').length, 0);
      assert.doesNotMatch($('main').text(), /سيرفرنا|قنواتنا|شاهد عندنا|اضغط هنا/);
      assert.equal(graph.filter(node => ['Organization','WebSite'].includes(node['@type'])).length, 0);
      const crumbs = graph.find(node => node['@type'] === 'BreadcrumbList').itemListElement;
      const visible = $('main nav[aria-label="مسار التنقل"]').first().children().toArray().filter(e => $(e).attr('aria-hidden') !== 'true');
      assert.equal(visible.length, crumbs.length);
      for (let i = 0; i < visible.length; i++) {
        assert.equal(normalize($(visible[i]).text()), crumbs[i].name);
        if ($(visible[i]).is('a')) assert.equal(new URL($(visible[i]).attr('href'), seo.canonical).href, crumbs[i].item);
      }
      assert.equal(crumbs.at(-1).item, seo.canonical);
      for (const faq of graph.filter(n => n['@type'] === 'FAQPage')) for (const question of faq.mainEntity) {
        assert.ok($('main details').toArray().some(e => normalize($(e).find('summary').text()) === normalize(question.name) && normalize($(e).find('p').text()) === normalize(question.acceptedAnswer.text)));
      }
      for (const img of $('main img').toArray()) {
        assert.match($(img).attr('src'), /-badge\.webp$/);
        assert.ok(Number($(img).attr('width')) > 0 && Number($(img).attr('height')) > 0);
        assert.ok($(img).attr('alt')?.trim());
      }
    }
    const png = await fs.readFile(new URL('public' + new URL(seo.ogImage).pathname, website));
    assert.equal(png.readUInt32BE(16), 1200); assert.equal(png.readUInt32BE(20), 630);
  });
}
test('analysis sharing images are page-specific and under-fold badges are lazy', async () => {
  assert.equal(new Set(routes.map(route => getLegacyAnalysisSeo(route).ogImage)).size, routes.length);
  const $ = load(await fs.readFile(new URL('../match-analysis/index.html', website), 'utf8'));
  assert.equal($('.ma-card img[loading="lazy"]').length, 8);
  const seo = getLegacyAnalysisSeo('match-analysis');
  const webpage = seo.jsonLd.find(n => n['@type'] === 'WebPage');
  const collection = seo.jsonLd.find(n => n['@type'] === 'CollectionPage');
  assert.equal(webpage.mainEntity['@id'], collection['@id']);
  assert.ok(collection.mainEntity['@id']);
  assert.equal(collection.mainEntity.itemListElement.length, 4);
  for (const item of collection.mainEntity.itemListElement) assert.equal(item.item['@id'], item.url + '#webpage');
});
