import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { load } from 'cheerio';

const root = new URL('../../', import.meta.url);
const page = async slug => load(await fs.readFile(new URL(`blog/${slug}/index.html`, root), 'utf8'));

test('country guides link to pricing and trial without outdated X trial language', async () => {
  for (const country of ['مصر', 'السعودية', 'الإمارات', 'الجزائر', 'الكويت', 'المغرب']) {
    const doc = await page(`افضل-سيرفر-iptv-في-${country}`);
    assert.match(doc('meta[name="robots"]').attr('content'), /^index, follow/);
    assert.ok(doc('a[href="/store/"]').length, `${country}: store`);
    assert.ok(doc('a[href="/trial/"]').length, `${country}: trial`);
    assert.doesNotMatch(doc('main').text(), /تجربة تبدأ من الصفر|تبدأ التجربة من الصفر/);
  }
});

test('Egypt offer does not claim equal prices for different server prices', async () => {
  const doc = await page('افضل-سيرفر-iptv-في-مصر');
  assert.match(doc('main').text(), /يختلف السعر حسب السيرفر والمدة/);
  assert.doesNotMatch(doc('main').text(), /سعر السيرفرين واحد/);
});
