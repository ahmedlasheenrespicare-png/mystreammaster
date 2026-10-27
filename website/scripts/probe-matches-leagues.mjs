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
 * الاستخدام:
 *   node scripts/probe-matches-leagues.mjs                  # كل البطولات
 *   node scripts/probe-matches-leagues.mjs caf.champions afc.champions
 *   node scripts/probe-matches-leagues.mjs --json > probe.json
 *   node scripts/probe-matches-leagues.mjs --from=2026-10-01 --to=2026-10-31
 *
 * القواعد المحكَّمة (مطابقة لما تراه الصفحة):
 *   استجابة 200 · JSON صالح · `leagues[0].slug` يطابق المعرّف المطلوب
 *   (يمنع بطولة تُعيد بيانات غيرها بصمت) · مصفوفة أحداث · حدث واحد على
 *   الأقل له فريقان وتاريخ صالح داخل النافذة — أو «لا مباريات» صريحة،
 *   وهي نتيجة مقبولة لا فشل، لأن أسبوعاً بلا مباريات وارد في بطولة قائمة.
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

/** نافذة UTC بصيغة YYYYMMDD التي يقبلها المصدر */
function windowToDates(from, to) {
  return `${from.replaceAll('-', '')}-${to.replaceAll('-', '')}`;
}

function isoDay(date) {
  return date.toISOString().slice(0, 10);
}

export function defaultWindow(now = new Date()) {
  const from = new Date(now.getTime() - 7 * 86400000);
  const to = new Date(now.getTime() + 7 * 86400000);
  return { from: isoDay(from), to: isoDay(to) };
}

export function probeUrl(league, from, to, base = PROBE_BASE) {
  return `${base}/apis/site/v2/sports/soccer/${encodeURIComponent(league)}/scoreboard?dates=${windowToDates(from, to)}&limit=${LIMIT}`;
}

/**
 * يحكم على استجابة المصدر الخام بلا شبكة — قابل للاختبار مباشرة.
 * يرمي عند أي انحراف عن عقد العرض، ويعيد الملخّص عند النجاح.
 */
export function judgeMatchesProbe(raw, league, from, to) {
  if (!raw || typeof raw !== 'object') throw new Error('UPSTREAM_INVALID_JSON: استجابة ليست كائناً JSON');
  const slug = raw?.leagues?.[0]?.slug;
  if (typeof slug !== 'string' || !slug) throw new Error('SCHEMA: لا يوجد معرّف بطولة في الاستجابة');
  if (slug !== league) throw new Error(`SOURCE_ID_MISMATCH: المصدر أعاد ${slug} بدل ${league}`);
  if (!Array.isArray(raw.events)) throw new Error('INVALID_SCOREBOARD: لا مصفوفة أحداث');

  const matches = parseScoreboard(raw, { id: league });
  const inWindow = matches.filter(m => m.date.slice(0, 10) >= from && m.date.slice(0, 10) <= to);
  return {
    league,
    slug,
    name: raw.leagues[0]?.name ?? null,
    events: raw.events.length,
    parsed: matches.length,
    inWindow: inWindow.length,
    sample: inWindow.slice(0, 3).map(m => ({
      id: m.id,
      date: m.date,
      home: m.home.name,
      away: m.away.name,
      state: m.state,
    })),
  };
}

export async function probeMatchesLeague(league, { from, to, base = PROBE_BASE, fetchImpl = fetch } = {}) {
  if (!LEAGUES.some(entry => entry.id === league)) throw new Error(`UNKNOWN_LEAGUE: ${league} ليس في LEAGUES`);
  const window = { from: from ?? defaultWindow().from, to: to ?? defaultWindow().to };
  const url = probeUrl(league, window.from, window.to, base);
  const response = await fetchImpl(url, { headers: { Accept: 'application/json' } });
  if (!response || typeof response.status !== 'number') throw new Error('NETWORK_ERROR');
  if (!response.ok) throw new Error(`UPSTREAM_HTTP_${response.status}`);
  let raw;
  try {
    raw = await response.json();
  } catch {
    throw new Error('UPSTREAM_INVALID_JSON');
  }
  return { url, ...judgeMatchesProbe(raw, league, window.from, window.to) };
}

export function parseArgs(argv) {
  const flags = new Set(argv.filter(arg => arg.startsWith('--')));
  const positional = argv.filter(arg => !arg.startsWith('--'));
  const value = name => {
    const flag = argv.find(arg => arg.startsWith(`--${name}=`));
    return flag ? flag.slice(name.length + 3) : null;
  };
  return {
    asJson: flags.has('--json'),
    from: value('from'),
    to: value('to'),
    leagues: positional,
  };
}

async function main() {
  const { asJson, from, to, leagues } = parseArgs(process.argv.slice(2));
  const targets = leagues.length ? leagues : LEAGUES.map(entry => entry.id);
  const window = { from: from ?? defaultWindow().from, to: to ?? defaultWindow().to };

  if (!asJson) {
    console.log('مسبار بوابة المباريات — يُشغَّل محلياً، ولا يعدّل أي ملف.');
    console.log(`النافذة: ${window.from} → ${window.to} (UTC) · ${targets.length} بطولة\n`);
  }

  const results = [];
  for (const league of targets) {
    const name = LEAGUES.find(entry => entry.id === league)?.name ?? league;
    try {
      const result = await probeMatchesLeague(league, window);
      results.push({ ...result, name, ok: true });
      if (!asJson) {
        const verdict = result.inWindow > 0 ? '✅' : '⚠️ ';
        console.log(`${verdict} ${league.padEnd(16)} ${name} — slug=${result.slug} أحداث=${result.events} معروضة=${result.parsed} في النافذة=${result.inWindow}`);
        for (const row of result.sample) console.log(`     ${row.date} · ${row.home} × ${row.away} (${row.state})`);
        if (result.inWindow === 0) console.log('     لا مباريات داخل النافذة — البطولة مُعرفة لدى المصدر، وقد يكون أسبوعاً بلا جولة.');
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

  const failed = results.filter(r => !r.ok);
  console.log(`\nالخلاصة: ${results.length - failed.length}/${results.length} بطولة يخدمها المصدر.`);
  if (failed.length) {
    console.log(`فشل: ${failed.map(r => r.league).join('، ')}`);
    process.exitCode = 1;
  }
}

/* يُشغَّل مباشرة فقط — الاستيراد في الاختبارات لا يبدأ أي طلب. */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
