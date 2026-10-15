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
/* النطاق والهوية المشتقة منه تأتي من src/site.mjs — وحدة JS خالصة تصلح
   للاستيراد من تطبيق React ومن سكربتات البناء في Node معاً، فيبقى مصدر
   النطاق والبريد واحداً في كل المشروع (راجع التعليق هناك). */
import { SITE_HOST, SITE_URL, SUPPORT_EMAIL } from "./site.mjs";

/* يُعاد تصديرها من هنا لأن config.ts هو مصدر الهوية المعتمد للمكوّنات،
   بينما تبقى القيمة نفسها معرّفة مرة واحدة في site.mjs. */
export { SITE_HOST, SITE_URL, SUPPORT_EMAIL };

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
