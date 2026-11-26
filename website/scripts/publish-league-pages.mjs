import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { leagues, leagueViews, leaguePath } from './league-pages-data.mjs';
import { HEADER_GROUPS } from '../src/header-floorplan.mjs';

const site = 'https://streammasterstore.com';
const esc = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const image = `${site}/icon-512.png`;

function floorNavigation(mobile = false) {
  const groups = HEADER_GROUPS.map(group => `<details class="floor-group"><summary>${esc(group.label)}</summary><div class="floor-group-links">${group.links.map(([label, href]) => `<a href="${esc(href)}">${esc(label)}</a>`).join('')}</div></details>`).join('');
  const nav = `<nav class="floor-nav floor-nav--${mobile ? 'mobile' : 'desktop'}" aria-label="${mobile ? 'أقسام الموقع' : 'التنقل الرئيسي'}"><a class="floor-home" href="/">الرئيسية</a>${groups}</nav>`;
  return mobile ? `<details class="floor-league-mobile"><summary>تصفح الموقع</summary>${nav}</details>` : nav;
}

function page({ pathname, title, description, heading, crumbs, body, assetVersion, world }) {
  const url = site + pathname;
  const items = crumbs.map((crumb, i) => ({ '@type': 'ListItem', position: i + 1, name: crumb.name, item: site + crumb.href }));
  const graph = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'WebPage', '@id': url + '#webpage', url, name: title, description, inLanguage: 'ar', datePublished: '2026-11-12', primaryImageOfPage: { '@type': 'ImageObject', url: image }, breadcrumb: { '@id': url + '#breadcrumb' } },
    { '@type': 'BreadcrumbList', '@id': url + '#breadcrumb', itemListElement: items },
  ] };
  const nav = crumbs.map((c, i) => i === crumbs.length - 1 ? `<span aria-current="page">${esc(c.name)}</span>` : `<a href="${esc(c.href)}">${esc(c.name)}</a>`).join(' <span aria-hidden="true">/</span> ');
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="index, follow"><title>${esc(title)}</title><meta name="description" content="${esc(description)}"><link rel="canonical" href="${url}"><meta property="og:type" content="website"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${image}"><meta property="og:image:width" content="512"><meta property="og:image:height" content="512"><meta property="og:image:alt" content="شعار ستريم ماستر برو"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(description)}"><meta name="twitter:image" content="${image}"><meta name="twitter:image:alt" content="شعار ستريم ماستر برو"><script type="application/ld+json">${JSON.stringify(graph).replaceAll('<', '\\u003c')}</script><link rel="stylesheet" href="/_assets/league-pages.css?v=${assetVersion}"><link rel="stylesheet" href="/_assets/header-floorplan.css"><script type="module" src="/_assets/league-pages.js?v=${assetVersion}"></script></head><body><div class="world-copy"><iframe title="عالم البطولات التفاعلي" src="${esc(world)}" allow="fullscreen"></iframe></div><header class="site-head"><a href="/">ستريم ماستر برو</a>${floorNavigation()}${floorNavigation(true)}<a href="/leagues/">عالم البطولات</a></header><main class="wrap"><nav class="crumbs" aria-label="مسار التصفح">${nav}</nav><div class="eyebrow">عالم البطولات · ستريم ماستر</div><h1>${esc(heading)}</h1>${body}</main></body></html>`;
}

// A separate copy of the approved world is used on indexable pages. The
// homepage's own world is never modified. Only the copy omits historical data.
async function publishPageWorld(root, assetUrl) {
  const source = path.join(root, assetUrl.slice(1));
  const revision = createHash('sha256').update(await fs.readFile(fileURLToPath(import.meta.url))).update(assetUrl).digest('hex').slice(0, 16);
  const output = path.join(root, '_assets/league-page-world', revision);
  const baseUrl = `/_assets/league-page-world/${revision}/`;
  await fs.rm(path.join(root, '_assets/league-page-world'), { recursive: true, force: true });
  await fs.mkdir(output, { recursive: true });
  await fs.cp(path.join(source, 'league-world'), path.join(output, 'league-world'), { recursive: true });
  const edit = async (file, fn) => { const before = await fs.readFile(file, 'utf8'); const after = fn(before); if (before === after) throw new Error(`Page world adaptation failed: ${file}`); await fs.writeFile(file, after); };
  const replaceRequired = (text, from, to) => { if (typeof from === 'string' ? !text.includes(from) : !from.test(text)) throw new Error(`Page world source changed: ${String(from).slice(0, 80)}`); return text.replace(from, to); };
  const panelFile = path.join(output, 'league-panels.js');
  let panel = await fs.readFile(path.join(source, 'league-panels.js'), 'utf8');
  panel = panel.replaceAll("from './", `from '${assetUrl}`);
  panel = replaceRequired(panel, /const archiveUrls=.*?;\n/, '');
  panel = replaceRequired(panel, "if(type==='rates')loadArchive(leagues[index][1]);", '');
  panel = replaceRequired(panel, "if(shown==='rates')loadArchive(leagues[index][1])", '');
  panel = replaceRequired(panel, "}catch{}finally{clearTimeout(timer);requests.delete(id);", "}catch{const prior=records.get(id);if(prior)prior.stale=true}finally{clearTimeout(timer);requests.delete(id);");
  panel = replaceRequired(panel, /async function loadArchive\(id\)\{[^\n]*\}\n/, '');
  panel = replaceRequired(panel, /syncSelection\(\);try\{const response=await fetch\(new URL\('\.\/standings-snapshot[^\n]*\n/, 'syncSelection();snapshotLoaded=true;\n');
  await fs.writeFile(panelFile, panel);
  await edit(path.join(output, 'league-world', 'world.html'), text => text.replace('../motion-settings.js', assetUrl + 'motion-settings.js'));
  await edit(path.join(output, 'league-world', 'world-stats.js'), text => {
    text = replaceRequired(text, /try\{const response=await fetch\('[^']*standings-snapshot[^\n]*\n/, "snapshotReady=true;cards.forEach((card,i)=>render(i));\n");
    return text;
  });
  await edit(path.join(output, 'league-world', 'league-overlay.js'), text => {
    text = replaceRequired(text, /import\('([^']*\/)league-panels\.js([^']*)'\)/, `import('${baseUrl}league-panels.js$2')`);
    text = replaceRequired(text, "!Object.hasOwn(labels,type)", "type!=='overview'&&!Object.hasOwn(labels,type)");
    text = replaceRequired(text, 'window.openLeagueOverlay(card,window.__kotaLeagueEngine);choose(type)', "window.openLeagueOverlay(card,window.__kotaLeagueEngine);if(type!=='overview')choose(type)");
    text = replaceRequired(text, "const matchStatus=box.querySelector('.match-status');if(matchStatus?.textContent.includes('تعذّر تحميل مباريات'))matchStatus.textContent='تعذّر تحميل المباريات. الاتصال المباشر غير متاح في خادم المعاينة الثابت؛ يمكنك إعادة المحاولة.';", '');
    // Keep source freshness visible when a proxy returns stale cached data.
    text = replaceRequired(text, '   note.remove();', "   if(note.textContent.includes('بيانات قديمة')) note.textContent='تنبيه: بيانات المصدر المخزنة قديمة.'; else note.remove();");
    return text;
  });
  return baseUrl + 'league-world/world.html';
}

// These pages deliberately contain no historical snapshot or archive. Their
// readable HTML explains the subject; the current data is fetched separately
// from the same validated site endpoints used by the interactive league world.
export async function publishLeaguePages(root, assetUrl) {
  const worldUrl = await publishPageWorld(root, assetUrl);
  const css = await fs.readFile(path.join(root, 'website/assets/league-pages/league-pages.css'));
  const js = await fs.readFile(path.join(root, 'website/assets/league-pages/league-pages.js'));
  const assetVersion = createHash('sha256').update(css).update(js).digest('hex').slice(0, 16);
  const paths = ['/leagues/'];
  const homeCrumbs = [{ name: 'الرئيسية', href: '/' }, { name: 'عالم البطولات', href: '/leagues/' }];
  const cards = leagues.map(l => `<a class="league-card" href="${leaguePath(l)}"><strong>${esc(l.name)}</strong><span>الترتيب والإحصائيات والمباريات ←</span></a>`).join('');
  const description = 'استكشف عالم البطولات وتابع الترتيب والإحصائيات ومباريات ثماني بطولات في صفحة واحدة من ستريم ماستر برو.';
  const landing = page({ world: worldUrl, pathname: '/leagues/', title: 'عالم البطولات | ستريم ماستر برو', description, heading: 'عالم البطولات', crumbs: homeCrumbs, assetVersion, body: `<p class="intro">اختر بطولة للاطلاع على ترتيب الفرق وإحصائياتها والمباريات من نفس المصادر المستخدمة في عالم البطولات.</p><a class="action" href="/#league-strip">انتقل إلى عالم البطولات التفاعلي</a><div class="league-grid">${cards}</div>` });
  await fs.mkdir(path.join(root, 'leagues'), { recursive: true });
  await fs.writeFile(path.join(root, 'leagues/index.html'), landing);
  for (const league of leagues) {
    for (const view of leagueViews) {
      const pathname = leaguePath(league, view.slug); paths.push(pathname);
      const prefixes = { standings: 'ترتيب', stats: 'إحصائيات', matches: 'مباريات' };
      const heading = view.slug ? `${prefixes[view.slug]} ${league.name}` : league.name;
      const title = `${heading} | عالم البطولات`;
      const desc = `استكشف ${heading} مع معلومات الفرق والمباريات المتاحة من مصادر عالم البطولات، واطّلع على جدول الترتيب والإحصائيات وتوقيت عرض البيانات.`;
      const crumbs = [...homeCrumbs, { name: league.name, href: leaguePath(league) }, ...(view.slug ? [{ name: view.name, href: pathname }] : [])];
      const nav = `<nav class="tabs" aria-label="صفحات ${esc(league.name)}">${leagueViews.map(v => `<a href="${leaguePath(league, v.slug)}"${v.slug === view.slug ? ' aria-current="page"' : ''}>${v.name}</a>`).join('')}</nav>`;
      const explanation = view.slug === 'standings' ? 'يعرض الجدول مراكز الفرق، وعدد المباريات والانتصارات والتعادلات والهزائم، والأهداف والنقاط عندما يتيحها مصدر الترتيب.' : view.slug === 'stats' ? 'تُحسب معدلات الهجوم والدفاع والنقاط لكل مباراة من جدول الترتيب المتاح، ولا تُستنتج القيم الناقصة.' : view.slug === 'matches' ? 'يعرض جدول المباريات بيانات اليوم بتوقيت القاهرة، مع إمكانية اختيار الأمس أو الغد. يُعرض توقيت البداية أو النتيجة عندما يؤكده المصدر.' : `تابع ${esc(league.name)} عبر جدول الترتيب وصفحات إحصائيات الفرق والمباريات، بالاعتماد على مصادر عالم البطولات بالموقع.`;
      const viewHeading = view.slug === 'standings' ? 'جدول الترتيب' : view.slug === 'stats' ? 'إحصائيات الفرق' : view.slug === 'matches' ? 'المباريات' : 'نظرة على الترتيب';
      const live = `<div class="league-readable" data-league="${esc(league.table)}" data-match-league="${esc(league.matches || league.table)}" data-view="${esc(view.view)}" data-assets="${esc(assetUrl)}"><p class="notice league-data-status" role="status" aria-live="polite" hidden>جارٍ تحميل البيانات من المصدر…</p><div class="league-data"><!--SM_LEAGUE_DATA--><noscript><p>لا تتوفر البيانات المباشرة في النسخة الثابتة. أعد المحاولة لاحقًا.</p></noscript></div><button class="live-retry" type="button" hidden>إعادة المحاولة</button><noscript><p>يلزم JavaScript لتحديث البيانات تلقائيًا. أعد تحميل الصفحة للحصول على أحدث قراءة متاحة.</p></noscript></div>`;
      const body = `${nav}<p class="intro">${esc(desc)}</p><section aria-labelledby="league-info"><h2 id="league-info">${viewHeading}</h2><p>${explanation}</p><p>${esc(league.context)}</p>${live}<p>قد تتغير البيانات أو تتأخر بحسب توفر المصدر؛ لا تعني الأرقام المعروضة نتيجة نهائية ما لم يؤكد المصدر انتهاء المباراة.</p></section>`;
      const html = page({ pathname, title, description: desc, heading, crumbs, body, assetVersion, world: `${worldUrl}?league=${leagues.indexOf(league)}&view=${view.view}` });
      const dest = path.join(root, pathname.slice(1), 'index.html');
      await fs.mkdir(path.dirname(dest), { recursive: true }); await fs.writeFile(dest, html);
    }
  }
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map(p => `  <url><loc>${site}${p}</loc><priority>0.7</priority></url>`).join('\n')}\n</urlset>\n`;
  await fs.writeFile(path.join(root, 'sitemap-leagues.xml'), sitemap);
  const sitemapIndex = path.join(root, 'sitemap-index.xml');
  let index = await fs.readFile(sitemapIndex, 'utf8');
  if (!index.includes('sitemap-leagues.xml')) index = index.replace('</sitemapindex>', `  <sitemap><loc>${site}/sitemap-leagues.xml</loc></sitemap>\n</sitemapindex>`);
  await fs.writeFile(sitemapIndex, index);
  for (const name of ['league-pages.css', 'league-pages.js']) await fs.copyFile(path.join(root, 'website/assets/league-pages', name), path.join(root, '_assets', name));
  return paths;
}
