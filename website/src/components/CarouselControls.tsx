import { IconArrow, IconArrowBack } from "./Icons";

/* ==========================================================================
   أدوات تنقّل الدوّارة — سهمان ومؤشرات نقطية (نمط واحد لكل الشرائط)
   --------------------------------------------------------------------------
   النقطة النشطة (Active indicator) تتمدّد وتحمل `aria-current`، والزرّان
   يُعطَّلان عند الطرفين. الترتيب كما في دوّارة «آراء المستخدمين»: الزر
   الأول في DOM يميناً في RTL وهو التالي، لأن ما يلي الشاشة يقع على اليسار.
========================================================================== */

interface Props {
  page: number;
  pages: number;
  onStep: (delta: number) => void;
  onSelect: (page: number) => void;
  /** اسم مجموعة النقاط لقارئ الشاشة */
  dotsLabel: string;
  /** وسما الزرّين — يُخصَّصان بحسب محتوى الشريط */
  nextLabel?: string;
  prevLabel?: string;
}

export default function CarouselControls({
  page,
  pages,
  onStep,
  onSelect,
  dotsLabel,
  nextLabel = "الصفحة التالية",
  prevLabel = "الصفحة السابقة",
}: Props) {
  return (
    <div className="league-carousel-controls">
      <button
        type="button"
        className="league-carousel-nav"
        onClick={() => onStep(1)}
        disabled={pages < 2 || page >= pages - 1}
        aria-label={nextLabel}
      >
        <IconArrowBack className="w-[18px] h-[18px]" />
      </button>
      <div className="league-carousel-dots" role="group" aria-label={dotsLabel}>
        {Array.from({ length: pages }, (_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => onSelect(index)}
            className={`league-carousel-dot${index === page ? " is-active" : ""}`}
            aria-label={`الصفحة ${index + 1} من ${pages}`}
            aria-current={index === page ? "true" : undefined}
          />
        ))}
      </div>
      <button
        type="button"
        className="league-carousel-nav"
        onClick={() => onStep(-1)}
        disabled={pages < 2 || page === 0}
        aria-label={prevLabel}
      >
        <IconArrow className="w-[18px] h-[18px]" />
      </button>
    </div>
  );
}
