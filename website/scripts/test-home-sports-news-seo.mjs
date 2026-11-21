import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { load } from 'cheerio';

const root = new URL('../../', import.meta.url);
const read = file => fs.readFile(new URL(file, root), 'utf8');

test('news pages have indexable canonical URLs, matching breadcrumbs, and sitemap entries', async () => {
  const data = JSON.parse(await read('home-preview/saved-reference/assets/sports-news-extra.json'));
  const sitemap = load(await read('sitemap-sports-news.xml'), { xmlMode: true });
  const urls = sitemap('url > loc').toArray().map(el => sitemap(el).text());
  assert.equal(urls.length, data.length);
  assert.equal(new Set(urls).size, data.length);
  assert.ok((await read('sitemap-index.xml')).includes('https://streammasterstore.com/sitemap-sports-news.xml'));
  for (const item of data) {
    const url = `https://streammasterstore.com/${item.href}`;
    const doc = load(await read(`${item.href}index.html`));
    assert.equal(doc('meta[name="robots"]').attr('content'), 'index, follow');
    assert.equal(doc('link[rel="canonical"]').attr('href'), url);
    assert.equal(doc('meta[name="description"]').attr('content'), item.description);
    assert.equal(doc('nav[aria-label="مسار التصفح"] a').first().attr('href'), '/');
    assert.equal(doc('nav[aria-label="مسار التصفح"] a').last().attr('href'), '/#sports-news');
    assert.equal(doc('nav [aria-current="page"]').text(), item.title);
    const graph = JSON.parse(doc('script[type="application/ld+json"]').text())['@graph'];
    const crumbs = graph.find(entry => entry['@type'] === 'BreadcrumbList').itemListElement;
    assert.deepEqual(crumbs.map(x => x.name), ['الرئيسية', 'أخبار الرياضة', item.title]);
    assert.deepEqual(crumbs.map(x => x.item), ['https://streammasterstore.com/', 'https://streammasterstore.com/#sports-news', url]);
    assert.ok(urls.includes(url));
    const preview = load(await read(`home-preview/saved-reference/${item.href}index.html`));
    assert.match(preview('meta[name="robots"]').attr('content'), /noindex/);
  }
});
