import type { Match } from './matches.mjs';
import { matchByExternalId, matchCenterPath } from '../content/match-center.mjs';
import { to } from '../config';

export function matchCenterLink(match: Match): string | null {
  /* `Match.id` في هذه الصفحة مركّب: `${league}:${eventId}`. */
  const separator = match.id.indexOf(':');
  const eventId = separator === -1 ? match.id : match.id.slice(separator + 1);
  if (!eventId) return null;
  const found = matchByExternalId('espn', eventId);
  /* ولا رابط إلا إن تطابقت المسابقة أيضاً — فلا يربط معرّفٌ صفحةً ببطولة أخرى. */
  return found && found.leagueId === match.league ? to(matchCenterPath(found).replace(/^\//, '')) : null;
}

