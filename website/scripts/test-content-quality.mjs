import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { load } from 'cheerio';
import { hasAdLoader } from './ads-guard.mjs';
import { crossesAdBoundary, isAdFreeRoute } from '../src/ad-policy.mjs';
import { matchCenterRouteIds } from '../src/content/match-center.mjs';

const root = new URL('../../', import.meta.url);
const read = path => fs.readFile(new URL(path, root), 'utf8');

test('سياسة مسارات الإعلانات مشتركة وتحمي تفاصيل كل المباريات والسلة دون إيقاف صفحات البطولات', () => {
  const matches = matchCenterRouteIds();
  assert.ok(matches.length > 0);
  assert.ok(matches.every(isAdFreeRoute));
  assert.equal(isAdFreeRoute('/cart'), true);
  assert.equal(isAdFreeRoute('/match-center'), false);
  assert.equal(isAdFreeRoute('/matches/الدوري-الإسباني'), false);
  assert.equal(crossesAdBoundary('/match-center', matches[0]), true);
  assert.equal(crossesAdBoundary(matches[0], '/'), true);
  assert.equal(crossesAdBoundary(matches[0], '/cart'), false);
});

test('الصفحات المنشورة لتفاصيل المباريات والسلة لا تحوي مُحمِّل AdSense، والرئيسية ما زالت تحويه', async () => {
  for (const route of [...matchCenterRouteIds(), '/cart']) {
    const html = await read(`${route.slice(1)}/index.html`);
    assert.equal(hasAdLoader(html), false, `${route}: unexpected ad loader`);
  }
  assert.equal(hasAdLoader(await read('index.html')), true);
});

test('صفحة الحالة لا تقدّم الأرقام القديمة على أنها قراءات حية وتُبقي التواصل متاحاً', async () => {
  const html = await read('status/index.html');
  const $ = load(html);
  const main = $('main').text();
  assert.match(main, /لا تتوفر.*قراءات مباشرة موثّقة/s);
  assert.doesNotMatch(main, /56ms|54ms|95ms|99\.9%|تُحدَّث كل 60 ثانية/);
  assert.equal($('main a[href="mailto:support@streammasterstore.com"]').length, 1);
  assert.equal($('main a[href="https://wa.me/201098950879"]').length, 1);
  assert.equal(hasAdLoader(html), false);
  assert.match(html, /G-N7VT67MW57/);
});

test('دليل السرعة المنشور يضم الحاسبة والمثال والمراجع الأصلية', async () => {
  const $ = load(await read('blog/internet-speed-for-video-streaming/index.html'));
  assert.equal($('#bandwidth-calculator').length, 1);
  assert.match($('#bandwidth-calculator').text(), /6\.3 Mbps/);
  assert.match($('main').text(), /مجموع 28 Mbps/);
  assert.equal($('main a[href="https://support.google.com/youtube/answer/78358?hl=en"]').length, 1);
  assert.equal($('main a[href="https://help.netflix.com/en/node/306"]').length, 1);
  assert.equal($('main noscript').length > 0, true);
});

test('النص المنشور لا يعيد إظهار التقييمات والوعود غير الموثقة التي أزيلت', async () => {
  for (const route of ['index.html', 'store/index.html', 'nova/index.html', 'faq/index.html', 'trial/index.html']) {
    const $ = load(await read(route));
    const text = $('main').text();
    assert.doesNotMatch(text, /4\.95 من 5|4,820\+|45,000 مشترك|99\.9% \(الأعلى\)|متوسط الرد أقل من 3 دقائق|تفعيل فوري خلال 5 دقائق/, route);
  }
});

test('المعاينة الإخبارية القديمة مؤرّخة وتصل للقارئ بالنتيجة ومصادر قابلة للفتح', async () => {
  const $ = load(await read('news/psg-lyon-tonight/index.html'));
  const main = $('main').text();
  assert.match(main, /هذه معاينة محفوظة من قبل اللقاء/);
  assert.match(main, /2–0/);
  assert.doesNotMatch(main, /الليلة|باسكال شولز/);
  assert.equal($('main a[href="/news/psg-lyon-2-0/"]').length, 1);
  assert.ok($('main a[href^="https://www.psg.fr/"]').length > 0);
});

test('تصحيحات الأخبار المنشورة تحتفظ بمصادرها وتوضح المعلومات التاريخية', async () => {
  const pages = [
    ['man-utd-bournemouth-live', /ثماني مباريات متتالية دون فوز/, 'https://www.manutd.com/en/news/report-united-0-bournemouth-3-on-25-october-2026'],
    ['bundesliga-kompany-hospitalized-2026', /قبل مباراة فرايبورغ/, 'https://fcbayern.com/en/news/2026/10/max-eberl-on-vincent-kompanys-health'],
    ['bundesliga-bayern-freiburg-2026', /بيشوف \(بايرن ميونخ\)/, 'https://fcbayern.com/en/news/matchreports/2026/10/match-report-sc-freiburg-v-fc-bayern-251026'],
    ['ballon-dor-2026-winners', /خديجة شو ثالثة/, 'https://www.uefa.com/womenschampionsleague/news/02aa-21ec463bf005-96f0689e3106-1000--alexia-putellas-wins-2026-women-s-ballon-d-or/'],
    ['ballon-dor-2026-ceremony-preview', /معاينة محفوظة قبل الحفل/, 'https://www.uefa.com/womenschampionsleague/news/02aa-21ec463bf005-96f0689e3106-1000--alexia-putellas-wins-2026-women-s-ballon-d-or/'],
    ['man-city-aston-villa', /وعادل إرلينغ هالاند النتيجة/, 'https://www.mancity.com/news/mens/aston-villa-v-city-premier-league-match-report-63928435'],
    ['tottenham-chelsea-2-0', /بيندرز \(تشيلسي، هدف في مرماه/, 'https://theanalyst.com/articles/chelsea-vs-tottenham-stats-premier-league-10-2026'],
  ];
  for (const [slug, text, source] of pages) {
    const $ = load(await read(`news/${slug}/index.html`));
    assert.match($('main').text(), text, slug);
    assert.ok($('main a').toArray().some(link => $(link).attr('href') === source), slug);
  }
});

test('دليل المغرب يوضح تغيير التوقيت وروابط المراجع', async () => {
  const $ = load(await read('blog/افضل-سيرفر-iptv-في-المغرب/index.html'));
  assert.match($('main').text(), /20 سبتمبر 2026/);
  assert.match($('main').text(), /UTC\+0/);
  assert.ok($('main a[href="https://www.timeanddate.com/news/time/morocco-abolish-dst.html"]').length > 0);
});

test('صفحات راجعناها لا تعرض تاريخ تعديل غير موثّق مع الحفاظ على تاريخ النشر', async () => {
  const routes = [
  "about/index.html",
  "status/index.html",
  "blog/internet-speed-for-video-streaming/index.html",
  "blog/افضل-سيرفر-iptv-في-الإمارات/index.html",
  "blog/قنوات-عربية-في-ألمانيا/index.html",
  "blog/افضل-سيرفر-iptv-في-الجزائر/index.html",
  "blog/افضل-سيرفر-iptv-في-الكويت/index.html",
  "blog/افضل-سيرفر-iptv-في-المغرب/index.html",
  "news/ballon-dor-2026-ceremony-preview/index.html",
  "news/ballon-dor-2026-winners/index.html",
  "news/bayern-arsenal-2-2/index.html",
  "news/bundesliga-bayern-freiburg-2026/index.html",
  "news/bundesliga-dortmund-frankfurt-2026/index.html",
  "news/bundesliga-kompany-hospitalized-2026/index.html",
  "news/clasico-first-half-2026/index.html",
  "news/clasico-preview-absences-predictions/index.html",
  "news/inter-fiorentina-2-1/index.html",
  "news/liverpool-brighton-live/index.html",
  "news/man-city-aston-villa/index.html",
  "news/man-utd-bournemouth-live/index.html",
  "news/psg-barcelona-4-2/index.html",
  "news/psg-lyon-2-0/index.html",
  "news/psg-lyon-tonight/index.html",
  "news/tottenham-chelsea-2-0/index.html"
];
  for (const route of routes) {
    const $ = load(await read(route));
    const nodes = $('script[type="application/ld+json"]').toArray().flatMap((el) => {
      const data = JSON.parse($(el).html());
      return Array.isArray(data) ? data : (Array.isArray(data['@graph']) ? data['@graph'] : [data]);
    });
    const expected = nodes.filter(n => ['WebPage', 'NewsArticle', 'BlogPosting'].includes(n['@type']));
    assert.ok(expected.some(n => n['@type'] === 'WebPage'), `${route}: missing WebPage`);
    for (const item of expected) {
      assert.ok(item.datePublished, `${route}: missing original publication date`);
      assert.equal(Object.hasOwn(item, 'dateModified'), false, `${route}: unverified modification date`);
    }
  }
});

test('تذييلات الصفحات القديمة لا تؤكد ترخيصاً دون إثبات', async () => {
  const files = [
  "website/legacy/about/index.html",
  "website/legacy/blog/iptv-على-apple-tv/index.html",
  "website/legacy/blog/هل-iptv-آمن/index.html",
  "website/legacy/blog/iptv-مقابل-netflix-وشاهد/index.html",
  "website/legacy/blog/أهمية-الدعم-الفني-في-اشتراكات-iptv/index.html",
  "website/legacy/blog/افضل-قنوات-iptv-الرياضية/index.html",
  "website/legacy/blog/الدول-العربية-في-كأس-العالم-2026/index.html",
  "website/legacy/blog/تثبيت-iptv-على-samsung-smart-tv/index.html",
  "website/legacy/blog/كأس-العالم-2026-iptv/index.html",
  "website/legacy/blog/مقارنة-نوفا-ايستار-موكا/index.html",
  "website/legacy/blog/نهائي-دوري-أبطال-أوروبا-2026/index.html",
  "website/legacy/predictions/index.html",
  "website/legacy/privacy/index.html",
  "website/legacy/refund/index.html",
  "website/legacy/status/index.html",
  "website/legacy/terms/index.html",
  "website/legacy/world-cup-2026/index.html"
];
  for (const file of files) {
    const html = await read(file);
    assert.doesNotMatch(html, /الخدمة تعتمد على محتوى أطراف ثالثة ومحتوى مرخّص/);
    assert.match(html, /تحقّق من ترخيص الجهة المزوّدة وحقها في التوزيع/);
  }
});

test('دليل HTTP المنشور مقروء ويشرح HTTP/3 عبر QUIC مع مراجع', async () => {
  const $ = load(await read('blog/http-protocols/index.html'));
  const article = $('main article');
  const text = article.text();
  assert.equal(article.find('h1').length, 1);
  assert.doesNotMatch(text, /\*\*|التطبيcation|وهوprotocol|her[self]+/);
  assert.match(text, /QUIC فوق UDP/);
  assert.match(text, /لا يلغي كل أسباب التأخير/);
  for (const rfc of [9000, 9110, 9113, 9114]) assert.equal(article.find(`a[href="https://www.rfc-editor.org/rfc/rfc${rfc}"]`).length, 1);
});

test('روابط الدليل والمشغّل في الصفحات المنشورة تشير مباشرة لوجهاتها', async () => {
  const channels = load(await read('channels/index.html'));
  const guide = channels('main a').filter((_, el) => channels(el).text().includes('دليل المشاهدة الرسمية'));
  assert.equal(guide.attr('href'), '/watch-legal.html');
  const article = load(await read('blog/http-protocols/index.html'));
  for (const target of ['/#xtream', '/#live-player', '/#server-finder', '/#channels', '/#setup', '/#showcase']) {
    assert.equal(article(`a[href="${target}"]`).length, 0, target);
  }
  for (const slug of ['iptv-على-apple-tv', 'أهمية-الدعم-الفني-في-اشتراكات-iptv', 'افضل-قنوات-iptv-الرياضية', 'تثبيت-iptv-على-samsung-smart-tv', 'هل-iptv-آمن']) {
    const page = load(await read(`blog/${slug}/index.html`));
    assert.equal(page('main a[href="/#xtream"]').length, 0, slug);
    assert.ok(page('main a[href="/xtream-player.html"]').length > 0, slug);
  }
});
