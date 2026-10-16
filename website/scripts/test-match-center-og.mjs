/* المرحلة 3: صور مشاركة مركز المباراة — لا نتيجة قبل تأكيدها.
   القاعدة من تقرير التغطية §3.3: التمهيدية هوية فقط، والنهائية من
   قراءة مؤكدة بحالة منتهية وreadAt حقيقي، وغير ذلك رفض صريح. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const website = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const generator = fs.readFileSync(path.join(website, 'scripts/generate-match-og.mjs'), 'utf8');
const seo = fs.readFileSync(path.join(website, 'src/seo.ts'), 'utf8');

test('الصور 1200×630 وبالهوية الداكنة نفسها، والخط مضمّن لا خارجي', () => {
  assert.match(generator, /viewport: \{ width: 1200, height: 630 \}/);
  assert.match(generator, /#080b12/);
  assert.match(generator, /tajawal-arabic-900-normal\.woff2/);
  assert.doesNotMatch(generator, /https?:\/\//, 'لا أصل خارجي يُجلب وقت التوليد');
});

test('التمهيدية بلا أي نتيجة: الفريقان والمسابقة والموعد والملعب فقط', () => {
  const preview = generator.slice(generator.indexOf('function previewHtml'), generator.indexOf('const COMPLETED'));
  assert.match(preview, /match\.home\.name/);
  assert.match(preview, /match\.venue \?\? "غير متاح"/);
  assert.doesNotMatch(preview, /score/i, 'لا حقل نتيجة في القالب التمهيدي أصلاً');
});

test('النهائية ترفض غير المنتهية والنتيجة الناقصة وغياب readAt الحقيقي', () => {
  assert.match(generator, /COMPLETED\.has\(status\)/);
  assert.match(generator, /refused: confirmed score missing/);
  assert.match(generator, /refused: real readAt missing/);
  assert.match(generator, /refused: unknown match/);
  // تسمية القراءة المؤكدة بتوقيت القاهرة على الصورة نفسها — ليست ضمنية.
  assert.match(generator, /قراءة مؤكدة:/);
  assert.match(generator, /timeZone: "Africa\/Cairo"/);
});

test('كل مباراة تجريبية لها صورتها التمهيدية على القرص بأبعاد PNG صحيحة', async () => {
  const { MATCH_CENTER_MATCHES } = await import('../src/content/match-center.mjs');
  assert.equal(MATCH_CENTER_MATCHES.length, 3);
  for (const match of MATCH_CENTER_MATCHES) {
    const file = path.join(website, `public/images/og/match-${match.slug}.png`);
    const buf = fs.readFileSync(file);
    assert.equal(buf.subarray(1, 4).toString('ascii'), 'PNG', `${match.slug}: ملف PNG فعلي`);
    assert.equal(buf.readUInt32BE(16), 1200, `${match.slug}: العرض 1200`);
    assert.equal(buf.readUInt32BE(20), 630, `${match.slug}: الارتفاع 630`);
    // لا صورة نهائية مولّدة من بيانات اصطناعية تُشحن مع الموقع.
    assert.equal(fs.existsSync(path.join(website, `public/images/og/match-${match.slug}-final.png`)), false,
      `${match.slug}: النهائية تُولّد بعد المباراة من قراءة مؤكدة فقط`);
  }
});

test('صفحة مركز المباراة تربط صورتها الخاصة بدل صورة الرئيسية العامة', () => {
  const branch = seo.slice(seo.indexOf('const centerMatch = matchByRoute(clean)'), seo.indexOf('/* ===== صفحات هبوط البطولات'));
  assert.match(branch, /ogImage: ogImageFor\(`match-\$\{centerMatch\.slug\}`\)/);
});
