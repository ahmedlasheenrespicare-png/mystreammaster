/**
 * صور مشاركة صفحات هبوط البطولات 1200×630 — نفس تصميم الصور المنشورة
 * (خلفية بنفسجية داكنة، شريط الهوية أعلى اليمين، العنوان الكبير، سطر فرعي،
 * خط متدرّج، والنطاق أسفل اليسار مع تنويه الوسيط التقني أسفل اليمين).
 *
 * القاعدة الحاكمة: النصوص تُقرأ من مصدر المحتوى المركزي (competitions.ts)
 * ولا تُكتب نسخة ثانية هنا، والنطاق يُقرأ من src/site.mjs. لا يُرسم أي رقم ولا
 * نتيجة ولا جدول في صورة المشاركة — العنوان وسطر التعريف فقط.
 *
 * الاستخدام:
 *   node scripts/generate-league-og.mjs            → يولّد الصور الناقصة فقط
 *   node scripts/generate-league-og.mjs --force    → يعيد توليد الموجود أيضاً
 *   node scripts/generate-league-og.mjs <slug> …   → يحصر التوليد بسلاجات محددة
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium as playwrightChromium } from '@playwright/test';
import sparticuzChromium, { inflate } from '@sparticuz/chromium';
import { LEAGUE_LANDINGS } from '../src/content/competitions.ts';

const website = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fontRegular = await fs.readFile(path.join(website, 'public/fonts/tajawal-arabic-400-normal.woff2'));
const fontBlack = await fs.readFile(path.join(website, 'public/fonts/tajawal-arabic-900-normal.woff2'));

/* النطاق من ملف النطاق المركزي — بلا نسخة مكتوبة هنا */
const siteHost = await import(path.join(website, 'src/site.mjs')).then((module) => module.SITE_HOST);

/* اسم ملف صورة كل بطولة — يجب أن يطابق قيمة المسار نفسه في OG_BY_ROUTE
   داخل src/seo.ts، واختبار `test-league-standings.mjs` يحرس هذا التطابق
   حتى لا تنفصل الصورة المولَّدة عن الصورة المعلنة في الصفحة. */
const OG_FILES = {
  'دوري-أبطال-أوروبا': 'league-uefa-champions',
  'الدوري-الإنجليزي': 'league-premier-league',
  'الدوري-الإسباني': 'league-la-liga',
  'الدوري-الفرنسي': 'league-ligue-1',
  'الدوري-الألماني': 'league-bundesliga',
  'الدوري-الإيطالي': 'league-serie-a',
  'الدوري-السعودي': 'league-saudi-pro-league',
};

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));

const args = process.argv.slice(2);
const force = args.includes('--force');
const only = args.filter((arg) => !arg.startsWith('--'));

const accent = '#d8ff3e';

function artwork(landing) {
  const subtitle = landing.ogSubtitle ?? 'الجدول والقنوات الناقلة';
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8"><style>
@font-face { font-family: Tajawal; src: url(data:font/woff2;base64,${fontRegular.toString('base64')}) format("woff2"); font-weight: 400; }
@font-face { font-family: Tajawal; src: url(data:font/woff2;base64,${fontBlack.toString('base64')}) format("woff2"); font-weight: 900; }
* { box-sizing: border-box; }
html, body { width: 1200px; height: 630px; margin: 0; overflow: hidden; }
body { font-family: Tajawal, sans-serif; color: #fff; }
.cover { position: relative; isolation: isolate; width: 1200px; height: 630px; overflow: hidden;
  background: radial-gradient(115% 130% at 84% 8%, #4a2160 0%, #33163f 38%, #1d0f2a 72%, #150b21 100%); }
.cover::after { content: ""; position: absolute; z-index: -1; inset: auto auto -430px -150px; width: 720px; height: 720px;
  border: 1px solid #ffffff12; border-radius: 50%; box-shadow: 0 0 0 34px #ffffff08, 0 0 0 72px #ffffff06, 0 0 0 112px #ffffff04; }
.grid { position: absolute; inset: 0; opacity: .10;
  background-image: linear-gradient(#ffffff14 1px, transparent 1px), linear-gradient(90deg, #ffffff14 1px, transparent 1px);
  background-size: 58px 58px; mask-image: linear-gradient(140deg, black, transparent 70%); }
.brand { position: absolute; top: 52px; right: 62px; display: flex; align-items: center; gap: 16px; }
.mark { width: 62px; height: 62px; border-radius: 18px; background: ${accent}; display: grid; place-items: center; box-shadow: 0 16px 40px ${accent}30; }
.mark svg { width: 30px; height: 30px; }
.brand-text { text-align: right; line-height: 1.12; }
.brand-ar { font-size: 31px; font-weight: 900; }
.brand-en { font-size: 15px; font-weight: 400; letter-spacing: .16em; color: #ffffffb0; margin-top: 3px; }
/* العنوان والسطر الفرعي والخط المتدرّج في تدفّق واحد داخل الكتلة نفسها —
   فيستحيل أن يتقاطع الخط مع النص لو طال العنوان إلى سطرين. */
.copy { position: absolute; right: 62px; top: 190px; width: 1040px; text-align: right; }
h1 { margin: 0; font-size: 86px; line-height: 1.18; letter-spacing: -.02em; font-weight: 900; text-wrap: balance; }
.sub { margin-top: 16px; color: #ffffffc2; font-size: 34px; font-weight: 400; }
.rule { margin-top: 26px; width: 176px; height: 6px; border-radius: 6px;
  background: linear-gradient(270deg, ${accent}, #3effe0); }
.host { position: absolute; left: 62px; bottom: 38px; color: #ffffff70; font-size: 22px; font-weight: 400; direction: ltr; }
.note { position: absolute; right: 62px; bottom: 38px; color: ${accent}; font-size: 23px; font-weight: 900; }
</style></head>
<body><main class="cover"><div class="grid"></div>
<div class="brand"><div class="mark"><svg viewBox="0 0 24 24" fill="#111"><path d="M8 5.5v13l11-6.5z"/></svg></div>
<div class="brand-text"><div class="brand-ar">ستريم ماستر برو</div><div class="brand-en">STREAM MASTER PRO</div></div></div>
<div class="copy"><h1>${escapeHtml(landing.h1)}</h1><div class="sub">${escapeHtml(subtitle)}</div>
<div class="rule"></div></div>
<div class="host">${escapeHtml(siteHost)}</div>
<div class="note">وسيط تقني — لا يستضيف المحتوى ولا يبثّه</div>
</main></body></html>`;
}

const targets = LEAGUE_LANDINGS.filter((landing) => (only.length ? only.includes(landing.slug) : true));
if (!targets.length) throw new Error('No league landings matched the requested slugs');

const libraries = await inflate(path.resolve(website, 'node_modules/@sparticuz/chromium/bin/al2023.tar.br'));
const browser = await playwrightChromium.launch({
  executablePath: await sparticuzChromium.executablePath(),
  args: sparticuzChromium.args.filter((arg) => !['--single-process', '--disable-web-security'].includes(arg)),
  env: { ...process.env, LD_LIBRARY_PATH: `${libraries}/lib:${process.env.LD_LIBRARY_PATH || ''}` },
});

try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.route('**/*', (route) => route.abort());
  for (const landing of targets) {
    const file = OG_FILES[landing.slug];
    if (!file) throw new Error(`No OG artwork name for league landing ${landing.slug}`);
    /* المصدر هو website/public — ونشر الجذر يتم في خطوة البناء، فلا يُكتب
       ملف مولَّد في الجذر يدوياً. */
    const output = path.join(website, `public/images/og/${file}.png`);
    if (!force && await fs.access(output).then(() => true, () => false)) {
      console.log(`• ${path.basename(output)} موجودة — تُترك كما هي (استخدم --force لإعادة توليدها)`);
      continue;
    }
    await page.setContent(artwork(landing), { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await fs.mkdir(path.dirname(output), { recursive: true });
    await page.screenshot({ path: output, type: 'png' });
    console.log(`✓ ${path.basename(output)} — 1200×630`);
  }
} finally {
  await browser.close();
}
