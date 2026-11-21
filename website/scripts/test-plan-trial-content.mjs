import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { load } from 'cheerio';

const root = new URL('../../', import.meta.url);
const page = async route => load(await fs.readFile(new URL(`${route}/index.html`, root), 'utf8'));

test('plan pages link to comparison and distinguish X trial availability', async () => {
  for (const code of ['nova', 'istar', 'moka', 'x']) {
    const doc = await page(code);
    assert.equal(doc('h1').length, 1);
    assert.match(doc('h1').text(), /باقة/);
    assert.ok(doc('a[href="/servers/#servers-compare"]').length);
    assert.equal(doc('a[href="/#server-finder"]').length, 0);
    assert.ok(doc('a[href="/trial/"]').length);
    assert.ok(doc('button').filter((_, el) => doc(el).text().includes('طلب كود تجريبي')).length);
  }
});

test('trial page explains which servers the request form offers', async () => {
  const doc = await page('trial');
  assert.match(doc.text(), /نوفا وإيستار وموكا وX/);
  assert.match(doc.text(), /4 سيرفرات/);
  assert.match(doc.text(), /6 ساعات/);
  assert.ok(doc('#trial-conditions').length);
});
