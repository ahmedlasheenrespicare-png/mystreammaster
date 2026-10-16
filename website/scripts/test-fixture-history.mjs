import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { load } from 'cheerio';

const html = await fs.readFile(new URL('../legacy/manchester-united-atletico/index.html', import.meta.url), 'utf8');
const $ = load(html);
const root = $('#head-to-head');
const expected = [
  { date:'2026-10-13', year:'2026', atleti:'2', united:'0', competition:'دوري أبطال أوروبا', friendly:'false' },
  { date:'2026-08-01', year:'2026', atleti:'1', united:'2', competition:'كأس سنابدراجون', friendly:'true' },
  { date:'2022-07-30', year:'2022', atleti:'1', united:'0', competition:'ودية للأندية', friendly:'true' },
];
const card = date => root.find(`[data-history-match="${date}"]`);

test('history: exactly the latest three completed meetings are baked into the existing fixture page', () => {
  assert.equal(root.length, 1); assert.equal(root.find('[data-history-match]').length, 3);
  assert.deepEqual(root.find('[data-history-match]').map((_,e) => $(e).attr('data-history-match')).get(), expected.map(r => r.date));
  assert.equal(root.find('h2').text(), 'نتائج آخر ثلاث مواجهات بين الفريقين');
  assert.equal($('a[href="#head-to-head"]').length, 1);
});

test('history: every score is bound to its named club, never inferred from home/away order', () => {
  for (const row of expected) {
    const match = card(row.date);
    assert.equal(match.find('[data-history-team="atletico"] .fh-team-name').text(), 'أتلتيكو مدريد');
    assert.equal(match.find('[data-history-team="united"] .fh-team-name').text(), 'مانشستر يونايتد');
    assert.equal(match.find('[data-history-team="atletico"] .fh-goals').text(), row.atleti);
    assert.equal(match.find('[data-history-team="united"] .fh-goals').text(), row.united);
    assert.equal(match.find('.fh-scoreboard').attr('aria-label'), `النتيجة: أتلتيكو مدريد ${row.atleti}، مانشستر يونايتد ${row.united}`);
  }
});

test('history: each meeting explicitly retains its competition, calendar year and exact date', () => {
  for (const row of expected) {
    const match = card(row.date);
    assert.equal(match.find('h3').text(), row.competition);
    assert.equal(match.find('time').attr('datetime'), row.date);
    assert.equal(match.find('[data-history-calendar-year]').text(), row.year);
    assert.equal(match.attr('data-history-year'), row.date.slice(0,4));
    assert.equal(match.find('[data-history-calendar-year]').prev('dt').text(), 'السنة');
  }
});

test('history: friendlies are explicitly distinguished from the 2026/27 Champions League meeting', () => {
  assert.equal(root.find('[data-history-friendly="true"]').length, 2);
  for (const row of expected) assert.equal(card(row.date).attr('data-history-friendly'), row.friendly);
  for (const row of expected.filter(r => r.friendly === 'true')) assert.ok(card(row.date).find('.fh-kind').text().includes('ودية'));
  assert.ok(card('2026-10-13').find('.fh-details').text().includes('2026/27'));
  assert.ok(card('2026-08-01').text().includes('كأس سنابدراجون'));
  assert.equal(card('2022-07-30').find('[data-history-competition="champions-league"]').length,0);
});

test('history: the cutoff explicitly includes this report, without claiming only earlier or competitive games', () => {
  assert.ok(root.find('.fh-heading').text().includes('تشمل مباراة هذا التقرير'));
  assert.ok(root.find('.fh-heading').text().includes('ليست مقتصرة على اللقاءات الرسمية'));
  assert.equal(root.find('.fh-heading time').attr('datetime'),'2026-10-16');
  assert.equal(root.find('.fh-current').length,1);
  assert.equal(root.find('.fh-current').closest('[data-history-match]').attr('data-history-match'),'2026-10-13');
});

test('history: source links are only in documentation, with both active verified references retained', () => {
  assert.equal(root.find('a,cite').length,0);
  assert.doesNotMatch(root.text(), /UEFA|BBC|ESPN|FotMob|manutd\.com/i);
  const refs = $('#source-head-to-head');
  assert.equal(refs.find('a[href="https://www.bbc.com/sport/football/live/cm0j013q35dqt#previous-scores"]').length,1);
  assert.equal(refs.find('a[href="https://www.manutd.com/en/news/report-united-2-1-atleti"]').length,1);
  assert.equal(refs.find('a[href="#source-uefa-report"]').length,1);
  refs.find('a[href^="https:"]').each((_,e) => { assert.equal($(e).attr('target'),'_blank'); assert.equal($(e).attr('rel'),'noopener noreferrer'); });
  assert.ok(!html.includes('match-hub-and-highlights-for-atletico-madrid-v-man-utd-friendly-in-oslo-30-july-2022'), 'the old redirected 404 report is not introduced as a source');
});

test('history: real results are static HTML with no new browser module, media, schema or API', () => {
  assert.equal(root.find('script,iframe,video,audio,img,object,embed,[itemscope],[itemtype],[hidden],details').length,0);
  assert.equal($('script[src*="fixture-history"]').length,0);
  assert.equal($('link[href="/_assets/fixture-history.css?v=20261016a"]').length,1);
  assert.equal(root.find('[data-history-match] time').length,3);
});

test('history: semantic list and score groups have valid labels and stable chronology', () => {
  assert.equal(root.find('ol.fh-grid').length,1); assert.equal(root.find('[role="group"][aria-label]').length,3);
  const ids = $('[id]').map((_,e) => $(e).attr('id')).get(); assert.equal(new Set(ids).size,ids.length);
  root.find('[aria-labelledby]').add(root).each((_,e) => { for (const id of ($(e).attr('aria-labelledby')||'').split(/\s+/).filter(Boolean)) assert.ok(ids.includes(id)); });
  for (let i=1;i<expected.length;i++) assert.ok(Date.parse(expected[i-1].date)>Date.parse(expected[i].date));
});

test('history: display order is explicit and does not fabricate home sides for neutral friendlies', () => {
  assert.ok(root.find('.fh-note').text().includes('ترتيب الفريقين ثابت'));
  assert.ok(root.find('.fh-note').text().includes('لا يعبّر ترتيب العرض عن صاحب الأرض'));
  assert.equal(root.find('[data-home-away],[data-homeaway]').length,0);
  root.find('.fh-scoreboard').each((_,e) => assert.equal($(e).attr('dir'),'rtl'));
});

test('history: isolated CSS adds neither tracking nor network requests and supports mobile layout', async () => {
  const css = await fs.readFile(new URL('../public/_assets/fixture-history.css', import.meta.url),'utf8');
  assert.doesNotMatch(css, /@import|@font-face|url\(/i);
  assert.match(css,/\.fixture-history/); assert.match(css,/repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css,/@media\(max-width:900px\)/); assert.match(css,/prefers-reduced-motion/);
});
