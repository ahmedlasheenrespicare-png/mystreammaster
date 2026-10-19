import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { leagueIcon } from "../content/competitions";
import { IconArrow, IconArrowBack, IconTrophy } from "./Icons";
import "./league-carousel.css";

/* ==========================================================================
   شريط روابط صفحات البطولات — دوّارة (Carousel) بمؤشرات نقطية وأسهم تنقّل
   --------------------------------------------------------------------------
   النمط مطابق لدوّارة قسم «آراء المستخدمين» في الصفحة الرئيسية: صف من
   المؤشرات النقطية بين زرّي «السابق / التالي»، والنقطة النشطة تتمدّد.
   الفروق المقصودة هنا:
   • بلا تقدّم تلقائي: شريط تنقّل (روابط) لا يعرض محتوى متسلسلاً، والتحريك
     التلقائي يسحب الروابط من تحت يد الزائر.
   • الروابط كلها في HTML قبل التشغيل (لا تُستنسخ ولا تُبنى بـ JS) فتبقى
     مدرَكة للزاحفين ولقارئ الشاشة، ويبقى الشريط قابلاً للتمرير اليدوي إن لم
     يعمل JavaScript — تُخفى الروابط الزائدة عن العرض بعد القياس فقط.
   • القياس يتم بعد التركيب (عرض عنصر واحد + الفراغ) فيُحسب عدد الصفحات من
     القياس الفعلي لا من تخمين ثابت لعرض الشاشة.
   • الاتجاه يُقرأ من الصفحة (`direction`) لا من افتراض: في RTL تتقدّم
     الدوّارة بإزاحة الشريط يميناً لأن العناصر التالية تقع على اليسار.
   • الأيقونة من مصدر البيانات (راجع LEAGUE_ICONS)؛ وغيابها أو فشل تحميلها
     يُظهر بديلاً محايداً بدل صورة مكسورة.
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

/* حدّ أدنى للإزاحة باللمس/الفأرة يُعتبر قصداً للتنقّل صفحةً كاملة (بكسل) */
const SWIPE_THRESHOLD = 24;

export default function LeagueLinksCarousel({
  items,
  title = "صفحات البطولات",
  label = "صفحات البطولات",
}: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ active: false, startX: 0 });
  /* السحب الذي ينتهي فوق رابط لا يجب أن يفتح صفحته: النقرة تُمنع مرة واحدة
     بعد كل سحب يتجاوز الحد، وإلا كان تمرير الشريط بالإصبع فتحاً غير مقصود. */
  const dragClickRef = useRef(false);

  const [page, setPage] = useState(0);
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [rtl, setRtl] = useState(false);
  /* القياس كله بعد التركيب: لا عرض ولا إزاحة في HTML المُسبق الرسم، فلا يختلف
     ما يرسمه الخادم عمّا يرسمه المتصفح عند الترطيب (hydration). وقبل القياس
     تُعتبر الصفحة الواحدة هي كل الروابط (`perView = items.length`) فلا يظهر
     مؤشر «1 من 8» زائفاً قبل أن يُعرف العرض الحقيقي — والشريط في تلك اللحظة
     قابل للتمرير الأصلي فتبقى كل الروابط متاحة بلا JavaScript أصلاً. */
  const [metrics, setMetrics] = useState({
    perView: Math.max(1, items.length),
    pageSize: 0,
    maxOffset: 0,
    ready: false,
  });

  const pages = Math.max(1, Math.ceil(items.length / metrics.perView));

  /* اتجاه الصفحة: RTL أم LTR — يُقرأ من العنصر نفسه لا من افتراض */
  useEffect(() => {
    const viewport = viewportRef.current;
    if (viewport) setRtl(getComputedStyle(viewport).direction === "rtl");
  }, []);

  /* قياس الشريط: عنصر واحد + الفراغ يحدّدان عدد العناصر الظاهرة في الصفحة.
     ResizeObserver يعيد القياس عند تغيّر العرض (تدوير الهاتف، تغيير النافذة). */
  useEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;
    const measure = () => {
      const first = track.firstElementChild as HTMLElement | null;
      if (!first) return;
      const gap = parseFloat(getComputedStyle(track).columnGap || "0") || 0;
      const width = first.getBoundingClientRect().width;
      if (!width) return;
      const step = width + gap;
      const perView = Math.max(
        1,
        Math.min(items.length, Math.floor((viewport.clientWidth + gap) / step)),
      );
      /* الصفحة الأخيرة تُقف عند نهاية الشريط: لا إزاحة زائدة تُظهر فراغاً
         بعد آخر بطاقة (8 بطاقات في صفحات من 5 مثلًا: الصفحة الأخيرة تقف
         عند آخر بطاقة، لا عند إزاحة صفحة كاملة). */
      const maxOffset = Math.max(0, Math.round(track.scrollWidth - viewport.clientWidth));
      setMetrics({ perView, pageSize: step * perView, maxOffset, ready: true });
    };
    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(track);
    return () => observer.disconnect();
  }, [items.length]);

  /* تصغير النافذة قد يُقلّل عدد الصفحات — فلا يبقى الشريط على صفحة زائدة */
  useEffect(() => {
    setPage((current) => Math.min(current, pages - 1));
  }, [pages]);

  /* التمرير الأصلي داخل الشريط مصدر ثانٍ للموضع بعد الترطيب (التركيز بالـTab
     يُمرّر الحاوية مثلاً) فيُصفَّر لأن الموضع مُدار بالإزاحة لا بالتمرير. */
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const reset = () => {
      viewport.scrollLeft = 0;
    };
    viewport.addEventListener("scroll", reset);
    return () => viewport.removeEventListener("scroll", reset);
  }, []);

  const go = (delta: number) =>
    setPage((current) => Math.max(0, Math.min(pages - 1, current + delta)));

  const goToIndex = (index: number) => setPage(Math.floor(index / metrics.perView));

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!metrics.ready || pages < 2) return;
    dragRef.current = { active: true, startX: event.clientX };
    setDragging(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    /* الشريط يتبع الإصبع فعلياً: الإزاحة نفسها في الاتجاهين، والفرق يظهر في
       حساب الصفحة عند الإفلات لا في لحظة السحب. */
    setDrag(event.clientX - dragRef.current.startX);
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    const moved = event.clientX - dragRef.current.startX;
    dragClickRef.current = Math.abs(moved) > SWIPE_THRESHOLD;
    setDrag(0);
    setDragging(false);
    if (!metrics.pageSize) return;
    /* تقدّم مقيس بترتيب القراءة: في LTR يسحب الزائر يساراً للتقدّم، وفي RTL
       يميناً (لأن ما يلي الشاشة يقع على يسارها). */
    const advance = moved * (rtl ? 1 : -1);
    let next = Math.round((page * metrics.pageSize + advance) / metrics.pageSize);
    if (Math.abs(moved) > SWIPE_THRESHOLD && next === page) {
      next = page + (advance > 0 ? 1 : -1);
    }
    setPage(Math.max(0, Math.min(pages - 1, next)));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight") {
      go(rtl ? -1 : 1);
      event.preventDefault();
    } else if (event.key === "ArrowLeft") {
      go(rtl ? 1 : -1);
      event.preventDefault();
    }
  };

  const distance = Math.min(page * metrics.pageSize, metrics.maxOffset);
  const offset = metrics.ready ? (rtl ? 1 : -1) * distance + drag : 0;

  return (
    <nav
      className="matches-league-links league-carousel"
      aria-label={label}
      aria-roledescription="carousel"
      data-ready={metrics.ready ? "true" : "false"}
      data-dragging={dragging ? "true" : "false"}
    >
      <div className="league-carousel-head">
        <strong>{title}</strong>
        <span className="league-carousel-count" aria-hidden="true">
          {items.length} بطولة
        </span>
      </div>

      <div
        ref={viewportRef}
        className="league-carousel-viewport"
        tabIndex={0}
        role="group"
        aria-label={`${label} — صفحة ${page + 1} من ${pages}`}
        onKeyDown={onKeyDown}
      >
        <div
          ref={trackRef}
          className="league-carousel-track"
          style={metrics.ready ? { transform: `translateX(${offset}px)` } : undefined}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onClickCapture={(event) => {
            if (!dragClickRef.current) return;
            dragClickRef.current = false;
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          {items.map((item, index) => {
            const icon = leagueIcon(item.leagueId);
            return (
              <a
                key={item.href}
                href={item.href}
                className="league-carousel-item"
                /* منع سحب الرابط الأصلي (سحب صورة/رابط يبدأ تنقّلاً أصلياً
                   يقطع أحداث المؤشر فيبطل السحب بالفأرة على الشريط) */
                draggable={false}
                onFocus={() => goToIndex(index)}
              >
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
                        /* الشعار إن غاب أو تعذّر تحميله يبقى البديل المحايد
                           ظاهراً تحته — بلا صورة مكسورة ولا فراغ في البطاقة. */
                        event.currentTarget.style.visibility = "hidden";
                      }}
                    />
                  ) : null}
                </span>
                <span className="league-carousel-label">{item.label}</span>
              </a>
            );
          })}
        </div>
      </div>

      <div className="league-carousel-controls">
        {/* الترتيب كما في دوّارة التقييمات: الزر الأول يميناً في RTL وهو التالي،
            لأن ما يلي الشاشة يقع على اليسار. */}
        <button
          type="button"
          className="league-carousel-nav"
          onClick={() => go(1)}
          disabled={pages < 2 || page >= pages - 1}
          aria-label="البطولات التالية"
        >
          <IconArrowBack className="w-[18px] h-[18px]" />
        </button>
        <div className="league-carousel-dots" role="group" aria-label="صفحات شريط البطولات">
          {Array.from({ length: pages }, (_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setPage(index)}
              className={`league-carousel-dot${index === page ? " is-active" : ""}`}
              aria-label={`الصفحة ${index + 1} من ${pages}`}
              aria-current={index === page ? "true" : undefined}
            />
          ))}
        </div>
        <button
          type="button"
          className="league-carousel-nav"
          onClick={() => go(-1)}
          disabled={pages < 2 || page === 0}
          aria-label="البطولات السابقة"
        >
          <IconArrow className="w-[18px] h-[18px]" />
        </button>
      </div>
    </nav>
  );
}
