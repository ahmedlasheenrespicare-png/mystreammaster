/* ==========================================================================
   منطق وسيط التضمين (/embed.php) — نسخة JS خالصة من القواعد نفسها
   --------------------------------------------------------------------------
   لماذا هذا الملف؟
     embed.php مكتوب بـ PHP لأنه يعمل على استضافة الموقع (Hostinger)، وبيئة
     الاختبار (npm test) لا تشغّل PHP — لذلك تُنفَّذ القواعد الحساسة هنا
     (قراءة الإعدادات، مطابقة قائمة النطاقات، حل الروابط، إعادة كتابة HTML)
     وتُختبر فعلياً في scripts/test-embed-php.mjs، بينما يفحص الاختبار نفسه
     أن embed.php يحمل القواعد نفسها حرفياً (نفس أسلوب test-proxy-php.mjs).
     أي اختلاف بين النسختين يسقط في CI قبل النشر.

   الفكرة: صفحة المشغّل (/player.html) تُضمِّن /player/<rest> من نفس النطاق،
   والوسيط يجلب المحتوى من الأصل الحقيقي (نفق البث الخاص) — فلا يظهر رابط
   النفق في مصدر الصفحة ولا في رؤوس CSP.
========================================================================== */

/** بادئة المسار الوسيط في الموقع — يجب أن تطابق قاعدة .htaccess في الجذر */
export const EMBED_PREFIX = "/player/";

/** الوسائط التي يُسمح بتمريرها عبر الوسيط (غير HTML تُبث كما هي) */
export const EMBED_CONF_FILE = "stream-embed.conf";
export const EMBED_ALLOWLIST_FILE = "allowed-domains.txt";

/** أقصى حجم لمستند HTML يُعاد كتابته (ما عداه يُبث متدفقاً) */
export const EMBED_MAX_HTML_BYTES = 4 * 1024 * 1024;

/** سياسة أمان المستند المُضمَّن: نفس النطاق للأكواد، وhttps للوسائط والاتصال */
export const EMBED_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https:",
  "img-src 'self' data: blob: https:",
  "media-src 'self' https: blob:",
  "connect-src 'self' https: wss: blob:",
  "font-src 'self' data:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'self'",
  "upgrade-insecure-requests",
].join("; ");

/* --------------------------------------------------------------------------
   ١) الإعدادات: ملف <alias> = <origin>
-------------------------------------------------------------------------- */

/** يقرأ أسطر `alias = origin` ويتجاهل التعليقات والفراغات والأسطر التالفة */
export function parseEmbedConfig(text) {
  const map = new Map();
  for (const rawLine of String(text).split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const alias = line.slice(0, eq).trim().toLowerCase();
    const origin = line.slice(eq + 1).trim().replace(/\/+$/, "");
    if (!/^[a-z0-9][a-z0-9._-]*$/.test(alias)) continue;
    if (!/^https?:\/\/[^\s/]+$/i.test(origin)) continue;
    map.set(alias, origin);
  }
  return map;
}

/** قائمة النطاقات المسموحة (مطابقة تامة للمضيف، مثل allowed_domains في proxy.php) */
export function parseAllowedHosts(text) {
  const hosts = new Set();
  for (const rawLine of String(text).split(/\r?\n/)) {
    const line = rawLine.trim().toLowerCase();
    if (line === "" || line.startsWith("#")) continue;
    if (/^[a-z0-9.-]+$/.test(line)) hosts.add(line);
  }
  return hosts;
}

/**
 * هل المضيف مسموحاً؟ مطابق تماماً لمدخل في القائمة، أو مضيف فرعي له
 * (بحد فاصل عند النقطة). المطابقة اللاحقة ضرورية هنا لأن مضيف نفق البث
 * المؤقت يتغير مع كل إعادة تشغيل، فيكفي تسجيل نطاقه الأم (trycloudflare.com).
 */
export function isHostAllowed(host, hosts) {
  const h = String(host || "").toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "") return false;
  if (hosts.has(h)) return true;
  for (const entry of hosts) {
    if (h.endsWith(`.${entry}`)) return true;
  }
  return false;
}

/* --------------------------------------------------------------------------
   ٢) بناء رابط الأصل من المسار المطلوب
-------------------------------------------------------------------------- */

/**
 * يبني رابط السيرفر الأصلي.
 * @param {string} origin  أصل من الإعدادات (بلا شرطة أخيرة)
 * @param {string} rest    ما بعد /player/ (قد يحوي استعلاماً)
 * @returns {string|null}  الرابط الكامل، أو null إن حاول المسار الخروج من الأصل
 */
export function upstreamUrlFor(origin, rest) {
  const raw = String(rest ?? "");
  if (!raw || raw.includes("\0")) return null;
  const cleaned = "/" + raw.replace(/^\/+/, "");
  try {
    /* ../ لا يجوز أن تخرج من الأصل: أول مقطع يخرج عن الجذر يرفض الطلب كاملاً */
    const pathPart = cleaned.split(/[?#]/)[0];
    let depth = 0;
    for (const segment of pathPart.split("/")) {
      if (segment === "..") {
        depth -= 1;
        if (depth < 0) return null;
      } else if (segment !== "." && segment !== "") depth += 1;
    }
    const url = new URL(cleaned, origin.endsWith("/") ? origin : `${origin}/`);
    if (url.origin !== new URL(origin).origin) return null;
    return url.href;
  } catch {
    return null;
  }
}

/* --------------------------------------------------------------------------
   ٣) إعادة كتابة HTML
-------------------------------------------------------------------------- */

/** الوسوم/السمات التي تحمل روابط موارد */
const URL_ATTRS = ["src", "href", "poster", "data-src", "data-href", "data-poster"];

/**
 * يعيد كتابة الروابط الجذرية (/assets/app.js) لتبقى داخل الوسيط.
 * • النسبية (assets/app.js) لا تلمس: يحلها المتصفح مقابل /player/<dir>/ تلقائياً
 * • الكاملة (https://…) لا تلمس: CSP يسمح بـ https للوسائط والصور
 * • ما بدأ بالبادئة أصلاً لا يُضاعف
 * • data: و blob: و # و javascript: تُترك كما هي
 */
export function proxyHtmlUrls(html, prefix = EMBED_PREFIX) {
  const attrRe = new RegExp(
    /* جذري فقط: يبدأ بـ / وليس // ولا بالبادئة نفسها (منع مضاعفتها).
       الشرطة الأولى تُلتهم في المطابقة، فالبادئة تُفحص بلا شرطتها الأولى. */
    `((?:^|[\\s"'])(${URL_ATTRS.join("|")})\\s*=\\s*)(["'])/(?!(/|${prefix.replace(/^\//, "")}))`,
    "gi"
  );
  const out = String(html).replace(attrRe, (_m, head, _attr, quote) => `${head}${quote}${prefix}`);
  return out.replace(/\bsrcset\s*=\s*(["'])([\s\S]*?)\1/gi, (whole, quote, value) => {
    let changed = false;
    const rewritten = value
      .split(",")
      .map((candidate) => {
        const parts = candidate.trim().split(/\s+/);
        const url = parts[0] || "";
        const isRoot = url.startsWith("/") && !url.startsWith("//");
        const already = url.startsWith(prefix);
        if (!isRoot || already) return candidate;
        changed = true;
        return [prefix + url.slice(1), ...parts.slice(1)].join(" ");
      })
      .join(", ");
    /* بلا تغيير: يُترك النص كما هو حتى لا تتغير مسافات srcset النسبي */
    return changed ? `srcset=${quote}${rewritten}${quote}` : whole;
  });
}

/** يحقن سياسة الأمان كأول عنصر في <head> — المستند المُضمَّن يخضع لسياسة موقعنا */
export function injectCspMeta(html, policy = EMBED_CSP) {
  const tag = `<meta http-equiv="Content-Security-Policy" content="${policy.replace(/"/g, "&quot;")}">`;
  const text = String(html);
  if (/<head[^>]*>/i.test(text)) return text.replace(/<head[^>]*>/i, (m) => `${m}${tag}`);
  if (/<html[^>]*>/i.test(text)) return text.replace(/<html[^>]*>/i, (m) => `${m}<head>${tag}</head>`);
  return `${tag}${text}`;
}
