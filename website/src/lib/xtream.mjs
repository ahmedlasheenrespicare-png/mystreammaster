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

/* ثوابت الوسيط والبروكسي — تُستخدم في كل حلقات التشغيل */
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

/* ========================================================================= */
/*  بصمة المشغل — User-Agent الخاص بـ IPTV Smarters / VLC                      */
/* ========================================================================= */
/*
  كثير من لوحات Xtream وشبكات IPTV تحجب المتصفحات صراحةً (403/406/451) وتسمح
  فقط لمشغلات IPTV المعروفة. والمتصفح لا يسمح لأي صفحة بتغيير User-Agent
  (رأس «محظور» في fetch/XHR ولا يمر حتى عبر hls.js xhrSetup)، لذلك:

    المشغل ← يضيف معامل البصمة (?smpua=smarters) لرابط الوسيط
    الوسيط (proxy.php أو Cloudflare Worker) ← يرسل User-Agent الحقيقي للسيرفر

  الوسيط يقبل قيماً من قائمة ثابتة فقط (لا User-Agent عشوائي من الزائر)،
  ويحافظ على نفس البصمة في القائمة الرئيسية وكل القوائم الفرعية والمقاطع
  ومفاتيح فك التشفير — وإلا فتح السيرفر «جلسة» مختلفة لكل طلب وتوقف البث.
*/

/** القيمة الحرفية التي يطلبها السيرفر (IPTV Smarters Pro Lite على LibVLC) */
export const SMARTERS_USER_AGENT = "iptv_smarters_player_lite/1.4.2 VLC/3.1.2 LibVLC/3.1.2";

/** اسم المعامل الذي يحمل البصمة إلى الوسيط (لا يصل للسيرفر الأصلي أبداً) */
export const UA_PARAM = "smpua";

/** البصمات المسموحة — الوسيط لا يقبل غيرها */
export const UA_PRESET_SMARTERS = "smarters";
export const UA_PRESETS = { [UA_PRESET_SMARTERS]: SMARTERS_USER_AGENT };

/** وصف مختصر يظهر في حالة التشغيل وتقارير التشخيص */
export const UA_LABEL = "بصمة Smarters/VLC";

/** هل هذا الرابط يمر عبر وسيط نستطيع أن نطلب منه تغيير User-Agent؟ */
export function isProxiedUrl(url, { proxyBase = "", phpProxy = PHP_PROXY } = {}) {
  const raw = String(url ?? "").trim();
  if (!raw) return false;

  const php = String(phpProxy ?? "").trim().replace(/^\/+/, "");
  if (php && (raw.includes(`/${php}?`) || raw.startsWith(`${php}?`) || raw.includes(`/${php}/`))) {
    return true;
  }

  const worker = String(proxyBase ?? "").trim().replace(/\/+$/, "");
  if (worker && raw.startsWith(`${worker}/`)) return true;

  /* الوسيط الرسمي يُعرف من نطاقه حتى بدون تمرير proxyBase (النمط يطابق الأصل فقط) */
  try {
    if (OWNED_PROXY_PATTERN.test(new URL(raw).origin)) return true;
  } catch {
    /* رابط نسبي — فُحص أعلاه */
  }
  return false;
}

/**
 * إضافة بصمة المشغل إلى رابط وسيط: /proxy.php?url=X → /proxy.php?url=X&smpua=smarters
 * المعامل يُضاف لاستعلام الوسيط نفسه (خارج الرابط المُرمَّز) ولا يلمس التوكنات.
 * الروابط المباشرة تُعاد كما هي — لا يمكن إجبار المتصفح على تغيير User-Agent.
 */
export function withUserAgentPreset(url, preset = UA_PRESET_SMARTERS, options = {}) {
  const raw = String(url ?? "").trim();
  const value = String(preset ?? "").trim();
  if (!raw || !UA_PRESETS[value]) return raw;
  /* بلا وسيط لا نضيف شيئاً: المعامل سيصل للسيرفر الأصلي بلا فائدة (وربما أفسد
     رابطاً موقّعاً) لأن المتصفح نفسه لا يستطيع إرسال بصمة مختلفة */
  if (!isProxiedUrl(raw, options)) return raw;

  const hashIdx = raw.indexOf("#");
  const base = hashIdx === -1 ? raw : raw.slice(0, hashIdx);
  const hash = hashIdx === -1 ? "" : raw.slice(hashIdx);
  if (new RegExp(`[?&]${UA_PARAM}=`, "i").test(base)) return raw; /* مضافة مسبقاً */
  return `${base}${base.includes("?") ? "&" : "?"}${UA_PARAM}=${encodeURIComponent(value)}${hash}`;
}

/**
 * بناء سلّم المرشّحات: بعد كل مرشّح يمر عبر وسيط نضيف نسخة تحمل بصمة
 * Smarters/VLC، فتُجرَّب البصمة تلقائياً حين يرفض السيرفر المتصفح.
 * ولو نجحت البصمة سابقاً (preferred) تُقدَّم على النسخة العادية.
 * الروابط المباشرة والتشغيل الأصلي لا يتغيران (بلا وسيط = بلا سيطرة على الرأس).
 */
export function addUaVariants(
  candidates,
  { preset = UA_PRESET_SMARTERS, preferred = "", proxyBase = "", phpProxy = PHP_PROXY } = {}
) {
  const list = Array.isArray(candidates) ? candidates : [];
  const out = [];
  const seen = new Set();
  /* المفتاح يشمل native لأن المرشّح الأصلي (video.src) يكرر رابطاً موجوداً عمداً */
  const push = (cand) => {
    if (!cand || !cand.url) return;
    const key = `${cand.native ? "n:" : "h:"}${cand.url}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(cand);
  };

  for (const cand of list) {
    if (!cand || !cand.url) continue;
    if (cand.ua || !isProxiedUrl(cand.url, { proxyBase, phpProxy })) {
      push(cand);
      continue;
    }
    const variantUrl = withUserAgentPreset(cand.url, preset, { proxyBase, phpProxy });
    if (variantUrl === cand.url) {
      push(cand);
      continue;
    }
    const variant = { ...cand, url: variantUrl, ua: preset, label: `${cand.label} • ${UA_LABEL}` };
    if (String(preferred ?? "") === preset) {
      push(variant);
      push(cand);
    } else {
      push(cand);
      push(variant);
    }
  }
  return out;
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
        num: String(streams.length + 1),
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
export function playerApiUrl(base, username, password, action = "", extra = null) {
  const act = action ? `&action=${encodeURIComponent(action)}` : "";
  const extras =
    extra && typeof extra === "object"
      ? Object.entries(extra)
          .filter(([, value]) => value !== undefined && value !== null && value !== "")
          .map(([key, value]) => `&${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
          .join("")
      : "";
  return buildEndpointUrl(
    base,
    `/player_api.php?username=${encodeURIComponent(
      username
    )}&password=${encodeURIComponent(password)}${act}${extras}`
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

/* ========================================================================= */
/*  مشغّل الاشتراك — الأفلام والمسلسلات ودليل البرامج (EPG) والإعادة والقفل   */
/* ========================================================================= */

export const MEDIA_EXTENSIONS = ["mp4", "mkv", "avi", "mov", "wmv", "flv", "webm", "mpg", "mpeg", "ts", "m3u8"];

export function safeMediaExt(ext, fallback = "mp4") {
  const clean = String(ext || "").replace(/[^a-z0-9]/gi, "").toLowerCase();
  return MEDIA_EXTENSIONS.includes(clean) ? clean : fallback;
}

export function vodStreamUrl(base, username, password, streamId, ext = "mp4") {
  const safeExt = safeMediaExt(ext);
  return buildEndpointUrl(
    base,
    `/movie/${encodeURIComponent(username)}/${encodeURIComponent(password)}/${encodeURIComponent(streamId)}.${safeExt}`,
  );
}

export function seriesStreamUrl(base, username, password, episodeId, ext = "mp4") {
  const safeExt = safeMediaExt(ext);
  return buildEndpointUrl(
    base,
    `/series/${encodeURIComponent(username)}/${encodeURIComponent(password)}/${encodeURIComponent(episodeId)}.${safeExt}`,
  );
}

/** روابط إعادة البث (Timeshift/Catch-up) — تنسيق Xtream:
 *  /timeshift/{user}/{pass}/{id}/{YYYY-MM-DD:HH-mm}/{duration-min}.m3u8 (بتوقيت UTC) */
export function timeshiftUrl(base, username, password, streamId, startSec, durationMin = 120) {
  const d = new Date(Math.max(0, Number(startSec) || 0) * 1000);
  const p2 = (n) => String(n).padStart(2, "0");
  const stamp =
    `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}` +
    `:${p2(d.getUTCHours())}-${p2(d.getUTCMinutes())}`;
  const dur = Math.max(1, Math.round(Number(durationMin) || 120));
  return buildEndpointUrl(
    base,
    `/timeshift/${encodeURIComponent(username)}/${encodeURIComponent(password)}/${encodeURIComponent(streamId)}/${stamp}/${dur}.m3u8`,
  );
}

/** عنوان EPG المختصر — action=get_short_epg&stream_id=X&limit=N */
export function shortEpgUrl(base, username, password, streamId, limit = 4) {
  return playerApiUrl(base, username, password, "get_short_epg", {
    stream_id: streamId,
    limit,
  });
}

/** فك Base64 (بترميز UTF-8 آمن) — يقبل سلسلة أو {base64: "..."} كما تعيد بعض اللوحات */
export function decodeEpgField(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && typeof value.base64 === "string") {
    try {
      const bin = atob(String(value.base64).trim());
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
      return new TextDecoder("utf-8").decode(bytes);
    } catch {
      return "";
    }
  }
  return "";
}

function parseEpgClock(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/.exec(String(value ?? ""));
  if (!m) return 0;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6] || 0)) / 1000;
}

/** "21:05" من طابع زمني بالثواني (بتوقيت الجهاز) */
export function formatClock(secondsTs) {
  const ts = Number(secondsTs);
  if (!Number.isFinite(ts) || ts <= 0) return "";
  const d = new Date(ts * 1000);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** تحليل رد get_short_epg → { items, now, next, progress } */
export function parseShortEpg(payload, nowSec = Math.floor(Date.now() / 1000)) {
  const now = Number(nowSec) || Math.floor(Date.now() / 1000);
  const raw = payload && Array.isArray(payload.epg_listings)
    ? payload.epg_listings
    : Array.isArray(payload)
      ? payload
      : [];
  const items = raw
    .map((entry) => ({
      title: decodeEpgField(entry?.title),
      desc: decodeEpgField(entry?.description),
      startTs: Number(entry?.start_timestamp) || parseEpgClock(entry?.start),
      endTs: Number(entry?.stop_timestamp ?? entry?.end_timestamp) || parseEpgClock(entry?.end ?? entry?.stop),
    }))
    .filter((item) => item.title || item.startTs)
    .sort((a, b) => a.startTs - b.startTs);
  const nowItem = items.find((i) => i.startTs <= now && (i.endTs === 0 || now < i.endTs)) || null;
  const nextItem = items.find((i) => i.startTs > now)
    || (nowItem ? items[items.indexOf(nowItem) + 1] ?? null : null);
  let progress = null;
  if (nowItem && nowItem.endTs > nowItem.startTs) {
    progress = Math.min(1, Math.max(0, (now - nowItem.startTs) / (nowItem.endTs - nowItem.startTs)));
  }
  return { items, now: nowItem, next: nextItem, progress };
}

/** "يعرض الآن: X (21:00 - 22:00) • التالي: Y" */
export function formatEpgLine(epg) {
  if (!epg || (!epg.now && !epg.next)) return "";
  const range = (item) =>
    item?.startTs && item?.endTs
      ? ` (${formatClock(item.startTs)} - ${formatClock(item.endTs)})`
      : "";
  const parts = [];
  if (epg.now?.title) parts.push(`يعرض الآن: ${epg.now.title}${range(epg.now)}`);
  if (epg.next?.title) parts.push(`التالي: ${epg.next.title}${range(epg.next)}`);
  return parts.join(" • ");
}

/** تحليل get_vod_info → بيانات الفيلم للبطاقة التفصيلية */
export function parseVodInfo(payload) {
  const info = payload && typeof payload === "object" && payload.info ? payload.info : {};
  const data = payload?.movie_data && typeof payload.movie_data === "object" ? payload.movie_data : {};
  const trailerRaw = String(info.trailer || info.youtubeid || "").trim();
  let trailer = "";
  if (/^https?:\/\//i.test(trailerRaw)) trailer = trailerRaw;
  else if (trailerRaw) trailer = `https://www.youtube.com/watch?v=${encodeURIComponent(trailerRaw)}`;
  return {
    id: Number(data.stream_id) || 0,
    name: String(data.name || info.name || ""),
    ext: String(data.container_extension || info.container_extension || "mp4"),
    poster: String(info.movie_image || info.cover || data.cover || ""),
    plot: String(info.plot || info.description || ""),
    rating: Number(info.rating) || 0,
    cast: String(info.cast || ""),
    genre: String(info.genre || ""),
    duration: String(info.duration || info.episode_run_time || ""),
    release: String(info.releasedate || info.release_date || ""),
    trailer,
  };
}

/** تحليل get_series_info → المواسم والحلقات مع بيانات العرض */
export function parseSeriesInfo(payload) {
  const info = payload && typeof payload === "object" && payload.info ? payload.info : {};
  const seasonsRaw = Array.isArray(payload?.seasons) ? payload.seasons : [];
  const episodesMap = payload?.episodes && typeof payload.episodes === "object" ? payload.episodes : {};
  const seasonNums = [
    ...new Set([
      ...seasonsRaw.map((s) => Number(s?.season_number)),
      ...Object.keys(episodesMap).map(Number),
    ]),
  ]
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
  const seasons = seasonNums.map((num) => {
    const meta = seasonsRaw.find((s) => Number(s?.season_number) === num) || {};
    const list = Array.isArray(episodesMap[String(num)])
      ? episodesMap[String(num)]
      : Array.isArray(episodesMap[num])
        ? episodesMap[num]
        : [];
    const episodes = list
      .map((e) => ({
        id: Number(e?.id) || 0,
        num: Number(e?.episode_num) || 0,
        title: String(e?.title || "").trim() || `الحلقة ${e?.episode_num ?? ""}`,
        ext: String(e?.container_extension || "mp4"),
        duration: String(e?.info?.duration || ""),
        plot: String(e?.info?.plot || ""),
        image: String(e?.info?.movie_image || ""),
      }))
      .sort((a, b) => a.num - b.num);
    return { num, name: String(meta.name || `الموسم ${num}`), episodes };
  });
  return {
    name: String(info.name || ""),
    cover: String(info.cover || info.movie_image || ""),
    plot: String(info.plot || ""),
    rating: Number(info.rating) || 0,
    cast: String(info.cast || ""),
    seasons,
  };
}

/** بحث قناة برقمها (حقل num أو المعرّف) — لانتقال الأرقام من الرموت */
export function findChannelByNumber(channels, digits) {
  const raw = String(digits ?? "").replace(/^0+(?=\d)/, "");
  if (!raw) return null;
  const list = Array.isArray(channels) ? channels : [];
  return list.find((c) => String(c?.num ?? "") === raw) || list.find((c) => String(c?.id) === raw) || null;
}

/** القناة السابقة/التالية مع التجوّز (Wrap) */
export function stepChannel(list, currentKey, dir = 1) {
  const items = Array.isArray(list) ? list : [];
  if (!items.length) return null;
  const idx = items.findIndex((item) => streamKey(item) === currentKey);
  if (idx === -1) return dir > 0 ? items[0] : items[items.length - 1];
  const step = dir >= 0 ? 1 : -1;
  return items[(idx + step + items.length) % items.length];
}

/** تحويل ملف SRT إلى WebVTT (لرفع ترجمة الأفلام) */
export function srtToVtt(text) {
  const body = String(text ?? "")
    .replace(/^\uFEFF/, "")
    .replace(/\r+/g, "")
    .trim()
    .replace(/^\d+$/gm, "")
    .replace(/(\d{1,2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2")
    .replace(/\{\\[^}]*\}/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return `WEBVTT\n\n${body}\n`;
}

/* ------------------------- القفل الأبوي (PIN) ---------------------------- */

export const PIN_KEY = "smp-xtream-pin";

export function isValidPin(pin) {
  return /^\d{4}$/.test(String(pin ?? ""));
}

export function hashPin(pin, salt = "smp-pin-v1") {
  const seed = `${salt}|${pin}`;
  let h1 = 5381;
  for (let i = 0; i < seed.length; i += 1) h1 = ((h1 * 33) ^ seed.charCodeAt(i)) >>> 0;
  const seed2 = `${h1.toString(36)}|${salt}|${pin}`;
  let h2 = 5381;
  for (let i = 0; i < seed2.length; i += 1) h2 = ((h2 * 33) ^ seed2.charCodeAt(i)) >>> 0;
  return `${h1.toString(36)}.${h2.toString(36)}`;
}

export function verifyPin(storedHash, pin) {
  if (typeof storedHash !== "string" || !storedHash || !isValidPin(pin)) return false;
  return storedHash === hashPin(pin);
}

export function loadPinState(storage) {
  const value = loadJSON(storage, PIN_KEY, null);
  if (!value || typeof value !== "object" || typeof value.pin !== "string") return null;
  return {
    pin: value.pin,
    locked: Array.isArray(value.locked) ? value.locked.filter((k) => typeof k === "string") : [],
  };
}

export function savePinState(storage, state) {
  if (!state || typeof state.pin !== "string" || !state.pin) return saveJSON(storage, PIN_KEY, null);
  return saveJSON(storage, PIN_KEY, {
    pin: state.pin,
    locked: (Array.isArray(state.locked) ? state.locked : []).filter((k) => typeof k === "string"),
  });
}

export function toggleLockKey(state, key) {
  const locked = state && Array.isArray(state.locked) ? state.locked : [];
  const next = locked.includes(key) ? locked.filter((k) => k !== key) : [...locked, key];
  return { pin: state?.pin ?? "", locked: next };
}

/* ------------------ متابعة المشاهدة (Resume Playback) -------------------- */

export const RESUME_KEY = "smp-xtream-resume";

export function loadResumeMap(storage, profile) {
  const all = loadJSON(storage, RESUME_KEY, {});
  const map = all && typeof all === "object" ? all[profile] : null;
  return map && typeof map === "object" ? map : {};
}

export function getResumeAt(map, key) {
  const entry = map && typeof map === "object" ? map[key] : null;
  const t = entry && typeof entry === "object" ? Number(entry.t) : 0;
  return Number.isFinite(t) && t > 15 ? t : 0;
}

export function saveResumePosition(storage, profile, key, seconds, nowMs = Date.now()) {
  if (!profile || !key || !Number.isFinite(Number(seconds)) || Number(seconds) < 15) return false;
  const map = loadResumeMap(storage, profile);
  map[key] = { t: Math.floor(Number(seconds)), ts: Number(nowMs) };
  const entries = Object.entries(map)
    .sort((a, b) => (Number(b[1]?.ts) || 0) - (Number(a[1]?.ts) || 0))
    .slice(0, 300);
  const all = loadJSON(storage, RESUME_KEY, {});
  const base = all && typeof all === "object" ? all : {};
  return saveJSON(storage, RESUME_KEY, { ...base, [profile]: Object.fromEntries(entries) });
}

/* ------------------------ أوضاع العرض (Aspect) --------------------------- */

export const ASPECT_MODES = [
  { id: "auto", label: "الأصلي (Contain)" },
  { id: "cover", label: "تعبئة الشاشة (Cover)" },
  { id: "fill", label: "تمديد (Fill/Stretch)" },
  { id: "16:9", label: "نسبة 16:9" },
  { id: "4:3", label: "نسبة 4:3" },
];

export function aspectStyle(modeId) {
  switch (String(modeId ?? "auto")) {
    case "cover":
      return { objectFit: "cover", aspectRatio: "auto", width: "100%", height: "100%" };
    case "fill":
      return { objectFit: "fill", aspectRatio: "auto", width: "100%", height: "100%" };
    case "16:9":
      return { objectFit: "contain", aspectRatio: "16 / 9", width: "auto", height: "100%", maxWidth: "100%", maxHeight: "100%" };
    case "4:3":
      return { objectFit: "contain", aspectRatio: "4 / 3", width: "auto", height: "100%", maxWidth: "100%", maxHeight: "100%" };
    default:
      return { objectFit: "contain", aspectRatio: "auto", width: "100%", height: "100%" };
  }
}

/* رابط MPEG-TS خام (.ts) — يُشغَّل عبر mpegts.js وليس hls.js */
export function isTsStreamUrl(url) {
  const raw = String(url ?? "").trim();
  if (!raw || isHlsCandidateUrl(raw)) return false;
  if (/\.ts($|\?|#)/i.test(raw)) return true;
  try {
    return /\.ts($|\?|#)/i.test(decodeURIComponent(raw));
  } catch {
    return false;
  }
}
