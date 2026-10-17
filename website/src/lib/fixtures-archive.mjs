/** Archive contract, shared by collector, publisher and static renderer. No network. */
export const ARCHIVE_LEAGUES = ['eng.1', 'esp.1', 'ita.1', 'ger.1', 'fra.1', 'sau.1', 'egy.1', 'uefa.champions', 'uefa.europa', 'fifa.worldq.caf', 'fifa.worldq.uefa', 'fifa.friendly'];
export const BIG_FIVE = ARCHIVE_LEAGUES.slice(0, 5);
const integer = value => Number.isInteger(value) && value >= 0;
const text = value => typeof value === 'string' && value.trim().length > 0;
const utc = value => text(value) && /Z$/.test(value) && Number.isFinite(Date.parse(value));
const requireValue = (ok, code) => { if (!ok) throw new Error(code); };
export function validateArchive(data, league = data?.league, season = data?.season) {
  requireValue(ARCHIVE_LEAGUES.includes(league) && data?.league === league && data?.schemaVersion === 1, 'INVALID_LEAGUE_OR_SCHEMA');
  requireValue(/^\d{4}$/.test(String(season)) && data.season === String(season), 'INVALID_SEASON');
  requireValue(Array.isArray(data.matches) && data.matches.length > 0 && data.matches.length <= 10000, 'INVALID_COUNT');
  const ids = new Set();
  for (const m of data.matches) {
    requireValue(text(m.id) && !ids.has(m.id), 'INVALID_OR_DUPLICATE_ID'); ids.add(m.id);
    requireValue(utc(m.date) && utc(m.fetchedAt), 'INVALID_DATE');
    requireValue(['scheduled', 'live', 'finished', 'postponed', 'cancelled', 'suspended', 'unknown'].includes(m.status), 'INVALID_STATUS');
    for (const side of ['home', 'away']) {
      requireValue(text(m[side]?.id) && text(m[side]?.name), 'INVALID_TEAM');
      requireValue(m.score?.[side] === null || integer(m.score?.[side]), 'INVALID_SCORE');
    }
    requireValue(m.home.id !== m.away.id, 'SAME_TEAM');
    requireValue(m.attendance === null || integer(m.attendance), 'INVALID_ATTENDANCE');
    requireValue(m.source?.provider === (league === 'egy.1' ? 'Highlightly' : 'ESPN') && m.source.leagueId === (league === 'egy.1' ? '199067' : league), 'SOURCE_ID_MISMATCH');
    requireValue(typeof m.source.url === 'string' && m.source.url.startsWith(league === 'egy.1' ? 'https://soccer.highlightly.net/matches?' : `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/scoreboard?`) && !/[\s]|key|token/i.test(m.source.url), 'INVALID_SOURCE_URL');
    if (m.statistics !== undefined && m.statistics !== null) {
      for (const side of ['home', 'away']) for (const key of ['possession', 'shots', 'passAccuracy']) {
        const v = m.statistics[side]?.[key];
        requireValue(v === null || (typeof v === 'number' && Number.isFinite(v) && v >= 0 && (key === 'shots' ? integer(v) : v <= 100)), 'INVALID_STATISTIC');
      }
    }
  }
  return data;
}
export function mergeArchive(previous, incoming) {
  validateArchive(incoming);
  if (previous) validateArchive(previous, incoming.league, incoming.season);
  const records = new Map((previous?.matches ?? []).map(m => [m.id, m]));
  for (const match of incoming.matches) {
    const old = records.get(match.id);
    const effective = { ...match, statistics: match.statistics ?? old?.statistics ?? null };
    // Fetch timestamps record the last semantic change, not every daily check.
    const semantic = m => JSON.stringify({ ...m, fetchedAt: undefined });
    records.set(match.id, old && semantic(old) === semantic(effective) ? old : effective);
  }
  return validateArchive({ schemaVersion: 1, league: incoming.league, season: incoming.season, matches: [...records.values()].sort((a,b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)) });
}
export function archiveTeamStats(matches) {
  const teams = new Map();
  const valid = matches.filter(m => m.status === 'finished' && integer(m.score.home) && integer(m.score.away)).sort((a,b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  for (const m of valid) for (const side of ['home', 'away']) {
    const team = m[side]; const other = side === 'home' ? 'away' : 'home';
    if (!teams.has(team.id)) teams.set(team.id, { id: team.id, name: team.name, played: 0, cleanSheets: 0, winningStreak: 0, unbeatenStreak: 0, home: { played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 }, away: { played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 } });
    const t = teams.get(team.id), bucket = t[side], gf = m.score[side], ga = m.score[other];
    t.played++; bucket.played++; bucket.goalsFor += gf; bucket.goalsAgainst += ga;
    bucket[gf > ga ? 'wins' : gf === ga ? 'draws' : 'losses']++;
    if (ga === 0) t.cleanSheets++;
    t.winningStreak = gf > ga ? t.winningStreak + 1 : 0;
    t.unbeatenStreak = gf >= ga ? t.unbeatenStreak + 1 : 0;
  }
  // A stored finished match with a missing result is a real gap, not permission
  // to join two winning runs. Keep the streak unknown until a known break.
  const finished = matches.filter(m => m.status === 'finished').sort((a,b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  for (const t of teams.values()) {
    t.winningStreak = 0; t.unbeatenStreak = 0;
    for (const m of finished) {
      const side = m.home.id === t.id ? 'home' : m.away.id === t.id ? 'away' : null;
      if (!side) continue;
      const gf = m.score[side], ga = m.score[side === 'home' ? 'away' : 'home'];
      if (!integer(gf) || !integer(ga)) { t.winningStreak = null; t.unbeatenStreak = null; continue; }
      t.winningStreak = gf > ga ? (t.winningStreak === null ? null : t.winningStreak + 1) : 0;
      t.unbeatenStreak = gf >= ga ? (t.unbeatenStreak === null ? null : t.unbeatenStreak + 1) : 0;
    }
  }
  return [...teams.values()];
}
export function standingsRates(entries) {
  const rate = (goals, played) => typeof goals === 'number' && goals >= 0 && typeof played === 'number' && played > 0 ? goals / played : null;
  const rows = entries.map(t => ({ ...t, attack: rate(t.goalsFor, t.played), defence: rate(t.goalsAgainst, t.played) }));
  const extreme = (field, direction) => {
    // A partial table cannot establish league-wide strongest/weakest.
    if (!rows.length || rows.some(t => t[field] === null)) return [];
    const value = Math[direction](...rows.map(t => t[field]));
    return rows.filter(t => t[field] === value);
  };
  return { rows, bestAttack: extreme('attack', 'max'), worstAttack: extreme('attack', 'min'), bestDefence: extreme('defence', 'min'), worstDefence: extreme('defence', 'max') };
}
