import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { load } from 'cheerio';

const root = new URL('../../', import.meta.url);

test('store and comparison pages have distinct purposes and working links', async () => {
  const store = load(await fs.readFile(new URL('store/index.html', root), 'utf8'));
  const servers = load(await fs.readFile(new URL('servers/index.html', root), 'utf8'));
  assert.equal(store('h1').text(), 'اشتراك IPTV وباقات التفعيل');
  assert.equal(servers('h1').text(), 'مقارنة السيرفرات والباقات');
  assert.ok(store('a[href="/servers/"]').filter((_, el) => store(el).text().includes('قارن السيرفرات قبل اختيار الباقة')).length >= 1);
  assert.equal(servers('a[href="#servers-compare"]').filter((_, el) => servers(el).text().includes('جدول المقارنة')).length, 1);
  assert.equal(servers('#servers-compare table').length, 1);
  assert.equal(store('#servers-compare table').length, 0);
  for (const doc of [store, servers]) {
    assert.equal(doc('#pricing').length, 1);
    assert.equal(doc('h1').length, 1);
  }
  assert.match(servers('meta[name="description"]').attr('content'), /الجودة والمكتبة/);
  assert.match(servers('#servers-compare').text(), /طلب تجربة مجانية/);
  assert.doesNotMatch(servers('#servers-compare').text(), /مساعد الاختيار أعلاه/);
});
