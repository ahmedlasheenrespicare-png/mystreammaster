export interface League { id: string; name: string }
export interface MatchTeam { name: string; score: number | null; logo?: string }
export interface Match { id: string; league: string; date: string; home: MatchTeam; away: MatchTeam; state: 'live' | 'scheduled' | 'finished' | 'other'; detail: string; venue: string }
export const LEAGUES: League[];
export const TIME_ZONES: { id: string; name: string }[];
export function dayInZone(date: Date, zone: string): string;
export function shiftDay(day: string, offset: number): string;
export function weekDays(today: string): string[];
export function dayLabel(day: string, options?: Intl.DateTimeFormatOptions): string;
export function kickoff(date: string, zone: string): string;
export function scoreboardUrl(league: string, day: string): string;
export function parseScoreboard(data: unknown, league: League): Match[];
export function matchesForDay(matches: Match[], day: string, zone: string): Match[];
