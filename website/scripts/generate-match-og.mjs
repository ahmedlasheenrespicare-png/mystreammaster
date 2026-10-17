/**
 * صور مشاركة مركز المباراة 1200×630 — توليد محلي على نمط
 * `generate-channel-og.mjs` (Chromium + Tajawal مضمّن)، وبهوية مركز
 * المباراة الداكنة نفسها (#080b12 / بنفسجي / ليمي).
 *
 * الاستخدام:
 *   node scripts/generate-match-og.mjs                 → الصور التمهيدية لكل مباراة مسجلة
 *   node scripts/generate-match-og.mjs --missing-only  → إنشاء الصور التمهيدية غير الموجودة فقط
 *   node scripts/generate-match-og.mjs --final <read.json> → صورة نهائية من قراءة مؤكدة
 *
 * القاعدة الحاكمة (تقرير التغطية §3.3): لا تُرسم نتيجة إلا من قراءة
 * مؤكدة بحالة منتهية ووقت قراءة حقيقي. الصورة التمهيدية تحمل الفريقين
 * والمسابقة والموعد والملعب فقط — **بلا أي نتيجة**. والنهائية ترفض
 * أي إدخال لا يثبت اكتماله، فلا توجد صورة بنتيجة افتراضية أو قديمة
 * بلا وسم وقتها.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium as playwrightChromium } from "@playwright/test";
import sparticuzChromium, { inflate } from "@sparticuz/chromium";
import { MATCH_CENTER_ALL_MATCHES } from "../src/content/match-center.mjs";
import { dayLabelInZone, isValidScore, kickoffLabel } from "../src/lib/match-center.mjs";

const website = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fontRegular = await fs.readFile(path.join(website, "public/fonts/tajawal-arabic-400-normal.woff2"));
const fontBlack = await fs.readFile(path.join(website, "public/fonts/tajawal-arabic-900-normal.woff2"));

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[char]);

const baseCss = `
@font-face { font-family: Tajawal; src: url(data:font/woff2;base64,${fontRegular.toString("base64")}) format("woff2"); font-weight: 400; }
@font-face { font-family: Tajawal; src: url(data:font/woff2;base64,${fontBlack.toString("base64")}) format("woff2"); font-weight: 900; }
* { box-sizing: border-box; }
html, body { width: 1200px; height: 630px; margin: 0; overflow: hidden; }
body { font-family: Tajawal, sans-serif; color: #f5f7fb; background: #080b12; }
.cover { position: relative; width: 1200px; height: 630px; overflow: hidden; padding: 64px 72px;
  background: radial-gradient(720px 460px at 88% -10%, rgba(124,92,255,.34), transparent 62%),
              radial-gradient(640px 420px at -6% 108%, rgba(216,255,62,.14), transparent 60%), #080b12; }
.grid { position: absolute; inset: 0; opacity: .10;
  background-image: linear-gradient(#ffffff14 1px, transparent 1px), linear-gradient(90deg, #ffffff14 1px, transparent 1px);
  background-size: 54px 54px; }
.kicker { color: #d8ff3e; font-weight: 900; font-size: 25px; }
.teams { margin-top: 40px; font-size: 84px; font-weight: 900; line-height: 1.25; }
.vs { color: #7c5cff; font-size: 44px; padding: 0 14px; }
.facts { margin-top: 34px; color: #a7b0bf; font-size: 30px; line-height: 1.7; }
.foot { position: absolute; right: 72px; left: 72px; bottom: 52px; display: flex; justify-content: space-between;
  color: #a7b0bf; font-size: 21px; border-top: 1px solid rgba(255,255,255,.12); padding-top: 22px; }
.score { margin-top: 26px; font-size: 120px; font-weight: 900; direction: ltr; text-align: right; }
.score b.home { color: #cfc4ff; } .score b.away { color: #d8ff3e; } .score span { color: #a7b0bf; font-size: 60px; padding: 0 18px; }
.stats { margin-top: 30px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px 28px; direction: rtl; }
.stat { background: rgba(255,255,255,.045); border: 1px solid rgba(255,255,255,.09); border-radius: 14px; padding: 16px 18px; }
.stat .v { font-size: 34px; font-weight: 900; direction: ltr; }
.stat .v i { font-style: normal; color: #a7b0bf; font-size: 22px; padding: 0 8px; }
.stat .l { color: #a7b0bf; font-size: 21px; margin-top: 4px; }
.ltr { direction: ltr; unicode-bidi: isolate; display: inline-block; }
`;

const cleanText = (value) => typeof value === "string" && value.trim() ? value.trim() : null;
const sourceNumber = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

/** الصورة التمهيدية: هوية المباراة فقط — لا نتيجة فيها بحال. */
function previewHtml(match) {
  let kickoff = null;
  if (cleanText(match.kickoffUtc)) {
    try {
      const day = dayLabelInZone(match.kickoffUtc, "Africa/Cairo");
      const time = kickoffLabel(match.kickoffUtc, "Africa/Cairo");
      kickoff = `${day} · ${time} بتوقيت القاهرة`;
    } catch { kickoff = null; }
  }
  const competition = cleanText(match.competitionName);
  const season = cleanText(match.season);
  const venue = cleanText(match.venue);
  const kicker = ["مركز المباراة", competition, season].filter(Boolean).join(" · ");
  const facts = [kickoff, venue ? `الملعب: ${venue}` : null].filter(Boolean);
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>${baseCss}</style></head>
<body><main class="cover"><div class="grid"></div>
<div class="kicker">${escapeHtml(kicker)}</div>
<div class="teams">${escapeHtml(match.home.name)}<span class="vs">ضد</span>${escapeHtml(match.away.name)}</div>
${facts.length ? `<div class="facts">${facts.map(escapeHtml).join("<br>")}</div>` : ""}
<div class="foot"><span>النتيجة والأحداث من المصدر وقت حدوثها — لا تُعرض نتيجة قبل البداية</span><span>ستريم ماستر برو</span></div>
</main></body></html>`;
}

const COMPLETED = new Set(["full_time", "finished", "final", "post", "completed", "انتهت"]);

/**
 * الصورة النهائية من قراءة مؤكدة وحدها. أي نقص يوقف التوليد — صورة
 * بنتيجة منقوصة التوثيق أسوأ من لا صورة.
 */
function finalHtml(match, read) {
  const status = String(read?.status?.code ?? read?.status ?? "").toLowerCase();
  if (!COMPLETED.has(status)) throw new Error(`refused: status is not completed (${status || "absent"})`);
  const competition = cleanText(match.competitionName);
  const score = read?.score;
  if (!isValidScore(score)) throw new Error("refused: confirmed score missing");
  if (typeof read?.readAt !== "string" || Number.isNaN(Date.parse(read.readAt))) throw new Error("refused: real readAt missing");
  const stats = (Array.isArray(read.statistics) ? read.statistics : [])
    .map((stat) => ({
      label: cleanText(stat?.label),
      home: sourceNumber(stat?.home),
      away: sourceNumber(stat?.away),
      unit: cleanText(stat?.unit),
    }))
    .filter((stat) => stat.label && stat.home !== null && stat.away !== null)
    .slice(0, 6);
  const statCards = stats.map((stat) => `
    <div class="stat"><div class="v">${stat.home}<i>:</i>${stat.away}${stat.unit ? ` <i>${escapeHtml(stat.unit)}</i>` : ""}</div><div class="l">${escapeHtml(stat.label)}</div></div>`).join("");
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>${baseCss}.teams{font-size:56px;margin-top:26px}</style></head>
<body><main class="cover"><div class="grid"></div>
<div class="kicker">نتيجة نهائية مؤكدة${competition ? ` · ${escapeHtml(competition)}` : ""}</div>
<div class="teams">${escapeHtml(match.home.name)}<span class="vs">×</span>${escapeHtml(match.away.name)}</div>
<div class="score"><b class="home">${score.home}</b><span>–</span><b class="away">${score.away}</b></div>
${stats.length ? `<div class="stats">${statCards}</div>` : ""}
<div class="foot"><span>قراءة مؤكدة: ${escapeHtml(new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Cairo" }).format(new Date(read.readAt)))} بتوقيت القاهرة</span><span>ستريم ماستر برو</span></div>
</main></body></html>`;
}

const libraries = await inflate(path.resolve(website, "node_modules/@sparticuz/chromium/bin/al2023.tar.br"));
const browser = await playwrightChromium.launch({
  executablePath: await sparticuzChromium.executablePath(),
  args: sparticuzChromium.args.filter((arg) => !["--single-process", "--disable-web-security"].includes(arg)),
  env: { ...process.env, LD_LIBRARY_PATH: `${libraries}/lib:${process.env.LD_LIBRARY_PATH || ""}` },
});

try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  const render = async (html, outName) => {
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    const output = path.join(website, `public/images/og/${outName}`);
    await page.screenshot({ path: output, type: "png" });
    console.log(`✓ ${outName} — 1200×630`);
  };

  const finalArg = process.argv.indexOf("--final");
  if (finalArg !== -1) {
    const read = JSON.parse(await fs.readFile(process.argv[finalArg + 1], "utf8"));
    const match = MATCH_CENTER_ALL_MATCHES.find((m) => m.slug === read?.match || m.id === read?.match);
    if (!match) throw new Error(`refused: unknown match (${read?.match ?? "absent"})`);
    await render(finalHtml(match, read), `match-${match.slug}-final.png`);
  } else {
    const missingOnly = process.argv.includes("--missing-only");
    const matchesToRender = [];
    for (const match of MATCH_CENTER_ALL_MATCHES) {
      if (missingOnly) {
        const file = path.join(website, "public/images/og", `match-${match.slug}.png`);
        try {
          await fs.access(file);
          continue;
        } catch (error) {
          if (error?.code !== "ENOENT") throw error;
        }
      }
      matchesToRender.push(match);
    }
    if (missingOnly) console.log(`Generating ${matchesToRender.length} missing preview image(s).`);
    for (const match of matchesToRender) {
      await render(previewHtml(match), `match-${match.slug}.png`);
    }
  }
} finally {
  await browser.close();
}
