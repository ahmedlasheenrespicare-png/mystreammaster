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
    if (lang === 'ar') {
      const title = 'ستريم ماستر برو | باقات IPTV وإعداد المشغلات';
      const description = 'تعرّف على باقات نوفا وإيستار وموكا وX، وقارن السيرفرات واطلب تجربة مجانية، مع المساعدة في الربط التقني وإعداد مشغلات M3U على أجهزتك.';
      assert.equal(doc('head title').text(), title);
      assert.equal(doc('meta[name="description"]').attr('content'), description);
      assert.equal(doc('meta[property="og:title"]').attr('content'), title);
      assert.equal(doc('meta[property="og:description"]').attr('content'), description);
      const page = JSON.parse(doc('script[type="application/ld+json"]').text())['@graph'].find(node => node['@type'] === 'WebPage');
      assert.equal(page.name, title);
      assert.equal(page.description, description);
    }
    assert.equal(doc('#sm-language').attr('href'), other);
    assert.equal(doc('h1').length, 1);
    const loader = doc('.sm-home-loader');
    assert.equal(loader.length, 1);
    assert.equal(loader.attr('aria-hidden'), 'true');
    assert.match(loader.attr('style'), /display:\s*none/);
    assert.equal(loader.find('.loader__images .blur-mask').length, 1);
    assert.equal(loader.find('.overlay__path').length, 1);
    assert.equal(loader.find('#progressBar').length, 1);
    assert.equal(loader.find('img').length, 0);
    assert.ok(!loader.text().includes('Abhishek Jha'));
    assert.ok(loader.text().includes(lang === 'ar' ? 'جارٍ تجهيز الصفحة' : 'Preparing your page'));
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

test('responsive path and cinema variants retain originals and meet a quality and size budget', async () => {
  const base = `/_assets/reference-home/${APPROVED_HOME_SNAPSHOT}/`;
  const script = await read(`${base.slice(1)}cinema-showcase.js`);
  const map = JSON.parse(script.match(/^const smCinemaResponsive=(.*);/)[1]);
  assert.ok(Object.keys(map).length >= 30, 'cinema poster variants are published');
  for (const page of ['index.html', 'en/index.html']) {
    const doc = load(await read(page));
    assert.match(doc('script[src*="cinema-showcase.js"]').attr('src'), /responsive=[a-f0-9]{12}/);
    for (const image of doc('#path-section .sm-fan-card > img').toArray()) {
      const src = doc(image).attr('src').split('?')[0];
      const set = doc(image).attr('srcset');
      assert.ok(set, `${page}: ${src} has candidates`);
      assert.match(doc(image).attr('sizes'), /190vw/); // cover-cropped landscape image
      if (map[src]) assert.equal(map[src], set);
      map[src] = set;
    }
    for (const image of doc('#cinema-library .smcin-panel > img').toArray()) {
      assert.ok(doc(image).attr('src'), 'the unenhanced HTML keeps a normal source');
      assert.equal(doc(image).attr('srcset'), undefined, 'reel script owns poster activation');
    }
  }
  let checked = 0;
  for (const [src, srcset] of Object.entries(map)) {
    const original = await fs.readFile(new URL(src.slice(1), root));
    const metadata = await sharp(original).metadata();
    const candidates = srcset.split(', ').map(entry => {
      const match = entry.match(/^(\S+) (\d+)w$/);
      assert.ok(match, `invalid srcset: ${entry}`);
      return { url: match[1], width: Number(match[2]) };
    });
    assert.deepEqual(candidates.at(-1), { url: src, width: metadata.width });
    for (const candidate of candidates.slice(0, -1)) {
      assert.ok(candidate.width < metadata.width);
      const variant = await fs.readFile(new URL(candidate.url.slice(1), root));
      assert.ok(variant.length < original.length, `${candidate.url} saves bytes`);
      assert.equal((await sharp(variant).metadata()).width, candidate.width);
      // Compare codec output with the same Lanczos-resized source, not the
      // larger original; the original remains available at full resolution.
      const reference = await sharp(original).resize({ width: candidate.width }).removeAlpha().raw().toBuffer();
      const actual = await sharp(variant).removeAlpha().raw().toBuffer();
      assert.equal(actual.length, reference.length);
      let squaredError = 0;
      for (let i = 0; i < reference.length; i++) squaredError += (reference[i] - actual[i]) ** 2;
      const psnr = 10 * Math.log10(255 ** 2 / (squaredError / reference.length));
      assert.ok(psnr >= 38, `${candidate.url} PSNR ${psnr.toFixed(2)}dB`);
      checked++;
    }
  }
  assert.ok(checked >= 30);
});

test('approved production flower renderer uses the guarded optimization and cache version', async () => {
  const { optimizeReferenceFlower } = await import('./optimize-reference-flower.mjs');
  const staged = await read('home-preview/release-candidate/assets/main-D5MQsYQ6.js');
  const assetUrl = `/_assets/reference-home/${APPROVED_HOME_SNAPSHOT}/`;
  const original = staged.replaceAll('/home-preview/release-candidate/assets/', assetUrl);
  const published = await read(`${assetUrl.slice(1)}main-D5MQsYQ6.js`);
  assert.equal(published, optimizeReferenceFlower(original));
  assert.throws(() => optimizeReferenceFlower('unrecognized renderer'), /renderer changed/);
  const { createHash } = await import('node:crypto');
  const revision = createHash('sha256').update(published).digest('hex').slice(0, 12);
  for (const page of ['index.html', 'en/index.html']) {
    const doc = load(await read(page));
    assert.match(doc('script[src*="main-D5MQsYQ6.js"]').attr('src'), new RegExp(`flower=${revision}`));
  }
});
