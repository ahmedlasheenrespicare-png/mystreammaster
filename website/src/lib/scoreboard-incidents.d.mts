export interface ScoreboardIncident { id: string; kind: 'goal' | 'yellow' | 'red'; side: 'home' | 'away'; player: string; minute: string; ownGoal: boolean }
export function scoreboardIncidents(competition: unknown): ScoreboardIncident[];
