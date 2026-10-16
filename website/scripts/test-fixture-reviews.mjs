import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { load } from 'cheerio';

const html = await fs.readFile(new URL('../legacy/manchester-united-atletico/index.html', import.meta.url), 'utf8');
const $ = load(html);
const root = $('#arabic-reviews');
const documentation = $('#report-sources');
// Same checked public metadata: only its display location changed by user request.
const originals = [
  { id: 'yibbAkJUu78', author: 'محمد عواد', channel: 'https://www.youtube.com/@selfiesport', date: '2026-10-13', scope: 'roundup', title: 'برشلونة يسحق غلطة سراي - مفاجأة فايكنغ وكلوب بروج - خسارة مانشستر يونايتد' },
  { id: 'MYbD3-0BvoA', author: 'ممدوح نصرالله', channel: 'https://www.youtube.com/@MamdouhNasrAllah', date: '2026-10-15', scope: 'aftermath', title: 'ليساندرو مارتينيز يفضح إدارة مانشستر يونايتد و الإدارة بتلم الدنيا' },
];
const card = id => root.find(`[data-analyst-review="${id}"]`);
const reference = id => documentation.find(`[data-review-source="${id}"]`);

test('analyst reviews: two attributed summaries stay on the existing fixture page', () => {
  assert.equal(root.length, 1);
  assert.equal(root.find('[data-analyst-review]').length, 2);
  assert.equal(root.find('h2').text(), 'مراجعات المحللين العرب');
  assert.ok(root.find('.fr-heading').text().includes('13 أكتوبر 2026'));
  assert.equal($('a[href="#arabic-reviews"]').length, 1);
});

test('analyst reviews: exact authors, channels and original titles stay paired in documentation', () => {
  for (const source of originals) {
    const c = card(source.id); const ref = reference(source.id);
    assert.equal(c.find('h3').text(), source.author);
    assert.ok(ref.find('h3').text().includes(source.author));
    assert.equal(ref.find('[data-doc-channel]').attr('href'), source.channel);
    assert.equal(ref.find('.fd-original-title cite').text(), source.title);
    assert.equal(ref.find('[data-doc-video]').attr('href'), `https://www.youtube.com/watch?v=${source.id}`);
    assert.equal(c.find('.fr-open-video').attr('href'), `#${ref.attr('id')}`);
  }
});

test('analyst reviews: round-up coverage is not falsely described as a complete match review', () => {
  const c = card('yibbAkJUu78');
  assert.equal(c.attr('data-review-scope'), 'roundup');
  assert.equal(c.find('.fr-scope').text(), 'ضمن مراجعة الجولة');
  assert.ok(c.find('.fr-summary').text().includes('عدة مباريات'));
  assert.ok(c.find('.fr-summary').text().includes('ليس في حلقة مخصّصة بالكامل لهذا اللقاء'));
});

test('analyst reviews: the club aftermath discussion is not labelled play-by-play tactical analysis', () => {
  const c = card('MYbD3-0BvoA');
  assert.equal(c.attr('data-review-scope'), 'aftermath');
  assert.equal(c.find('.fr-scope').text(), 'نقاش ما بعد الهزيمة');
  assert.ok(c.find('.fr-summary').text().includes('السياق الإداري والفني'));
  assert.ok(c.find('.fr-summary').text().includes('ليس تحليلاً تفصيلياً لكل لقطة'));
});

test('analyst reviews: summaries remain attributed paraphrases and original titles are labelled at their references', () => {
  for (const source of originals) {
    assert.ok(card(source.id).find('.fr-summary').text().includes(source.author));
    assert.ok(reference(source.id).text().includes('النص المتاح للفيديو'));
  }
  assert.equal(root.find('blockquote, q, cite').length, 0);
  assert.ok(root.find('.fr-editorial-note').text().includes('ليست اقتباساً حرفياً'));
  assert.equal(documentation.find('.fd-original-label').length, 2);
});

test('analyst reviews: observed day-precision dates and fixed review date are preserved in documentation', () => {
  for (const source of originals) {
    assert.equal(reference(source.id).find('.fd-video-date time').attr('datetime'), source.date);
    assert.match(reference(source.id).find('.fd-video-date').text(), /لدى المصدر/);
  }
  assert.equal(documentation.find('.fd-reviewed time').attr('datetime'), '2026-10-16');
  assert.equal(root.find('.fr-date, .fr-checked').length, 0);
});

test('analyst reviews: all four original external YouTube destinations are in documentation only', () => {
  const links = documentation.find('[data-review-source] a[href^="https:"]');
  assert.equal(links.length, 4); assert.equal(root.find('a[href^="http"]').length, 0);
  const accepted = new Set(originals.flatMap(s => [s.channel, `https://www.youtube.com/watch?v=${s.id}`]));
  links.each((_, e) => {
    const href = $(e).attr('href'); assert.ok(accepted.has(href));
    const url = new URL(href); assert.equal(url.hostname, 'www.youtube.com'); assert.equal(url.protocol, 'https:');
    assert.equal(url.hash, '');
    if (url.pathname === '/watch') { assert.equal([...url.searchParams].length, 1); assert.match(url.searchParams.get('v'), /^[\w-]{11}$/); }
    assert.equal($(e).attr('target'), '_blank'); assert.equal($(e).attr('rel'), 'noopener noreferrer');
  });
});

test('analyst reviews: neither summaries nor references ship embeds, players, thumbnails or scripts', () => {
  const areas = root.add(documentation.find('[data-review-source]'));
  assert.equal(areas.find('iframe, video, audio, object, embed, img, script, link').length, 0);
  assert.equal(areas.find('[src], [srcset], [poster]').length, 0);
  assert.equal(areas.find('[onclick], [onload], [onerror]').length, 0);
});

test('analyst reviews: references are not business testimonials, rating schema or fabricated reach claims', () => {
  const areas = root.add(documentation.find('[data-review-source]'));
  assert.equal(areas.find('script[type="application/ld+json"], [itemtype], [data-player-rating]').length, 0);
  assert.doesNotMatch(areas.text(), /الأكثر مشاهدة|الأكثر شهرة|متابع|مشترك|تقييم عملاء|عملائنا|توصية بخدماتنا/);
  assert.equal(root.find('h1').length, 0);
});

test('analyst reviews: internal details and external video links have accurate accessible names', () => {
  const links = root.find('a[aria-label]').add(documentation.find('[data-review-source] a[aria-label]'));
  links.each((_, e) => {
    const visible = $(e).clone(); visible.find('[aria-hidden="true"]').remove();
    assert.ok($(e).attr('aria-label').includes(visible.text().replace(/\s+/g, ' ').trim()));
    if ($(e).attr('href').startsWith('https:')) assert.ok($(e).attr('aria-label').includes('تبويب جديد'));
    else { assert.equal($(e).attr('target'), undefined); assert.ok($(e).attr('aria-label').includes('التوثيق والمراجعة')); }
  });
  assert.equal(root.find('svg').length, 2);
  root.find('svg').each((_, e) => { assert.equal($(e).attr('focusable'), 'false'); assert.equal($(e).parent().attr('aria-hidden'), 'true'); });
});

test('analyst reviews: headings are unique and every details jump resolves inside documentation', () => {
  const ids = $('[id]').map((_, e) => $(e).attr('id')).get(); assert.equal(new Set(ids).size, ids.length);
  root.find('[aria-labelledby]').add(root).each((_, e) => {
    for (const id of ($(e).attr('aria-labelledby') || '').split(/\s+/).filter(Boolean)) assert.ok(ids.includes(id));
  });
  root.find('a[href^="#"]').each((_, e) => assert.equal(documentation.find($(e).attr('href')).length, 1));
});

test('analyst reviews: native HTML remains between analysis and standings, without hidden metadata workarounds', () => {
  assert.equal($('#preview').next().attr('id'), 'arabic-reviews'); assert.equal(root.next().attr('id'), 'competition-standings');
  assert.equal($('script[src*="fixture-reviews"]').length, 0); assert.equal($('link[href*="fixture-reviews.css"]').length, 1);
  assert.equal(root.add(documentation).find('[hidden], details, dialog, button').length, 0);
});

test('analyst reviews: isolated self-hosted styles have no network imports and cover documentation focus', async () => {
  const css = await fs.readFile(new URL('../public/_assets/fixture-reviews.css', import.meta.url), 'utf8');
  assert.doesNotMatch(css, /@import|@font-face|url\(/i); assert.match(css, /\.fixture-reviews/);
  assert.match(css, /\.fixture-documentation/); assert.match(css, /minmax\(0,1fr\)/);
  assert.match(css, /a:focus-visible/); assert.match(css, /prefers-reduced-motion/);
});
