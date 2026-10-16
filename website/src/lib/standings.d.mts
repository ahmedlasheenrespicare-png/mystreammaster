/* أنواع عقد جدول الترتيب — تُطابق src/lib/standings.mjs */

export type StandingsField =
  | 'points'
  | 'played'
  | 'wins'
  | 'draws'
  | 'losses'
  | 'goalsFor'
  | 'goalsAgainst'
  | 'goalDifference';

export interface StandingsEntry {
  teamId: string;
  name: string;
  rank: number;
  points: number | null;
  played: number | null;
  wins: number | null;
  draws: number | null;
  losses: number | null;
  goalsFor: number | null;
  goalsAgainst: number | null;
  goalDifference: number | null;
}

export interface StandingsTable {
  ok: true;
  provider: 'ESPN';
  league: string;
  phase: 'league';
  season: number;
  fetchedAt: string;
  stale: boolean;
  entries: StandingsEntry[];
}

export interface StandingsLeagueConfig {
  id: string;
  count: number;
  phase: string;
}

export const STANDINGS_LEAGUES: StandingsLeagueConfig[];
export const STANDINGS_FIELDS: StandingsField[];
export const STANDINGS_HEADINGS: string[];
export const STALE_BADGE_TEXT: string;

export function standingsConfig(league: string): StandingsLeagueConfig | undefined;
export function seasonText(season: number): string;
export function validateStandings(data: unknown, league: string): StandingsTable;
export function leagueStandingsByLeague(snapshot: unknown, league: string): StandingsTable;
export function formatStandingsTime(value: string | null | undefined): string;
export function standingsNumber(value: number | null | undefined, field: StandingsField): string;
export function standingsInitialStatus(fetchedAt: string | null | undefined): string;
export function standingsUpdatedStatus(fetchedAt: string | null | undefined): string;
export function standingsStaleStatus(reasonText: string, fetchedAt: string | null | undefined): string;
export function describeStandingsFailure(code: string, online?: boolean): string;
export function standingsUrl(league: string): string;
