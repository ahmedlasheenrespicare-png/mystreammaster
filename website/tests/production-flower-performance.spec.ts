import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// Exercise the actual built production renderer, isolating unrelated footer
// WebGL and noise canvases so software-rendered Chromium remains usable in CI.
const assetDir = path.resolve('../_assets/reference-home');
const snapshots = fs.readdirSync(assetDir);
if (snapshots.length !== 1) throw new Error('Build the approved home before testing its flower');
let source = fs.readFileSync(path.join(assetDir, snapshots[0], 'main-D5MQsYQ6.js'), 'utf8');
const footerStart = source.indexOf(',function(){const smTarget=document.querySelector("#phone")');
const footerEnd = source.indexOf(';const Ay=document.querySelectorAll', footerStart);
if (footerStart < 0 || footerEnd < 0) throw new Error('Reference footer scene not found');
source = source.slice(0, footerStart) + source.slice(footerEnd);
const noiseStart = source.indexOf('window.addEventListener("load",()=>{My()&&function({patternSize:');
const noiseEnd = source.indexOf('document.addEventListener("DOMContentLoaded",()=>{const t=document.title', noiseStart);
if (noiseStart < 0 || noiseEnd < 0) throw new Error('Reference noise block not found');
source = source.slice(0, noiseStart) + source.slice(noiseEnd);
const render = 'd&&!window.smMotion.matches&&(d.rotation.y+=(.01+g)*m*smStep,f.current+=(1-Math.pow(.95,smStep))*(f.target-f.current),d.position.y=p+f.current),r.render(o,l)';
if (!source.includes(render)) throw new Error('Production flower renderer not found');
source = source.replace(render, render + ',d&&(document.getElementById("bannerCanvas").dataset.flowerRotation=String(d.rotation.y)),document.getElementById("bannerCanvas").dataset.flowerFrames=String(1+(+document.getElementById("bannerCanvas").dataset.flowerFrames||0))');

test('production flower animates at mobile resolution, avoids redundant resizes and sleeps off screen', async ({ browser }) => {
  test.setTimeout(120000);
  const context = await browser.newContext({ viewport: { width: 390, height: 700 }, deviceScaleFactor: 3, reducedMotion: 'no-preference' });
  const page = await context.newPage(); const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem('sm-motion-preference', 'on');
    (window as any).__flowerBufferWrites = 0;
    for (const key of ['width', 'height'] as const) {
      const descriptor = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, key)!;
      Object.defineProperty(HTMLCanvasElement.prototype, key, {
        ...descriptor,
        set(value) { if ((this as HTMLCanvasElement).id === 'bannerCanvas') (window as any).__flowerBufferWrites++; descriptor.set!.call(this, value); },
      });
    }
  });
  await page.route('**/main-D5MQsYQ6.js*', route => route.fulfill({ body: source, contentType: 'text/javascript' }));
  await page.route('**/*.mp4*', route => route.abort()); await page.route('https://**', route => route.abort());
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.addStyleTag({ content: '.loader,.nav{display:none!important}' });
  const canvas = page.locator('#bannerCanvas');
  await canvas.scrollIntoViewIfNeeded();
  await expect(canvas).toHaveAttribute('data-flower-rotation', /./, { timeout: 30000 });
  const beforeRotation = await canvas.getAttribute('data-flower-rotation');
  await expect.poll(() => canvas.getAttribute('data-flower-rotation'), { timeout: 20000 }).not.toBe(beforeRotation);
  const sizes = await canvas.evaluate((el: HTMLCanvasElement) => ({ width: el.width, height: el.height, rect: el.getBoundingClientRect().toJSON() }));
  expect(sizes.width / sizes.rect.width).toBeGreaterThan(0.99);
  expect(sizes.width / sizes.rect.width).toBeLessThanOrEqual(1);
  expect(sizes.height).toBeGreaterThan(0);
  await page.waitForTimeout(1200);
  const writes = await page.evaluate(() => (window as any).__flowerBufferWrites);
  await page.evaluate(() => { for (let i = 0; i < 5; i++) window.dispatchEvent(new Event('resize')); });
  await page.waitForTimeout(1000);
  expect(await page.evaluate(() => (window as any).__flowerBufferWrites)).toBe(writes);
  await page.locator('#cinema-library').scrollIntoViewIfNeeded(); await page.waitForTimeout(1500);
  const beforeFrames = Number(await canvas.getAttribute('data-flower-frames')); await page.waitForTimeout(1000);
  expect(Number(await canvas.getAttribute('data-flower-frames')) - beforeFrames).toBeLessThanOrEqual(1);
  await canvas.scrollIntoViewIfNeeded();
  await expect.poll(async () => Number(await canvas.getAttribute('data-flower-frames')), { timeout: 20000 }).toBeGreaterThan(beforeFrames);
  const setMotion = (value: string) => page.evaluate(value => { const select = document.querySelector<HTMLSelectElement>('#sm-motion-setting')!; select.value = value; select.dispatchEvent(new Event('change')); }, value);
  await setMotion('off'); await page.waitForTimeout(600);
  const stopped = await canvas.getAttribute('data-flower-rotation'); await page.waitForTimeout(1000);
  expect(await canvas.getAttribute('data-flower-rotation')).toBe(stopped);
  await setMotion('on');
  await expect.poll(() => canvas.getAttribute('data-flower-rotation'), { timeout: 20000 }).not.toBe(stopped);
  expect(errors).toEqual([]);
  await context.close();
});

test('production flower updates backing resolution across desktop and mobile breakpoints', async ({ browser }) => {
  test.setTimeout(120000);
  const context = await browser.newContext({ viewport: { width: 1080, height: 700 }, deviceScaleFactor: 1.5 });
  const page = await context.newPage(); const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('sm-motion-preference', 'off'));
  await page.route('**/main-D5MQsYQ6.js*', route => route.fulfill({ body: source, contentType: 'text/javascript' }));
  await page.route('**/*.mp4*', route => route.abort()); await page.route('https://**', route => route.abort());
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const canvas = page.locator('#bannerCanvas');
  await expect(canvas).toHaveAttribute('data-flower-rotation', /./, { timeout: 60000 });
  const ratio = () => canvas.evaluate((el: HTMLCanvasElement) => el.width / el.getBoundingClientRect().width);
  await expect.poll(ratio, { timeout: 20000 }).toBeCloseTo(1, 1);
  await page.setViewportSize({ width: 390, height: 700 });
  await expect.poll(ratio, { timeout: 20000 }).toBeCloseTo(1, 1);
  await page.setViewportSize({ width: 1080, height: 700 });
  await expect.poll(ratio, { timeout: 20000 }).toBeCloseTo(1, 1);
  expect(errors).toEqual([]);
  await context.close();
});

test('desktop flower keeps animating without raising the capped resolution', async ({ browser }) => {
  test.setTimeout(120000);
  const context = await browser.newContext({ viewport: { width: 1100, height: 700 }, deviceScaleFactor: 2, reducedMotion: 'no-preference' });
  const page = await context.newPage(); const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('sm-motion-preference', 'on'));
  await page.route('**/main-D5MQsYQ6.js*', route => route.fulfill({ body: source, contentType: 'text/javascript' }));
  await page.route('**/*.mp4*', route => route.abort()); await page.route('https://**', route => route.abort());
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.addStyleTag({ content: '.loader,.nav{display:none!important}' });
  const canvas = page.locator('#bannerCanvas');
  await canvas.scrollIntoViewIfNeeded();
  await expect(canvas).toHaveAttribute('data-flower-rotation', /./, { timeout: 60000 });
  const initial = await canvas.getAttribute('data-flower-rotation');
  await expect.poll(() => canvas.getAttribute('data-flower-rotation'), { timeout: 20000 }).not.toBe(initial);
  await page.waitForTimeout(4000);
  const dimensions = await canvas.evaluate((el: HTMLCanvasElement) => ({ ratio: el.width / el.getBoundingClientRect().width, width: el.width, height: el.height }));
  expect(dimensions.ratio).toBeCloseTo(1, 1);
  expect(dimensions.width).toBeGreaterThan(0); expect(dimensions.height).toBeGreaterThan(0);
  await page.locator('#cinema-library').scrollIntoViewIfNeeded(); await page.waitForTimeout(1500);
  const frames = Number(await canvas.getAttribute('data-flower-frames')); await page.waitForTimeout(1000);
  expect(Number(await canvas.getAttribute('data-flower-frames')) - frames).toBeLessThanOrEqual(1);
  await canvas.scrollIntoViewIfNeeded();
  await expect.poll(async () => Number(await canvas.getAttribute('data-flower-frames')), { timeout: 20000 }).toBeGreaterThan(frames);
  expect(errors).toEqual([]);
  await context.close();
});
