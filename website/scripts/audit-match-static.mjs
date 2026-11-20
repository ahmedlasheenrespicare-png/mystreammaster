// Diagnostic only: inspect the initial HTML, not Google indexing or the
// richer client-side state loaded after hydration. Run after a build:
// node website/scripts/audit-match-static.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';
import { matchCenterRouteIds } from '../src/content/match-center.mjs';
import { hasAdLoader } from './ads-guard.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const result = { routes: 0, missing: [], indexable: 0, noindex: 0, adLoaders: 0, docsOverHalf: 0, examples: [] };
const words = text => text.trim().split(/\s+/u).filter(Boolean).length;

for (const route of matchCenterRouteIds()) {
  let html;
  try { html = await fs.readFile(path.join(root, route.slice(1), 'index.html'), 'utf8'); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    result.missing.push(route);
    continue;
  }
  result.routes++;
  if (hasAdLoader(html)) result.adLoaders++;
  const $ = load(html);
  const noindex = /\bnoindex\b/i.test($('meta[name="robots"]').attr('content') || '');
  if (noindex) { result.noindex++; continue; }
  result.indexable++;
  $('main script, main style, main noscript').remove();
  const mainWords = words($('main').text());
  const docsWords = words($('main .mc-docs').text());
  if (mainWords && docsWords / mainWords > 0.5) {
    result.docsOverHalf++;
    if (result.examples.length < 3) result.examples.push({ route, mainWords, docsWords });
  }
}

console.log(JSON.stringify(result, null, 2));
console.log('Initial HTML only; word counts are rough diagnostics, not Google requirements or a quality verdict.');
if (result.missing.length) process.exitCode = 1;
