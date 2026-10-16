import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';

/* ==========================================================================
   اختبار عقد «جدول الترتيب» في صفحات هبوط البطولات
   --------------------------------------------------------------------------
   ما يحرسه هذا الملف (ولا يلمس أي عقد قائم آخر):
   • لقطة الترتيب القديمة (`fixture-standings-snapshot.json`) لم تُمس: ثلاث
     بطولات، سبعة وسبعون صفاً كاملة — لأنها مشدودة باختبارات التوثيق القائمة.
   • لقطة صفحات البطولات (`standings-snapshot.json`) تحمل **نفس الأرقام**
     المنقولة من اللقطة المراجَعة، بلا رقم واحد مُخترع أو مُعدَّل.
   • ترتيب البطولات المعتمد واحد ومتطابق بين المصدرين: قائمة التنقّل وقائمة
     `LEAGUE_PAGE_ORDER` وصفحة المواعيد والصفحات المنشورة فعلاً.
   • كل بطولة تُعرض بترتيب يجب أن تكون في قائمة الوسيط المسموحة في
     `standings.php` وموجودة في اللقطة — وإلا فشل الفحص.
   • البطولات التي لم يثبت مصدر ترتيبها تعرض نص «غير متاح» بصراحة ولا تعرض جدولاً.
   • كل صفحة بطولة في HTML المنشور تحمل صورتها الخاصة في og:image.
   ========================================================================== */

const website = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.dirname(website);
const readJson = async (rel) => JSON.parse(await fs.readFile(path.join(website, rel), 'utf8'));
const readRoot = (rel) => fs.readFile(path.join(root, rel), 'utf8');

const reference = await readJson('src/content/fixture-standings-snapshot.json');
const snapshot = await readJson('src/content/standings-snapshot.json');
const competitions = await import('../src/content/competitions.ts');
const standings = await import('../src/lib/standings.mjs');

const landings = competitions.LEAGUE_LANDINGS;

test('لقطة التوثيق القائمة لم تُمس: ثلاث بطولات وصعود كامل بلا نقص', () => {
  assert.equal(reference.version, 1);
  assert.equal(reference.tables.length, 3, 'عدد جداول لقطة التوثيق تغيّر');
  for (const table of reference.tables) {
    assert.equal(table.ok, true);
    assert.equal(table.entries.length, table.league === 'uefa.champions' ? 36 : 20, table.league);
    /* تاريخ القراءة مجمَّد: أي تحديث آلي يجب أن يكتب في لقطة صفحات البطولات
       وحدها، فلا تتغيّر الصفحات الموثّقة بلا مراجعة تحريرية. */
    assert.equal(table.fetchedAt, '2026-10-15T22:34:51Z', `${table.league}: لقطة التوثيق تغيّر وقت قراءتها`);
  }
});

test('لقطة صفحات البطولات: إمّا النسخة المراجَعة المجمّدة وإمّا نسخة آلية مُحكَّمة — ولا حالة ثالثة', () => {
  assert.equal(snapshot.version, 1);
  for (const table of snapshot.tables) {
    /* نفس تحقق الواجهة — لقطة لا تجتازه لا تصل إلى HTML أصلاً */
    const validated = standings.validateStandings(table, table.league);
    assert.equal(validated.entries.length, standings.standingsConfig(table.league).count, `${table.league}: عدد الصفوف`);
    /* القاعدة الحاكمة: لا رقم مُخترع — كل صف يحمل اسماً ومعرّفاً من المصدر */
    for (const row of table.entries) {
      assert.ok(row.name.trim().length > 0 && /^[1-9]\d{0,11}$/.test(row.teamId), `${table.league}: صف بلا هوية مصدر`);
    }
    if (table.stale === true) {
      /* الحالة الأولى: النسخة المراجَعة المنقولة حرفياً — يجب أن تطابق اللقطة
         الموثّقة صفاً بصف، فلا يُدخل أحد تعديلاً يدوياً ويسمّيه «مراجَعاً». */
      const original = reference.tables.find((entry) => entry.league === table.league);
      assert.ok(original, `${table.league}: لا مقابل لها في اللقطة الموثّقة`);
      assert.equal(table.fetchedAt, original.fetchedAt, `${table.league}: وقت قراءة النسخة المراجَعة تغيّر`);
      assert.match(snapshot.provenance, /fixture-standings-snapshot\.json/, 'أصل النسخة المراجَعة غير موثّق');
      assert.deepEqual(
        table.entries.map((row) => [row.teamId, row.name, row.rank, row.points, row.goalDifference]),
        original.entries.map((row) => [row.teamId, row.name, row.rank, row.points, row.goalDifference]),
        `${table.league}: أرقام النسخة المراجَعة لا تطابق اللقطة الموثّقة`,
      );
    } else {
      /* الحالة الثانية: نسخة مجلوبة آلياً من نقطة المصدر — تُشترط وثيقة الأصل */
      assert.equal(table.stale, false, `${table.league}: قراءة حديثة يجب ألا تكون موسومة قديمة`);
      assert.match(table.sourceUrl, /^https:\/\/site\.web\.api\.espn\.com\/apis\/v2\/sports\/soccer\/[a-z0-9.]+\/standings$/, `${table.league}: رابط الأصل ليس نقطة المصدر المعتمدة`);
      assert.ok(Number.isFinite(Date.parse(table.fetchedAt)), `${table.league}: وقت قراءة غير سليم`);
      assert.match(snapshot.provenance, /ESPN/, 'أصل اللقطة غير موثّق');
      assert.match(snapshot.provenance, /probe-standings\.mjs/, 'المحكّم المستخدم غير موثّق في الأصل');
    }
  }
});

test('لا تُعرض بطولة بترتيب إلا إن كانت في قائمة الوسيط المسموحة وفي اللقطة', async () => {
  const php = await fs.readFile(path.join(root, 'standings.php'), 'utf8');
  const allowed = new Set([...php.matchAll(/^\s*'([a-z0-9.]+)'\s*=>\s*\['uid'/gim)].map((match) => match[1]));
  assert.ok(allowed.size >= 3, 'قائمة الوسيط المسموحة غير مقروءة');
  const inSnapshot = new Set(snapshot.tables.map((table) => table.league));

  for (const landing of landings) {
    const config = standings.standingsConfig(landing.standings?.leagueId ?? '');
    if (landing.standings) {
      assert.ok(allowed.has(landing.standings.leagueId), `${landing.slug}: الترتيب مطلوب من بطولة غير مسموحة في الوسيط`);
      assert.ok(inSnapshot.has(landing.standings.leagueId), `${landing.slug}: بلا جدول في اللقطة`);
      assert.ok(config, `${landing.slug}: البطولة غير مؤهَّلة في وحدة الترتيب`);
      const table = standings.leagueStandingsByLeague(snapshot, landing.standings.leagueId);
      assert.equal(table.entries.length, config.count, `${landing.slug}: عدد الصفوف لا يطابق إعلان البطولة`);
      assert.equal(landing.standingsUnavailable, undefined, `${landing.slug}: نص «غير متاح» مع جدول معروض`);
    } else {
      assert.ok(landing.standingsUnavailable, `${landing.slug}: بلا ترتيب وبلا نص «غير متاح» صريح`);
      assert.ok(!inSnapshot.has(landing.leagueId), `${landing.slug}: جدول متاح بلا إعلانه في الصفحة`);
    }
  }
});

test('كل جدول في اللقطة مؤهَّل في وحدة الترتيب، والعكس صحيح', () => {
  const configured = new Set(standings.STANDINGS_LEAGUES.map((entry) => entry.id));
  const snapshotted = new Set(snapshot.tables.map((table) => table.league));
  assert.deepEqual([...configured].sort(), [...snapshotted].sort(), 'قائمة البطولات المؤهَّلة لا تطابق اللقطة');
  for (const entry of standings.STANDINGS_LEAGUES) {
    assert.ok(entry.count > 0 && Number.isInteger(entry.count), `${entry.id}: عدد فرق غير سليم`);
  }
});

test('ترتيب البطولات المعتمد واحد في المصدرين: خريطة التنقّل وقائمة الصفحات', async () => {
  const navigation = await import('../src/navigation.mjs');
  const group = navigation.NAV_GROUPS.find((entry) => entry.key === 'tournaments');
  assert.ok(group, 'مجموعة البطولات والمنتخبات غير موجودة');
  const navSlugs = group.links
    .map((link) => /^matches\/(.+)\/$/.exec(link.href)?.[1])
    .filter(Boolean);
  const published = competitions.leagueLandingsInPageOrder().map((landing) => landing.slug);
  assert.deepEqual(navSlugs, published, 'ترتيب البطولات في خريطة التنقّل لا يطابق LEAGUE_PAGE_ORDER');
  const configured = competitions.LEAGUE_PAGE_ORDER.filter((slug) => published.includes(slug));
  assert.deepEqual(configured, published, 'ترتيب الصفحات المنشورة لا يطابق الترتيب المعتمد');
});

test('صفحة المواعيد تبني قائمة البطولات من المصدر نفسه (بلا قائمة ثانية)', async () => {
  const source = await fs.readFile(path.join(website, 'src/pages/MatchesPage.tsx'), 'utf8');
  assert.ok(source.includes('leagueLandingsInPageOrder'), 'قائمة البطولات في صفحة المواعيد لم تعد من المصدر المركزي');
  assert.equal(/href="\/matches\/[^"]+"/.test(source), false, 'ظهر رابط بطولة مكتوب يدوياً في صفحة المواعيد');
});

test('كل صفحة بطولة لها صورة مشاركة خاصة معلنة في seo.ts', async () => {
  const seo = await fs.readFile(path.join(website, 'src/seo.ts'), 'utf8');
  const declared = new Set([...seo.matchAll(/^\s*"matches\/([^"]+)":\s*"([^"]+)",/gm)].map((match) => match[1]));
  for (const landing of landings) {
    assert.ok(declared.has(landing.slug), `${landing.slug}: بلا ogImage خاص في OG_BY_ROUTE`);
  }
  const ogFiles = new Set([...seo.matchAll(/^\s*"matches\/[^"]+":\s*"([^"]+)",/gm)].map((match) => match[1]));
  for (const file of ogFiles) {
    const exists = await fs.access(path.join(website, `public/images/og/${file}.png`)).then(() => true, () => false);
    assert.ok(exists, `صورة المشاركة المعلنة غير موجودة: ${file}.png`);
  }
});

test('HTML المنشور: الجدول كامل بلا JavaScript، والحالات بنصوصها المعتمدة', async () => {
  const cases = [
    ['matches/الدوري-الإسباني/index.html', 'esp.1', 20],
    ['matches/الدوري-الإنجليزي/index.html', 'eng.1', 20],
    ['matches/دوري-أبطال-أوروبا/index.html', 'uefa.champions', 36],
  ];
  for (const [file, league, count] of cases) {
    const html = await readRoot(file);
    const $ = load(html);
    const section = $(`[data-league-standings="${league}"]`);
    assert.equal(section.length, 1, `${file}: قسم الترتيب غير موجود`);
    assert.equal(section.find('tbody tr').length, count, `${file}: صفوف الجدول لا تطابق عدد الفرق`);
    assert.ok(section.find('caption').text().includes('جدول الترتيب'), `${file}: بلا عنوان جدول`);
    assert.ok(section.find('[data-standings-status]').text().includes('آخر قراءة'), `${file}: بلا وقت آخر قراءة`);
    assert.ok(section.find('[data-standings-badge]').text().includes('بيانات قديمة'), `${file}: وسم «بيانات قديمة» مفقود من العقد`);
    assert.equal(section.find('[data-standings-badge]').attr('hidden') !== undefined, true, `${file}: الوسم ظاهر في اللقطة الثابتة`);
    /* لا نصوص تشخيص داخلية ولا أسماء مزوّدين خارج المصدر المعلن في الصفحة */
    assert.equal(/UPSTREAM_|SchemaChanged/.test(section.text()), false, `${file}: نص تشخيص داخلي ظاهر`);
  }
  const saudi = await readRoot('matches/الدوري-السعودي/index.html');
  const $saudi = load(saudi);
  assert.equal($saudi('[data-league-standings]').length, 0, 'الدوري السعودي: ظهر جدول ترتيب قبل إثبات المصدر');
  const saudiUnavailable = $saudi('.league-standings--unavailable').text();
  assert.ok(saudiUnavailable.includes('غير متاح') && saudiUnavailable.includes('مصدر موثّق'), 'الدوري السعودي: نص «غير متاح» غير صريح');
  assert.ok(saudiUnavailable.includes('لا يُستكمل من موقع آخر'), 'الدوري السعودي: ينقصه إعلان عدم التخمين');
});

/* ==========================================================================
   مسبار البوابة — حكمه هو ما يقرر إدخال بطولة أو تركها «غير متاح»، فيُحكَّم
   هنا على استجابات مصنوعة بنفس بنية المصدر. لا شبكة خارجية: خادم محلي فقط.
   ========================================================================== */
const probe = await import('./probe-standings.mjs');

const upstreamFor = (entries, { season = 2026, rootName = 'Test League', childName = 'Domestic League' } = {}) => ({
  uid: 's:600~l:999',
  children: [{
    name: childName,
    standings: {
      name: 'overall',
      season,
      entries: entries.map(([id, displayName, rank, points, played]) => ({
        team: { id, displayName },
        stats: [
          { name: 'rank', value: rank },
          { name: 'points', value: points },
          { name: 'gamesPlayed', value: played },
          { name: 'wins', value: 1 },
          { name: 'ties', value: 0 },
          { name: 'losses', value: 0 },
          { name: 'pointsFor', value: 3 },
          { name: 'pointsAgainst', value: 1 },
          { name: 'pointDifferential', value: 2 },
        ],
      })),
    },
  }],
  name: rootName,
});

test('المسبار: يقبل استجابة سليمة ويطبع العدد المقترح للمعرّف', () => {
  const judged = probe.judgeStandings(upstreamFor([
    ['1', 'Alpha', 1, 6, 2],
    ['2', 'Beta', 2, 3, 2],
  ]), 'test.1');
  assert.equal(judged.teams, 2);
  assert.equal(judged.suggestedCount, 2);
  assert.equal(judged.uid, 's:600~l:999');
  assert.equal(judged.sample[0].name, 'Alpha');
  assert.equal(judged.rows[1].points, 3);
});

test('المسبار: يرفض كل انحراف يرفضه الوسيط — لا بطولة تُضاف بفحص لين', () => {
  const twoGroups = upstreamFor([['1', 'Alpha', 1, 6, 2]]);
  twoGroups.children.push(structuredClone(twoGroups.children[0]));
  assert.throws(() => probe.judgeStandings(twoGroups, 'test.1'), /exactly one overall group/);

  const wrongName = upstreamFor([['1', 'Alpha', 1, 6, 2]]);
  wrongName.children[0].standings.name = 'home';
  assert.throws(() => probe.judgeStandings(wrongName, 'test.1'), /exactly one overall group/);

  const badSeason = upstreamFor([['1', 'Alpha', 1, 6, 2]], { season: 1990 });
  assert.throws(() => probe.judgeStandings(badSeason, 'test.1'), /bad season/);

  const duplicateRank = upstreamFor([['1', 'Alpha', 1, 6, 2], ['2', 'Beta', 1, 3, 2]]);
  assert.throws(() => probe.judgeStandings(duplicateRank, 'test.1'), /bad rank/);

  const duplicateId = upstreamFor([['1', 'Alpha', 1, 6, 2], ['1', 'Beta', 2, 3, 2]]);
  assert.throws(() => probe.judgeStandings(duplicateId, 'test.1'), /bad team id/);

  const noNumbers = upstreamFor([['1', 'Alpha', 1, '11/20', 2]]);
  for (const stat of noNumbers.children[0].standings.entries[0].stats) stat.value = '?';
  assert.throws(() => probe.judgeStandings(noNumbers, 'test.1'), /bad rank|no numeric columns/);

  /* uefa.champions يشترط حاوياً باسم «League Phase» تحديداً */
  const wrongPhase = upstreamFor([['1', 'Alpha', 1, 6, 2]]);
  assert.throws(() => probe.judgeStandings(wrongPhase, 'uefa.champions'), /exactly one overall group/);
  const rightPhase = upstreamFor([['1', 'Alpha', 1, 6, 2]], { childName: 'League Phase' });
  assert.equal(probe.judgeStandings(rightPhase, 'uefa.champions').teams, 1);
});

test('المسبار يعمل على خادم محلي: نجاح وردّ HTTP غير سليم', async () => {
  const http = await import('node:http');
  const server = http.createServer((request, response) => {
    if (request.url.includes('good.1')) {
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify(upstreamFor([['7', 'Gamma', 1, 9, 3], ['8', 'Delta', 2, 4, 3]])));
      return;
    }
    response.writeHead(503).end('{}');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const good = await probe.probeStandings('good.1', base);
    assert.equal(good.teams, 2);
    assert.match(good.url, /\/apis\/v2\/sports\/soccer\/good\.1\/standings$/);
    await assert.rejects(() => probe.probeStandings('down.1', base), /UPSTREAM_HTTP_503/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('أسماء الفرق في الصفحة هي أسماء المصدر نفسها (RTL بترتيب صحيح)', async () => {
  const html = await readRoot('matches/الدوري-الإسباني/index.html');
  const $ = load(html);
  const table = standings.leagueStandingsByLeague(snapshot, 'esp.1');
  assert.equal(table.entries.length, Number(snapshot.tables.find((entry) => entry.league === 'esp.1').entries.length));
  const first = $(`[data-league-standings="esp.1"] tbody tr`).first();
  assert.equal(first.find('td').first().text().trim(), String(table.entries[0].rank), 'المركز الأول لا يطابق المصدر');
  assert.equal(first.find('th').first().text().trim(), table.entries[0].name, 'اسم الفريق الأول لا يطابق المصدر');
});
