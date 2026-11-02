import sparticuz from "@sparticuz/chromium";
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

process.env.LD_LIBRARY_PATH = "/tmp/al2023/lib:" + (process.env.LD_LIBRARY_PATH || "");
process.env.FONTCONFIG_PATH = "/tmp/fonts";
process.env.HOME = process.env.HOME || "/tmp";

const SLIDES = [
  ["al-ahly-al-sadd-acl-elite-2026", "s1-ahli-sadd"],
  ["ahly-umotah-pressure-2026", "s2-ahly-umotah"],
  ["zamalek-gamal-form-2026", "s3-zamalek-gamal"],
  ["barcelona-alaves-6-1-2026", "s4-barca-alaves"],
  ["lazio-best-start-2026", "s5-lazio-start"],
  ["milan-beats-inter-derby-2026", "s6-milan-derby"],
  ["juventus-beats-napoli-2026", "s7-juventus-napoli"],
  ["bayern-saibari-surgery-gnabry-injury-2026", "s8-bayern-saibari"],
  ["bayern-munich-top-2026", "s9-bayern-top"],
  ["real-madrid-racing-santander-2026", "s10-real-racing"],
  ["arsenal-liverpool-1-0-2026", "s11-arsenal-liverpool"],
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
    await page.screenshot({ path: `/home/user/shots/${out}.png`, clip: { x: 136, y: 307, width: 978, height: 273 } });
    console.log("OK", out);
  } catch (e) {
    console.log("FAIL", out, String(e).slice(0, 140));
  }
}
await browser.close();
console.log("done");
