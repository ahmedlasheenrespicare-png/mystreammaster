import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium as playwrightChromium } from "@playwright/test";
import sparticuzChromium, { inflate } from "@sparticuz/chromium";

const website = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fontRegular = await fs.readFile(path.join(website, "public/fonts/tajawal-arabic-400-normal.woff2"));
const fontBlack = await fs.readFile(path.join(website, "public/fonts/tajawal-arabic-900-normal.woff2"));
const ticketLogo = await fs.readFile(path.join(website, "public/images/brand/xtv-ticket.png"));
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
@font-face { font-family: Tajawal; src: url(data:font/woff2;base64,${fontRegular.toString("base64")}) format("woff2"); font-weight: 400; }
@font-face { font-family: Tajawal; src: url(data:font/woff2;base64,${fontBlack.toString("base64")}) format("woff2"); font-weight: 900; }
* { box-sizing: border-box; }
html, body { width: 1200px; height: 630px; margin: 0; overflow: hidden; }
body { font-family: Tajawal, sans-serif; color: #fff; }
.cover { position: relative; isolation: isolate; width: 1200px; height: 630px; overflow: hidden; background: linear-gradient(118deg, #0b0b0f 0%, #151116 58%, #261014 100%); }
.cover::before { content: ""; position: absolute; z-index: -1; inset: -290px -80px auto auto; width: 760px; height: 760px; border-radius: 50%; background: radial-gradient(circle, #ed1c2445 0%, #ed1c2415 44%, transparent 70%); }
.cover::after { content: ""; position: absolute; z-index: -1; inset: auto auto -440px -190px; width: 790px; height: 790px; border: 1px solid #ffffff12; border-radius: 50%; box-shadow: 0 0 0 38px #ffffff08, 0 0 0 78px #ffffff06, 0 0 0 120px #ffffff04; }
.grid { position: absolute; inset: 0; opacity: .12; background-image: linear-gradient(#ffffff12 1px, transparent 1px), linear-gradient(90deg, #ffffff12 1px, transparent 1px); background-size: 56px 56px; mask-image: linear-gradient(135deg, black, transparent 76%); }
.logo { position: absolute; left: 78px; top: 188px; width: 330px; height: 250px; display: grid; place-items: center; border: 1px solid #ffffff22; border-radius: 42px; background: linear-gradient(145deg, #ffffff0c, #ffffff03); box-shadow: 0 35px 90px #0008; }
.logo img { width: 250px; height: auto; object-fit: contain; filter: drop-shadow(0 12px 28px #ed1c2440); }
.copy { position: absolute; right: 86px; top: 78px; width: 680px; text-align: right; }
.brand { color: #ffffff70; font-size: 20px; font-weight: 700; letter-spacing: .04em; }
.kicker { display: inline-flex; align-items: center; gap: 12px; margin-top: 40px; color: #ff7378; font-size: 23px; font-weight: 900; }
.kicker::after { content: ""; display: block; width: 42px; height: 3px; border-radius: 4px; background: #ed1c24; }
h1 { margin: 10px 0 0; font-size: 86px; line-height: 1.18; letter-spacing: -.03em; font-weight: 900; }
.sub { margin-top: 14px; color: #ffffffa8; font-size: 27px; line-height: 1.5; font-weight: 400; }
.price { display: flex; align-items: baseline; gap: 12px; margin-top: 33px; }
.price strong { color: #d8ff3e; font-size: 65px; line-height: 1; font-weight: 900; }
.price span { color: #ffffff80; font-size: 25px; font-weight: 700; }
.rule { position: absolute; right: 86px; bottom: 59px; width: 116px; height: 5px; border-radius: 5px; background: linear-gradient(90deg, #ed1c24, #ff7378); }
</style></head>
<body><main class="cover"><div class="grid"></div><div class="logo"><img alt="" src="data:image/png;base64,${ticketLogo.toString("base64")}"></div><div class="copy"><div class="brand">STREAM MASTER PRO</div><div class="kicker">باقة تفعيل وربط تقني</div><h1>سيرفر X</h1><div class="sub">تفعيل بيانات المزود · إعداد المشغّل · دعم فني</div><div class="price"><strong>$20</strong><span>لمدة 12 شهراً</span></div></div><div class="rule"></div></main></body></html>`;
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  const output = path.join(website, "public/images/og/x.png");
  await page.screenshot({ path: output, type: "png" });
  console.log(`✓ ${output} — 1200×630`);
} finally {
  await browser.close();
}
