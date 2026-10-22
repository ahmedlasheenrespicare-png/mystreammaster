/* ==========================================================================
   صورة مشاركة مقال «أفضل سيرفر IPTV في مصر» — 1200×630
   • تُولَّد محلياً بـ Chromium (لا تُنشأ وقت البناء ولا تعتمد على الشبكة).
   • الخطوط العربية واللاتينية تُضمَّن من ملفات @fontsource داخل node_modules،
     لأن خط Tajawal المنشور في public/fonts مقتطع على العربية فقط ويُظهر
     «IPTV» كمربع فارغ (وهو خلل ظاهر في صورة مقال 2026 القديمة).
   • التشغيل: node scripts/generate-egypt-og.mjs
========================================================================== */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium as playwrightChromium } from "@playwright/test";
import sparticuzChromium, { inflate } from "@sparticuz/chromium";

const website = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFile(path.join(website, p));

const [arRegular, arBlack, latMedium, latBold] = await Promise.all([
  read("node_modules/@fontsource/tajawal/files/tajawal-arabic-400-normal.woff2"),
  read("node_modules/@fontsource/tajawal/files/tajawal-arabic-900-normal.woff2"),
  read("node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-500-normal.woff2"),
  read("node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff2"),
]);

const fontFace = (family, data, weight, range) =>
  `@font-face { font-family: ${family}; src: url(data:font/woff2;base64,${data.toString("base64")}) format("woff2"); font-weight: ${weight}; font-display: block; unicode-range: ${range}; }`;

const libraries = await inflate(path.resolve(website, "node_modules/@sparticuz/chromium/bin/al2023.tar.br"));
const browser = await playwrightChromium.launch({
  executablePath: await sparticuzChromium.executablePath(),
  args: sparticuzChromium.args.filter((arg) => !["--single-process", "--disable-web-security"].includes(arg)),
  env: { ...process.env, LD_LIBRARY_PATH: `${libraries}/lib:${process.env.LD_LIBRARY_PATH || ""}` },
});

try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8"><style>
${fontFace("Tajawal", arRegular, 400, "U+0600-06FF, U+0750-077F, U+FB50-FDFF, U+FE70-FEFF")}
${fontFace("Tajawal", arBlack, 900, "U+0600-06FF, U+0750-077F, U+FB50-FDFF, U+FE70-FEFF")}
${fontFace("Grotesk", latMedium, 500, "U+0000-00FF")}
${fontFace("Grotesk", latBold, 700, "U+0000-00FF")}
* { box-sizing: border-box; }
html, body { width: 1200px; height: 630px; margin: 0; overflow: hidden; }
body { font-family: Tajawal, Grotesk, sans-serif; color: #fff; }
.cover { position: relative; width: 1200px; height: 630px; overflow: hidden; background: #0b0b0f; }
.cover::before { content: ""; position: absolute; inset: -240px -180px auto auto; width: 820px; height: 820px; border-radius: 50%; background: radial-gradient(circle, #d8ff3e2e 0%, #d8ff3e0d 42%, transparent 68%); }
.cover::after { content: ""; position: absolute; inset: auto auto -430px -260px; width: 780px; height: 780px; border: 1px solid #ffffff10; border-radius: 50%; box-shadow: 0 0 0 40px #ffffff08, 0 0 0 84px #ffffff05; }
.grid { position: absolute; inset: 0; opacity: .1; background-image: linear-gradient(#ffffff14 1px, transparent 1px), linear-gradient(90deg, #ffffff14 1px, transparent 1px); background-size: 58px 58px; mask-image: linear-gradient(140deg, #000, transparent 72%); }
.copy { position: absolute; inset: 0 84px 112px 84px; display: flex; flex-direction: column; justify-content: center; align-items: flex-start; text-align: right; }
.top { display: flex; align-items: center; gap: 12px; }
.brand { font-size: 21px; font-weight: 700; color: #ffffff78; letter-spacing: .02em; }
.dot { width: 9px; height: 9px; border-radius: 50%; background: #d8ff3e; box-shadow: 0 0 18px #d8ff3e; }
.kicker { display: inline-flex; align-items: center; gap: 12px; margin-top: 40px; color: #d8ff3e; font-size: 23px; font-weight: 700; }
.kicker::after { content: ""; display: block; width: 46px; height: 3px; border-radius: 4px; background: #d8ff3e; }
h1 { margin: 14px 0 0; font-size: 70px; line-height: 1.2; letter-spacing: -.015em; font-weight: 900; white-space: nowrap; }
h1 .lat { font-family: Grotesk, Tajawal, sans-serif; font-weight: 700; font-size: 58px; letter-spacing: -.01em; color: #d8ff3e; }
.sub { margin-top: 24px; color: #ffffffa6; font-size: 27px; line-height: 1.5; font-weight: 400; }
.pills { position: absolute; right: 84px; bottom: 56px; display: flex; gap: 12px; }
.pill { border: 1px solid #ffffff1f; background: #ffffff0a; color: #ffffffc7; border-radius: 999px; padding: 10px 24px; font-size: 22px; font-weight: 700; }
.pill.lime { border-color: #d8ff3e55; background: #d8ff3e14; color: #d8ff3e; }
.year { position: absolute; left: 78px; bottom: 52px; font-family: Grotesk, sans-serif; font-size: 62px; font-weight: 700; color: #ffffff10; letter-spacing: -.02em; }
</style></head>
<body><main class="cover"><div class="grid"></div><div class="copy">
<div class="top"><span class="dot"></span><span class="brand">ستريم ماستر برو</span></div>
<div class="kicker">دليل السوق المصري</div>
<h1>أفضل سيرفر <span class="lat">IPTV</span> في مصر</h1>
<div class="sub">مقارنة السيرفرات الأربعة · أسعار بالجنيه المصري · اختبار قبل الدفع</div>
</div><div class="pills"><span class="pill lime">نوفا</span><span class="pill">إيستار</span><span class="pill">موكا</span><span class="pill">X</span></div><div class="year">2026</div></main></body></html>`;

  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  const output = path.join(website, "public/images/og/blog-iptv-egypt.png");
  await page.screenshot({ path: output, type: "png" });
  console.log(`✓ ${output} — 1200×630`);
} finally {
  await browser.close();
}
