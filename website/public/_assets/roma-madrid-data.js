// Pure validation shared by the page and offline contract tests.
export const STANDING_COUNTS = {'uefa.champions':36,'ita.1':20,'esp.1':20};
export const FIELDS = ['points','played','wins','draws','losses','goalsFor','goalsAgainst','goalDifference'];
export function romaMadridEvent(events) {
  const matches = (Array.isArray(events) ? events : []).filter(event => event?.id === '401915414');
  if (matches.length !== 1) throw new Error('MATCH_NOT_FOUND');
  const event = matches[0];
  if (Date.parse(event.date) !== Date.parse('2026-10-14T19:00:00Z')) throw new Error('WRONG_KICKOFF');
  const teams = event.competitions?.[0]?.competitors;
  const home = teams?.find(c => c.homeAway === 'home');
  const away = teams?.find(c => c.homeAway === 'away');
  if (home?.team?.id !== '104' || away?.team?.id !== '86') throw new Error('WRONG_TEAMS');
  // A completed report must not regress to pre-match/unknown data or empty zeroes.
  if (event.status?.type?.completed !== true) throw new Error('NOT_FINAL');
  const score = value => {
    if ((typeof value !== 'string' && typeof value !== 'number') || !/^\d+$/.test(String(value))) throw new Error('INVALID_SCORE');
    const n = Number(value); if (!Number.isSafeInteger(n) || n < 0 || n > 99) throw new Error('INVALID_SCORE'); return n;
  };
  return {home,away,score:{home:score(home.score),away:score(away.score)}};
}
export function romaMadridStandings(data, league) {
  if (!STANDING_COUNTS[league] || data?.ok !== true || data.provider !== 'ESPN' || data.league !== league || data.phase !== 'league' || data.season !== 2026 || !Number.isFinite(Date.parse(data.fetchedAt)) || typeof data.stale !== 'boolean' || data.entries?.length !== STANDING_COUNTS[league]) throw new Error('INVALID_STANDINGS');
  const ids = new Set(); const ranks = new Set();
  for (const row of data.entries) {
    if (!/^[1-9]\d*$/.test(row.teamId) || ids.has(row.teamId) || !Number.isInteger(row.rank) || row.rank < 1 || row.rank > data.entries.length || ranks.has(row.rank) || typeof row.name !== 'string' || !row.name.trim() || row.name.length > 240) throw new Error('INVALID_STANDINGS');
    ids.add(row.teamId); ranks.add(row.rank);
    for (const field of FIELDS) if (row[field] !== null && (!Number.isSafeInteger(row[field]) || (!['points','goalDifference'].includes(field) && row[field] < 0))) throw new Error('INVALID_STANDINGS');
  }
  return [...data.entries].sort((a,b)=>a.rank-b.rank);
}
