/* أنواع وحدة منطق مشغّل الاشتراك — تُطابق src/lib/xtream.mjs
   (الملف التنفيذي JS خالص ليعمل في Node و Vite بلا خطوة بناء) */

export type ModeId = "direct-https" | "direct-http" | "proxy-https" | "proxy-http";

export interface XtreamMode {
  id: ModeId;
  label: string;
  base: (host: string) => string;
}

export interface XtreamAccount {
  host: string;
  username: string;
  password: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Stream {
  id: number;
  name: string;
  icon: string;
  catId: string;
  url?: string;
}

export interface DiagEntry {
  mode: string;
  label: string;
  status: "ok" | "fail" | "skip";
  note: string;
}

export interface FilterOptions {
  query?: string;
  categoryId?: string;
  tab?: "all" | "favorites" | "recent";
  favorites?: string[];
  recents?: string[];
}

export interface RangeResult {
  start: number;
  end: number;
  offsetY: number;
  totalHeight: number;
  count: number;
}

export interface SharePayload {
  v: number;
  t: string;
  h: string;
  u: string;
  s: string;
  m: string;
  n: number;
  e: string;
  a: string;
  d: { m: string; s: "ok" | "no"; n: string }[];
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export declare const STORAGE_KEY: string;
export declare const ACCOUNTS_KEY: string;
export declare const FAVORITES_KEY: string;
export declare const RECENTS_KEY: string;
export declare const MAX_ACCOUNTS: number;
export declare const MAX_RECENTS: number;
export declare const LIST_ITEM_HEIGHT: number;
export declare const LIST_OVERSCAN: number;
export declare const SHARE_TOKEN_PREFIX: string;

export declare function normalizeHost(raw: unknown): string;
export declare function schemeOf(raw: unknown): string;
export declare function streamKey(stream: Stream | null | undefined): string;
export declare function daysUntil(expTsSeconds: number, now?: number): number | null;
export declare function normalizeArabic(value: unknown): string;
export declare function matchesQuery(haystack: unknown, query: unknown): boolean;
export declare function parseM3U(text: string): { categories: Category[]; streams: Stream[] };
export declare function sortCategories(list: Category[]): Category[];
export declare function filterStreams(streams: Stream[], options?: FilterOptions): Stream[];
export declare function windowRange(options?: {
  scrollTop?: number;
  itemHeight?: number;
  viewportHeight?: number;
  total?: number;
  overscan?: number;
}): RangeResult;
export declare function buildModes(options?: {
  proxyBase?: string;
  isHttpsSite?: boolean;
}): XtreamMode[];
export declare function playerApiUrl(base: string, username: string, password: string): string;
export declare function liveStreamUrl(
  base: string,
  username: string,
  password: string,
  streamId: number | string
): string;
export declare function m3uDownloadUrl(options: {
  host: string;
  username: string;
  password: string;
  scheme?: string;
}): string;
export declare function m3uCandidates(
  rawUrl: string,
  options?: { proxyBase?: string; isHttpsSite?: boolean }
): string[];
export declare function composeFailMsg(entries: DiagEntry[]): string;
export declare function maskUsername(username: unknown): string;
export declare function buildDiagReport(options?: {
  diag?: DiagEntry[];
  account?: XtreamAccount | null;
  m3uName?: string;
  phase?: string;
  streamsCount?: number;
  source?: string;
  activeLabel?: string;
  errorMsg?: string;
}): string;
export declare function createShareToken(options?: {
  diag?: DiagEntry[];
  host?: string;
  username?: string;
  streamsCount?: number;
  source?: string;
  activeLabel?: string;
  errorMsg?: string;
  userAgent?: string;
}): string;
export declare function parseShareToken(token: string): SharePayload | null;

export declare function loadJSON<T>(storage: StorageLike | null, key: string, fallback: T): T;
export declare function saveJSON(storage: StorageLike | null, key: string, value: unknown): boolean;
export declare function removeKey(storage: StorageLike | null, key: string): boolean;
export declare function accountKey(account: XtreamAccount | null | undefined): string;
export declare function loadAccounts(storage: StorageLike | null): XtreamAccount[];
export declare function isValidAccount(account: Partial<XtreamAccount> | null | undefined): boolean;
export declare function upsertAccount(
  list: XtreamAccount[] | null | undefined,
  account: Partial<XtreamAccount>
): XtreamAccount[];
export declare function removeAccount(
  list: XtreamAccount[] | null | undefined,
  account: XtreamAccount | string
): XtreamAccount[];
export declare function accountLabel(account: XtreamAccount | null | undefined): string;
export declare function toggleInList(list: string[] | null | undefined, key: string, max?: number): string[];
export declare function pushRecent(list: string[] | null | undefined, key: string, max?: number): string[];
export declare function profileKeyFor(
  account: XtreamAccount | null | undefined,
  m3uName?: string
): string;
export declare function loadProfileList(
  storage: StorageLike | null,
  key: string,
  profile: string
): string[];
export declare function saveProfileList(
  storage: StorageLike | null,
  key: string,
  profile: string,
  list: string[]
): boolean;
