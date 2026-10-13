import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type Hls from "hls.js";
import { loadHls } from "../hls";
import { PROXY_BASE, WHATSAPP_NUMBER } from "../config";
import {
  ACCOUNTS_KEY,
  FAVORITES_KEY,
  LIST_ITEM_HEIGHT,
  LIST_OVERSCAN,
  PHP_PROXY,
  RECENTS_KEY,
  STORAGE_KEY,
  accountKey,
  accountLabel,
  buildDiagReport,
  buildModes,
  composeFailMsg,
  createShareToken,
  daysUntil,
  filterStreams,
  isHlsCandidateUrl,
  loadAccounts,
  loadProfileList,
  liveStreamUrl,
  m3uCandidates,
  m3uDownloadUrl,
  normalizeHost,
  parseM3U,
  playerApiUrl,
  profileKeyFor,
  pushRecent,
  removeAccount,
  resolveWorkerBase,
  saveJSON,
  saveProfileList,
  schemeOf,
  sortCategories,
  streamKey,
  toggleInList,
  upsertAccount,
  windowRange,
} from "../lib/xtream.mjs";
import type { Category, DiagEntry, Stream, XtreamAccount, XtreamMode } from "../lib/xtream.mjs";
import {
  IconArrowUp,
  IconArrowUpRight,
  IconCheck,
  IconChevronDown,
  IconClose,
  IconClock,
  IconPlay,
  IconSearch,
  IconShieldCheck,
  IconStar,
  IconTv,
  IconZap,
} from "./Icons";
import { Reveal } from "./motion";

/* =========================================================================
   مشغّل اشتراكك الشخصي — Xtream Codes + ملفات M3U
   يدخل كل مشترك ببيانات اشتراكه (السيرفر + المستخدم + كلمة السر)
   و يشاهد قنوات باقته مباشرة على الموقع — مثل IPTV Smarters لكن بتصميمك
   البيانات تُحفظ في متصفح المشترك فقط (localStorage) ولا تُرسل لأي جهة أخرى

   منطق هذا القسم كامل في src/lib/xtream.mjs (دوال خالصة مُختبَرة في
   scripts/test-xtream.mjs) وهذا الملف للواجهة فقط:
   • تعدد الحسابات مع تبديل فوري
   • مفضلة وسجل مشاهدة لكل حساب على حدة (لا تختلط بين مزودين)
   • بحث عربي موحّد يعمل على كل القنوات في كل التصنيفات
   • قائمة قنوات افتراضية (Virtual) بلا سقف 300 قناة
   • اختيار الجودة وصورة داخل صورة وملء الشاشة
   • تقرير تشخيص ورمز مشاركة للدعم الفني بلا كلمة سر

   لماذا مسارات متعددة؟
   • بعض اللوحات لا ترسل CORS → يحجب المتصفح الاتصال المباشر
   • بعض اللوحات محمية بـ WAF يحجب الوسطاء
   • الحل الشامل: تنزيل ملف القنوات (M3U) مباشرة من السيرفر ثم رفعه
     — لا يحتاج CORS إطلاقاً ويعرض كل القنوات
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

type Phase = "form" | "loading" | "ready" | "error";

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

  /* بيانات القنوات */
  const [categories, setCategories] = useState<Category[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [selectedCat, setSelectedCat] = useState<string>("");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<TabId>("all");

  /* المفضلة وسجل المشاهدة — لكل حساب على حدة */
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recents, setRecents] = useState<string[]>([]);

  /* التشغيل */
  const [playing, setPlaying] = useState<Stream | null>(null);
  const [playError, setPlayError] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [bufferSec, setBufferSec] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [levels, setLevels] = useState<{ index: number; label: string }[]>([]);
  const [levelIndex, setLevelIndex] = useState(-1);
  const [pipOn, setPipOn] = useState(false);

  /* القائمة الافتراضية */
  const [listScrollTop, setListScrollTop] = useState(0);
  const [viewHeight, setViewHeight] = useState(620);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  /* ذاكرة الجلسة لمسار البث الناجح (مثل needsProxySession في صفحة البث المباشر) */
  const preferredStreamModeRef = useRef<XtreamMode | null>(null);

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

  /* تحميل مفضلة/سجل الحساب الحالي عند تبديل الحساب أو المصدر */
  useEffect(() => {
    setFavorites(loadProfileList(storage, FAVORITES_KEY, profile));
    setRecents(loadProfileList(storage, RECENTS_KEY, profile));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

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
  }, [phase]);

  /* تصفير التمرير عند تغيير البحث أو التصنيف أو التبويب */
  useEffect(() => {
    setListScrollTop(0);
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [tab, search, selectedCat, streams]);

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

      /* ✅ نجح الدخول بهذا المسار — نجلب التصنيفات والقنوات */
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
          ? (strR.data as { stream_id: number; name: string; stream_icon: string; category_id: string }[])
          : []
      ).map((s) => ({
        id: Number(s.stream_id),
        name: String(s.name),
        icon: String(s.stream_icon || ""),
        catId: String(s.category_id || ""),
      }));

      log.push({
        mode: mode.id,
        label: mode.label,
        status: "ok",
        note: `نجح الاتصال — ${catList.length} تصنيف و ${streamList.length} قناة`,
      });

      const expTs = data.user_info.exp_date ? Number(data.user_info.exp_date) : null;

      setActiveMode(mode);
      setAccount(normAcc);
      setUserInfo({
        status: String(data.user_info.status || ""),
        expDate: expTs
          ? new Date(expTs * 1000).toLocaleDateString("ar-EG", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })
          : null,
        expTs: expTs && Number.isFinite(expTs) ? expTs : null,
        maxConnections: String(data.user_info.max_connections || "-"),
        isTrial: String(data.user_info.is_trial) === "1",
        activeConnections: String(
          data.user_info.active_cons || data.user_info.active_connections || "0"
        ),
      });
      setSource("xtream");
      setCategories(catList);
      setStreams(streamList);
      setSelectedCat(""); /* نعرض «الكل» افتراضياً */
      setSearch("");
      setTab("all");
      setPlaying(null);
      setDiag(log);
      setPhase("ready");

      /* حفظ الحساب في القائمة (وقائمة الحسابات القديمة للتوافق) */
      const nextAccounts = upsertAccount(accounts, normAcc);
      setAccounts(nextAccounts);
      saveJSON(storage, ACCOUNTS_KEY, nextAccounts);
      saveJSON(storage, STORAGE_KEY, normAcc);
      setProfile(profileKeyFor(normAcc));
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
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    setPlaying(null);
    setLevels([]);
    setLevelIndex(-1);
    setPlayError("");
    setStatusMsg("");
    setBufferSec(0);
    preferredStreamModeRef.current = null;
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
    setPlaying(null);
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
    setFavorites([]);
    setRecents([]);
    setSelectedCat("");
    setSearch("");
    setTab("all");
    setDiag([]);
    setM3uName("");
    setSource("xtream");
    setProfile(profileKeyFor(null, ""));
    setPhase("form");
  }

  /* مراقبة صحة التخزين المؤقت (Buffer) في الوقت الفعلي — مطابق لصفحة البث المباشر */
  useEffect(() => {
    const interval = window.setInterval(() => {
      const v = videoRef.current;
      if (v && v.buffered.length > 0) {
        try {
          const current = v.currentTime;
          const end = v.buffered.end(v.buffered.length - 1);
          const diff = Math.max(0, end - current);
          setBufferSec(Math.round(diff * 10) / 10);
        } catch {
          /* تجاهل */
        }
      } else {
        setBufferSec(0);
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  /* ============ التشغيل: قائمة روابط مرشحة (مباشر + Worker + Proxy) مع سقوط تلقائي ============ */
  useEffect(() => {
    const video = videoRef.current;
    if (!playing || !video) return;

    setPlayError("");
    setStatusMsg("");
    setBufferSec(0);
    setLevels([]);
    setLevelIndex(-1);
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    /* بناء الروابط المرشحة حسب المصدر — المباشر ثم Cloudflare Worker ثم بروكسي /proxy.php
       وأخيراً مرشح native (وسم الفيديو مباشرة دون CORS — يعمل على سفاري وملفات ts) */
    interface PlayCandidate {
      url: string;
      native: boolean;
      mode?: XtreamMode;
      label: string;
    }
    let candidates: PlayCandidate[] = [];

    if (playing.url) {
      /* مصدر ملف M3U: يستخدم المباشر + Worker + /proxy.php */
      const urls = m3uCandidates(playing.url, {
        proxyBase: workerBase,
        phpProxy: PHP_PROXY,
        isHttpsSite: typeof window === "undefined" ? true : window.location.protocol === "https:",
      });
      candidates = [
        ...urls.map((u) => ({
          url: u,
          native: false,
          label: u.includes(PHP_PROXY)
            ? "بروكسي البث المباشر"
            : u.startsWith(workerBase)
              ? "وسيط Worker"
              : "اتصال مباشر",
        })),
        { url: urls[0] ?? playing.url, native: true, label: "تشغيل أصلي مباشر" },
      ];
    } else if (account) {
      /* مصدر xtream: المسار الناجح للبث أولاً، ثم بقية المسارات (Worker + /proxy.php)، وأخيراً native */
      const firstMode = preferredStreamModeRef.current ?? activeMode;
      const ordered = [firstMode, ...modes.filter((m) => m.id !== firstMode.id)];
      const direct = ordered.find((m) => m.id === "direct-https") ?? ordered[0];
      candidates = [
        ...ordered.map((m) => ({
          url: liveStreamUrl(m.base(account.host), account.username, account.password, playing.id),
          native: false,
          mode: m,
          label: m.label,
        })),
        {
          url: liveStreamUrl(direct.base(account.host), account.username, account.password, playing.id),
          native: true,
          mode: direct,
          label: `${direct.label} (أصلي)`,
        },
      ];
    }
    if (candidates.length === 0) return;

    let attempt = 0;
    let cancelled = false;
    let watchdog: number | undefined;
    let nativeHandler: (() => void) | null = null;
    /* hls.js تُحمَّل عند أول تشغيل فقط (توفير ~460KB على كل زيارة) */
    let HlsLib: typeof Hls | null = null;
    let hlsLoadFailed = false;

    const clearWatchdog = () => {
      if (watchdog !== undefined) {
        window.clearTimeout(watchdog);
        watchdog = undefined;
      }
    };
    const detachNative = () => {
      if (nativeHandler) {
        video.removeEventListener("error", nativeHandler);
        nativeHandler = null;
      }
    };

    const tryNext = () => {
      if (cancelled) return;
      detachNative();
      clearWatchdog();

      if (attempt >= candidates.length) {
        setStatusMsg("");
        setPlayError("تعذر تشغيل القناة عبر كل المسارات — جرّب قناة أخرى أو أعد المحاولة بعد لحظات.");
        return;
      }
      const cand = candidates[attempt];
      const isHlsUrl = isHlsCandidateUrl(cand.url);
      const wantsHls = !cand.native && isHlsUrl && !hlsLoadFailed;

      setStatusMsg(
        attempt === 0
          ? `⚡ جاري الاتصال بسيرفر القناة (${cand.label})…`
          : `🔄 جاري التبديل تلقائياً إلى ${cand.label} (${attempt + 1}/${candidates.length})…`
      );

      /* أول تشغيل: نحمّل المكتبة ثم نعيد المحاولة بنفس المرشّح بدون استهلاكه */
      if (wantsHls && !HlsLib) {
        loadHls()
          .then((lib) => {
            if (cancelled) return;
            HlsLib = lib;
            tryNext();
          })
          .catch(() => {
            if (cancelled) return;
            hlsLoadFailed = true; /* فشل تحميل المكتبة → نكمل بالتشغيل الأصلي */
            tryNext();
          });
        /* لو تعطّل تحميل المكتبة نفسه، لا نترك الزائر ينتظر بلا نهاية */
        watchdog = window.setTimeout(() => {
          if (cancelled || HlsLib || hlsLoadFailed) return;
          hlsLoadFailed = true;
          tryNext();
        }, 10000);
        return;
      }

      attempt++; /* استهلكنا هذا المرشّح */

      if (wantsHls && HlsLib?.isSupported()) {
        let mediaRecovered = false;
        /* إعدادات مشغل البث المباشر الفائقة السرعة (Web Worker + Low Latency + Buffer) */
        const hls = new HlsLib({
          enableWorker: true,
          startFragPrefetch: true,
          lowLatencyMode: true,
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          backBufferLength: 30,
          liveSyncDurationCount: 3,
          liveMaxLatencyDurationCount: 6,
          fragLoadingTimeOut: 15000,
          manifestLoadingTimeOut: 10000,
          levelLoadingTimeOut: 10000,
          autoStartLoad: true,
          capLevelToPlayerSize: false,
        });
        hlsRef.current = hls;
        hls.loadSource(cand.url);
        hls.attachMedia(video);
        hls.on(HlsLib.Events.MANIFEST_PARSED, () => {
          clearWatchdog();
          setStatusMsg("");
          /* حفظ المسار الناجح للجلسة حتى تعمل القنوات التالية فوراً عبر نفس الـWorker أو الـProxy */
          if (cand.mode) {
            preferredStreamModeRef.current = cand.mode;
            setActiveMode(cand.mode);
          }
          /* مستويات الجودة المتاحة من السيرفر — تُعرض في قائمة اختيار الجودة */
          setLevels(
            hls.levels.map((level, index) => ({
              index,
              label: level.height ? `${level.height}p` : level.name || `جودة ${index + 1}`,
            }))
          );
          setLevelIndex(-1);
          video.muted = isMuted;
          video.play().catch(() => {
            video.muted = true;
            setIsMuted(true);
            video.play().catch(() => {
              /* سيضغط المستخدم زر التشغيل */
            });
          });
        });
        hls.on(HlsLib.Events.AUDIO_TRACKS_UPDATED, (_event, data) => {
          if (data.audioTracks && data.audioTracks.length > 0 && hls.audioTrack === -1) {
            hls.audioTrack = 0;
          }
        });
        hls.on(HlsLib.Events.LEVEL_SWITCHED, (_e, data) => {
          /* -1 = تلقائي (يختار hls.js الأفضل حسب سرعة الشبكة) */
          if (typeof data?.level === "number" && data.level >= 0) {
            setLevelIndex((prev) => (prev === -1 ? prev : data.level));
          }
        });
        hls.on(HlsLib.Events.ERROR, (_e, data) => {
          if (data.fatal) {
            if (data.type === HlsLib?.ErrorTypes.MEDIA_ERROR && !mediaRecovered) {
              mediaRecovered = true;
              setStatusMsg("جاري تصحيح البث…");
              hls.recoverMediaError();
              return;
            }
            hls.destroy();
            if (hlsRef.current === hls) hlsRef.current = null;
            tryNext();
          }
        });
        watchdog = window.setTimeout(() => {
          if (cancelled) return;
          hls.destroy();
          if (hlsRef.current === hls) hlsRef.current = null;
          tryNext();
        }, 12000);
      } else {
        /* تشغيل أصلي في وسم الفيديو (سفاري / الجوال / ملفات ts) — لا يحتاج CORS */
        video.src = cand.url;
        video.load();
        video.muted = isMuted;
        video.play().catch(() => {
          video.muted = true;
          setIsMuted(true);
          video.play().catch(() => {
            /* تجاهل */
          });
        });
        setLevels([]);
        nativeHandler = () => tryNext();
        video.addEventListener("error", nativeHandler);
        video.onplaying = () => {
          clearWatchdog();
          setStatusMsg("");
          if (cand.mode) {
            preferredStreamModeRef.current = cand.mode;
            setActiveMode(cand.mode);
          }
        };
        watchdog = window.setTimeout(() => {
          if (!cancelled && video.readyState < 2) tryNext();
        }, 12000);
      }
    };

    tryNext();

    return () => {
      cancelled = true;
      detachNative();
      clearWatchdog();
      video.onplaying = null;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, account]);

  /* ============ التصفية والعرض ============ */

  const visibleStreams = useMemo(
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

  const range = windowRange({
    scrollTop: listScrollTop,
    itemHeight: LIST_ITEM_HEIGHT,
    viewportHeight: viewHeight,
    total: visibleStreams.length,
    overscan: LIST_OVERSCAN,
  });
  const page = visibleStreams.slice(range.start, range.end);

  const handleListScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setListScrollTop(e.currentTarget.scrollTop);
  }, []);

  const daysLeft = userInfo?.expTs ? daysUntil(userInfo.expTs) : null;

  function playStream(stream: Stream) {
    setPlaying(stream);
    setRecentsAndSave(pushRecent(recents, streamKey(stream)));
  }

  /* أزرار المشغل: جودة، صورة داخل صورة، ملء الشاشة */
  const canPip = typeof document !== "undefined" && document.pictureInPictureEnabled === true;

  function changeLevel(value: number) {
    setLevelIndex(value);
    if (hlsRef.current) hlsRef.current.currentLevel = value;
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
    const video = videoRef.current;
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
            مشترك بالفعل؟ أدخل بيانات اشتراكك (السيرفر + اسم المستخدم + كلمة السر) وشاهد قنواتك
            كاملة من هنا مباشرة — بياناتك تُحفظ على جهازك فقط ولا تصل لأي طرف آخر.
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
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 border border-white/20 hover:border-[#ff5c4d] hover:text-[#ff8a7d] text-white/70 font-black text-[13px] px-4 py-2 rounded-full transition cursor-pointer"
              >
                <IconClose className="w-3.5 h-3.5" /> خروج وحذف البيانات
              </button>
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

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* المشغل */}
              <div className="lg:col-span-8 flex flex-col gap-4">
                <div
                  ref={stageRef}
                  className="relative rounded-[24px] overflow-hidden border border-white/10 bg-black shadow-2xl"
                >
                  <div className="relative aspect-video w-full bg-black">
                    <video
                      ref={videoRef}
                      controls
                      playsInline
                      preload="auto"
                      className="w-full h-full object-contain bg-black"
                      onVolumeChange={() => {
                        if (videoRef.current) {
                          setIsMuted(videoRef.current.muted);
                        }
                      }}
                    />

                    {!playing && (
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
                    )}

                    {statusMsg && !playError && (
                      <div
                        data-testid="stream-status"
                        className="absolute top-4 inset-x-0 mx-auto w-fit max-w-[90%] glass-dark text-[#d8ff3e] border border-white/15 text-xs font-bold px-4 py-1.5 rounded-full text-center z-20 animate-pulse-soft pointer-events-none"
                      >
                        {statusMsg}
                      </div>
                    )}

                    {playError && (
                      <div className="absolute top-4 inset-x-0 mx-auto w-fit max-w-[90%] bg-[#ff5c4d]/90 text-white text-xs font-black px-4 py-2 rounded-full text-center z-20">
                        {playError}
                      </div>
                    )}

                    {playing && isMuted && !playError && (
                      <button
                        type="button"
                        data-testid="unmute-button"
                        onClick={() => {
                          if (videoRef.current) {
                            videoRef.current.muted = false;
                            setIsMuted(false);
                          }
                        }}
                        className="absolute top-4 end-4 z-20 bg-[#d8ff3e] hover:bg-white text-black font-black text-xs px-3.5 py-1.5 rounded-full shadow-xl transition-all animate-pulse-soft cursor-pointer"
                      >
                        🔊 اضغط لتشغيل الصوت
                      </button>
                    )}

                    {playing && (
                      <div className="absolute top-4 start-4 flex items-center gap-2 pointer-events-none z-10">
                        <div className="glass-dark border border-white/15 px-3.5 py-1.5 rounded-xl flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#ff5c4d] animate-pulse-soft" />
                          <span className="text-[13px] font-black">{playing.name}</span>
                        </div>
                        {bufferSec > 0 && (
                          <span
                            data-testid="buffer-badge"
                            className="bg-[#0b0b0f]/80 text-[#3effe0] text-[10.5px] font-black px-2.5 py-1 rounded-full backdrop-blur-md border border-[#3effe0]/30"
                          >
                            ⚡ بافر: {bufferSec}s
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

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

                {/* ملاحظة سريعة */}
                <div className="rounded-2xl bg-white/[0.05] border border-white/10 px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
                  <p className="text-[12.5px] font-bold text-white/50">
                    الصوت مكتوم تلقائياً حسب سياسة المتصفحات — اضغط زر الصوت في المشغل لتشغيله.
                  </p>
                  <a
                    href="#pricing"
                    className="text-[12.5px] font-black text-[#d8ff3e] hover:text-white transition underline underline-offset-4"
                  >
                    ترقية أو تجديد الباقة ←
                  </a>
                </div>
              </div>

              {/* لوحة القنوات */}
              <div className="lg:col-span-4 rounded-[24px] bg-white text-[#0b0b0f] overflow-hidden shadow-2xl flex flex-col h-[620px]">
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
                        onClick={() => {
                          setSelectedCat(c.id);
                          setSearch("");
                        }}
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
                  {visibleStreams.length === 0 ? (
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
                    {visibleStreams.length.toLocaleString("en-US")} قناة معروضة
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
              </div>
            </div>

            {/* شريط ثقة + تقرير فني */}
            <div className="mt-8 space-y-4">
              <div className="flex flex-wrap items-center justify-center gap-3 text-[12.5px] font-bold text-white/50">
                <span className="inline-flex items-center gap-2 bg-white/[0.06] border border-white/10 rounded-full px-4 py-2">
                  <IconShieldCheck className="w-4 h-4 text-[#3effe0]" /> بياناتك محفوظة على جهازك
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
    </section>
  );
}

/* المكوّن لا يستقبل أي props — نلفّه بـ memo حتى لا يُعاد رسمه
   (وقطع البث) عند أي تغيير في حالة الصفحة مثل تبديل العملة أو فتح السلة. */
const XtreamPlayer = memo(XtreamPlayerInner);
export default XtreamPlayer;
