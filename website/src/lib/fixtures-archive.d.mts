import type { StandingsEntry } from './standings.mjs';
export interface ArchiveStatistics { possession: number | null; shots: number | null; passAccuracy: number | null }
export interface ArchiveMatch {
  id: string; date: string; home: { id: string; name: string }; away: { id: string; name: string };
  score: { home: number | null; away: number | null };
  status: 'scheduled' | 'live' | 'finished' | 'postponed' | 'cancelled' | 'suspended' | 'unknown';
  attendance: number | null; fetchedAt: string;
  source: { provider: 'ESPN' | 'Highlightly'; leagueId: string; url: string };
  statistics: { home: ArchiveStatistics; away: ArchiveStatistics } | null;
}
export interface FixturesArchive { schemaVersion: 1; league: string; season: string; matches: ArchiveMatch[] }
export const ARCHIVE_LEAGUES: string[];
export const BIG_FIVE: string[];
export function validateArchive(data: unknown, league?: string, season?: string): FixturesArchive;
export function mergeArchive(previous: FixturesArchive | null, incoming: FixturesArchive): FixturesArchive;
interface VenueStats { played: number; wins: number; draws: number; losses: number; goalsFor: number; goalsAgainst: number }
export function archiveTeamStats(matches: ArchiveMatch[]): { id: string; name: string; played: number; cleanSheets: number; winningStreak: number | null; unbeatenStreak: number | null; home: VenueStats; away: VenueStats }[];
type RatedEntry = StandingsEntry & { attack: number | null; defence: number | null; logo?: string | null };
export function cleanTeamName(name: unknown): string;
export function standingsRates(entries: Partial<StandingsEntry>[]): { rows: RatedEntry[]; bestAttack: RatedEntry[]; worstAttack: RatedEntry[]; bestDefence: RatedEntry[]; worstDefence: RatedEntry[]; attackComplete: boolean; defenceComplete: boolean };
