/** Identity overrides are limited to the hero crown strip.
 * Logo URLs verified against each competition's ESPN scoreboard leagues[].logos:
 * https://site.api.espn.com/apis/site/v2/sports/soccer/eng.league_cup/scoreboard?limit=1
 * https://site.api.espn.com/apis/site/v2/sports/soccer/afc.champions/scoreboard?limit=1
 */
export const CROWN_CUP_LOGOS: Readonly<Record<string, string>> = {
  'eng.league_cup': 'https://a.espncdn.com/i/leaguelogos/soccer/500/41.png',
  'afc.champions': 'https://a.espncdn.com/i/leaguelogos/soccer/500/2200.png',
};
export function crownLeagueName(leagueId: string | undefined, fallback: string): string {
  return leagueId === 'eng.league_cup' ? 'كأس الرابطة الإنجليزي' : fallback;
}
