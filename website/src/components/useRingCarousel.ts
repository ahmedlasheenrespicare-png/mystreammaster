import { motionReduced, motionMedia } from "../lib/motion-preference";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";

/* ==========================================================================
   خطّاف الحلقة الدائرية ثلاثية الأبعاد (مقتبس هندسياً من ilkhoeri/swift-panda-38)
   --------------------------------------------------------------------------
   • دوران خطوي تلقائي كل 5 ثوانٍ (5000ms) بدل الدوران اللانهائي المستمر،
     بزاوية تراكمية غير مقطوعة (فلا ترتدّ الحلقة عكسياً عند الانتقال من 8 إلى 1).
   • دعم كامل للسحب باللمس والفأرة (Touch & Pointer Drag) بمتابعة لحظية لإصبع
     المستخدم مع احترام التمرير الرأسي للصفحة على الجوال (touch-action: pan-y).
   • يتوقف المؤقّت تلقائياً أثناء التحويم بالفأرة (لقراءة القائمة المنسدلة)،
     وأثناء اللمس/السحب، وعند التركيز بلوحة المفاتيح، وعند خفاء التبويب أو
     تفعيل تفضيل تقليل الحركة (prefers-reduced-motion: reduce).
========================================================================== */

const AUTO_STEP_MS = 5_000;
const DRAG_LOCK_PX = 6;
const SWIPE_THRESHOLD_PX = 26;
const DEG_PER_PX = 0.24;

export interface RingCarouselApi {
  /** البطاقة المواجهة للمستخدم في مقدمة الحلقة (0 .. count-1) */
  activeIndex: number;
  /** عدد عناصر الحلقة */
  count: number;
  /** زاوية دوران الحلقة الحالية بالدرجات (شاملة إزاحة السحب اللحظية) */
  ringAngleDeg: number;
  /** زاوية الخطوة الواحدة (360 / count) */
  stepDeg: number;
  /** هل يجري السحب حالياً */
  dragging: boolean;
  /** هل اكتمل التفعيل على المتصفح */
  ready: boolean;
  /** خطوة للأمام (+1) أو للخلف (-1) حول الدائرة */
  stepBy: (delta: 1 | -1) => void;
  /** الانتقال إلى بطاقة بعينها بأقصر قوس دائري */
  goToIndex: (targetIndex: number) => void;
  /** خصائص الجذر (التحويم بالفأرة + لوحة المفاتيح) */
  rootProps: {
    "data-ready": "true" | "false";
    "data-dragging": "true" | "false";
    "data-active-index": number;
    onPointerEnter: (event: PointerEvent<HTMLElement>) => void;
    onPointerLeave: (event: PointerEvent<HTMLElement>) => void;
    onFocusCapture: () => void;
    onBlurCapture: (event: React.FocusEvent<HTMLElement>) => void;
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  };
  /** خصائص مسرح السحب باللمس والفأرة */
  stageProps: {
    onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
    onPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
    onPointerUp: (event: PointerEvent<HTMLDivElement>) => void;
    onPointerCancel: (event: PointerEvent<HTMLDivElement>) => void;
    onClickCapture: (event: MouseEvent<HTMLDivElement>) => void;
  };
}

export function useRingCarousel({
  count,
  paused = false,
}: {
  count: number;
  paused?: boolean;
}): RingCarouselApi {
  const safeCount = Math.max(1, count);
  const stepDeg = 360 / safeCount;

  const [ready, setReady] = useState(false);
  const [step, setStep] = useState(0);
  const [dragDeg, setDragDeg] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [interactionTick, setInteractionTick] = useState(0);

  const dragRef = useRef<{
    active: boolean;
    pointerId: number;
    startX: number;
    startY: number;
    axis: "x" | "y" | null;
    moved: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);

  const activeIndex = ((step % safeCount) + safeCount) % safeCount;

  useEffect(() => {
    setReady(true);
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = motionMedia();
    const sync = () => setReducedMotion(mql.matches);
    sync();
    mql.addEventListener?.("change", sync);
    return () => mql.removeEventListener?.("change", sync);
  }, []);

  const bumpTimer = useCallback(() => {
    setInteractionTick((n) => n + 1);
  }, []);

  const stepBy = useCallback(
    (delta: 1 | -1) => {
      setStep((s) => s + delta);
      bumpTimer();
    },
    [bumpTimer],
  );

  const goToIndex = useCallback(
    (targetIndex: number) => {
      const normalizedTarget = ((targetIndex % safeCount) + safeCount) % safeCount;
      setStep((currentStep) => {
        const currentIndex = ((currentStep % safeCount) + safeCount) % safeCount;
        let diff = normalizedTarget - currentIndex;
        /* اختيار أقصر قوس حول الدائرة حتى لا تلفّ الحلقة دورة كاملة بلا داعٍ */
        if (diff > safeCount / 2) diff -= safeCount;
        if (diff < -safeCount / 2) diff += safeCount;
        return currentStep + diff;
      });
      bumpTimer();
    },
    [safeCount, bumpTimer],
  );

  /* التحريك التلقائي كل 5 ثوانٍ مع احترام التفاعل وتقليل الحركة */
  useEffect(() => {
    if (!ready || safeCount <= 1) return;
    if (paused || hovered || dragging || focused || reducedMotion) return;

    const id = window.setInterval(() => {
      if (document.hidden) return;
      if (motionReduced()) return;
      setStep((s) => s + 1);
    }, AUTO_STEP_MS);

    return () => window.clearInterval(id);
  }, [ready, safeCount, paused, hovered, dragging, focused, reducedMotion, interactionTick]);

  const onPointerEnter = useCallback((event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === "mouse") setHovered(true);
  }, []);

  const onPointerLeave = useCallback((event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === "mouse") setHovered(false);
  }, []);

  const onFocusCapture = useCallback(() => {
    setFocused(true);
  }, []);

  const onBlurCapture = useCallback((event: React.FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setFocused(false);
    }
  }, []);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      /* في واجهة RTL: السهم الأيسر يتقدّم للبطولة التالية، والأيمن يعود للسابقة */
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        stepBy(1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        stepBy(-1);
      } else if (event.key === "Home") {
        event.preventDefault();
        goToIndex(0);
      } else if (event.key === "End") {
        event.preventDefault();
        goToIndex(safeCount - 1);
      }
    },
    [stepBy, goToIndex, safeCount],
  );

  const onPointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    suppressClickRef.current = false;
    dragRef.current = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      axis: null,
      moved: false,
    };
  }, []);

  const onPointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const state = dragRef.current;
    if (!state || !state.active || event.pointerId !== state.pointerId) return;

    const dx = event.clientX - state.startX;
    const dy = event.clientY - state.startY;

    if (!state.axis) {
      if (Math.hypot(dx, dy) < DRAG_LOCK_PX) return;
      if (Math.abs(dy) > Math.abs(dx)) {
        /* تمرير رأسي للصفحة على الجوال — نترك المتصفح يمرّر بحرية */
        state.axis = "y";
        state.active = false;
        return;
      }
      state.axis = "x";
      state.moved = true;
      suppressClickRef.current = true;
      setDragging(true);
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        /* قد لا يدعم محرّك قديم التثبيت */
      }
    }

    if (state.axis === "x") {
      setDragDeg(dx * DEG_PER_PX);
    }
  }, []);

  const finishDrag = useCallback(
    (event: PointerEvent<HTMLDivElement>, cancelled: boolean) => {
      const state = dragRef.current;
      if (!state || event.pointerId !== state.pointerId) return;
      dragRef.current = null;

      if (state.axis === "x") {
        const dx = event.clientX - state.startX;
        const deltaAngle = dx * DEG_PER_PX;
        setDragging(false);
        setDragDeg(0);

        if (!cancelled && Math.abs(dx) >= SWIPE_THRESHOLD_PX) {
          const stepsMoved =
            Math.round(deltaAngle / stepDeg) || (dx > 0 ? 1 : -1);
          setStep((s) => s + stepsMoved);
        }
        bumpTimer();
      }
    },
    [stepDeg, bumpTimer],
  );

  const onPointerUp = useCallback(
    (event: PointerEvent<HTMLDivElement>) => finishDrag(event, false),
    [finishDrag],
  );

  const onPointerCancel = useCallback(
    (event: PointerEvent<HTMLDivElement>) => finishDrag(event, true),
    [finishDrag],
  );

  const onClickCapture = useCallback((event: MouseEvent<HTMLDivElement>) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      event.preventDefault();
      event.stopPropagation();
    }
  }, []);

  return {
    activeIndex,
    count: safeCount,
    ringAngleDeg: step * stepDeg + dragDeg,
    stepDeg,
    dragging,
    ready,
    stepBy,
    goToIndex,
    rootProps: {
      "data-ready": ready ? "true" : "false",
      "data-dragging": dragging ? "true" : "false",
      "data-active-index": activeIndex,
      onPointerEnter,
      onPointerLeave,
      onFocusCapture,
      onBlurCapture,
      onKeyDown,
    },
    stageProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onClickCapture,
    },
  };
}
