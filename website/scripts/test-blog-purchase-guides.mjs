import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { load } from 'cheerio';

const root = new URL('../../', import.meta.url);
for (const slug of ['افضل-اشتراك-iptv-2026', 'choose-iptv-server']) {
  test(`${slug}: useful links to comparison, store and trial`, async () => {
    const doc = load(await fs.readFile(new URL(`blog/${slug}/index.html`, root), 'utf8'));
    for (const href of ['/servers/#servers-compare', '/store/', '/trial/']) {
      assert.ok(doc(`a[href="${href}"]`).length, `${slug}: ${href}`);
    }
    assert.match(doc.text(), /نوفا/);
    assert.match(doc.text(), /موكا/);
    assert.match(doc.text(), /X/);
  });
}
