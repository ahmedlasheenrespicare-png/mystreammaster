import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { load } from 'cheerio';
import { validateLineupSnapshot, renderFixtureLineups, renderPlayerRating } from './render-fixture-lineups.mjs';

const snapshot = JSON.parse(await fs.readFile(new URL('../src/content/fixture-lineups-snapshot.json', import.meta.url), 'utf8'));
const docs = load(await fs.readFile(new URL('../legacy/manchester-united-atletico/index.html', import.meta.url), 'utf8'))('#report-sources');
const fresh = () => structuredClone(snapshot);
const allPlayers = data => data.teams.flatMap(t => [...t.starters, ...t.substitutes, ...t.unused]);

test('lineups: the reviewed UEFA sheet has 22 starters, 10 used and 14 unused substitutes', () => {
  assert.equal(validateLineupSnapshot(snapshot), snapshot);
  assert.equal(snapshot.teams.flatMap(t => t.starters).length, 22);
  assert.equal(snapshot.teams.flatMap(t => t.substitutes).length, 10);
  assert.equal(snapshot.teams.flatMap(t => t.unused).length, 14);
  assert.equal(allPlayers(snapshot).length, 46);
  assert.equal(new Set(allPlayers(snapshot).map(p => p.id)).size, 46);
  assert.equal(allPlayers(snapshot).filter(p => p.rating !== null).length, 31);
  assert.deepEqual(snapshot.teams.map(t => t.formation), ['4-4-2', '4-2-3-1']);
});

test('lineups: all numbers render as plain HTML with references centralized in documentation', () => {
  const $ = load(renderFixtureLineups(snapshot));
  assert.equal($('[data-starting-player]').length, 22);
  assert.equal($('[data-substitute-player]').length, 10);
  assert.equal($('[data-unused-player]').length, 14);
  assert.equal($('[data-starting-player] [data-player-rating], [data-substitute-player] [data-player-rating]').length, 31);
  assert.equal($('[data-lineup-team]').length, 2);
  assert.equal($('.fl-captain').length, 2);
  assert.equal($('table caption').length, 2);
  assert.equal($('script, iframe, video, img').length, 0);
  assert.equal($('a[href^="https://www.uefa.com/"]').length, 0);
  assert.equal(docs.find('#source-uefa-lineups a').attr('href'), snapshot.sources.lineups.url);
  assert.equal($('a[href^="https://www.fotmob.com/"]').length, 0);
  assert.equal(docs.find('#source-fotmob-lineups a').attr('href'), snapshot.sources.ratings.url);
  assert.equal($('a[href*="espn"]').length, 0);
  assert.ok($.text().includes('التقييمات ليست لحظية ولا تُحدَّث آلياً'));
  assert.ok($.text().includes('تقييمات اللاعبين على مقياس 10'));
  assert.doesNotMatch($.text(), /UEFA|ESPN|FotMob/);
  assert.ok(docs.find('#source-fotmob-lineups').text().includes('FotMob'));
});

test('lineups: only the direct FotMob reading is used, not earlier copies or other providers', () => {
  const p = new Map(allPlayers(snapshot).map(p => [p.id, p]));
  for (const [id, value] of [['250012069',8.2],['250139036',8.3],['250106963',7.8],['250118908',7.1],['250189295',6.5],['250075007',6.1],['250102035',5.6]]) assert.equal(p.get(id).rating, value);
  assert.equal(snapshot.sources.ratings.provider, 'FotMob');
  assert.equal(snapshot.sources.ratings.scale, 10);
});

test('lineups: the UEFA official award and FotMob player of the match stay distinct', () => {
  const $ = load(renderFixtureLineups(snapshot));
  assert.equal($('[data-recognition="uefa"] strong').text(), 'أليكس باينا');
  assert.equal($('[data-recognition="fotmob"] strong').text(), 'بابلو باريوس');
  assert.equal($('[data-recognition="fotmob"] [data-player-rating]').attr('data-player-rating'), '8.3');
  assert.equal($('[data-recognition="uefa"] [data-player-rating]').length, 0);
});

test('lineups: a player who appeared but has no published rating is not zero or an unused substitute', () => {
  const $ = load(renderFixtureLineups(snapshot));
  const row = $('[data-substitute-player="250112513"]');
  assert.ok(row.text().includes('88′'));
  assert.equal(row.find('[data-rating-unavailable]').text(), 'غير متاح');
  assert.equal(row.find('[data-player-rating]').length, 0);
  assert.equal($('[data-unused-player="250112513"]').length, 0);
  assert.ok($('.fl-unavailable-note').text().includes('رغم مشاركته'));
  assert.ok(allPlayers(snapshot).filter(p => snapshot.teams.some(t => t.unused.includes(p))).every(p => p.rating === null));
});

test('lineups: an actual zero is preserved while absent scores stay unavailable', () => {
  assert.match(renderPlayerRating(0), /data-player-rating="0\.0"/);
  assert.match(renderPlayerRating(null), /غير متاح/);
  const data = fresh(); data.teams[0].starters[0].rating = 0;
  const $ = load(renderFixtureLineups(data));
  assert.equal($('[data-starting-player="250012069"] [data-player-rating]').attr('data-player-rating'), '0.0');
  for (const value of [undefined, '', false, '7.2', NaN, Infinity, -1, 10.1, 6.41]) assert.throws(() => renderPlayerRating(value), /INVALID_FIXTURE_LINEUPS/);
});

test('lineups: official substitution minutes and the dismissal are not inferred from playing time', () => {
  const $ = load(renderFixtureLineups(snapshot));
  assert.ok($('[data-substitute-player="250076240"]').text().includes('66′'), 'UEFA minute, not the 67 minute in an earlier article');
  assert.ok($('[data-starting-player="250188249"]').text().includes('خرج 66′'));
  assert.ok($('[data-starting-player="250165232"]').text().includes('طرد 74′'));
  assert.ok(!$('[data-starting-player="250165232"]').text().includes('خرج'));
  assert.equal(snapshot.teams[0].unused.find(p => p.number === 27).sourceName, 'Lituba', 'do not join another provider by jersey number');
});

for (const [reason, change] of [
  ['wrong match', d => { d.matchId = '9999999'; }],
  ['predicted rather than confirmed lineup', d => { d.status = 'predicted'; }],
  ['missing starter', d => { d.teams[0].starters.pop(); }],
  ['duplicate player', d => { d.teams[0].starters[1].id = d.teams[0].starters[0].id; }],
  ['duplicate shirt', d => { d.teams[0].starters[1].number = 13; }],
  ['duplicate provider identity', d => { d.teams[0].starters[1].fotmobId = '177126'; }],
  ['wrong formation membership', d => { d.teams[0].lines[1][0] = d.teams[0].lines[0][0]; }],
  ['partial substitutions', d => { d.teams[0].substitutions.pop(); }],
  ['substitution with unknown player', d => { d.teams[0].substitutions[0].on = '9999999'; }],
  ['missing minute', d => { d.teams[0].substitutions[0].minute = null; }],
  ['invented unused-player rating', d => { d.teams[0].unused[0].rating = 6; }],
  ['foreign rating provider', d => { d.sources.ratings.provider = 'Other'; }],
  ['unsafe source URL', d => { d.sources.ratings.url = 'javascript:alert(1)'; }],
  ['invalid score', d => { d.teams[0].starters[0].rating = 11; }],
  ['invalid review date', d => { d.reviewedAt = 'today'; }],
]) test(`lineups: rejects ${reason}`, () => {
  const data = fresh(); change(data);
  assert.throws(() => validateLineupSnapshot(data), /INVALID_FIXTURE_LINEUPS/);
});

test('lineups: source names and labels cannot inject HTML', () => {
  const data = fresh(); data.teams[0].starters[0].name = '<img src=x onerror=alert(1)>';
  data.teams[0].starters[0].sourceName = '\"><script>alert(1)</script>';
  const $ = load(renderFixtureLineups(data));
  assert.equal($('img, script, [onerror]').length, 0);
  assert.ok($('[data-starting-player="250012069"]').text().includes('<img src=x onerror=alert(1)>'));
});

test('lineups: repeated renders never freshen the reviewed date or mutate the confirmed facts', () => {
  const original = JSON.stringify(snapshot);
  const a = renderFixtureLineups(snapshot); const b = renderFixtureLineups(snapshot);
  assert.equal(a, b); assert.equal(JSON.stringify(snapshot), original);
  const $ = load(a); assert.equal($('time').attr('datetime'), snapshot.reviewedAt);
});

test('lineups: legacy integration has one complete document and one existing chart module', async () => {
  const html = await fs.readFile(new URL('../legacy/manchester-united-atletico/index.html', import.meta.url), 'utf8');
  assert.equal((html.match(/<\/html>/g) || []).length, 1);
  assert.ok(html.trimEnd().endsWith('</html>'));
  const $ = load(html);
  assert.equal($('[data-fixture-lineups]').length, 1);
  assert.equal($('a[href="#match-lineups"]').length, 1);
  assert.equal($('script[src*="fixture-charts.js"]').length, 1);
  assert.equal($('script[src*="fixture-lineups"]').length, 0, 'build-only renderer is not shipped as browser JavaScript');
});
