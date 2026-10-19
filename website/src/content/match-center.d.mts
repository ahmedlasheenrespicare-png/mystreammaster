/* أنواع تعريفات مباريات مركز المباراة — انظر match-center.mjs.
   تعيد استخدام عقد `lib/match-center.d.mts` حتى يبقى شكل المباراة واحداً
   بين التعريف الثابت والقراءة الحية، فلا ينشأ نموذجان متوازيان. */

import type { MatchDefinition, ProviderId } from '../lib/match-center.mjs';

export interface MatchCenterCompetition {
  slug: string;
  leagueId: string;
  name: string;
  season: string;
}

/** حدث كما ورد من المصدر حرفياً — يُستخدم في الاختبارات كحالة ربط واقعية. */
export interface ReceivedEvent {
  id: string;
  date: string;
  name: string;
  venue: string;
  inTrial: boolean;
}

/** البند 2: أصل كل رقم في هذا الملف، وما لم يتحقق بعد. */
export interface MatchCenterVerification {
  verifiedAt: string;
  provider: ProviderId | string;
  endpoint: string;
  method: string;
  receivedEvents: ReceivedEvent[];
  sourceNameRule: string;
  unverified: string[];
}

/** حكم مفتاح في استجابة `summary` — يفرّق «المصدر يوفّره» عن «الموقع يعرضه». */
export type SummaryKeyVerdict =
  | 'available'
  | 'available-not-used'
  | 'confined'
  | 'forbidden'
  | 'unresolved';

export interface SummaryKeyUsage {
  key: string;
  verdict: SummaryKeyVerdict;
  /** إحالة إلى البند الحاكم من موجز صاحب المشروع. */
  rule: string;
  note: string;
}

/** البند 2: ما رصدته نقطة `summary?event=` حرفياً، وحكم كل مفتاح فيها. */
export interface MatchCenterSummaryProbe {
  probedAt: string;
  provider: ProviderId | string;
  endpoint: string;
  subjectEventId: string;
  subjectSlug: string;
  method: string;
  matchStateAtProbe: string;
  topLevelKeys: string[];
  observed: {
    lineups: unknown[];
    metricNamesBySide: string[][];
    /** `null` لأن مخرجات الفحص لم تُسمِّ المفتاح الحاوي — لا يجوز تخمينه. */
    metricNamesContainingKey: string | null;
    headToHead: unknown[];
    standingsKeys: string[];
    oddsCount: number;
  };
  usage: SummaryKeyUsage[];
  unresolved: string[];
}

export interface MatchCenterDocumentationProvider {
  id: string;
  /** البند 12: هذا النص يُعرض داخل «التوثيق والمراجعة» وحده. */
  label: string;
  note: string;
}

export interface MatchCenterDocumentation {
  rightsNote: string;
  providers: MatchCenterDocumentationProvider[];
}

/** تعريف المباراة كما يُخزَّن: معرّفات المزوّدين `null` حتى مطابقة المصدر. */
export type MatchCenterFixture = MatchDefinition;

export const MATCH_CENTER_COMPETITION: MatchCenterCompetition;
export const MATCH_CENTER_ITALIAN_COMPETITION: MatchCenterCompetition;
export const MATCH_CENTER_ITALIAN_MATCHES: MatchCenterFixture[];
export const MATCH_CENTER_MATCHES: MatchCenterFixture[];
export const MATCH_CENTER_ENGLISH_MATCHES: MatchCenterFixture[];
export const MATCH_CENTER_ENGLISH_20261018_20261023_MATCHES: MatchCenterFixture[];
export const MATCH_CENTER_ENGLISH_20261018_20261023_RANGES: Array<{
  dates: string;
  complete: boolean;
  events: Array<[string, string, string, string, string, string, string, string]>;
}>;
export const MATCH_CENTER_ENGLISH_20261018_20261023_VERIFICATION: MatchCenterScoreboardWindowVerification;
export const MATCH_CENTER_ENGLISH_20261024_20261030_MATCHES: MatchCenterFixture[];
export const MATCH_CENTER_ENGLISH_20261024_20261030_RANGES: Array<{
  dates: string;
  complete: boolean;
  events: Array<[string, string, string, string, string, string, string, string]>;
}>;
export const MATCH_CENTER_ENGLISH_20261024_20261030_VERIFICATION: MatchCenterScoreboardWindowVerification;
export const MATCH_CENTER_ENGLISH_20261031_20261106_MATCHES: MatchCenterFixture[];
export const MATCH_CENTER_ENGLISH_20261031_20261106_RANGES: Array<{
  dates: string;
  complete: boolean;
  events: Array<[string, string, string, string, string, string, string, string]>;
}>;
export const MATCH_CENTER_ENGLISH_20261031_20261106_VERIFICATION: MatchCenterScoreboardWindowVerification;
export const MATCH_CENTER_ENGLISH_20261107_20261113_MATCHES: MatchCenterFixture[];
export const MATCH_CENTER_ENGLISH_20261107_20261113_RANGES: Array<{
  dates: string;
  complete: boolean;
  events: Array<[string, string, string, string, string, string, string, string]>;
}>;
export const MATCH_CENTER_ENGLISH_20261107_20261113_VERIFICATION: MatchCenterScoreboardWindowVerification;
export const MATCH_CENTER_ENGLISH_20261114_20261120_RANGES: Array<{
  dates: string;
  complete: boolean;
  events: Array<[string, string, string, string, string, string, string, string]>;
}>;
export const MATCH_CENTER_ENGLISH_20261114_20261120_VERIFICATION: MatchCenterScoreboardWindowVerification;
export const MATCH_CENTER_ENGLISH_20261121_20261127_MATCHES: MatchCenterFixture[];
export const MATCH_CENTER_ENGLISH_20261121_20261127_RANGES: Array<{
  dates: string;
  complete: boolean;
  events: Array<[string, string, string, string, string, string, string, string]>;
}>;
export const MATCH_CENTER_ENGLISH_20261121_20261127_VERIFICATION: MatchCenterScoreboardWindowVerification;
export const MATCH_CENTER_ENGLISH_20261128_20261204_MATCHES: MatchCenterFixture[];
export const MATCH_CENTER_ENGLISH_20261128_20261204_RANGES: Array<{
  dates: string;
  complete: boolean;
  events: Array<[string, string, string, string, string, string, string, string]>;
}>;
export const MATCH_CENTER_ENGLISH_20261128_20261204_VERIFICATION: MatchCenterScoreboardWindowVerification;
export const MATCH_CENTER_ENGLISH_20261205_20261211_MATCHES: MatchCenterFixture[];
export const MATCH_CENTER_ENGLISH_20261205_20261211_RANGES: Array<{
  dates: string;
  complete: boolean;
  events: Array<[string, string, string, string, string, string, string, string]>;
}>;
export const MATCH_CENTER_ENGLISH_20261205_20261211_VERIFICATION: MatchCenterScoreboardWindowVerification;
export const MATCH_CENTER_ENGLISH_20261212_20261218_MATCHES: MatchCenterFixture[];
export const MATCH_CENTER_ENGLISH_20261212_20261218_RANGES: Array<{
  dates: string;
  complete: boolean;
  events: Array<[string, string, string, string, string, string, string, string]>;
}>;
export const MATCH_CENTER_ENGLISH_20261212_20261218_VERIFICATION: MatchCenterScoreboardWindowVerification;
export const MATCH_CENTER_ENGLISH_20261219_20261225_MATCHES: MatchCenterFixture[];
export const MATCH_CENTER_ENGLISH_20261219_20261225_RANGES: Array<{
  dates: string;
  complete: boolean;
  events: Array<[string, string, string, string, string, string, string, string]>;
}>;
export const MATCH_CENTER_ENGLISH_20261219_20261225_VERIFICATION: MatchCenterScoreboardWindowVerification;
export const MATCH_CENTER_ENGLISH_20261226_20270101_MATCHES: MatchCenterFixture[];
export const MATCH_CENTER_ENGLISH_20261226_20270101_RANGES: Array<{
  dates: string;
  complete: boolean;
  events: Array<[string, string, string, string, string, string, string, string]>;
}>;
export const MATCH_CENTER_ENGLISH_20261226_20270101_VERIFICATION: MatchCenterScoreboardWindowVerification;
export const MATCH_CENTER_ENGLISH_20270102_20270108_MATCHES: MatchCenterFixture[];
export const MATCH_CENTER_ENGLISH_20270102_20270108_RANGES: Array<{
  dates: string;
  complete: boolean;
  events: Array<[string, string, string, string, string, string, string, string]>;
}>;
export const MATCH_CENTER_ENGLISH_20270102_20270108_VERIFICATION: MatchCenterScoreboardWindowVerification;
export const MATCH_CENTER_ENGLISH_20270109_20270115_RANGES: Array<{
  dates: string;
  complete: boolean;
  events: Array<[string, string, string, string, string, string, string, string]>;
}>;
export const MATCH_CENTER_ENGLISH_20270109_20270115_VERIFICATION: MatchCenterScoreboardWindowVerification;
export const MATCH_CENTER_ENGLISH_20270116_20270122_MATCHES: MatchCenterFixture[];
export const MATCH_CENTER_ENGLISH_20270116_20270122_RANGES: Array<{
  dates: string;
  complete: boolean;
  events: Array<[string, string, string, string, string, string, string, string]>;
}>;
export const MATCH_CENTER_ENGLISH_20270116_20270122_VERIFICATION: MatchCenterScoreboardWindowVerification;
export const MATCH_CENTER_ENGLISH_20270123_20270129_MATCHES: MatchCenterFixture[];
export const MATCH_CENTER_ENGLISH_20270123_20270129_RANGES: Array<{
  dates: string;
  complete: boolean;
  events: Array<[string, string, string, string, string, string, string, string]>;
}>;
export const MATCH_CENTER_ENGLISH_20270123_20270129_VERIFICATION: MatchCenterScoreboardWindowVerification;
export const MATCH_CENTER_ENGLISH_20270130_20270205_MATCHES: MatchCenterFixture[];
export const MATCH_CENTER_ENGLISH_20270130_20270205_RANGES: Array<{
  dates: string;
  complete: boolean;
  events: Array<[string, string, string, string, string, string, string, string]>;
}>;
export const MATCH_CENTER_ENGLISH_20270130_20270205_VERIFICATION: MatchCenterScoreboardWindowVerification;
export const MATCH_CENTER_ENGLISH_20270206_20270212_MATCHES: MatchCenterFixture[];
export const MATCH_CENTER_ENGLISH_20270206_20270212_RANGES: Array<{
  dates: string;
  complete: boolean;
  events: Array<[string, string, string, string, string, string, string, string]>;
}>;
export const MATCH_CENTER_ENGLISH_20270206_20270212_VERIFICATION: MatchCenterScoreboardWindowVerification;
export const MATCH_CENTER_ENGLISH_20270213_20270219_RANGES: Array<{
  dates: string;
  complete: boolean;
  events: Array<[string, string, string, string, string, string, string, string]>;
}>;
export const MATCH_CENTER_ENGLISH_20270213_20270219_VERIFICATION: MatchCenterScoreboardWindowVerification;
export const MATCH_CENTER_ENGLISH_20270220_20270226_MATCHES: MatchCenterFixture[];
export const MATCH_CENTER_ENGLISH_20270220_20270226_RANGES: Array<{
  dates: string;
  complete: boolean;
  events: Array<[string, string, string, string, string, string, string, string]>;
}>;
export const MATCH_CENTER_ENGLISH_20270220_20270226_VERIFICATION: MatchCenterScoreboardWindowVerification;
export const MATCH_CENTER_ENGLISH_20270227_20270305_MATCHES: MatchCenterFixture[];
export const MATCH_CENTER_ENGLISH_20270227_20270305_RANGES: Array<{
  dates: string;
  complete: boolean;
  events: Array<[string, string, string, string, string, string, string, string]>;
}>;
export const MATCH_CENTER_ENGLISH_20270227_20270305_VERIFICATION: MatchCenterScoreboardWindowVerification;
export const MATCH_CENTER_ENGLISH_20270306_20270312_RANGES: Array<{
  dates: string;
  complete: boolean;
  events: Array<[string, string, string, string, string, string, string, string]>;
}>;
export const MATCH_CENTER_ENGLISH_20270306_20270312_VERIFICATION: MatchCenterScoreboardWindowVerification;
export const MATCH_CENTER_ENGLISH_20270313_20270319_MATCHES: MatchCenterFixture[];
export const MATCH_CENTER_ENGLISH_20270313_20270319_RANGES: Array<{
  dates: string;
  complete: boolean;
  events: Array<[string, string, string, string, string, string, string, string]>;
}>;
export const MATCH_CENTER_ENGLISH_20270313_20270319_VERIFICATION: MatchCenterScoreboardWindowVerification;
export const MATCH_CENTER_ENGLISH_20270320_20270326_MATCHES: MatchCenterFixture[];
export const MATCH_CENTER_ENGLISH_20270320_20270326_RANGES: Array<{
  dates: string;
  complete: boolean;
  events: Array<[string, string, string, string, string, string, string, string]>;
}>;
export const MATCH_CENTER_ENGLISH_20270320_20270326_VERIFICATION: MatchCenterScoreboardWindowVerification;
export const MATCH_CENTER_ENGLISH_20270327_20270402_RANGES: Array<{
  dates: string;
  complete: boolean;
  events: Array<[string, string, string, string, string, string, string, string]>;
}>;
export const MATCH_CENTER_ENGLISH_20270327_20270402_VERIFICATION: MatchCenterScoreboardWindowVerification;
export const MATCH_CENTER_ENGLISH_20270403_20270409_RANGES: Array<{
  dates: string;
  complete: boolean;
  events: Array<[string, string, string, string, string, string, string, string]>;
}>;
export const MATCH_CENTER_ENGLISH_20270403_20270409_VERIFICATION: MatchCenterScoreboardWindowVerification;
export const MATCH_CENTER_ENGLISH_20270410_20270416_MATCHES: MatchCenterFixture[];
export const MATCH_CENTER_ENGLISH_20270410_20270416_RANGES: Array<{
  dates: string;
  complete: boolean;
  events: Array<[string, string, string, string, string, string, string, string]>;
}>;
export const MATCH_CENTER_ENGLISH_20270410_20270416_VERIFICATION: MatchCenterScoreboardWindowVerification;
export const MATCH_CENTER_ENGLISH_20270417_20270423_MATCHES: MatchCenterFixture[];
export const MATCH_CENTER_ENGLISH_20270417_20270423_RANGES: Array<{
  dates: string;
  complete: boolean;
  events: Array<[string, string, string, string, string, string, string, string]>;
}>;
export const MATCH_CENTER_ENGLISH_20270417_20270423_VERIFICATION: MatchCenterScoreboardWindowVerification;
export const MATCH_CENTER_ENGLISH_20270424_20270430_MATCHES: MatchCenterFixture[];
export const MATCH_CENTER_ENGLISH_20270424_20270430_RANGES: Array<{
  dates: string;
  complete: boolean;
  events: Array<[string, string, string, string, string, string, string, string]>;
}>;
export const MATCH_CENTER_ENGLISH_20270424_20270430_VERIFICATION: MatchCenterScoreboardWindowVerification;
export const MATCH_CENTER_ENGLISH_20270501_20270507_MATCHES: MatchCenterFixture[];
export const MATCH_CENTER_ENGLISH_20270501_20270507_RANGES: Array<{
  dates: string;
  complete: boolean;
  events: Array<[string, string, string, string, string, string, string, string]>;
}>;
export const MATCH_CENTER_ENGLISH_20270501_20270507_VERIFICATION: MatchCenterScoreboardWindowVerification;
export const MATCH_CENTER_ENGLISH_20270508_20270514_MATCHES: MatchCenterFixture[];
export const MATCH_CENTER_ENGLISH_20270508_20270514_RANGES: Array<{
  dates: string;
  complete: boolean;
  events: Array<[string, string, string, string, string, string, string, string]>;
}>;
export const MATCH_CENTER_ENGLISH_20270508_20270514_VERIFICATION: MatchCenterScoreboardWindowVerification;
export const MATCH_CENTER_ENGLISH_20270515_20270521_MATCHES: MatchCenterFixture[];
export const MATCH_CENTER_ENGLISH_20270515_20270521_RANGES: Array<{
  dates: string;
  complete: boolean;
  events: Array<[string, string, string, string, string, string, string, string]>;
}>;
export const MATCH_CENTER_ENGLISH_20270515_20270521_VERIFICATION: MatchCenterScoreboardWindowVerification;
export const MATCH_CENTER_ENGLISH_20270522_20270528_MATCHES: MatchCenterFixture[];
export const MATCH_CENTER_ENGLISH_20270522_20270528_RANGES: Array<{
  dates: string;
  complete: boolean;
  events: Array<[string, string, string, string, string, string, string, string]>;
}>;
export const MATCH_CENTER_ENGLISH_20270522_20270528_VERIFICATION: MatchCenterScoreboardWindowVerification;
export const MATCH_CENTER_ENGLISH_20270529_20270604_MATCHES: MatchCenterFixture[];
export const MATCH_CENTER_ENGLISH_20270529_20270604_RANGES: Array<{
  dates: string;
  complete: boolean;
  events: Array<[string, string, string, string, string, string, string, string]>;
}>;
export const MATCH_CENTER_ENGLISH_20270529_20270604_VERIFICATION: MatchCenterScoreboardWindowVerification;
export const MATCH_CENTER_ENGLISH_20270605_20270611_RANGES: Array<{
  dates: string;
  complete: boolean;
  events: Array<[string, string, string, string, string, string, string, string]>;
}>;
export const MATCH_CENTER_ENGLISH_20270605_20270611_VERIFICATION: MatchCenterScoreboardWindowVerification;
export const MATCH_CENTER_ENGLISH_20261226_20270101_MATCHES: MatchCenterFixture[];
export const MATCH_CENTER_ENGLISH_20261226_20270101_RANGES: Array<{
  dates: string;
  complete: boolean;
  events: Array<[string, string, string, string, string, string, string, string]>;
}>;
export const MATCH_CENTER_ENGLISH_20261226_20270101_VERIFICATION: MatchCenterScoreboardWindowVerification;
export const MATCH_CENTER_ENGLISH_20270102_20270108_MATCHES: MatchCenterFixture[];
export const MATCH_CENTER_ENGLISH_20270102_20270108_RANGES: Array<{
  dates: string;
  complete: boolean;
  events: Array<[string, string, string, string, string, string, string, string]>;
}>;
export const MATCH_CENTER_ENGLISH_20270102_20270108_VERIFICATION: MatchCenterScoreboardWindowVerification;
export const MATCH_CENTER_ENGLISH_20270109_20270115_RANGES: Array<{
  dates: string;
  complete: boolean;
  events: Array<[string, string, string, string, string, string, string, string]>;
}>;
export const MATCH_CENTER_ENGLISH_20270109_20270115_VERIFICATION: MatchCenterScoreboardWindowVerification;
export const MATCH_CENTER_ENGLISH_20261017_CROSS_REFERENCED_EVENTS: Array<{
  id: string;
  date: string;
  name: string;
  venue: string;
  home: { id: string; name: string; sourceEventId: string };
  away: { id: string; name: string; sourceEventId: string };
}>;
export const MATCH_CENTER_ENGLISH_20261017_CROSS_REFERENCE_VERIFICATION: {
  receivedOn: string;
  provider: string;
  leagueId: string;
  method: string;
  sourceWindow: string;
  events: typeof MATCH_CENTER_ENGLISH_20261017_CROSS_REFERENCED_EVENTS;
};
export const MATCH_CENTER_ENGLISH_20261017_CROSS_REFERENCED_MATCHES: MatchCenterFixture[];
export const MATCH_CENTER_SPANISH_COMPETITION: MatchCenterCompetition;
export const MATCH_CENTER_SPANISH_MATCHES: MatchCenterFixture[];
export const MATCH_CENTER_SPANISH_20261017_20261211_MATCHES: MatchCenterFixture[];
export const MATCH_CENTER_SPANISH_20261212_20270205_MATCHES: MatchCenterFixture[];
export const MATCH_CENTER_SPANISH_20270206_20270212_MATCHES: MatchCenterFixture[];
export const MATCH_CENTER_SPANISH_20270213_20270219_MATCHES: MatchCenterFixture[];
export const MATCH_CENTER_SPANISH_20270220_20270226_MATCHES: MatchCenterFixture[];
export const MATCH_CENTER_SPANISH_20270227_20270305_MATCHES: MatchCenterFixture[];
export const MATCH_CENTER_SPANISH_20270306_20270312_MATCHES: MatchCenterFixture[];
export const MATCH_CENTER_SPANISH_20270313_20270319_MATCHES: MatchCenterFixture[];
export const MATCH_CENTER_SPANISH_20270320_20270326_MATCHES: MatchCenterFixture[];
export const MATCH_CENTER_SPANISH_20270403_20270409_MATCHES: MatchCenterFixture[];
export const MATCH_CENTER_SPANISH_20270410_20270416_MATCHES: MatchCenterFixture[];
export const MATCH_CENTER_SPANISH_20270417_20270423_MATCHES: MatchCenterFixture[];
export const MATCH_CENTER_SPANISH_20270501_20270507_MATCHES: MatchCenterFixture[];
export const MATCH_CENTER_SPANISH_20270508_20270514_MATCHES: MatchCenterFixture[];
export const MATCH_CENTER_SPANISH_20270515_20270521_MATCHES: MatchCenterFixture[];
export const MATCH_CENTER_SPANISH_20270522_20270528_MATCHES: MatchCenterFixture[];
export const MATCH_CENTER_SPANISH_20270529_20270604_MATCHES: MatchCenterFixture[];
export const MATCH_CENTER_UCL_COMPETITION: MatchCenterCompetition;
export const MATCH_CENTER_UCL_MATCHES: MatchCenterFixture[];
export const MATCH_CENTER_ALL_MATCHES: MatchCenterFixture[];
export const MATCH_CENTER_COMPETITIONS: MatchCenterCompetition[];
export const MATCH_CENTER_DOCUMENTATION: MatchCenterDocumentation;
export const MATCH_CENTER_VERIFICATION: MatchCenterVerification;
export const MATCH_CENTER_SUMMARY_PROBE: MatchCenterSummaryProbe;

export interface MatchCenterScoreboardWindowVerification {
  receivedOn: string;
  /** تصحيح المستخدم لنطاق الموسم أو وسم سجلٍّ محفوظ خارج الموسم. */
  scopeNote?: string;
  outOfSeason?: boolean;
  provider: ProviderId | string;
  leagueId: string;
  method: string;
  missingRanges?: string[];
  partialRanges?: string[];
  receivedRanges: Array<{ dates: string; scoreboardEndpoint: string; eventCount: number; complete?: boolean }>;
  receivedEvents: Array<{ id: string; date: string; name: string; venue: string; status: string; window?: string }>;
  receivedTeams: Array<{ event: string; side: 'home' | 'away'; id: string; name: string }>;
}
export const MATCH_CENTER_SPANISH_20270327_20270402_VERIFICATION: MatchCenterScoreboardWindowVerification;
export const MATCH_CENTER_SPANISH_20270424_20270430_VERIFICATION: MatchCenterScoreboardWindowVerification;
export const MATCH_CENTER_SPANISH_20270608_20270802_VERIFICATION: MatchCenterScoreboardWindowVerification;
export const MATCH_CENTER_SPANISH_20270803_20270927_VERIFICATION: MatchCenterScoreboardWindowVerification;
export const MATCH_CENTER_SPANISH_20270928_20271122_VERIFICATION: MatchCenterScoreboardWindowVerification;
export const MATCH_CENTER_SPANISH_20271123_20280117_VERIFICATION: MatchCenterScoreboardWindowVerification;
export const MATCH_CENTER_SPANISH_20280118_20280313_VERIFICATION: MatchCenterScoreboardWindowVerification;
export const MATCH_CENTER_SPANISH_20261017_20261211_VERIFICATION: MatchCenterScoreboardWindowVerification;
export const MATCH_CENTER_SPANISH_20261212_20270205_VERIFICATION: MatchCenterScoreboardWindowVerification;
export const MATCH_CENTER_SPANISH_20270206_20270212_VERIFICATION: MatchCenterScoreboardWindowVerification;
export const MATCH_CENTER_SPANISH_20270213_20270219_VERIFICATION: MatchCenterScoreboardWindowVerification;
export const MATCH_CENTER_SPANISH_20270220_20270226_VERIFICATION: MatchCenterScoreboardWindowVerification;
export const MATCH_CENTER_SPANISH_20270227_20270305_VERIFICATION: MatchCenterScoreboardWindowVerification;
export const MATCH_CENTER_SPANISH_20270306_20270312_VERIFICATION: MatchCenterScoreboardWindowVerification;
export const MATCH_CENTER_SPANISH_20270313_20270319_VERIFICATION: MatchCenterScoreboardWindowVerification;
export const MATCH_CENTER_SPANISH_20270320_20270326_VERIFICATION: MatchCenterScoreboardWindowVerification;
export const MATCH_CENTER_SPANISH_20270403_20270409_VERIFICATION: MatchCenterScoreboardWindowVerification;
export const MATCH_CENTER_SPANISH_20270410_20270416_VERIFICATION: MatchCenterScoreboardWindowVerification;
export const MATCH_CENTER_SPANISH_20270417_20270423_VERIFICATION: MatchCenterScoreboardWindowVerification;
export const MATCH_CENTER_SPANISH_20270501_20270507_VERIFICATION: MatchCenterScoreboardWindowVerification;
export const MATCH_CENTER_SPANISH_20270508_20270514_VERIFICATION: MatchCenterScoreboardWindowVerification;
export const MATCH_CENTER_SPANISH_20270515_20270521_VERIFICATION: MatchCenterScoreboardWindowVerification;
export const MATCH_CENTER_SPANISH_20270522_20270528_VERIFICATION: MatchCenterScoreboardWindowVerification;
export const MATCH_CENTER_SPANISH_20270529_20270604_VERIFICATION: MatchCenterScoreboardWindowVerification;

export function summaryKeyVerdict(key: string): SummaryKeyVerdict | null;
export function forbiddenSummaryKeys(): string[];

export function matchCenterPath(match: MatchCenterFixture): string;
export function matchCenterRoutes(): string[];
/** المسارات مطبَّعة بلا شرطة أخيرة — للموجّه و`getAllRoutes()`. */
export function matchCenterRouteIds(): string[];
export function matchByRoute(path: string | null | undefined): MatchCenterFixture | null;
export function matchBySlug(slug: string): MatchCenterFixture | null;
export function matchByExternalId(provider: ProviderId | string, externalId: string | number | null): MatchCenterFixture | null;
export function allMatchesVerified(): boolean;
