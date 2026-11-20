/* ==========================================================================
   تحويل صور HTML عند النشر — بلا لمس بنية الصفحة.

   ما يفعله على كل <img> محلي:
     ١) يختار النسخة الأصغر. PNG/WebP المعروفان بالشفافية يقتصران على WebP؛
        PNG/WebP غير المعروفين عن الشفافية يُستخدم لهما WebP احتياطياً فقط،
        وتستمر AVIF للنسخ المعروفة بالعتامة وJPEG.
     ٢) يصلح سمات مصدر AVIF داخل <picture> إذا ثبت أن الأصل شفاف، من دون
        إضافة أو حذف أي عنصر من بنية الصفحة.
     ٣) يضيف width/height من src/image-manifest.json إن غابا، وdecoding="async".
   لا يضيف أغلفة <picture> جديدة ولا يغيّر بنية الصفحة: بعض قواعد CSS في
   الموقع تعتمد على `img:nth-child(...)` داخل حاوية، ولفّها بغلاف جديد
   يكسر هذا التحديد ويبدّل مواضع صور الهيرو.

   تبديل src يعطي المكسب نفسه (‎3.4MB ← 47KB لصورة الهيرو) دون أي أثر على
   التخطيط أو على محدّدات CSS. تُترك مصادر الصور كما هي، باستثناء AVIF
   الذي قد يفقد الشفافية؛ عندئذٍ تُعدَّل سماته فقط إلى WebP آمن.
========================================================================== */
import fss from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const website = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(website, 'public');
const root = path.dirname(website);

let manifestCache = null;
export function imageManifest() {
  if (manifestCache) return manifestCache;
  const file = path.join(website, 'src', 'image-manifest.json');
  manifestCache = fss.existsSync(file) ? JSON.parse(fss.readFileSync(file, 'utf8')) : {};
  return manifestCache;
}

let transparencyManifestCache = null;
function imageTransparencyInfo() {
  if (transparencyManifestCache) return transparencyManifestCache;
  const file = path.join(website, 'src', 'image-transparency-manifest.json');
  const data = fss.existsSync(file) ? JSON.parse(fss.readFileSync(file, 'utf8')) : {};
  /* القديم كان قائمة جذوع شفافة فقط؛ ابقَ متوافقاً معها أثناء الانتقال. */
  transparencyManifestCache = Array.isArray(data)
    ? { checked: new Set(), transparent: new Set(data) }
    : { checked: new Set(data.checked || []), transparent: new Set(data.transparent || []) };
  return transparencyManifestCache;
}

const RASTER = /\.(png|jpe?g)$/i;
const IMAGE = /\.(png|jpe?g|webp|avif)$/i;

function locate(urlPath) {
  const rel = decodeURIComponent(urlPath.split(/[?#]/)[0]).replace(/^\//, '');
  for (const dir of [publicDir, root]) {
    const file = path.join(dir, rel);
    if (fss.existsSync(file) && fss.statSync(file).isFile()) return file;
  }
  return null;
}
const sizeOf = (urlPath) => {
  const file = locate(urlPath);
  return file ? fss.statSync(file).size : Infinity;
};

function attrValue(tag, name) {
  const re = new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s"'>]+))`, 'i');
  const match = tag.match(re);
  return match ? match[2] ?? match[3] ?? match[4] ?? null : null;
}

function setAttrs(tag, updates) {
  let out = tag;
  for (const [name, value] of Object.entries(updates)) {
    if (value === null || value === undefined) continue;
    const re = new RegExp(`\\s${name}\\s*=\\s*("[^"]*"|'[^']*'|[^\\s"'>]+)`, 'i');
    if (re.test(out)) out = out.replace(re, ` ${name}="${value}"`);
    else out = out.replace(/\s*(\/?)>$/, (_, slash) => ` ${name}="${value}"${slash ? ' /' : ''}>`);
  }
  return out;
}

function imageStem(url) {
  if (!url || /^(https?:|data:|\/\/)/i.test(url)) return null;
  const bareUrl = url.split(/[?#]/)[0];
  let decoded;
  try { decoded = decodeURIComponent(bareUrl); } catch { decoded = bareUrl; }
  const absolute = decoded.startsWith('/') ? decoded : /^images\//i.test(decoded) ? `/${decoded}` : null;
  return absolute ? absolute.replace(IMAGE, '') : null;
}

function hasTransparency(url) {
  const stem = imageStem(url);
  return Boolean(stem && imageTransparencyInfo().transparent.has(stem));
}

/** النسخة الحديثة الأنسب لصورة أصلية، أو null إن لم تكن أصغر فعلاً.
    لا نختار AVIF لمصدر PNG/WebP لأن النسخ الحالية فقدت الشفافية؛ WebP يحافظ
    عليها. وإذا كان HTML قديماً يشير مباشرةً إلى AVIF شفاف، نعيده إلى WebP/PNG. */
function modernVariant(src) {
  const extension = (src.match(IMAGE) || [])[0]?.toLowerCase();
  if (!extension) return null;
  const stem = src.slice(0, -extension.length);
  const originalSize = sizeOf(src);

  if (hasTransparency(src)) {
    const fallback = [stem + '.webp', stem + '.png'].find((candidate) => sizeOf(candidate) < Infinity);
    if (!fallback || fallback === src) return null;
    return extension === '.avif' || sizeOf(fallback) < originalSize ? fallback : null;
  }

  if (extension === '.avif') return null;
  const alphaCapableSource = extension === '.png' || extension === '.webp';
  const alphaStatusKnown = imageTransparencyInfo().checked.has(stem);
  let best = null;
  const formats = alphaCapableSource && !alphaStatusKnown ? ['.webp'] : ['.webp', '.avif'];
  for (const ext of formats) {
    const candidate = stem + ext;
    if (candidate === src) continue;
    const size = sizeOf(candidate);
    if (size < originalSize && (!best || size < sizeOf(best))) best = candidate;
  }
  return best;
}

function srcSetEntries(value) {
  return (value || '').split(',').map((part) => {
    const tokens = part.trim().split(/\s+/);
    return { url: tokens[0] || '', descriptor: tokens.slice(1).join(' ') };
  }).filter(({ url }) => url);
}

function safeAvifCandidate(url, extension) {
  const match = url.match(/\.avif(?=([?#]|$))/i);
  if (!match) return null;
  const end = match.index + match[0].length;
  const candidate = `${url.slice(0, match.index)}.${extension}${url.slice(end)}`;
  return sizeOf(candidate) < Infinity ? candidate : null;
}

function repairTransparentAvifSources(html) {
  return html.replace(/<picture\b[^>]*>[\s\S]*?<\/picture>/gi, (picture) => {
    const img = (picture.match(/<img\b[^>]*>/i) || [])[0] || '';
    const fallbackIsTransparent = hasTransparency(attrValue(img, 'src'));
    return picture.replace(/<source\b[^>]*>/gi, (source) => {
      const entries = srcSetEntries(attrValue(source, 'srcset'));
      const urls = entries.map(({ url }) => url);
      const avifSource = /image\/avif/i.test(attrValue(source, 'type') || '') || urls.some((url) => /\.avif(?:$|[?#])/i.test(url));
      const transparentSource = fallbackIsTransparent || urls.some(hasTransparency);
      if (!avifSource || !transparentSource) return source;

      for (const extension of ['webp', 'png']) {
        const rewritten = entries.map(({ url, descriptor }) => {
          const candidate = /\.avif(?:$|[?#])/i.test(url) ? safeAvifCandidate(url, extension) : url;
          return candidate ? `${candidate}${descriptor ? ` ${descriptor}` : ''}` : null;
        });
        if (rewritten.length && rewritten.every(Boolean)) {
          return setAttrs(source, {
            type: `image/${extension === 'webp' ? 'webp' : 'png'}`,
            srcset: rewritten.join(', '),
          });
        }
      }

      /* لا يوجد ملف بديل بنفس المقاسات؛ عطّل هذا المصدر بالسمات فقط،
         ثم دع صورة img الاحتياطية تختار صيغة شفافة متاحة. */
      return setAttrs(source, { srcset: '', media: 'not all' });
    });
  });
}

function hasActivePictureSource(picture) {
  return [...picture.matchAll(/<source\b[^>]*>/gi)].some((match) => {
    const source = match[0];
    const srcset = attrValue(source, 'srcset');
    const media = (attrValue(source, 'media') || '').trim().toLowerCase();
    return Boolean(srcset && srcset.trim()) && media !== 'not all';
  });
}

export function optimizeHtmlImages(html) {
  if (!html.includes('<img')) return html;
  html = repairTransparentAvifSources(html);

  /* الصور داخل <picture> ذي مصدر فعّال تترك اختيار الصيغة للمتصفح؛
     إن عُطّل AVIF غير الآمن وبقيت الصورة احتياطية فقط، يجوز تحسين src. */
  const pictureRanges = [];
  for (const match of html.matchAll(/<picture\b[^>]*>[\s\S]*?<\/picture>/gi)) {
    pictureRanges.push([match.index, match.index + match[0].length, hasActivePictureSource(match[0])]);
  }
  const insidePicture = (index) => pictureRanges.some(([start, end, hasSource]) => hasSource && index >= start && index < end);

  const dims = imageManifest();

  const out = html.replace(/<img\b[^>]*>/gi, (tag, offset) => {
    const src = attrValue(tag, 'src');
    if (!src || /^(https?:|data:|\/\/)/i.test(src)) return tag;
    /* المسارات ترد مطلقة (/images/…) ونسبية (images/…) في نفس الموقع */
    const abs = src.startsWith('/') ? src : /^images\//.test(src) ? `/${src}` : null;
    if (!abs) return tag;
    const base = abs.split('?')[0];
    if (!IMAGE.test(base)) return tag;

    const updates = {};
    const hasSrcset = /\ssrcset\s*=/i.test(tag);

    if (!insidePicture(offset) && !hasSrcset) {
      const modern = modernVariant(base);
      if (modern) {
        /* نحافظ على شكل المسار كما كتبه المصدر: نسبياً أو مطلقاً */
        const shaped = src.startsWith('/') ? modern : modern.replace(/^\//, '');
        updates.src = src.includes('?') ? `${shaped}?${src.split('?')[1]}` : shaped;
      }
    }

    /* قد لا توجد أبعاد للنسخة المصدر في manifest، بينما النسخة الحديثة
       التي سيُرسلها المتصفح لها أبعاد موثقة. افحص المصدر النهائي أولاً، ثم
       ارجع إلى الأصل وبدائله كما كان سابقاً. */
    const selectedSource = updates.src
      ? (updates.src.startsWith('/') ? updates.src : `/${updates.src}`).split(/[?#]/)[0]
      : base;
    const size = dims[selectedSource]
      || dims[selectedSource.replace(RASTER, '.webp')]
      || dims[selectedSource.replace(RASTER, '.avif')]
      || dims[base]
      || dims[base.replace(RASTER, '.webp')]
      || dims[base.replace(RASTER, '.avif')];
    if (size && (!attrValue(tag, 'width') || !attrValue(tag, 'height'))) {
      updates.width = String(size[0]);
      updates.height = String(size[1]);
    }
    if (!attrValue(tag, 'decoding')) updates.decoding = 'async';

    return Object.keys(updates).length ? setAttrs(tag, updates) : tag;
  });

  return out;
}



