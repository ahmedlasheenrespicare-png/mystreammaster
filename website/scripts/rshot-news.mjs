import sparticuz, { inflate } from "@sparticuz/chromium";
import { chromium } from "playwright";
import path from "node:path";
import { mkdirSync } from "node:fs";

const libraries = await inflate(path.resolve("node_modules/@sparticuz/chromium/bin/al2023.tar.br"));
process.env.LD_LIBRARY_PATH = `${libraries}/lib:` + (process.env.LD_LIBRARY_PATH || "");
process.env.HOME = process.env.HOME || "/tmp";

const PAGES = process.argv.slice(2);
const targets = PAGES.length
  ? PAGES.map((slug) => [slug, "news-" + slug])
  : [
      ["egypt-hossam-hassan-ali-maher-2026", "n1-maher"],
      ["barcelona-atletico-flick-selection-2026", "n2-kounde"],
      ["como-lens-9-1-2026", "n3-como"],
    ];

mkdirSync("/home/user/shots", { recursive: true });

const browser = await chromium.launch({
  executablePath: await sparticuz.executablePath(),
  args: [...sparticuz.args.filter((a) => !["--single-process", "--disable-web-security"].includes(a)), "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  env: { ...process.env, LD_LIBRARY_PATH: `${libraries}/lib:${process.env.LD_LIBRARY_PATH || ""}` },
});

try {
  for (const [slug, out] of targets) {
    for (const [tag, viewport] of [["d", { width: 1200, height: 900 }], ["m", { width: 390, height: 844 }]]) {
      const page = await browser.newPage({ viewport, deviceScaleFactor: 2 });
      await page.route("**/*", (route) => {
        const url = route.request().url();
        if (url.startsWith("http://localhost:3000")) return route.continue();
        return route.abort();
      });
      await page.goto(`http://localhost:3000/news/${slug}/`, { waitUntil: "load", timeout: 30000 });
      await page.waitForTimeout(700);
      const slide = page.locator(".news-slide").first();
      const box = await slide.boundingBox();
      if (!box) { console.log("NOSLIDE", slug); await page.close(); continue; }
      await slide.screenshot({ path: `/home/user/shots/${out}-${tag}-slide.png` });
      await page.screenshot({ path: `/home/user/shots/${out}-${tag}-top.png`, clip: { x: 0, y: 0, width: viewport.width, height: Math.min(viewport.height, box.y + box.height + 40) } });
      console.log("OK", out, tag, Math.round(box.width), "x", Math.round(box.height));
      await page.close();
    }
  }
} finally {
  await browser.close();
}
console.log("done");
