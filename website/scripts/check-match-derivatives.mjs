#!/usr/bin/env node
/* ==========================================================================
   حارس المشتقات — لماذا هذا الملف؟
   --------------------------------------------------------------------------
   سجل مركز المباراة ليس قائمة يدوية صرفة: `match-center-italian.mjs` يستورد
   ملف الأرشيف المحلي نفسه (`./fixtures-archive/ita.1/2026.json`) ويخيط منه
   المواعيد. أي التزام أرشيف ليلي يوسّع السجل إذن **من غير ما يلمسه أحد**،
   وكل موعد مسجّل يجرّ ورائه مشتقين خارج `website/src`:
     • `public/images/og/match-<slug>.png` (1200×630) ونسخته الجذرية `images/og/`
     • `matches/<الدرجة>/<slug>/index.html` — لقطة البناء الثابتة في الجذر
   النقص هنا لا يُرى كسرابط مكسورة، بل ينفجر لاحقًا في بوابة النشر عند
   `npm test` بعد نصف ساعة من الدمج. هذا حدث فعلًا: `Deploy to Hostinger` على
   a265883 (8 نوفمبر 2026) سقط لأن 5 مواعيد `ita.1` اتسجّلت بغير مشتقاتها.

   هذا السكربت **لا يولّد شيئًا** ولا يحتاج `node_modules` — يقيس التزامن فقط.
   لو رجع بـ exit 1 فالمطلوب (بهذا الترتيب، من مولّدات المشروع نفسها):
     node website/scripts/generate-match-og.mjs --missing-only
     npm --prefix website run build
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const website = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repository = path.resolve(website, '..');

const { MATCH_CENTER_ALL_MATCHES, matchCenterPath } = await import(
  pathToFileURL(path.join(website, 'src', 'content', 'match-center.mjs')).href
);

const OG_SIZES = { width: 1200, height: 630 };
const buckets = { ogMissing: [], ogWrongSize: [], ogRootMissing: [], pageMissing: [] };

function pngDimensions(file) {
  const buf = Buffer.alloc(24);
  const fd = fs.openSync(file, 'r');
  try {
    fs.readSync(fd, buf, 0, 24, 0);
  } finally {
    fs.closeSync(fd);
  }
  if (buf.subarray(1, 4).toString('ascii') !== 'PNG') return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

for (const match of MATCH_CENTER_ALL_MATCHES) {
  const name = `match-${match.slug}.png`;
  const preview = path.join(website, 'public', 'images', 'og', name);
  if (!fs.existsSync(preview)) {
    buckets.ogMissing.push(name);
  } else {
    const size = pngDimensions(preview);
    if (!size || size.width !== OG_SIZES.width || size.height !== OG_SIZES.height) {
      buckets.ogWrongSize.push(`${name}: ${size ? `${size.width}×${size.height}` : 'ليست PNG صالحة'}`);
    }
  }
  // النسخة الجذرية هي ما يُرفع للنشر (publish-static ينسخها) — غيابها يعني
  // مولّد الصور شُغّل والبناء لأ، أي نشر نصف مكتمل.
  if (!fs.existsSync(path.join(repository, 'images', 'og', name))) buckets.ogRootMissing.push(name);

  const route = matchCenterPath(match).replace(/^\/+|\/+$/g, '');
  if (!fs.existsSync(path.join(repository, route, 'index.html'))) buckets.pageMissing.push(route);
}

const labels = {
  ogMissing: 'صور OG ناقصة في website/public/images/og',
  ogWrongSize: 'صور OG بمقاس غير 1200×630',
  ogRootMissing: 'صور OG ناقصة في النسخة الجذرية images/og',
  pageMissing: 'صفحات ثابتة ناقصة في جذر المستودع',
};
const total = Object.values(buckets).reduce((n, xs) => n + xs.length, 0);
const registry = MATCH_CENTER_ALL_MATCHES.length;

if (total === 0) {
  console.log(`✓ مشتقات ${registry} موعدًا مسجّلًا مكتملة (صورة OG مضاعفة + صفحة ثابتة).`);
  process.exit(0);
}

for (const [key, items] of Object.entries(buckets)) {
  if (!items.length) continue;
  const shown = items.slice(0, 15).join('\n  ');
  const rest = items.length > 15 ? `\n  … و${items.length - 15} أخرى` : '';
  console.log(`${labels[key]} (${items.length}):\n  ${shown}${rest}`);
}
console.error(`\n✗ التزامن مكسور: ${total} مشتقًا ناقصًا من أصل ${registry} موعدًا في السجل.
الحل بمولّدات المشروع نفسها:
  node website/scripts/generate-match-og.mjs --missing-only
  npm --prefix website run build
ثم تحقق: node website/scripts/check-match-derivatives.mjs`);
process.exit(1);
