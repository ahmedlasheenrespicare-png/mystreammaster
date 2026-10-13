import { memo, useEffect, useMemo, useRef, useState } from "react";
import type Hls from "hls.js";
import { loadHls } from "../hls";
import { PROXY_BASE } from "../config";
import {
  IconArrowUp,
  IconArrowUpRight,
  IconCheck,
  IconChevronDown,
  IconClose,
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

   لماذا مسارات متعددة؟
   • بعض اللوحات لا ترسل CORS → يحجب المتصفح الاتصال المباشر
   • بعض اللوحات محمية بـ WAF يحجب الوسطاء
   • الحل الشامل: تنزيل ملف القنوات (M3U) مباشرة من السيرفر ثم رفعه
     — لا يحتاج CORS إطلاقاً ويعرض كل القنوات
========================================================================== */

const STORAGE_KEY = "smp-xtream-account";

/* ========================================================================= */
/*  الأنواع                                                                   */
/* ========================================================================= */

type ModeId = "direct-https" | "direct-http" | "proxy-https" | "proxy-http" | "m3u";

interface Mode {
  id: ModeId;
  label: string;
  base: (h: string) => string;
}

interface XtreamAccount {
  host: string; /* بدون بروتوكول — مثل nv2live.com أو 1.2.3.4:25461 */
  username: string;
  password: string;
}

interface UserInfo {
  status: string;
  expDate: string | null;
  maxConnections: string;
  isTrial: boolean;
  activeConnections: string;
}

interface Category {
  id: string;
  name: string;
}

interface Stream {
  id: number;
  name: string;
  icon: string;
  catId: string;
  url?: string; /* موجود في مصدر ملفات M3U فقط */
}

interface DiagEntry {
  mode: string;
  label: string;
  status: "ok" | "fail" | "skip";
  note: string;
}

type Phase = "form" | "loading" | "ready" | "error";

/* ========================================================================= */
/*  أدوات مساعدة                                                              */
/* ========================================================================= */

/* تنقية المدخلات: المستخدم قد يلصق http://host:port/ أو host فقط أو رابط get.php كامل */
function normalizeHost(raw: string): string {
  return raw
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+.*$/, "")
    .replace(/\/+$/, "")
    .replace(/^:+/, "");
}

/* المسارات المتاحة — نتجنب المسارات المستحيلة تقنياً */
function availableModes(): Mode[] {
  const modes: Mode[] = [
    { id: "direct-https", label: "مباشر HTTPS", base: (h) => `https://${h}` },
    { id: "proxy-https", label: "وسيط HTTPS", base: (h) => `${PROXY_BASE}/h/${h}` },
    { id: "proxy-http", label: "وسيط HTTP", base: (h) => `${PROXY_BASE}/x/${h}` },
  ];
  /* الاتصال http المباشر من صفحة https مستحيل (Mixed Content) — نضيفه فقط لو الصفحة نفسها http */
  if (typeof window !== "undefined" && window.location.protocol === "http:") {
    modes.splice(1, 0, {
      id: "direct-http",
      label: "مباشر HTTP",
      base: (h) => `http://${h}`,
    });
  }
  return modes;
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

/* رسالة خطأ ذكية حسب نوع الفشل */
function composeFailMsg(entries: DiagEntry[]): string {
  const direct = entries.filter((e) => e.mode.startsWith("direct"));
  const proxies = entries.filter((e) => e.mode.startsWith("proxy"));
  const corsBlocked =
    direct.length > 0 && direct.every((e) => /CORS|مهلة/.test(e.note));
  const wafBlocked = proxies.some((e) =>
    /HTTP 403|HTTP 429|HTTP 52\d|مهلة/.test(e.note)
  );

  if (corsBlocked && wafBlocked) {
    return "هذا المزود يحجب التشغيل من داخل المواقع: يمنع الاتصال المباشر (CORS) ويحجب الوسطاء. الحل المضمون: اضغط «نزّل ملف قنواتك» بالأسفل ثم ارفعه — أو تأكد أن رابط السيرفر مطابق تماماً لما أعطاه المزود (قد يحتوي رقماً مثل :8080).";
  }
  if (corsBlocked) {
    return "المتصفح حجب الاتصال المباشر بالسيرفر (CORS) — كثير من المزودين يفعلون ذلك. جرّب زر «نزّل ملف قنواتك» بالأسفل ثم ارفعه، فهو يعمل مع أغلب المزودين.";
  }
  if (entries.every((e) => /مهلة/.test(e.note))) {
    return "لا استجابة من السيرفر خلال المهلة — تأكد من صحة الرابط (قد يكون السيرفر متوقفاً مؤقتاً) ثم أعد المحاولة.";
  }
  return "تعذر الاتصال بالسيرفر بعد تجربة كل المسارات — انسخ «تقرير التشخيص» بالأسفل وأرسله لنا لنحدد السبب بالضبط.";
}

/* تحليل ملف M3U → قنوات + تصنيفات (group-title) */
function parseM3U(text: string): { categories: Category[]; streams: Stream[] } {
  const lines = text.split(/\r?\n/);
  const streams: Stream[] = [];
  const groups = new Map<string, number>();
  let pending: { name: string; icon: string; group: string } | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("#EXTINF:")) {
      const name = line.slice(line.lastIndexOf(",") + 1).trim() || "قناة";
      const icon = /tvg-logo="([^"]*)"/.exec(line)?.[1] ?? "";
      const group = (/group-title="([^"]*)"/.exec(line)?.[1] ?? "").trim() || "قنواتي";
      pending = { name, icon, group };
    } else if (pending && !line.startsWith("#")) {
      streams.push({
        id: streams.length + 1,
        name: pending.name,
        icon: pending.icon,
        catId: pending.group,
        url: line,
      });
      groups.set(pending.group, (groups.get(pending.group) ?? 0) + 1);
      pending = null;
    }
  }

  const categories: Category[] = [...groups.keys()]
    .map((name) => ({ id: name, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "ar"));

  return { categories, streams };
}

/* روابط التشغيل المرشحة لمصدر M3U:
   نسخة m3u8 أولاً (تعمل مع hls.js) ثم الأصلية ثم عبر الوسيط —
   مع ترقية http→https لأن الصفحة https (وإلا حجبها المتصفح فوراً) */
function m3uCandidates(rawUrl: string): string[] {
  const list: string[] = [];
  const push = (u: string) => {
    if (u && !list.includes(u)) list.push(u);
  };
  const isHttpsSite =
    typeof window !== "undefined" && window.location.protocol === "https:";
  const url = rawUrl.trim();
  const isHls = /\.m3u8($|\?)/i.test(url);
  const isTs = /\.ts($|\?)/i.test(url);
  const https = (u: string) => u.replace(/^http:\/\//i, "https://");

  /* روابط ts بنمط xtream لها نسخة m3u8 مكافئة على نفس السيرفر */
  const hlsVariant = isTs && /\/live\//.test(url)
    ? url.replace(/\.ts($|\?)/i, ".m3u8$1")
    : isHls
      ? url
      : "";

  if (hlsVariant) {
    push(isHttpsSite ? https(hlsVariant) : hlsVariant);
    push(hlsVariant);
    push(`${PROXY_BASE}/?u=${encodeURIComponent(hlsVariant)}`);
  }
  push(isHttpsSite ? https(url) : url);
  push(url);
  push(`${PROXY_BASE}/?u=${encodeURIComponent(url)}`);
  return list;
}

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

/* ========================================================================= */
/*  صندوق التشخيص الفني — يظهر في كل الحالات لمعرفة ماذا حدث بالضبط           */
/* ========================================================================= */

function DiagBox({
  entries,
  report,
  tone,
}: {
  entries: DiagEntry[];
  report: string;
  tone: "light" | "dark";
}) {
  const [copied, setCopied] = useState(false);
  if (entries.length === 0) return null;

  const light = tone === "light";

  return (
    <details
      className={`rounded-2xl border text-right ${
        light ? "border-black/10 bg-black/[0.03]" : "border-white/10 bg-white/[0.04]"
      }`}
    >
      <summary
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
        <button
          type="button"
          onClick={() => {
            copyText(report)
              .then(() => {
                setCopied(true);
                window.setTimeout(() => setCopied(false), 2500);
              })
              .catch(() => {});
          }}
          className={`text-[12px] font-black px-4 py-2 rounded-full transition cursor-pointer ${
            copied
              ? "bg-[#3effe0] text-black"
              : light
                ? "bg-black text-white hover:bg-[#2b4eff]"
                : "bg-white/10 text-white hover:bg-[#d8ff3e] hover:text-black"
          }`}
        >
          {copied ? "تم النسخ ✓ الصقه لنا في رسالة" : "نسخ التقرير كاملاً"}
        </button>
      </div>
    </details>
  );
}

/* ========================================================================= */
/*  المكوّن الرئيسي                                                            */
/* ========================================================================= */

function XtreamPlayerInner() {
  /* حالة الدخول */
  const [phase, setPhase] = useState<Phase>("form");
  const [account, setAccount] = useState<XtreamAccount | null>(null);
  const [activeMode, setActiveMode] = useState<Mode>({
    id: "direct-https",
    label: "مباشر HTTPS",
    base: (h) => `https://${h}`,
  });
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [diag, setDiag] = useState<DiagEntry[]>([]);

  /* مصدر البيانات: بيانات xtream أم ملف m3u */
  const [source, setSource] = useState<"xtream" | "m3u">("xtream");
  const [m3uName, setM3uName] = useState("");

  /* بيانات القنوات */
  const [categories, setCategories] = useState<Category[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [selectedCat, setSelectedCat] = useState<string>("");
  const [search, setSearch] = useState("");

  /* التشغيل */
  const [playing, setPlaying] = useState<Stream | null>(null);
  const [playError, setPlayError] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  /* استرجاع الجلسة المحفوظة عند فتح الصفحة */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const acc = JSON.parse(saved) as XtreamAccount;
        if (acc.host && acc.username && acc.password) {
          setAccount(acc);
          setPhase("loading");
        }
      }
    } catch {
      /* تجاهل */
    }
  }, []);

  /* تسجيل الدخول التلقائي عند وجود حساب */
  useEffect(() => {
    if (phase === "loading" && account) {
      login(account);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, account]);

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
    const modes = availableModes();
    const log: DiagEntry[] = [];

    for (const mode of modes) {
      const authUrl = `${mode.base(host)}/player_api.php?username=${encodeURIComponent(
        normAcc.username
      )}&password=${encodeURIComponent(normAcc.password)}`;

      const auth = await fetchJson(authUrl, 12000);
      if (!auth.ok) {
        log.push({ mode: mode.id, label: mode.label, status: "fail", note: auth.err });
        continue;
      }

      const data = auth.data as
        | { user_info?: Record<string, unknown> }
        | null;
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
        fetchJson(`${authUrl}&action=get_live_categories`, 20000),
        fetchJson(`${authUrl}&action=get_live_streams`, 45000),
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

      const catList: Category[] = (
        Array.isArray(catR.data) ? (catR.data as { category_id: string; category_name: string }[]) : []
      )
        .map((c) => ({ id: String(c.category_id), name: String(c.category_name) }))
        .sort((a, b) => a.name.localeCompare(b.name, "ar"));

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

      setActiveMode(mode);
      setAccount(normAcc);
      setUserInfo({
        status: String(data.user_info.status || ""),
        expDate: data.user_info.exp_date
          ? new Date(Number(data.user_info.exp_date) * 1000).toLocaleDateString("ar-EG", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })
          : null,
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
      setPlaying(null);
      setDiag(log);
      setPhase("ready");

      /* حفظ الجلسة للمرة القادمة */
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(normAcc));
      } catch {
        /* تجاهل */
      }
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPhase("loading");
  }

  /* ============ مسار ملف M3U: تنزيل من السيرفر ثم رفع ============ */

  /* يفتح رابط get.php في تبويب جديد — تنزيل مباشر لا يمنعه CORS */
  function downloadPlaylist() {
    if (!account) return;
    const host = normalizeHost(account.host);
    if (!host || !account.username || !account.password) return;
    const scheme = /^http:\/\//i.test(account.host.trim()) ? "http" : "https";
    const url = `${scheme}://${host}/get.php?username=${encodeURIComponent(
      account.username
    )}&password=${encodeURIComponent(account.password)}&type=m3u_plus&output=hls`;
    window.open(url, "_blank", "noopener");
  }

  function handleM3UFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseM3U(String(reader.result || ""));
      if (parsed.streams.length === 0) {
        setErrorMsg(
          "لم نجد قنوات صالحة داخل هذا الملف — تأكد أنه ملف قنوات M3U (أول سطر فيه #EXTM3U)."
        );
        return;
      }
      setErrorMsg("");
      setSource("m3u");
      setM3uName(file.name);
      setUserInfo(null);
      setCategories(parsed.categories);
      setStreams(parsed.streams);
      setSelectedCat("");
      setSearch("");
      setPlaying(null);
      setDiag([
        {
          mode: "m3u",
          label: "ملف قنوات",
          status: "ok",
          note: `تم تحميل الملف «${file.name}» — ${parsed.categories.length} تصنيف و ${parsed.streams.length} قناة`,
        },
      ]);
      setPhase("ready");
    };
    reader.onerror = () => {
      setErrorMsg("تعذر قراءة الملف — جرّب مرة أخرى.");
    };
    reader.readAsText(file);
  }

  function handleLogout() {
    localStorage.removeItem(STORAGE_KEY);
    setAccount(null);
    setUserInfo(null);
    setCategories([]);
    setStreams([]);
    setPlaying(null);
    setSelectedCat("");
    setSearch("");
    setDiag([]);
    setM3uName("");
    setSource("xtream");
    setPhase("form");
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  }

  /* ============ التشغيل: قائمة روابط مرشحة مع سقوط تلقائي ============ */
  useEffect(() => {
    const video = videoRef.current;
    if (!playing || !video) return;

    setPlayError("");
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    /* بناء الروابط المرشحة حسب المصدر — ومرشح أخير native (وسم الفيديو
       مباشرة دون CORS — يعمل على سفاري وكروم الحديث وملفات ts) */
    interface PlayCandidate {
      url: string;
      native: boolean;
    }
    let candidates: PlayCandidate[] = [];

    if (playing.url) {
      /* مصدر ملف M3U */
      const urls = m3uCandidates(playing.url);
      candidates = [
        ...urls.map((u) => ({ url: u, native: false })),
        { url: urls[0] ?? playing.url, native: true },
      ];
    } else if (account) {
      /* مصدر xtream: المسار الناجح أولاً ثم البقية، وأخيراً native مباشر */
      const modes = [activeMode, ...availableModes().filter((m) => m.id !== activeMode.id)];
      const liveUrl = (m: Mode) =>
        `${m.base(account.host)}/live/${encodeURIComponent(account.username)}/${encodeURIComponent(
          account.password
        )}/${playing.id}.m3u8`;
      const direct = modes.find((m) => m.id === "direct-https") ?? modes[0];
      candidates = [
        ...modes.map((m) => ({ url: liveUrl(m), native: false })),
        { url: liveUrl(direct), native: true },
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
        setPlayError("تعذر تشغيل القناة عبر كل المسارات — جرّب قناة أخرى أو أعد المحاولة بعد لحظات.");
        return;
      }
      const cand = candidates[attempt];
      const isHlsUrl = /\.m3u8($|\?)/i.test(cand.url);
      const wantsHls = !cand.native && isHlsUrl && !hlsLoadFailed;

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
        const hls = new HlsLib({
          enableWorker: true,
          manifestLoadingTimeOut: 12000,
          fragLoadingTimeOut: 20000,
        });
        hlsRef.current = hls;
        hls.loadSource(cand.url);
        hls.attachMedia(video);
        hls.on(HlsLib.Events.MANIFEST_PARSED, () => {
          clearWatchdog();
          video.muted = true;
          video.play().catch(() => {
            /* سيضغط المستخدم زر التشغيل */
          });
        });
        hls.on(HlsLib.Events.ERROR, (_e, data) => {
          if (data.fatal) {
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
        }, 15000);
      } else {
        /* تشغيل أصلي في وسم الفيديو (سفاري / الجوال / ملفات ts) — لا يحتاج CORS */
        video.src = cand.url;
        video.load();
        video.muted = true;
        video.play().catch(() => {
          /* تجاهل */
        });
        nativeHandler = () => tryNext();
        video.addEventListener("error", nativeHandler);
        video.onplaying = () => clearWatchdog();
        watchdog = window.setTimeout(() => {
          if (!cancelled && video.readyState < 2) tryNext();
        }, 15000);
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
  }, [playing, account, activeMode]);

  /* ============ تصفية القنوات ============ */
  const visibleStreams = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = streams;
    if (q) list = streams.filter((s) => s.name.toLowerCase().includes(q));
    else if (selectedCat) list = streams.filter((s) => s.catId === selectedCat);
    return list.slice(0, 300); /* سقف أمان للعرض */
  }, [streams, selectedCat, search]);

  /* تقرير التشخيص النصي (بدون كلمة السر أبداً) */
  const diagReport = useMemo(() => {
    const lines = [
      "— تقرير تشخيص مشغل الاشتراك —",
      `الوقت: ${new Date().toLocaleString("ar-EG")}`,
      `الصفحة: ${typeof window !== "undefined" ? window.location.href : "?"}`,
      `السيرفر: ${account?.host ?? "-"} | المستخدم: ${account?.username ?? "-"}` +
        (m3uName ? ` | ملف: ${m3uName}` : ""),
      `المتصفح: ${typeof navigator !== "undefined" ? navigator.userAgent : "?"}`,
      "",
      "المحاولات:",
      ...diag.map(
        (e) => `- [${e.mode}] ${e.label} → ${e.status === "ok" ? "نجح" : "فشل"}: ${e.note}`
      ),
      "",
      phase === "ready"
        ? `النتيجة: نجح — ${streams.length} قناة عبر «${source === "m3u" ? "ملف M3U" : activeMode.label}»`
        : `النتيجة: فشل — ${errorMsg}`,
    ];
    return lines.join("\n");
  }, [diag, account, m3uName, phase, streams.length, source, activeMode, errorMsg]);

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
        <Reveal variant="up" className="text-center max-w-[760px] mx-auto mb-12">
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

        {/* ============ نموذج الدخول ============ */}
        {phase === "form" || phase === "loading" ? (
          <Reveal variant="up" delay={100} className="max-w-[520px] mx-auto">
            <form
              onSubmit={handleSubmit}
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
                <div className="bg-[#ff5c4d]/10 border border-[#ff5c4d]/30 text-[#c0392b] rounded-2xl px-4 py-3 text-[13px] font-bold leading-relaxed">
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
                type="submit"
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
                    disabled={
                      !account?.host || !account?.username || !account?.password
                    }
                    className="flex items-center justify-center gap-2 py-3 rounded-full border-2 border-black/10 hover:border-[#0b0b0f] text-[13px] font-black text-black/70 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <IconArrowUpRight className="w-4 h-4" />
                    نزّل ملف قنواتك
                  </button>
                  <label className="flex items-center justify-center gap-2 py-3 rounded-full border-2 border-dashed border-black/15 hover:border-[#2b4eff] hover:text-[#2b4eff] text-[13px] font-black text-black/70 transition cursor-pointer">
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
                  الملف، وستظهر قنواتك فوراً.
                </p>
              </div>

              {diag.length > 0 && <DiagBox entries={diag} report={diagReport} tone="light" />}

              <p className="text-[11.5px] text-black/40 text-center font-medium leading-relaxed">
                بتسجيل الدخول تُحفظ بياناتك في متصفحك فقط (localStorage) — احذفها بزر «خروج» في أي
                وقت.
              </p>
            </form>
          </Reveal>
        ) : (
          /* ============ واجهة المشترك ============ */
          <div className="animate-scale-in">
            {/* شريط معلومات الحساب */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white/[0.05] border border-white/10 rounded-2xl px-5 py-4 mb-6">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="inline-flex items-center gap-1.5 bg-[#d8ff3e] text-black text-[12px] font-black px-3 py-1.5 rounded-full">
                  <IconCheck className="w-3.5 h-3.5" />
                  {source === "m3u" ? `ملف قنوات: ${m3uName}` : `متصل — ${activeMode.label}`}
                </span>
                {source === "xtream" && userInfo && (
                  <>
                    <span className="text-[12.5px] font-bold text-white/60">
                      ينتهي: <span className="text-white">{userInfo.expDate || "غير محدد"}</span>
                    </span>
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
                <div className="relative rounded-[24px] overflow-hidden border border-white/10 bg-black shadow-2xl">
                  <div className="relative aspect-video w-full bg-black">
                    <video
                      ref={videoRef}
                      controls
                      playsInline
                      className="w-full h-full object-contain bg-black"
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

                    {playError && (
                      <div className="absolute top-4 inset-x-0 mx-auto w-fit max-w-[90%] bg-[#ff5c4d]/90 text-white text-xs font-black px-4 py-2 rounded-full text-center">
                        {playError}
                      </div>
                    )}

                    {playing && (
                      <div className="absolute top-4 start-4 glass-dark border border-white/15 px-3.5 py-1.5 rounded-xl flex items-center gap-2 pointer-events-none">
                        <span className="w-2 h-2 rounded-full bg-[#ff5c4d] animate-pulse-soft" />
                        <span className="text-[13px] font-black">{playing.name}</span>
                      </div>
                    )}
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
                  <div className="relative">
                    <IconSearch className="w-4 h-4 absolute start-3.5 top-1/2 -translate-y-1/2 text-black/35" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="ابحث في كل القنوات…"
                      className="w-full rounded-full bg-white border border-black/10 ps-10 pe-3 py-2.5 text-[13px] font-medium placeholder:text-black/35 focus:border-[#2b4eff] focus:outline-none transition"
                    />
                  </div>
                  {/* تصنيفات */}
                  <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 text-[11px] font-bold">
                    <button
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

                {/* القنوات */}
                <div className="flex-1 overflow-y-auto p-2 no-scrollbar">
                  {visibleStreams.length === 0 ? (
                    <div className="p-8 text-center text-black/40 text-[13px] font-bold">
                      {search
                        ? `لا نتائج للبحث "${search}" — جرّب كلمة أخرى.`
                        : streams.length === 0
                          ? "لا توجد قنوات بعد."
                          : "لا توجد قنوات في هذا التصنيف — اختر «الكل»."}
                    </div>
                  ) : (
                    visibleStreams.map((ch) => {
                      const isActive = playing?.id === ch.id;
                      return (
                        <button
                          key={`${ch.catId}-${ch.id}`}
                          onClick={() => setPlaying(ch)}
                          className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-right transition-all cursor-pointer ${
                            isActive
                              ? "bg-[#2b4eff]/10 border border-[#2b4eff]/40"
                              : "border border-transparent hover:bg-black/[0.04]"
                          }`}
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
                      );
                    })
                  )}
                </div>

                {streams.length > 300 && (
                  <p className="px-4 py-2.5 text-[11px] font-bold text-black/40 border-t border-black/10">
                    يُعرض أول 300 قناة — استخدم البحث للوصول لأي قناة بالاسم.
                  </p>
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
                  <IconStar className="w-4 h-4 text-[#d8ff3e]" /> نفس بيانات تطبيق المشغل
                </span>
                <span className="inline-flex items-center gap-2 bg-white/[0.06] border border-white/10 rounded-full px-4 py-2">
                  <IconZap className="w-4 h-4 text-[#ff5c4d]" /> تبديل تلقائي بين مسارات الاتصال
                </span>
              </div>
              <DiagBox entries={diag} report={diagReport} tone="dark" />
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
