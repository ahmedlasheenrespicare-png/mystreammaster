import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

/* ==========================================================================
   آلية الدوّارة (Carousel) — منطق واحد يخدم أكثر من شريط في الموقع
   --------------------------------------------------------------------------
   تستخرج هذه الوحدة ما تشترك فيه كل الدوّارات: القياس، الصفحات، الإزاحة،
   السحب، والتنقّل بالكيبورد. ويبقى لكل شريط markupه وتنسيقه وحده.
   القواعد المطبَّقة هنا (لا تُخالف عند التعديل):
   • لا قياس قبل التركيب: HTML المُسبق رسمه بلا إزاحة وبلا عدد صفحات مخمَّن،
     فلا يختلف ما يرسمه الخادم عمّا يرسمه المتصفح عند الترطيب.
   • قبل القياس تُعتبر الصفحة الواحدة كل العناصر، والمنطقة قابلة للتمرير
     الأصلي — فتبقى كل العناصر متاحة بلا JavaScript.
   • الاتجاه يُقرأ من الصفحة (`direction`) لا من افتراض: في RTL تتقدّم
     الدوّارة بإزاحة الشريط يميناً لأن ما يلي الشاشة يقع على اليسار.
   • الصفحة الأخيرة تقف عند آخر عنصر: لا إزاحة زائدة تُظهر فراغاً.
   • السحب يتبع الإصبع فعلياً في الاتجاهين، والنقرة التي تلي سحباً حقيقياً
     لا تُمرَّر إلى العنصر (لا فتح رابط بالخطأ).
========================================================================== */

/* حدّ أدنى للإزاحة باللمس/الفأرة يُعتبر قصداً للتنقّل صفحةً كاملة (بكسل) */
const SWIPE_THRESHOLD = 24;

export interface Carousel {
  /** رقم الصفحة الحالية (يبدأ من صفر) */
  page: number;
  /** عدد الصفحات بعد القياس */
  pages: number;
  /** تمّ القياس: تُدار الصفحة بالإزاحة ويُمنع التمرير الأصلي */
  ready: boolean;
  /** الانتقال صفحةً كاملة للأمام (+) أو للخلف (−) */
  go(delta: number): void;
  /** الانتقال إلى الصفحة التي يقع فيها عنصر بفهرسه */
  goToIndex(index: number): void;
  /** الانتقال إلى صفحة بعينها (تستخدمه النقاط) */
  setPage(page: number): void;
  /** تُبسَط على عنصر الشريط الجذر (`data-ready`, `data-dragging`) */
  rootProps: Record<string, string>;
  /** تُبسَط على المنطقة القابلة للعرض (التركيز، الكيبورد، الوصولية) */
  viewportProps: {
    ref: (node: HTMLDivElement | null) => void;
    tabIndex: number;
    role: "group";
    "aria-label": string;
    onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  };
  /** تُبسَط على المسار المتحرّك (الإزاحة + أحداث السحب) */
  trackProps: {
    ref: (node: HTMLDivElement | null) => void;
    style: CSSProperties | undefined;
    onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
    onPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
    onPointerUp: (event: PointerEvent<HTMLDivElement>) => void;
    onPointerCancel: (event: PointerEvent<HTMLDivElement>) => void;
    onClickCapture: (event: { preventDefault: () => void; stopPropagation: () => void }) => void;
  };
}

export function useCarousel({ count, label }: { count: number; label: string }): Carousel {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef({ active: false, startX: 0 });
  /* السحب الذي ينتهي فوق رابط لا يجب أن يفتح صفحته: النقرة تُمنع مرة واحدة
     بعد كل سحب يتجاوز الحد، وإلا كان تمرير الشريط بالإصبع فتحاً غير مقصود. */
  const dragClickRef = useRef(false);

  const [page, setPage] = useState(0);
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [rtl, setRtl] = useState(false);
  const [metrics, setMetrics] = useState({
    perView: Math.max(1, count),
    pageSize: 0,
    maxOffset: 0,
    ready: false,
  });

  const pages = Math.max(1, Math.ceil(count / metrics.perView));

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
        Math.min(count, Math.floor((viewport.clientWidth + gap) / step)),
      );
      /* الصفحة الأخيرة تُقف عند نهاية الشريط: لا إزاحة زائدة تُظهر فراغاً
         بعد آخر عنصر. */
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
  }, [count]);

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

  const onClickCapture = (event: { preventDefault: () => void; stopPropagation: () => void }) => {
    if (!dragClickRef.current) return;
    dragClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
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

  return {
    page,
    pages,
    ready: metrics.ready,
    go,
    goToIndex,
    setPage,
    rootProps: {
      "data-ready": metrics.ready ? "true" : "false",
      "data-dragging": dragging ? "true" : "false",
    },
    viewportProps: {
      ref: (node: HTMLDivElement | null) => {
        viewportRef.current = node;
      },
      tabIndex: 0,
      role: "group",
      "aria-label": `${label} — صفحة ${page + 1} من ${pages}`,
      onKeyDown,
    },
    trackProps: {
      ref: (node: HTMLDivElement | null) => {
        trackRef.current = node;
      },
      style: metrics.ready ? ({ transform: `translateX(${offset}px)` } as CSSProperties) : undefined,
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      onClickCapture,
    },
  };
}
