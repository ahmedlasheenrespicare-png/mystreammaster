/* ==========================================================================
   منطق مشغّل الاشتراك الشخصي — Xtream Codes + ملفات M3U
   --------------------------------------------------------------------------
   كل الدوال هنا «خالصة» (بلا DOM وبلا React) لتعمل في Node وفي المتصفح
   ولتُختبَر بلا شبكة:  node --test scripts/test-xtream.mjs

   حدود أمنية وخصوصية ثابتة في هذا الملف:
   • بيانات الدخول (المستخدم/كلمة السر) لا تُرسل لأي جهة تخصّنا عند الاتصال
     المباشر — وعند الحاجة لتجاوز حجب الشبكة/CORS يُستخدم نفس نظام الوسيط
     (Cloudflare Worker + بروكسي /proxy.php) الموجود في صفحة البث المباشر.
   • أي تقرير تشخيصي أو رمز مشاركة لا يحتوي كلمة السر أبداً، واسم المستخدم
     يُقنَّع قبل أي إخراج.
========================================================================== */

/* مفاتيح التخزين المحلي في متصفح المشترك */
export const STORAGE_KEY = "smp-xtream-account"; /* الجلسة القديمة (حساب واحد) — للتوافق */
export const ACCOUNTS_KEY = "smp-xtream-accounts"; /* قائمة الحسابات المحفوظة */
export const FAVORITES_KEY = "smp-xtream-favorites";
export const RECENTS_KEY = "smp-xtream-recents";

export const MAX_ACCOUNTS = 8;
export const MAX_RECENTS = 20;

/* ثوابت قائمة القنوات الافتراضية (Virtual list) */
export const LIST_ITEM_HEIGHT = 58;
export const LIST_OVERSCAN = 6;

export const SHARE_TOKEN_PREFIX = "SMP1";

/* ثوابت الوسيط والبروكسي — مطابقة لصفحة البث المباشر (LivePlayer) */
export const PHP_PROXY = "/proxy.php";
export const PROXY_SESSION_KEY = "smp-proxy";
export const OWNED_PROXY_PATTERN =
  /^https:\/\/[a-z0-9-]+\.(ahmedlasheenrespicare\.workers\.dev|ahmedlasheenrespicare-png\.deno\.net)$/i;
export const NGROK_HOST_RE = /(^|\.)ngrok(-free)?\.(dev|app|io|com)$/i;

/* ========================================================================= */
/*  أدوات الوسيط (Worker + Proxy) المشتركة مع صفحة البث المباشر                */
/* ========================================================================= */

/* التحقق من أن رابط الوسيط الممرّر في ?proxy= يخصّ نطاقاتنا الموثوقة فقط */
export function isTrustedProxy(value) {
  return OWNED_PROXY_PATTERN.test(String(value ?? "").trim().replace(/\/+$/, ""));
}

/* كشف روابط نفق ngrok (تحتاج التمرير عبر الوسيط لتجاوز صفحة التحذير) */
export function isNgrokUrl(url) {
  try {
    return NGROK_HOST_RE.test(new URL(String(url ?? "").trim()).hostname);
  } catch {
    return false;
  }
}

/* استخراج رابط الـWorker الفعّال (يدعم ?proxy=https://xxx.workers.dev وحفظه في الجلسة) */
export function resolveWorkerBase({ proxyBase = "", search = "", session = null } = {}) {
  const fallback = String(proxyBase ?? "").trim().replace(/\/+$/, "");
  try {
    const p = new URLSearchParams(String(search ?? "")).get("proxy");
    if (p && isTrustedProxy(p)) {
      const clean = p.trim().replace(/\/+$/, "");
      try {
        session?.setItem?.(PROXY_SESSION_KEY, clean);
      } catch {
        /* بيئة بدون sessionStorage — تجاهل */
      }
      return clean;
    }
    const saved = session?.getItem?.(PROXY_SESSION_KEY);
    if (saved && isTrustedProxy(saved)) return saved.trim().replace(/\/+$/, "");
  } catch {
    /* تجاهل */
  }
  return fallback;
}

/* قائمة الوسطاء بترتيب صفحة البث المباشر: [وسيط الجلسة المخصص، /proxy.php، Worker الرسمي] */
export function resolveProxyBases({
  proxyBase = "",
  phpProxy = PHP_PROXY,
  search = "",
  session = null,
} = {}) {
  const worker = resolveWorkerBase({ proxyBase, search, session });
  const fallback = String(proxyBase ?? "").trim().replace(/\/+$/, "");
  const php = String(phpProxy ?? "").trim();
  const list = [];
  const push = (v) => {
    if (v && !list.includes(v)) list.push(v);
  };
  if (worker && worker !== fallback) push(worker);
  push(php);
  push(worker || fallback);
  push(fallback);
  return list;
}

/* تحويل أي رابط قناة أو سيرفر إلى رابط الوسيط (Worker أو /proxy.php) */
export function getProxyUrl(base, url) {
  const b = String(base ?? "").trim().replace(/\/+$/, "");
  const u = String(url ?? "").trim();
  if (!b || !u) return u;
  if (b.endsWith(".php")) return `${b}?url=${encodeURIComponent(u)}`;
  if (u.startsWith("https://shd-gcp-live.edgenextcdn.net/")) {
    return b + u.slice("https://shd-gcp-live.edgenextcdn.net".length);
  }
  const mh = u.match(/^https:\/\/([^/]+)(\/.*)?$/i);
  if (mh) {
    return `${b}/h/${mh[1]}${mh[2] || "/"}`;
  }
  const mx = u.match(/^http:\/\/([^/]+)(\/.*)?$/i);
  if (mx) {
    return `${b}/x/${mx[1]}${mx[2] || "/"}`;
  }
  return `${b}/?u=${encodeURIComponent(u)}`;
}

/* هل الرابط يمثّل قائمة تشغيل HLS (.m3u8) حتى لو كان مُرمَّزاً داخل ?url= أو ?u= */
export function isHlsCandidateUrl(url) {
  const raw = String(url ?? "").trim();
  if (!raw) return false;
  if (/\.m3u8($|\?|%3f|&)/i.test(raw)) return true;
  try {
    return /\.m3u8($|\?)/i.test(decodeURIComponent(raw));
  } catch {
    return false;
  }
}

/* ========================================================================= */
/*  تنقية المدخلات                                                            */
/* ========================================================================= */

/* المستخدم قد يلصق http://host:port/ أو host فقط أو رابط get.php كامل */
export function normalizeHost(raw) {
  return String(raw ?? "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+.*$/, "")
    .replace(/\/+$/, "")
    .replace(/^:+/, "");
}

/* بروتوكول التنزيل المناسب لسيرفر المشترك كما كتبه (http صريح يبقى http) */
export function schemeOf(raw) {
  return /^http:\/\//i.test(String(raw ?? "").trim()) ? "http" : "https";
}

/* مفتاح ثابت للقناة يصلح للتخزين المحلي (المفضلة/الأخيرة):
   لملفات M3U الرابط هو المعرّف الوحيد الثابت، وللـXtream رقم القناة */
export function streamKey(stream) {
  if (!stream) return "";
  if (stream.url) return `u:${stream.url}`;
  return `x:${stream.id}`;
}

/* الأيام المتبقية في الاشتراك من طابع انتهاء Xtream (ثوانٍ) — null لو غير معروف */
export function daysUntil(expTsSeconds, now = Date.now()) {
  const ts = Number(expTsSeconds);
  if (!Number.isFinite(ts) || ts <= 0) return null;
  const diff = ts * 1000 - Number(now);
  if (diff <= 0) return 0;
  return Math.ceil(diff / 86400000);
}

/* ========================================================================= */
/*  البحث العربي: توحيد الأشكال قبل المقارنة                                  */
/* ========================================================================= */

/* «الجزيره» و«الجزيرة» و«الجزيرة» → صيغة واحدة؛ مع إزالة التشكيل والأرقام العربية */
export function normalizeArabic(value) {
  return String(value ?? "")
    .replace(/[\u064B-\u0652\u0670\u0640]/g, "") /* تشكيل وتطويل */
    .replace(/[أإآٱﺃﺇﺁ]/g, "ا")
    .replace(/[ىئي]/g, "ي")
    .replace(/[ؤو]/g, "و")
    .replace(/[ةه]/g, "ه")
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .toLowerCase()
    .replace(/[\s\u00a0]+/g, " ")
    .trim();
}

/* مطابقة بحث: كل كلمات البحث موجودة (لا يهم الترتيب ولا الشكل) */
export function matchesQuery(haystack, query) {
  const q = normalizeArabic(query);
  if (!q) return true;
  const text = normalizeArabic(haystack);
  if (!text) return false;
  return q.split(" ").every((token) => text.includes(token));
}

/* ========================================================================= */
/*  تحليل ملف M3U → قنوات + تصنيفات (group-title)                             */
/* ========================================================================= */

export function parseM3U(text) {
  const lines = String(text ?? "").split(/\r?\n/);
  const streams = [];
  const groups = new Map();
  let pending = null;

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

  const categories = [...groups.keys()]
    .map((name) => ({ id: name, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "ar"));

  return { categories, streams };
}

/* ترتيب التصنيفات القادمة من Xtream بالعربية */
export function sortCategories(list) {
  return [...list].sort((a, b) => a.name.localeCompare(b.name, "ar"));
}

/* ========================================================================= */
/*  تصفية القنوات — بلا سقف عرض (القائمة تُرسم افتراضياً/Virtual)             */
/* ========================================================================= */

/*
  tab: "all" | "favorites" | "recent"
  • البحث يعمل على كل القنوات في كل التصنيفات (لا يتقيد بالتصنيف المختار)
  • المفضلة/الأخيرة تُفلتر بمفتاح القناة الثابت (streamKey)
  • لا يوجد أي slice(0, N) — العرض الافتراضي يتولى الأداء
*/
export function filterStreams(
  streams,
  { query = "", categoryId = "", tab = "all", favorites = [], recents = [] } = {}
) {
  const list = Array.isArray(streams) ? streams : [];
  const favSet = new Set(favorites);
  const recSet = new Set(recents);

  let out = list;
  if (tab === "favorites") out = out.filter((s) => favSet.has(streamKey(s)));
  else if (tab === "recent") out = out.filter((s) => recSet.has(streamKey(s)));

  if (query.trim()) {
    out = out.filter((s) => matchesQuery(s.name, query));
  } else if (categoryId) {
    out = out.filter((s) => s.catId === categoryId);
  }

  if (tab === "recent") {
    const order = new Map(recents.map((key, index) => [key, index]));
    out = [...out].sort(
      (a, b) => (order.get(streamKey(a)) ?? 0) - (order.get(streamKey(b)) ?? 0)
    );
  }

  return out;
}

/* ========================================================================= */
/*  حساب نطاق الرسم الافتراضي (Virtual list) — رياضيات خالصة تُختبَر          */
/* ========================================================================= */

export function windowRange({ scrollTop = 0, itemHeight, viewportHeight, total, overscan } = {}) {
  const h = itemHeight > 0 ? itemHeight : LIST_ITEM_HEIGHT;
  const count = Math.max(0, Math.floor(total || 0));
  const view = Math.max(0, viewportHeight || 0);
  const buffer = Math.max(0, Math.floor(overscan ?? LIST_OVERSCAN));
  const maxScroll = Math.max(0, count * h - view);
  const top = Math.min(Math.max(0, scrollTop || 0), maxScroll);

  const first = Math.floor(top / h);
  const visible = Math.ceil(view / h) + 1;
  const start = Math.max(0, first - buffer);
  const end = Math.min(count, first + visible + buffer);

  return {
    start,
    end,
    offsetY: start * h,
    totalHeight: count * h,
    count: Math.max(0, end - start),
  };
}

/* ========================================================================= */
/*  مسارات الاتصال (Direct + Cloudflare Worker + PHP Proxy)                  */
/* ========================================================================= */

export function buildModes({ proxyBase, phpProxy = PHP_PROXY, isHttpsSite = true } = {}) {
  const modes = [
    { id: "direct-https", label: "مباشر HTTPS", base: (h) => `https://${h}` },
    { id: "proxy-https", label: "وسيط HTTPS", base: (h) => `${proxyBase}/h/${h}` },
    { id: "proxy-http", label: "وسيط HTTP", base: (h) => `${proxyBase}/x/${h}` },
  ];
  if (phpProxy) {
    modes.push(
      { id: "php-https", label: "بروكسي HTTPS", base: (h) => `${phpProxy}?url=https://${h}` },
      { id: "php-http", label: "بروكسي HTTP", base: (h) => `${phpProxy}?url=http://${h}` }
    );
  }
  /* الاتصال http المباشر من صفحة https مستحيل (Mixed Content) */
  if (!isHttpsSite) {
    modes.splice(1, 0, { id: "direct-http", label: "مباشر HTTP", base: (h) => `http://${h}` });
  }
  return modes;
}

/* تركيب المسار والاستعلام على base — إن كان base يمر عبر ?url= أو ?u= يُرمَّز الرابط الكامل داخله */
function buildEndpointUrl(base, pathAndQuery) {
  const raw = String(base ?? "");
  const qIdx = raw.search(/\?(url|u)=/i);
  if (qIdx !== -1) {
    const eqIdx = raw.indexOf("=", qIdx);
    const prefix = raw.slice(0, eqIdx + 1);
    const targetBase = raw.slice(eqIdx + 1);
    return `${prefix}${encodeURIComponent(`${targetBase}${pathAndQuery}`)}`;
  }
  return `${raw}${pathAndQuery}`;
}

/* رابط واجهة الحساب (player_api.php) — يدعم المباشر والـWorker و/proxy.php */
export function playerApiUrl(base, username, password, action = "") {
  const act = action ? `&action=${encodeURIComponent(action)}` : "";
  return buildEndpointUrl(
    base,
    `/player_api.php?username=${encodeURIComponent(
      username
    )}&password=${encodeURIComponent(password)}${act}`
  );
}

/* رابط بث قناة مباشرة بنمط Xtream — يدعم المباشر والـWorker و/proxy.php */
export function liveStreamUrl(base, username, password, streamId) {
  return buildEndpointUrl(
    base,
    `/live/${encodeURIComponent(username)}/${encodeURIComponent(
      password
    )}/${streamId}.m3u8`
  );
}

/* رابط تنزيل قائمة القنوات (get.php) — يُفتح في تبويب جديد فلا يحتاج CORS */
export function m3uDownloadUrl({ host, username, password, scheme = "https" }) {
  return `${scheme}://${host}/get.php?username=${encodeURIComponent(
    username
  )}&password=${encodeURIComponent(password)}&type=m3u_plus&output=hls`;
}

/* روابط التشغيل المرشحة لمصدر M3U:
   تجمع بين المباشر، و Cloudflare Worker (/h/ و /x/ و /?u=)، وبروكسي /proxy.php
   تماماً مثل صفحة البث المباشر، مع تقديم الوسيط فوراً لروابط ngrok */
export function m3uCandidates(
  rawUrl,
  { proxyBase, phpProxy = PHP_PROXY, isHttpsSite = true } = {}
) {
  const list = [];
  const push = (u) => {
    if (u && !list.includes(u)) list.push(u);
  };
  const url = String(rawUrl ?? "").trim();
  if (!url) return list;

  const isHls = /\.m3u8($|\?)/i.test(url);
  const isTs = /\.ts($|\?)/i.test(url);
  const https = (u) => u.replace(/^http:\/\//i, "https://");
  const mustProxy = isNgrokUrl(url);

  /* روابط ts بنمط xtream لها نسخة m3u8 مكافئة على نفس السيرفر */
  const hlsVariant = isTs && /\/live\//.test(url)
    ? url.replace(/\.ts($|\?)/i, ".m3u8$1")
    : isHls
      ? url
      : "";

  const addDirect = (target) => {
    push(isHttpsSite ? https(target) : target);
    push(target);
  };

  const addProxied = (target) => {
    if (proxyBase) {
      push(getProxyUrl(proxyBase, target));
      push(`${proxyBase}/?u=${encodeURIComponent(target)}`);
    }
    if (phpProxy) {
      push(getProxyUrl(phpProxy, target));
    }
  };

  if (hlsVariant) {
    if (mustProxy) {
      addProxied(hlsVariant);
      addDirect(hlsVariant);
    } else {
      addDirect(hlsVariant);
      addProxied(hlsVariant);
    }
  }

  if (mustProxy) {
    addProxied(url);
    addDirect(url);
  } else {
    addDirect(url);
    addProxied(url);
  }

  return list;
}

/* ========================================================================= */
/*  رسائل الفشل الذكية                                                        */
/* ========================================================================= */

export function composeFailMsg(entries) {
  const list = Array.isArray(entries) ? entries : [];
  const direct = list.filter((e) => e.mode.startsWith("direct"));
  const proxies = list.filter(
    (e) => e.mode.startsWith("proxy") || e.mode.startsWith("php")
  );
  const corsBlocked = direct.length > 0 && direct.every((e) => /CORS|مهلة/.test(e.note));
  const wafBlocked = proxies.some((e) => /HTTP 403|HTTP 429|HTTP 50\d|HTTP 52\d|مهلة/.test(e.note));
  /* كل المحاولات انتهت بمهلة زمنية (لا رد إطلاقاً) — أوضح من نسبة الحجب للمتصفح */
  const allTimeouts = list.length > 0 && list.every((e) => /مهلة/.test(e.note));

  if (allTimeouts) {
    return "لا استجابة من السيرفر خلال المهلة — تأكد من صحة الرابط (قد يكون السيرفر متوقفاً مؤقتاً) ثم أعد المحاولة.";
  }
  if (corsBlocked && wafBlocked) {
    return "هذا المزود يحجب التشغيل من داخل المواقع: يمنع الاتصال المباشر (CORS) ويحجب الوسطاء. الحل المضمون: اضغط «نزّل ملف قنواتك» بالأسفل ثم ارفعه — أو تأكد أن رابط السيرفر مطابق تماماً لما أعطاه المزود (قد يحتوي رقماً مثل :8080).";
  }
  if (corsBlocked) {
    return "المتصفح حجب الاتصال المباشر بالسيرفر (CORS) — كثير من المزودين يفعلون ذلك. جرّب زر «نزّل ملف قنواتك» بالأسفل ثم ارفعه، فهو يعمل مع أغلب المزودين.";
  }
  return "تعذر الاتصال بالسيرفر بعد تجربة كل المسارات — انسخ «تقرير التشخيص» بالأسفل وأرسله لنا لنحدد السبب بالضبط.";
}

/* ========================================================================= */
/*  تشخيص قابل للمشاركة — بلا كلمة سر أبداً                                   */
/* ========================================================================= */

/* تقنيع اسم المستخدم: أول حرفين فقط — يكفي للمطابقة في الدعم الفني */
export function maskUsername(username) {
  const value = String(username ?? "");
  if (value.length <= 2) return "*".repeat(value.length || 1);
  return `${value.slice(0, 2)}${"*".repeat(Math.min(6, value.length - 2))}`;
}

export function buildDiagReport({
  diag = [],
  account = null,
  m3uName = "",
  phase = "form",
  streamsCount = 0,
  source = "xtream",
  activeLabel = "",
  errorMsg = "",
} = {}) {
  const lines = [
    "— تقرير تشخيص مشغل الاشتراك —",
    `الوقت: ${new Date().toISOString()}`,
    `السيرفر: ${account?.host ?? "-"} | المستخدم: ${account?.username ? maskUsername(account.username) : "-"}` +
      (m3uName ? ` | ملف: ${m3uName}` : ""),
    "",
    "المحاولات:",
    ...diag.map((e) => `- [${e.mode}] ${e.label} → ${e.status === "ok" ? "نجح" : "فشل"}: ${e.note}`),
    "",
    phase === "ready"
      ? `النتيجة: نجح — ${streamsCount} قناة عبر «${source === "m3u" ? "ملف M3U" : activeLabel}»`
      : `النتيجة: فشل — ${errorMsg}`,
  ];
  return lines.join("\n");
}

/* رمز مشاركة قصير للدعم الفني: JSON مضغوط بترميز base64url
   — لا يحتوي كلمة السر ولا اسم المستخدم الكامل ولا أي رابط بث */
export function createShareToken({
  diag = [],
  host = "",
  username = "",
  streamsCount = 0,
  source = "xtream",
  activeLabel = "",
  errorMsg = "",
  userAgent = "",
} = {}) {
  const payload = {
    v: 1,
    t: new Date().toISOString().slice(0, 16),
    h: String(host ?? ""),
    u: maskUsername(username),
    s: source,
    m: String(activeLabel ?? ""),
    n: Number(streamsCount) || 0,
    e: String(errorMsg ?? "").slice(0, 160),
    a: String(userAgent ?? "").slice(0, 120),
    d: (Array.isArray(diag) ? diag : []).slice(0, 12).map((e) => ({
      m: e.mode,
      s: e.status === "ok" ? "ok" : "no",
      n: String(e.note ?? "").slice(0, 90),
    })),
  };
  return `${SHARE_TOKEN_PREFIX}.${toBase64Url(JSON.stringify(payload))}`;
}

export function parseShareToken(token) {
  const value = String(token ?? "").trim();
  if (!value.startsWith(`${SHARE_TOKEN_PREFIX}.`)) return null;
  try {
    const data = JSON.parse(fromBase64Url(value.slice(SHARE_TOKEN_PREFIX.length + 1)));
    if (!data || data.v !== 1) return null;
    return data;
  } catch {
    return null;
  }
}

function toBase64Url(text) {
  const bytes = utf8ToBinary(text);
  const base =
    typeof btoa === "function"
      ? btoa(bytes)
      : Buffer.from(text, "utf8").toString("base64");
  return base.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text) {
  const base = text.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base + "=".repeat((4 - (base.length % 4)) % 4);
  return typeof atob === "function"
    ? decodeURIComponent(escape(atob(padded)))
    : Buffer.from(padded, "base64").toString("utf8");
}

/* تحويل نص UTF-8 إلى نص ثنائي لـbtoa (بديل escape/unescape بأسلوب حديث) */
function utf8ToBinary(text) {
  if (typeof TextEncoder === "function" && typeof String.fromCharCode === "function") {
    return String.fromCharCode(...new TextEncoder().encode(text));
  }
  return unescape(encodeURIComponent(text));
}

/* ========================================================================= */
/*  التخزين المحلي — دوال تأخذ كائن تخزين (localStorage أو بديل في الاختبار)  */
/* ========================================================================= */

export function loadJSON(storage, key, fallback) {
  try {
    const raw = storage?.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export function saveJSON(storage, key, value) {
  try {
    storage?.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeKey(storage, key) {
  try {
    storage?.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function accountKey(account) {
  return `${normalizeHost(account?.host)}|${String(account?.username ?? "")}`;
}

/* قائمة الحسابات: تُهاجَر الجلسة القديمة (حساب واحد) إلى القائمة تلقائياً */
export function loadAccounts(storage) {
  const stored = loadJSON(storage, ACCOUNTS_KEY, []);
  const list = Array.isArray(stored) ? stored.filter(isValidAccount) : [];
  const legacy = loadJSON(storage, STORAGE_KEY, null);
  if (isValidAccount(legacy) && !list.some((a) => accountKey(a) === accountKey(legacy))) {
    list.push(legacy);
  }
  return list.slice(0, MAX_ACCOUNTS).map((a) => ({
    host: normalizeHost(a.host),
    username: String(a.username),
    password: String(a.password),
  }));
}

export function isValidAccount(account) {
  return !!(
    account &&
    normalizeHost(account.host) &&
    String(account.username ?? "").trim() &&
    String(account.password ?? "").trim()
  );
}

/* إضافة/تحديث حساب — الأحدث أولاً وبلا تكرار */
export function upsertAccount(list, account) {
  const clean = {
    host: normalizeHost(account?.host),
    username: String(account?.username ?? "").trim(),
    password: String(account?.password ?? ""),
  };
  if (!isValidAccount(clean)) return Array.isArray(list) ? [...list] : [];
  const rest = (Array.isArray(list) ? list : []).filter(
    (a) => accountKey(a) !== accountKey(clean)
  );
  return [clean, ...rest].slice(0, MAX_ACCOUNTS);
}

export function removeAccount(list, account) {
  const key = typeof account === "string" ? account : accountKey(account);
  return (Array.isArray(list) ? list : []).filter((a) => accountKey(a) !== key);
}

/* اسم مختصر يظهر على شريحة الحساب */
export function accountLabel(account) {
  const host = normalizeHost(account?.host);
  return host || String(account?.username ?? "");
}

export function toggleInList(list, key, max = 500) {
  const items = Array.isArray(list) ? list : [];
  if (!key) return [...items];
  if (items.includes(key)) return items.filter((k) => k !== key);
  return [key, ...items].slice(0, max);
}

export function pushRecent(list, key, max = MAX_RECENTS) {
  const items = Array.isArray(list) ? list : [];
  if (!key) return [...items];
  return [key, ...items.filter((k) => k !== key)].slice(0, max);
}

/* ========================================================================= */
/*  ملف لكل حساب: المفضلة وسجل المشاهدة لا تختلط بين مزودين مختلفين           */
/*  (أرقام القنوات تختلف من مزوّد لآخر — نفس الرقم قد يعني قناة أخرى)          */
/* ========================================================================= */

export function profileKeyFor(account, m3uName) {
  if (account && isValidAccount(account)) return `x:${accountKey(account)}`;
  return `m:${String(m3uName ?? "").trim() || "file"}`;
}

export function loadProfileList(storage, key, profile) {
  const map = loadJSON(storage, key, {});
  if (!map || typeof map !== "object") return [];
  const list = Array.isArray(map[profile]) ? map[profile] : [];
  return list.filter((item) => typeof item === "string");
}

export function saveProfileList(storage, key, profile, list) {
  const map = loadJSON(storage, key, {});
  const base = map && typeof map === "object" ? map : {};
  const clean = (Array.isArray(list) ? list : [])
    .filter((item) => typeof item === "string")
    .slice(0, 500);
  return saveJSON(storage, key, { ...base, [profile]: clean });
}
