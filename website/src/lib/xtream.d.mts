/* أنواع وحدة منطق مشغّل الاشتراك — تُطابق src/lib/xtream.mjs
   (الملف التنفيذي JS خالص ليعمل في Node و Vite بلا خطوة بناء) */

export type ModeId =
  | "direct-https"
  | "direct-http"
  | "proxy-https"
  | "proxy-http"
  | "php-https"
  | "php-http";

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
  /** رقم القناة (R zap / Remote digits) — يُملأ من Xtream أو تسلسل ملف M3U */
  num?: string;
  /** أيام الأرشيف المتاحة (tv_archive) — صفر/غياب = بلا Catch-up */
  archive?: number;
  /** امتداد الملف للأفلام/الحلقات (mp4/mkv…) */
  ext?: string;
  rating?: number;
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
export declare const PHP_PROXY: string;
export declare const PROXY_SESSION_KEY: string;
export declare const OWNED_PROXY_PATTERN: RegExp;
export declare const NGROK_HOST_RE: RegExp;

export declare function isTrustedProxy(value: unknown): boolean;
export declare function isNgrokUrl(url: unknown): boolean;
export declare function resolveWorkerBase(options?: {
  proxyBase?: string;
  search?: string;
  session?: StorageLike | null;
}): string;
export declare function resolveProxyBases(options?: {
  proxyBase?: string;
  phpProxy?: string;
  search?: string;
  session?: StorageLike | null;
}): string[];
export declare function getProxyUrl(base: string, url: string): string;
export declare function isHlsCandidateUrl(url: unknown): boolean;

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
  phpProxy?: string;
  isHttpsSite?: boolean;
}): XtreamMode[];
export declare function playerApiUrl(
  base: string,
  username: string,
  password: string,
  action?: string,
  extra?: Record<string, string | number | null | undefined> | null
): string;
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
  options?: { proxyBase?: string; phpProxy?: string; isHttpsSite?: boolean }
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

/* ---- الأفلام والمسلسلات وEPG والإعادة والقفل الأبوي وأوضاع العرض ---------- */

export declare function vodStreamUrl(
  base: string,
  username: string,
  password: string,
  streamId: number | string,
  ext?: string
): string;
export declare function seriesStreamUrl(
  base: string,
  username: string,
  password: string,
  episodeId: number | string,
  ext?: string
): string;
export declare function timeshiftUrl(
  base: string,
  username: string,
  password: string,
  streamId: number | string,
  startSec: number,
  durationMin?: number
): string;
export declare function shortEpgUrl(
  base: string,
  username: string,
  password: string,
  streamId: number | string,
  limit?: number
): string;

export interface EpgItem {
  title: string;
  desc: string;
  startTs: number;
  endTs: number;
}
export interface EpgInfo {
  items: EpgItem[];
  now: EpgItem | null;
  next: EpgItem | null;
  progress: number | null;
}
export declare function decodeEpgField(value: unknown): string;
export declare function formatClock(secondsTs: number | string): string;
export declare function parseShortEpg(payload: unknown, nowSec?: number): EpgInfo;
export declare function formatEpgLine(epg: EpgInfo | null | undefined): string;

export interface VodInfo {
  id: number;
  name: string;
  ext: string;
  poster: string;
  plot: string;
  rating: number;
  cast: string;
  genre: string;
  duration: string;
  release: string;
  trailer: string;
}
export declare function parseVodInfo(payload: unknown): VodInfo;

export interface SeriesEpisode {
  id: number;
  num: number;
  title: string;
  ext: string;
  duration: string;
  plot: string;
  image: string;
}
export interface SeriesSeason {
  num: number;
  name: string;
  episodes: SeriesEpisode[];
}
export interface SeriesInfo {
  name: string;
  cover: string;
  plot: string;
  rating: number;
  cast: string;
  seasons: SeriesSeason[];
}
export declare function parseSeriesInfo(payload: unknown): SeriesInfo;

export declare function findChannelByNumber(
  channels: Stream[] | null | undefined,
  digits: string | number
): Stream | null;
export declare function stepChannel(
  list: Stream[] | null | undefined,
  currentKey: string,
  dir?: number
): Stream | null;
export declare function srtToVtt(text: unknown): string;

export declare const PIN_KEY: string;
export interface PinState {
  pin: string;
  locked: string[];
}
export declare function isValidPin(pin: unknown): boolean;
export declare function hashPin(pin: string | number, salt?: string): string;
export declare function verifyPin(storedHash: string | null | undefined, pin: unknown): boolean;
export declare function loadPinState(storage: StorageLike | null): PinState | null;
export declare function savePinState(storage: StorageLike | null, state: PinState | null): boolean;
export declare function toggleLockKey(state: PinState | null | undefined, key: string): PinState;

export declare const RESUME_KEY: string;
export interface ResumeEntry {
  t: number;
  ts: number;
}
export type ResumeMap = Record<string, ResumeEntry>;
export declare function loadResumeMap(storage: StorageLike | null, profile: string): ResumeMap;
export declare function getResumeAt(map: ResumeMap | null | undefined, key: string): number;
export declare function saveResumePosition(
  storage: StorageLike | null,
  profile: string,
  key: string,
  seconds: number,
  nowMs?: number
): boolean;

export interface AspectMode {
  id: string;
  label: string;
}
export declare const ASPECT_MODES: AspectMode[];
export declare function aspectStyle(modeId: string | null | undefined): Record<string, string>;
export declare function isTsStreamUrl(url: unknown): boolean;
export declare const MEDIA_EXTENSIONS: string[];
export declare function safeMediaExt(ext: unknown, fallback?: string): string;
