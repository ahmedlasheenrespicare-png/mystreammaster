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
import { optimizeReferenceFlower } from './optimize-reference-flower.mjs';

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

// Optimize only the production renderer; keep the immutable approved model,
// reference preview, materials and animations intact.
const mainScript = path.join(output, 'main-D5MQsYQ6.js');
const mainCode = optimizeReferenceFlower(await fs.readFile(mainScript, 'utf8'));
await fs.writeFile(mainScript, mainCode);
const flowerRevision = createHash('sha256').update(mainCode).digest('hex').slice(0, 12);

// Generate conservative, high-quality derivatives only where they save bytes.
// Originals stay available for high-density screens and as a crawler fallback.
const responsiveImages = new Map();
async function responsiveVariants(relative, widths) {
  const file = path.join(output, relative);
  const bytes = await fs.readFile(file);
  const metadata = await sharp(bytes).metadata();
  if (!metadata.width || !metadata.height) throw new Error(`Missing image dimensions: ${relative}`);
  const variants = [];
  for (const width of widths.filter(width => width < metadata.width)) {
    const resized = await sharp(bytes).resize({ width, withoutEnlargement: true }).webp({ quality: 94, effort: 4 }).toBuffer();
    if (resized.length >= bytes.length) continue;
    const id = createHash('sha256').update(resized).digest('hex').slice(0, 24);
    await fs.mkdir(path.join(output, 'responsive'), { recursive: true });
    await fs.writeFile(path.join(output, 'responsive', `${id}.webp`), resized);
    variants.push(`${assetUrl}responsive/${id}.webp ${width}w`);
  }
  if (variants.length) variants.push(`${assetUrl}${relative} ${metadata.width}w`);
  const srcset = variants.join(', ');
  responsiveImages.set(assetUrl + relative, srcset);
  return srcset;
}
for (const name of ['sport', 'cinema', 'value']) {
  await responsiveVariants(`path-${name}.jpg`, [768, 1024]);
}
// Cinema posters are managed by the approved reel's visibility controller.
// Do not attach srcset until that controller activates a poster: otherwise
// the browser could fetch all the cloned/off-screen slides immediately.
for (let i = 1; i <= 5; i++) await responsiveVariants(`cinema-${i}.jpg`, [480, 720]);
const cinemaDir = path.join(output, 'cinema-layers');
for (const name of await fs.readdir(cinemaDir)) {
  if (/^(?:scene-|film-|series-|arabic-film-)\S+\.jpg$/.test(name)) {
    await responsiveVariants(`cinema-layers/${name}`, [480, 720]);
  }
}
const cinemaMap = Object.fromEntries([...responsiveImages].filter(([key, value]) => value && /\/(?:cinema-\d+\.jpg|cinema-layers\/)/.test(key)));
const cinemaScript = path.join(output, 'cinema-showcase.js');
let cinemaCode = await fs.readFile(cinemaScript, 'utf8');
const activatePoster = "if(visible&&near&&!poster.hasAttribute('src')&&poster.dataset.src)poster.src=poster.dataset.src;else if(!near&&poster.hasAttribute('src'))poster.removeAttribute('src')";
if (!cinemaCode.includes(activatePoster)) throw new Error('Approved cinema poster activation has changed; review responsive integration');
cinemaCode = cinemaCode.replace(activatePoster, `if(visible&&near&&!poster.hasAttribute('src')&&poster.dataset.src){const set=smCinemaResponsive[new URL(poster.dataset.src,location.href).pathname];if(set){poster.sizes='100vw';poster.srcset=set}poster.src=poster.dataset.src}else if(!near&&poster.hasAttribute('src')){poster.removeAttribute('src');poster.removeAttribute('srcset')}`);
cinemaCode = `const smCinemaResponsive=${JSON.stringify(cinemaMap)};\n` + cinemaCode;
await fs.writeFile(cinemaScript, cinemaCode);
const cinemaRevision = createHash('sha256').update(cinemaCode).digest('hex').slice(0, 12);

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
  const srcset = belowFold && responsiveImages.get(pathname);
  if (srcset && !/\ssrcset\s*=/.test(tag)) {
    // The landscape source is cover-cropped into a portrait card, so its
    // rendered pixel width is larger than the card itself (roughly 2.3x).
    tag = tag.replace(/\s*\/?\s*>$/, m => ` srcset="${srcset}" sizes="(max-width: 1023px) 190vw, 80vw"${m}`);
  }
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
  // The snapshot path is stable, but this publish-time integration changes the
  // reel script. Version its URL so a cached older script cannot mask it.
  html = html.replace(/(cinema-showcase\.js\?[^"']+)/g, `$1&responsive=${cinemaRevision}`);
  html = html.replace(/(main-D5MQsYQ6\.js\?[^"']+)/g, `$1&flower=${flowerRevision}`);
  // The archived snapshot contains a hidden reference loader. Replace only that
  // element in production, keeping the hooks used by the existing home script.
  // It remains hidden as in the approved home; the site's logo is untouched.
  const loaderPattern = /<!-- LOADER -->[\s\S]*?<!-- LOADER END -->/;
  if ((html.match(/<!-- LOADER -->/g) || []).length !== 1 || !loaderPattern.test(html)) {
    throw new Error(`Approved ${language} loader markup changed; review the production replacement`);
  }
  const loadingLabel = language === 'ar' ? 'جارٍ تجهيز الصفحة' : 'Preparing your page';
  html = html.replace(loaderPattern, `<!-- Stream Master loading element -->
  <div class="loader done sm-home-loader" style="display: none;" aria-hidden="true">
    <div class="sm-home-loader__content">
      <span class="sm-home-loader__indicator" aria-hidden="true"></span>
      <p>${loadingLabel}</p>
      <div class="progress"><span class="number">100%</span><div class="sm-home-loader__track"><div id="progressBar" style="transform: scaleX(1);"></div></div></div>
    </div>
    <div class="loader__images done"><div class="blur-mask"></div></div>
    <svg class="overlay" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path class="overlay__path" fill="#0b0b0f" vector-effect="non-scaling-stroke" d="M 0 0 V 0 Q 50 0 100 0 V 0 z"></path></svg>
  </div>
  <style>
    .sm-home-loader{background:#0b0b0f;color:#fff;font-family:system-ui,sans-serif}
    .sm-home-loader__content{position:relative;z-index:2;display:grid;justify-items:center;gap:18px}
    .sm-home-loader__content p{margin:0;font-size:16px;font-weight:700}
    .sm-home-loader__indicator{width:32px;height:32px;border:3px solid #ffffff33;border-top-color:#d8ff3e;border-radius:50%;animation:sm-home-loader-spin 1s linear infinite}
    .sm-home-loader .progress{position:static;display:grid;justify-items:center;gap:8px;color:#fff}
    .sm-home-loader__track{width:160px;height:3px;background:#ffffff33;overflow:hidden;border-radius:4px}
    .sm-home-loader #progressBar{height:100%;background:#d8ff3e;transform-origin:left}
    .sm-home-loader .loader__images{display:none}
    @keyframes sm-home-loader-spin{to{transform:rotate(360deg)}}
    @media(prefers-reduced-motion:reduce){.sm-home-loader__indicator{animation:none}}
  </style>`);
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
