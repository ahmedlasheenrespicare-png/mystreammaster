import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium as playwrightChromium } from "@playwright/test";
import sparticuzChromium, { inflate } from "@sparticuz/chromium";
import { CHANNEL_CATEGORY_LINKS } from "../src/navigation.mjs";

const website = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fontRegular = await fs.readFile(path.join(website, "public/fonts/tajawal-arabic-400-normal.woff2"));
const fontBlack = await fs.readFile(path.join(website, "public/fonts/tajawal-arabic-900-normal.woff2"));
const colors = ["#d8ff3e", "#3effe0", "#ff6b63", "#9d8cff", "#70b7ff", "#f7ca60", "#ff9ecf", "#54e2b7", "#b5a0ff"];

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[char]);

const libraries = await inflate(path.resolve(website, "node_modules/@sparticuz/chromium/bin/al2023.tar.br"));
const browser = await playwrightChromium.launch({
  executablePath: await sparticuzChromium.executablePath(),
  args: sparticuzChromium.args.filter((arg) => !["--single-process", "--disable-web-security"].includes(arg)),
  env: { ...process.env, LD_LIBRARY_PATH: `${libraries}/lib:${process.env.LD_LIBRARY_PATH || ""}` },
});

try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  for (const [index, category] of CHANNEL_CATEGORY_LINKS.entries()) {
    const accent = colors[index % colors.length];
    const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8"><style>
@font-face { font-family: Tajawal; src: url(data:font/woff2;base64,${fontRegular.toString("base64")}) format("woff2"); font-weight: 400; }
@font-face { font-family: Tajawal; src: url(data:font/woff2;base64,${fontBlack.toString("base64")}) format("woff2"); font-weight: 900; }
* { box-sizing: border-box; }
html, body { width: 1200px; height: 630px; margin: 0; overflow: hidden; }
body { font-family: Tajawal, sans-serif; color: #fff; }
.cover { position: relative; isolation: isolate; width: 1200px; height: 630px; overflow: hidden; background: linear-gradient(116deg, #120d22 0%, #21102f 52%, #351435 100%); }
.cover::before { content: ""; position: absolute; z-index: -1; inset: -220px -150px auto auto; width: 700px; height: 700px; border-radius: 50%; background: radial-gradient(circle, ${accent}35 0%, ${accent}12 42%, transparent 70%); }
.cover::after { content: ""; position: absolute; z-index: -1; inset: auto auto -470px -170px; width: 760px; height: 760px; border: 1px solid #ffffff12; border-radius: 50%; box-shadow: 0 0 0 38px #ffffff08, 0 0 0 78px #ffffff06, 0 0 0 120px #ffffff04; }
.grid { position:absolute; inset:0; opacity:.14; background-image: linear-gradient(#ffffff12 1px, transparent 1px), linear-gradient(90deg, #ffffff12 1px, transparent 1px); background-size: 54px 54px; mask-image: linear-gradient(135deg, black, transparent 72%); }
.art { position:absolute; left:94px; top:151px; width:310px; height:310px; border:1px solid #ffffff24; border-radius:50%; display:grid; place-items:center; color:${accent}; }
.art::before, .art::after { content:""; position:absolute; border:1px solid ${accent}35; border-radius:50%; }
.art::before { inset:27px; }
.art::after { inset:58px; }
.art-mark { width:98px; height:98px; border-radius:32px; background:${accent}; color:#111; display:grid; place-items:center; box-shadow:0 20px 55px ${accent}30; }
.art-mark svg { width:54px; height:54px; }
.copy { position:absolute; right:92px; top:91px; width:690px; text-align:right; }
.kicker { display:inline-flex; align-items:center; gap:12px; color:${accent}; font-weight:900; font-size:23px; letter-spacing:.02em; }
.kicker::after { content:""; display:block; width:42px; height:3px; border-radius:4px; background:${accent}; }
h1 { margin:61px 0 0; font-size:77px; line-height:1.22; letter-spacing:-.03em; font-weight:900; max-width:690px; text-wrap:balance; }
.sub { margin-top:24px; color:#ffffffb8; font-weight:400; font-size:30px; line-height:1.5; }
.rule { position:absolute; right:92px; bottom:105px; width:114px; height:5px; border-radius:5px; background:linear-gradient(90deg, ${accent}, #3effe0); }
.note { position:absolute; right:92px; bottom:62px; color:#ffffff76; font-size:18px; font-weight:400; }
</style></head>
<body><main class="cover"><div class="grid"></div><div class="art" aria-hidden="true"><div class="art-mark"><svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><rect x="12" y="10" width="40" height="44" rx="8"/><path d="M24 23h4m8 0h8M24 33h4m8 0h8M24 43h4m8 0h8"/></svg></div></div><div class="copy"><div class="kicker">دليل المشاهدة الرسمية</div><h1>${escapeHtml(category.label)}</h1><div class="sub">روابط الجهات الأصلية · التصنيف: ${escapeHtml(category.sourceCategory)}</div></div><div class="rule"></div><div class="note">توافر المحتوى وشروطه لدى الجهة نفسها</div></main></body></html>`;
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    const output = path.join(website, `public/images/og/channels-${category.slug}.png`);
    await page.screenshot({ path: output, type: "png" });
    console.log(`✓ ${path.basename(output)} — 1200×630`);
  }
} finally {
  await browser.close();
}
