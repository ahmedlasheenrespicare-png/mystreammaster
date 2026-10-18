// Read-only audit. No secrets, production writes, predictions, odds, or coordinates.
import fs from 'node:fs/promises';
const cases = [
  ['401879262', '337', '364'], ['401879259', '382', '373'],
  ['401879258', '361', '362'], ['401879263', '349', '366'],
];
const results = [];
for (const [event, home, away] of cases) {
  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/summary?event=${event}`;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    const raw = await response.json();
    const competition = raw.header?.competitions?.find(item => String(item.id) === event);
    if (String(raw.header?.id) !== event || raw.header?.league?.slug !== 'eng.1' || !competition) throw new Error('IDENTITY_MISMATCH');
    const teams = Object.fromEntries((competition.competitors ?? []).map(item => [item.homeAway, String(item.team?.id)]));
    if (teams.home !== home || teams.away !== away) throw new Error('TEAM_MISMATCH');
    results.push({ event, url, readAt: new Date().toISOString(), status: competition.status,
      competitors: competition.competitors.map(item => ({ homeAway: item.homeAway, team: { id: item.team.id } })),
      rosters: (raw.rosters ?? []).map(side => ({ homeAway: side.homeAway, team: { id: side.team?.id }, formation: side.formation ?? null,
        starters: (side.roster ?? []).filter(player => player.starter === true).length,
        substitutes: (side.roster ?? []).filter(player => player.starter === false).length,
        roster: (side.roster ?? []).map(player => ({ starter: player.starter, jersey: player.jersey ?? null,
          athlete: { id: player.athlete?.id, displayName: player.athlete?.displayName },
          position: player.position, formationPlace: player.formationPlace ?? null,
          subbedIn: player.subbedIn, subbedOut: player.subbedOut,
          statNames: (player.stats ?? []).map(stat => stat.name),
        })),
      })),
    });
  } catch (error) { results.push({ event, url, error: error.message }); }
}
await fs.mkdir('website/.fixtures-out', { recursive: true });
await fs.writeFile('website/.fixtures-out/lineups-probe.json', JSON.stringify({ results }, null, 2) + '\n');
console.log(JSON.stringify(results.map(({ rosters, ...rest }) => ({ ...rest, rosters: rosters?.map(({ roster, ...side }) => side) })), null, 2));
if (results.some(result => result.error)) process.exitCode = 1;
