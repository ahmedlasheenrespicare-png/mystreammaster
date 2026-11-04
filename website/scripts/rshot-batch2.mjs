import sparticuz from "@sparticuz/chromium";
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

process.env.LD_LIBRARY_PATH = "/tmp/al2023/lib:" + (process.env.LD_LIBRARY_PATH || "");
process.env.FONTCONFIG_PATH = "/tmp/fonts";
process.env.HOME = process.env.HOME || "/tmp";

const SLIDES = [
  ["bruno-fernandes-al-hilal-january-2026", "s1-bruno-hilal"],
  ["real-madrid-jj-gabriel-agreement-2026", "s2-jj-gabriel"],
];

mkdirSync("/home/user/shots", { recursive: true });

const browser = await chromium.launch({
  executablePath: await sparticuz.executablePath(),
  args: [...sparticuz.args, "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

await page.route("**/*", (route) => {
  const u = route.request().url();
  if (u.startsWith("http://localhost:3000")) return route.continue();
  return route.abort();
});

for (const [slug, out] of SLIDES) {
  try {
    await page.goto("http://localhost:3000/", { waitUntil: "load", timeout: 30000 });
    await page.waitForTimeout(4500);
    const link = page.locator(`a[href*="${slug}"]`).first();
    await link.waitFor({ state: "attached", timeout: 8000 });
    const ok = await page.evaluate((sl) => {
      const a = document.querySelector(`a[href*="${sl}"]`);
      const slide = a?.closest(".league-ticket-slide");
      if (!slide) return false;
      document.querySelectorAll(".league-ticket-slide").forEach((el) => el.classList.remove("is-active"));
      document.querySelectorAll(".league-ticket-dot").forEach((el) => el.classList.remove("is-active"));
      slide.classList.add("is-active");
      window.scrollTo(0, 0);
      return true;
    }, slug);
    if (!ok) { console.log("NOSLIDE", out); continue; }
    await page.waitForTimeout(900);
    const clip2 = await page.evaluate(() => {
      const t = document.querySelector('.league-ticket-slide.is-active [class*="league-ticket--match"], .league-ticket-slide.is-active [class*="league-ticket"]');
      const r = (t || document.querySelector(".league-ticket-slide.is-active")).getBoundingClientRect();
      return { x: Math.max(0, r.x - 6), y: Math.max(0, r.y - 6), width: Math.min(1440, r.width + 12), height: Math.min(1000, r.height + 12) };
    });
    await page.screenshot({ path: `/home/user/shots/${out}.png`, clip: clip2 });
    console.log("OK", out, JSON.stringify(clip2));
  } catch (e) {
    console.log("FAIL", out, String(e).slice(0, 140));
  }
}
await browser.close();
console.log("done");
