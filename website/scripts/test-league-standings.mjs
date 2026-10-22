import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { load } from 'cheerio';
import { isApprovedCrestUrl } from '../src/lib/leader-logo.mjs';
import { LEAGUE_ICONS } from '../src/lib/league-icons.mjs';

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
      assert.match(table.sourceUrl, /^https:\/\/(site\.web\.api\.espn\.com\/apis\/v2\/sports\/soccer\/[a-z0-9.]+\/standings|soccer\.highlightly\.net\/standings)(\?.*)?$/, `${table.league}: رابط الأصل ليس نقطة المصدر المعتمدة`);
      assert.ok(Number.isFinite(Date.parse(table.fetchedAt)), `${table.league}: وقت قراءة غير سليم`);
      assert.match(snapshot.provenance, /ESPN/, 'أصل اللقطة غير موثّق');
      assert.match(snapshot.provenance, /probe-standings\.mjs/, 'المحكّم المستخدم غير موثّق في الأصل');
    }
  }
});

test('لا تُعرض بطولة بترتيب إلا إن كانت في قائمة الوسيط المسموحة وفي اللقطة', async () => {
  const php = await fs.readFile(path.join(root, 'standings.php'), 'utf8');
  const espnShape = [...php.matchAll(/^\s*'([a-z0-9.]+)'\s*=>\s*\['uid'/gim)].map((match) => match[1]);
  const highlightlyShape = [...php.matchAll(/^\s*'([a-z0-9.]+)'\s*=>\s*\['leagueId'/gim)].map((match) => match[1]);
  const allowed = new Set([...espnShape, ...highlightlyShape]);
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
  const group = navigation.NAV_GROUPS.find((entry) => entry.key === 'matches');
  assert.ok(group, ' مجموعة المباريات غير موجودة');
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
    ['matches/الدوري-الفرنسي/index.html', 'fra.1', 18],
    ['matches/الدوري-الألماني/index.html', 'ger.1', 18],
    ['matches/الدوري-الإيطالي/index.html', 'ita.1', 20],
    ['matches/الدوري-السعودي/index.html', 'ksa.1', 18],
    ['matches/الدوري-المصري/index.html', 'egy.1', 20],
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

    /* أيقونة بجانب اسم كل فريق من مضيف مزوّد المباريات نفسه (leader-logo.mjs):
       ESPN لبطولاته، وHighlightly للدوري المصري — بعدد الفرق كاملاً */
    const crestSource = league === 'egy.1' ? 'highlightly' : 'espn';
    assert.equal(
      section.find(`th.ls-team img[data-crest-source="${crestSource}"]`).length,
      count,
      `${file}: أيقونات الفرق (${crestSource}) في جدول الترتيب ناقصة`,
    );
    assert.equal(
      section.find('th.ls-team .ls-team-cell').length,
      count,
      `${file}: خلايا الفريق المركّبة (أيقونة + اسم) ناقصة`,
    );
  }
  /* المصري أُهِّل بمسبار 2026-10-17 لدى Highlightly (leagueId=199067،
     عشرون فريقاً) — والحقل الذي يعرض «غير متاح» يبقى قائماً في المصدر
     لأي بطولة يفشل مسبارها لاحقاً. */
  const egyptConfig = standings.standingsConfig('egy.1');
  assert.ok(
    egyptConfig && egyptConfig.count === 20 && egyptConfig.provider === 'Highlightly',
    'المصري: أُثبت بمسبار Highlightly ويجب أن يكون مؤهَّلاً بعشرين فريقاً',
  );
  assert.ok(
    /standingsUnavailable/.test(await fs.readFile(path.join(website, 'src/content/competitions.ts'), 'utf8'))
      && /standingsUnavailable/.test(await fs.readFile(path.join(website, 'src/pages/LeagueLandingPage.tsx'), 'utf8')),
    'مسار «غير متاح» أُزيل من المصدر — لا بديل صريح لبطولة يفشل مسبارها',
  );
  for (const landing of landings) {
    const html = await readRoot(`matches/${landing.slug}/index.html`);
    const $ = load(html);
    if (landing.standings) {
      assert.equal($('.league-standings--unavailable').length, 0, `${landing.slug}: نص «غير متاح» مع جدول معروض`);
    } else {
      const text = $('.league-standings--unavailable').text();
      assert.ok(text.includes('غير متاح'), `${landing.slug}: بلا جدول وبلا نص «غير متاح»`);
    }
  }
});

test('قائمة الوسيط وخريطة الواجهة وتقرير المسبار: ثلاثتها متطابقة على نفس المعرّفات والأعداد', async () => {
  const php = await fs.readFile(path.join(root, 'standings.php'), 'utf8');
  /* ملاحظة مهمة: معرّفات ESPN تحتوي أرقاماً («eng.1»)، فالنمط يجب أن يقبلها */
  const phpLeagues = [
    ...[...php.matchAll(/'([a-z0-9.]+)'\s*=>\s*\['uid'\s*=>\s*'([^']+)',\s*'count'\s*=>\s*(\d+)\]/g)]
      .map((match) => ({ id: match[1], uid: match[2], count: Number(match[3]) })),
    ...[...php.matchAll(/'([a-z0-9.]+)'\s*=>\s*\['leagueId'\s*=>\s*(\d+),\s*'season'\s*=>\s*(\d+),\s*'count'\s*=>\s*(\d+)\]/g)]
      .map((match) => ({ id: match[1], leagueId: Number(match[2]), season: Number(match[3]), count: Number(match[4]) })),
  ];
  assert.equal(phpLeagues.length, standings.STANDINGS_LEAGUES.length, 'عدد بطولات الوسيط لا يطابق الواجهة');
  const report = await readJson('docs/standings-probe-report.json');
  const evidence = new Map([...report.snapshot, ...report.probe]
    .filter((entry) => entry.ok !== false)
    .map((entry) => [entry.league, entry]));
  for (const entry of standings.STANDINGS_LEAGUES) {
    const allowed = phpLeagues.find((row) => row.id === entry.id);
    assert.ok(allowed, `${entry.id}: في الواجهة وغير مسموح في الوسيط`);
    assert.equal(allowed.count, entry.count, `${entry.id}: عدد الفرق لا يطابق الوسيط`);
    const proof = evidence.get(entry.id);
    assert.ok(proof, `${entry.id}: بلا سند مسبار في تقرير المصدر`);
    assert.equal(proof.uid ?? proof.leagueId, allowed.uid ?? allowed.leagueId, `${entry.id}: معرّف الوسيط لا يطابق ما أثبته المسبار`);
    assert.equal(proof.teams ?? proof.count, entry.count, `${entry.id}: عدد المسبار لا يطابق إعلان البطولة`);
  }
  for (const row of phpLeagues) {
    assert.ok(standings.standingsConfig(row.id), `${row.id}: مسموح في الوسيط وغير مؤهَّل في الواجهة`);
  }
  /* البطولة غير المثبتة تبقى موثّقة كفشل صريح لا كنقص صامت */
  assert.ok(report.probe.some((entry) => entry.ok === false), 'تقرير المسبار بلا أي سجل فشل موثّق');
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

test('بطاقة «الهجوم والدفاع — معدلات أهداف الموسم» مرسومة مسبقاً في كل صفحات البطولات الثماني وتستبدل الفقرة النصية القديمة', async () => {
  const { standingsRates } = await import('../src/lib/fixtures-archive.mjs');
  const cases = [
    ['matches/الدوري-الإسباني/index.html', 'esp.1', 20],
    ['matches/الدوري-الإنجليزي/index.html', 'eng.1', 20],
    ['matches/دوري-أبطال-أوروبا/index.html', 'uefa.champions', 36],
    ['matches/الدوري-الفرنسي/index.html', 'fra.1', 18],
    ['matches/الدوري-الألماني/index.html', 'ger.1', 18],
    ['matches/الدوري-الإيطالي/index.html', 'ita.1', 20],
    ['matches/الدوري-السعودي/index.html', 'ksa.1', 18],
    ['matches/الدوري-المصري/index.html', 'egy.1', 20],
  ];

  for (const [file, league, count] of cases) {
    const html = await readRoot(file);
    const $ = load(html);
    assert.equal(html.includes('أهداف لكل مباراة من جدول الموسم'), false, `${file}: الفقرة القديمة لم تُستبدل`);

    const card = $(`[data-standings-rates="${league}"]`);
    assert.equal(card.length, 1, `${file}: بطاقة معدلات الهجوم والدفاع غير موجودة`);
    assert.equal(card.find('h3').text().trim(), 'الهجوم والدفاع — معدلات أهداف الموسم');
    assert.ok(
      card.find('.ls-rates-subtitle').text().includes('محسوبة من جدول الترتيب الحالي فقط، بلا أي بيانات خارجية'),
      `${file}: الوصف الفرعي غير مطابق`,
    );
    const note = card.find('.ls-rates-note').text();
    assert.ok(note.includes('يشمل التصنيف جميع الفرق المتعادلة'), `${file}: ملاحظة التذييل مفقودة`);
    assert.ok(note.includes('غير مكتملة'), `${file}: ملاحظة اكتمال البيانات مفقودة`);

    const subCards = card.find('[data-rate-card]');
    assert.equal(subCards.length, 4, `${file}: يجب أن تحوي البطاقة 4 بطاقات فرعية`);
    const titles = subCards.map((_, el) => $(el).find('h4').text().trim()).get();
    assert.deepEqual(titles, ['أقوى هجوم', 'أضعف هجوم', 'أقوى دفاع', 'أضعف دفاع']);

    assert.equal(card.find('[data-rate-card="best-attack"] [data-rate-unit]').text().trim(), 'هدف مسجل/مباراة');
    assert.equal(card.find('[data-rate-card="worst-attack"] [data-rate-unit]').text().trim(), 'هدف مسجل/مباراة');
    assert.equal(card.find('[data-rate-card="best-defence"] [data-rate-unit]').text().trim(), 'هدف مستقبَل/مباراة');
    assert.equal(card.find('[data-rate-card="worst-defence"] [data-rate-unit]').text().trim(), 'هدف مستقبَل/مباراة');

    /* الإصدار التحليلي: شريط مؤشرات المسابقة + مقارنة بمعدل المتوسط في كل بطاقة فرعية
       (يُرسم مسبقاً بلا أي طلب خارجي) */
    assert.equal(card.find('[data-rates-kpis] [data-rates-kpi]').length, 4, `${file}: شريط مؤشرات المسابقة ناقص`);
    assert.equal(card.find('[data-rate-delta]').length, 4, `${file}: شارات المقارنة بمتوسط الدوري ناقصة`);
    assert.equal(card.find('[data-rate-bench]').length, 4, `${file}: أشرطة المعيار المرجعي ناقصة`);
    assert.equal(card.find('[data-rate-bench-avg]').length, 4, `${file}: علامات متوسط الدوري ناقصة`);
    assert.equal(card.find('[data-rate-sample]').length, 4, `${file}: مقاييس العينة (الأهداف/المباريات) ناقصة`);
    assert.equal(card.find('[data-rate-sort]').length, 12, `${file}: أزرار فرز أعمدة الجدول التحليلي ناقصة`);
    assert.equal(card.find('[data-rate-sort="attackDelta"]').length, 1, `${file}: عمود فارق الهجوم عن المتوسط غير قابل للفرز`);
    assert.equal(card.find('[data-rate-sort="defenceDelta"]').length, 1, `${file}: عمود فارق الدفاع عن المتوسط غير قابل للفرز`);
    /* كل شارة فريق تحمل علامة بصرية: شعار محلي معتمد أو شعار مزوّد الترتيب
       (نفس مصدر بطاقات المباريات الحيّة) أو درع مونوغرام كاحتياط أخير */
    card.find('[data-rate-team]').each((_, teamEl) => {
      const hasMark = $(teamEl).find('img').length > 0 || $(teamEl).find('[data-rate-crest]').length > 0;
      assert.equal(hasMark, true, `${file}: شارة فريق بلا علامة بصرية`);
    });
    assert.equal(card.find('[data-rate-team-rank]').length > 0, true, `${file}: مراكز الفرق داخل الشارات مفقودة`);
    assert.equal(card.find('[data-rate-team-goals]').length > 0, true, `${file}: إجمالي الأهداف داخل الشارات مفقودة`);
    assert.equal(card.find('[data-rate-team-mp]').length > 0, true, `${file}: عدد المباريات داخل الشارات مفقودة`);

    const tableData = standings.leagueStandingsByLeague(snapshot, league);
    const expected = standingsRates(tableData.entries);
    assert.equal(
      card.find('[data-rate-card="best-attack"] [data-rate-value]').text().trim(),
      expected.bestAttack[0].attack.toFixed(2),
    );
    assert.equal(
      card.find('[data-rate-card="best-defence"] [data-rate-value]').text().trim(),
      expected.bestDefence[0].defence.toFixed(2),
    );
    assert.deepEqual(
      card.find('[data-rate-card="best-defence"] [data-rate-team-name]').map((_, el) => $(el).text().trim()).get(),
      expected.bestDefence.map((t) => t.name),
      `${file}: أسماء المتعادلين في أقوى دفاع غير مطابقة`,
    );

    const details = card.find('details[data-rates-details]');
    assert.equal(details.length, 1, `${file}: قسم التفاصيل القابل للطي مفقود`);
    assert.equal(details.attr('open'), undefined, `${file}: قسم التفاصيل يجب أن يكون مطوياً افتراضياً`);
    assert.equal(details.find('summary').text().trim(), 'عرض معدلات جميع الفرق — جدول تحليلي قابل للفرز');
    assert.equal(details.find('tr[data-rate-row]').length, count, `${file}: صفوف جدول المعدلات لا تطابق عدد فرق البطولة`);
    assert.equal(details.find('[data-rate-tactic]').length, count, `${file}: التصنيف التكتيكي لكل فريق مفقود`);
    /* فارقا كل فريق عن متوسط المسابقة في الجدول، وصف متوسطات المسابقة
       مطابقاً لحساب standingsRates نفسه (هجومه = متوسط الدوري المرجعي) */
    assert.equal(details.find('[data-rate-attack-delta]').length, count, `${file}: خلايا فارق الهجوم عن المتوسط ناقصة`);
    assert.equal(details.find('[data-rate-defence-delta]').length, count, `${file}: خلايا فارق الدفاع عن المتوسط ناقصة`);
    assert.equal(details.find('[data-rates-averages]').length, 1, `${file}: صف متوسط المسابقة مفقود`);
    assert.equal(
      details.find('[data-rates-avg="attack"]').text().trim(),
      expected.league.averages.attack.toFixed(2),
      `${file}: متوسط هجوم المسابقة في التذييل غير مطابق للحساب`,
    );
    assert.equal(details.find('[data-rates-avg="attackDelta"]').text().trim(), '0.00', `${file}: متوسط فارق الهجوم الموزون يجب أن يؤول لصفر`);
    /* شريط «الأول في كل مقياس»: 12 شريحة بأسماء مطابقة لحساب المتصدّرين */
    assert.equal(details.find('[data-rates-leaders] [data-rate-leader]').length, 12, `${file}: شرائح متصدّري المقاييس الاثني عشر ناقصة`);
    assert.ok(
      details.find('[data-rate-leader="attack"]').text().includes(expected.league.leaders.attack.teams[0].name),
      `${file}: متصدّر هجوم/م في الشريط لا يطابق الحساب`,
    );
    assert.ok(
      details.find('[data-rate-leader="goalsAgainst"]').text().includes(expected.league.leaders.goalsAgainst.teams[0].name),
      `${file}: متصدّر «عليه» (الأدنى استقبالاً) في الشريط لا يطابق الحساب`,
    );
    /* مؤشر القوة المركّب: خلية لكل فريق ومتصدّر مطابق، وصفّا التوزيع
       (وسيط/انحراف هجوم المسابقة) مطابقان لحساب المكتبة */
    assert.equal(details.find('[data-rate-power]').length, count, `${file}: خلايا مؤشر القوة ناقصة`);
    assert.ok(
      details.find('[data-rate-leader="power"]').text().includes(expected.league.leaders.power.teams[0].name),
      `${file}: متصدّر مؤشر القوة في الشريط لا يطابق الحساب`,
    );
    assert.equal(
      details.find('[data-rates-median="attack"]').text().trim(),
      expected.league.distributions.attack.median.toFixed(2),
      `${file}: وسيط هجوم المسابقة غير مطابق لتوزيع الفرق`,
    );
    assert.equal(
      details.find('[data-rates-sd="attack"]').text().trim(),
      expected.league.distributions.attack.sd.toFixed(2),
      `${file}: انحراف هجوم المسابقة المعياري غير مطابق لتوزيع الفرق`,
    );

    /* قشرة «تذكرة البطولة» على لوح البطاقة الرئيسي — نفس عقد تذكرة صدر
       الصفحة: شعاع مموّه + 4 خطوط متقاطعة + نقطة ضوء + شارة البطولة */
    assert.equal(card.find('.ls-rates-ticket-ray').length, 1, `${file}: شعاع تذكرة بطاقة المعدلات مفقود`);
    assert.equal(card.find('.ls-rates-ticket-line').length, 4, `${file}: خطوط تذكرة بطاقة المعدلات الأربعة مفقودة`);
    assert.equal(card.find('.ls-rates-ticket-dot').length, 1, `${file}: نقطة ضوء تذكرة بطاقة المعدلات مفقودة`);
    assert.equal(
      card.find('.ls-rates-ticket-badge .league-carousel-badge').length,
      1,
      `${file}: شارة البطولة في رأس تذكرة بطاقة المعدلات مفقودة`,
    );
    /* حلقات المؤشر المركزي الزجاجية (روح قالب tricky-turtle-16) حول الرقم */
    assert.equal(card.find('.ls-rates-result-box .ls-rates-ring').length, 5, `${file}: حلقات المؤشر المركزي الخمس مفقودة`);

    // الشعارات: محلي معتمد أو من مضيف مزوّد الترتيب المعتمد (ESPN/Highlightly)
    // أو شعار البطولة نفسه من خريطة الأيقونات الواحدة (رأس التذكرة) لا غير
    card.find('img').each((_, img) => {
      const src = $(img).attr('src') || '';
      const isLocal = /^\/images\/teams\/[a-z0-9-]+-club-badge\.webp$/.test(src);
      const isLeagueIcon = Object.values(LEAGUE_ICONS).includes(src);
      assert.ok(isLocal || isLeagueIcon || isApprovedCrestUrl(src), `${file}: مصدر شعار غير معتمد: ${src}`);
    });
  }

  // التحقق من Brighton & Hove Albion وعدم ظهور &amp; للمستخدم أو استخدام dangerouslySetInnerHTML
  const engHtml = await readRoot('matches/الدوري-الإنجليزي/index.html');
  const $eng = load(engHtml);
  const engCardText = $eng('[data-standings-rates="eng.1"]').text();
  assert.ok(engCardText.includes('Brighton & Hove Albion'), 'اسم Brighton & Hove Albion غير ظاهر بشكل سليم');
  assert.equal(engCardText.includes('&amp;'), false, 'ظهر ترميز &amp; خام للمستخدم');
  assert.equal(
    $eng('[data-standings-rates="eng.1"] [data-rate-card="best-defence"] img[src="/images/teams/manchester-city-club-badge.webp"]').length,
    1,
    'شعار Manchester City المحلي المعتمد غير معروض في البطاقة الفرعية',
  );
  /* شعارات الفرق بلا شعار محلي تُجلب من مضيف ESPN نفسه (مصدر مواعيد المباريات
     وبطاقاتها الحيّة) — مثل Tottenham في تصنيف أضعف هجوم */
  assert.equal(
    $eng('[data-standings-rates="eng.1"] img[data-crest-source="espn"]').length > 0,
    true,
    'شعارات ESPN (نفس مصدر المباريات) غير ظاهرة في بطاقة المعدلات',
  );
  /* الدوري المصري مزوّده Highlightly — فتُجلب شعارات فرقه من مضيفه المعتمد ذاته */
  const $egy = load(await readRoot('matches/الدوري-المصري/index.html'));
  assert.equal(
    $egy('[data-standings-rates="egy.1"] img[data-crest-source="highlightly"]').length > 0,
    true,
    'شعارات Highlightly (نفس مصدر مباريات الدوري المصري) غير ظاهرة في بطاقة المعدلات',
  );

  for (const rel of ['src/components/StandingsRatesCard.tsx', 'src/components/LeagueStandings.tsx']) {
    const src = await fs.readFile(path.join(website, rel), 'utf8');
    assert.equal(src.includes('dangerouslySetInnerHTML'), false, `${rel}: يُمنع استخدام dangerouslySetInnerHTML`);
  }
});

test('StandingsRatesCard: استقلالية صلاحية الهجوم عن الدفاع، عرض «غير متاح»، وتحديث حالة البيانات القديمة', async () => {
  const { build } = await import('esbuild');
  /* import.meta.glob خاص بـ Vite — في هذا الاختبار (esbuild + Node) نستبدله
     بدالة فارغة كي تُحزم المكوّن كما هو، وبدون أرشيف محلي محمَّل. */
  globalThis.__SM_GLOB_STUB__ = () => ({});
  const bundled = await build({
    entryPoints: [path.join(website, 'src/components/StandingsRatesCard.tsx')],
    bundle: true,
    format: 'esm',
    platform: 'node',
    write: false,
    /* المكوّن يستورد ورقة أنماطه المستقلة (standings-rates-card.css) كما هو
       متّبع في league-ticket.css — في سياق Node/إس‌إس‌آر نُفرغها بالغافل
       «empty» دون أي مساس بمنطق المكوّن أو تأكيدات هذا الاختبار. */
    loader: { '.css': 'empty' },
    /* نُبقي React خارج الحزمة كي تشترك مع مُصيِّر الاختبار في نسخة React واحدة
       (لكن نسختين مستقلتين تطلّان خطأ "Invalid hook call"). */
    external: ['react', 'react/jsx-runtime'],
    define: { 'import.meta.glob': 'globalThis.__SM_GLOB_STUB__' },
  });
  /* URL البيانات لا يحلّ المقاولات المطلقة مثل "react" — نكتب الحزمة في ملف
     مؤقت داخل website/ (مُتجاهَل من git) حتى تُحلّ react من node_modules نفسها. */
  const tempFile = path.join(website, 'playwright-report', `rates-card-bundle-${process.pid}-${Date.now()}.mjs`);
  await fs.mkdir(path.dirname(tempFile), { recursive: true });
  await fs.writeFile(tempFile, bundled.outputFiles[0].text, 'utf8');
  const React = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  let StandingsRatesCard;
  try {
    ({ default: StandingsRatesCard } = await import(pathToFileURL(tempFile).href));
  } finally {
    await fs.rm(tempFile, { force: true });
  }

  // 1) غياب goalsAgainst لفريق واحد يوقف تصنيف الدفاع فقط ويبقي الهجوم متاحاً
  const htmlAttackOnly = renderToStaticMarkup(
    React.createElement(StandingsRatesCard, {
      league: 'eng.1',
      seasonLabel: '2026/27',
      provider: 'ESPN',
      updatedText: '17 أكتوبر 2026',
      stale: false,
      entries: [
        { teamId: '382', name: 'Manchester City', goalsFor: 9, goalsAgainst: null, played: 3 },
        { teamId: '359', name: 'Arsenal', goalsFor: 3, goalsAgainst: 1, played: 3 },
      ],
    }),
  );
  const $a = load(htmlAttackOnly);
  assert.equal($a('[data-rate-card="best-attack"] [data-rate-value]').text().trim(), '3.00');
  assert.equal($a('[data-rate-card="worst-attack"] [data-rate-value]').text().trim(), '1.00');
  assert.equal($a('[data-rate-card="best-defence"] [data-rate-unavailable]').text().trim(), 'غير متاح');
  assert.equal($a('[data-rate-card="worst-defence"] [data-rate-unavailable]').text().trim(), 'غير متاح');
  assert.equal($a('[data-rates-stale-badge]').attr('hidden') !== undefined, true);
  /* فارق الهجوم عن المتوسط لكل فريق + صف متوسط المسابقة ببيانات جزئية:
     المتوسط المرجعي (9+3)÷(3+3)=2.00، ومتوسط الدفاع من Arsenal وحده
     صاحب القيمة (1÷3) — الناقص خارج حساب عموده لا صفراً فيه */
  assert.equal($a('[data-rate-row="382"] [data-rate-attack-delta]').text().trim(), '+1.00');
  assert.equal($a('[data-rates-avg="attack"]').text().trim(), '2.00');
  assert.equal($a('[data-rates-avg="defence"]').text().trim(), '0.33');
  /* شريط المتصدّرين ببيانات جزئية: الهجوم محسوم لسيتي (3.00) والدفاع
     «غير متاح» لغياب goalsAgainst عنده — لا أولَ مختلقاً بمقياس ناقص */
  assert.ok($a('[data-rate-leader="attack"]').text().includes('Manchester City'));
  assert.ok($a('[data-rate-leader="attack"]').text().includes('3.00'));
  assert.equal($a('[data-rate-leader="defence"]').text().includes('غير متاح'), true);
  /* مؤشر القوة بلا دفاع صالح التوزيع ⇒ «غير متاح»، ووسيط الهجوم من القيمتين (3,1) */
  assert.equal($a('[data-rate-row="382"] [data-rate-power]').text().trim(), 'غير متاح');
  assert.equal($a('[data-rates-median="attack"]').text().trim(), '2.00');

  // 2) غياب goalsFor لفريق واحد يوقف تصنيف الهجوم فقط ويبقي الدفاع متاحاً، مع إظهار شارة البيانات القديمة
  const htmlDefenceOnly = renderToStaticMarkup(
    React.createElement(StandingsRatesCard, {
      league: 'eng.1',
      seasonLabel: '2026/27',
      provider: 'ESPN',
      updatedText: '17 أكتوبر 2026',
      stale: true,
      entries: [
        { teamId: '331', name: 'Brighton &amp; Hove Albion', goalsFor: null, goalsAgainst: 2, played: 4 },
        { teamId: '359', name: 'Arsenal', goalsFor: 8, goalsAgainst: 6, played: 4 },
      ],
    }),
  );
  const $d = load(htmlDefenceOnly);
  assert.equal($d('[data-rate-card="best-attack"] [data-rate-unavailable]').text().trim(), 'غير متاح');
  assert.equal($d('[data-rate-card="worst-attack"] [data-rate-unavailable]').text().trim(), 'غير متاح');
  assert.equal($d('[data-rate-card="best-defence"] [data-rate-value]').text().trim(), '0.50');
  assert.equal($d('[data-rate-card="best-defence"] [data-rate-team-name]').text().trim(), 'Brighton & Hove Albion');
  /* الحصيلة الخام (حجم العينة) تظهر بجانب المعدل: هدفان مستقبلان في 4 مباريات */
  assert.ok($d('[data-rate-card="best-defence"] [data-rate-sample]').text().includes('4'));
  assert.ok($d('[data-rate-card="best-defence"] [data-rate-delta]').length === 1);
  assert.equal($d('[data-rates-stale-badge]').attr('hidden'), undefined);
  /* بلا goalsFor لـBrighton: فارق هجومه «غير متاح» ومتوسط هجوم المسابقة
     من Arsenal صاحب القيمة وحده (8÷4)، ومتوسط الدفاع (2+6)÷(4+4) */
  assert.equal($d('[data-rate-row="331"] [data-rate-attack-delta]').text().trim(), 'غير متاح');
  assert.equal($d('[data-rates-avg="attack"]').text().trim(), '2.00');
  assert.equal($d('[data-rates-avg="defence"]').text().trim(), '1.00');
});
