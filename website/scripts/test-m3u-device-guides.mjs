import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { load } from 'cheerio';

const root = new URL('../../', import.meta.url);
const page = async path => load(await fs.readFile(new URL(path, root), 'utf8'));

test('M3U guide is indexable and links to the private-list player and device guides', async () => {
  const doc = await page('blog/m3u-playlist-guide/index.html');
  assert.match(doc('meta[name="robots"]').attr('content'), /^index, follow/);
  assert.match(doc('title').text(), /قائمة M3U/);
  for (const href of ['/m3u-player.html', '/blog/iptv-samsung-lg-setup/', '/blog/تشغيل-iptv-على-أندرويد/']) {
    assert.ok(doc('a').toArray().some(el => decodeURI(doc(el).attr('href') || '') === href), href);
  }
  assert.match(doc.text(), /لا يوفر المحتوى/);
  const player = await page('m3u-player.html');
  assert.match(player('meta[name="robots"]').attr('content'), /noindex/);
});

test('device and troubleshooting guides link to relevant next steps', async () => {
  for (const slug of ['iptv-samsung-lg-setup', 'تشغيل-iptv-على-أندرويد']) {
    const doc = await page(`blog/${slug}/index.html`);
    assert.ok(doc('a[href="/blog/m3u-playlist-guide/"]').length);
  }
  for (const slug of ['تقطيع-بث-iptv', 'test-iptv-server-stability']) {
    const doc = await page(`blog/${slug}/index.html`);
    assert.ok(doc('a[href="/trial/"]').length);
  }
});
