/* أنواع طبقة النقل — المزوّد القابل للتبديل.
   مرآة لـ`match-center-transport.mjs`؛ أي تصدير يُضاف هناك يُضاف هنا،
   ويختبر `scripts/test-match-center.mjs` التطابق في الاتجاهين. */

import type { CacheState, MatchDefinition, MatchSnapshot } from './match-center.mjs';

/** رمز خطأ نقل — منفصل عن رموز بيانات العقد. */
export type TransportCode =
  | 'UNKNOWN_MATCH'
  | 'UNVERIFIED_MATCH'
  | 'UNDECLARED_PROVIDER'
  | 'MISSING_MATCH_BINDING'
  | 'MISMATCHED_MATCH'
  | 'EMPTY_PAYLOAD'
  | 'MALFORMED_JSON'
  | 'MOCK_DISABLED'
  | 'UNSUPPORTED_PROVIDER'
  | 'NETWORK_ERROR'
  | 'ABORTED'
  | `HTTP_${number}`;

export const MATCH_CENTER_ENDPOINT: string;
export const TRANSPORT_DIAGNOSTICS: Partial<Record<TransportCode, string>>;

export class TransportError extends Error {
  code: TransportCode | string;
  detail: string | null;
  constructor(code: TransportCode | string, detail?: string | null);
}

export function describeTransportCode(code: string | null | undefined): string;

/**
 * معرّف مزوّد النقل — لا معرّف مصدر البيانات.
 * `espn`/`apifootball` مصدران يقرؤهما الخادم؛ `server`/`mock` طريقان للقراءة.
 */
export type TransportProviderId = 'server' | 'mock';

export interface TransportProvider {
  id: TransportProviderId | string;
  label: string;
  kind: 'endpoint' | 'mock';
  note: string;
}

export const SERVER_PROVIDER_ID: TransportProviderId;
export const MOCK_PROVIDER_ID: TransportProviderId;
export const PROVIDERS: TransportProvider[];

export function resolveProvider(id?: TransportProviderId | string | null): TransportProvider | null;
export function providerIds(): string[];

export function assertRequestable(match: MatchDefinition | null | undefined): string;
export function matchCenterEndpoint(match: MatchDefinition | null | undefined): string;

/** حمولة الخادم قبل التكييف — كل حقولها اختيارية لأنها تصل من الخارج. */
export interface ServerPayload {
  provider?: string | null;
  match?: string | null;
  slug?: string | null;
  matchId?: string | null;
  event?: string | number | null;
  eventId?: string | number | null;
  fixtureId?: string | number | null;
  readAt?: string | null;
  cache?: CacheState | string | null;
  status?: unknown;
  score?: { home?: unknown; away?: unknown } | null;
  competitors?: unknown[] | null;
  events?: unknown[] | null;
  /** شعارا الفريقين من المصدر — يُقبل `https://` وحده. */
  logos?: { home?: unknown; away?: unknown } | null;
  statistics?: unknown;
  lineups?: unknown;
  ratings?: unknown;
  h2h?: unknown[] | null;
  seasonComparison?: unknown;
  seasonSample?: unknown;
}

export function adaptSnapshot(payload: ServerPayload, match: MatchDefinition): MatchSnapshot;

/* ── المحاكاة ─────────────────────────────────────────────────────── */

export type MockScenarioId =
  | 'scheduled'
  | 'delayed'
  | 'postponed'
  | 'rescheduled'
  | 'canceled'
  | 'firstHalf'
  | 'halftime'
  | 'secondHalf'
  | 'suspended'
  | 'finished'
  | 'abandoned';

export interface MockScenario {
  id: MockScenarioId;
  name: string;
  state: 'pre' | 'in' | 'post';
  /** دقيقة المباراة، أو `null` للحالات التي لا يُلعَب فيها. */
  elapsed: number | null;
  label: string;
}

export interface MockScriptItem {
  id: string;
  minute: number;
  type: string;
  side: 'home' | 'away';
  extraMinute?: number;
}

export const MOCK_PLAYER: { home: string; away: string };
export const MOCK_SCENARIOS: MockScenario[];
export const MOCK_EVENT_SCRIPT: MockScriptItem[];
/** قرارات VAR مستقلة عن الأحداث: المصدر يعدّل الحدث الأصلي ولا يضيف إشعاراً. */
export const MOCK_VAR_DECISIONS: { minute: number; cancels: string }[];

export function resolveScenario(id: MockScenarioId | string | null | undefined): MockScenario | null;
export function mockEvents(
  scenarioId: MockScenarioId | string,
  options?: { cancelGoal?: boolean; /** تتجاوز دقيقة السيناريو الثابتة. */ elapsed?: number | null },
): unknown[];
/** للمحاكاة وحدها — في الإنتاج لا تُشتق الحالة من مرور الوقت (البند 6). */
export function mockPhaseAt(match: MatchDefinition | null | undefined, now: number): MockScenarioId;
export function elapsedMinutesAt(match: MatchDefinition | null | undefined, now: number): number;

/** لقطة محاكاة، وتحمل `scenario` و`provider: 'mock'` للوسم في الواجهة. */
export type MockSnapshot = MatchSnapshot & { scenario: MockScenarioId | string };

export interface MockSnapshotOptions {
  now?: number;
  scenario?: MockScenarioId | string;
  cancelGoal?: boolean;
  /** تُحقن في الاختبارات فقط — المحاكاة الافتراضية تعكس ما أثبته الفحص. */
  overrides?: Partial<ServerPayload>;
}

export function mockSnapshot(match: MatchDefinition, options?: MockSnapshotOptions): MockSnapshot;

/* ── الجلب ────────────────────────────────────────────────────────── */

export interface FetchSnapshotOptions extends MockSnapshotOptions {
  provider?: TransportProviderId | string | null;
  /**
   * حارس صريح: المحاكاة لا تعمل إلا به، وطبقة React تمرّر `import.meta.env.DEV`
   * وحده. الاعتماد على متغيّر البناء وحده يجعل أي إضافة لاحقة قادرة على
   * تشغيلها في الإنتاج.
   */
  allowMock?: boolean;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}

export interface SnapshotResult {
  data: MatchSnapshot;
  cache: CacheState;
}

/** يحصر حالة المخبأ في القيم المعلنة؛ نص غير معروف يصير `MISS`. */
export function normalizeCacheState(value: unknown): CacheState;

export function fetchMatchSnapshot(
  match: MatchDefinition,
  options?: FetchSnapshotOptions,
): Promise<SnapshotResult>;

/** جسر إلى الشكل الذي تقرأه `mergeReads`: الرمز في `code` لا في `reason`. */
export type SettledSnapshot =
  | { status: 'fulfilled'; value: SnapshotResult }
  | { status: 'rejected'; code: TransportCode | string; reason: unknown };

export function settle(promise: Promise<SnapshotResult> | SnapshotResult): Promise<SettledSnapshot>;
