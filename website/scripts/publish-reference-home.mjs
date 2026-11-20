/* Publish the approved, immutable home snapshot after the regular prerender.
 * The separate noindex reference remains editable and is never the source of
 * a deployment until a new snapshot is deliberately approved. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';
import sharp from 'sharp';
import { APPROVED_HOME_SNAPSHOT } from './approved-home-snapshot.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const website = path.join(root, 'website');
const candidate = path.join(root, 'home-preview/release-candidate');
const output = path.join(root, '_assets/reference-home', APPROVED_HOME_SNAPSHOT);
const staging = '/home-preview/release-candidate/';
const assetUrl = `/_assets/reference-home/${APPROVED_HOME_SNAPSHOT}/`;

// The stage tool extracts the approved Git commit, not the editable preview.
execFileSync(process.execPath, [path.join(website, 'scripts/stage-reference-home.mjs')], { cwd: root, stdio: 'inherit' });
await fs.rm(path.join(root, '_assets/reference-home'), { recursive: true, force: true });
await fs.cp(path.join(candidate, 'assets'), output, { recursive: true });

async function rewriteAssets(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) await rewriteAssets(file);
    else if (/\.(?:html|js|css|json)$/i.test(entry.name)) {
      let contents = await fs.readFile(file, 'utf8');
      contents = contents.replaceAll(staging + 'assets/', assetUrl);
      if (file === path.join(output, 'reference-language.js')) {
        contents = contents.replaceAll(`location.assign('${staging}')`, "location.assign('/')");
      }
      await fs.writeFile(file, contents);
    }
  }
}
await rewriteAssets(output);

// Preserve existing production metadata and analytics. The old React home
// FAQ/Product schema no longer describes this page, so it is not reused.
function productionHead(existing) {
  const doc = load(existing);
  const tags = [];
  doc('head title, head meta[name="description"], head meta[name="robots"], head meta[name="theme-color"], head meta[property^="og:"], head meta[name^="twitter:"], head link[rel="canonical"], head link[hreflang], head link[rel="manifest"], head script[src*="googletagmanager"], head script[src*="adsbygoogle"]').each((_, el) => tags.push(doc.html(el)));
  doc('head script:not([src]):not([type])').each((_, el) => { if (doc(el).html()?.includes("gtag('config'")) tags.push(doc.html(el)); });
  const graph = JSON.parse(doc('head script[type="application/ld+json"]').first().text());
  graph['@graph'] = (graph['@graph'] || []).filter(n => ['Organization', 'WebSite', 'WebPage'].includes(n['@type']));
  for (const node of graph['@graph']) if (node['@type'] === 'WebPage') { delete node.mainEntity; delete node.breadcrumb; }
  tags.push(`<script type="application/ld+json" id="page-jsonld">${JSON.stringify(graph).replace(/<\/script/gi, '<\\/script')}</script>`);
  return tags.join('\n');
}

// Give local images intrinsic dimensions. A lossless WebP can be several
// times larger than an already-compressed JPEG, so retain the original whenever
// the conversion does not save bytes. Both choices preserve the original pixels.
// Cache each conversion for both languages; existing layouts are untouched.
const conversions = new Map();
async function imageTag(tag) {
  const match = tag.match(/\ssrc="([^"]+)"/i);
  if (!match || !/^\/(?!\/)/.test(match[1])) return tag;
  const pathname = decodeURIComponent(match[1].split(/[?#]/)[0]);
  // These assets belong to sections well below the first screen on both
  // layouts. Native lazy loading keeps HTML src available to crawlers and
  // no-JavaScript visitors while reducing competition with the opening scene.
  const belowFold = /\/path-(?:sport|cinema|value)\.jpg$/i.test(pathname);
  if (belowFold) {
    tag = /\sloading\s*=/i.test(tag) ? tag.replace(/\sloading\s*=\s*"[^"]*"/i, ' loading="lazy"') : tag.replace(/\s*\/?\s*>$/, m => ` loading="lazy"${m}`);
    if (!/\sdecoding\s*=/i.test(tag)) tag = tag.replace(/\s*\/?\s*>$/, m => ` decoding="async"${m}`);
  }
  if (!/\.(png|jpe?g|webp|avif)$/i.test(pathname)) return tag;
  const file = path.join(root, pathname.slice(1));
  let item = conversions.get(file);
  if (!item) {
    const image = sharp(file, { animated: false });
    const metadata = await image.metadata();
    if (!metadata.width || !metadata.height) throw new Error(`Cannot determine image dimensions: ${pathname}`);
    item = { width: metadata.width, height: metadata.height, src: match[1] };
    if (/\.(png|jpe?g)$/i.test(pathname)) {
      const bytes = await fs.readFile(file);
      const id = createHash('sha256').update(bytes).digest('hex').slice(0, 24);
      const optimized = await image.webp({ lossless: true }).toBuffer();
      if (optimized.length < bytes.length) {
        const dir = path.join(output, 'optimized');
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(path.join(dir, `${id}.webp`), optimized);
        item.src = `${assetUrl}optimized/${id}.webp`;
      }
    }
    conversions.set(file, item);
  }
  tag = tag.replace(match[0], ` src="${item.src}"`);
  if (!/\swidth\s*=/.test(tag)) tag = tag.replace(/\s*\/?\s*>$/, m => ` width="${item.width}"${m}`);
  if (!/\sheight\s*=/.test(tag)) tag = tag.replace(/\s*\/?\s*>$/, m => ` height="${item.height}"${m}`);
  return tag;
}
async function renderPage(name, destination, language) {
  let html = await fs.readFile(path.join(candidate, name), 'utf8');
  const existing = await fs.readFile(destination, 'utf8');
  html = html.replaceAll(staging + 'assets/', assetUrl)
    .replaceAll(staging + 'm3u-player.html', '/m3u-player.html')
    .replaceAll(staging + 'en/', '/en/')
    .replaceAll(staging, '/')
    .replaceAll('/home-preview/index.html', '/');
  html = html.replace(/<html\s+lang="(?:ar|en)"/, `<html lang="${language}" dir="${language === 'ar' ? 'rtl' : 'ltr'}"`);
  // Preserve the approved preview's default LTR layout; its Arabic text and
  // components already specify their own direction. Setting html dir alone
  // reverses the header and other visual elements.
  html = html.replace('<body>', '<body dir="ltr">');
  html = html.replace(/<meta\s+name="robots"[^>]*>/i, '').replace(/<title>[\s\S]*?<\/title>/i, '').replace(/<meta\s+name="description"[^>]*>/i, '');
  const trialRedirect = language === 'ar' ? `<script>
    if(new URLSearchParams(location.search).has('trial')) location.replace('/trial/?trial=1');
    else {
      const aliases={pricing:'#works','server-finder':'#path-section',setup:'#journey',showcase:'#cinema-library',xtream:'/xtream-player.html',channels:'/channels/','live-player':'/channels/'};
      function followOldSection(){const target=aliases[decodeURIComponent(location.hash.slice(1))];if(target)location.replace(target)}
      window.addEventListener('hashchange',followOldSection);followOldSection();
    }
  </script>` : '';
  html = html.replace('</head>', `${productionHead(existing)}\n${trialRedirect}\n</head>`);
  const matches = [...html.matchAll(/<img\b[^>]*>/gi)];
  let result = '', pos = 0;
  for (const match of matches) { result += html.slice(pos, match.index) + await imageTag(match[0]); pos = match.index + match[0].length; }
  result += html.slice(pos);
  await fs.writeFile(destination, result);
}
await renderPage('index.html', path.join(root, 'index.html'), 'ar');
await renderPage('en/index.html', path.join(root, 'en/index.html'), 'en');
console.log('Published isolated approved Arabic and English home snapshots.');
