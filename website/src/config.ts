/* ==========================================================================
   الإعدادات المركزية للموقع — كل قيمة تتكرر في أكثر من ملف تُعرَّف هنا فقط
   (سابقاً كان رابط الوسيط مكتوباً في ملفين، وأي تغيير يجب تكراره يدوياً)
========================================================================== */

/* الهوية */
export const BRAND_NAME = "ستريم ماستر برو";
export const BRAND_EN = "Stream Master Pro";

/* التواصل */
export const WHATSAPP_NUMBER = "201098950879";
/* رقم التواصل الحالي للموقع — لا يُستبدل برقم الموقع المرجعي. */
export const WHATSAPP_DISPLAY = "+20 109 895 0879";

/* وسيط البث (Cloudflare Worker) */
export const PROXY_BASE = "https://serverproject.ahmedlasheenrespicare.workers.dev";

/* ==========================================================================
   العنوان الأساسي للموقع — يُستخدم في canonical و sitemap و og:url
   يمكن تغييره من متغيّر البيئة VITE_SITE_URL أثناء البناء
========================================================================== */
export const SITE_URL = (
  (import.meta.env.VITE_SITE_URL as string | undefined) ||
  "https://streammasterstore.com"
).replace(/\/+$/, "");

/* مسار النشر: "/" محلياً و "/serverproject/" على GitHub Pages */
export const BASE = import.meta.env.BASE_URL || "/";

/* يبني رابطاً داخلياً كاملاً من مسار بلا بادئة: to("nova/") → "/serverproject/nova/" */
export function to(path = ""): string {
  const clean = path.replace(/^\/+/, "");
  return clean ? `${BASE}${clean}` : BASE;
}

/* الرابط الكامل على الإنترنت (canonical/og) — ينتهي دائماً بشرطة مائلة
   حتى يطابق شكل الروابط في sitemap.xml تماماً (روابط المجلدات).
   كل مسار يُرمَّز (percent-encode) ليطابق صيغة السلاجات العربية المنشورة. */
export function absolute(path = ""): string {
  const clean = path.replace(/^\/+|\/+$/g, "");
  return clean
    ? `${SITE_URL}/${clean.split("/").map(encodeURIComponent).join("/")}/`
    : `${SITE_URL}/`;
}
