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
export interface ArchiveTeamStats {
  id: string; name: string; played: number;
  cleanSheets: number;
  /** مباريات انتهت دون تسجيل الفريق أي هدف (ضمن الأرشيف فقط) */
  scoreless: number;
  winningStreak: number | null; unbeatenStreak: number | null;
  home: VenueStats; away: VenueStats;
}
export function archiveTeamStats(matches: ArchiveMatch[]): ArchiveTeamStats[];
/** متوسطات الدوري الموثقة (لكل فريق في المباراة) من مباريات منتهية كاملة الأرقام؛
    عينة أصغر من `minMatches` ⇒ `null` — لا متوسط بلا عينة تُذكر. */
export interface LeagueAverages { matches: number; possession: number; shots: number; passAccuracy: number }
export function computeLeagueAverages(
  matches: ArchiveMatch[] | null | undefined,
  options?: { minMatches?: number },
): LeagueAverages | null;
export type TacticCode = 'elite-balanced' | 'offensive' | 'defensive' | 'struggling';
export const TACTIC_LABELS: Record<TacticCode, string>;
type RatedEntry = StandingsEntry & {
  attack: number | null; defence: number | null;
  /** (له − عليه) ÷ لعب — من القيم الخام، لا من فارق المصدر */
  gdPerMatch: number | null;
  /** نقاط ÷ لعب (يسمح بخصم النقاط السالب) */
  ppm: number | null;
  /** فوز ÷ لعب × 100 */
  winPct: number | null;
  /** الفرق الدقيق عن متوسط الدوري (موجب = أعلى من المتوسط) */
  attackDelta: number | null; defenceDelta: number | null;
  /** درجة Z للمعدل داخل توزيع الفرق (متوسط العمود وانحرافه المعياري) */
  attackZ: number | null; defenceZ: number | null;
  /** مؤشر القوة المركّب = attackZ − defenceZ (مشتق مُعلن الصيغة) */
  power: number | null;
  tactic: TacticCode | null;
  logo?: string | null;
};
export interface StandingsLeagueSummary {
  /** مجموع «له» في صفوف الجدول المتكاملة — null إن غابت البيانات */
  totalGoals: number | null;
  /** مجموع «لعب» في صفوف الجدول المتكاملة */
  totalTeamMatches: number | null;
  /** متوسط أهداف الفريق لكل مباراة = إجمالي الأهداف ÷ إجمالي المباريات */
  averagePerTeam: number | null;
  maxAttack: number | null;
  maxDefence: number | null;
  bestGdPerMatch: { value: number; teams: RatedEntry[] } | null;
  bestPpm: { value: number; teams: RatedEntry[] } | null;
  /**
   * صف «متوسط المسابقة» للجدول التحليلي: متوسط لكل عمود من مساهميه ذوي
   * القيم فقط — الأعداد الخام بمتوسطها على الفرق، والمعدلات من إجماليات
   * المسابقة (مجموع ÷ مجموع) فتتسق كفريقٍ متوسطٍ واحد (attack فيه هو
   * averagePerTeam نفسه)، ومتوسطا الفارق موزونان بالمباريات. null لكل
   * عمود غاب كل مساهميه.
   */
  averages: {
    played: number | null;
    goalsFor: number | null;
    goalsAgainst: number | null;
    goalDifference: number | null;
    attack: number | null;
    defence: number | null;
    gdPerMatch: number | null;
    ppm: number | null;
    winPct: number | null;
    attackDelta: number | null;
    defenceDelta: number | null;
    power: number | null;
  };
  /**
   * متصدّر كل مقياس من مقاييس الجدول التحليلي الاثني عشر باتجاهه الدلالي
   * «الأفضل أولاً» (الأدنى للمستقبَل ومعدله وفارقه، والأعلى لسواه) وبكل
   * المتعادلين بأولوية المركز ثم الاسم. null لأي مقياس ينقص أيَّ فريقٍ
   * قيمتُه — لا يُحسم متصدّر بجدول جزئي.
   */
  leaders: Record<
    | 'played'
    | 'goalsFor'
    | 'goalsAgainst'
    | 'goalDifference'
    | 'attack'
    | 'attackDelta'
    | 'defence'
    | 'defenceDelta'
    | 'gdPerMatch'
    | 'power'
    | 'ppm'
    | 'winPct',
    { value: number; teams: RatedEntry[] } | null
  >;
  /**
   * توزيع كل مقياس عبر الفرق: متوسط قيم العمود البسيط ووسيطها وانحرافها
   * المعياري على مجتمع الفرق (مرجع درجات Z ومؤشر القوة — ومختلف عن
   * averagePerTeam الموزون بالمباريات). null لمقياس بلا أي قيمة.
   */
  distributions: Record<
    | 'played'
    | 'goalsFor'
    | 'goalsAgainst'
    | 'goalDifference'
    | 'attack'
    | 'attackDelta'
    | 'defence'
    | 'defenceDelta'
    | 'gdPerMatch'
    | 'power'
    | 'ppm'
    | 'winPct',
    { mean: number; median: number; sd: number; n: number } | null
  >;
}
export function standingsRates(entries: Partial<StandingsEntry>[]): {
  rows: RatedEntry[];
  bestAttack: RatedEntry[]; worstAttack: RatedEntry[];
  bestDefence: RatedEntry[]; worstDefence: RatedEntry[];
  attackComplete: boolean; defenceComplete: boolean;
  league: StandingsLeagueSummary;
};
export function cleanTeamName(name: unknown): string;
