import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const preview = path.resolve('../home-preview/saved-reference/assets');
const flow = fs.readFileSync(path.join(preview, 'section-flow.js'), 'utf8');
const sectionMotion = fs.readFileSync(path.join(preview, 'section-motion.js'), 'utf8');
const styles = [
  ['saved', fs.readFileSync(path.join(preview, 'editorial-preview.css'), 'utf8')],
  ['production', fs.readFileSync(path.resolve('assets/home-hero/section-motion.css'), 'utf8')],
] as const;

for (const [name, css] of styles) for (const width of [390, 1440]) {
  test(`${name} heading movement is stable and reversible at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.setContent('<html data-motion-reduced="false" data-motion="on"><body style="margin:0"><div id="smooth-content"><div style="height:900px"></div><section id="league-strip" style="height:1000px"><div class="sm-leagues__top"><h2>عنوان واضح</h2><p>نص</p></div></section><div style="height:1500px"></div></div></body></html>');
    await page.addStyleTag({ content: css });
    await page.evaluate(() => {
      // Exercise every group without the asynchronous observer, leaving the
      // actual geometry and animation calculation to the browser.
      delete (window as any).IntersectionObserver;
      (window as any).smMotion = { matches: false, addEventListener() {} };
    });
    await page.addScriptTag({ content: sectionMotion });
    await page.addScriptTag({ content: flow });
    await page.evaluate(() => window.scrollTo(0, 120));
    const section = page.locator('#league-strip'), anchor = section.locator('.sm-leagues__top'), heading = anchor.locator('h2');
    await expect.poll(async () => Number(await anchor.getAttribute('data-flow-overall'))).toBeGreaterThan(0);
    await page.waitForTimeout(1300);
    const before = Number(await anchor.getAttribute('data-flow-overall'));
    await section.evaluate(el => {
      (el as HTMLElement).style.setProperty('transition', 'none', 'important');
      (el as HTMLElement).style.setProperty('translate', '0 80px', 'important');
      window.dispatchEvent(new Event('sm-smooth-scroll'));
    });
    await page.waitForTimeout(400);
    const after = Number(await anchor.getAttribute('data-flow-overall'));
    expect(Math.abs(after - before)).toBeLessThan(.02);
    await expect(heading).toHaveCSS('opacity', '1');
    await expect(heading).toHaveCSS('transition-duration', '0s');
    await page.evaluate(() => window.scrollBy(0, 180));
    await expect.poll(async () => Number(await anchor.getAttribute('data-flow-overall'))).toBeGreaterThan(after);
    await page.waitForTimeout(1300);
    const forward = Number(await heading.evaluate(el => parseFloat((el as HTMLElement).style.getPropertyValue('--entry-x'))));
    await page.evaluate(() => window.scrollBy(0, -180));
    await expect.poll(async () => Number(await anchor.getAttribute('data-flow-overall'))).toBeLessThan(after + .02);
    await page.waitForTimeout(1300);
    const backward = Number(await heading.evaluate(el => parseFloat((el as HTMLElement).style.getPropertyValue('--entry-x'))));
    expect(backward).toBeGreaterThan(forward);
  });
}
