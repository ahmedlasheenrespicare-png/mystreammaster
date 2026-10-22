import { to } from "../config";
import type { PricingPlan } from "../data";
import { SERVER_WATERMARKS } from "../lib/server-branding";

/* ==========================================================================
   أيقونة السيرفر — مصدر واحد لشعار كل سيرفر في الموقع
   --------------------------------------------------------------------------
   • ServerIcon: الشعار وحده، للاستخدام داخل رابط قائم (جدول، بطاقة، سلة).
   • ServerLink: شعار + اسم السيرفر داخل رابط واحد يفتح صفحة السيرفر
     (/nova، /istar، /moka، /x)، فالضغط على الأيقونة أو الاسم يقود إلى الصفحة.

   الصور نفسها المستخدمة كعلامة مائية في بطاقات الأسعار (lib/server-branding)
   حتى لا يُضاف أصل بصري جديد لكل سيرفر.
   ========================================================================== */

export type ServerCode = PricingPlan["serverCode"];

/* الشعار بلا أي خلفية أو إطار: الصورة وحدها فوق خلفية الصفحة */
const BOX = "relative inline-flex shrink-0 items-center justify-center";

export function ServerIcon({
  code,
  size = 28,
  className = "",
  eager = false,
}: {
  code: ServerCode;
  /** طول ضلع الصندوق بالبكسل */
  size?: number;
  className?: string;
  eager?: boolean;
}) {
  const mark = SERVER_WATERMARKS[code];
  if (!mark) return null;
  return (
    <span
      className={`${BOX} ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <img
        src={mark.src}
        alt=""
        width={mark.width}
        height={mark.height}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        draggable={false}
        className="max-h-full max-w-full object-contain select-none"
      />
    </span>
  );
}

export function ServerLink({
  code,
  label,
  size = 28,
  className = "",
  textClassName = "",
  ariaLabel,
}: {
  code: ServerCode;
  label: string;
  size?: number;
  className?: string;
  textClassName?: string;
  ariaLabel?: string;
}) {
  return (
    <a
      href={to(`${code}/`)}
      aria-label={ariaLabel ?? `${label} — صفحة السيرفر`}
      className={`group/srv inline-flex items-center gap-2 transition ${className}`}
    >
      <ServerIcon
        code={code}
        size={size}
        className="transition-transform duration-300 group-hover/srv:scale-110"
      />
      <span className={textClassName}>{label}</span>
    </a>
  );
}

export default ServerIcon;
