/** Identity overrides are limited to the hero crown strip.
 * Logo URLs verified against each competition's ESPN scoreboard leagues[].logos:
 * https://site.api.espn.com/apis/site/v2/sports/soccer/eng.league_cup/scoreboard?limit=1
 * https://site.api.espn.com/apis/site/v2/sports/soccer/afc.champions/scoreboard?limit=1
 * FA Cup local crest: https://football-logos.cc/england/emirates-fa-cup/
 * Egyptian Premier League 2026–27 (ORA): https://commons.wikimedia.org/wiki/File:ORA_League.png
 */
export const CROWN_CUP_LOGOS: Readonly<Record<string, string>> = {
  'egy.1': '/images/competitions/egyptian-premier-league.webp',
  'eng.fa': '/images/competitions/fa-cup.webp',
  'eng.league_cup': 'https://a.espncdn.com/i/leaguelogos/soccer/500/41.png',
  'afc.champions': 'https://a.espncdn.com/i/leaguelogos/soccer/500/2200.png',
  'uefa.europa': 'https://a.espncdn.com/i/leaguelogos/soccer/500/2310.png',
  'uefa.nations': 'https://a.espncdn.com/i/leaguelogos/soccer/500/2395.png',
  'fifa.friendly': 'https://a.espncdn.com/i/leaguelogos/soccer/500/53.png',
  'concacaf.nations.league': 'https://a.espncdn.com/i/leaguelogos/soccer/500/2406.png',
};
export function crownLeagueName(leagueId: string | undefined, fallback: string): string {
  return leagueId === 'eng.league_cup' ? 'كأس الرابطة الإنجليزي' : fallback;
}
