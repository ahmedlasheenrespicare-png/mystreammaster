import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';
import { header, footer } from './legacy-shell.mjs';
import { renderFixtureCharts } from '../public/_assets/fixture-charts.js';
import { renderFixtureStandings } from '../public/_assets/fixture-standings.js';
import { renderFixtureLineups } from './render-fixture-lineups.mjs';
import { renderCityParisReport } from './render-city-paris.mjs';
import { renderGalatasarayBarcelonaReport } from './render-galatasaray-barcelona.mjs';
import { renderRomaMadridReport } from './render-roma-madrid.mjs';
import { renderMatchAnalysis } from './render-match-analysis.mjs';
import { applyLegacyAnalysisSeo } from './apply-legacy-analysis-seo.mjs';
import { getLegacyAnalysisSeo } from '../dist-ssr/entry-server.js';
import { keywordsFor, hasKeywordEntry } from '../src/keywords.mjs';
import { assertKeywordInTitle, assertTitleLength, noteBrandInTitle } from './seo-guard.mjs';

/* حرّاس SEO على الصفحات القديمة (لا تمر عبر getSeo) — الصفحات المفهرسة
   فقط، وتحوّل المخالفات المانعة إلى فشل بناء عند SEO_STRICT=1. */
const strict = process.env.SEO_STRICT === '1';
const seoViolations = [];
const seoWarnings = [];
const seoBrandNotes = [];
let legacyIndexed = 0;
let legacySkippedNoindex = 0;
let legacyKeywordMisses = 0;
let legacyLengthBlocking = 0;
let legacyCoverageGaps = 0;

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
  'match-analysis/index.html',
  'galatasaray-barcelona/index.html',
  'galatasaray-barcelona/watch/index.html',
  'roma-real-madrid/index.html',
  'roma-real-madrid/watch/index.html',
  'manchester-city-psg/index.html',
  'manchester-city-psg/watch/index.html',
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

// New analysis page sources live in src/, not in generated/published HTML.
// Keep derived legacy snapshots solely for compatibility with retained-page tests.
for (const source of await files(path.join(website, 'src/pages/analysis'))) {
  if (!source.endsWith('.html')) continue;
  const relative = path.relative(path.join(website, 'src/pages/analysis'), source);
  const seo = getLegacyAnalysisSeo(relative.replace(/\/index\.html$/, ''));
  if (!seo) throw new Error(`Missing central SEO for analysis template ${relative}`);
  const $ = load(await fs.readFile(source, 'utf8'));
  applyLegacyAnalysisSeo($, seo);
  const snapshot = path.join(website, 'legacy', relative);
  await fs.mkdir(path.dirname(snapshot), { recursive: true });
  await fs.writeFile(snapshot, $.html().replace(/[ \t]+$/gm, ''));
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
  const analysisSeo = getLegacyAnalysisSeo(relative.replace(/\/index\.html$/, ''));
  if (analysisSeo) {
    applyLegacyAnalysisSeo($, analysisSeo);
    // Derived source-head snapshots keep legacy source-level validators meaningful.
    // The sole editable SEO definitions remain in src/seo.ts, not these snapshots.
    await fs.writeFile(file, $.html().replace(/[ \t]+$/gm, ''));
  }
  if ($('main[data-city-paris-report]').length) {
    renderCityParisReport($, JSON.parse(await fs.readFile(path.join(website, 'src/content/city-paris-report.json'), 'utf8')));
  }
  if ($('main[data-roma-madrid-report]').length) {
    renderRomaMadridReport($, JSON.parse(await fs.readFile(path.join(website, 'src/content/roma-madrid-report.json'), 'utf8')));
  }
  if ($('main[data-galatasaray-barcelona-report]').length) {
    renderGalatasarayBarcelonaReport($, JSON.parse(await fs.readFile(path.join(website, 'src/content/galatasaray-barcelona-report.json'), 'utf8')));
  }
  if ($('[data-analysis-cards]').length) {
    renderMatchAnalysis($, JSON.parse(await fs.readFile(path.join(website, 'src/content/match-analysis.json'), 'utf8')));
  }
  // Bake charts from the visible official tables, using the same pure renderer as
  // the optional browser enhancement. No API call or duplicated UEFA dataset.
  $('[data-fixture-charts]').each((_, element) => {
    const rows = {};
    $('#uefa-stats [data-stat]').each((__, row) => {
      const cells = $(row).find('td');
      rows[$(row).attr('data-stat')] = { home: cells.eq(0).text().trim(), away: cells.eq(1).text().trim() };
    });
    $(element).html(renderFixtureCharts(rows, $('#uefa-stats time').first().text().trim()));
  });
  if ($('[data-fixture-lineups]').length) {
    // Confirmed starting XIs and dated provider ratings are complete without JS.
    // Rendering is build-only: do not introduce another browser feed or PHP API.
    const lineup = JSON.parse(await fs.readFile(path.join(website, 'src/content/fixture-lineups-snapshot.json'), 'utf8'));
    $('[data-fixture-lineups]').html(renderFixtureLineups(lineup));
  }
  if ($('[data-fixture-standings]').length) {
    // A dated, reviewed ESPN snapshot is present in the HTML without JavaScript.
    // Runtime refreshes use the separately approved, same-origin PHP endpoint.
    const snapshot = JSON.parse(await fs.readFile(path.join(website, 'src/content/fixture-standings-snapshot.json'), 'utf8'));
    $('[data-fixture-standings]').html(renderFixtureStandings(snapshot));
  }
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

  /* فحص SEO للصفحة القديمة بصيغتها النهائية: نحوّل مسار الملف إلى مسار تطبيع
     (about/index.html → /about، watch-legal.html → /watch-legal.html) ثم
     نقرأ كلمته من الخريطة الموحَّدة ونفحص العنوان الفعلي المشحون.
     الصفحات noindex مستثناة مثل مثيلاتها في prerender تماماً. */
  const legacyRoute = "/" + relative.replace(/(^|\/)index\.html$/, "$1").replace(/\/+$/, "");
  const legacyRobots = ($('meta[name="robots"]').attr('content') || '').trim();
  const legacyTitle = $('title').first().text().trim();
  if (legacyRobots.startsWith('noindex')) {
    legacySkippedNoindex++;
  } else {
    legacyIndexed++;
    const legacyKeyword = keywordsFor(legacyRoute);
    if (!hasKeywordEntry(legacyRoute)) {
      seoViolations.push(`صفحة قابلة للفهرسة بلا مدخل في خريطة الكلمات → ${legacyRoute}`);
      legacyCoverageGaps++;
    }
    const legacyKeywordViolation = assertKeywordInTitle(legacyRoute, legacyTitle, legacyKeyword.primary);
    if (legacyKeywordViolation) {
      seoViolations.push(legacyKeywordViolation);
      legacyKeywordMisses++;
    }
    const length = assertTitleLength(legacyRoute, legacyTitle);
    seoViolations.push(...length.violations);
    legacyLengthBlocking += length.violations.length;
    seoWarnings.push(...length.warnings);
    const brandNote = noteBrandInTitle(legacyRoute, legacyTitle);
    if (brandNote) seoBrandNotes.push(brandNote);
  }

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

// إلحاق نتائج فحص الصفحات القديمة بتقرير prerender (ترتيب أبجدي/نقطي ثابت
// حتى يبقى الناتج حتمياً مع اختلاف ترتيب readdir بين الأجهزة). المخالفات
// وحدها مانعة؛ التحذيرات وملاحظات البراند معلوماتية.
{
  const sortedViolations = [...seoViolations].sort();
  const sortedWarnings = [...seoWarnings].sort();
  const sortedBrand = [...seoBrandNotes].sort();
  const reportPath = path.join(website, 'docs', 'seo-report.txt');
  const existing = await fs.readFile(reportPath, 'utf8').catch(() => '');
  const section = [
    '',
    '# ─────────────────────────────────────────────────────────────',
    `# ملخص الصفحات القديمة (legacy): ${legacyIndexed} مفهرساً مفحوصاً | ${legacySkippedNoindex} مستثنى (noindex)`,
    `# مخالفات مانعة: ${sortedViolations.length} (كلمة غائبة ${legacyKeywordMisses} · طول >60: ${legacyLengthBlocking} · تغطية ناقصة: ${legacyCoverageGaps})`,
    `# ملاحظات غير مانعة: تحذير طول 55–60: ${sortedWarnings.length} · براند في العنوان (سياسة): ${sortedBrand.length}`,
    '',
    '## مخالفات مانعة — الصفحات القديمة (تُفشل SEO_STRICT=1)',
    '',
    sortedViolations.length ? sortedViolations.join('\n\n') : '✅ لا شيء.',
    '',
    '',
    '## تحذيرات طول العنوان (55–60 حرفاً بدون اللاحقة، غير مانعة) — الصفحات القديمة',
    '',
    sortedWarnings.length ? sortedWarnings.join('\n\n') : '✅ لا شيء.',
    '',
    '',
    '## ملاحظات سياسية — البراند في العنوان (غير مانعة) — الصفحات القديمة',
    '',
    sortedBrand.length ? sortedBrand.join('\n\n') : '✅ لا شيء.',
    '',
  ].join('\n');
  await fs.writeFile(reportPath, existing + section, 'utf8');
  if (sortedViolations.length) {
    console.error(`⚠️  ${sortedViolations.length} مخالفة SEO مانعة في الصفحات القديمة — أُلحقت بـ website/docs/seo-report.txt`);
    if (strict) throw new Error(`SEO strict (legacy): ${sortedViolations.length} مخالفة مانعة`);
  }
}

console.log(`Published redesigned storefront and ${count} retained pages. Backend/admin/data were not replaced.`);
