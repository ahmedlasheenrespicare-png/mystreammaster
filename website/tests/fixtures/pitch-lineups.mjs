// Synthetic contract fixtures for tests only. Never imported by production code.
export function pitchLineupPayload() {
  const positions = ['G', 'CD-L', 'CD-R', 'LB', 'RB', 'LM', 'RM', 'AM', 'AM-L', 'AM-R', 'F'];
  const player = (prefix, index, positionCode) => ({ id: `${prefix}${index}`,
    name: `Mock ${prefix} Player Long Name ${index}`, shirtNumber: String(index + 1), positionCode, rating: null });
  const squad = (prefix, teamId) => ({ confirmed: true, teamId, formation: '4-2-3-1', coach: null,
    starters: positions.map((code, index) => player(prefix, index, code)),
    substitutes: [player(prefix, 11, 'SUB'), player(prefix, 12, 'SUB')],
  });
  const event = (id, type, minute, index = 10, extra = {}) => ({ id, type, minute, side: 'home',
    player: { id: `h${index}`, name: `Mock h Player Long Name ${index}` }, ...extra });
  return {
    provider: 'espn', match: 'manchester-city-ipswich-town', event: '401879259', league: 'eng.1',
    readAt: '2026-10-17T15:20:00Z', cache: 'HIT',
    status: { type: { name: 'STATUS_FULL_TIME', state: 'post', completed: true } },
    score: { home: 1, away: 0 }, statistics: null, ratings: null, h2h: [], form: null,
    lineups: { provider: 'espn', eventId: '401879259', home: squad('h', '382'), away: squad('a', '373') },
    events: [event('goal', 'Goal', 12), event('yellow', 'Yellow Card', 45, 10, { extraMinute: 2 }),
      event('red', 'Red Card', 88), event('cancelled', 'Goal', 66, 10, { cancelled: true }),
      event('sub', 'Substitution', 60, 11, { assist: { id: 'h10', name: 'Mock h Player Long Name 10' } }),
      event('bench-goal', 'Goal', 90, 11, { extraMinute: 3 }),
      event('unlinked', 'Goal', 75, 999),
      event('wrong-side', 'Goal', 77, 10, { side: 'away' }),
      event('no-id', 'Goal', 78, 10, { player: { id: null, name: 'Mock h Player Long Name 10' } }),
      event('wrong-team-id', 'Goal', 79, 10, { sourceTeamId: '373' }),
      event('untimed', 'Goal', null), event('silent', 'Start Delay', 40),
      event('other', 'Possession sequence', 80),
    ],
  };
}
