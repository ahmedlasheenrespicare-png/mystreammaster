import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { load } from 'cheerio';
import { APPROVED_HOME_SNAPSHOT } from './approved-home-snapshot.mjs';

const root = new URL('../../', import.meta.url);
const read = path => fs.readFile(new URL(path, root), 'utf8');

test('built home pages use the approved isolated snapshot and retain production SEO', async () => {
  const urls = [
    ['index.html', 'ar', 'https://streammasterstore.com/', '/en/'],
    ['en/index.html', 'en', 'https://streammasterstore.com/en/', '/'],
  ];
  for (const [file, lang, canonical, other] of urls) {
    const html = await read(file), doc = load(html);
    assert.equal(doc('html').attr('lang'), lang);
    assert.match(doc('meta[name="robots"]').attr('content'), /^index, follow/);
    assert.equal(doc('link[rel="canonical"]').attr('href'), canonical);
    assert.equal(doc('#sm-language').attr('href'), other);
    assert.equal(doc('h1').length, 1);
    assert.ok(html.includes(`/_assets/reference-home/${APPROVED_HOME_SNAPSHOT}/`));
    assert.ok(!html.includes('/home-preview/'));
    assert.ok(html.includes('googletagmanager.com/gtag/js'));
    const graph = JSON.parse(doc('script[type="application/ld+json"]').text())['@graph'];
    assert.ok(graph.some(node => node['@type'] === 'WebPage'));
    assert.ok(!graph.some(node => ['Product', 'FAQPage'].includes(node['@type'])));
  }
  const preview = load(await read('home-preview/saved-reference/index.html'));
  assert.match(preview('meta[name="robots"]').attr('content'), /noindex/);
  await fs.access(new URL(`_assets/reference-home/${APPROVED_HOME_SNAPSHOT}/league-world/world.html`, root));
});
