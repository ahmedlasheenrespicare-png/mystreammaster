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
              <LeagueIconBadge leagueId={item.leagueId} />
              <span className="league-carousel-label">{item.label}</span>
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
