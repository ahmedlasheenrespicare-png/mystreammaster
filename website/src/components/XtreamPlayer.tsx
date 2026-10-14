import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PROXY_BASE, WHATSAPP_NUMBER } from "../config";
import {
  ACCOUNTS_KEY,
  ASPECT_MODES,
  FAVORITES_KEY,
  LIST_ITEM_HEIGHT,
  LIST_OVERSCAN,
  PHP_PROXY,
  RECENTS_KEY,
  SMARTERS_USER_AGENT,
  STORAGE_KEY,
  UA_LABEL,
  UA_PRESET_SMARTERS,
  accountKey,
  accountLabel,
  addUaVariants,
  buildDiagReport,
  buildModes,
  composeFailMsg,
  createShareToken,
  daysUntil,
  filterStreams,
  findChannelByNumber,
  getResumeAt,
  loadAccounts,
  loadPinState,
  loadProfileList,
  loadResumeMap,
  liveStreamUrl,
  m3uCandidates,
  m3uDownloadUrl,
  normalizeHost,
  parseM3U,
  parseSeriesInfo,
  parseShortEpg,
  parseVodInfo,
  playerApiUrl,
  profileKeyFor,
  pushRecent,
  removeAccount,
  resolveWorkerBase,
  saveJSON,
  savePinState,
  saveProfileList,
  saveResumePosition,
  schemeOf,
  seriesStreamUrl,
  srtToVtt,
  sortCategories,
  stepChannel,
  streamKey,
  timeshiftUrl,
  toggleInList,
  upsertAccount,
  verifyPin,
  vodStreamUrl,
  windowRange,
} from "../lib/xtream.mjs";
import type {
  Category,
  DiagEntry,
  EpgInfo,
  PinState,
  ResumeMap,
  SeriesEpisode,
  SeriesInfo,
  Stream,
  VodInfo,
  XtreamAccount,
  XtreamMode,
} from "../lib/xtream.mjs";
import { clearLibrary, loadLibrary, saveLibrary } from "../lib/idb";
import type { LibrarySnapshot } from "../lib/idb";
import { IconArrowUp,
  IconArrowUpRight,
  IconApple,
  IconCheck,
  IconChevronDown,
  IconClose,
  IconClock,
  IconMonitor,
  IconPlay,
  IconSearch,
  IconShieldCheck,
  IconStar,
  IconTv,
  IconZap,
} from "./Icons";
import StageCell from "./StageCell";
import type { CellState, PlayCandidate, StageCellHandle, ViewItem } from "./StageCell";
import { ChannelDrawer, EpgBar, MediaPanel, PinDialog, SeriesDialog, VodDialog } from "./XtreamLibrary";
import { Reveal } from "./motion";

/* =========================================================================
   مشغّل اشتراكك الشخصي — Xtream Codes + ملفات M3U
   أداة عرض برمجية على المتصفح (Client-side Web Player): يدخل المشترك ببيانات
   اشتراكه (السيرفر + المستخدم + كلمة السر) فيُحمّل قائمة التشغيل من سيرفر
   مزوّده ويعرضها محلياً في متصفحه — مثل IPTV Smarters لكن بتصميمك.
   الموقع لا يستضيف المحتوى ولا يعيد بثّه، والبيانات تُحفظ في متصفح المشترك
   فقط (localStorage) ولا تُرسل لأي جهة أخرى

   منطق هذا القسم (URLs، EPG، الأفلام، القفل، المتابعة) في src/lib/xtream.mjs
   (دوال خالصة مُختبَرة في scripts/test-xtream.mjs) وهذا الملف للواجهة فقط:
   • ثلاث قوائم: البث المباشر + الأفلام (VOD) + المسلسلات مع متابعة المشاهدة
   • دليل البرامج EPG (get_short_epg) مع شريط تقدّم «يعرض الآن / التالي»
   • مسارات متعددة للبث: مباشر + Cloudflare Worker + /proxy.php + أصلي
     (نفس نظام صفحة البث المباشر LivePlayer) وسقوط تلقائي بينها
   • بصمة مشغل IPTV: بعد كل مسار يمر عبر وسيط نُجرّب نفس المسار بـ User-Agent
     الخاص بـ IPTV Smarters/VLC (?smpua=smarters) — المتصفح لا يستطيع تغيير
     الرأس بنفسه، فيرسله الوسيط للسيرفر ويتابع تحويل 302 ويحافظ على Range
     ومعاملات الجلسة (التوكنات/الكوكيز) بين القائمة الرئيسية والمقاطع
   • مpegts.js لروابط TS الخام وhls.js للم3U8
   • تنقّل ريموت/كيبورد: ↑↓ القنوات، ←→ الصوت أو التقديم، F/M/مسافة، أرقام
   • عدة شاشات (2 أو 4) بانتقال الصوت بنقرة واحدة
   • مسارات صوتية/ترجمة (مع رفع srt) وأوضاع عرض 16:9 و4:3 وFill
   • Chromecast/AirPlay، إعادة البث Catch-up، قفل أبوي برمز، وحفظ القوائم
     في IndexedDB مع زر «تحديث القنوات»
========================================================================== */

/* ========================================================================= */
/*  الأنواع                                                                   */
/* ========================================================================= */

interface UserInfo {
  status: string;
  expDate: string | null;
  expTs: number | null;
  maxConnections: string;
  isTrial: boolean;
  activeConnections: string;
}

type TabId = "all" | "favorites" | "recent";
type LibTab = "live" | "vod" | "series";
type Phase = "form" | "loading" | "ready" | "error";

interface PinDialogState {
  mode: "setup" | "unlock";
  need?: string;
  label?: string;
  pending?: () => void;
}

/* ========================================================================= */
/*  أدوات مساعدة (تعتمد على المتصفح فقط — المنطق الخالص في lib/xtream.mjs)     */
/* ========================================================================= */

function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  return new Promise((resolve, reject) => {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy") ? resolve() : reject(new Error("copy failed"));
    } catch (err) {
      reject(err);
    } finally {
      document.body.removeChild(ta);
    }
  });
}

/* الوصول الآمن للتخزين المحلي (قد يكون معطلاً في وضع التصفح الخاص) */
function getStorage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

function getSessionStorage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

/* fetch مع مهلة زمنية و تصنيف واضح للخطأ — أساس التشخيص */
async function fetchJson(
  url: string,
  timeoutMs: number
): Promise<{ ok: true; data: unknown } | { ok: false; err: string }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "application/json, text/plain, */*" },
    });
    if (!res.ok) return { ok: false, err: `HTTP ${res.status}` };
    const text = await res.text();
    try {
      return { ok: true, data: JSON.parse(text) };
    } catch {
      const hint = text.replace(/\s+/g, " ").slice(0, 40);
      return { ok: false, err: `رد غير صالح: ${hint}` };
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, err: `مهلة ${Math.round(timeoutMs / 1000)} ثانية` };
    }
    /* TypeError فوري = حجب CORS/الشبكة — أهم تمييز في التشخيص */
    return { ok: false, err: "حجب المتصفح (CORS) أو خطأ شبكة" };
  } finally {
    clearTimeout(timer);
  }
}

/* ========================================================================= */
/*  صندوق التشخيص الفني — تقرير + رمز مشاركة للدعم (بلا كلمة سر)              */
/* ========================================================================= */

function DiagBox({
  entries,
  report,
  token,
  tone,
}: {
  entries: DiagEntry[];
  report: string;
  token: string;
  tone: "light" | "dark";
}) {
  const [copied, setCopied] = useState<"" | "report" | "token">("");
  if (entries.length === 0) return null;

  const light = tone === "light";
  const flash = (kind: "report" | "token") => {
    setCopied(kind);
    window.setTimeout(() => setCopied(""), 2500);
  };

  const shareText = `تقرير مشغل الاشتراك (ستريم ماستر برو):\n${token}`;
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(shareText)}`;

  return (
    <details
      data-testid="diag-box"
      className={`rounded-2xl border text-right ${light ? "border-black/10 bg-black/[0.03]" : "border-white/10 bg-white/[0.04]"}`}
    >
      <summary
        data-testid="diag-summary"
        className={`cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden px-4 py-3 flex items-center gap-2 text-[12.5px] font-black ${
          light ? "text-black/60" : "text-white/60"
        }`}
      >
        <IconChevronDown className="w-3.5 h-3.5 shrink-0" />
        تقرير التشخيص الفني ({entries.length} محاولة)
      </summary>
      <div className={`px-4 pb-4 space-y-2 border-t ${light ? "border-black/10" : "border-white/10"} pt-3`}>
        <ul className="space-y-1.5">
          {entries.map((e, i) => (
            <li key={i} className="flex items-start gap-2 text-[12px] font-bold">
              <span
                className={`mt-0.5 w-4 h-4 shrink-0 rounded-full grid place-items-center text-[9px] font-black ${
                  e.status === "ok"
                    ? "bg-[#d8ff3e] text-black"
                    : light
                      ? "bg-black/10 text-black/60"
                      : "bg-white/10 text-white/60"
                }`}
              >
                {e.status === "ok" ? "✓" : "×"}
              </span>
              <span className={light ? "text-black/70" : "text-white/70"}>
                {e.label}{" "}
                <span dir="ltr" className="font-mono text-[10.5px] opacity-60">
                  [{e.mode}]
                </span>{" "}
                — {e.note}
              </span>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              copyText(report)
                .then(() => flash("report"))
                .catch(() => {});
            }}
            className={`text-[12px] font-black px-4 py-2 rounded-full transition cursor-pointer ${
              copied === "report"
                ? "bg-[#3effe0] text-black"
                : light
                  ? "bg-black text-white hover:bg-[#2b4eff]"
                  : "bg-white/10 text-white hover:bg-[#d8ff3e] hover:text-black"
            }`}
          >
            {copied === "report" ? "تم النسخ ✓" : "نسخ التقرير كاملاً"}
          </button>

          <button
            type="button"
            data-testid="copy-share-token"
            onClick={() => {
              copyText(token)
                .then(() => flash("token"))
                .catch(() => {});
            }}
            className={`text-[12px] font-black px-4 py-2 rounded-full border transition cursor-pointer ${
              copied === "token"
                ? "border-[#3effe0] text-[#3effe0]"
                : light
                  ? "border-black/15 text-black/60 hover:border-black"
                  : "border-white/20 text-white/70 hover:border-[#d8ff3e] hover:text-[#d8ff3e]"
            }`}
          >
            {copied === "token" ? "تم نسخ الرمز ✓" : "نسخ رمز التشخيص"}
          </button>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="send-diag-whatsapp"
            className={`text-[12px] font-black px-4 py-2 rounded-full transition ${
              light ? "bg-[#0b0b0f] text-[#d8ff3e]" : "bg-[#d8ff3e] text-black"
            }`}
          >
            إرسال للدعم عبر واتساب
          </a>
        </div>

        <p className={`text-[11px] font-bold leading-relaxed ${light ? "text-black/40" : "text-white/40"}`}>
          التقرير والرمز لا يحتويان كلمة السر، واسم المستخدم يظهر مقنّعاً (أول حرفين فقط).
        </p>
      </div>
    </details>
  );
}

/* ========================================================================= */
/*  المكوّن الرئيسي                                                            */
/* ========================================================================= */

function XtreamPlayerInner() {
  const storage = useMemo(getStorage, []);
  const workerBase = useMemo(
    () =>
      resolveWorkerBase({
        proxyBase: PROXY_BASE,
        search: typeof window === "undefined" ? "" : window.location.search,
        session: getSessionStorage(),
      }),
    []
  );
  const modes = useMemo(
    () =>
      buildModes({
        proxyBase: workerBase,
        phpProxy: PHP_PROXY,
        isHttpsSite:
          typeof window === "undefined" ? true : window.location.protocol === "https:",
      }),
    [workerBase]
  );

  /* حالة الدخول */
  const [phase, setPhase] = useState<Phase>("form");
  const [accounts, setAccounts] = useState<XtreamAccount[]>([]);
  const [account, setAccount] = useState<XtreamAccount | null>(null);
  const [activeMode, setActiveMode] = useState<XtreamMode>(modes[0]);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [diag, setDiag] = useState<DiagEntry[]>([]);

  /* مصدر البيانات: بيانات xtream أم ملف m3u */
  const [source, setSource] = useState<"xtream" | "m3u">("xtream");
  const [m3uName, setM3uName] = useState("");
  const [profile, setProfile] = useState(profileKeyFor(null, ""));

  /* بيانات القنوات (المباشر) */
  const [categories, setCategories] = useState<Category[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [selectedCat, setSelectedCat] = useState<string>("");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<TabId>("all");

  /* تبويب المحتوى: مباشر / أفلام / مسلسلات */
  const [libTab, setLibTab] = useState<LibTab>("live");

  /* الأفلام (VOD) */
  const [vodCats, setVodCats] = useState<Category[]>([]);
  const [vodStreams, setVodStreams] = useState<Stream[]>([]);
  const [vodLoaded, setVodLoaded] = useState(false);
  const [vodLoading, setVodLoading] = useState(false);
  const [vodError, setVodError] = useState("");
  const [vodSearch, setVodSearch] = useState("");
  const [vodCat, setVodCat] = useState("");
  const [vodShown, setVodShown] = useState(60);
  const [vodModal, setVodModal] = useState<{ id: number; name: string; catId: string } | null>(null);
  const [vodDetail, setVodDetail] = useState<VodInfo | null>(null);
  const [vodDetailLoading, setVodDetailLoading] = useState(false);
  const [vodDetailError, setVodDetailError] = useState("");

  /* المسلسلات */
  const [seriesCats, setSeriesCats] = useState<Category[]>([]);
  const [seriesStreams, setSeriesStreams] = useState<Stream[]>([]);
  const [seriesLoaded, setSeriesLoaded] = useState(false);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [seriesError, setSeriesError] = useState("");
  const [seriesSearch, setSeriesSearch] = useState("");
  const [seriesCat, setSeriesCat] = useState("");
  const [seriesShown, setSeriesShown] = useState(60);
  const [seriesModal, setSeriesModal] = useState<{ id: number; name: string; catId: string } | null>(null);
  const [seriesInfo, setSeriesInfo] = useState<SeriesInfo | null>(null);
  const [seriesInfoLoading, setSeriesInfoLoading] = useState(false);
  const [seriesInfoError, setSeriesInfoError] = useState("");

  /* المفضلة وسجل المشاهدة — لكل حساب على حدة */
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recents, setRecents] = useState<string[]>([]);

  /* التشغيل: خلايا (شاشة أو 2 أو 4) — الخلية النشطة تحمل الصوت */
  const [viewCount, setViewCount] = useState<1 | 2 | 4>(1);
  const [viewStreams, setViewStreams] = useState<(ViewItem | null)[]>([null]);
  const [activeCell, setActiveCell] = useState(0);
  const [cellStates, setCellStates] = useState<Record<number, Partial<CellState>>>({});
  const [isMuted, setIsMuted] = useState(true);
  const [aspect, setAspect] = useState("auto");
  const [pipOn, setPipOn] = useState(false);
  const [epg, setEpg] = useState<EpgInfo | null>(null);

  /* OSD ودرج القنوات (داخل الشاشة ليعمل في ملء الشاشة) */
  const [osd, setOsd] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  /* القفل الأبوي ومتابعة المشاهدة */
  const [pinState, setPinState] = useState<PinState | null>(() => loadPinState(getStorage()));
  const [unlocked, setUnlocked] = useState<Set<string>>(() => new Set());
  const [pinDlg, setPinDlg] = useState<PinDialogState | null>(null);
  const [resumeMap, setResumeMap] = useState<ResumeMap>({});

  /* ذاكرة القنوات المحلية (IndexedDB) */
  const [cacheTs, setCacheTs] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshNote, setRefreshNote] = useState("");

  /* Chromecast / AirPlay — كشف إمكانية الجهاز */
  const [canCast, setCanCast] = useState(false);
  const [canAirPlay, setCanAirPlay] = useState(false);

  /* القائمة الافتراضية */
  const [listScrollTop, setListScrollTop] = useState(0);
  const [viewHeight, setViewHeight] = useState(620);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const cellRefs = useRef<(StageCellHandle | null)[]>([]);
  /* ذاكرة الجلسة لمسار البث الناجح (مثل needsProxySession في صفحة البث المباشر) */
  const preferredStreamModeRef = useRef<XtreamMode | null>(null);
  /* ذاكرة الجلسة لبصمة User-Agent الناجحة ("smarters" = بصمة IPTV Smarters/VLC).
     المتصفح لا يستطيع تغيير User-Agent، لذلك تُطلب من الوسيط بمعامل ?smpua=
     ولو نجحت بصمة مع هذا المزوّد تُجرَّب أولاً في كل تشغيل تالٍ */
  const preferredUaRef = useRef<string>("");
  const [activeUa, setActiveUa] = useState("");
  const osdTimerRef = useRef(0);
  const zapRef = useRef({ buf: "", timer: 0 });
  const subUrlRef = useRef("");

  /* مفتاح الحساب الحالي — فارغ لو لا يوجد حساب (مصدر ملف M3U) */
  const keyOf = (acc: XtreamAccount | null | undefined) => (acc ? accountKey(acc) : "");

  /* استرجاع الحسابات المحفوظة (مع هجرة الجلسة القديمة) وفتح أول حساب */
  useEffect(() => {
    const saved = loadAccounts(storage);
    if (saved.length === 0) return;
    setAccounts(saved);
    setAccount(saved[0]);
    setPhase("loading");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* تسجيل الدخول التلقائي عند وجود حساب */
  useEffect(() => {
    if (phase === "loading" && account) {
      login(account);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, account]);

  /* تحميل مفضلة/سجل/متابعة المشاهدة للحساب الحالي عند تبديل الحساب أو المصدر */
  useEffect(() => {
    setFavorites(loadProfileList(storage, FAVORITES_KEY, profile));
    setRecents(loadProfileList(storage, RECENTS_KEY, profile));
    setResumeMap(loadResumeMap(storage, profile));
  }, [profile, storage]);

  /* قياس ارتفاع القائمة لرسم النطاق الظاهر فقط */
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const measure = () => setViewHeight(el.clientHeight || 620);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [phase, libTab]);

  /* تصفير التمرير عند تغيير البحث أو التصنيف أو التبويب */
  useEffect(() => {
    setListScrollTop(0);
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [tab, search, selectedCat, streams]);

  /* كشف إمكانية AirPlay / Chromecast مرة واحدة */
  useEffect(() => {
    if (typeof document === "undefined") return;
    const probe = document.createElement("video") as HTMLVideoElement & {
      webkitShowPlaybackTargetPicker?: () => void;
      remote?: { watchAvailability?: (cb: (ok: boolean) => void) => Promise<number> | void; prompt?: () => Promise<void> };
    };
    if (typeof probe.webkitShowPlaybackTargetPicker === "function") setCanAirPlay(true);
    const remote = probe.remote;
    if (remote && typeof remote.watchAvailability === "function") {
      let alive = true;
      try {
        const res = remote.watchAvailability((ok: boolean) => {
          if (alive) setCanCast(ok);
        });
        if (res && typeof (res as Promise<number>).catch === "function") {
          (res as Promise<number>).catch(() => {});
        }
      } catch {
        /* غير مدعوم */
      }
      return () => {
        alive = false;
      };
    }
    return undefined;
  }, []);

  /* ==== حفظ التغيير في المفضلة / السجل محلياً ==== */
  function setFavoritesAndSave(next: string[]) {
    setFavorites(next);
    saveProfileList(storage, FAVORITES_KEY, profile, next);
  }

  function setRecentsAndSave(next: string[]) {
    setRecents(next);
    saveProfileList(storage, RECENTS_KEY, profile, next);
  }

  function toggleFavorite(stream: Stream) {
    setFavoritesAndSave(toggleInList(favorites, streamKey(stream)));
  }

  /* ============ ترتيب المسارات: الناجح أولاً ثم بقية الوسائط ============ */
  function orderedModes(preferred?: XtreamMode | null): XtreamMode[] {
    const first = preferred ?? preferredStreamModeRef.current ?? activeMode;
    return [first, ...modes.filter((m) => m.id !== first.id)];
  }

  /* استدعاء واجهة Xtream عبر المسارات المتاحة — للأفلام والمسلسلات وEPG */
  async function apiAction(
    action: string,
    extra?: Record<string, string | number>,
    timeoutMs = 30000
  ): Promise<unknown | null> {
    if (!account) return null;
    for (const mode of orderedModes()) {
      const url = playerApiUrl(mode.base(account.host), account.username, account.password, action, extra);
      const res = await fetchJson(url, timeoutMs);
      if (res.ok) return res.data;
    }
    return null;
  }

  /* ============ الدخول: نجرّب المسارات بالترتيب مع تسجيل كل نتيجة ============ */
  async function login(acc: XtreamAccount) {
    setErrorMsg("");
    setDiag([]);

    const host = normalizeHost(acc.host);
    if (!host || !acc.username || !acc.password) {
      setPhase("form");
      setErrorMsg("من فضلك أدخل السيرفر واسم المستخدم وكلمة السر كاملة.");
      return;
    }
    const normAcc = { ...acc, host };
    const log: DiagEntry[] = [];

    const applyUserInfo = (data: { user_info?: Record<string, unknown> }) => {
      const info = data.user_info ?? {};
      const expTs = info.exp_date ? Number(info.exp_date) : null;
      setUserInfo({
        status: String(info.status || ""),
        expDate: expTs
          ? new Date(expTs * 1000).toLocaleDateString("ar-EG", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })
          : null,
        expTs: expTs && Number.isFinite(expTs) ? expTs : null,
        maxConnections: String(info.max_connections || "-"),
        isTrial: String(info.is_trial) === "1",
        activeConnections: String(
          info.active_cons || info.active_connections || "0"
        ),
      });
    };

    const finishLogin = (prof: string) => {
      const nextAccounts = upsertAccount(accounts, normAcc);
      setAccounts(nextAccounts);
      saveJSON(storage, ACCOUNTS_KEY, nextAccounts);
      saveJSON(storage, STORAGE_KEY, normAcc);
      setProfile(prof);
      setSelectedCat("");
      setSearch("");
      setTab("all");
      setLibTab("live");
      setVodSearch("");
      setVodCat("");
      setSeriesSearch("");
      setSeriesCat("");
      setViewCount(1);
      setViewStreams([null]);
      setActiveCell(0);
      setEpg(null);
      setDrawerOpen(false);
      setDiag(log);
      setPhase("ready");
    };

    for (const mode of modes) {
      const base = mode.base(host);
      const authUrl = playerApiUrl(base, normAcc.username, normAcc.password);

      const auth = await fetchJson(authUrl, 12000);
      if (!auth.ok) {
        log.push({ mode: mode.id, label: mode.label, status: "fail", note: auth.err });
        continue;
      }

      const data = auth.data as { user_info?: Record<string, unknown> } | null;
      if (!data || !data.user_info) {
        log.push({
          mode: mode.id,
          label: mode.label,
          status: "fail",
          note: "وصلنا للسيرفر لكن الرد بلا بيانات حساب",
        });
        continue;
      }

      /* السيرفر وصل وردّ — لو auth=0 فالبيانات خاطئة (لا نجرّب باقي المسارات) */
      if (Number(data.user_info.auth) === 0) {
        log.push({
          mode: mode.id,
          label: mode.label,
          status: "fail",
          note: "السيرفر ردّ: بيانات الدخول غير صحيحة",
        });
        setDiag(log);
        setPhase("form");
        setErrorMsg(
          "وصلنا للسيرفر بنجاح لكن بيانات الدخول غير صحيحة — تأكد من اسم المستخدم وكلمة السر تماماً كما أعطاهما المزود."
        );
        return;
      }

      /* ✅ نجح الدخول بهذا المسار — أولاً: هل القوائم محفوظة محلياً (IndexedDB)؟
         فتح فوري في أجزاء من الثانية بدل تنزيل آلاف القنوات في كل زيارة */
      const prof = profileKeyFor(normAcc);
      const cached = await loadLibrary(prof);
      if (cached && Array.isArray(cached.streams) && cached.streams.length > 0 && cached.categories) {
        log.push({
          mode: mode.id,
          label: mode.label,
          status: "ok",
          note: `قوائم محفوظة محلياً (IndexedDB) — فتح فوري: ${cached.streams.length} قناة`,
        });
        setActiveMode(mode);
        setAccount(normAcc);
        applyUserInfo(data);
        setSource("xtream");
        setCategories(cached.categories);
        setStreams(cached.streams);
        applyCachedMedia(cached);
        setCacheTs(Number(cached.ts) || null);
        finishLogin(prof);
        return;
      }

      /* نجلب التصنيفات والقنوات من السيرفر */
      const [catR, strR] = await Promise.all([
        fetchJson(
          playerApiUrl(base, normAcc.username, normAcc.password, "get_live_categories"),
          20000
        ),
        fetchJson(
          playerApiUrl(base, normAcc.username, normAcc.password, "get_live_streams"),
          45000
        ),
      ]);
      if (!catR.ok || !strR.ok) {
        const dataErr = !catR.ok ? catR.err : strR.ok ? "" : strR.err;
        log.push({
          mode: mode.id,
          label: mode.label,
          status: "fail",
          note: `الدخول نجح لكن فشل جلب القنوات (${dataErr})`,
        });
        continue;
      }

      const catList = sortCategories(
        (Array.isArray(catR.data) ? (catR.data as { category_id: string; category_name: string }[]) : []).map(
          (c) => ({ id: String(c.category_id), name: String(c.category_name) })
        )
      );

      const streamList: Stream[] = (
        Array.isArray(strR.data)
          ? (strR.data as {
              stream_id: number;
              num?: string;
              name: string;
              stream_icon: string;
              category_id: string;
              tv_archive?: string | number;
              container_extension?: string;
            }[])
          : []
      ).map((s) => ({
        id: Number(s.stream_id),
        num: String(s.num ?? s.stream_id),
        name: String(s.name),
        icon: String(s.stream_icon || ""),
        catId: String(s.category_id || ""),
        archive: Number(s.tv_archive) > 0 ? Number(s.tv_archive) : 0,
        ext: s.container_extension ? String(s.container_extension) : undefined,
      }));

      log.push({
        mode: mode.id,
        label: mode.label,
        status: "ok",
        note: `نجح الاتصال — ${catList.length} تصنيف و ${streamList.length} قناة`,
      });

      setActiveMode(mode);
      setAccount(normAcc);
      applyUserInfo(data);
      setSource("xtream");
      setCategories(catList);
      setStreams(streamList);
      setVodLoaded(false);
      setVodStreams([]);
      setVodCats([]);
      setSeriesLoaded(false);
      setSeriesStreams([]);
      setSeriesCats([]);
      setCacheTs(Date.now());
      /* حفظ القوائم محلياً ليفتح فوراً في الزيارة القادمة */
      saveLibrary(prof, { ts: Date.now(), categories: catList, streams: streamList }).catch(() => {});
      finishLogin(prof);
      return;
    }

    /* فشلت كل المسارات — نعرض سبباً ذكياً + التقرير الكامل */
    setDiag(log);
    setPhase("form");
    setErrorMsg(composeFailMsg(log));
    /* سجل في الكونسول أيضاً لمن يعرف DevTools */
    try {
      console.warn("[مشغل الاشتراك]\n" + log.map((e) => `[${e.mode}] ${e.note}`).join("\n"));
    } catch {
      /* تجاهل */
    }
  }

  /* استعادة الأفلام/المسلسلات المحفوظة مع نفس النسخة */
  function applyCachedMedia(cached: LibrarySnapshot) {
    if (cached.vodStreams && cached.vodStreams.length > 0) {
      setVodCats(cached.vodCategories ?? []);
      setVodStreams(cached.vodStreams);
      setVodLoaded(true);
    } else {
      setVodCats([]);
      setVodStreams([]);
      setVodLoaded(false);
    }
    if (cached.seriesStreams && cached.seriesStreams.length > 0) {
      setSeriesCats(cached.seriesCategories ?? []);
      setSeriesStreams(cached.seriesStreams);
      setSeriesLoaded(true);
    } else {
      setSeriesCats([]);
      setSeriesStreams([]);
      setSeriesLoaded(false);
    }
    setVodError("");
    setSeriesError("");
  }

  /* دمج تغييرات جديدة في نسخة IndexedDB المحفوظة */
  async function patchLibrary(patch: Partial<LibrarySnapshot>) {
    if (source !== "xtream" || !profile) return;
    try {
      const prev = await loadLibrary(profile);
      await saveLibrary(profile, { ...(prev ?? { ts: Date.now() }), ...patch, ts: Date.now() });
      setCacheTs(Date.now());
    } catch {
      /* تجاهل */
    }
  }

  /* زر «تحديث القنوات»: إعادة جلب القوائم وتحديث النسخة المحفوظة */
  async function refreshLibrary() {
    if (!account || refreshing) return;
    setRefreshing(true);
    setRefreshNote("");
    try {
      for (const mode of orderedModes()) {
        const base = mode.base(account.host);
        const [catR, strR] = await Promise.all([
          fetchJson(playerApiUrl(base, account.username, account.password, "get_live_categories"), 20000),
          fetchJson(playerApiUrl(base, account.username, account.password, "get_live_streams"), 45000),
        ]);
        if (!catR.ok || !strR.ok) continue;
        const catList = sortCategories(
          (Array.isArray(catR.data) ? (catR.data as { category_id: string; category_name: string }[]) : []).map(
            (c) => ({ id: String(c.category_id), name: String(c.category_name) })
          )
        );
        const streamList: Stream[] = (
          Array.isArray(strR.data)
            ? (strR.data as {
                stream_id: number;
                num?: string;
                name: string;
                stream_icon: string;
                category_id: string;
                tv_archive?: string | number;
                container_extension?: string;
              }[])
            : []
        ).map((s) => ({
          id: Number(s.stream_id),
          num: String(s.num ?? s.stream_id),
          name: String(s.name),
          icon: String(s.stream_icon || ""),
          catId: String(s.category_id || ""),
          archive: Number(s.tv_archive) > 0 ? Number(s.tv_archive) : 0,
          ext: s.container_extension ? String(s.container_extension) : undefined,
        }));
        setActiveMode(mode);
        setCategories(catList);
        setStreams(streamList);
        setCacheTs(Date.now());
        await patchLibrary({ categories: catList, streams: streamList });
        setRefreshNote(`تم التحديث — ${streamList.length.toLocaleString("en-US")} قناة`);
        setDiag((prev) => [
          ...prev,
          { mode: mode.id, label: mode.label, status: "ok", note: `تحديث القوائم يدوياً — ${streamList.length} قناة` },
        ]);
        return;
      }
      setRefreshNote("تعذر التحديث — تحقق من الاتصال وأعد المحاولة.");
    } finally {
      setRefreshing(false);
    }
  }

  function handleSubmit() {
    if (phase === "loading") return;
    setPhase("loading");
  }

  /* Enter داخل حقول الدخول = إرسال (بدل إرسال النموذج الأصلي) */
  function handleFormKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "Enter") return;
    const target = e.target as HTMLElement;
    if (target.tagName !== "INPUT") return;
    const type = (target as HTMLInputElement).type;
    if (type !== "text" && type !== "password") return;
    e.preventDefault();
    handleSubmit();
  }

  /* ============ إدارة الحسابات المحفوظة ============ */

  /* تبديل الحساب الحالي (كل حساب له مفضلته وسجله) */
  function switchAccount(acc: XtreamAccount) {
    if (accountKey(acc) === keyOf(account)) {
      setPhase("ready");
      return;
    }
    teardownPlayer();
    setAccount(acc);
    setErrorMsg("");
    setPhase("loading");
  }

  function forgetAccount(acc: XtreamAccount) {
    const next = removeAccount(accounts, acc);
    setAccounts(next);
    saveJSON(storage, ACCOUNTS_KEY, next);
    if (accountKey(acc) !== keyOf(account)) return;
    if (next.length > 0) {
      switchAccount(next[0]);
    } else {
      handleLogout();
    }
  }

  function addAccount() {
    teardownPlayer();
    setAccount(null);
    setErrorMsg("");
    setPhase("form");
  }

  function teardownPlayer() {
    setViewStreams([null]);
    setActiveCell(0);
    setViewCount(1);
    setCellStates({});
    setEpg(null);
    setDrawerOpen(false);
    setAspect("auto");
    setPipOn(false);
    preferredStreamModeRef.current = null;
    preferredUaRef.current = "";
    setActiveUa("");
  }

  /* ============ مسار ملف M3U: تنزيل من السيرفر ثم رفع ============ */

  /* يفتح رابط get.php في تبويب جديد — تنزيل مباشر لا يمنعه CORS */
  function downloadPlaylist() {
    if (!account) return;
    const host = normalizeHost(account.host);
    if (!host || !account.username || !account.password) return;
    const url = m3uDownloadUrl({
      host,
      username: account.username,
      password: account.password,
      scheme: schemeOf(account.host),
    });
    window.open(url, "_blank", "noopener");
  }

  function applyPlaylist(fileName: string, text: string) {
    const parsed = parseM3U(text);
    if (parsed.streams.length === 0) {
      setErrorMsg("لم نجد قنوات صالحة داخل هذا الملف — تأكد أنه ملف قنوات M3U (أول سطر فيه #EXTM3U).");
      return;
    }
    setErrorMsg("");
    setSource("m3u");
    setM3uName(fileName);
    setUserInfo(null);
    setCategories(parsed.categories);
    setStreams(parsed.streams);
    setSelectedCat("");
    setSearch("");
    setTab("all");
    setLibTab("live");
    setCacheTs(null);
    teardownPlayer();
    setProfile(profileKeyFor(null, fileName));
    setDiag([
      {
        mode: "m3u",
        label: "ملف قنوات",
        status: "ok",
        note: `تم تحميل الملف «${fileName}» — ${parsed.categories.length} تصنيف و ${parsed.streams.length} قناة`,
      },
    ]);
    setPhase("ready");
  }

  function handleM3UFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => applyPlaylist(file.name, String(reader.result || ""));
    reader.onerror = () => {
      setErrorMsg("تعذر قراءة الملف — جرّب مرة أخرى.");
    };
    reader.readAsText(file);
  }

  /* إفلات الملف على الصفحة بدل التنقل بين النوافذ */
  function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => applyPlaylist(file.name, String(reader.result || ""));
    reader.readAsText(file);
  }

  function handleLogout() {
    if (account) {
      const next = removeAccount(accounts, account);
      setAccounts(next);
      saveJSON(storage, ACCOUNTS_KEY, next);
      if (profile) clearLibrary(profile).catch(() => {});
    }
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* تجاهل */
    }
    teardownPlayer();
    setAccount(null);
    setUserInfo(null);
    setCategories([]);
    setStreams([]);
    setVodCats([]);
    setVodStreams([]);
    setVodLoaded(false);
    setSeriesCats([]);
    setSeriesStreams([]);
    setSeriesLoaded(false);
    setCacheTs(null);
    setFavorites([]);
    setRecents([]);
    setSelectedCat("");
    setSearch("");
    setTab("all");
    setLibTab("live");
    setDiag([]);
    setM3uName("");
    setSource("xtream");
    setProfile(profileKeyFor(null, ""));
    setPhase("form");
  }

  /* ========================================================================= */
  /*  بناء مرشّحين — نفس منطق الخلايا: مباشر → Worker → /proxy.php → أصلي        */
  /*  وبعد كل مرشّح يمر عبر وسيط نسخة تحمل بصمة Smarters/VLC (?smpua=smarters)   */
  /*  لأن المتصفح لا يستطيع تغيير User-Agent بنفسه — الوسيط يرسلها للسيرفر       */
  /* ========================================================================= */

  /** يمرّر القائمة عبر addUaVariants مع إعدادات الوسيط الحالية */
  function withUaLadder<T extends PlayCandidate>(list: T[]): T[] {
    return addUaVariants(list, {
      preset: UA_PRESET_SMARTERS,
      preferred: preferredUaRef.current,
      proxyBase: workerBase,
      phpProxy: PHP_PROXY,
    });
  }

  function buildLiveCandidates(stream: Stream): PlayCandidate[] {
    if (stream.url) {
      /* مصدر ملف M3U: المباشر + Worker + /proxy.php */
      const urls = m3uCandidates(stream.url, {
        proxyBase: workerBase,
        phpProxy: PHP_PROXY,
        isHttpsSite: typeof window === "undefined" ? true : window.location.protocol === "https:",
      });
      return withUaLadder([
        ...urls.map((u) => ({
          url: u,
          native: false,
          label: u.includes(PHP_PROXY)
            ? "بروكسي البث المباشر"
            : u.startsWith(workerBase)
              ? "وسيط Worker"
              : "اتصال مباشر",
          isLive: true,
        })),
        { url: urls[0] ?? stream.url, native: true, label: "تشغيل أصلي مباشر", isLive: true },
      ]);
    }
    if (!account) return [];
    const ordered = orderedModes();
    const direct = ordered.find((m) => m.id === "direct-https") ?? ordered[0];
    return withUaLadder([
      ...ordered.map((m) => ({
        url: liveStreamUrl(m.base(account.host), account.username, account.password, stream.id),
        native: false,
        mode: m,
        label: m.label,
        isLive: true,
      })),
      {
        url: liveStreamUrl(direct.base(account.host), account.username, account.password, stream.id),
        native: true,
        mode: direct,
        label: `${direct.label} (أصلي)`,
        isLive: true,
      },
    ]);
  }

  function buildMediaCandidates(
    buildUrl: (mode: XtreamMode) => string,
    isLive: boolean
  ): PlayCandidate[] {
    if (!account) return [];
    const ordered = orderedModes();
    return withUaLadder([
      ...ordered.map((m) => ({
        url: buildUrl(m),
        native: false,
        mode: m,
        label: m.label,
        isLive,
      })),
      { url: buildUrl(ordered[0]), native: true, mode: ordered[0], label: `${ordered[0].label} (أصلي)`, isLive },
    ]);
  }

  function makeLiveItem(stream: Stream): ViewItem {
    const xtreamLive = source === "xtream" && !!account && !stream.url;
    return {
      stream,
      candidates: buildLiveCandidates(stream),
      epgStreamId: xtreamLive ? stream.id : undefined,
      catchupStreamId: xtreamLive && (stream.archive ?? 0) > 0 ? stream.id : undefined,
      live: true,
    };
  }

  function setViewItem(index: number, item: ViewItem | null) {
    setViewStreams((prev) => {
      const next = [...prev];
      while (next.length <= index) next.push(null);
      next[index] = item;
      return next;
    });
  }

  /* ============ القفل الأبوي: يحمي التصنيفات المقفلة برمز ============ */
  function guardLocked(need: string | undefined, label: string, run: () => void) {
    if (!need || !pinState?.locked.includes(need) || unlocked.has(need)) {
      run();
      return;
    }
    setPinDlg({ mode: "unlock", need, label, pending: run });
  }

  function playStream(stream: Stream) {
    guardLocked(`l:${stream.catId}`, stream.name, () => {
      setViewItem(activeCell, makeLiveItem(stream));
      setRecentsAndSave(pushRecent(recents, streamKey(stream)));
    });
  }

  /* ============ EPG: دليل البرامج المختصر مع شريط تقدّم ============ */
  useEffect(() => {
    const item = viewStreams[activeCell];
    if (!item?.epgStreamId || source !== "xtream" || !account) {
      setEpg(null);
      return undefined;
    }
    let cancelled = false;
    const streamId = item.epgStreamId;
    const load = async () => {
      const data = await apiAction("get_short_epg", { stream_id: streamId, limit: 4 }, 12000);
      if (cancelled) return;
      setEpg(data ? parseShortEpg(data) : null);
    };
    load();
    const iv = window.setInterval(load, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(iv);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewStreams, activeCell, source, account]);

  /* ============ تحميل الأفلام والمسلسلات عند فتح التبويب ============ */
  useEffect(() => {
    if (phase !== "ready" || libTab !== "vod" || source !== "xtream") return;
    if (vodLoaded) return;
    let cancelled = false;
    setVodLoading(true);
    setVodError("");
    (async () => {
      const [catData, strData] = await Promise.all([
        apiAction("get_vod_categories", undefined, 20000),
        apiAction("get_vod_streams", undefined, 45000),
      ]);
      if (cancelled) return;
      setVodLoading(false);
      if (!Array.isArray(catData) || !Array.isArray(strData)) {
        setVodLoaded(true);
        setVodError("تعذر تحميل قائمة الأفلام — تحقق من الاتصال ثم أعد فتح التبويب.");
        return;
      }
      const cats = sortCategories(
        catData.map((c) => ({ id: String(c.category_id), name: String(c.category_name) }))
      );
      const list: Stream[] = strData.map((s) => ({
        id: Number(s.stream_id),
        num: String(s.num ?? s.stream_id),
        name: String(s.name),
        icon: String(s.stream_icon || s.cover || s.movie_image || ""),
        catId: String(s.category_id || ""),
        rating: Number(s.rating) || 0,
        ext: String(s.container_extension || "mp4"),
      }));
      setVodCats(cats);
      setVodStreams(list);
      setVodLoaded(true);
      patchLibrary({ vodCategories: cats, vodStreams: list });
    })();
    return () => {
      cancelled = true;
      setVodLoading(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, libTab, source, vodLoaded, account]);

  useEffect(() => {
    if (phase !== "ready" || libTab !== "series" || source !== "xtream") return;
    if (seriesLoaded) return;
    let cancelled = false;
    setSeriesLoading(true);
    setSeriesError("");
    (async () => {
      const [catData, strData] = await Promise.all([
        apiAction("get_series_categories", undefined, 20000),
        apiAction("get_series", undefined, 45000),
      ]);
      if (cancelled) return;
      setSeriesLoading(false);
      if (!Array.isArray(catData) || !Array.isArray(strData)) {
        setSeriesLoaded(true);
        setSeriesError("تعذر تحميل قائمة المسلسلات — تحقق من الاتصال ثم أعد فتح التبويب.");
        return;
      }
      const cats = sortCategories(
        catData.map((c) => ({ id: String(c.category_id), name: String(c.category_name) }))
      );
      const list: Stream[] = strData.map((s) => ({
        id: Number(s.series_id),
        num: String(s.num ?? s.series_id),
        name: String(s.name),
        icon: String(s.cover || s.stream_icon || ""),
        catId: String(s.category_id || ""),
        rating: Number(s.rating) || 0,
      }));
      setSeriesCats(cats);
      setSeriesStreams(list);
      setSeriesLoaded(true);
      patchLibrary({ seriesCategories: cats, seriesStreams: list });
    })();
    return () => {
      cancelled = true;
      setSeriesLoading(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, libTab, source, seriesLoaded, account]);

  /* ============ فتح تفاصيل فيلم/مسلسل (مع حماية PIN) ============ */
  function openVod(item: Stream) {
    guardLocked(`v:${item.catId}`, item.name, () => {
      setVodModal({ id: item.id, name: item.name, catId: item.catId });
      setVodDetail(null);
      setVodDetailError("");
      setVodDetailLoading(true);
      apiAction("get_vod_info", { vod_id: item.id }, 20000).then((data) => {
        setVodDetailLoading(false);
        if (vodModal && vodModal.id !== item.id) return;
        if (data && typeof data === "object" && ((data as { movie_data?: unknown }).movie_data || (data as { info?: unknown }).info)) {
          const parsed = parseVodInfo(data);
          setVodDetail(parsed.id ? parsed : { ...parsed, id: item.id, name: parsed.name || item.name });
        } else {
          setVodDetailError("تعذر تحميل تفاصيل الفيلم من السيرفر — جرّب مرة أخرى.");
        }
      });
    });
  }

  function openSeries(item: Stream) {
    guardLocked(`s:${item.catId}`, item.name, () => {
      setSeriesModal({ id: item.id, name: item.name, catId: item.catId });
      setSeriesInfo(null);
      setSeriesInfoError("");
      setSeriesInfoLoading(true);
      apiAction("get_series_info", { series_id: item.id }, 20000).then((data) => {
        setSeriesInfoLoading(false);
        if (data && typeof data === "object" && ((data as { episodes?: unknown }).episodes || (data as { info?: unknown }).info)) {
          setSeriesInfo(parseSeriesInfo(data));
        } else {
          setSeriesInfoError("تعذر تحميل مواسم ومسلسل — جرّب مرة أخرى.");
        }
      });
    });
  }

  function playVodNow(id: number, name: string, ext: string, icon: string) {
    if (!account) return;
    const resumeKey = `v:${id}`;
    setViewItem(activeCell, {
      stream: { id, name, icon, catId: "" },
      candidates: buildMediaCandidates(
        (m) => vodStreamUrl(m.base(account.host), account.username, account.password, id, ext),
        false
      ),
      resumeKey,
      live: false,
    });
    setVodModal(null);
    showOsd(`▶ ${name}`);
  }

  function playEpisodeNow(ep: SeriesEpisode, _seasonNum: number, label: string) {
    if (!account) return;
    const resumeKey = `e:${ep.id}`;
    const cover = seriesInfo?.cover || "";
    setViewItem(activeCell, {
      stream: { id: ep.id, name: label, icon: cover, catId: "" },
      candidates: buildMediaCandidates(
        (m) => seriesStreamUrl(m.base(account.host), account.username, account.password, ep.id, ep.ext),
        false
      ),
      resumeKey,
      live: false,
    });
    setSeriesModal(null);
    showOsd(`▶ ${label}`);
  }

  /* ============ إعادة البث Catch-up / Timeshift ============ */
  function playTimeshift(hours: number) {
    const item = viewStreams[activeCell];
    if (!item?.catchupStreamId || !account) return;
    const streamId = item.catchupStreamId;
    const start = Math.floor(Date.now() / 1000) - hours * 3600;
    guardLocked(`l:${item.stream.catId}`, item.stream.name, () => {
      setViewItem(activeCell, {
        ...item,
        stream: { ...item.stream, name: `${item.stream.name} — إعادة ${hours}س` },
        candidates: buildMediaCandidates(
          (m) => timeshiftUrl(m.base(account.host), account.username, account.password, streamId, start, hours * 60),
          true
        ),
        catchupStreamId: undefined,
        epgStreamId: undefined,
        resumeKey: undefined,
        live: true,
      });
      showOsd(`⏱ إعادة البث — آخر ${hours} ساعات`);
    });
  }

  /* ============ OSD (رسائل داخل الشاشة) ============ */
  function showOsd(msg: string, ms = 2400) {
    setOsd(msg);
    window.clearTimeout(osdTimerRef.current);
    osdTimerRef.current = window.setTimeout(() => setOsd(""), ms);
  }

  /* ============ التنقّل بين القنوات (أزرار داخل الفيديو + ريموت) ============ */
  const visibleLiveStreams = useMemo(
    () =>
      filterStreams(streams, {
        query: search,
        categoryId: selectedCat,
        tab,
        favorites,
        recents,
      }),
    [streams, search, selectedCat, tab, favorites, recents]
  );

  function stepLiveChannel(dir: number) {
    if (visibleLiveStreams.length === 0) return;
    const currentKey = viewStreams[activeCell]?.stream ? streamKey(viewStreams[activeCell]!.stream) : "";
    const next = stepChannel(visibleLiveStreams, currentKey, dir);
    if (next) {
      playStream(next);
      showOsd(`${next.num ? `${next.num} — ` : ""}${next.name}`);
    }
  }

  /* أرقام القناة من الرموت: اكتب أرقاماً فتنقل للقناة رقمها */
  function zapDigit(digit: string) {
    const z = zapRef.current;
    z.buf = (z.buf + digit).slice(-4);
    showOsd(`قناة: ${z.buf}`, 1500);
    window.clearTimeout(z.timer);
    z.timer = window.setTimeout(() => {
      const found = findChannelByNumber(streams, z.buf);
      z.buf = "";
      if (found) {
        playStream(found);
        showOsd(`${found.num ? `${found.num} — ` : ""}${found.name}`);
      } else {
        showOsd("لا توجد قناة بهذا الرقم");
      }
    }, 1300);
  }

  function nudgeActive(dir: number) {
    const api = cellRefs.current[activeCell];
    const item = viewStreams[activeCell];
    if (!api) return;
    if (item && !item.live) {
      api.seekBy(dir * 10);
      showOsd(dir > 0 ? "⏩ +10 ثوانٍ" : "⏪ -10 ثوانٍ", 1200);
      return;
    }
    api.adjustVolume(dir * 0.05);
    const v = api.getVideo();
    const pct = Math.round((v?.volume ?? 0) * 100);
    showOsd(`🔊 ${pct}%`, 1200);
  }

  /* ============ لوحة المفاتيح / ريموت التلفزيون ============ */
  const keyHandlerRef = useRef<(e: KeyboardEvent) => void>(() => {});
  useEffect(() => {
    keyHandlerRef.current = (e: KeyboardEvent) => {
      if (phase !== "ready") return;
      if (vodModal || seriesModal || pinDlg) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        tag === "BUTTON" ||
        tag === "A" ||
        target.isContentEditable
      ) {
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === "Escape") {
        if (drawerOpen) setDrawerOpen(false);
        return;
      }
      if (source === "xtream" && /^[0-9]$/.test(e.key)) {
        e.preventDefault();
        zapDigit(e.key);
        return;
      }
      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          stepLiveChannel(1);
          break;
        case "ArrowDown":
          e.preventDefault();
          stepLiveChannel(-1);
          break;
        case "ArrowLeft":
          e.preventDefault();
          nudgeActive(-1);
          break;
        case "ArrowRight":
          e.preventDefault();
          nudgeActive(1);
          break;
        case "PageUp":
          e.preventDefault();
          stepLiveChannel(1);
          break;
        case "PageDown":
          e.preventDefault();
          stepLiveChannel(-1);
          break;
        case " ":
          e.preventDefault();
          cellRefs.current[activeCell]?.togglePlay();
          showOsd("⏯ تشغيل / إيقاف", 1000);
          break;
        case "f":
        case "F":
        case "ف":
          toggleFullscreen();
          break;
        case "m":
        case "M":
        case "م":
          setIsMuted((prev) => {
            showOsd(!prev ? "🔇 تم كتم الصوت" : "🔊 تم تشغيل الصوت", 1000);
            return !prev;
          });
          break;
        default:
          break;
      }
    };
  });

  useEffect(() => {
    if (phase !== "ready") return undefined;
    const fn = (e: KeyboardEvent) => keyHandlerRef.current(e);
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [phase]);

  /* ============ أدوات المشغل: جودة، صورة داخل صورة، ملء الشاشة ============ */
  const activeState = cellStates[activeCell] ?? {};
  const levels = activeState.levels ?? [];
  const levelIndex = activeState.levelIndex ?? -1;
  const tracks = activeState.tracks ?? { audio: [], subs: [], audioIndex: -1, subIndex: -1 };
  const playing = viewStreams[activeCell]?.stream ?? null;
  const activeItem = viewStreams[activeCell];
  const canPip = typeof document !== "undefined" && document.pictureInPictureEnabled === true;

  function changeLevel(value: number) {
    cellRefs.current[activeCell]?.setLevel(value);
  }

  async function toggleFullscreen() {
    const el = stageRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await el.requestFullscreen();
    } catch {
      /* تجاهل */
    }
  }

  async function togglePip() {
    const video = cellRefs.current[activeCell]?.getVideo();
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setPipOn(false);
      } else {
        await video.requestPictureInPicture();
        setPipOn(true);
      }
    } catch {
      /* تجاهل */
    }
  }

  /* ============ Chromecast / AirPlay ============ */
  function handleCast() {
    const video = cellRefs.current[activeCell]?.getVideo() as
      | (HTMLVideoElement & { remote?: { prompt?: () => Promise<void> } })
      | null;
    const remote = video?.remote;
    if (video && remote && typeof remote.prompt === "function") {
      remote
        .prompt()
        .then(() => showOsd("📺 جاري البث إلى الشاشة الخارجية"))
        .catch(() => showOsd("لا توجد أجهزة متاحة على الشبكة"));
    } else {
      showOsd("البث إلى شاشة غير مدعوم في هذا المتصفح");
    }
  }

  function handleAirPlay() {
    const video = cellRefs.current[activeCell]?.getVideo() as
      | (HTMLVideoElement & { webkitShowPlaybackTargetPicker?: () => void })
      | null;
    if (video && typeof video.webkitShowPlaybackTargetPicker === "function") {
      video.webkitShowPlaybackTargetPicker();
    }
  }

  /* ============ رفع ترجمة SRT للفيلم ============ */
  function handleSubtitleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!viewStreams[activeCell]) {
      showOsd("شغّل فيلماً أو حلقة أولاً لرفع الترجمة");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const raw = String(reader.result || "");
      const vtt = file.name.toLowerCase().endsWith(".vtt") ? raw : srtToVtt(raw);
      if (subUrlRef.current) URL.revokeObjectURL(subUrlRef.current);
      const url = URL.createObjectURL(new Blob([vtt], { type: "text/vtt" }));
      subUrlRef.current = url;
      const idx = activeCell;
      setViewStreams((prev) => prev.map((it, i) => (i === idx && it ? { ...it, uploadedSub: url } : it)));
      window.requestAnimationFrame(() => cellRefs.current[idx]?.enableUploadedSubtitle());
      showOsd("✓ تم رفع ملف الترجمة");
    };
    reader.onerror = () => showOsd("تعذر قراءة ملف الترجمة");
    reader.readAsText(file);
  }

  /* ============ متابعة المشاهدة (حفظ الموضع محلياً) ============ */
  function handleSaveResume(key: string, seconds: number) {
    saveResumePosition(storage, profile, key, seconds);
    setResumeMap((prev) => ({ ...prev, [key]: { t: Math.floor(seconds), ts: Date.now() } }));
  }

  /* ============ تبديل عدد الشاشات (1 / 2 / 4) ============ */
  function changeViewCount(count: 1 | 2 | 4) {
    setViewCount(count);
    setViewStreams((prev) => Array.from({ length: count }, (_, i) => prev[i] ?? null));
    setActiveCell((c) => (c < count ? c : 0));
    setDrawerOpen(false);
    showOsd(count === 1 ? "شاشة واحدة" : `عدة الشاشات: ${count}`);
  }

  /* ============ التصفية والعرض ============ */

  const visibleVod = useMemo(
    () => filterStreams(vodStreams, { query: vodSearch, categoryId: vodCat, tab: "all" }),
    [vodStreams, vodSearch, vodCat]
  );
  const visibleSeries = useMemo(
    () => filterStreams(seriesStreams, { query: seriesSearch, categoryId: seriesCat, tab: "all" }),
    [seriesStreams, seriesSearch, seriesCat]
  );

  const range = windowRange({
    scrollTop: listScrollTop,
    itemHeight: LIST_ITEM_HEIGHT,
    viewportHeight: viewHeight,
    total: visibleLiveStreams.length,
    overscan: LIST_OVERSCAN,
  });
  const page = visibleLiveStreams.slice(range.start, range.end);

  const handleListScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setListScrollTop(e.currentTarget.scrollTop);
  }, []);

  const daysLeft = userInfo?.expTs ? daysUntil(userInfo.expTs) : null;

  /* أزرار الترجمة/الصوت/الجودة تعمل على الخلية النشطة فقط */

  /* تقرير التشخيص + رمز المشاركة (بلا كلمة سر) */
  const diagReport = useMemo(
    () =>
      buildDiagReport({
        diag,
        account,
        m3uName,
        phase,
        streamsCount: streams.length,
        source,
        activeLabel: activeMode.label,
        errorMsg,
      }),
    [diag, account, m3uName, phase, streams.length, source, activeMode, errorMsg]
  );

  const shareToken = useMemo(
    () =>
      createShareToken({
        diag,
        host: account?.host ?? m3uName,
        username: account?.username ?? "",
        streamsCount: streams.length,
        source,
        activeLabel: activeMode.label,
        errorMsg,
        userAgent: typeof navigator === "undefined" ? "" : navigator.userAgent,
      }),
    [diag, account, m3uName, streams.length, source, activeMode, errorMsg]
  );

  const isCurrent = (acc: XtreamAccount) => accountKey(acc) === keyOf(account);

  /* أهداف القفل الأبوي: تصنيفات المباشر + الأفلام + المسلسلات */
  const lockTargets = useMemo(
    () => [
      ...categories.map((c) => ({ key: `l:${c.id}`, label: c.name, group: "مباشر" })),
      ...vodCats.map((c) => ({ key: `v:${c.id}`, label: c.name, group: "أفلام" })),
      ...seriesCats.map((c) => ({ key: `s:${c.id}`, label: c.name, group: "مسلسلات" })),
    ],
    [categories, vodCats, seriesCats]
  );

  /* ========================================================================= */
  return (
    <section
      id="xtream"
      className="py-20 md:py-28 bg-[#0b0b0f] text-white relative overflow-hidden grain"
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 start-1/4 w-[600px] h-[350px] bg-[#d8ff3e]/10 blur-[140px] rounded-full" />
        <div className="absolute bottom-10 end-1/4 w-[600px] h-[350px] bg-[#2b4eff]/25 blur-[140px] rounded-full" />
      </div>

      <div className="max-w-[1400px] mx-auto px-5 relative">
        {/* الترويسة */}
        <Reveal variant="up" className="text-center max-w-[760px] mx-auto mb-10">
          <p className="text-[12px] font-black tracking-[0.25em] uppercase text-[#d8ff3e] mb-4 flex items-center justify-center gap-2">
            <span className="w-8 h-[2px] bg-[#d8ff3e] inline-block" />
            <IconTv className="w-4 h-4" /> مشغّل اشتراكك الشخصي
          </p>
          <h2 className="font-display font-black tracking-tight leading-[1.15] text-[36px] md:text-[56px]">
            باقتك الخاصة…{" "}
            <span className="font-serif italic font-normal text-white/80">على موقعنا</span>
          </h2>
          <p className="mt-4 text-white/55 text-[15px] md:text-[16.5px] font-medium leading-relaxed">
            مشترك بالفعل؟ أدخل بيانات اشتراكك (السيرفر + اسم المستخدم + كلمة السر) لتحميل قائمة
            تشغيلك من مزوّدك وعرضها في مشغّل يعمل داخل متصفحك — بياناتك تُحفظ على جهازك فقط ولا
            تصل لأي طرف آخر.
          </p>
          <p className="mt-3 text-white/35 text-[12.5px] md:text-[13px] font-medium leading-relaxed">
            المشغّل أداة عرض برمجية على المتصفح (Client-side Web Player) تعمل محلياً على جهازك،
            والموقع لا يستضيف القنوات ولا يعيد بثّها.
          </p>
        </Reveal>

        {/* شرائح الحسابات المحفوظة — تبديل فوري بين الاشتراكات */}
        {accounts.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2 mb-6" data-testid="account-chips">
            {accounts.map((acc) => (
              <span
                key={accountKey(acc)}
                className={`inline-flex items-center gap-1 rounded-full border ps-4 pe-1.5 py-1.5 text-[12.5px] font-black transition ${
                  isCurrent(acc)
                    ? "border-[#d8ff3e] text-[#d8ff3e] bg-[#d8ff3e]/10"
                    : "border-white/15 text-white/60 hover:border-white/40"
                }`}
              >
                <button
                  type="button"
                  onClick={() => switchAccount(acc)}
                  className="cursor-pointer"
                  aria-label={`تبديل إلى ${accountLabel(acc)}`}
                >
                  {accountLabel(acc)}
                </button>
                <button
                  type="button"
                  onClick={() => forgetAccount(acc)}
                  aria-label={`حذف حساب ${accountLabel(acc)}`}
                  className="w-5 h-5 grid place-items-center rounded-full hover:bg-white/10 cursor-pointer"
                >
                  <IconClose className="w-3 h-3" />
                </button>
              </span>
            ))}
            {accounts.length < 8 && (
              <button
                type="button"
                data-testid="add-account"
                onClick={addAccount}
                className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-white/25 px-4 py-1.5 text-[12.5px] font-black text-white/60 hover:border-[#d8ff3e] hover:text-[#d8ff3e] transition cursor-pointer"
              >
                + إضافة حساب
              </button>
            )}
          </div>
        )}

        {/* ============ نموذج الدخول ============ */}
        {phase === "form" || phase === "loading" ? (
          <Reveal variant="up" delay={100} className="max-w-[520px] mx-auto">
            {/* div وليس <form>: الصفحة مرسومة مسبقاً (SSR) وقبل تحميل React لا يوجد
                معالج — أي إرسال أصلي كان سيعيد تحميل الصفحة ويضع اسم المستخدم
                وكلمة السر في الرابط وسجلّات الخادم. الآن النقر قبل التحميل بلا أثر. */}
            <div
              role="form"
              aria-label="تسجيل دخول المشتركين"
              onKeyDown={handleFormKeyDown}
              className="bg-white text-[#0b0b0f] rounded-[28px] border border-black/10 p-7 sm:p-9 shadow-2xl space-y-4"
            >
              <div className="text-center mb-2">
                <span className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#d8ff3e] mb-3">
                  <IconShieldCheck className="w-6 h-6" />
                </span>
                <h3 className="font-display font-black text-[21px]">تسجيل دخول المشتركين</h3>
                <p className="text-[13px] text-black/50 font-medium mt-1">
                  نفس بيانات اشتراكك التي تستخدمها في تطبيقات المشغل (IPTV Smarters ونحوها)
                </p>
              </div>

              {errorMsg && (
                <div
                  data-testid="login-error"
                  role="alert"
                  className="bg-[#ff5c4d]/10 border border-[#ff5c4d]/30 text-[#c0392b] rounded-2xl px-4 py-3 text-[13px] font-bold leading-relaxed"
                >
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-[13px] font-black text-black/70 mb-1.5">
                  سيرفر الاشتراك (URL)
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={account?.host || ""}
                  onChange={(e) =>
                    setAccount((a) => ({
                      ...(a || { username: "", password: "" }),
                      host: e.target.value,
                    }))
                  }
                  placeholder="nv2live.com أو http://server.com:8080"
                  className="w-full rounded-2xl border border-black/10 bg-[#faf9f6] px-3.5 py-3 text-[14px] font-bold focus:border-[#2b4eff] focus:outline-none focus:bg-white transition text-left"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] font-black text-black/70 mb-1.5">
                    اسم المستخدم
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={account?.username || ""}
                    onChange={(e) =>
                      setAccount((a) => ({
                        ...(a || { host: "", password: "" }),
                        username: e.target.value,
                      }))
                    }
                    placeholder="username"
                    className="w-full rounded-2xl border border-black/10 bg-[#faf9f6] px-3.5 py-3 text-[14px] font-bold focus:border-[#2b4eff] focus:outline-none focus:bg-white transition text-left"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-black text-black/70 mb-1.5">
                    كلمة السر
                  </label>
                  <input
                    type="password"
                    dir="ltr"
                    value={account?.password || ""}
                    onChange={(e) =>
                      setAccount((a) => ({
                        ...(a || { host: "", username: "" }),
                        password: e.target.value,
                      }))
                    }
                    placeholder="••••••••"
                    className="w-full rounded-2xl border border-black/10 bg-[#faf9f6] px-3.5 py-3 text-[14px] font-bold focus:border-[#2b4eff] focus:outline-none focus:bg-white transition text-left"
                  />
                </div>
              </div>

              <button
                type="button"
                data-testid="login-submit"
                onClick={handleSubmit}
                disabled={phase === "loading"}
                className="btn-slide slide-royal w-full py-3.5 rounded-full bg-[#0b0b0f] text-white font-black text-[15px] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {phase === "loading" ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    جاري الاتصال بالسيرفر…
                  </>
                ) : (
                  <>
                    <IconZap className="w-4 h-4 text-[#d8ff3e]" /> دخول ومشاهدة قنواتي
                  </>
                )}
              </button>

              {/* ==== المسار البديل: ملف M3U — لا يحتاج CORS إطلاقاً ==== */}
              <div className="pt-2">
                <div className="flex items-center gap-3 mb-3">
                  <span className="flex-1 h-px bg-black/10" />
                  <span className="text-[11.5px] font-black text-black/40">أو بطريقة مضمونة أكثر</span>
                  <span className="flex-1 h-px bg-black/10" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={downloadPlaylist}
                    disabled={!account?.host || !account?.username || !account?.password}
                    className="flex items-center justify-center gap-2 py-3 rounded-full border-2 border-black/10 hover:border-[#0b0b0f] text-[13px] font-black text-black/70 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <IconArrowUpRight className="w-4 h-4" />
                    نزّل ملف قنواتك
                  </button>
                  <label
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    className="flex items-center justify-center gap-2 py-3 rounded-full border-2 border-dashed border-black/15 hover:border-[#2b4eff] hover:text-[#2b4eff] text-[13px] font-black text-black/70 transition cursor-pointer"
                  >
                    <IconArrowUp className="w-4 h-4" />
                    ارفع ملف القنوات
                    <input
                      type="file"
                      accept=".m3u,.m3u8,.txt,text/plain"
                      className="hidden"
                      onChange={handleM3UFile}
                    />
                  </label>
                </div>

                <p className="text-[11.5px] text-black/40 text-center font-medium leading-relaxed mt-2.5">
                  إن فشل الدخول المباشر (بعض المزودين يحجبون المواقع): اضغط «نزّل ملف قنواتك» —
                  سيُحمَّل ملف فيه كل قنوات باقتك — ثم ارجع واضغط «ارفع ملف القنوات» واختر
                  الملف، وستظهر قنواتك فوراً. يمكنك أيضاً سحب الملف وإفلاته على الزر.
                </p>
              </div>

              {diag.length > 0 && (
                <DiagBox entries={diag} report={diagReport} token={shareToken} tone="light" />
              )}

              {/* ==== إيضاح تقني وقانوني لصفة المشغّل ==== */}
              <div
                data-testid="player-legal-note"
                className="rounded-2xl border border-black/10 bg-[#faf9f6] px-4 py-3.5 text-[11.5px] leading-[1.9] text-black/55 font-medium"
              >
                <strong className="block text-black/75 font-black mb-1">
                  الصفة التقنية لهذا المشغّل:
                </strong>
                مشغّل عرض برمجية على المتصفح (Client-side Web Player) يعمل محلياً على جهازك أنت:
                يقرأ قائمة التشغيل الخاصة باشتراكك (M3U / Xtream Codes) من سيرفر مزوّدك ويعرضها في
                المتصفح، تماماً كما تفعل تطبيقات المشغّلات الأخرى. الموقع لا يخزّن بيانات الدخول على
                أي خادم ولا يطّلع عليها أحد، ولا يستضيف المحتوى المُشغَّل ولا يعيد بثّه — القنوات
                والمكتبات ملك لمزوّدك ولمالكي الحقوق، ومسؤولية حقوق ما تشاهده تقع على المزود
                والمستخدم. للقنوات والمنصات المشفّرة استخدم اشتراكها الرسمي عبر{" "}
                <a
                  href="/watch-legal.html"
                  className="font-black text-[#2b4eff] underline underline-offset-2"
                >
                  دليل المشاهدة الرسمية
                </a>
                .
              </div>

              <p className="text-[11.5px] text-black/40 text-center font-medium leading-relaxed">
                بتسجيل الدخول تُحفظ بياناتك في متصفحك فقط (localStorage) — احذفها بزر «خروج» في أي
                وقت.
              </p>
            </div>
          </Reveal>
        ) : (
          /* ============ واجهة المشترك ============ */
          <div className="animate-scale-in">
            {/* شريط معلومات الحساب */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white/[0.05] border border-white/10 rounded-2xl px-5 py-4 mb-6">
              <div className="flex items-center gap-3 flex-wrap">
                <span
                  data-testid="connection-badge"
                  className="inline-flex items-center gap-1.5 bg-[#d8ff3e] text-black text-[12px] font-black px-3 py-1.5 rounded-full"
                >
                  <IconCheck className="w-3.5 h-3.5" />
                  {source === "m3u" ? `ملف قنوات: ${m3uName}` : `متصل — ${activeMode.label}`}
                </span>
                {activeUa === UA_PRESET_SMARTERS && (
                  <span
                    data-testid="ua-badge"
                    title={SMARTERS_USER_AGENT}
                    className="inline-flex items-center gap-1.5 bg-white/10 border border-[#d8ff3e]/30 text-[#d8ff3e] text-[11.5px] font-black px-3 py-1.5 rounded-full"
                  >
                    <IconZap className="w-3.5 h-3.5" />
                    {UA_LABEL}
                  </span>
                )}
                {source === "xtream" && userInfo && (
                  <>
                    <span className="text-[12.5px] font-bold text-white/60">
                      ينتهي: <span className="text-white">{userInfo.expDate || "غير محدد"}</span>
                    </span>
                    {daysLeft !== null && (
                      <span
                        className={`inline-flex items-center gap-1 text-[11.5px] font-black px-2.5 py-1 rounded-full ${
                          daysLeft <= 0
                            ? "bg-[#ff5c4d]/20 text-[#ff8a7d]"
                            : daysLeft <= 7
                              ? "bg-[#ffb020]/20 text-[#ffd479]"
                              : "bg-white/10 text-white/70"
                        }`}
                      >
                        <IconClock className="w-3.5 h-3.5" />
                        {daysLeft <= 0
                          ? "انتهى الاشتراك"
                          : daysLeft === 1
                            ? "تبقّى يوم واحد"
                            : `تبقّى ${daysLeft} يوماً`}
                      </span>
                    )}
                    <span className="text-[12.5px] font-bold text-white/60">
                      اتصالات:{" "}
                      <span className="text-white">
                        {userInfo.activeConnections}/{userInfo.maxConnections}
                      </span>
                    </span>
                    {userInfo.isTrial && (
                      <span className="text-[11px] font-black bg-[#ff5c4d]/20 text-[#ff8a7d] px-2.5 py-1 rounded-full">
                        تجريبي
                      </span>
                    )}
                  </>
                )}
                <span className="text-[12.5px] font-bold text-white/60">
                  القنوات:{" "}
                  <span className="text-[#d8ff3e]">{streams.length.toLocaleString("en-US")}</span>
                </span>
                {source === "xtream" && cacheTs && (
                  <span className="text-[11.5px] font-bold text-white/45" data-testid="cache-badge">
                    محفوظة محلياً — {new Date(cacheTs).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                )}
                {refreshNote && <span className="text-[11.5px] font-black text-[#3effe0]">{refreshNote}</span>}
              </div>
              <div className="flex items-center gap-2">
                {source === "xtream" && (
                  <button
                    type="button"
                    data-testid="refresh-channels"
                    onClick={refreshLibrary}
                    disabled={refreshing}
                    className="inline-flex items-center gap-1.5 border border-white/20 hover:border-[#d8ff3e] hover:text-[#d8ff3e] text-white/70 font-black text-[13px] px-4 py-2 rounded-full transition cursor-pointer disabled:opacity-50"
                  >
                    <span className={refreshing ? "w-3.5 h-3.5 border-2 border-white/30 border-t-[#d8ff3e] rounded-full animate-spin" : ""}>
                      {refreshing ? "" : "⟳"}
                    </span>
                    تحديث القنوات
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 border border-white/20 hover:border-[#ff5c4d] hover:text-[#ff8a7d] text-white/70 font-black text-[13px] px-4 py-2 rounded-full transition cursor-pointer"
                >
                  <IconClose className="w-3.5 h-3.5" /> خروج وحذف البيانات
                </button>
              </div>
            </div>

            {/* تنبيه: دخول ناجح لكن صفر قنوات — وجهّه لملف M3U */}
            {streams.length === 0 && (
              <div className="mb-6 rounded-2xl border border-[#ff5c4d]/30 bg-[#ff5c4d]/10 px-5 py-4">
                <p className="font-black text-[14px] text-[#ff8a7d]">
                  {source === "xtream"
                    ? "دخول الحساب نجح لكن السيرفر لم يُرجع أي قنوات مباشرة"
                    : "الملف لا يحتوي قنوات"}
                </p>
                <p className="text-[12.5px] text-white/60 mt-1 font-medium leading-relaxed">
                  نزّل ملف قنواتك من السيرفر ثم ارفعه هنا — يعرض كل قنوات باقتك حتى لو حجبها
                  المزود عن الويب.
                </p>
                <div className="flex flex-wrap gap-2.5 mt-3">
                  {source === "xtream" && (
                    <button
                      type="button"
                      onClick={downloadPlaylist}
                      className="inline-flex items-center gap-2 bg-white text-black text-[12.5px] font-black px-4 py-2 rounded-full hover:bg-[#d8ff3e] transition cursor-pointer"
                    >
                      <IconArrowUpRight className="w-4 h-4" /> نزّل ملف قنواتك
                    </button>
                  )}
                  <label className="inline-flex items-center gap-2 border border-white/25 text-white text-[12.5px] font-black px-4 py-2 rounded-full hover:border-[#d8ff3e] hover:text-[#d8ff3e] transition cursor-pointer">
                    <IconArrowUp className="w-4 h-4" /> ارفع ملف القنوات
                    <input
                      type="file"
                      accept=".m3u,.m3u8,.txt,text/plain"
                      className="hidden"
                      onChange={handleM3UFile}
                    />
                  </label>
                </div>
              </div>
            )}

            {/* تبويبات المحتوى: البث المباشر + الأفلام + المسلسلات */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-6" role="group" aria-label="أنواع المحتوى">
              {(
                [
                  { id: "live", label: "البث المباشر" },
                  { id: "vod", label: "الأفلام" },
                  { id: "series", label: "المسلسلات" },
                ] as { id: LibTab; label: string }[]
              ).map((t) => {
                const disabled = t.id !== "live" && source !== "xtream";
                return (
                  <button
                    key={t.id}
                    type="button"
                    data-testid={`libtab-${t.id}`}
                    disabled={disabled}
                    title={disabled ? "متاح عند الدخول بحساب Xtream" : undefined}
                    onClick={() => {
                      /* إعادة المحاولة بعد فشل تحميل سابق */
                      if (t.id === "vod" && vodError) setVodLoaded(false);
                      if (t.id === "series" && seriesError) setSeriesLoaded(false);
                      setLibTab(t.id);
                    }}
                    className={`px-5 py-2.5 rounded-full text-[13.5px] font-black transition cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed ${
                      libTab === t.id
                        ? "bg-[#d8ff3e] text-black"
                        : "bg-white/[0.06] border border-white/15 text-white/70 hover:border-white/40"
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* المشغل */}
              <div className="lg:col-span-8 flex flex-col gap-4">
                <div
                  ref={stageRef}
                  className="relative rounded-[24px] overflow-hidden border border-white/10 bg-black shadow-2xl"
                >
                  <div className={viewCount > 1 ? "grid grid-cols-2 gap-[3px] bg-white/15" : ""}>
                    {Array.from({ length: viewCount }).map((_, i) => (
                      <div
                        key={i}
                        onClick={() => setActiveCell(i)}
                        className="cursor-pointer"
                      >
                        <StageCell
                          ref={(el) => {
                            cellRefs.current[i] = el;
                          }}
                          item={viewStreams[i] ?? null}
                          active={i === activeCell}
                          muted={i === activeCell ? isMuted : true}
                          aspect={aspect}
                          resumeAt={
                            viewStreams[i]?.resumeKey ? getResumeAt(resumeMap, viewStreams[i]!.resumeKey!) : 0
                          }
                          placeholder={
                            i === 0 ? (
                              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0b0b0f]/80 text-center px-6">
                                <span className="w-16 h-16 rounded-full bg-[#d8ff3e] text-black grid place-items-center mb-4">
                                  <IconPlay className="w-7 h-7 mr-1" />
                                </span>
                                <p className="font-display font-black text-[19px]">
                                  اختر قناة من القائمة لبدء المشاهدة
                                </p>
                                <p className="text-[13px] text-white/45 font-medium mt-1.5">
                                  {streams.length.toLocaleString("en-US")} قناة متاحة في باقتك
                                </p>
                              </div>
                            ) : (
                              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0b0b0f]/70 text-center px-4">
                                <p className="text-[13px] font-black text-white/60">
                                  شاشة {i + 1} — اضغط قناة لتشغيلها هنا
                                </p>
                              </div>
                            )
                          }
                          onState={(patch) =>
                            setCellStates((prev) => ({ ...prev, [i]: { ...prev[i], ...patch } }))
                          }
                          onMutedChange={(m) => {
                            if (i === activeCell) setIsMuted(m);
                          }}
                          onPreferredMode={(mode) => {
                            if (mode) {
                              preferredStreamModeRef.current = mode;
                              setActiveMode(mode);
                            }
                          }}
                          onPreferredUa={(ua) => {
                            /* البصمة التي نجح بها التشغيل — تُقدَّم في المحاولة القادمة */
                            preferredUaRef.current = ua || "";
                            setActiveUa(ua || "");
                          }}
                          onUnmute={() => setIsMuted(false)}
                          onSaveResume={handleSaveResume}
                        />
                      </div>
                    ))}
                  </div>

                  {/* أزرار داخل الفيديو: القناة السابقة/التالية + درج القنوات */}
                  {activeItem?.live && (
                    <div className="absolute bottom-3 inset-x-0 z-30 flex items-center justify-center gap-2 pointer-events-none">
                      <button
                        type="button"
                        data-testid="prev-channel"
                        onClick={(e) => {
                          e.stopPropagation();
                          stepLiveChannel(-1);
                        }}
                        className="pointer-events-auto w-10 h-10 rounded-full glass-dark border border-white/20 grid place-items-center hover:bg-white/15 transition cursor-pointer"
                        aria-label="القناة السابقة"
                      >
                        <IconChevronDown className="w-4 h-4 rotate-90" />
                      </button>
                      <button
                        type="button"
                        data-testid="drawer-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDrawerOpen(true);
                        }}
                        className="pointer-events-auto h-10 px-4 rounded-full glass-dark border border-white/20 flex items-center gap-2 text-[12.5px] font-black hover:bg-white/15 transition cursor-pointer"
                      >
                        <IconTv className="w-4 h-4" /> القنوات
                      </button>
                      <button
                        type="button"
                        data-testid="next-channel"
                        onClick={(e) => {
                          e.stopPropagation();
                          stepLiveChannel(1);
                        }}
                        className="pointer-events-auto w-10 h-10 rounded-full glass-dark border border-white/20 grid place-items-center hover:bg-white/15 transition cursor-pointer"
                        aria-label="القناة التالية"
                      >
                        <IconChevronDown className="w-4 h-4 -rotate-90" />
                      </button>
                    </div>
                  )}

                  {/* رسالة OSD داخل الشاشة (تظهر في ملء الشاشة أيضاً) */}
                  {osd && (
                    <div className="absolute bottom-16 inset-x-0 mx-auto z-30 w-fit max-w-[85%] glass-dark border border-white/15 text-[#d8ff3e] text-[13.5px] font-black px-5 py-2 rounded-full text-center pointer-events-none animate-pulse-soft">
                      {osd}
                    </div>
                  )}

                  {/* درج القنوات داخل الشاشة — يعمل في ملء الشاشة */}
                  {drawerOpen && (
                    <ChannelDrawer
                      streams={visibleLiveStreams}
                      currentKey={playing ? streamKey(playing) : ""}
                      epgNowTitle={epg?.now?.title ?? ""}
                      onPick={(ch) => {
                        playStream(ch);
                        setDrawerOpen(false);
                      }}
                      onClose={() => setDrawerOpen(false)}
                    />
                  )}
                </div>

                {/* دليل البرامج: يعرض الآن + التالي مع شريط تقدّم */}
                <EpgBar epg={epg} />

                {/* أدوات المشغل: الجودة + صورة داخل صورة + ملء الشاشة */}
                <div className="rounded-2xl bg-white/[0.05] border border-white/10 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-[12.5px] font-bold text-white/50">
                      {playing ? `تشغيل: ${playing.name}` : "لم تُختَر قناة بعد"}
                    </span>
                    {levels.length > 1 && (
                      <label className="inline-flex items-center gap-2 text-[12px] font-black text-white/70">
                        الجودة
                        <select
                          data-testid="quality-select"
                          value={levelIndex}
                          onChange={(e) => changeLevel(Number(e.target.value))}
                          className="rounded-full bg-[#0b0b0f] border border-white/20 text-white text-[12px] font-black px-3 py-1.5 cursor-pointer"
                        >
                          <option value={-1}>تلقائي</option>
                          {levels.map((l) => (
                            <option key={l.index} value={l.index}>
                              {l.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {canPip && (
                      <button
                        type="button"
                        data-testid="pip-button"
                        onClick={togglePip}
                        className={`text-[12.5px] font-black px-4 py-2 rounded-full border transition cursor-pointer ${
                          pipOn
                            ? "border-[#d8ff3e] text-[#d8ff3e]"
                            : "border-white/20 text-white/70 hover:border-white/50"
                        }`}
                      >
                        {pipOn ? "إغلاق الصورة المصغّرة" : "صورة داخل صورة"}
                      </button>
                    )}
                    <button
                      type="button"
                      data-testid="fullscreen-button"
                      onClick={toggleFullscreen}
                      className="text-[12.5px] font-black px-4 py-2 rounded-full border border-white/20 text-white/70 hover:border-white/50 transition cursor-pointer"
                    >
                      ملء الشاشة
                    </button>
                  </div>
                </div>

                {/* شريط إضافات: عرض الشاشة، الصوت، الترجمة، إعادة البث،ecast/AirPlay، القفل */}
                <div className="rounded-2xl bg-white/[0.05] border border-white/10 px-5 py-3.5 flex flex-wrap items-center gap-2.5">
                  {/* عدد الشاشات: 1 / 2 / 4 */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11.5px] font-black text-white/45 me-1">الشاشات:</span>
                    {([1, 2, 4] as const).map((n) => (
                      <button
                        key={n}
                        type="button"
                        data-testid={`view-${n}`}
                        onClick={() => changeViewCount(n)}
                        className={`w-8 h-8 rounded-full text-[12.5px] font-black transition cursor-pointer ${
                          viewCount === n ? "bg-[#d8ff3e] text-black" : "bg-white/10 text-white/70 hover:bg-white/20"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>

                  <span className="w-px h-6 bg-white/10" />

                  {/* أوضاع العرض */}
                  <label className="inline-flex items-center gap-2 text-[12px] font-black text-white/70">
                    العرض
                    <select
                      data-testid="aspect-select"
                      value={aspect}
                      onChange={(e) => setAspect(e.target.value)}
                      className="rounded-full bg-[#0b0b0f] border border-white/20 text-white text-[12px] font-black px-3 py-1.5 cursor-pointer"
                    >
                      {ASPECT_MODES.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  {/* المسارات الصوتية (من hls.js) */}
                  {tracks.audio.length > 1 && (
                    <label className="inline-flex items-center gap-2 text-[12px] font-black text-white/70">
                      الصوت
                      <select
                        data-testid="audio-select"
                        value={tracks.audioIndex}
                        onChange={(e) => cellRefs.current[activeCell]?.setAudioTrack(Number(e.target.value))}
                        className="rounded-full bg-[#0b0b0f] border border-white/20 text-white text-[12px] font-black px-3 py-1.5 cursor-pointer"
                      >
                        {tracks.audio.map((t) => (
                          <option key={t.index} value={t.index}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  {/* الترجمة: مسارات hls + رفع ملف SRT/VTT */}
                  {(tracks.subs.length > 0 || activeItem?.uploadedSub) && (
                    <label className="inline-flex items-center gap-2 text-[12px] font-black text-white/70">
                      الترجمة
                      <select
                        data-testid="subtitle-select"
                        value={tracks.subIndex}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          const api = cellRefs.current[activeCell];
                          if (v === -2) api?.enableUploadedSubtitle();
                          else api?.setSubtitleTrack(v);
                        }}
                        className="rounded-full bg-[#0b0b0f] border border-white/20 text-white text-[12px] font-black px-3 py-1.5 cursor-pointer"
                      >
                        <option value={-1}>إيقاف</option>
                        {tracks.subs.map((t) => (
                          <option key={t.index} value={t.index}>
                            {t.label}
                          </option>
                        ))}
                        {activeItem?.uploadedSub && <option value={-2}>ترجمة مرفوعة</option>}
                      </select>
                    </label>
                  )}
                  <label className="text-[12px] font-black text-white/70 border border-white/20 rounded-full px-3 py-1.5 cursor-pointer hover:border-[#d8ff3e] hover:text-[#d8ff3e] transition">
                    + رفع srt
                    <input
                      type="file"
                      accept=".srt,.vtt,text/plain"
                      className="hidden"
                      onChange={handleSubtitleFile}
                    />
                  </label>

                  {/* إعادة البث Catch-up للقنوات التي تدعم الأرشيف */}
                  {activeItem?.catchupStreamId && (
                    <select
                      data-testid="catchup-select"
                      value=""
                      onChange={(e) => {
                        const h = Number(e.target.value);
                        if (h) playTimeshift(h);
                      }}
                      title="إعادة البث (Catch-up / Timeshift)"
                      className="rounded-full bg-[#0b0b0f] border border-[#3effe0]/40 text-[#3effe0] text-[12px] font-black px-3 py-1.5 cursor-pointer"
                    >
                      <option value="">⏱ إعادة البث</option>
                      <option value="2">آخر ساعتين</option>
                      <option value="6">آخر 6 ساعات</option>
                      <option value="12">آخر 12 ساعة</option>
                    </select>
                  )}

                  {/* Chromecast / AirPlay */}
                  {canCast && (
                    <button
                      type="button"
                      data-testid="cast-button"
                      onClick={handleCast}
                      className="inline-flex items-center gap-1.5 text-[12px] font-black text-white/75 border border-white/20 rounded-full px-3 py-1.5 hover:border-[#d8ff3e] hover:text-[#d8ff3e] transition cursor-pointer"
                    >
                      <IconMonitor className="w-3.5 h-3.5" /> Chromecast
                    </button>
                  )}
                  {canAirPlay && (
                    <button
                      type="button"
                      data-testid="airplay-button"
                      onClick={handleAirPlay}
                      className="inline-flex items-center gap-1.5 text-[12px] font-black text-white/75 border border-white/20 rounded-full px-3 py-1.5 hover:border-[#d8ff3e] hover:text-[#d8ff3e] transition cursor-pointer"
                    >
                      <IconApple className="w-3.5 h-3.5" /> AirPlay
                    </button>
                  )}

                  <span className="w-px h-6 bg-white/10" />

                  {/* القفل الأبوي */}
                  <button
                    type="button"
                    data-testid="pin-button"
                    onClick={() => setPinDlg({ mode: "setup" })}
                    className="inline-flex items-center gap-1.5 text-[12px] font-black text-white/75 border border-white/20 rounded-full px-3 py-1.5 hover:border-[#ffb020] hover:text-[#ffb020] transition cursor-pointer"
                  >
                    🔒 القفل الأبوي
                  </button>
                </div>

                {/* ملاحظة سريعة — اختصارات الريموت */}
                <div className="rounded-2xl bg-white/[0.05] border border-white/10 px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
                  <p className="text-[12.5px] font-bold text-white/50 leading-relaxed">
                    ريموت/كيبورد: <span className="text-white/80">↑ ↓</span> تبديل القنوات •{" "}
                    <span className="text-white/80">← →</span> الصوت أو التقديم •{" "}
                    <span className="text-white/80">F</span> ملء الشاشة •{" "}
                    <span className="text-white/80">M</span> كتم • <span className="text-white/80">Space</span>{" "}
                    إيقاف/تشغيل • اكتب أرقام رقم القناة للانتقال.
                  </p>
                  <a
                    href="#pricing"
                    className="text-[12.5px] font-black text-[#d8ff3e] hover:text-white transition underline underline-offset-4"
                  >
                    ترقية أو تجديد الباقة ←
                  </a>
                </div>
              </div>

              {/* لوحة القوائم: مباشر / أفلام / مسلسلات */}
              <div className="lg:col-span-4 rounded-[24px] bg-white text-[#0b0b0f] overflow-hidden shadow-2xl flex flex-col h-[620px]">
                {libTab === "live" && (
                  <>
                    {/* البحث */}
                    <div className="p-4 border-b border-black/10 bg-[#faf9f6] space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[15px] font-black flex items-center gap-2">
                          <IconTv className="w-4 h-4 text-[#2b4eff]" /> قنوات باقتك
                        </h3>
                        <span className="text-[11px] font-black bg-[#d8ff3e] px-2 py-0.5 rounded-full">
                          {streams.length.toLocaleString("en-US")}
                        </span>
                      </div>

                      {/* تبويبات: الكل / المفضلة / الأخيرة */}
                      <div className="flex gap-1.5 text-[11.5px] font-bold" role="tablist">
                        {(
                          [
                            { id: "all", label: "الكل" },
                            { id: "favorites", label: `المفضلة (${favorites.length})` },
                            { id: "recent", label: `الأخيرة (${recents.length})` },
                          ] as { id: TabId; label: string }[]
                        ).map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            role="tab"
                            data-testid={`tab-${t.id}`}
                            aria-selected={tab === t.id}
                            onClick={() => setTab(t.id)}
                            className={`px-3 py-1.5 rounded-full whitespace-nowrap cursor-pointer transition ${
                              tab === t.id
                                ? "bg-[#2b4eff] text-white font-black"
                                : "bg-white text-black/50 border border-black/10 hover:border-black"
                            }`}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>

                      <div className="relative">
                        <IconSearch className="w-4 h-4 absolute start-3.5 top-1/2 -translate-y-1/2 text-black/35" />
                        <input
                          type="text"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="ابحث في كل القنوات…"
                          aria-label="ابحث في كل القنوات"
                          className="w-full rounded-full bg-white border border-black/10 ps-10 pe-3 py-2.5 text-[13px] font-medium placeholder:text-black/35 focus:border-[#2b4eff] focus:outline-none transition"
                        />
                      </div>
                      {/* تصنيفات */}
                      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 text-[11px] font-bold">
                        <button
                          data-testid="category-all"
                          onClick={() => {
                            setSelectedCat("");
                            setSearch("");
                          }}
                          className={`px-3 py-1.5 rounded-full whitespace-nowrap cursor-pointer ${
                            !selectedCat && !search
                              ? "bg-[#0b0b0f] text-white font-black"
                              : "bg-white text-black/50 border border-black/10 hover:border-black"
                          }`}
                        >
                          الكل
                        </button>
                        {categories.map((c) => (
                          <button
                            key={c.id}
                            data-testid={`category-${c.id}`}
                            onClick={() =>
                              guardLocked(`l:${c.id}`, c.name, () => {
                                setSelectedCat(c.id);
                                setSearch("");
                              })
                            }
                            className={`px-3 py-1.5 rounded-full whitespace-nowrap cursor-pointer ${
                              selectedCat === c.id && !search
                                ? "bg-[#0b0b0f] text-white font-black"
                                : "bg-white text-black/50 border border-black/10 hover:border-black"
                            }`}
                          >
                            {c.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* القنوات — قائمة افتراضية: نرسم الظاهر فقط فيبقى الأداء سريعاً بآلاف القنوات */}
                    <div
                      ref={listRef}
                      onScroll={handleListScroll}
                      data-testid="channel-list"
                      className="flex-1 overflow-y-auto no-scrollbar"
                    >
                      {visibleLiveStreams.length === 0 ? (
                        <div className="p-8 text-center text-black/40 text-[13px] font-bold">
                          {search
                            ? `لا نتائج للبحث "${search}" — جرّب كلمة أخرى أو ابحث بلا همزات.`
                            : streams.length === 0
                              ? "لا توجد قنوات بعد."
                              : tab === "favorites"
                                ? "لا قنوات في المفضلة بعد — اضغط النجمة بجانب أي قناة."
                                : tab === "recent"
                                  ? "لا سجل مشاهدة بعد — شغّل أي قناة وسيظهر هنا."
                                  : "لا توجد قنوات في هذا التصنيف — اختر «الكل»."}
                        </div>
                      ) : (
                        <div style={{ height: range.totalHeight, position: "relative" }}>
                          <div style={{ transform: `translateY(${range.offsetY}px)` }}>
                            {page.map((ch) => {
                              const isActive = playing?.id === ch.id;
                              const key = streamKey(ch);
                              const isFav = favorites.includes(key);
                              return (
                                <div
                                  key={`${ch.catId}-${ch.id}-${ch.name}`}
                                  style={{ height: LIST_ITEM_HEIGHT }}
                                  className={`flex items-center gap-1 ps-1.5 pe-2 rounded-xl mx-2 transition-all ${
                                    isActive
                                      ? "bg-[#2b4eff]/10 border border-[#2b4eff]/40"
                                      : "border border-transparent hover:bg-black/[0.04]"
                                  }`}
                                >
                                  <button
                                    type="button"
                                    data-testid="channel-row"
                                    onClick={() => playStream(ch)}
                                    className="flex-1 min-w-0 flex items-center gap-3 p-1.5 text-right cursor-pointer"
                                  >
                                    <span
                                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg overflow-hidden border text-sm font-black ${
                                        isActive
                                          ? "bg-[#0b0b0f] border-[#0b0b0f] text-[#d8ff3e]"
                                          : "bg-[#f4f3ef] border-black/10"
                                      }`}
                                    >
                                      {ch.icon ? (
                                        <img
                                          src={ch.icon}
                                          alt=""
                                          loading="lazy"
                                          className="w-full h-full object-contain p-0.5"
                                          onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = "none";
                                            const parent = (e.target as HTMLImageElement).parentElement;
                                            if (parent) parent.textContent = ch.name.charAt(0);
                                          }}
                                        />
                                      ) : (
                                        ch.name.charAt(0)
                                      )}
                                    </span>
                                    <span
                                      className={`text-[13px] font-bold block truncate ${
                                        isActive ? "text-[#2b4eff] font-black" : "text-black/80"
                                      }`}
                                    >
                                      {ch.name}
                                    </span>
                                    {isActive && (
                                      <span className="ms-auto w-2.5 h-2.5 rounded-full bg-[#ff5c4d] animate-pulse-soft shrink-0" />
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    data-testid="favorite-toggle"
                                    onClick={() => toggleFavorite(ch)}
                                    aria-label={isFav ? `إزالة ${ch.name} من المفضلة` : `إضافة ${ch.name} إلى المفضلة`}
                                    aria-pressed={isFav}
                                    className={`w-8 h-8 grid place-items-center rounded-full transition cursor-pointer shrink-0 ${
                                      isFav
                                        ? "text-[#ffb020] bg-[#ffb020]/10"
                                        : "text-black/25 hover:text-[#ffb020]"
                                    }`}
                                  >
                                    <IconStar
                                      className="w-4 h-4"
                                      fill={isFav ? "currentColor" : "none"}
                                      stroke="currentColor"
                                      strokeWidth={1.8}
                                    />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="px-4 py-2.5 border-t border-black/10 flex items-center justify-between gap-2 text-[11px] font-bold text-black/40">
                      <span>
                        {visibleLiveStreams.length.toLocaleString("en-US")} قناة معروضة
                        {search || selectedCat || tab !== "all" ? " (مفلترة)" : ""}
                      </span>
                      <button
                        type="button"
                        onClick={addAccount}
                        className="text-[11px] font-black text-[#2b4eff] hover:underline cursor-pointer"
                      >
                        + إضافة حساب آخر
                      </button>
                    </div>
                  </>
                )}

                {libTab === "vod" && (
                  <MediaPanel
                    heading="أفلام باقتك"
                    items={visibleVod}
                    categories={vodCats}
                    loading={vodLoading}
                    loaded={vodLoaded}
                    error={vodError}
                    query={vodSearch}
                    onQuery={(v) => {
                      setVodSearch(v);
                      setVodShown(60);
                    }}
                    catId={vodCat}
                    onCat={(id) => {
                      setVodCat(id);
                      setVodShown(60);
                    }}
                    searchPlaceholder="ابحث في الأفلام…"
                    loadedCount={vodStreams.length}
                    shown={vodShown}
                    onMore={() => setVodShown((n) => n + 60)}
                    onPick={openVod}
                    emptyText={
                      vodStreams.length === 0
                        ? "لا توجد أفلام في هذه القائمة — بعض المزودين لا يدعمون VOD."
                        : "لا نتائج مطابقة."
                    }
                    gridId="vod-grid"
                  />
                )}

                {libTab === "series" && (
                  <MediaPanel
                    heading="مسلسلات باقتك"
                    items={visibleSeries}
                    categories={seriesCats}
                    loading={seriesLoading}
                    loaded={seriesLoaded}
                    error={seriesError}
                    query={seriesSearch}
                    onQuery={(v) => {
                      setSeriesSearch(v);
                      setSeriesShown(60);
                    }}
                    catId={seriesCat}
                    onCat={(id) => {
                      setSeriesCat(id);
                      setSeriesShown(60);
                    }}
                    searchPlaceholder="ابحث في المسلسلات…"
                    loadedCount={seriesStreams.length}
                    shown={seriesShown}
                    onMore={() => setSeriesShown((n) => n + 60)}
                    onPick={openSeries}
                    emptyText={
                      seriesStreams.length === 0
                        ? "لا توجد مسلسلات في هذه القائمة — بعض المزودين لا يدعمون المسلسلات."
                        : "لا نتائج مطابقة."
                    }
                    gridId="series-grid"
                  />
                )}
              </div>
            </div>

            {/* شريط ثقة + تقرير فني */}
            <div className="mt-8 space-y-4">
              <div className="flex flex-wrap items-center justify-center gap-3 text-[12.5px] font-bold text-white/50">
                <span className="inline-flex items-center gap-2 bg-white/[0.06] border border-white/10 rounded-full px-4 py-2">
                  <IconShieldCheck className="w-4 h-4 text-[#3effe0]" /> بياناتك محفوظة على جهازك
                </span>
                <span className="inline-flex items-center gap-2 bg-white/[0.06] border border-white/10 rounded-full px-4 py-2">
                  <IconMonitor className="w-4 h-4 text-[#2b4eff]" /> مشغّل داخل متصفحك — الموقع لا
                  يستضيف المحتوى
                </span>
                <span className="inline-flex items-center gap-2 bg-white/[0.06] border border-white/10 rounded-full px-4 py-2">
                  <IconStar className="w-4 h-4 text-[#d8ff3e]" /> مفضلة وسجل لكل حساب
                </span>
                <span className="inline-flex items-center gap-2 bg-white/[0.06] border border-white/10 rounded-full px-4 py-2">
                  <IconZap className="w-4 h-4 text-[#ff5c4d]" /> تبديل تلقائي بين مسارات الاتصال
                </span>
              </div>
              <DiagBox entries={diag} report={diagReport} token={shareToken} tone="dark" />
            </div>
          </div>
        )}
      </div>

      {/* نوافذ الأفلام والمسلسلات والقفل — خارج أنيميشن القسم (portal) */}
      {vodModal && (
        <VodDialog
          name={vodModal.name}
          detail={vodDetail}
          loading={vodDetailLoading}
          error={vodDetailError}
          resumeAt={getResumeAt(resumeMap, `v:${vodModal.id}`)}
          onClose={() => setVodModal(null)}
          onPlay={() =>
            playVodNow(
              vodModal.id,
              vodDetail?.name || vodModal.name,
              vodDetail?.ext || "mp4",
              vodDetail?.poster || ""
            )
          }
        />
      )}
      {seriesModal && (
        <SeriesDialog
          name={seriesModal.name}
          info={seriesInfo}
          loading={seriesInfoLoading}
          error={seriesInfoError}
          resumeMap={resumeMap}
          activeKey={activeItem?.resumeKey ?? ""}
          onClose={() => setSeriesModal(null)}
          onPlayEpisode={playEpisodeNow}
        />
      )}
      {pinDlg && (
        <PinDialog
          mode={pinDlg.mode}
          state={pinState}
          targets={lockTargets}
          unlockLabel={pinDlg.label ?? ""}
          onClose={() => setPinDlg(null)}
          onVerify={(pin) => {
            if (!pinState || !verifyPin(pinState.pin, pin)) return false;
            if (pinDlg.need) {
              const need = pinDlg.need;
              setUnlocked((prev) => {
                const next = new Set(prev);
                next.add(need);
                return next;
              });
            }
            pinDlg.pending?.();
            return true;
          }}
          onSave={(next) => {
            setPinState(next);
            savePinState(storage, next);
          }}
          onClear={() => {
            setPinState(null);
            savePinState(storage, null);
            setUnlocked(new Set());
          }}
        />
      )}
    </section>
  );
}

/* المكوّن لا يستقبل أي props — نلفّه بـ memo حتى لا يُعاد رسمه
   (وقطع البث) عند أي تغيير في حالة الصفحة مثل تبديل العملة أو فتح السلة. */
const XtreamPlayer = memo(XtreamPlayerInner);
export default XtreamPlayer;
