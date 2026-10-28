import type { CSSProperties } from "react";
import { leagueIcon } from "../content/competitions";
import { IconTrophy } from "./Icons";

/* ==========================================================================
   شارة أيقونة البطولة — مصدر واحد للشعار وبديله في كل الشرائط ورؤوس الصفحات
   --------------------------------------------------------------------------
   • الشعار من مخزن مصدر البيانات نفسه (راجع LEAGUE_ICONS في competitions.ts).
   • البديل المحايد (أيقونة كأس) مرسوم دائماً تحت الشعار: فالبطولة بلا شعار
     موثّق، أو التي يتعذّر تحميل شعارها، تُظهر البديل بلا صورة مكسورة ولا
     فراغ في البطاقة.
   • الأيقونة زخرفية (`aria-hidden` + `alt=""`): اسم البطولة مكتوب بجانبها.
   • `size` اختيارية: الافتراضي 36px (مقاس الشريط)، ورأس صفحة البطولة يمرّر
     مقاساً أكبر (44–56px). المقاس يُحمل في خاصية CSS (`--league-badge-size`)
     تقرأها league-carousel.css فتكبّر اللوح والبديل المحايد معاً — يبقى
     التنسيق في مصدره الواحد بلا نسخ ولا أسلوب سطري على الأبعاد.
   • `eager` للأيقونة فوق الطية (رأس الصفحة): `loading="lazy"` هناك يؤخّر
     الظهور ويسجّل قفز تخطيط؛ الشريط يبقى على الكسول افتراضياً لأنه أسفل
     الصفحة.
========================================================================== */

export default function LeagueIconBadge({
  leagueId,
  size,
  eager = false,
  iconSrc,
}: {
  leagueId: string;
  /** ضلع اللوح المربع بالبكسل — الافتراضي 36px كما في league-carousel.css */
  size?: number;
  /** تحميل فوري بدل الكسول — لأيقونة رأس الصفحة لأنها فوق الطية */
  eager?: boolean;
  /** أيقونة صريحة محلية تتقدّم على مخزن المصدر — لشعار FIFA على تذكرة
      الجامعة بطلب المالك (leagueId="matches" بلا شعار موثّق لدى المصدر) */
  iconSrc?: string;
}) {
  const icon = iconSrc ?? leagueIcon(leagueId);
  /* صندوق الصورة = اللوح ناقص الحشو (4px من كل جانب كما في .league-carousel-logo) */
  const logoBox = size ? size - 8 : 28;
  return (
    <span
      className="league-carousel-badge"
      aria-hidden="true"
      /* خاصية CSS مخصصة (لا أساليب أبعاد سطرية) حتى تبقى القواعد في ملفها */
      style={size ? ({ "--league-badge-size": `${size}px` } as CSSProperties) : undefined}
    >
      <IconTrophy className="league-carousel-fallback" />
      {icon ? (
        <img
          ref={(img) => {
            if (img && img.complete && img.naturalWidth > 0) {
              img.dataset.loaded = "true";
            }
          }}
          className="league-carousel-logo"
          src={icon}
          alt=""
          width={logoBox}
          height={logoBox}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          draggable={false}
          onLoad={(event) => {
            event.currentTarget.dataset.loaded = "true";
          }}
          onError={(event) => {
            /* الشعار إن غاب أو تعذّر تحميله يبقى البديل المحايد ظاهراً تحته */
            delete event.currentTarget.dataset.loaded;
            event.currentTarget.style.visibility = "hidden";
          }}
        />
      ) : null}
    </span>
  );
}
