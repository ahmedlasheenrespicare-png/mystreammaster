import { leagueIcon } from "../content/competitions";
import { IconTrophy } from "./Icons";

/* ==========================================================================
   شارة أيقونة البطولة — مصدر واحد للشعار وبديله في كل الشرائط والبطاقات
   --------------------------------------------------------------------------
   • الشعار من مخزن مصدر البيانات نفسه (راجع LEAGUE_ICONS في competitions.ts).
   • البديل المحايد (أيقونة كأس) مرسوم دائماً تحت الشعار: فالبطولة بلا شعار
     موثّق، أو التي يتعذّر تحميل شعارها، تُظهر البديل بلا صورة مكسورة ولا
     فراغ في البطاقة.
   • الأيقونة زخرفية (`aria-hidden` + `alt=""`): اسم البطولة مكتوب بجانبها.
========================================================================== */

export default function LeagueIconBadge({ leagueId }: { leagueId: string }) {
  const icon = leagueIcon(leagueId);
  return (
    <span className="league-carousel-badge" aria-hidden="true">
      <IconTrophy className="league-carousel-fallback" />
      {icon ? (
        <img
          className="league-carousel-logo"
          src={icon}
          alt=""
          width={28}
          height={28}
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={(event) => {
            /* الشعار إن غاب أو تعذّر تحميله يبقى البديل المحايد ظاهراً تحته */
            event.currentTarget.style.visibility = "hidden";
          }}
        />
      ) : null}
    </span>
  );
}
