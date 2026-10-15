import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';
import { header, footer } from './legacy-shell.mjs';

const website = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.dirname(website);
async function files(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map(e => e.isDirectory() ? files(path.join(dir, e.name)) : path.join(dir, e.name)))).flat();
}

// This directory contains only this build's generated, fingerprinted assets.
await fs.rm(path.join(root, '_assets/redesign'), { recursive: true, force: true });

// Only files emitted by this build are published. PHP, admin, channels.json,
// existing media, and all other production data remain untouched.
for (const file of await files(path.join(website, 'dist'))) {
  const relative = path.relative(path.join(website, 'dist'), file);
  const destination = path.join(root, relative);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  if (file.endsWith('.html')) await fs.writeFile(destination, (await fs.readFile(file, 'utf8')).replace(/[ \t]+$/gm, ''));
  else await fs.copyFile(file, destination);
}

// مسارات الصفحات التي تستخدم خلفية داكنة (#080b12) فيبقى لون شريط المتصفح داكنًا.
const DARK_PAGES = new Set([
  'manchester-united-atletico/index.html',
  'manchester-united-atletico/watch/index.html',
]);

/* صفحات تنشر كما هي بلا قالب (لا هيدر ولا فوتر ولا storefront.css): مشغّل
   البث الخاص يملأ الشاشة، وأي غلاف حوله يكسر ارتفاع الإطار ويضيف تنقّلاً
   فوق الفيديو. تبقى في website/legacy/ لتُنشر مع بقية الصفحات القديمة، لكنها
   لا تمر بمسار الغلاف — تُنسخ كاملة مع تنظيف المسافات في آخر الأسطر فقط. */
const STANDALONE_PAGES = new Set(['player.html']);

async function publishStandalone(file, relative) {
  const $ = load(await fs.readFile(file, 'utf8'));
  const destination = path.join(root, relative);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, $.html().replace(/[ \t]+$/gm, ''));
}

let count = 0;
for (const file of await files(path.join(website, 'legacy'))) {
  const relative = path.relative(path.join(website, 'legacy'), file);
  if (STANDALONE_PAGES.has(relative)) {
    await publishStandalone(file, relative);
    count++;
    continue;
  }
  const $ = load(await fs.readFile(file, 'utf8'));
  const main = $('main').first();
  const scripts = $('body > script').clone();
  let content;
  if (main.length) {
    content = main.clone().attr('id', 'main-content').addClass('sm-legacy');
  } else {
    // Standalone live player / legal viewing / offline documents.
    $('body > header, body > footer, .promo-bar, amp-auto-ads').remove();
    $('.wrap > header, .wrap > footer').remove();
    content = $('<main id="main-content" class="sm-legacy"></main>');
    $('body').children().not('script').each((_, el) => content.append($(el).clone()));
  }
  /* عنوان رئيسي واحد فقط لكل صفحة: أول h1 يبقى، وما عداه (عناوين داخل
     نص المقال مكرّرة لعنوان الصفحة) يُخفَض إلى h2 — كان الخفض الشامل
     يترك مقالات المدونة بلا أي h1. */
  content.find('h1').each((i, el) => { if (i > 0) el.tagName = 'h2'; });
  $('body').empty().attr('class', `sm-page${relative === 'live-free.html' ? ' sm-player' : ''}`)
    .append(header).append(content).append(footer).append(scripts);
  // Decorative legacy effects can obscure the new UI, so they stay stripped.
  // AdSense (googlesyndication) used to be stripped here too, which removed the
  // loader script from every legacy page and left the <ins> markup inert — no ad
  // could ever render. It is now kept so the tag ships on every page.
  // ampproject stays stripped: the AMP auto-ads component needs the AMP runtime,
  // which these pages do not load, so it is dead weight that only costs a request.
  $('script').each((_, el) => {
    const script = $(el);
    if (/3d-effects|ampproject/.test((script.attr('src') || '') + script.text())) script.remove();
  });
  $('link[href*="3d-effects"], link[href*="pricing-minimal"], link[href*="fonts.googleapis"], link[href*="fonts.gstatic"]').remove();
  // الصفحات ذات الخلفية الداكنة تحتفظ بلون شريط المتصفح الداكن بدل الفاتح.
  if (!DARK_PAGES.has(relative)) $('meta[name="theme-color"]').attr('content', '#faf9f6');
  $('head').append('<link rel="stylesheet" href="/_assets/storefront.css?v=20261013b"><script src="/_assets/storefront.js?v=20261013b" defer></script>');
  const destination = path.join(root, relative);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, $.html().replace(/[ \t]+$/gm, ''));
  count++;
}

// Include both old, retained URLs and newly prerendered routes in the sitemap index.
await fs.writeFile(path.join(root, 'sitemap-index.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://streammasterstore.com/sitemap-0.xml</loc></sitemap>
  <sitemap><loc>https://streammasterstore.com/sitemap.xml</loc></sitemap>
</sitemapindex>\n`);
console.log(`Published redesigned storefront and ${count} retained pages. Backend/admin/data were not replaced.`);
