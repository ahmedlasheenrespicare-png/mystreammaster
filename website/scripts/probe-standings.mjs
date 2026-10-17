#!/usr/bin/env node
/**
 * مسبار بوابة الترتيب — الأداة التي تنفّذ «بوابة لكل دوري قبل إدخاله»
 * ------------------------------------------------------------------------
 * هذا السكربت لا يعدّل أي ملف ولا ينشر شيئاً. وظيفته الوحيدة: يسأل مصدر
 * الترتيب (ESPN) عن بطولة معيّنة ويحكم على الاستجابة **بنفس قواعد**
 * `standings.php` حرفياً، ثم يطبع تقريراً جاهزاً للنسخ.
 *
 * لماذا يعمل خارج بيئة الوكيل؟ لأن بيئة العمل قد تحجب ESPN (مسجَّل في
 * `match-center.mjs`)، فتشغّله أنت من جهازك وترسل المخرجات.
 *
 * الاستخدام:
 *   node scripts/probe-standings.mjs fra.1 ger.1 ita.1 egy.1 ksa.1
 *   node scripts/probe-standings.mjs --json fra.1 > probe-fra.json
 *
 * القواعد المحكَّمة (مطابقة للوسيط وللعقد في src/lib/standings.mjs):
 *   uid مطابق · حاوٍ واحد باسم «overall» · موسم 2000–2100 ·
 *   معرّفات فرق فريدة · مراكز فريدة 1..N · حقول رقمية سليمة ·
 *   rank يأتي من المصدر ولا يُحسب · ولا يُقبل جدول بلا أي عمود رقمي.
 *
 * ملاحظة اختبارية: `STANDINGS_PROBE_BASE` يبدّل أصل الطلب، وتستعمله
 * الاختبارات مع خادم محلي كي تُحكَّم حالة الفشل بلا شبكة خارجية.
 */
import process from 'node:process';
import { pathToFileURL } from 'node:url';

export const PROBE_BASE = process.env.STANDINGS_PROBE_BASE || 'https://site.web.api.espn.com';

const FIELDS = {
  played: 'gamesPlayed', wins: 'wins', draws: 'ties',
  losses: 'losses', goalsFor: 'pointsFor',
  goalsAgainst: 'pointsAgainst', goalDifference: 'pointDifferential',
  points: 'points',
};

/** حاويات «overall» — نفس شرط `sm_st_groups` في الوسيط */
export function standingsGroups(node, league, depth = 0) {
  if (depth > 5) throw new Error('UPSTREAM_SCHEMA_CHANGED: depth');
  const found = [];
  if (node?.standings?.name === 'overall' && (league !== 'uefa.champions' || node?.name === 'League Phase')) {
    found.push(node.standings);
  }
  for (const child of node?.children ?? []) {
    if (child && typeof child === 'object') found.push(...standingsGroups(child, league, depth + 1));
  }
  return found;
}

export function probeNumber(raw, signed = false) {
  let value = raw;
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    if (!/^[+-]?\d+$/.test(value)) return null;
    value = Number(value);
  }
  if (!Number.isInteger(value) || (!signed && value < 0)) return null;
  return value;
}

/**
 * يحكم على استجابة المصدر الخام بلا شبكة — قابل للاختبار مباشرة.
 * يرمي عند أي انحراف، ويعيد الملخّص عند النجاح.
 */
export function judgeStandings(raw, league) {
  const uid = raw?.uid ?? null;
  const found = standingsGroups(raw, league);
  if (found.length !== 1) throw new Error(`SCHEMA: expected exactly one overall group, got ${found.length}`);
  const table = found[0];
  const season = probeNumber(table.season);
  const entries = table.entries;
  if (!Array.isArray(entries)) throw new Error('SCHEMA: entries missing');
  if (!Number.isInteger(season) || season < 2000 || season > 2100) throw new Error(`SCHEMA: bad season ${season}`);
  if (!entries.length) throw new Error('SCHEMA: empty table');

  const ids = new Set();
  const ranks = new Set();
  let numbers = 0;
  const rows = entries.map((entry) => {
    const team = entry?.team ?? {};
    const id = team.id;
    const name = team.displayName;
    if (!/^[1-9]\d{0,11}$/.test(String(id)) || ids.has(id)) throw new Error(`SCHEMA: bad team id ${id}`);
    if (typeof name !== 'string' || !name.trim() || name.length > 240) throw new Error(`SCHEMA: bad team name for ${id}`);
    ids.add(id);
    const stats = {};
    for (const stat of entry.stats ?? []) {
      if (stat?.name && !(stat.name in stats)) stats[stat.name] = stat.value ?? stat.displayValue ?? null;
    }
    const rank = probeNumber(stats.rank);
    if (!Number.isInteger(rank) || rank < 1 || rank > entries.length || ranks.has(rank)) throw new Error(`SCHEMA: bad rank ${rank}`);
    ranks.add(rank);
    const row = { teamId: String(id), name: name.trim(), rank };
    for (const [field, source] of Object.entries(FIELDS)) {
      row[field] = probeNumber(stats[source], field === 'points' || field === 'goalDifference');
      if (row[field] !== null) numbers++;
    }
    return row;
  });
  if (!numbers) throw new Error('SCHEMA: no numeric columns at all');
  rows.sort((a, b) => a.rank - b.rank);
  return { league, uid, season, teams: rows.length, suggestedCount: rows.length, sample: rows.slice(0, 3), rows };
}

/** يستدعي المصدر ثم يحكم — يُستخدم من سطر الأوامر ومن الاختبارات */
export async function probeStandings(league, base = PROBE_BASE) {
  const url = `${base}/apis/v2/sports/soccer/${league}/standings`;
  const response = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'StreamMaster-Standings/1.0' } });
  if (!response.ok) throw new Error(`UPSTREAM_HTTP_${response.status}`);
  let raw;
  try {
    raw = await response.json();
  } catch {
    throw new Error('UPSTREAM_INVALID_JSON');
  }
  return { url, ...judgeStandings(raw, league) };
}

/* بطولات المرحلة الثانية المقترحة — تُوسَّع على قائمة standings.php */
const DEFAULT_LEAGUES = ['fra.1', 'ger.1', 'ita.1', 'egy.1', 'ksa.1'];

async function main() {
  const args = process.argv.slice(2);
  const asJson = args.includes('--json');
  const leagues = args.filter((arg) => !arg.startsWith('--'));
  const targets = leagues.length ? leagues : DEFAULT_LEAGUES;

  if (!asJson) console.log('مسبار بوابة الترتيب — يُشغَّل محلياً، ولا يعدّل أي ملف.\n');

  const results = [];
  for (const league of targets) {
    try {
      const result = await probeStandings(league);
      results.push({ ...result, ok: true });
      if (!asJson) {
        console.log(`✅ ${league.padEnd(16)} uid=${result.uid}  الموسم=${result.season}  الفرق=${result.teams}  (suggestedCount=${result.suggestedCount})`);
        for (const row of result.sample) console.log(`     ${String(row.rank).padStart(2)}. ${row.name} — ${row.points} نقطة`);
      }
    } catch (error) {
      results.push({ league, ok: false, error: String(error?.message || error) });
      if (!asJson) console.log(`❌ ${league.padEnd(16)} فشل الفحص: ${error?.message || error}`);
    }
  }

  if (asJson) {
    console.log(JSON.stringify({ probedAt: new Date().toISOString(), base: PROBE_BASE, results }, null, 2));
    return;
  }
  console.log('\n════════ ملخّص جاهز للنسخ والإرسال ════════');
  for (const result of results) {
    if (result.ok) console.log(`• ${result.league}: uid=${result.uid} | season=${result.season} | teams=${result.teams}`);
    else console.log(`• ${result.league}: فشل — ${result.error}`);
  }
  console.log('\nما ينجح فحصه فقط يُضاف إلى قائمة standings.php وإلى src/lib/standings.mjs.');
  console.log('وما يفشل يبقى «غير متاح» في الصفحة بلا تخمين وبلا استكمال من موقع آخر.');
}

/* يعمل كأداة سطر أوامر فقط — ويبقى قابلاً للاستيراد في الاختبارات */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
