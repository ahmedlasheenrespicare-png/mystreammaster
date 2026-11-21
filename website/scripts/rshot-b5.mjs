import sparticuz, { inflate } from "@sparticuz/chromium";
import { chromium } from "playwright";
import path from "node:path";
import { mkdirSync } from "node:fs";

const libraries = await inflate(path.resolve("node_modules/@sparticuz/chromium/bin/al2023.tar.br"));
process.env.LD_LIBRARY_PATH = `${libraries}/lib:` + (process.env.LD_LIBRARY_PATH || "");
process.env.HOME = process.env.HOME || "/tmp";
mkdirSync("/home/user/shots", { recursive: true });
const BASE = "http://localhost:3002";

/* الشرائح الست الجديدة في قسم «أخبار الرياضة»: نلتقط التذكرة نفسها من الصفحة الرئيسية */
const SLUGS = [
  ["european-leagues-return-21-november-2026", "b5-s1-leagues"],
  ["bayern-cologne-kane-injury-2026", "b5-ref-kane"],
  ["tom-brady-chelsea-investment-2026", "b5-s2-brady"],
  ["fifa-presidential-election-nominations-2027", "b5-s3-fifa"],
  ["morocco-fifa-ranking-fifth-november-2026", "b5-s4-morocco"],
  ["messi-mls-salary-report-2026", "b5-s5-messi"],
  ["ivan-toney-saudi-top-scorer-november-2026", "b5-s6-toney"],
];

const browser = await chromium.launch({
  executablePath: await sparticuz.executablePath(),
  args: [...sparticuz.args.filter((a) => !["--single-process", "--disable-web-security"].includes(a)), "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  env: { ...process.env, LD_LIBRARY_PATH: `${libraries}/lib:${process.env.LD_LIBRARY_PATH || ""}` },
});

/* شريط الأخبار: كل التذاكر مرتّبة أفقياً — نُمرّر حتى تذكرة الخبر ثم نصوّرها */
for (const [slug, out] of SLUGS) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
  await page.route("**/*", (route) => {
    const url = route.request().url();
    if (url.startsWith(BASE)) return route.continue();
    return route.abort();
  });
  await page.goto(`${BASE}/`, { waitUntil: "load", timeout: 45000 });
  await page.waitForTimeout(3500);
  const box = await page.evaluate((s) => {
    const sec = document.querySelector("#sports-news");
    const cards = [...sec.querySelectorAll(".sm-news__ticket")];
    const target = cards.find((c) => (c.getAttribute("href") || "").includes(s));
    if (!target) return null;
    /* إيقاف أي تمرير تلقائي: نُبقي البطاقة الهدف وحدها مرئية */
    cards.forEach((c) => { c.style.display = c === target ? "" : "none"; });
    const rail = sec.querySelector(".sm-news__rail");
    rail.style.scrollSnapType = "none";
    rail.scrollLeft = 0;
    target.scrollIntoView({ block: "center", inline: "start", behavior: "instant" });
    const r = target.getBoundingClientRect();
    return { x: Math.max(0, Math.round(r.x - 4)), y: Math.max(0, Math.round(r.y - 4)), width: Math.min(1440, Math.round(r.width) + 8), height: Math.min(1000, Math.round(r.height) + 8) };
  }, slug);
  if (!box) { console.log("NOCARD", slug); await page.close(); continue; }
  await page.waitForTimeout(900);
  await page.screenshot({ path: `/home/user/shots/${out}-card.png`, clip: box });
  console.log("OK", out, JSON.stringify(box));
  await page.close();
}

/* صفحة الخبر: الشريحة الداخلية */
for (const [slug, out] of [["tom-brady-chelsea-investment-2026", "b5-brady"], ["morocco-fifa-ranking-fifth-november-2026", "b5-morocco"], ["messi-mls-salary-report-2026", "b5-messi"]]) {
  for (const [tag, vp] of [["d", { width: 1200, height: 900 }], ["m", { width: 390, height: 844 }]]) {
    const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 2 });
    await page.route("**/*", (route) => {
      const url = route.request().url();
      if (url.startsWith(BASE)) return route.continue();
      return route.abort();
    });
    await page.goto(`${BASE}/news/${slug}/`, { waitUntil: "load", timeout: 45000 });
    await page.waitForTimeout(700);
    const slide = page.locator(".news-slide").first();
    if (!(await slide.count())) { console.log("NOSLIDE", slug); await page.close(); continue; }
    await slide.screenshot({ path: `/home/user/shots/${out}-${tag}-slide.png` });
    console.log("OK slide", out, tag);
    await page.close();
  }
}
await browser.close();
