/* ==========================================================================
   تحويل صور HTML عند النشر — بلا لمس بنية الصفحة.

   ما يفعله على كل <img> محلي:
     ١) يبدّل src إلى نسخة WebP/AVIF إن وُجدت فعلاً على القرص وكانت أصغر.
     ٢) يضيف width/height من src/image-manifest.json إن غابا (منع انزياح
        التخطيط CLS — وهو ما يقيسه Google).
     ٣) يضيف decoding="async" إن غاب.
     ٤) يمنح أول صورة ظاهرة في الصفحة (غير lazy) fetchpriority="high" حتى
        يحمّلها المتصفح قبل بقية الصور — إصلاح LCP كما يوصي Lighthouse.
     ٥) يحوّل <link rel="preload" as="image"> إلى النسخة الحديثة نفسها التي
        يحمّلها <img>، وإلا نزّل المتصفح الأصل الثقيل في التهيئة ثم النسخة
        الخفيفة في الصورة: تحميل مزدوج بلا فائدة.
   ولا يلفّ الصورة بـ<picture> ولا يغيّر أي عنصر آخر: بعض قواعد CSS في
   الموقع تعتمد على `img:nth-child(...)` داخل حاوية، ولفّها بغلاف جديد
   يكسر هذا التحديد ويبدّل مواضع صور الهيرو.

   تبديل src يعطي المكسب نفسه (‎3.4MB ← 47KB لصورة الهيرو) دون أي أثر على
   التخطيط أو على محدّدات CSS. الصور المبنية أصلاً داخل <picture> تُترك
   كما هي لأن <source> يختار الصيغة بنفسه.
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

const RASTER = /\.(png|jpe?g)$/i;
const IMAGE = /\.(png|jpe?g|webp|avif)$/i;

function locate(urlPath) {
  const rel = decodeURIComponent(urlPath.split('?')[0]).replace(/^\//, '');
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

/** النسخة الحديثة الأنسب لصورة أصلية، أو null إن لم تكن أصغر فعلاً.
    تشمل webp → avif: كثير من الصور تُصدَّر webp فقط، وavif أصغر منها. */
function modernVariant(src) {
  const stem = RASTER.test(src) ? src.replace(RASTER, '') : /\.webp$/i.test(src) ? src.replace(/\.webp$/i, '') : null;
  if (!stem) return null;
  const originalSize = sizeOf(src);
  let best = null;
  for (const ext of ['.webp', '.avif']) {
    const candidate = stem + ext;
    if (candidate === src) continue;
    const size = sizeOf(candidate);
    if (size < originalSize && (!best || size < sizeOf(best))) best = candidate;
  }
  return best;
}

export function optimizeHtmlImages(html) {
  if (!html.includes('<img')) return html;

  /* نطاقات <picture> التي فيها <source> فعلاً — هي وحدها تختار الصيغة بنفسها،
     فلا يُبدَّل src داخلها. أما <picture> الفارغ (بلا source) فالمتصفح يحمّل
     src كما هو، فيجوز تبديله إلى الصيغة الأصغر. */
  const pictureRanges = [];
  for (const match of html.matchAll(/<picture\b[^>]*>[\s\S]*?<\/picture>/g)) {
    pictureRanges.push([match.index, match.index + match[0].length, /<source\b/i.test(match[0])]);
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

    const size = dims[base] || dims[base.replace(RASTER, '.webp')] || dims[base.replace(RASTER, '.avif')];
    if (size && (!attrValue(tag, 'width') || !attrValue(tag, 'height'))) {
      updates.width = String(size[0]);
      updates.height = String(size[1]);
    }
    if (!attrValue(tag, 'decoding')) updates.decoding = 'async';

    return Object.keys(updates).length ? setAttrs(tag, updates) : tag;
  });

  return modernizeImagePreloads(markFirstPriorityImage(out));
}

/* روابط preload للصور: لو <img> سيحمّل النسخة الحديثة، فلتُحمَّل هي مسبقاً
   بدل الأصل. يشمل href النسبي والمطلق كما في بقية الدالة. */
function modernizeImagePreloads(html) {
  return html.replace(/<link\b[^>]*>/gi, (tag) => {
    if (!/\srel\s*=\s*["']?preload/i.test(tag)) return tag;
    if (!/\sas\s*=\s*["']?image/i.test(tag)) return tag;
    const href = attrValue(tag, 'href');
    if (!href || /^(https?:|data:|\/\/)/i.test(href)) return tag;
    const abs = href.startsWith('/') ? href : /^images\//.test(href) ? `/${href}` : null;
    if (!abs) return tag;
    const modern = modernVariant(abs.split('?')[0]);
    if (!modern) return tag;
    return setAttrs(tag, { href: href.startsWith('/') ? modern : modern.replace(/^\//, '') });
  });
}

/* أول صورة غير مؤجَّلة = مرشّح LCP. نرفع أولويتها بلا مساس بأي شيء آخر.
   الصور المؤجَّلة (loading="lazy") تُتجاهل لأنها تحت الطية أصلاً. */
function markFirstPriorityImage(html) {
  let done = false;
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    if (done) return tag;
    if ((attrValue(tag, 'loading') || '').toLowerCase() === 'lazy') return tag;
    done = true;
    if (/\sfetchpriority\s*=/i.test(tag)) return tag;
    return setAttrs(tag, { fetchpriority: 'high' });
  });
}
