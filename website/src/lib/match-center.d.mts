/* أنواع عقد بيانات مركز المباراة — انظر match-center.mjs للتفسير والسلوك.
   العرف نفسه المتبع مع matches.mjs / matches.d.mts: منطق خالص في .mjs
   يصلح لـReact وNode معاً، والأنواع هنا ليستهلكها TypeScript في strict. */

export type MatchCode =
  | 'scheduled' | 'live' | 'halftime' | 'finished' | 'postponed'
  | 'delayed' | 'suspended' | 'abandoned' | 'canceled' | 'unknown';

export type MatchPhase = 'pre' | 'live' | 'post' | 'terminal';

export type TabId = 'preview' | 'history' | 'lineups' | 'live' | 'report';

export type ProviderId = 'espn' | 'apifootball' | 'snapshot' | 'unknown';

/** البند 6/7: الحالة من المصدر وحده. `finishedAt` يُضاف من القراءة التي أكدت النهاية. */
export interface MatchStatus {
  code: MatchCode;
  label: string;
  phase: MatchPhase;
  completed: boolean;
  clock: string | null;
  elapsed: number | null;
  period: number | null;
  detail: string | null;
  finishedAt?: string | null;
}

/** `null` = غير متاح، `0` = صفر حقيقي. الفرق محفوظ في كل الطبقات (البند 8، 14). */
export interface MatchScore { home: number | null; away: number | null }

export interface EventPlayer { id: string | number | null; name: string }

export type MatchEventType =
  | 'goal' | 'penalty' | 'own_goal' | 'missed_penalty'
  | 'yellow_card' | 'red_card' | 'substitution'
  | 'var_cancelled' | 'var_confirmed' | 'other';

export interface MatchEvent {
  /** معرّف الحدث من المصدر — أساس بصمة الإعلان؛ `null` إن لم يرسل المصدر واحداً. */
  id: string | null;
  type: MatchEventType;
  /** حقيقة من المصدر (VAR)، لا استنتاج محلي — البند 7. */
  cancelled: boolean;
  minute: number | null;
  extraMinute: number | null;
  period: string | null;
  team: string | null;
  teamSide: 'home' | 'away' | null;
  player: EventPlayer | null;
  relatedPlayer: EventPlayer | null;
  detail: string | null;
}

export interface ScoredPlayer {
  id: string | number | null;
  name: string;
  /** البند 9: تقييم ناقص يبقى null ولا يُستكمل صفراً. */
  rating: number | null;
  /** البند 7: التقييمات أثناء المباراة قابلة للتغير وتُوسم كذلك. */
  provisional?: boolean;
}

export interface LineupSide {
  /** البند 6: تشكيل متوقع يجب أن يُوصف صراحة بأنه متوقع. */
  confirmed: boolean;
  formation: string | null;
  coach: string | null;
  starters: ScoredPlayer[];
  substitutes: ScoredPlayer[];
  unused?: ScoredPlayer[];
  captainId?: string | number | null;
}

export interface MatchLineups { home: LineupSide; away: LineupSide; announcedAt?: string | null }

/** البند 5: الودية تُميّز إن ميّزها المصدر؛ وإلا `null` ولا يُخمَّن. */
export interface H2hEntry {
  fixtureId?: string | number | null;
  date: string;
  competition: string | null;
  year: string | null;
  friendly: boolean | null;
  completed: boolean;
  home: string;
  away: string;
  homeGoals: number | null;
  awayGoals: number | null;
}

export interface StandingEntry {
  teamId: string | number | null;
  name: string;
  rank: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

/** البند 11: الترتيب مشترك بين المباريات الثلاث، فيُقرأ مرة ويُمرَّر لهن. */
export interface StandingsSnapshot {
  provider: ProviderId | string;
  league: string;
  fetchedAt: string;
  stale?: boolean;
  entries: StandingEntry[];
}

export interface StatPair { key: string; label: string; unit?: string; home: number | null; away: number | null }

export interface MatchSnapshot {
  /** معرّف المباراة الداخلي الثابت (الـslug)، لا معرّف المزوّد. */
  matchId: string;
  provider: ProviderId | string;
  /** البند 11: وقت القراءة — أساس رفض الاستجابات الأقدم. */
  readAt: string;
  status: MatchStatus;
  score: MatchScore | null;
  events: MatchEvent[];
  statistics: StatPair[] | null;
  lineups: MatchLineups | null;
  ratings: ScoredPlayer[] | null;
  h2h: H2hEntry[];
  /** البند 9: أرقام المقارنة قبل اللقاء تحتاج عينة معلنة. */
  seasonComparison: ComparisonMetric[] | null;
  seasonSample: ComparisonSample | null;
}

export interface Announcement {
  kind: 'goal' | 'cancelled' | 'corrected';
  key: string;
  matchId: string;
  event: MatchEvent;
  message: string;
}

export interface PlanAnnouncementsInput {
  matchId: string;
  previousEvents?: MatchEvent[];
  nextEvents?: MatchEvent[];
  knownKeys?: string[];
  /** أول قراءة ناجحة في الجلسة: تُبصم الموجود بلا إعلان (البند 7). */
  silentSeed?: boolean;
}

export interface PlanAnnouncementsResult { announce: Announcement[]; knownKeys: string[] }

export interface ScoreCorrection { from: MatchScore; to: MatchScore; message: string }

export interface ComparisonSample { competition: string; period: string; matches: number }

export interface ComparisonMetric {
  key: string;
  label: string;
  unit?: string;
  home: number | string | null;
  away: number | string | null;
  mode?: 'match' | 'season';
  provider?: ProviderId | string | null;
}

export interface ComparisonAxis {
  key: string;
  label: string;
  unit: string;
  home: number | null;
  away: number | null;
  /** نسبة إلى الأعلى بين الفريقين — ليست درجة من 100 (البند 9). */
  homeNorm: number | null;
  awayNorm: number | null;
  comparable: boolean;
}

export type ComparisonReason =
  | 'OK' | 'NO_DATA' | 'MIXED_PROVIDERS' | 'MIXED_MODES'
  | 'FORBIDDEN_METRIC' | 'TOO_MANY_AXES' | 'NO_SAMPLE' | 'INSUFFICIENT_AXES'
  | 'INVALID_METRICS' | 'UNDECLARED_PROVIDER';

export interface Comparison {
  ok: boolean;
  polygon: boolean;
  reason: ComparisonReason;
  message: string;
  mode: 'match' | 'season';
  sample: ComparisonSample | null;
  axes: ComparisonAxis[];
  tableOk: boolean;
  provider?: ProviderId | string | null;
  drawableCount?: number;
}

export interface CountdownParts {
  started: boolean;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
}

/** البند 11: `fresh` وحدها تُعرض على أنها قراءة حالية. */
export type FreshnessLevel = 'fresh' | 'aging' | 'stale' | 'failed' | 'invalid';
export interface Freshness { text: string; level: FreshnessLevel }

export interface Tab { id: TabId; label: string }

export type CacheState = 'HIT' | 'MISS' | 'STALE';

/** البند 11: لكل مباراة آخر قراءة مؤكدة + فشلها الخاص، بلا تداخل. */
export interface MatchRead {
  data: MatchSnapshot | null;
  failure: string | null;
  cache?: CacheState;
  readAt?: string;
  attemptedAt?: number;
  rejectedStale?: number;
}

export type ReadStore = Record<string, MatchRead>;

export type SettledResult =
  | { status: 'fulfilled'; value: { data: MatchSnapshot; cache?: CacheState } }
  | { status: 'rejected'; code?: string };

/** البند 3: تعريف المباراة الثابت — الرابط لا يحمل حالة ولا نتيجة. */
export interface TeamDefinition {
  name: string;
  shortName: string;
  /** اسم الفريق كما يرسله المصدر — `null` حتى مطابقة المصدر (البند 2). */
  sourceName: string | null;
  /** أصول مسموح باستخدامها فقط؛ null = بلا شعار متاح. */
  logo: string | null;
  externalIds: Partial<Record<ProviderId | string, string | number | null>>;
}

export interface MatchDefinition {
  /** المعرّف الداخلي الثابت = الـslug. */
  id: string;
  slug: string;
  competitionSlug: string;
  competitionName: string;
  leagueId: string;
  season?: string;
  round?: string | number | null;
  /** البند 1: UTC فقط، والعرض عبر Intl بمناطق IANA. */
  kickoffUtc: string;
  venue: string | null;
  /** نص الحدث كما ورد من المصدر حرفياً — أصل اشتقاق `sourceName`. */
  sourceEventName?: string | null;
  home: TeamDefinition;
  away: TeamDefinition;
  /** البند 13 و8.5: `pending` ⇒ noindex وبلا JSON-LD حتى مطابقة المصدر. */
  verification: 'pending' | 'confirmed';
  externalIds: Partial<Record<ProviderId | string, string | number | null>>;
  /** أين تُعرض أسماء المصادر — البند 12 يحصرها في التوثيق والمراجعة. */
  sourcesNote?: string;
}

export const MATCH_CODES: MatchCode[];
export const STATUS_LABELS: Record<MatchCode, string>;
export const PHASES: Record<MatchCode, MatchPhase>;
export const MATCH_ZONES: string[];
export const TABS: Tab[];
export const POLL_INTERVALS: Record<MatchPhase, Record<string, number | null>>;
export const POST_MATCH_WINDOW_MS: number;
export const FRESH_NOW_SECONDS: number;
export const FRESH_AGING_SECONDS: number;
export const MATCH_CENTER_DIAGNOSTICS: Record<string, string>;
export const READ_AT_FUTURE_TOLERANCE_MS: number;

export function normalizeStatus(raw: unknown, provider?: ProviderId | string): MatchStatus;
export function deriveScore(status: MatchStatus | null, rawHome: unknown, rawAway: unknown): MatchScore | null;
export function formatInZone(iso: string, zone: string, options?: Intl.DateTimeFormatOptions): string;
export function kickoffLabel(iso: string, zone: string): string;
export function dayLabelInZone(iso: string, zone: string): string;
export function countdownParts(kickoffUtc: string, now: number): CountdownParts | null;
export function freshnessLabel(input: { readAt: string | null; cache?: CacheState; now: number; failed?: boolean }): Freshness;
export function isTrustworthyReadAt(readAt: unknown, now: number, tolerance?: number): boolean;
export function readAtProblem(readAt: unknown, now: number): 'MISSING_READ_AT' | 'FUTURE_READ_AT' | null;
export function isStaleRead(incoming: { readAt?: string } | null, current: { readAt?: string } | null): boolean;
export function mergeReads(current: ReadStore, results: Record<string, SettledResult>, now: number): ReadStore;
export function defaultTab(status: MatchStatus | null): TabId;
export function resolveTab(status: MatchStatus | null, userChoice: TabId | null): TabId;
export function nextTabId(currentId: TabId, direction: 'next' | 'previous'): TabId;
export function eventKey(matchId: string, event: Partial<MatchEvent>): string;
export function normalizeEvent(raw: unknown): MatchEvent;
export function planAnnouncements(input: PlanAnnouncementsInput): PlanAnnouncementsResult;
export function detectScoreCorrection(previousScore: MatchScore | null, nextScore: MatchScore | null, announcedGoals: Announcement[]): ScoreCorrection | null;
export function isResultOfficial(status: MatchStatus | null, score: MatchScore | null): boolean;
export function mergeH2h(existing: H2hEntry[], self?: (H2hEntry & { completed: boolean }) | null, limit?: number): H2hEntry[];
export function stampCompletion(previousStatus: MatchStatus | null, nextStatus: MatchStatus | null, readAt: string | null): MatchStatus | null;
export function pollIntervalFor(status: MatchStatus | null, dataType: string): number | null;
export function shouldStopPolling(status: MatchStatus | null, data: MatchSnapshot | null, now: number): boolean;
export function pollingAllowed(input: { hidden: boolean; online: boolean }): boolean;
/** البند 9: «حتى ستة محاور»، ومضلع يحتاج ثلاثة رؤوس على الأقل. */
export const MAX_AXES: number;
export const MIN_AXES: number;

export function buildComparison(metrics: ComparisonMetric[], options?: { mode?: 'match' | 'season'; sample?: ComparisonSample | null; provider?: ProviderId | string | null }): Comparison;
export function radarPoints(axes: ComparisonAxis[], options?: { cx?: number; cy?: number; r?: number; side?: 'home' | 'away' }): string;
export function radarAxisLabels(axes: ComparisonAxis[], options?: { cx?: number; cy?: number; r?: number }): { key: string; label: string; x: number; y: number }[];
export function matchPath(competitionSlug: string, slug: string): string;
export function matchByFixtureId(matches: MatchDefinition[], provider: ProviderId | string, fixtureId: string | number | null): MatchDefinition | null;
export function isVerified(match: MatchDefinition | null | undefined): boolean;
