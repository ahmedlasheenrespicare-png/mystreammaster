// Integrate only the requested sports-news section into the approved home.
// All unrelated home markup remains sourced from the pinned snapshot.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const site = 'https://streammasterstore.com';
const escapeHtml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
function publicationDate(label) {
  const match = /^(\d{1,2}) نوفمبر (\d{4})$/.exec(label);
  if (!match || Number(match[1]) < 1 || Number(match[1]) > 30) throw new Error(`Invalid news date: ${label}`);
  return `${match[2]}-11-${match[1].padStart(2, '0')}`;
}

export async function publishHomeSportsNews(root, html) {
  const preview = path.join(root, 'home-preview/saved-reference');
  const saved = await fs.readFile(path.join(preview, 'index.html'), 'utf8');
  const match = saved.match(/\s*<section id="sports-news"[\s\S]*?<\/section>\s*(?=<!-- CINEMA LIBRARY -->)/);
  if (!match || (html.match(/<!-- CINEMA LIBRARY -->/g) || []).length !== 1 || (html.match(/id="sports-news"/g) || []).length > 1) {
    throw new Error('Cannot safely integrate sports news between matches and cinema');
  }
  const assetDir = path.join(root, '_assets/sports-news');
  await fs.mkdir(assetDir, { recursive: true });
  const css = await fs.readFile(path.join(preview, 'assets/sports-news.css'), 'utf8');
  const originalJs = await fs.readFile(path.join(preview, 'assets/sports-news.js'), 'utf8');
  const js = originalJs.replace("(item.previewOnly === true ? '/home-preview/saved-reference/' : '/') + item.href", "'/' + item.href");
  if (js === originalJs) throw new Error('Sports news link integration changed');
  const data = JSON.parse(await fs.readFile(path.join(preview, 'assets/sports-news.json'), 'utf8'));
  const extra = data.filter(item => item.previewOnly);
  const imageDir = path.join(root, 'images/sports-news');
  await fs.mkdir(imageDir, { recursive: true });
  /* أصول مُدارة في `images/players/*` (مقصّة بشفافية + مفتاح manifest) تُبقى
     كما هي — لا تُعاد کتابتها ولا تُحوَّل، وأبعادها من manifest الصور. */
  const manifest = JSON.parse(await fs.readFile(path.join(root, 'website/src/image-manifest.json'), 'utf8'));
  for (const item of extra) {
    for (const image of item.images || []) {
      if (image.src.startsWith('images/players/')) {
        if (image.src.includes('..')) throw new Error('Unsafe sports news image path');
        const dimensions = manifest['/' + image.src];
        if (!dimensions) throw new Error(`Sports news image missing from manifest: ${image.src}`);
        image.width = dimensions[0]; image.height = dimensions[1];
        continue;
      }
      const prefix = 'home-preview/saved-reference/images/';
      if (!image.src.startsWith(prefix) || image.src.includes('..')) throw new Error('Unsafe sports news image path');
      const original = image.src.slice(prefix.length);
      const output = original.replace(/\.(?:jpe?g|png)$/i, '.webp');
      const bytes = await sharp(path.join(preview, 'images', original)).webp({ quality: 88 }).toBuffer();
      await fs.writeFile(path.join(imageDir, output), bytes);
      const dimensions = await sharp(bytes).metadata();
      image.src = 'images/sports-news/' + output;
      image.width = dimensions.width; image.height = dimensions.height;
    }
    delete item.previewOnly;
    const slug = item.href.match(/^news\/([a-z0-9-]+)\/$/)?.[1];
    if (!slug) throw new Error('Unsafe sports news page path');
    let page = await fs.readFile(path.join(preview, 'news', slug, 'index.html'), 'utf8');
    page = page.replaceAll('/home-preview/saved-reference/images/', '/images/sports-news/');
    const url = `${site}/${item.href}`;
    const date = publicationDate(item.dateLabel);
    const image = item.images?.[0] ? `${site}/${item.images[0].src}` : `${site}/icon-512.png`;
    const imageAlt = item.images?.[0]?.alt || 'شعار ستريم ماستر برو';
    const imageWidth = item.images?.[0]?.width || 512, imageHeight = item.images?.[0]?.height || 512;
    for (const picture of item.images || []) {
      const oldName = '/' + picture.src.replace(/\.webp$/, '.jpg');
      page = page.replaceAll(oldName, '/' + picture.src);
      page = page.replace(`src="/${picture.src}"`, `src="/${picture.src}" width="${picture.width}" height="${picture.height}"`);
    }
    const graph = {
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'NewsArticle', headline: item.title, description: item.description, inLanguage: 'ar', datePublished: date, url, mainEntityOfPage: url, ...(image ? { image } : {}), author: { '@type': 'Organization', name: 'ستريم ماستر برو', url: `${site}/` }, publisher: { '@type': 'Organization', name: 'ستريم ماستر برو', url: `${site}/` } },
        { '@type': 'WebPage', '@id': `${url}#webpage`, url, name: item.title, description: item.description, inLanguage: 'ar', datePublished: date, primaryImageOfPage: { '@type': 'ImageObject', url: image }, breadcrumb: { '@id': `${url}#breadcrumb` } },
        { '@type': 'BreadcrumbList', '@id': `${url}#breadcrumb`, itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: `${site}/` },
          { '@type': 'ListItem', position: 2, name: 'أخبار الرياضة', item: `${site}/#sports-news` },
          { '@type': 'ListItem', position: 3, name: item.title, item: url },
        ] },
      ],
    };
    const metadata = `<meta name="robots" content="index, follow"><meta name="description" content="${escapeHtml(item.description)}"><link rel="canonical" href="${url}"><meta property="og:type" content="article"><meta property="og:site_name" content="ستريم ماستر برو"><meta property="og:locale" content="ar_AR"><meta property="og:title" content="${escapeHtml(item.title)}"><meta property="og:description" content="${escapeHtml(item.description)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${image}"><meta property="og:image:width" content="${imageWidth}"><meta property="og:image:height" content="${imageHeight}"><meta property="og:image:alt" content="${escapeHtml(imageAlt)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(item.title)}"><meta name="twitter:description" content="${escapeHtml(item.description)}"><meta name="twitter:image" content="${image}"><meta name="twitter:image:alt" content="${escapeHtml(imageAlt)}"><script type="application/ld+json">${JSON.stringify(graph).replace(/</g, '\\u003c')}</script>`;
    if (!page.includes('<meta name="robots" content="noindex,nofollow">') || !/<nav>[\s\S]*?<\/nav>/.test(page)) throw new Error(`Missing preview metadata or breadcrumb: ${slug}`);
    const pageTitle = `${item.title} | ستريم ماستر برو`;
    page = page.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(pageTitle.length <= 80 ? pageTitle : item.title)}</title>`)
      .replace('<meta name="robots" content="noindex,nofollow">', metadata)
      .replace(/<nav>[\s\S]*?<\/nav>/, `<nav class="crumbs" aria-label="مسار التصفح"><a href="/">الرئيسية</a> / <a href="/#sports-news">أخبار الرياضة</a> / <span aria-current="page">${escapeHtml(item.title)}</span></nav>`)
      .replace('</style>', '.crumbs{display:flex;flex-wrap:wrap;gap:6px;font-size:13px;font-weight:700;color:#777}.crumbs [aria-current="page"]{color:#0b0b0f}</style>');
    const dest = path.join(root, 'news', slug);
    await fs.mkdir(dest, { recursive: true });
    await fs.writeFile(path.join(dest, 'index.html'), page);
  }
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${extra.map(item => `  <url><loc>${site}/${item.href}</loc><priority>0.7</priority></url>`).join('\n')}\n</urlset>\n`;
  await fs.writeFile(path.join(root, 'sitemap-sports-news.xml'), sitemap);
  await fs.mkdir(path.join(root, 'images/sports-news'), { recursive: true });
  await fs.cp(path.join(preview, 'images'), path.join(root, 'images/sports-news'), { recursive: true });
  await Promise.all([
    fs.writeFile(path.join(assetDir, 'sports-news.css'), css),
    fs.writeFile(path.join(assetDir, 'sports-news.js'), js),
    fs.writeFile(path.join(assetDir, 'sports-news.json'), JSON.stringify(data, null, 2) + '\n'),
  ]);
  const crawlLinks = `<noscript><ul>${data.map(item => `<li><a href="/${item.href}">${escapeHtml(item.title)}</a></li>`).join('')}</ul></noscript>`;
  const section = match[0].replace('</section>', `${crawlLinks}</section>`);
  // Newer approved snapshots already contain the preview news section/assets.
  // Replace them once with the production data-backed integration.
  html = html.replace(/\s*<section id="sports-news"[\s\S]*?<\/section>\s*(?=<!-- CINEMA LIBRARY -->)/, '\n');
  html = html.replace(/\s*<link\b[^>]*href="[^"]*\/sports-news\.css(?:\?[^"]*)?"[^>]*>/g, '')
    .replace(/\s*<script\b[^>]*src="[^"]*\/sports-news\.js(?:\?[^"]*)?"[^>]*><\/script>/g, '');
  html = html.replace('</head>', '<link rel="stylesheet" href="/_assets/sports-news/sports-news.css?v=1"><script defer src="/_assets/sports-news/sports-news.js?v=1"></script>\n</head>');
  return html.replace('<!-- CINEMA LIBRARY -->', `${section}<!-- CINEMA LIBRARY -->`);
}
