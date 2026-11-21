import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { load } from 'cheerio';
const root = new URL('../../', import.meta.url);

test('Apple TV guide links to practical help and does not promise app prices', async () => {
  const doc = load(await fs.readFile(new URL('blog/iptv-على-apple-tv/index.html', root), 'utf8'));
  for (const href of ['/blog/m3u-playlist-guide/', '/blog/تقطيع-بث-iptv/', '/trial/']) {
    assert.ok(doc('main a').toArray().some(el => decodeURI(doc(el).attr('href') || '') === href), href);
  }
  assert.match(doc('#apps').next().text(), /تختلف التطبيقات/);
  assert.doesNotMatch(doc('main').text(), /التطبيقات الأساسية مجانية/);
});

test('world cup archive distinguishes past competition and upcoming coverage', async () => {
  const doc = load(await fs.readFile(new URL('world-cup-2026/index.html', root), 'utf8'));
  assert.match(doc('title').text(), /الأرشيف/);
  assert.match(doc('main').text(), /انتهت/);
  const team = load(await fs.readFile(new URL('world-cup-2026/مصر/index.html', root), 'utf8'));
  assert.match(team('main').text(), /شارك منتخب مصر في نهائيات كأس العالم 2026/);
  assert.match(team('meta[name="description"]').attr('content'), /تحقّق من الناقل/);
});
