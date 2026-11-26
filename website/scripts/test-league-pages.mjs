import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';
import { leagues, leagueViews, leaguePath } from './league-pages-data.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const site = 'https://streammasterstore.com';
const read = relative => fs.readFile(path.join(root, relative), 'utf8');

test('all eight competitions have crawlable, distinct and linked pages', async () => {
  const sitemap = load(await read('sitemap-leagues.xml'), { xmlMode: true });
  const urls = sitemap('url > loc').map((_, el) => sitemap(el).text()).get();
  assert.equal(urls.length, 33);
  assert.equal(new Set(urls).size, 33);
  assert.ok((await read('sitemap-index.xml')).includes(`${site}/sitemap-leagues.xml`));
  const home = load(await read('index.html'));
  assert.equal(home('a.world-index-link').attr('href'), '/leagues/');
  assert.equal(home('#pricing').length, 1);
  assert.equal(home('#pricing').closest('#works').length, 1);
  assert.equal(home('[data-league-menu-trigger]').length, 2);
  assert.equal(home('#league-header-panel .league-menu-card').length, 8);
  assert.equal(home('#league-header-panel .league-menu-icon img').length, 8);
  for (const league of leagues) for (const view of leagueViews) {
    assert.equal(home(`#league-header-panel a[href="${leaguePath(league, view.slug)}"]`).length, 1);
  }
  const hub = load(await read('leagues/index.html'));
  assert.equal(hub('.league-card').length, leagues.length);
  const titleSet = new Set();
  for (const league of leagues) {
    assert.equal(hub(`main a[href="${leaguePath(league)}"]`).length, 1);
    for (const view of leagueViews) {
      const route = leaguePath(league, view.slug);
      const doc = load(await read(`${route.slice(1)}index.html`));
      assert.ok(urls.includes(site + route), route);
      assert.equal(doc('link[rel=canonical]').attr('href'), site + route);
      assert.match(doc('meta[name=robots]').attr('content'), /index,\s*follow/);
      assert.equal(doc('h1').length, 1);
      assert.ok(doc('h1').text().includes(league.name));
      assert.ok(!titleSet.has(doc('title').text())); titleSet.add(doc('title').text());
      assert.equal(doc('.tabs a').length, 4);
      for (const destination of leagueViews) assert.equal(doc(`.tabs a[href="${leaguePath(league, destination.slug)}"]`).length, 1);
      assert.match(doc('.world-copy iframe').attr('src'), new RegExp(`league=${leagues.indexOf(league)}&view=${view.view}`));
      assert.ok(doc('main').text().includes(league.context));
      assert.equal(doc('.league-readable').attr('data-league'), league.table);
      assert.equal(doc('.league-readable').attr('data-match-league'), league.matches || league.table);
      assert.equal(doc('.league-readable').attr('data-view'), view.view);
      assert.ok(doc('main').text().length > 150);
      assert.doesNotMatch(doc.html(), /league-archive-|لقطة الترتيب/);
    }
  }
  assert.doesNotMatch(await read('index.html'), /league-world-entry\.js\?[^"']+&routes=/);
  assert.equal((await read('leagues/premier-league/index.html')).includes('noindex'), false);
});
