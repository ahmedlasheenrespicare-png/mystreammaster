import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { load } from 'cheerio';
import { renderFixtureCharts } from '../public/_assets/fixture-charts.js';
import { renderFixtureStandings } from '../public/_assets/fixture-standings.js';
import { renderFixtureLineups } from './render-fixture-lineups.mjs';

const html = await fs.readFile(new URL('../legacy/manchester-united-atletico/index.html', import.meta.url), 'utf8');
const lineup = JSON.parse(await fs.readFile(new URL('../src/content/fixture-lineups-snapshot.json', import.meta.url), 'utf8'));
const standings = JSON.parse(await fs.readFile(new URL('../src/content/fixture-standings-snapshot.json', import.meta.url), 'utf8'));
const BRANDS = /UEFA|ESPN|FotMob|BBC|YouTube|يوتيوب|الاتحاد الأوروبي لكرة القدم|سيلفي سبورت|Mamdouh NasrAllah/i;
function baked() {
  const $ = load(html); const values = {};
  $('#uefa-stats [data-stat]').each((_, row) => { const cells = $(row).find('td'); values[$(row).attr('data-stat')] = { home: cells.eq(0).text().trim(), away: cells.eq(1).text().trim() }; });
  $('[data-fixture-charts]').html(renderFixtureCharts(values, $('#uefa-stats time').first().text().trim()));
  $('[data-fixture-lineups]').html(renderFixtureLineups(lineup));
  $('[data-fixture-standings]').html(renderFixtureStandings(standings));
  return $;
}

test('central sources: rendered provider names, citations and source URLs occur only in documentation', () => {
  const $ = baked(); const outside = $('main').clone(); outside.find('#report-sources,script,style').remove();
  assert.doesNotMatch(outside.text(), BRANDS);
  outside.find('[aria-label],[title]').each((_, e) => { assert.doesNotMatch($(e).attr('aria-label') || '', BRANDS); assert.doesNotMatch($(e).attr('title') || '', BRANDS); });
  assert.equal(outside.find('cite').length, 0);
  assert.equal(outside.find('a[href^="http"]').length, 1);
  assert.equal(outside.find('a[href^="http"]').attr('href'), 'https://football-logos.cc/');
  assert.equal($('#report-sources .report-source').length, 11);
});

test('central sources: all original external references plus both verified history references remain accessible and secure', () => {
  const $ = baked(); const doc = $('#report-sources'); const links = doc.find('a[href^="http"]');
  assert.equal(links.length, 13);
  for (const href of [lineup.sources.lineups.url, lineup.sources.ratings.url,
    'https://www.uefa.com/uefachampionsleague/match/2049573--atleti-vs-man-utd/statistics/',
    'https://www.manutd.com/en/news/atletico-de-madrid-2-united-0-13-oct-2026',
    'https://www.atleticodemadrid.com/postpartidos/atletico-de-madrid-manchester-united-13-10-2026-21-00',
    'https://www.youtube.com/watch?v=yibbAkJUu78','https://www.youtube.com/watch?v=MYbD3-0BvoA',
    'https://www.youtube.com/@selfiesport','https://www.youtube.com/@MamdouhNasrAllah',
    'https://www.bbc.com/sport/football/live/cm0j013q35dqt#previous-scores',
    'https://www.manutd.com/en/news/report-united-2-1-atleti']) assert.equal(links.filter((_,e) => $(e).attr('href') === href).length, 1, href);
  links.each((_, e) => { assert.equal(new URL($(e).attr('href')).protocol, 'https:'); assert.equal($(e).attr('target'), '_blank'); assert.equal($(e).attr('rel'), 'noopener noreferrer'); });
  assert.equal($('main a[href*="espn"]').length, 0, 'the unchanged follow-page policy still forbids ESPN viewing destinations');
});

test('central sources: provider mappings explain both chart modes and all three standings tables', () => {
  const $ = baked();
  assert.ok($('#source-uefa-stats').text().includes('أرقام نهائية'));
  assert.ok($('#source-espn-data').text().includes('تحديث تلقائي'));
  assert.ok($('#source-espn-data cite').text().includes('ESPN'));
  assert.equal($('#source-espn-data [data-documented-league]').length, 3);
  assert.deepEqual($('[data-chart-source]').map((_,e) => [[$(e).attr('data-chart-source'),$(e).text()]]).get(), [['uefa','أرقام نهائية'],['espn','تحديث تلقائي']]);
});

test('central sources: all numeric rows, player identities and original reading times are retained', () => {
  const $ = baked();
  assert.equal($('#uefa-stats [data-stat]').length, 24); assert.equal($('#analysis-charts .fc-card').length, 9);
  assert.equal($('#competition-standings tbody tr').length, 76); assert.equal($('[data-starting-player]').length, 22);
  assert.equal($('[data-substitute-player]').length, 10); assert.equal($('[data-unused-player]').length, 14);
  assert.equal($('[data-starting-player] [data-player-rating], [data-substitute-player] [data-player-rating]').length, 31);
  assert.equal($('[data-lineups-reading] time').attr('datetime'), lineup.reviewedAt);
  for (const table of standings.tables) assert.equal($(`[data-standing-league="${table.league}"]`).attr('data-fetched-at'), new Date(table.fetchedAt).toISOString());
});

test('central sources: official award and highest published rating remain explicitly distinct', () => {
  const $ = baked();
  assert.ok($('[data-recognition="uefa"]').text().includes('الجائزة الرسمية'));
  assert.equal($('[data-recognition="uefa"] strong').text(), 'أليكس باينا');
  assert.ok($('[data-recognition="fotmob"]').text().includes('أعلى تقييم منشور'));
  assert.equal($('[data-recognition="fotmob"] strong').text(), 'بابلو باريوس');
  assert.equal($('[data-recognition="fotmob"] [data-player-rating]').attr('data-player-rating'), '8.3');
  assert.ok($('#source-fotmob-lineups').text().includes('مستقل عن جائزة UEFA الرسمية'));
});

test('central sources: approved analyst-name exception retains attributable summaries without source metadata clutter', () => {
  const $ = baked(); const body = $('#arabic-reviews');
  assert.deepEqual(body.find('h3').map((_,e) => $(e).text()).get(), ['محمد عواد','ممدوح نصرالله']);
  assert.equal(body.find('cite,.fr-channel,.fr-date,.fr-checked,a[href^="http"]').length, 0);
  assert.equal($('#report-sources [data-review-source]').length, 2);
  body.find('a[href^="#"]').each((_, e) => { assert.equal($('#report-sources').find($(e).attr('href')).length, 1); assert.equal($(e).attr('target'), undefined); });
});

test('central sources: explicit legal exception preserves its existing wording and logo attribution', () => {
  const $ = baked(); const legal = $('p.rights-note');
  assert.equal(legal.length, 1);
  assert.ok(legal.text().startsWith('هذه الصفحة لا تعرض أي بث مباشر ولا تحتفظ بأي رابط بث؛'));
  assert.ok(legal.text().includes('شعارات الأندية للتمييز بين الفريقين، والعلامات والشعارات ملك لأصحابها. مصدر ملفات الشعارات:'));
  assert.equal(legal.find('a[href="https://football-logos.cc/"]').length, 1);
  assert.equal(legal.find('a[href="https://football-logos.cc/"]').attr('rel'), 'noopener noreferrer');
  assert.equal(legal.closest('#report-sources').length, 0);
});

test('central sources: no hidden credits, duplicate headings, injected players or new structured data', () => {
  const $ = baked(); const doc = $('#report-sources');
  assert.equal(doc.find('[hidden],details,iframe,video,audio,img,script').length, 0);
  assert.equal($('h1').length, 1); const ids = $('[id]').map((_,e) => $(e).attr('id')).get(); assert.equal(new Set(ids).size, ids.length);
  $('main a[href^="#"]').each((_,e) => assert.ok(ids.includes($(e).attr('href').slice(1))));
  assert.ok($('head script[type="application/ld+json"]').text().includes('"name": "UEFA"'), 'real event organizer metadata is not an inline citation and stays intact');
  assert.equal(doc.find('[itemtype], [itemscope]').length, 0);
});

test('central sources: updated browser files have cache-busted references without new dependencies or backend routes', () => {
  const $ = load(html);
  for (const src of ['fixture-charts.js','fixture-standings.js']) assert.equal($(`script[src="/_assets/${src}?v=20261016b"]`).length, 1);
  for (const css of ['fixture-lineups.css','fixture-reviews.css']) assert.equal($(`link[href="/_assets/${css}?v=20261016b"]`).length, 1);
  assert.equal($('script[src*="documentation"]').length, 0);
});
