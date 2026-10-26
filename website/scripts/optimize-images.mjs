/* ==========================================================================
   مولّد نسخ الصور الحديثة (WebP + AVIF) وأبعادها.

   لماذا سكربت منفصل لا خطوة بناء؟
   بناء المشروع يجري على GitHub Actions حيث لا ImageMagick مضمون؛ لذلك
   تُولَّد النسخ **مرة واحدة هنا وتُلتزم في المستودع**، ويبقى البناء في CI
   نقياً بلا اعتماد على أدوات صور: خطوة `html-images.mjs` تستهلك ما هو
   موجود فقط. إضافة صورة جديدة تعني: أضف الأصل ثم شغّل هذا السكربت.

     node scripts/optimize-images.mjs            # يولّد الناقص فقط
     node scripts/optimize-images.mjs --force    # يعيد توليد الكل

   المخرجات لكل أصل raster مشار إليه:
     <name>.webp  — جودة 80، أقصى عرض 900px، مع الحفاظ على الشفافية
     <name>.avif  — جودة 55، أقصى عرض 900px، للصور المعتمة فقط
     src/image-manifest.json — { "/images/x.png": [w, h], ... } للأبعاد

   الأصول تُقرأ من website/public أولاً ثم من جذر المستودع: بعض صور
   اللاعبين التاريخية أُضيفت إلى المخرج المنشور مباشرة ولم تُنسخ إلى
   المصدر، والنسخ الجديدة تُكتب دائماً في المصدر (website/public) لتُبنى
   وتُنشر مع بقية الأصول.
========================================================================== */
import fs from 'node:fs/promises';
import fss from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const website = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.dirname(website);
const publicDir = path.join(website, 'public');
const force = process.argv.includes('--force');

const MAX_WIDTH = 900;
const QUALITY = { webp: '80', avif: '55' };
const RASTER = /\.(png|jpe?g)$/i;
const MODERN = /\.(webp|avif)$/i;

const localFile = (urlPath) => {
  const rel = decodeURIComponent(urlPath.split('?')[0]).replace(/^\//, '');
  const inPublic = path.join(publicDir, rel);
  if (fss.existsSync(inPublic)) return inPublic;
  const inRoot = path.join(root, rel);
  return fss.existsSync(inRoot) ? inRoot : null;
};
const publicTarget = (urlPath) => path.join(publicDir, decodeURIComponent(urlPath.split('?')[0]).replace(/^\//, ''));

/* كل صفحة منشورة (الجذر = مخرج البناء الحالي) وما تشير إليه من صور */
const SKIP = new Set(['website', 'admin-dashboard', 'node_modules', 'tests', 'php-lib']);
async function walk(dir, out = []) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (dir === root && SKIP.has(entry.name)) continue;
      await walk(full, out);
    } else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

const referenced = new Set();
const collect = (value) => {
  for (const part of value.split(',')) {
    const urlPath = part.trim().split(/\s+/)[0];
    if (!urlPath || /\.svg($|\?)/i.test(urlPath) || /^https?:/i.test(urlPath) || urlPath.startsWith('data:')) continue;
    const norm = urlPath.startsWith('/') ? urlPath : /^images\//.test(urlPath) ? `/${urlPath}` : null;
    if (norm) referenced.add(norm.split('?')[0]);
  }
};

for (const file of await walk(root)) {
  const html = await fs.readFile(file, 'utf8');
  /* srcSet في JSX يصبح srcset في HTML، وكلاهما يُقرأ */
  for (const match of html.matchAll(/(?:src|srcSet|srcset|href)="([^"]+)"/g)) collect(match[1]);
}
/* صور المصدر أيضاً (تظهر في صفحات لم تُبنَ بعد أو في قوالب) */
async function collectFromFiles(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await collectFromFiles(full);
    else if (/\.(html|tsx?|mjs|json)$/.test(entry.name)) {
      const text = await fs.readFile(full, 'utf8');
      for (const match of text.matchAll(/["']?(?:src|srcSet|srcset)["']?\s*[:=]\s*["']([^"']+)["']/g)) collect(match[1]);
    }
  }
}
for (const dir of [path.join(website, 'src'), path.join(website, 'legacy'), path.join(website, 'public')]) {
  if (fss.existsSync(dir)) await collectFromFiles(dir);
}

const bases = new Set();
for (const urlPath of referenced) {
  if (RASTER.test(urlPath)) { if (localFile(urlPath)) bases.add(urlPath); continue; }
  if (!MODERN.test(urlPath)) continue;
  const stem = urlPath.replace(MODERN, '');
  const original = ['.png', '.jpg', '.jpeg'].map((ext) => stem + ext).find((candidate) => localFile(candidate));
  /* النسخة الحديثة نفسها مطلوبة حتى لو غاب الأصل (حالة srcset في المقالات) */
  if (original) bases.add(original);
  else if (!localFile(urlPath)) bases.add(`!${urlPath}`);
}

async function dimensions(file) {
  const { stdout } = await run('identify', ['-format', '%w %h', file]);
  const [w, h] = stdout.trim().split(/\s+/).map(Number);
  return { w, h };
}
const transparencyCache = new Map();
async function hasTransparency(file) {
  if (transparencyCache.has(file)) return transparencyCache.get(file);
  const { stdout } = await run('identify', ['-format', '%[opaque]', file]);
  const transparent = stdout.trim().toLowerCase() === 'false';
  transparencyCache.set(file, transparent);
  return transparent;
}
async function imageFiles(dir, out = []) {
  if (!fss.existsSync(dir)) return out;
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await imageFiles(full, out);
    else if (/\.(png|webp)$/i.test(entry.name)) out.push(full);
  }
  return out;
}
async function convert(src, dest, format) {
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await run('convert', [src, '-strip', '-resize', `${MAX_WIDTH}x${MAX_WIDTH}>`, '-quality', QUALITY[format], dest]);
}

const manifest = {};
let made = 0, kept = 0, bytesBefore = 0, bytesAfter = 0;

for (const entry of [...bases].sort()) {
  if (entry.startsWith('!')) {
    const urlPath = entry.slice(1);
    const stem = urlPath.replace(MODERN, '');
    const source = ['.png', '.jpg', '.jpeg'].map((ext) => localFile(stem + ext)).find(Boolean);
    if (!source) { console.warn(`  ⚠ لا أصل لـ${urlPath}`); continue; }
    await convert(source, publicTarget(urlPath), urlPath.endsWith('.avif') ? 'avif' : 'webp');
    made++;
    continue;
  }

  const source = localFile(entry);
  const stat = fss.statSync(source);
  let dims;
  try { dims = await dimensions(source); } catch { continue; }
  manifest[entry] = [dims.w, dims.h];
  bytesBefore += stat.size;

  let best = Infinity;
  /* ImageMagick's AVIF delegate in this build flattens alpha. Never publish or
     choose that variant for transparent PNGs; the WebP encoder preserves it.
     Also validate an existing WebP before keeping it, since older conversions
     may have flattened alpha too. */
  const transparentSource = /\.png$/i.test(entry) && await hasTransparency(source);
  const formats = transparentSource ? ['webp'] : ['webp', 'avif'];
  for (const format of formats) {
    const target = publicTarget(entry.replace(RASTER, `.${format}`));
    const exists = fss.existsSync(target);
    const existingWebpLostAlpha = transparentSource && format === 'webp' && exists && !await hasTransparency(target);
    if (exists && !force && !existingWebpLostAlpha && fss.statSync(target).size <= stat.size) {
      kept++;
      best = Math.min(best, fss.statSync(target).size);
      continue;
    }
    await convert(source, target, format);
    made++;
    if (transparentSource && format === 'webp') {
      transparencyCache.delete(target);
      if (!await hasTransparency(target)) {
        throw new Error(`WebP output lost alpha for transparent source: ${entry}`);
      }
    }
    best = Math.min(best, fss.statSync(target).size);
  }
  bytesAfter += Math.min(best, stat.size);
}

/* أبعاد النسخ الحديثة أيضاً — الصفحات التي تشير إلى webp مباشرة تحتاجها */
for (const urlPath of referenced) {
  if (manifest[urlPath] || !MODERN.test(urlPath)) continue;
  const file = localFile(urlPath);
  if (!file) continue;
  try { const { w, h } = await dimensions(file); manifest[urlPath] = [w, h]; } catch { /* ignore */ }
}

/* مفاتيح كل نسخ الصيغ الموجودة على القرص لأي مسار مرجعي — حقن الأبعاد
   يبدّل الامتدادات (png→webp/avif أو webp→avif) فتحتاج كل الشقيقات مفاتيح. */
for (const urlPath of referenced) {
  const stem = urlPath.split('?')[0].replace(/\.(png|jpe?g|webp|avif)$/i, '');
  if (!stem || urlPath.startsWith('!')) continue;
  for (const ext of ['.webp', '.avif']) {
    const variant = stem + ext;
    if (manifest[variant]) continue;
    const file = localFile(variant);
    if (!file) continue;
    try { const { w, h } = await dimensions(file); manifest[variant] = [w, h]; } catch { /* ignore */ }
  }
}

const manifestPath = path.join(website, 'src', 'image-manifest.json');
const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
await fs.writeFile(manifestPath, JSON.stringify(sorted, null, 2) + '\n');

const checkedStems = new Set();
const transparentStems = new Set();
for (const dir of [publicDir, path.join(root, 'images')]) {
  for (const file of await imageFiles(dir)) {
    const relative = path.relative(dir, file).split(path.sep).join('/');
    const urlPath = dir === publicDir
      ? `/${relative}`
      : `/${path.relative(root, file).split(path.sep).join('/')}`;
    const stem = urlPath.replace(/\.(png|webp)$/i, '');
    checkedStems.add(stem);
    if (await hasTransparency(file)) transparentStems.add(stem);
  }
}
const transparencyPath = path.join(website, 'src', 'image-transparency-manifest.json');
const transparencyManifest = {
  checked: [...checkedStems].sort(),
  transparent: [...transparentStems].sort(),
};
await fs.writeFile(transparencyPath, JSON.stringify(transparencyManifest, null, 2) + '\n');

console.log(`أصول: ${bases.size} · نسخ مولّدة: ${made} · موجودة: ${kept}`);
console.log(`حجم الأصل ${(bytesBefore / 1048576).toFixed(1)}MB → أفضل نسخة ${(bytesAfter / 1048576).toFixed(1)}MB`);
console.log(`المانيفست: ${Object.keys(sorted).length} صورة → ${path.relative(root, manifestPath)}`);
console.log(`صور شفافة: ${transparentStems.size} من أصل ${checkedStems.size} مساراً → ${path.relative(root, transparencyPath)}`);
