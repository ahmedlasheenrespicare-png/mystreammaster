import { useSyncExternalStore } from "react";
import snapshot from "../content/standings-snapshot.json";
import { standingsRates } from "./fixtures-archive.mjs";
import {
  STANDINGS_LEAGUES,
  leagueStandingsByLeague,
  standingsUrl,
  validateStandings,
  type StandingsEntry,
  type StandingsTable,
} from "./standings.mjs";

/* ==========================================================================
   مخزن الترتيب الحيّ الموحّد — مصدر مشترك لشريط البطولات وشريط الإحصائيات
   وجدول الترتيب القابل للفرز (بلا أي قراءة من أرشيف المباريات fixtures-archive)
   --------------------------------------------------------------------------
   • البداية وقت البناء (SSR) وقبل وصول ردّ الشبكة تكون من جدول الترتيب الموثّق
     نفسه (leagueStandingsByLeague → validateStandings) حتى لا تفرغ الصفحة بلا JS.
   • في المتصفح تُجلب الجداول الحيّة من وسيط المصدر المباشر (/standings.php)
     وتُمرَّر عبر validateStandings نفسها، ثم تُشتق منها مقاييس «الجدول التحليلي
     القابل للفرز» عبر standingsRates(table.entries) مباشرةً.
   • الطلبات المتزامنة لنفس البطولة تُدمج في طلب واحد (in-flight deduplication)،
     ولا تُستبدل قراءة أحدث بقراءة أقدم أبداً، وعند تعذّر الشبكة تبقى آخر قراءة
     مؤكّدة مع وسم القِدم (stale).
========================================================================== */

const ABORT_MS = 12_000;
const CACHE_STALE_HEADER = "X-Standings-Cache";

export interface LeaderComputedRates {
  /** نقاط لكل مباراة — عمود «نقاط/م» (PPM) في الجدول القابل للفرز */
  ppm: number | null;
  /** أهداف مسجلة لكل مباراة — عمود «هجوم/م» (GF/M) في الجدول القابل للفرز */
  attack: number | null;
  /** أهداف مستقبلة لكل مباراة — عمود «دفاع/م» (GA/M) في الجدول القابل للفرز */
  defence: number | null;
  /** صافي الفارق لكل مباراة — عمود «صافي/م» (GD/M) في الجدول القابل للفرز */
  gdPerMatch: number | null;
  /** نسبة الفوز المئوية — عمود «فوز» (Win%) في الجدول القابل للفرز */
  winPct: number | null;
}

export interface LiveLeagueRecord {
  status: "idle" | "loading" | "ready" | "failed";
  source: "snapshot" | "live";
  stale: boolean;
  code?: string;
  table: StandingsTable | null;
  rates: ReturnType<typeof standingsRates> | null;
  leader: StandingsEntry | null;
  leaderRates: LeaderComputedRates | null;
}

const EMPTY_RECORD: LiveLeagueRecord = {
  status: "idle",
  source: "snapshot",
  stale: false,
  table: null,
  rates: null,
  leader: null,
  leaderRates: null,
};

function buildRecord(
  table: StandingsTable,
  source: "snapshot" | "live",
  staleOverride?: boolean,
): LiveLeagueRecord {
  const rates = standingsRates(table.entries);
  const leader = table.entries.find((entry) => entry.rank === 1) ?? null;
  const leaderRateRow = leader
    ? rates.rows.find((row) => row.teamId === leader.teamId || row.rank === 1) ?? null
    : null;

  return {
    status: "ready",
    source,
    stale: staleOverride ?? table.stale === true,
    table,
    rates,
    leader,
    leaderRates: leaderRateRow
      ? {
          ppm: typeof leaderRateRow.ppm === "number" ? leaderRateRow.ppm : null,
          attack: typeof leaderRateRow.attack === "number" ? leaderRateRow.attack : null,
          defence: typeof leaderRateRow.defence === "number" ? leaderRateRow.defence : null,
          gdPerMatch:
            typeof leaderRateRow.gdPerMatch === "number" ? leaderRateRow.gdPerMatch : null,
          winPct: typeof leaderRateRow.winPct === "number" ? leaderRateRow.winPct : null,
        }
      : null,
  };
}

function createInitialMap(): Record<string, LiveLeagueRecord> {
  const initial: Record<string, LiveLeagueRecord> = {};
  for (const cfg of STANDINGS_LEAGUES) {
    try {
      const table = leagueStandingsByLeague(snapshot, cfg.id);
      initial[cfg.id] = buildRecord(table, "snapshot");
    } catch {
      initial[cfg.id] = EMPTY_RECORD;
    }
  }
  return initial;
}

const SERVER_MAP: Record<string, LiveLeagueRecord> = createInitialMap();
let clientMap: Record<string, LiveLeagueRecord> = SERVER_MAP;
const listeners = new Set<() => void>();
const inflight = new Map<string, Promise<LiveLeagueRecord>>();
const fetchedOnce = new Set<string>();

function emit() {
  for (const listener of listeners) listener();
}

function readCode(body: unknown, status: number): string {
  const code = (body as { code?: unknown } | null)?.code;
  if (typeof code === "string" && /^[A-Z0-9_]{3,40}$/.test(code)) return code;
  return `HTTP_${status}`;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getClientSnapshot(): Record<string, LiveLeagueRecord> {
  return clientMap;
}

function getServerSnapshot(): Record<string, LiveLeagueRecord> {
  return SERVER_MAP;
}

/** اشتراك متفاعل في جداول الترتيب الحيّة ومعدلات الجدول القابل للفرز */
export function useLiveStandingsMap(): Record<string, LiveLeagueRecord> {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}

/** قراءة متزامنة لبطولة واحدة (تعمل في الخادم والمتصفح معاً) */
export function getLiveLeagueRecord(league: string | null): LiveLeagueRecord {
  if (!league) return EMPTY_RECORD;
  return clientMap[league] ?? EMPTY_RECORD;
}

/** نشر قراءة متحقّق منها قادمة من صفحة بطولة (LeagueStandings) ليتوحّد المصدر */
export function publishValidatedStandings(
  league: string,
  table: StandingsTable,
  stale = false,
): void {
  const current = clientMap[league];
  if (
    current?.table &&
    (table.season < current.table.season ||
      Date.parse(table.fetchedAt) < Date.parse(current.table.fetchedAt))
  ) {
    return;
  }
  fetchedOnce.add(league);
  clientMap = {
    ...clientMap,
    [league]: buildRecord(table, "live", stale || table.stale),
  };
  emit();
}

/** جلب جدول بطولة واحدة من /standings.php مع دمج الطلبات المتزامنة */
export function fetchLiveLeagueStandings(
  league: string,
  externalSignal?: AbortSignal,
): Promise<LiveLeagueRecord> {
  const active = inflight.get(league);
  if (active) return active;

  const controller = new AbortController();
  const onAbort = () => controller.abort();
  externalSignal?.addEventListener("abort", onAbort, { once: true });
  const timeout =
    typeof window !== "undefined"
      ? window.setTimeout(() => controller.abort(), ABORT_MS)
      : undefined;

  const task = (async (): Promise<LiveLeagueRecord> => {
    try {
      const response = await fetch(standingsUrl(league), {
        signal: controller.signal,
        cache: "no-store",
        credentials: "omit",
        headers: { Accept: "application/json" },
      });
      let body: unknown = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }
      if (!response.ok || (body as { ok?: unknown } | null)?.ok !== true) {
        throw new Error(readCode(body, response.status));
      }
      const table = validateStandings(body, league);
      const isStale =
        table.stale === true || response.headers.get(CACHE_STALE_HEADER) === "STALE";

      fetchedOnce.add(league);
      const current = clientMap[league];
      /* لا تُستبدل قراءة أحدث بقراءة أقدم — نفس حكم صفحات البطولات */
      if (
        current?.table &&
        (table.season < current.table.season ||
          Date.parse(table.fetchedAt) < Date.parse(current.table.fetchedAt))
      ) {
        return current;
      }

      const nextRecord = buildRecord(table, "live", isStale);
      clientMap = { ...clientMap, [league]: nextRecord };
      emit();
      return nextRecord;
    } catch (error) {
      const code = error instanceof Error ? error.message : "UNAVAILABLE";
      fetchedOnce.add(league);
      const current = clientMap[league];
      const fallbackRecord: LiveLeagueRecord =
        current && current.status === "ready"
          ? { ...current, stale: true, code }
          : { ...EMPTY_RECORD, status: "failed", stale: true, code };
      clientMap = { ...clientMap, [league]: fallbackRecord };
      emit();
      return fallbackRecord;
    } finally {
      if (timeout !== undefined) window.clearTimeout(timeout);
      externalSignal?.removeEventListener("abort", onAbort);
      inflight.delete(league);
    }
  })();

  inflight.set(league, task);
  return task;
}

/** يضمن طلب الترتيب الحيّ عند فتح القائمة المنسدلة للبطاقة إن لم يُجلب بعد */
export function ensureLiveLeagueStandings(league: string | null): void {
  if (!league || typeof window === "undefined") return;
  if (fetchedOnce.has(league) || inflight.has(league)) return;
  if (document.hidden || !navigator.onLine) return;
  void fetchLiveLeagueStandings(league);
}

/** تحديث مجموعة بطولات معاً (يُستدعى من شريط الإحصائيات عند الظهور ودورياً) */
export async function refreshLiveLeaguesStandings(
  leagues: string[],
  signal?: AbortSignal,
): Promise<void> {
  if (!leagues.length || typeof window === "undefined") return;
  if (document.hidden || !navigator.onLine) return;
  await Promise.allSettled(leagues.map((league) => fetchLiveLeagueStandings(league, signal)));
}
