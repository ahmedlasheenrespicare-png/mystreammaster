// Original typographic sharing artwork; all SEO/identity comes from central sources.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {chromium} from '@playwright/test';
import chromiumBinary, {inflate} from '@sparticuz/chromium';
import {getLegacyAnalysisSeo, BRAND_NAME} from '../dist-ssr/entry-server.js';
const website = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function generateAnalysisOg(routes) {
  const font = await fs.readFile(path.join(website, 'public/fonts/tajawal-arabic-900-normal.woff2'));
  const libraries = await inflate(path.join(website, 'node_modules/@sparticuz/chromium/bin/al2023.tar.br'));
  const browser = await chromium.launch({executablePath:await chromiumBinary.executablePath(), args:chromiumBinary.args,
    env:{...process.env,LD_LIBRARY_PATH:`${libraries}/lib:${process.env.LD_LIBRARY_PATH||''}`}});
  try {
    const page = await browser.newPage({viewport:{width:1200,height:630},deviceScaleFactor:1});
    await page.route('**/*', route => route.abort());
    for (const route of routes) {
      const seo = getLegacyAnalysisSeo(route);
      if (!seo) throw new Error(`No central SEO: ${route}`);
      await page.setContent(`<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><style>
        @font-face{font-family:Tajawal;src:url(data:font/woff2;base64,${font.toString('base64')});font-weight:900}
        *{box-sizing:border-box}body{margin:0;background:#080b12;color:#f5f7fb;font-family:Tajawal,sans-serif}
        main{height:630px;padding:64px 76px;background:radial-gradient(ellipse at top right,#302653,transparent 65%);display:flex;flex-direction:column;justify-content:space-between}
        .eyebrow{font-size:27px;color:#d8ff3e}h1{font-size:54px;line-height:1.6;margin:12px 0}p{font-size:30px;line-height:1.6;margin:0}.foot{font-size:24px;color:#b6c0d5;border-top:1px solid #fff3;padding-top:22px}
        </style><main><div class="eyebrow">دوري أبطال أوروبا · موسم 2026/2027</div><h1>${esc(seo.title)}</h1><p>الجولة الثانية · ${route.endsWith('/watch') ? 'نتيجة اللقاء ودليل المشاهدة الرسمية' : 'ملخص اللقاءات والتشكيل والإحصائيات'}</p><div class="foot">${esc(BRAND_NAME)}</div></main></html>`);
      await page.evaluate(() => document.fonts.ready);
      const local = new URL(seo.ogImage).pathname.replace(/^\//, '');
      const destination = path.join(website, 'public', local);
      await fs.mkdir(path.dirname(destination), {recursive:true});
      await page.screenshot({path:destination}); console.log(destination);
    }
  } finally { await browser.close(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await generateAnalysisOg(['match-analysis','manchester-city-psg','manchester-city-psg/watch','roma-real-madrid','roma-real-madrid/watch','manchester-united-atletico','manchester-united-atletico/watch','galatasaray-barcelona','galatasaray-barcelona/watch']);
}
