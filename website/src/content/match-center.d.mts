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
export const MATCH_CENTER_MATCHES: MatchCenterFixture[];
export const MATCH_CENTER_DOCUMENTATION: MatchCenterDocumentation;
export const MATCH_CENTER_VERIFICATION: MatchCenterVerification;
export const MATCH_CENTER_SUMMARY_PROBE: MatchCenterSummaryProbe;

export function summaryKeyVerdict(key: string): SummaryKeyVerdict | null;
export function forbiddenSummaryKeys(): string[];

export function matchCenterPath(match: MatchCenterFixture): string;
export function matchCenterRoutes(): string[];
export function matchBySlug(slug: string): MatchCenterFixture | null;
export function matchByExternalId(provider: ProviderId | string, externalId: string | number | null): MatchCenterFixture | null;
export function allMatchesVerified(): boolean;
