import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { load } from 'cheerio';
import { LEAGUES } from '../src/lib/matches.mjs';

const website = new URL('../', import.meta.url);
const competitions = await fs.readFile(new URL('src/content/competitions.ts', website), 'utf8');
const matchesPage = load(await fs.readFile(new URL('../matches/index.html', website), 'utf8'));

/* معرّفات البطولات في مصدر المباريات — المرجع الذي يجب أن يطابقه كل مفتاح أيقونة */
const leagueIds = LEAGUES.map((league) => league.id);

/* مخزن شعارات المصدر نفسه (ESPN CDN) — لا مخزن صور مجهول ولا رابط مختصر */
const ICON_HOST = /^https:\/\/a\.espncdn\.com\/i\/leaguelogos\/soccer\/500\/\d+\.png$/;

test('every league icon key is a real league id from the matches source', () => {
  const block = competitions.match(/export const LEAGUE_ICONS[^\n]*=\s*\{([\s\S]*?)\n\};/);
  assert.ok(block, 'LEAGUE_ICONS معرَّفة في content/competitions.ts');
  const keys = [...block[1].matchAll(/^\s*"([^"]+)":/gm)].map((match) => match[1]);
  assert.ok(keys.length > 0, 'قائمة الأيقونات ليست فارغة');
  for (const key of keys) {
    assert.ok(leagueIds.includes(key), `مفتاح أيقونة ليس معرّف بطولة لدى المصدر: ${key}`);
  }
  assert.equal(new Set(keys).size, keys.length, 'لا مفتاح مكرر في قائمة الأيقونات');
});

test('every league icon is a full https URL on the source asset host', () => {
  const block = competitions.match(/export const LEAGUE_ICONS[^\n]*=\s*\{([\s\S]*?)\n\};/);
  const values = [...block[1].matchAll(/:\s*"([^"]+)"/g)].map((match) => match[1]);
  assert.equal(values.length, [...block[1].matchAll(/^\s*"([^"]+)":/gm)].length);
  for (const value of values) {
    assert.match(value, ICON_HOST, `رابط أيقونة ليس من مخزن شعارات المصدر: ${value}`);
  }
});

test('the matches hub renders the league carousel with all eight landing links in the HTML', () => {
  const carousel = matchesPage('.matches-league-links.league-carousel');
  assert.equal(carousel.length, 1, 'شريط البطولات موجود في HTML المُسبق رسمه');
  assert.equal(carousel.attr('aria-roledescription'), 'carousel');
  const links = carousel.find('.league-carousel-item');
  assert.equal(links.length, 8, 'كل صفحات البطولات روابطها في HTML (لا تُبنى بـ JavaScript)');
  for (const link of links.toArray()) {
    assert.match(matchesPage(link).attr('href'), /^\/matches\/[^/]+\/$/);
    assert.ok(matchesPage(link).text().trim().length > 0, 'لكل رابط نص ظاهر');
  }
  /* صفحة واحدة قبل القياس: لا مؤشر زائف بعدد الصفحات قبل معرفة العرض */
  assert.equal(carousel.find('.league-carousel-dot').length, 1);
  assert.equal(carousel.find('.league-carousel-nav').length, 2);
  /* المنطقة قابلة للتمرير قبل التشغيل: تبقى الروابط متاحة بلا JavaScript */
  assert.equal(carousel.attr('data-ready'), 'false');
});

test('league icons load lazily with dimensions and empty alt, and no league ships a broken image', () => {
  const carousel = matchesPage('.league-carousel');
  const images = carousel.find('img.league-carousel-logo');
  assert.equal(images.length, 7, 'سبع بطولات لها شعار موثّق لدى المصدر (الدوري المصري بلا شعار موثّق)');
  for (const image of images.toArray()) {
    const $img = matchesPage(image);
    assert.match($img.attr('src'), ICON_HOST);
    assert.equal($img.attr('alt'), '', 'الأيقونة زخرفية: النص الظاهر بجانبها يكفي');
    assert.equal($img.attr('loading'), 'lazy');
    assert.equal($img.attr('decoding'), 'async');
    assert.ok(Number($img.attr('width')) > 0 && Number($img.attr('height')) > 0, 'أبعاد معلومة تمنع قفز التخطيط');
  }
  /* البديل المحايد مرسوم في كل بطاقة — يظهر وحده حين لا يتوفّر شعار */
  assert.equal(carousel.find('.league-carousel-badge').length, 8);
  assert.equal(carousel.find('.league-carousel-fallback').length, 8);
});
