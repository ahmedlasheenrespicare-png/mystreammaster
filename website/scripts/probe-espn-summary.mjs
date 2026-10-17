// Read-only probe for ESPN Big Five match summary statistics (possession, shots, passAccuracy).
// Verifies which statistics fields ESPN provides on finished matches and ensures missing passAccuracy stays null.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BIG_FIVE } from '../src/lib/fixtures-archive.mjs';
import { normalizeEspn, summaryStatistics } from './fetch-fixtures-archive.mjs';

export function judgeEspnSummary(rawSummary, match, league) {
  if (!rawSummary || String(rawSummary.header?.id ?? '') !== String(match.id) || rawSummary.header?.league?.slug !== league) {
    throw new Error('SUMMARY_ID_MISMATCH');
  }
  const stats = summaryStatistics(rawSummary, match);
  const rawStatNames = [
    ...(Array.isArray(rawSummary?.boxscore?.teams) ? rawSummary.boxscore.teams : []),
    ...(Array.isArray(rawSummary?.boxscore?.players) ? rawSummary.boxscore.players : []),
  ].flatMap(side => (Array.isArray(side?.statistics) ? side.statistics.map(s => s?.name).filter(Boolean) : []));
  return {
    eventId: match.id,
    league,
    availableFields: {
      possession: stats.home.possession !== null && stats.away.possession !== null,
      shots: stats.home.shots !== null && stats.away.shots !== null,
      passAccuracy: stats.home.passAccuracy !== null && stats.away.passAccuracy !== null,
    },
    rawStatNames: [...new Set(rawStatNames)],
    statistics: stats,
  };
}

export async function probeEspnSummary({ now = new Date(), leagues = BIG_FIVE, request = fetch } = {}) {
  const fetchedAt = now.toISOString();
  const results = [];
  for (const league of leagues) {
    let foundMatch = null;
    let lastError = null;
    for (let offsetDays = 0; offsetDays <= 14 && !foundMatch; offsetDays++) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - offsetDays));
      const ymd = d.toISOString().slice(0, 10).replaceAll('-', '');
      const sbUrl = `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/scoreboard?dates=${ymd}&limit=500`;
      try {
        const res = await request(sbUrl, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
        if (!res.ok) {
          lastError = `UPSTREAM_HTTP_${res.status}`;
          continue;
        }
        const rows = normalizeEspn(await res.json(), league, sbUrl, fetchedAt);
        foundMatch = rows.find(r => r.match.status === 'finished')?.match ?? null;
      } catch (e) {
        lastError = e?.message || 'UPSTREAM_NETWORK';
      }
    }
    if (!foundMatch) {
      results.push({ league, ok: false, code: lastError ?? 'NO_RECENT_FINISHED_MATCH' });
      continue;
    }
    const summaryUrl = `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/summary?event=${encodeURIComponent(foundMatch.id)}`;
    try {
      const res = await request(summaryUrl, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error(`UPSTREAM_HTTP_${res.status}`);
      const judged = judgeEspnSummary(await res.json(), foundMatch, league);
      results.push({ league, ok: true, url: summaryUrl, ...judged });
    } catch (e) {
      results.push({ league, ok: false, eventId: foundMatch.id, url: summaryUrl, code: e?.message || 'SUMMARY_ERROR' });
    }
  }
  return { probedAt: fetchedAt, results };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const report = await probeEspnSummary();
  await fs.mkdir('website/.fixtures-out', { recursive: true });
  await fs.writeFile('website/.fixtures-out/espn-summary-probe.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  console.log('::notice title=ESPN summary statistics probe::' + JSON.stringify(report).replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A'));
}
