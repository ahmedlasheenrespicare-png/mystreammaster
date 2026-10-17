import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ARCHIVE_LEAGUES, BIG_FIVE, validateArchive, mergeArchive } from '../src/lib/fixtures-archive.mjs';
const website = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assert = (ok, code) => { if (!ok) throw new Error(code); };
const number = v => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : null;
const score = v => number(typeof v === 'object' && v !== null ? v.value : v);
const team = t => ({ id: String(t?.id ?? ''), name: t?.displayName ?? t?.name ?? '' });
export function normalizeEspn(raw, league, sourceUrl, fetchedAt) {
  assert(raw?.leagues?.length === 1 && raw.leagues[0].slug === league, 'SOURCE_ID_MISMATCH');
  assert(Array.isArray(raw.events) && raw.events.length < 500, 'INVALID_OR_TRUNCATED_RESPONSE');
  return raw.events.map(e => {
    const c = e.competitions?.[0];
    assert(e.competitions?.length === 1 && c?.competitors?.length === 2, 'INVALID_COMPETITION');
    const h = c.competitors.find(t => t.homeAway === 'home'), a = c.competitors.find(t => t.homeAway === 'away');
    assert(h && a && Number.isInteger(e.season?.year), 'MISSING_TEAMS_OR_SEASON');
    const s = c.status?.type ?? e.status?.type;
    assert(s, 'MISSING_STATUS');
    const special = { STATUS_POSTPONED: 'postponed', STATUS_CANCELED: 'cancelled', STATUS_CANCELLED: 'cancelled', STATUS_SUSPENDED: 'suspended', STATUS_ABANDONED: 'suspended' };
    const status = special[s.name] ?? (s.completed === true ? 'finished' : s.state === 'pre' ? 'scheduled' : s.state === 'in' ? 'live' : 'unknown');
    return { season: String(e.season.year), match: { id: String(e.id ?? ''), date: new Date(e.date).toISOString(), home: team(h.team), away: team(a.team), score: { home: status === 'scheduled' ? null : score(h.score), away: status === 'scheduled' ? null : score(a.score) }, status, attendance: number(c.attendance), statistics: null, source: { provider: 'ESPN', leagueId: league, url: sourceUrl }, fetchedAt } };
  });
}
export function normalizeHighlightly(raw, sourceUrl, fetchedAt) {
  assert(Array.isArray(raw.data) && raw.pagination && Number.isInteger(raw.pagination.totalCount), 'INVALID_HIGHLIGHTLY_RESPONSE');
  return raw.data.map(m => {
    assert(String(m.league?.id) === '199067' && /^\d{4}$/.test(String(m.league?.season)), 'SOURCE_ID_OR_SEASON_MISMATCH');
    // Only documented terminal states count as results; unknown states never imply a win.
    const states = { 'Not started': 'scheduled', 'Finished': 'finished', 'After extra time': 'finished', 'After penalties': 'finished', 'Postponed': 'postponed', 'Cancelled': 'cancelled', 'Suspended': 'suspended', 'First half': 'live', 'Second half': 'live', 'Halftime': 'live' };
    const status = states[m.state?.description] ?? 'unknown';
    const result = typeof m.state?.score?.current === 'string' ? m.state.score.current.match(/^(\d+)\s*[-:]\s*(\d+)$/) : null;
    return { season: String(m.league.season), match: { id: String(m.id ?? ''), date: new Date(m.date).toISOString(), home: team(m.homeTeam), away: team(m.awayTeam), score: { home: status === 'scheduled' || !result ? null : Number(result[1]), away: status === 'scheduled' || !result ? null : Number(result[2]) }, status, attendance: number(m.attendance), statistics: null, source: { provider: 'Highlightly', leagueId: '199067', url: sourceUrl }, fetchedAt } };
  });
}
export function summaryStatistics(raw, match) {
  // ESPN soccer summaries may place team totals in boxscore.teams[].statistics or boxscore.players[].statistics.
  const pools = [raw?.boxscore?.teams, raw?.boxscore?.players].filter(Array.isArray);
  assert(pools.length > 0, 'STATISTICS_UNAVAILABLE');
  const read = id => {
    const sides = pools.flat().filter(t => String(t?.team?.id) === id && Array.isArray(t?.statistics));
    assert(sides.length > 0, 'STATISTICS_UNAVAILABLE');
    const stats = sides.flatMap(t => t.statistics);
    const get = names => {
      const v = stats.find(s => names.includes(s?.name));
      return number(typeof v?.displayValue === 'string' ? v.displayValue.replace(/%$/, '') : v?.value);
    };
    const possession = get(['possessionPct', 'possession']);
    const shots = get(['totalShots', 'shots']);
    // Pass accuracy is taken strictly as reported by the source; never calculated or guessed from pass counts.
    const passAccuracy = get(['passPct', 'passAccuracy', 'passingAccuracy', 'accuratePassesPct']);
    return {
      possession: possession !== null && possession <= 100 ? possession : null,
      shots: shots !== null && Number.isInteger(shots) ? shots : null,
      passAccuracy: passAccuracy !== null && passAccuracy <= 100 ? passAccuracy : null,
    };
  };
  return { home: read(match.home.id), away: read(match.away.id) };
}
export async function collect({ now = new Date(), outDir = path.join(website, '.fixtures-out'), archiveDir = path.join(website, 'src/content/fixtures-archive'), request = fetch, delayMs = 1100, approved = process.env.FIXTURES_SOURCES_APPROVED === 'true', highlightlyApproved = process.env.HIGHLIGHTLY_PLAN_APPROVED === 'true', statistics = process.env.FIXTURES_STATISTICS === 'true', maxHighlightlyRequests = 60 } = {}) {
  const report = { fetchedAt: now.toISOString(), leagues: [], statisticsFailures: 0, requests: 0, highlightlyRequests: 0 };
  const days = Array.from({ length: 45 }, (_, i) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + i - 30)).toISOString().slice(0,10));
  report.window = { from: days[0], to: days.at(-1) };
  const get = async (url, headers = {}) => {
    await new Promise(resolve => setTimeout(resolve, delayMs)); report.requests++;
    let response;
    try { response = await request(url, { headers: { Accept: 'application/json', ...headers }, signal: AbortSignal.timeout(20000) }); } catch { throw new Error('UPSTREAM_NETWORK'); }
    assert(response.ok, `UPSTREAM_HTTP_${response.status}`);
    try { return await response.json(); } catch { throw new Error('INVALID_JSON'); }
  };
  await fs.mkdir(outDir, { recursive: true });
  // Fresh staging only. Never reuse yesterday's candidate on a failed run.
  await fs.rm(path.join(outDir, 'archive'), { recursive: true, force: true });
  for (const league of ARCHIVE_LEAGUES) {
    try {
      assert(approved, 'SOURCE_TERMS_REVIEW_REQUIRED');
      const all = []; const ids = new Set();
      for (const day of days) {
        if (league === 'egy.1') {
          assert(highlightlyApproved, 'HIGHLIGHTLY_PLAN_REVIEW_REQUIRED');
          assert(process.env.HIGHLIGHTLY_API_KEY, 'UPSTREAM_KEY_MISSING');
          let offset = 0, total;
          do {
            assert(report.highlightlyRequests < maxHighlightlyRequests, 'HIGHLIGHTLY_QUOTA_GUARD');
            report.highlightlyRequests++;
            const url = `https://soccer.highlightly.net/matches?leagueId=199067&date=${day}&limit=100&offset=${offset}`;
            const raw = await get(url, { 'x-rapidapi-key': process.env.HIGHLIGHTLY_API_KEY });
            const rows = normalizeHighlightly(raw, url, report.fetchedAt);
            assert(raw.pagination.totalCount <= 1000 && raw.pagination.totalCount >= 0, 'INVALID_COUNT');
            assert(total === undefined || total === raw.pagination.totalCount, 'PAGINATION_CHANGED'); total = raw.pagination.totalCount;
            assert(rows.length <= 100 && (rows.length > 0 || total === 0), 'INCOMPLETE_PAGINATION');
            all.push(...rows); offset += rows.length;
            assert(offset <= total, 'INVALID_PAGINATION');
          } while (offset < total);
        } else {
          const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/scoreboard?dates=${day.replaceAll('-', '')}&limit=500`;
          all.push(...normalizeEspn(await get(url), league, url, report.fetchedAt));
        }
      }
      // Reject duplicates rather than silently masking upstream pagination/date errors.
      for (const row of all) { assert(!ids.has(row.match.id), 'DUPLICATE_ID'); ids.add(row.match.id); }
      assert(all.length > 0, 'EMPTY_WINDOW_PRESERVED');
      assert(all.length <= 3000, 'EXCESSIVE_WINDOW_COUNT');
      const previousBySeason = new Map();
      for (const season of new Set(all.map(r => r.season))) {
        let previous = null;
        try { previous = JSON.parse(await fs.readFile(path.join(archiveDir, league, `${season}.json`), 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
        previousBySeason.set(season, previous);
      }
      if (statistics && BIG_FIVE.includes(league)) for (const row of all) {
        if (row.match.status !== 'finished') continue;
        const prevArchive = previousBySeason.get(row.season);
        const prevMatch = prevArchive?.matches?.find(m => m.id === row.match.id);
        if (prevMatch?.status === 'finished' && prevMatch?.statistics) {
          row.match.statistics = prevMatch.statistics;
          continue;
        }
        try {
          const raw = await get(`https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/summary?event=${encodeURIComponent(row.match.id)}`);
          assert(String(raw.header?.id) === row.match.id && raw.header?.league?.slug === league, 'SUMMARY_ID_MISMATCH');
          row.match.statistics = summaryStatistics(raw, row.match);
        } catch { report.statisticsFailures++; }
      }
      const candidates = [];
      for (const season of new Set(all.map(r => r.season))) {
        const incoming = validateArchive({ schemaVersion: 1, league, season, matches: all.filter(r => r.season === season).map(r => r.match) });
        const previous = previousBySeason.get(season) ?? null;
        const data = mergeArchive(previous, incoming);
        candidates.push({ season, data });
      }
      // Validate every season before staging any file for this league.
      for (const { season, data } of candidates) {
        const dir = path.join(outDir, 'archive', league); await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(path.join(dir, `${season}.json`), JSON.stringify(data, null, 2) + '\n');
      }
      report.leagues.push({ league, ok: true, matchesInWindow: all.length, files: candidates.map(c => `${league}/${c.season}.json`), identityVerified: true });
    } catch (e) {
      // Only controlled error codes are logged; never serialize request headers or API keys.
      const code = /^[A-Z][A-Z0-9_]+$/.test(e.message) ? e.message : 'VALIDATION_OR_STORAGE_ERROR';
      report.leagues.push({ league, ok: false, code, preserved: true });
    }
  }
  await fs.writeFile(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  return report;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const report = await collect(); console.log(JSON.stringify(report, null, 2));
  const okLeagues = report.leagues.filter(l => l.ok);
  const failedLeagues = report.leagues.filter(l => !l.ok);
  for (const failed of failedLeagues) {
    console.log(`::warning title=Archive league preserved (${failed.league})::${failed.league} failed with ${failed.code}; previous archive preserved without blocking ${okLeagues.length} working league(s).`);
  }
  // Do not block publishing working leagues when a single league (e.g. sau.1) fails;
  // fail the job only when zero leagues succeeded.
  if (okLeagues.length === 0) process.exitCode = 1;
}
