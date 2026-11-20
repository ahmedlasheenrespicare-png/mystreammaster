import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { load } from 'cheerio';
import { fileURLToPath } from 'node:url';
import { renderReferenceEnglish } from './generate-reference-english.mjs';

const reference = fileURLToPath(new URL('../../home-preview/saved-reference/index.html', import.meta.url));
const $ = load(await fs.readFile(reference, 'utf8'));

test('reference preview remains a clearly marked noindex Arabic document', () => {
  assert.equal($('html').attr('lang'), 'ar');
  const robots = $('meta[name="robots"]');
  assert.equal(robots.length, 1);
  assert.match(robots.attr('content'), /\bnoindex\b/i);
  assert.match($('title').text(), /معاينة/);
  assert.equal($('link[rel="canonical"]').length, 0, 'preview must not assert a production canonical before migration');
  assert.equal($('link[hreflang]').length, 0, 'the JS-only translation is not a separately indexable language URL');
});

test('reference preview has one main heading, unique IDs and working local anchors', () => {
  assert.equal($('h1').length, 1);
  const ids = new Set();
  $('[id]').each((_, element) => {
    const id = $(element).attr('id');
    assert.ok(!ids.has(id), `Duplicate ID: ${id}`);
    ids.add(id);
  });
  $('a[href^="#"]').each((_, element) => {
    const hash = $(element).attr('href').slice(1);
    if (hash) assert.ok(ids.has(decodeURIComponent(hash)), `Missing fragment target: ${hash}`);
  });
});

test('images declare alternative text and viewport does not disable user zoom', () => {
  $('img').each((_, element) => assert.notEqual($(element).attr('alt'), undefined));
  const viewport = $('meta[name="viewport"]').attr('content');
  assert.ok(viewport);
  assert.doesNotMatch(viewport, /maximum-scale|user-scalable\s*=\s*no/i);
});

test('reference preview is not submitted in the production sitemap', async () => {
  for (const name of ['sitemap-index.xml', 'sitemap.xml', 'sitemap-0.xml']) {
    const sitemap = await fs.readFile(new URL('../../' + name, import.meta.url), 'utf8');
    assert.doesNotMatch(sitemap, /\/home-preview\//i, `${name} contains a preview URL`);
  }
});


test('English preview is a reproducible, independently addressable noindex document', async () => {
  const html = await fs.readFile(new URL('../../home-preview/saved-reference/en/index.html', import.meta.url), 'utf8');
  const original = await fs.readFile(reference, 'utf8');
  const translations = JSON.parse(await fs.readFile(new URL('../../home-preview/saved-reference/assets/reference-en.json', import.meta.url), 'utf8'));
  assert.equal(html, renderReferenceEnglish(original, translations));
  const en=load(html);
  assert.equal(en('html').attr('lang'), 'en');
  assert.match(en('meta[name="robots"]').attr('content'), /\bnoindex\b/i);
  assert.equal(en('link[rel="canonical"]').length, 0);
  assert.equal(en('link[hreflang]').length, 0);
  assert.match(en('h1').text(), /Watch\s+everything you love/);
  assert.equal(en('#sm-language').attr('href'), '/home-preview/saved-reference/');
  assert.equal($('#sm-language').attr('href'), '/home-preview/saved-reference/en/');
});
