#!/usr/bin/env node
/**
 * مسبار بوابة المباريات — إثبات معرّف بطولة قبل الاعتماد عليها في الجدول
 * ------------------------------------------------------------------------
 * هذا السكربت لا يعدّل أي ملف ولا ينشر شيئاً. وظيفته الوحيدة: يسأل مصدر
 * المباريات (ESPN) عن كل بطولة في `LEAGUES` ويحكم على الاستجابة **بنفس
 * الدالة التي تعرض بها الصفحة الجدول** (`parseScoreboard`)، ثم يطبع
 * تقريراً جاهزاً للنسخ.
 *
 * لماذا يعمل خارج بيئة الوكيل؟ لأن بيئة التطوير قد تحجب ESPN، فتشغّله أنت
 * من جهازك وترسل المخرجات. وهو لا يثبت سوى أمر واحد: أن المصدر يخدم هذا
 * المعرّف فعلاً ويرسل أحداثاً تُعرض كما هي. لا يثبت الترتيب (بوابته
 * `probe-standings.mjs`) ولا يثبت الأرشيف (بوابته `fixtures-archive.md`).
 *
 * ⚠️ قيد المصدر الموثّق: ESPN **لا يقبل نطاق تواريخ** في معامل `dates`.
 * الطلب `?dates=20261020-20261103` يُرجع HTTP 400
 * «Failed to get events endpoint.» — مُثبت لبطلات قائمة أصلاً (`eng.1`)
 * كما للبطولات القارية، فليس علامة على معرّف خاطئ. لذلك يسأل هذا المسبار
 * **يوماً واحداً في كل طلب** ثم يدمج النتائج، وهو نفس سلوك
 * `scoreboard.php` (`sm_espn_days` → `single_day_upstream_url`).
 *
 * الاستخدام:
 *   node scripts/probe-matches-leagues.mjs                  # كل البطولات
 *   node scripts/probe-matches-leagues.mjs caf.champions afc.champions
 *   node scripts/probe-matches-leagues.mjs --json > probe.json
 *   node scripts/probe-matches-leagues.mjs --from=2026-10-01 --to=2026-10-31
 *
 * القواعد المحكَّمة (مطابقة لما تراه الصفحة):
 *   استجابة 200 · JSON صالح · `leagues[0].slug` يطابق المعرّف المطلوب
 *   (يمنع بطولة تُعيد بيانات غيرها بصمت) · مصفوفة أحداث · تُحلَّل الأحداث
 *   بـ `parseScoreboard` فتُعرض العيّنة كما ستراها الصفحة تماماً.
 *   نافذة بلا مباريات نتيجة مقبولة لا فشل: أسبوع بلا جولة وارد في بطولة
 *   قائمة، والفشل يعني أن المصدر لا يخدم المعرّف أصلاً.
 *
 * ملاحظة اختبارية: `MATCHES_PROBE_BASE` يبدّل أصل الطلب، وتستعمله
 * الاختبارات مع خادم محلي كي تُحكَّم الحالات بلا شبكة خارجية.
 */
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { LEAGUES, parseScoreboard } from '../src/lib/matches.mjs';

export const PROBE_BASE = process.env.MATCHES_PROBE_BASE || 'https://site.api.espn.com';
/** سقف ESPN الموثّق في php-lib/espn_source.php (UPSTREAM_LIMIT) */
const LIMIT = 500;

function isoDay(date) {
  return date.toISOString().slice(0, 10);
}

export function defaultWindow(now = new Date()) {
  return {
    from: isoDay(new Date(now.getTime() - 7 * 86400000)),
    to: isoDay(new Date(now.getTime() + 7 * 86400000)),
  };
}

/** أيام النافذة (YYYY-MM-DD) بترتيب تصاعدي — يوماً واحداً لكل طلب. */
export function probeDays(from, to) {
  const days = [];
  for (let t = Date.parse(`${from}T00:00:00Z`); t <= Date.parse(`${to}T00:00:00Z`); t += 86400000) {
    days.push(isoDay(new Date(t)));
  }
  return days;
}

/** رابط يوم واحد فقط — ESPN يرفض نطاق التواريخ برمز 400. */
export function probeUrl(league, day, base = PROBE_BASE) {
  return `${base}/apis/site/v2/sports/soccer/${encodeURIComponent(league)}/scoreboard?dates=${day.replaceAll('-', '')}&limit=${LIMIT}`;
}

/**
 * يحكم على استجابة يوم واحد بلا شبكة — قابل للاختبار مباشرة.
 * يرمي عند أي انحراف عن عقد العرض، ويعيد ما ستعرضه الصفحة.
 */
export function judgeMatchesProbe(raw, league) {
  if (!raw || typeof raw !== 'object') throw new Error('UPSTREAM_INVALID_JSON: استجابة ليست كائناً JSON');
  const slug = raw?.leagues?.[0]?.slug;
  if (typeof slug !== 'string' || !slug) throw new Error('SCHEMA: لا يوجد معرّف بطولة في الاستجابة');
  if (slug !== league) throw new Error(`SOURCE_ID_MISMATCH: المصدر أعاد ${slug} بدل ${league}`);
  if (!Array.isArray(raw.events)) throw new Error('INVALID_SCOREBOARD: لا مصفوفة أحداث');
  return {
    league,
    slug,
    name: raw.leagues[0]?.name ?? null,
    events: parseScoreboard(raw, { id: league }).map((match) => ({
      id: match.id,
      date: match.date,
      home: match.home.name,
      away: match.away.name,
      state: match.state,
    })),
  };
}

export async function probeMatchesLeague(league, { from, to, base = PROBE_BASE, fetchImpl = fetch } = {}) {
  if (!LEAGUES.some((entry) => entry.id === league)) throw new Error(`UNKNOWN_LEAGUE: ${league} ليس في LEAGUES`);
  const window = { from: from ?? defaultWindow().from, to: to ?? defaultWindow().to };
  const days = probeDays(window.from, window.to);

  let name = null;
  let slug = null;
  const seen = new Set();
  const matches = [];
  let daysWithEvents = 0;

  for (const day of days) {
    const url = probeUrl(league, day, base);
    const response = await fetchImpl(url, { headers: { Accept: 'application/json' } });
    if (!response || typeof response.status !== 'number') throw new Error('NETWORK_ERROR');
    if (!response.ok) throw new Error(`UPSTREAM_HTTP_${response.status}`);
    let raw;
    try {
      raw = await response.json();
    } catch {
      throw new Error('UPSTREAM_INVALID_JSON');
    }
    const judged = judgeMatchesProbe(raw, league);
    slug = judged.slug;
    name = judged.name ?? name;
    if (judged.events.length) daysWithEvents += 1;
    for (const match of judged.events) {
      if (seen.has(match.id)) continue;
      seen.add(match.id);
      matches.push(match);
    }
  }

  matches.sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  return {
    league,
    slug,
    name,
    window,
    daysRequested: days.length,
    daysWithEvents,
    events: matches.length,
    sample: matches.slice(0, 3),
  };
}

export function parseArgs(argv) {
  const flags = new Set(argv.filter((arg) => arg.startsWith('--')));
  const positional = argv.filter((arg) => !arg.startsWith('--'));
  const value = (name) => {
    const flag = argv.find((arg) => arg.startsWith(`--${name}=`));
    return flag ? flag.slice(name.length + 3) : null;
  };
  return { asJson: flags.has('--json'), from: value('from'), to: value('to'), leagues: positional };
}

async function main() {
  const { asJson, from, to, leagues } = parseArgs(process.argv.slice(2));
  const targets = leagues.length ? leagues : LEAGUES.map((entry) => entry.id);
  const window = { from: from ?? defaultWindow().from, to: to ?? defaultWindow().to };

  if (!asJson) {
    console.log('مسبار بوابة المباريات — يُشغَّل محلياً، ولا يعدّل أي ملف.');
    console.log(`النافذة: ${window.from} → ${window.to} · ${targets.length} بطولة · يوم واحد لكل طلب\n`);
  }

  const results = [];
  for (const league of targets) {
    const name = LEAGUES.find((entry) => entry.id === league)?.name ?? league;
    try {
      const result = await probeMatchesLeague(league, window);
      results.push({ ...result, name, ok: true });
      if (!asJson) {
        const verdict = result.events > 0 ? '✅' : '⚠️ ';
        console.log(`${verdict} ${league.padEnd(16)} ${name} — slug=${result.slug} أحداث=${result.events} في ${result.daysWithEvents}/${result.daysRequested} يوم`);
        for (const row of result.sample) console.log(`     ${row.date} · ${row.home} × ${row.away} (${row.state})`);
        if (result.events === 0) console.log('     لا مباريات داخل النافذة — البطولة مُعرَّفة لدى المصدر، وقد يكون أسبوعاً بلا جولة.');
      }
    } catch (error) {
      results.push({ league, name, ok: false, error: String(error?.message || error) });
      if (!asJson) console.log(`❌ ${league.padEnd(16)} ${name} — فشل الفحص: ${error?.message || error}`);
    }
  }

  if (asJson) {
    console.log(JSON.stringify({ checkedAt: new Date().toISOString(), window, results }, null, 2));
    return;
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\nالخلاصة: ${results.length - failed.length}/${results.length} بطولة يخدمها المصدر.`);
  if (failed.length) {
    console.log(`فشل: ${failed.map((r) => r.league).join('، ')}`);
    process.exitCode = 1;
  }
}

/* يُشغَّل مباشرة فقط — الاستيراد في الاختبارات لا يبدأ أي طلب. */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
