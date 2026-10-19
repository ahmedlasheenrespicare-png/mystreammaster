import snapshot from "../content/standings-snapshot.json";
import { leagueStandingsByLeague } from "../lib/standings.mjs";
import { cleanTeamName } from "../lib/fixtures-archive.mjs";
import { resolveApprovedTeamLogo, teamInitials } from "./StandingsRatesCard";
import { providerTeamLogo } from "../lib/leader-logo.mjs";
import CarouselControls from "./CarouselControls";
import LeagueIconBadge from "./LeagueIconBadge";
import { useCarousel } from "./useCarousel";
import "./league-carousel.css";

/* ==========================================================================
   شريط روابط صفحات البطولات — دوّارة (Carousel) بمؤشرات نقطية وأسهم تنقّل
   --------------------------------------------------------------------------
   النمط مطابق لدوّارة قسم «آراء المستخدمين» في الصفحة الرئيسية: صف من
   المؤشرات النقطية بين زرّي «السابق / التالي»، والنقطة النشطة تتمدّد.
   وآلية الدوّارة نفسها (القياس، الإزاحة، السحب، الكيبورد) في useCarousel
   يشاركها فيها شريط «إحصائيات البطولات» — منطق واحد، تنسيق لكل شريط وحده.
   • بلا تقدّم تلقائي: شريط تنقّل (روابط) لا يعرض محتوى متسلسلاً، والتحريك
     التلقائي يسحب الروابط من تحت يد الزائر.
   • الروابط كلها في HTML قبل التشغيل (لا تُستنسخ ولا تُبنى بـ JS) فتبقى
     مدرَكة للزاحفين ولقارئ الشاشة، ويبقى الشريط قابلاً للتمرير اليدوي إن لم
     يعمل JavaScript — تُخفى الروابط الزائدة عن العرض بعد القياس فقط.
========================================================================== */

export interface LeagueLinkItem {
  /** رابط صفحة البطولة كما يظهر في HTML */
  href: string;
  /** النص الظاهر للرابط */
  label: string;
  /** معرّف البطولة لدى مصدر البيانات — مفتاح الأيقونة */
  leagueId: string;
  standingsLeagueId: string | null;
}

/** لقطة البناء فقط: لا طلب شبكي جديد، ولا استنتاج للمتصدّر عند غياب الترتيب. */
function LeagueLeader({ league }: { league: string | null }) {
  let leader;
  let provider: string | undefined;
  try {
    const table = league ? leagueStandingsByLeague(snapshot, league) : null;
    leader = table ? table.entries.find((team) => team.rank === 1) : null;
    provider = table?.provider;
  } catch {
    leader = null;
  }
  const name = leader ? cleanTeamName(leader.name) : "";
  const localLogo = name ? resolveApprovedTeamLogo({ name }) : null;
  /* مؤقت بطلب المالك: شعار من مزوّد ترتيب البطولة (ESPN لبطولاتها، وHighlightly
     للدوري المصري). الشعار المحلي يبقى بديلاً فورياً إن فشل تحميل صورة المصدر،
     ثم بديل الأحرف. */
  const providerCrest = leader ? providerTeamLogo({ teamId: leader.teamId, provider }) : null;
  const logo = providerCrest ?? localLogo;
  const fallbackLogo = providerCrest && localLogo && localLogo !== providerCrest ? localLogo : null;
  return (
    <>
      <span className="league-carousel-banner" aria-hidden="true">
        <span className="league-carousel-monogram">
          <span>{name ? teamInitials(name) : "؟"}</span>
          {leader && <small><bdi dir="ltr">#1</bdi></small>}
        </span>
        {logo && (
          <img
            className="league-carousel-leader-logo"
            src={logo}
            alt=""
            aria-hidden="true"
            width={96}
            height={96}
            loading="lazy"
            decoding="async"
            draggable={false}
            data-crest-source={providerCrest ? providerCrest.includes("highlightly.net") ? "highlightly" : "espn" : "local"}
            onError={(event) => {
              const image = event.currentTarget;
              /* خطأ واحد على صورة المصدر ينزل إلى الشعار المحلي؛ وخطأ ثانٍ
                 يُخفي الصورة وحدها فيبقى بديل الأحرف ظاهراً. */
              if (fallbackLogo && image.getAttribute("src") !== fallbackLogo) {
                image.setAttribute("src", fallbackLogo);
                image.dataset.crestSource = "local";
                return;
              }
              image.style.visibility = "hidden";
            }}
          />
        )}
      </span>
      <span className="league-carousel-leader">المتصدّر: <bdi>{name || "غير متاح"}</bdi></span>
    </>
  );
}

interface Props {
  items: LeagueLinkItem[];
  /** عنوان الشريط */
  title?: string;
  /** اسم الشريط لقارئ الشاشة */
  label?: string;
}

export default function LeagueLinksCarousel({
  items,
  title = "صفحات البطولات",
  label = "صفحات البطولات",
}: Props) {
  const carousel = useCarousel({ count: items.length, label });

  return (
    <nav
      className="matches-league-links league-carousel"
      aria-label={label}
      aria-roledescription="carousel"
      {...carousel.rootProps}
    >
      <div className="league-carousel-head">
        <strong>{title}</strong>
        <span className="league-carousel-count" aria-hidden="true">
          {items.length} بطولة
        </span>
      </div>

      <div className="league-carousel-viewport" {...carousel.viewportProps}>
        <div className="league-carousel-track" {...carousel.trackProps}>
          {items.map((item, index) => (
            <a
              key={item.href}
              href={item.href}
              className="league-carousel-item"
              /* منع سحب الرابط الأصلي (سحب صورة/رابط يبدأ تنقّلاً أصلياً
                 يقطع أحداث المؤشر فيبطل السحب بالفأرة على الشريط) */
              draggable={false}
              onFocus={() => carousel.goToIndex(index)}
            >
              <LeagueLeader league={item.standingsLeagueId} />
              <span className="league-carousel-caption">
                <LeagueIconBadge leagueId={item.leagueId} />
                <span className="league-carousel-label">{item.label}</span>
              </span>
            </a>
          ))}
        </div>
      </div>

      <CarouselControls
        page={carousel.page}
        pages={carousel.pages}
        onStep={carousel.go}
        onSelect={carousel.setPage}
        dotsLabel="صفحات شريط البطولات"
        nextLabel="البطولات التالية"
        prevLabel="البطولات السابقة"
      />
    </nav>
  );
}
