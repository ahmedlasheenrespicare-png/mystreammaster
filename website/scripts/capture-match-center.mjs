/* ==========================================================================
   لقطات مركز المباراة — البند 14: «معاينة + لقطات هاتف وسطح مكتب»
   --------------------------------------------------------------------------
   تُلتقط من خادم التطوير (vite) لأن المزوّد المحاكي لا يعمل إلا هناك، فتظهر
   الحالات الثلاث على الرابط نفسه. **ليست لقطات من الإنتاج**: في البناء
   المنشور تُقرأ البيانات من `match-center.php` ولا تظهر شارة المحاكاة.

   العرض 320 → 1440 كما يشترط البند 4، ويُفحص ألا يكون هناك تمرير أفقي للصفحة
   وأن كل نص ظاهر غير مبتور — وهو فحص آلي لا بصري، فلا يعتمد على عين الناظر.

   الاستخدام:
     npm run dev            # في طرفية
     node scripts/capture-match-center.mjs
========================================================================== */

/* `@sparticuz/chromium` يعطي مسار المتصفح ومعاملاته، أما `launch` فمن
   Playwright نفسه — وخلطهما هو سبب الخطأ الشائع هنا. */
import sparticuz, { inflate } from '@sparticuz/chromium';
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const website = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(website, 'docs', 'match-center-shots');
const baseUrl = process.env.SHOT_BASE_URL || 'http://127.0.0.1:5173';
const route = '/matches/الدوري-الإنجليزي/brentford-liverpool/';

/* الحالات التي يطلب البند 14 رؤيتها على **الرابط نفسه**. */
const states = [
  { id: 'pre', query: '', label: 'قبل البداية — معاينة' },
  { id: 'live', query: '?mockScenario=secondHalf', label: 'أثناء المباراة — مباشر' },
  { id: 'finished', query: '?mockScenario=finished', label: 'بعد النهاية — تقرير' },
  { id: 'postponed', query: '?mockScenario=postponed', label: 'مؤجلة — حالة مستقلة' },
];

const widths = [
  { width: 320, height: 720, name: '320' },
  { width: 390, height: 844, name: '390' },
  { width: 768, height: 1024, name: '768' },
  { width: 1440, height: 1000, name: '1440' },
];

const libraries = await inflate(path.resolve('node_modules/@sparticuz/chromium/bin/al2023.tar.br'));
const browser = await chromium.launch({
  executablePath: await sparticuz.executablePath(),
  args: sparticuz.args.filter(arg => !['--single-process', '--disable-web-security'].includes(arg)),
  env: { ...process.env, LD_LIBRARY_PATH: `${libraries}/lib:${process.env.LD_LIBRARY_PATH || ''}` },
});

await fs.mkdir(outDir, { recursive: true });
const problems = [];
const written = [];

try {
  for (const viewport of widths) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      /* البند 10: تُلتقط نسخة بحركة مخفّضة أيضاً، فالحركة لا تُخفي نصاً. */
      reducedMotion: 'reduce',
      locale: 'ar',
    });
    const page = await context.newPage();

    for (const state of states) {
      const url = `${baseUrl}${encodeURI(route)}${state.query}`;
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      /* تنتظر أول قراءة حتى لا تُلتقط صفحة قبل وصول البيانات. */
      await page.waitForSelector('.mc-state', { timeout: 15_000 });
      await page.waitForTimeout(1_200);

      /* لقطة بارتفاع الصفحة كاملة عبر **نافذة عرض طويلة** لا عبر `fullPage`.
         وضع `fullPage` (captureBeyondViewport) كان يرسم تدرّج خلفية الصفحة
         شفافاً فتظهر الطبقات شبه الشفافة فوق خلفية القالب الكريمية — لقطة
         كاذبة لصفحة صحيحة. النافذة الطويلة ترسم ما يراه الزائر فعلاً. */
      const pageHeight = Math.min(9_000, await page.evaluate(() => document.body.scrollHeight));
      await page.setViewportSize({ width: viewport.width, height: pageHeight });
      await page.waitForTimeout(300);
      const file = path.join(outDir, `match-center-${state.id}-${viewport.name}.png`);
      await page.screenshot({ path: file, fullPage: false });
      written.push({ file: path.relative(website, file), state: state.id, width: viewport.name });

      /* ── فحوص آلية على كل لقطة ── */
      const metrics = await page.evaluate(() => {
        const de = document.documentElement;
        const overflowing = [];
        for (const el of document.querySelectorAll('.mc-page *')) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && (rect.right > de.clientWidth + 1 || rect.left < -1)) {
            overflowing.push(`${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ')[0]}`);
          }
        }
        const clipped = [];
        for (const el of document.querySelectorAll('.mc-page *')) {
          if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== 'auto'
            && getComputedStyle(el).overflowX !== 'scroll' && el.children.length === 0) {
            clipped.push((el.textContent || '').trim().slice(0, 40));
          }
        }
        return {
          pageScroll: de.scrollWidth - de.clientWidth,
          overflowing: overflowing.slice(0, 8),
          clipped: clipped.slice(0, 8),
          h1: document.querySelectorAll('h1').length,
          tabs: document.querySelectorAll('[role="tab"]').length,
          selectedTabs: document.querySelectorAll('[role="tab"][aria-selected="true"]').length,
          visiblePanels: [...document.querySelectorAll('[role="tabpanel"]')].filter(p => !p.hidden).length,
          state: document.querySelector('.mc-state')?.textContent?.trim() ?? '',
          simulated: Boolean(document.querySelector('.mc-simulated')),
        };
      });

      const tag = `${state.id}@${viewport.name}`;
      if (metrics.pageScroll > 0) problems.push(`${tag}: تمرير أفقي للصفحة بمقدار ${metrics.pageScroll}px`);
      if (metrics.overflowing.length) problems.push(`${tag}: عناصر خارج العرض: ${metrics.overflowing.join(', ')}`);
      if (metrics.clipped.length) problems.push(`${tag}: نص مبتور: ${metrics.clipped.join(' | ')}`);
      if (metrics.h1 !== 1) problems.push(`${tag}: عدد H1 = ${metrics.h1}`);
      if (metrics.tabs !== 5) problems.push(`${tag}: عدد التبويبات = ${metrics.tabs}`);
      if (metrics.selectedTabs !== 1) problems.push(`${tag}: تبويبات مختارة = ${metrics.selectedTabs}`);
      if (metrics.visiblePanels !== 1) problems.push(`${tag}: لوحات ظاهرة = ${metrics.visiblePanels}`);
      /* في التطوير يجب أن تظهر شارة المحاكاة — غيابها يعني أن أرقاماً محاكاة
         تُعرض بلا وسم، وهو أخطر ما يمكن أن يحدث في معاينة. */
      if (!metrics.simulated) problems.push(`${tag}: شارة المحاكاة غائبة`);

      console.log(`${tag.padEnd(16)} ${String(metrics.state).padEnd(22)} scroll=${metrics.pageScroll} h1=${metrics.h1} tabs=${metrics.tabs} panels=${metrics.visiblePanels} sim=${metrics.simulated}`);
    }
    await context.close();
  }
} finally {
  await browser.close();
}

console.log(`\n${written.length} لقطة في ${path.relative(website, outDir)}/`);
if (problems.length) {
  console.error(`\n❌ ${problems.length} مشكلة:`);
  for (const problem of problems) console.error('  - ' + problem);
  process.exitCode = 1;
} else {
  console.log('✅ لا تمرير أفقي، ولا نص مبتور، وH1 واحد، وخمسة تبويبات بواحد مختار، وشارة المحاكاة ظاهرة.');
}
