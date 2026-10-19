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
  /* الشارة عنصر واحد (LeagueIconBadge) يخدم الشريطين — يُفحَص كل شريط وحده */
  for (const bar of ['.matches-league-links.league-carousel', '.league-carousel.league-stats']) {
    const scope = matchesPage(bar);
    const images = scope.find('img.league-carousel-logo');
    assert.equal(images.length, 7, `${bar}: سبع بطولات لها شعار موثّق لدى المصدر (الدوري المصري بلا شعار موثّق)`);
    for (const image of images.toArray()) {
      const $img = matchesPage(image);
      assert.match($img.attr('src'), ICON_HOST);
      assert.equal($img.attr('alt'), '', 'الأيقونة زخرفية: النص الظاهر بجانبها يكفي');
      assert.equal($img.attr('loading'), 'lazy');
      assert.equal($img.attr('decoding'), 'async');
      assert.ok(Number($img.attr('width')) > 0 && Number($img.attr('height')) > 0, 'أبعاد معلومة تمنع قفز التخطيط');
    }
    /* البديل المحايد مرسوم في كل بطاقة — يظهر وحده حين لا يتوفّر شعار */
    assert.equal(scope.find('.league-carousel-badge').length, 8, bar);
    assert.equal(scope.find('.league-carousel-fallback').length, 8, bar);
  }
});

test('the matches hub renders the league stats bar with prerendered numbers for every league', () => {
  const bar = matchesPage('.league-carousel.league-stats');
  assert.equal(bar.length, 1, 'شريط إحصائيات البطولات موجود في HTML المُسبق رسمه');
  assert.equal(bar.attr('aria-roledescription'), 'carousel');
  /* لا طلب يُطلَق من HTML نفسه: الجلب حيّ عند بلوغ القسم، لا عند تحميل الصفحة */
  assert.equal(bar.attr('data-fetched'), 'false');
  const cards = bar.find('.league-stats-card');
  assert.equal(cards.length, 8, 'كرت لكل بطولة');
  const ids = cards.toArray().map((card) => matchesPage(card).attr('data-league'));
  assert.deepEqual(ids, ['uefa.champions', 'eng.1', 'fra.1', 'esp.1', 'ger.1', 'ita.1', 'ksa.1', 'egy.1']);
  /* كل كرت يفتح صفحة بطولته — الشريط مدخل تنقّل لا لوحة أرقام مغلقة */
  for (const card of cards.toArray()) {
    assert.match(matchesPage(card).find('a.league-stats-link').attr('href'), /^\/matches\/[^/]+\/$/);
  }
  /* الأرقام من لقطة البناء المراجَعة: ثلاثة مقاييس لكل كرت، ولا مقياس فارغ */
  const values = bar.find('[data-stat-value]');
  assert.equal(values.length, 24);
  assert.equal(values.filter((_, el) => matchesPage(el).text().trim() === 'غير متاح').length, 0);
  for (const metric of ['best-attack', 'best-defence', 'total-goals']) {
    assert.equal(bar.find(`[data-stat-metric="${metric}"]`).length, 8, `مقياس ${metric} في كل كرت`);
  }
  /* لا سطر قراءة تحت الكرت: الكرت مختصر يعرض المقاييس وحدها، وحالة القراءة
     (قديمة/فاشلة) محمولة في خاصية على الكرت لا في نص ظاهر. */
  assert.equal(bar.find('.league-stats-foot').length, 0);
  assert.doesNotMatch(bar.text(), /آخر قراءة|جارٍ قراءة الترتيب|بيانات قديمة/);
  assert.equal(bar.find('.league-stats-card[data-stat-stale]').length, 8);
  /* نفس أدوات تنقّل شريط الروابط: سهمان ومؤشر نقطي واحد قبل القياس */
  assert.equal(bar.find('.league-carousel-nav').length, 2);
  assert.equal(bar.find('.league-carousel-dot').length, 1);
});

test('leader banners take crests from the live match-card source, with local then initials fallback', async () => {
  const { leagueStandingsByLeague } = await import('../src/lib/standings.mjs');
  const { cleanTeamName } = await import('../src/lib/fixtures-archive.mjs');
  const snapshot = JSON.parse(await fs.readFile(new URL('src/content/standings-snapshot.json', website), 'utf8'));
  const ids = ['uefa.champions', 'eng.1', 'fra.1', 'esp.1', 'ger.1', 'ita.1', 'ksa.1', 'egy.1'];
  /* الخريطة المركزية في StandingsRatesCard.tsx — الشعار المحلي البديل بعد فشل
     صورة المصدر. مفتاحها الاسم بعد cleanTeamName وتصغيره. */
  const LOCAL = {
    'paris saint-germain': 'paris-saint-germain',
    'manchester city': 'manchester-city',
    'as monaco': 'as-monaco',
    'barcelona': 'barcelona',
    'sc freiburg': 'sc-freiburg',
    'internazionale': 'internazionale',
    'al qadsiah': 'al-qadsiah',
    'al assiouty sport': 'pyramids-fc',
  };
  /* مضيفا الشعارات المعتمدان فقط: ESPN (بطاقات المباريات الحيّة) وHighlightly */
  const LIVE = /^https:\/\/a\.espncdn\.com\/i\/teamlogos\/soccer\/500\/[1-9]\d{0,11}\.png$/;
  const HIGHLIGHTLY = /^https:\/\/highlightly\.net\/soccer\/images\/teams\/[1-9]\d{0,11}\.png$/;
  const cards = matchesPage('.matches-league-links .league-carousel-item');
  assert.equal(cards.length, 8);
  for (const [index, card] of cards.toArray().entries()) {
    const scope = matchesPage(card);
    const table = leagueStandingsByLeague(snapshot, ids[index]);
    const leader = table.entries.find(team => team.rank === 1);
    const name = cleanTeamName(leader.name);
    const key = name.toLowerCase();
    const localSrc = `/images/teams/${LOCAL[key]}-club-badge.webp`;
    assert.ok(LOCAL[key], `متصدّر بلا شعار محلي بديل: ${key}`);
    assert.ok(scope.find('.league-carousel-leader').text().includes(name));
    /* البديل مرسوم دائماً تحت الصورة، لا يُستبدل بها */
    assert.equal(scope.find('.league-carousel-monogram').length, 1);
    assert.equal(
      scope.find('.league-carousel-monogram > span').first().text(),
      name.split(/\s+/).slice(0, 2).map(word => word[0].toUpperCase()).join(''),
    );
    assert.equal(scope.find('.league-carousel-monogram small').text(), '#1');

    /* شعار المزوّد نفسه: ESPN لبطولاته، وHighlightly (الدوري المصري) من
       مضيف صور الفرق الرسمي للمزوّد — بلا تركيب عنوان ESPN لمعرّف ليس ESPN. */
    const expected = table.provider === 'ESPN'
      ? `https://a.espncdn.com/i/teamlogos/soccer/500/${leader.teamId}.png`
      : `https://highlightly.net/soccer/images/teams/${leader.teamId}.png`;

    const images = scope.find('.league-carousel-banner img');
    assert.equal(images.length, 1, `${key}: شعار واحد في البانر`);
    for (const image of images.toArray()) {
      const img = matchesPage(image);
      const src = img.attr('src');
      assert.equal(src, expected, `${key}: مصدر الشعار غير مطابق`);
      assert.equal(img.attr('data-crest-source'), table.provider === 'ESPN' ? 'espn' : 'highlightly');
      /* المضيفان المسموحان وحدهما: ESPN (بطاقات المباريات الحيّة) وHighlightly */
      if (/^https?:/.test(src)) {
        assert.match(src, table.provider === 'ESPN' ? LIVE : HIGHLIGHTLY, `${key}: مضيف شعار غير معتمد: ${src}`);
      } else {
        assert.match(src, /^\/images\/teams\/[a-z0-9-]+-club-badge\.webp$/, `${key}: مسار محلي غير معتمد`);
      }
      /* الملف المحلي البديل موجود في مصدر النشر وفي الشجرة المنشورة معاً */
      for (const base of [new URL('public/', website), new URL('../', website)]) {
        const file = await fs.readFile(new URL(`.${localSrc}`, base));
        assert.equal(file.subarray(0, 4).toString(), 'RIFF', `${key}: ${localSrc} ليس WebP`);
        assert.equal(file.subarray(8, 12).toString(), 'WEBP', `${key}: ${localSrc} ليس WebP`);
        assert.ok(file.length > 1000, `${key}: ${localSrc} صغير بشكل غير معقول`);
      }
      assert.equal(img.attr('alt'), '');
      assert.equal(img.attr('aria-hidden'), 'true');
      assert.equal(img.attr('loading'), 'lazy');
      assert.equal(img.attr('draggable'), 'false');
      assert.ok(Number(img.attr('width')) > 0 && Number(img.attr('height')) > 0);
    }
    /* لا مضيف ثالث داخل البانر */
    for (const image of scope.find('.league-carousel-banner img').toArray()) {
      const src = matchesPage(image).attr('src') || '';
      if (/^(?:https?:)?\/\//.test(src)) assert.match(src, new RegExp(`${LIVE.source}|${HIGHLIGHTLY.source}`), `${key}: مصدر خارجي غير معتمد: ${src}`);
    }
  }
  assert.equal(cards.find('.league-carousel-leader-logo').length, 8);
});

test('the temporary provider crest bridge is limited to the two approved logo hosts', async () => {
  const { liveCardsTeamLogo, highlightlyTeamLogo, providerTeamLogo, isApprovedCrestUrl, LEADER_CREST_SOURCE } = await import('../src/lib/leader-logo.mjs');
  assert.equal(LEADER_CREST_SOURCE, 'live-cards', 'جسر المزوّد المؤقت مفعّل بطلب المالك');

  // ESPN — بطاقات المباريات الحيّة
  assert.equal(liveCardsTeamLogo({ teamId: '160', provider: 'ESPN' }), 'https://a.espncdn.com/i/teamlogos/soccer/500/160.png');
  assert.equal(liveCardsTeamLogo({ teamId: '22022', provider: 'ESPN' }), 'https://a.espncdn.com/i/teamlogos/soccer/500/22022.png');
  assert.equal(liveCardsTeamLogo({ teamId: '882420', provider: 'Highlightly' }), null);
  assert.equal(liveCardsTeamLogo({ teamId: '..\/evil', provider: 'ESPN' }), null);
  assert.equal(liveCardsTeamLogo({ teamId: '0', provider: 'ESPN' }), null);
  assert.equal(liveCardsTeamLogo({ teamId: '', provider: 'ESPN' }), null);
  assert.equal(liveCardsTeamLogo({ provider: 'ESPN' }), null);

  // Highlightly — الدوري المصري
  assert.equal(highlightlyTeamLogo({ teamId: '882420', provider: 'Highlightly' }), 'https://highlightly.net/soccer/images/teams/882420.png');
  assert.equal(highlightlyTeamLogo({ teamId: '160', provider: 'ESPN' }), null);
  assert.equal(highlightlyTeamLogo({ teamId: '882420/../1', provider: 'Highlightly' }), null);
  assert.equal(highlightlyTeamLogo({ teamId: '0', provider: 'Highlightly' }), null);

  // الموزّع: يفضّل حقلاً صريحاً معتمداً، وإلا مضيف المزوّد، وإلا لا شيء
  assert.equal(providerTeamLogo({ teamId: '160', provider: 'ESPN' }), 'https://a.espncdn.com/i/teamlogos/soccer/500/160.png');
  assert.equal(providerTeamLogo({ teamId: '882420', provider: 'Highlightly' }), 'https://highlightly.net/soccer/images/teams/882420.png');
  assert.equal(
    providerTeamLogo({ teamId: '882420', provider: 'Highlightly', logo: 'https://highlightly.net/soccer/images/teams/882420.png' }),
    'https://highlightly.net/soccer/images/teams/882420.png',
  );
  assert.equal(providerTeamLogo({ teamId: '882420', provider: 'Highlightly', logo: 'https://evil.example/crest.png' }), 'https://highlightly.net/soccer/images/teams/882420.png');
  assert.equal(providerTeamLogo({ teamId: '882420', provider: 'Other' }), null);
  assert.equal(providerTeamLogo({ provider: 'Highlightly' }), null);

  // قائمة المضيفين المعتمدين
  assert.equal(isApprovedCrestUrl('https://a.espncdn.com/i/teamlogos/soccer/500/160.png'), true);
  assert.equal(isApprovedCrestUrl('https://highlightly.net/soccer/images/teams/882420.png'), true);
  assert.equal(isApprovedCrestUrl('http://highlightly.net/soccer/images/teams/882420.png'), false);
  assert.equal(isApprovedCrestUrl('https://highlightly.net.evil.example/soccer/images/teams/882420.png'), false);
  assert.equal(isApprovedCrestUrl('https://cdn.example/team.png'), false);
});
