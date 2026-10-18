/* أنواع عقد بيانات مركز المباراة — انظر match-center.mjs للتفسير والسلوك.
   العرف نفسه المتبع مع matches.mjs / matches.d.mts: منطق خالص في .mjs
   يصلح لـReact وNode معاً، والأنواع هنا ليستهلكها TypeScript في strict. */

export type MatchCode =
  | 'scheduled' | 'live' | 'halftime' | 'finished' | 'postponed'
  | 'delayed' | 'suspended' | 'abandoned' | 'canceled' | 'unknown';

export type MatchPhase = 'pre' | 'live' | 'post' | 'terminal';

export type TabId = 'prematch' | 'live' | 'postmatch';

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
  /** Source wording/IDs when passed through by the current mediator contract. */
  sourceType: string | null;
  sourceTypeId: string | null;
  sourceTeamId: string | null;
  type: MatchEventType;
  /** حقيقة من المصدر (VAR)، لا استنتاج محلي — البند 7. */
  cancelled: boolean;
  /** توقف مصدر (`Start Delay`/`End Delay`): يُوسم ليُخفى ولا يُعدّ حدثاً رياضياً. */
  silent: boolean;
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
  shirtNumber?: string | null;
  positionCode?: string | null;
}

export interface LineupSide {
  teamId?: string;
  /** البند 6: تشكيل متوقع يجب أن يُوصف صراحة بأنه متوقع. */
  confirmed: boolean;
  formation: string | null;
  coach: string | null;
  starters: ScoredPlayer[];
  substitutes: ScoredPlayer[];
  unused?: ScoredPlayer[];
  captainId?: string | number | null;
}

export interface MatchLineups { provider?: string; eventId?: string; home: LineupSide | null; away: LineupSide | null; announcedAt?: string | null }

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

/** بند الرسالة التكميلية 1ب: مباراة واحدة داخل سجل مستوى فريق. */
export interface FormMatch {
  fixtureId: string | number | null;
  date: string;
  competition: string | null;
  opponent: string | null;
  venue: 'home' | 'away';
  goalsFor: number;
  goalsAgainst: number;
  result: 'W' | 'D' | 'L';
}

/** تجميع مستوى فريق على العدد الفعلي — المتوسطات مقسومة على `played`. */
export interface TeamForm {
  matches: FormMatch[];
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  avgGoalsFor: number;
  avgGoalsAgainst: number;
  competitions: string[];
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
  /**
   * البند 11: وقت القراءة — أساس رفض الاستجابات الأقدم.
   *
   * `null` حالة واقعية لا خطأ في النوع: حمولة المصدر قد تصل بلا وقت قراءة،
   * وطبقة العقد تعالجها برمز `MISSING_READ_AT` وترفض تخزينها. إعلانها
   * `string` وحدها كان يعني أن النوع يكذب عن حالة يختبرها العقد فعلاً.
   */
  readAt: string | null;
  status: MatchStatus;
  score: MatchScore | null;
  events: MatchEvent[];
  statistics: StatPair[] | null;
  lineups: MatchLineups | null;
  ratings: ScoredPlayer[] | null;
  h2h: H2hEntry[];
  /** مستوى الفريقين من المصدر، أو `null` إن لم يرسل سجلاً قابلاً للعدّ. */
  form: { home: TeamForm | null; away: TeamForm | null } | null;
  /**
   * شعارا الفريقين كما يرسلهما المصدر، `https://` فقط (البند 4).
   *
   * `null` حين لا يرسل المصدر شعاراً — فتُعرض الأحرف الأولى بدل صورة مكسورة.
   * لا تُخزَّن روابط شعارات في تعريفات المباريات: الرابط غير المؤكد لا يُنشر
   * في HTML ثابت، بل يصل مع القراءة الحية.
   */
  logos: { home: string | null; away: string | null };
  /** الملعب الوارد في اللقطة نفسها، أو null إن غاب عن قراءة المصدر. */
  venue: string | null;
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

/* ==========================================================================
   تحليل المباراة — أنواع العقد (المنطق في match-center.mjs)
   --------------------------------------------------------------------------
   لا نوع هنا يحمل استنتاجاً: `StatComparisonRow` قيمتان وفارق ونسب إليهما،
   و`SourceEventSummary`عدادات لوقائع وصلت. «من يسيطر» و«جودة الفرص» ليسا
   حقلين لأنهما ليسا بيانات عندنا.
========================================================================== */

/** وصف الحدث كما يُقرأ على الملعب وفي التحليل — صيغة واحدة لا صيغتان. */
export function describeEvent(event: MatchEvent | Partial<MatchEvent> | null | undefined): string | null;
/** «55′» أو «45+2′»، أو `null` إن لم يرسل المصدر دقيقة. */
export function eventMinuteLabel(event: MatchEvent | Partial<MatchEvent> | null | undefined): string | null;
export const EVENT_TYPE_LABELS: Partial<Record<MatchEventType, string>>;
export const EVENT_TYPE_UNCLASSIFIED_LABEL: string;
/** تسمية النوع: المعرَّب أولاً، فنصّ المصدر، ثم `fallback`. */
export function eventTypeName(
  event: MatchEvent | Partial<MatchEvent> | null | undefined,
  fallback?: string | null,
): string | null;
/** مفتاح تجميع الفلتر — غير المصنَّف يُجمَع عند تسمية المصدر لا عند `other`. */
export function eventTypeFacet(event: MatchEvent | Partial<MatchEvent> | null | undefined): string;
export function eventTypeFacetLabel(facet: string, events?: (MatchEvent | null | undefined)[]): string;
export const EVENT_SIDE_LABELS: Record<'home' | 'away' | 'unassigned', string>;
export interface EventPeriodInfo { value: string; label: string; classified: boolean }
export function eventPeriodInfo(period: string | number | null | undefined): EventPeriodInfo | null;
export function eventPeriodLabel(event: MatchEvent | Partial<MatchEvent> | null | undefined): string | null;
/** له موضع على الشريط؟ (بلا دقيقة ⇒ لا موضع، ولا يُخترع واحد) */
export function eventOnTimeline(event: MatchEvent | Partial<MatchEvent> | null | undefined): boolean;
export function isRenderableEvent(event: unknown): boolean;
export function renderableEvents(events: MatchEvent[] | null | undefined): MatchEvent[];

/* ── فحص التوافر: ما يُعرض فعلاً في كل قسم ── */
export function displayablePlayers(players: unknown): ScoredPlayer[];
export function displayableStatistics(statistics: StatPair[] | null | undefined): StatPair[];
export function displayableRatings(ratings: ScoredPlayer[] | null | undefined): ScoredPlayer[];
export function confirmedLineupSides(lineups: MatchLineups | null | undefined): { side: 'home' | 'away'; data: LineupSide }[];
export function displayableHeadToHead(entries: H2hEntry[] | null | undefined): H2hEntry[];
export function hasDisplayableForm(form: TeamForm | null | undefined): boolean;
export function displayableComparisonAxes(comparison: Comparison | null | undefined): ComparisonAxis[];
export function headToHeadFor(
  match: MatchDefinition | null | undefined,
  snapshot: MatchSnapshot | null,
  status: MatchStatus | null,
): H2hEntry[];
export function comparisonFor(snapshot: MatchSnapshot | null): Comparison;
export function analysisIsAvailable(snapshot: MatchSnapshot | null): boolean;
export function hasMatchAnalysis(match: MatchDefinition | null | undefined): boolean;
export function hasPreviewFacts(
  match: MatchDefinition | null | undefined,
  snapshot: MatchSnapshot | null,
  status: MatchStatus | null,
): boolean;
export function computeAvailableTabs(input: {
  match: MatchDefinition;
  snapshot: MatchSnapshot | null;
  status: MatchStatus | null;
}): TabId[];

/* ── مجموعات الأرقام ── */
export interface StatComparisonRow {
  key: string;
  label: string;
  /** الوحدة كما وردت من المصدر، أو `null`. */
  unit: string | null;
  unitIsPercent: boolean;
  home: number | null;
  away: number | null;
  /** الطرفان رقم حقيقي عندهما فقط — يُقال «مقابل» عندئذٍ وحده. */
  both: boolean;
  difference: number | null;
  /** الأوفر رقماً؛ وصف للكمية لا للأفضلية. */
  leadingSide: 'home' | 'away' | null;
  comparable: boolean;
  /** نسبة كل طرف إلى الأعلى بينهما (0–1) — للتمثيل البصري فقط. */
  bar: { home: number | null; away: number | null };
}

export interface StatGroup { id: string; label: string; rows: StatComparisonRow[] }

export const STAT_GROUPS: { id: string; label: string; keys: string[] }[];
export const STAT_GROUP_FALLBACK: { id: string; label: string };

export function compareStatRow(stat: StatPair | null | undefined): StatComparisonRow;
export function groupStatistics(statistics: StatPair[] | null | undefined): StatGroup[];
export function analysisFacts(statistics: StatPair[] | null | undefined): StatComparisonRow[];

/* ── الوقائع المعدودة والفلاتر ── */
export interface EventFilterOption { value: string; label: string; count: number }
export interface SourceEventSummary {
  total: number;
  onTimeline: number;
  untimed: number;
  cancelled: number;
  bySide: { home: number; away: number; unassigned: number };
  types: EventFilterOption[];
  periods: EventFilterOption[];
  firstMinute: number | null;
  lastMinute: number | null;
}
export interface EventFilterValues { team?: string; period?: string; type?: string }
export interface EventFilterChoices {
  total: number;
  team: EventFilterOption[];
  period: EventFilterOption[];
  type: EventFilterOption[];
}

export const EVENT_FILTER_ALL: 'all';
export const EVENT_FILTER_NO_PERIOD: 'none';
export const EVENT_FILTER_NO_SIDE: 'unassigned';
export const EVENT_FILTER_DEFAULTS: Required<EventFilterValues>;

export function summarizeSourceEvents(events: MatchEvent[] | null | undefined): SourceEventSummary;
export function eventMatchesFilters(event: MatchEvent | null | undefined, filters?: EventFilterValues): boolean;
export function filterEvents(events: MatchEvent[] | null | undefined, filters?: EventFilterValues): MatchEvent[];
export function eventFilterOptions(
  events: MatchEvent[] | null | undefined,
  names?: { homeName?: string | null; awayName?: string | null },
): EventFilterChoices;
export function activeEventFilterCount(filters?: EventFilterValues): number;

/** غياب موصوف لا صف: ما لا يصل من المصدر يُقال ولا يُمثَّل. */
export function unavailableDataNotes(snapshot: MatchSnapshot | null): { id: string; text: string }[];

/* `MOCK` حالة قائمة لا بديل عن `MISS`: قراءة المحاكاة لم تمر بمخبأ الخادم،
   ووسمها `MISS` يوحي بأن طلباً حقيقياً جرى. */
export type CacheState = 'HIT' | 'MISS' | 'STALE' | 'MOCK';

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
  /** معرّف التحليل إن وُجد (slug في match-analysis.json) — يُظهر تبويب التحليل. */
  analysisSlug?: string | null;
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
export function isStaleRead(incoming: { readAt?: string | null } | null, current: { readAt?: string | null } | null): boolean;
export function mergeReads(current: ReadStore, results: Record<string, SettledResult>, now: number): ReadStore;
export function defaultTab(status: MatchStatus | null): TabId;
export function resolveTab(status: MatchStatus | null, userChoice: TabId | null): TabId;
export function nextTabId(currentId: TabId, direction: 'next' | 'previous'): TabId;
export function eventKey(matchId: string, event: Partial<MatchEvent>): string;
export function normalizeEvent(raw: unknown): MatchEvent;

export type EventSymbol =
  | 'ball' | 'penalty' | 'own-goal' | 'missed-penalty'
  | 'yellow-card' | 'red-card' | 'substitution' | 'var' | 'other';

/** موضع رمز على شريط الملعب: الدقيقة أفقيًا، والفريق بالصف. */
export interface PitchMarker {
  event: MatchEvent;
  key: string;
  minute: number;
  /** نسبة من عرض الشريط (0–100)، من جهة بداية السطر — RTL: 0 عند اليمين. */
  position: number;
  /** صف داخل خط الفريق، لتفادي تراكب الأحداث المتقاربة. */
  row: number;
}

export interface PitchLanes {
  /** 90، أو 120 لمباراة امتدت إلى الوقت الإضافي. */
  totalMinutes: number;
  home: PitchMarker[];
  away: PitchMarker[];
  /** أحداث بلا جانب فريق — لا تُنسب إلى أحد بالظن. */
  unknown: PitchMarker[];
  /** أحداث بلا دقيقة: تبقى خارج الشريط الزمني. */
  untimed: { event: MatchEvent; key: string }[];
}

/** الرمز المرسوم لكل نوع حدث (شكل لا لون). */
export function eventSymbol(type: string | null | undefined): EventSymbol;
/** تخطيط الرموز على شريط الملعب: دقيقة أفقياً وفريق بالصف. */
export function pitchLanes(events: MatchEvent[] | null | undefined): PitchLanes;
export const PITCH_MINUTES: number;
export const PITCH_MAX_ROWS: number;

export function planAnnouncements(input: PlanAnnouncementsInput): PlanAnnouncementsResult;
/** أنواع الأحداث التي تحرّك النتيجة فعلاً. */
export const SCORING_TYPES: ReadonlySet<string>;

/** النتيجة كما تفسّرها الأحداث المعلنة — بلا تعريف ثانٍ للاحتساب. */
/** البند 4 و12: رابط شعار `https://` فقط، وإلا `null`. */
export function safeLogoUrl(value: unknown): string | null;

export function scoreFromEvents(events: unknown): {
  home: number;
  away: number;
  /** أحداث تحرّك النتيجة ولم يرسل المصدر جانب الفريق فيها. */
  unattributed: number;
};

export function detectScoreCorrection(previousScore: MatchScore | null, nextScore: MatchScore | null, announcedGoals: Announcement[]): ScoreCorrection | null;
/** true only when both scores are non-negative safe integers; 0 remains valid. */
export function isValidScore(score: MatchScore | null | undefined): boolean;
/** A score requires an allowed source status and two complete numeric values. */
export function canShowScore(status: MatchStatus | null, score: MatchScore | null): boolean;
/** A scheduled kickoff is hidden after an authoritative delay, postponement, or cancellation. */
export function canShowKickoff(status: MatchStatus | null): boolean;
export function isResultOfficial(status: MatchStatus | null, score: MatchScore | null): boolean;
export function mergeH2h(existing: H2hEntry[], self?: (H2hEntry & { completed: boolean }) | null, limit?: number): H2hEntry[];
export function summarizeForm(entries: unknown, teamId: string | number | null | undefined, limit?: number): TeamForm | null;
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

export interface PlayerEventBadge {
  event: MatchEvent; label: string; minute: string; typeLabel: string; role: string | null;
}
export interface PitchLineupPlayer extends ScoredPlayer { badges: PlayerEventBadge[] }
export interface PitchLineupSide {
  side: 'home' | 'away'; teamName: string; formation: string | null;
  rows: { label: string; players: PitchLineupPlayer[] }[];
  substitutes: PitchLineupPlayer[];
}
export function lineupPitchSides(input: { match: MatchDefinition; snapshot: MatchSnapshot | null }): PitchLineupSide[];
