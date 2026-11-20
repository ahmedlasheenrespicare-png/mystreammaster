import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { load } from 'cheerio';
import sharp from 'sharp';
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

test('production retains high-quality image sources without increasing their byte size', async () => {
  for (const file of ['index.html', 'en/index.html']) {
    const doc = load(await read(file));
    for (const name of ['sport', 'cinema', 'value']) {
      const image = doc(`#path-section .sm-fan--${name} > img`).first();
      assert.equal(image.length, 1, `${file}: ${name} path image`);
      assert.equal(image.attr('loading'), 'lazy', `${file}: below-fold image is deferred`);
      assert.ok(image.attr('width') && image.attr('height'), `${file}: image reserves its space`);
      const src = image.attr('src');
      assert.ok(src && src.startsWith('/_assets/reference-home/'), `${file}: source remains in published snapshot`);
      const published = await fs.stat(new URL(src.split('?')[0].slice(1), root));
      const original = await fs.stat(new URL(`home-preview/release-candidate/assets/path-${name}.jpg`, root));
      assert.ok(published.size <= original.size, `${file}: ${name} is no bigger than its original`);
    }
  }
});

// Originals used in place of modern variants must actually be the smaller
// lossless representation, rather than silently bypassing the SEO guard.
test('retained snapshot raster originals are smaller than lossless WebP', async () => {
  const paths = new Set();
  for (const page of ['index.html', 'en/index.html']) {
    const doc = load(await read(page));
    doc('img[src]').each((_, el) => {
      const src = doc(el).attr('src').split('?')[0];
      if (src.startsWith(`/_assets/reference-home/${APPROVED_HOME_SNAPSHOT}/`) && /\.(png|jpe?g)$/i.test(src)) paths.add(src);
    });
  }
  assert.ok(paths.size > 0);
  for (const src of paths) {
    const bytes = await fs.readFile(new URL(decodeURIComponent(src).slice(1), root));
    const webp = await sharp(bytes).webp({ lossless: true }).toBuffer();
    assert.ok(bytes.length <= webp.length, `${src}: original should not exceed lossless WebP`);
  }
});
