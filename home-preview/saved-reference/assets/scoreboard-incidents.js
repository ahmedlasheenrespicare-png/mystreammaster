/** Keep only explicitly sourced goals/cards with a known team, player and clock.
 * ESPN competition.details may be partial; absence never means zero incidents. */
export function scoreboardIncidents(competition) {
  const competitors = competition?.competitors ?? [];
  if (!Array.isArray(competition?.details) || !Array.isArray(competitors)) return [];
  return competition.details.flatMap((detail, index) => {
    if (!detail || detail.shootout === true) return [];
    const typeText = String(detail.type?.text ?? '');
    const kind = detail.redCard === true || /red card|second yellow/i.test(typeText) ? 'red'
      : detail.yellowCard === true || /yellow card/i.test(typeText) ? 'yellow'
      : detail.scoringPlay === true || /^(goal|penalty goal|own goal)$/i.test(typeText) ? 'goal' : null;
    const teamId = detail.team?.id;
    const side = teamId != null ? competitors.find(team => team && String(team.id ?? team.team?.id) === String(teamId))?.homeAway : null;
    const player = detail.athletesInvolved?.[0]?.displayName;
    const minute = detail.clock?.displayValue;
    if (!kind || !['home', 'away'].includes(side) || typeof player !== 'string' || !player.trim() || typeof minute !== 'string' || !minute.trim()) return [];
    return [{ id: String(detail.id ?? `${index}`), kind, side, player: player.trim(), minute: minute.trim(), ownGoal: detail.ownGoal === true }];
  });
}
