#!/usr/bin/env node
/**
 * جلب «لقطة ترتيب» موثوقة من المصدر — لبيئة تملك شبكة (GitHub Actions مثلاً)
 * ---------------------------------------------------------------------------
 * لماذا سكربت منفصل؟ بيئة الوكيل تحجب ESPN (مسجَّل في `match-center.mjs`)،
 * والنسخ اليدوي لأرقام الترتيب يخالف قاعدة «لا رقم مخترع». فهذا السكربت يجري
 * في بيئة متصلة، ويمرّر كل استجابة على **مُحكِّم المسبار نفسه**
 * (`judgeStandings` في `scripts/probe-standings.mjs`) — نفس القواعد التي
 * يحكم بها الوسيط `standings.php` — ثم يكتب لقطة جاهزة للالتزام.

 * المخرجات (في `website/.standings-out/` افتراضياً):
 *   • standings-snapshot.json — بصيغة اللقطة التي تقرأها صفحات البطولات
 *   • probe.json              — جرد المعرّف/الموسم/عدد الفرق لكل بطولة مسبورة
 *   • raw/<league>.json       — الاستجابة الخام كما وردت (للتوثيق فقط)
 *
 * الاستخدام:
 *   node scripts/fetch-standings-snapshot.mjs
 *   SNAPSHOT_LEAGUES="uefa.champions eng.1 fra.1 esp.1 ger.1 ita.1 ksa.1" PROBE_LEAGUES="egy.1" \
 *     node scripts/fetch-standings-snapshot.mjs
 *
 * لا يعدّل السكربت أي ملف داخل المستودع — يكتب في مجلد المخرجات فقط.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROBE_BASE, judgeStandings, probeStandings } from './probe-standings.mjs';
import { validateStandings } from '../src/lib/standings.mjs';

const website = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = process.env.STANDINGS_OUT || path.join(website, '.standings-out');

const list = (value, fallback) => (value ?? fallback).trim().split(/\s+/).filter(Boolean);
/* البطولات المؤهَّلة بعد مسبار 2026-10-16 — تُحدَّث القائمة عند فتح بوابة بطولة
   جديدة، ولا تُضاف بطولة قبل أن يثبت مسبارها معرّفها وعدد فرقها. */
const snapshotLeagues = list(process.env.SNAPSHOT_LEAGUES, 'uefa.champions eng.1 fra.1 esp.1 ger.1 ita.1 ksa.1');
const probeLeagues = list(process.env.PROBE_LEAGUES, 'egy.1');

const FIELDS = ['points', 'played', 'wins', 'draws', 'losses', 'goalsFor', 'goalsAgainst', 'goalDifference'];

await fs.mkdir(path.join(outDir, 'raw'), { recursive: true });

const tables = [];
const probed = [];
let failures = 0;

for (const league of snapshotLeagues) {
  try {
    /* الاستجابة الخام تُحفظ أولاً: هي أصل كل رقم لاحق، وتحفظ إمكانية إعادة الحكم */
    const url = `${PROBE_BASE}/apis/v2/sports/soccer/${league}/standings`;
    const response = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'StreamMaster-Standings/1.0' } });
    if (!response.ok) throw new Error(`UPSTREAM_HTTP_${response.status}`);
    const raw = await response.json();
    await fs.writeFile(path.join(outDir, 'raw', `${league}.json`), JSON.stringify(raw));
    const judged = judgeStandings(raw, league);
    const table = {
      ok: true,
      provider: 'ESPN',
      league,
      phase: 'league',
      season: judged.season,
      fetchedAt: new Date().toISOString(),
      stale: false,
      sourceUrl: url,
      uid: judged.uid,
      entries: judged.rows.map((row) => {
        const entry = { teamId: row.teamId, name: row.name, rank: row.rank };
        for (const field of FIELDS) entry[field] = row[field] ?? null;
        return entry;
      }),
    };
    /* بوّابة أخيرة قبل الكتابة: نفس تحقق الواجهة، فما يُكتب يُعرض بلا مفاجآت */
    validateStandings(table, league);
    tables.push(table);
    console.log(`✅ ${league.padEnd(16)} uid=${judged.uid}  season=${judged.season}  teams=${judged.teams}`);
  } catch (error) {
    failures++;
    console.log(`❌ ${league.padEnd(16)} فشل: ${error?.message || error}`);
  }
}

for (const league of probeLeagues) {
  try {
    const result = await probeStandings(league);
    probed.push({ league, ok: true, uid: result.uid, season: result.season, teams: result.teams, suggestedCount: result.suggestedCount, url: result.url });
    console.log(`🔎 ${league.padEnd(16)} uid=${result.uid}  season=${result.season}  teams=${result.teams}  (suggestedCount=${result.suggestedCount})`);
  } catch (error) {
    probed.push({ league, ok: false, error: String(error?.message || error) });
    console.log(`🔎 ${league.padEnd(16)} فشل الفحص: ${error?.message || error}`);
  }
}

const snapshot = {
  version: 1,
  provenance: `ESPN public standings API (${PROBE_BASE}), fetched ${new Date().toISOString()} by .github/workflows/standings-snapshot.yml and validated with scripts/probe-standings.mjs — the same rules the runtime proxy standings.php applies. Ranks and GP/W/D/L/F/A/GD/P come from the source as-is; nothing is recomputed, and missing values are written as null ("غير متاح"). This file serves the league landing pages only; fixture-standings-snapshot.json is a separate reviewed snapshot for documentation pages and is not touched here.`,
  tables,
};
await fs.writeFile(path.join(outDir, 'standings-snapshot.json'), `${JSON.stringify(snapshot, null, 2)}\n`);

const probeReport = {
  probedAt: new Date().toISOString(),
  base: PROBE_BASE,
  snapshot: tables.map((table) => ({ league: table.league, uid: table.uid, season: table.season, teams: table.entries.length })),
  probe: probed,
};
await fs.writeFile(path.join(outDir, 'probe.json'), `${JSON.stringify(probeReport, null, 2)}\n`);

console.log(`\n📦 المخرجات في ${path.relative(process.cwd(), outDir)}: standings-snapshot.json (${tables.length} جداول) · probe.json (${probed.length} بطولات مسبورة)`);
if (!tables.length) {
  console.error('⛔ لم تنجح أي بطولة — لا تُكتب لقطة فارغة.');
  process.exit(1);
}
if (failures) console.error(`⚠️ ${failures} بطولة فشل جلبها ولم تُدرج في اللقطة.`);
