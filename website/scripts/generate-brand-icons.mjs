/* ==========================================================================
   مولّد أيقونات هوية «ستريم ماستر» الرسمية (بحث جوجل + المتصفح + الجوال PWA)
   --------------------------------------------------------------------------
   التصميم المعتمد (الخيار ٢): مربعا العنصرين الكيميائيين قطرياً [ست⁴ᴷ] + [ما⁹⁹]
   مستوحى من uiverse.io/strav_5159/popular-crab-39 (رخصة MIT) ومطابق لهوية
   الشعار العربي الجديد في الهيدر، مع مراعاة منطقة الأمان الدائرية لدائرة
   بحث جوجل (28×28 بكسل) ومضاعفات 48 بكسل المعتمدة في وثائق Google Search.

   لإعادة التوليد عند الحاجة:
     cd website && node scripts/generate-brand-icons.mjs
========================================================================== */

import { chromium as pwChromium } from '@playwright/test';
import chromium, { inflate } from '@sparticuz/chromium';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const website = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(website, 'public');
const tajawalDir = path.join(website, 'node_modules/@fontsource/tajawal/files');
const spaceDir = path.join(website, 'node_modules/@fontsource/space-grotesk/files');

async function b64(file) {
  return (await fs.readFile(file)).toString('base64');
}

const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <style>
    @font-face {
      font-family: 'Tajawal';
      font-weight: 900;
      src: url('data:font/woff2;base64,${await b64(path.join(tajawalDir, 'tajawal-arabic-900-normal.woff2'))}') format('woff2');
    }
    @font-face {
      font-family: 'Space Grotesk';
      font-weight: 700;
      src: url('data:font/woff2;base64,${await b64(path.join(spaceDir, 'space-grotesk-latin-700-normal.woff2'))}') format('woff2');
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 512px;
      height: 512px;
      overflow: hidden;
      -webkit-font-smoothing: antialiased;
    }
    .canvas {
      width: 512px;
      height: 512px;
      background: radial-gradient(circle at 50% 45%, #1f3e19 0%, #0b1609 78%);
      position: relative;
      border: 12px solid #0a1708;
    }
    .tile {
      position: absolute;
      width: 172px;
      height: 172px;
      background: linear-gradient(136deg, #162b12 58%, #3f7e2c 93%);
      border: 6px solid #0a1708;
      border-radius: 14px;
      box-shadow:
        0 12px 26px rgba(0, 0, 0, 0.55),
        0 0 0 2.5px rgba(216, 255, 62, 0.55),
        inset 0 2.5px 0 rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    /* التقاء قطري داخل دائرة جوجل الآمنة دون تداخل على الأرقام العلوية */
    .t1 { top: 80px; right: 80px; }
    .t2 { bottom: 80px; left: 80px; }
    .sup {
      position: absolute;
      top: 12px;
      right: 14px;
      font-family: 'Space Grotesk', sans-serif;
      font-weight: 700;
      font-size: 36px;
      line-height: 1;
      letter-spacing: -0.03em;
      color: #d8ff3e;
      direction: ltr;
    }
    .sym {
      font-family: 'Tajawal', sans-serif;
      font-weight: 900;
      font-size: 74px;
      line-height: 1;
      color: #fcfeff;
      padding-top: 26px;
    }
    .sym-ma {
      font-size: 84px;
      padding-top: 24px;
    }
  </style>
</head>
<body>
  <div class="canvas">
    <div class="tile t1"><span class="sup">4K</span><span class="sym">ست</span></div>
    <div class="tile t2"><span class="sup">99</span><span class="sym sym-ma">ما</span></div>
  </div>
</body>
</html>`;

const libraries = await inflate(path.join(website, 'node_modules/@sparticuz/chromium/bin/al2023.tar.br'));
const browser = await pwChromium.launch({
  executablePath: await chromium.executablePath(),
  args: chromium.args.filter((a) => !['--single-process', '--disable-web-security'].includes(a)),
  env: { ...process.env, LD_LIBRARY_PATH: `${libraries}/lib:${process.env.LD_LIBRARY_PATH || ''}` },
});

const context = await browser.newContext({ viewport: { width: 512, height: 512 }, deviceScaleFactor: 1 });
const page = await context.newPage();
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);

const p512 = path.join(publicDir, 'icon-512.png');
await page.screenshot({ path: p512, type: 'png' });
await browser.close();

const targets = [
  ['icon-192.png', 192, false],
  ['apple-touch-icon.png', 180, false],
  ['favicon-96x96.png', 96, true],
  ['favicon-48x48.png', 48, true],
  ['favicon-32x32.png', 32, true],
];

for (const [name, size, sharpen] of targets) {
  const args = [p512, '-filter', 'Lanczos', '-resize', `${size}x${size}`];
  if (sharpen) args.push('-unsharp', '0x0.6+0.65+0.02');
  args.push(path.join(publicDir, name));
  execFileSync('convert', args);
}

/* ملف favicon.ico متعدد الدقات (16 + 32 + 48) لزاحف Googlebot والمتصفحات */
const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sm-ico-'));
try {
  const p16 = path.join(tmpDir, '16.png');
  execFileSync('convert', [p512, '-filter', 'Lanczos', '-resize', '16x16', '-unsharp', '0x0.6+0.7+0.02', p16]);
  execFileSync('convert', [
    p16,
    path.join(publicDir, 'favicon-32x32.png'),
    path.join(publicDir, 'favicon-48x48.png'),
    path.join(publicDir, 'favicon.ico'),
  ]);
} finally {
  await fs.rm(tmpDir, { recursive: true, force: true });
}

/* نسخ WebP وAVIF المرافقة لـ icon-192 وicon-512 لتجنب بقاء أي أصل قديم */
for (const stem of ['icon-192', 'icon-512']) {
  const srcPng = path.join(publicDir, `${stem}.png`);
  execFileSync('convert', [srcPng, '-quality', '80', path.join(publicDir, `${stem}.webp`)]);
  execFileSync('convert', [srcPng, '-quality', '55', path.join(publicDir, `${stem}.avif`)]);
}

console.log('Generated Option 2 brand icons in website/public/.');
