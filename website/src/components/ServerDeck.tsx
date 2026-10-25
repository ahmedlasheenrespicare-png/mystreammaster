import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  AVAILABLE_DURATIONS,
  CURRENCIES,
  getWhatsAppUrl,
  PRICING_PLANS,
  type PricingPlan,
} from "../data";
import { to } from "../config";
import { SERVER_WATERMARKS } from "../lib/server-branding";
import { dragOffset, pickAxis, swipeDirection } from "./deck-swipe.mjs";
import "./server-deck.css";

/* ==========================================================================
   مجسّم السيرفرات — نسخة من كارت uiverse (blue-wombat-46)
   --------------------------------------------------------------------------
   نفس الهندسة: مروحة كروت مائلة داخل إطار مخفي الفائض، وكل كارت فيه لوحه
   الزجاجي الخاص (‎--pd:4px) بحرف ضخم مفرّغ، وخطّا توهّج أسفل المروحة.
   الكارت الأمامي (z-index أعلى) يتبدّل كل 3 ثوانٍ كما في التصميم الأصلي؛
   يتوقّف التبديل عند المرور/التركيز، ويُلغى مع prefers-reduced-motion،
   وتسمح النقاط بتثبيت أي كارت.

   • الافتراضي: أربعة كروت — كل باقة متجر في كارت (بلا تغيير عن التصميم).
   • ويمكن تمرير `cards` صراحةً: كل عنصر كارت مستقل (سيرفر × مدة)، فتتوسّع
     المروحة لأي عدد (مقال مصر: سيرفران × ثلاث مدد = ستة كروت) بنفس التبديل.
   ========================================================================== */

type ServerCode = PricingPlan["serverCode"];

const GLYPH: Record<ServerCode, string> = { nova: "N", istar: "i", moka: "M", x: "X" };

/* مواضع مروحة التصميم الأصلي حرفياً (أربعة كروت): الوسط ثم يمين ويسار ثم
   طبقة خلف الوسط حتى يظهر السيرفر الرابع دون كسر المروحة. */
const SLOTS = [
  { left: 75, top: 0, rot: 0 },
  { left: 122, top: 35, rot: 15 },
  { left: 28, top: 35, rot: -15 },
  { left: 58, top: 18, rot: -7 },
];

/* مروحة موسّعة لأي عدد كروت: المسافة الموقّعة تُرتّب الكروت حول الأمامي
   واحداً يميناً وواحداً يساراً بالتبادل، فيبقى الشكل مروحة متماثلة. */
const FAN_CARD = 150; // عرض الكارت (كما في CSS)
/* الإزاحة الأفقية بين كل كارت والكارت الذي أمامه — مبنية على هندسة التصميم
   الأصلي: كارت الأمام على 75، واليمين على 122 (+47)، واليسار على 28 (−47). */
const FAN_GAP = 47; // نفس خطوة التصميم الأصلي بين الأمامي والجانبي
const FAN_STEP_DOWN = 6; // نزول كل كارت خلفي ليظهر أسفل الذي أمامه
const FAN_WIDTH = 520; // يكفي ثلاثة كروت في كل جهة مع تراكب مقبول

/** ترتيب الكروت حول الأمامي بنفس هندسة التصميم الأصلي ثم مدّها:
 *  الكارت الأمامي في الوسط تماماً (0°)، وكل كارت تالٍ يبعد 47px أفقياً
 *  (نفس فرق الأمام 75 ↔ الجانبين 122/28 في الأصل) و15° ميلاً.
 *  الكروت الأخيرة تنزل قليلاً وتزيد ميلاً حتى تظهر حافتها دون أن تغطي الأمامي. */
function fanSlot(r: number) {
  if (r === 0) return { left: 0, top: 0, rot: 0 };
  const k = Math.ceil(r / 2);
  const sign = r % 2 === 1 ? 1 : -1;
  return {
    /* اتساع أكبر من خطوة الأصل كي تظهر حافة كل كارت (47px تُبقيها مخفيّة) */
    left: sign * (k * FAN_GAP + (k - 1) * 22),
    top: k * FAN_STEP_DOWN + (k - 1) * 10,
    rot: sign * Math.min(20, 7 + k * 5),
  };
}

/** كارت واحد في الشريط: سيرفر + مدة + سعر معروض */
export interface DeckCard {
  /** معرّف فريد للكارت (السيرفر + المدة) */
  key: string;
  code: ServerCode;
  /** اسم السيرفر كما يظهر على الكارت */
  name: string;
  /** المدة كما تُعرض: "12 شهراً" */
  termLabel: string;
  amount: number;
  /** رمز العملة: "ج.م" أو "ر.س" */
  currency: string;
  /** وجهة الكارت */
  href: string;
  /** شارة صغيرة أعلى الكارت (تُعرض فقط عند تمرير cards صراحةً) */
  badge?: string;
}

/** تبويب مدة: عنوان + بطاقتان (سيرفر لكل بطاقة) لنفس المدة */
export interface DeckTab {
  /** معرّف التبويب — مدة الاشتراك: "3" أو "6" أو "12" */
  key: string;
  /** نص التبويب كما يظهر: "3 أشهر" */
  label: string;
  /** سطر صغير تحت النص: "من 300 ج.م" */
  hint?: string;
  /** بطاقات هذه المدة — بطاقتان في العرض المصري (نوفا وX) */
  cards: DeckCard[];
}

/* موضعا البطاقتين داخل إطار التبويب: كلتاهما كاملة ومرئية، بميل خفيف
   يحفظ لغة المروحة الأصلية (‎-7° و‎+7°) دون أن يتغطى أي كارت. */
const PAIR_SLOTS = [
  { left: 26, top: 14, rot: -7 },
  { left: 204, top: 14, rot: 7 },
];
const PAIR_WIDTH = 380;
const PAIR_HEIGHT = 250;

/* ارتفاع الإطار في المروحة الموسّعة: يكفي لإظهار الكارت الأمامي كاملاً مع زر
   التفعيل، بدل قصّه عند ارتفاع التصميم الأصلي (160) المخصّص للأربعة. */
const FAN_HEIGHT = 268;

const ROTATE_MS = 3000;

export interface ServerDeckProps {
  label?: string;
  /** عملة العرض المختارة من زر الهيدر — تُطبَّق على أسعار المتجر */
  currency?: string;
  /** كروت صريحة (سيرفر × مدة) — بلا تمرير تُعرض باقات المتجر الأربع */
  cards?: DeckCard[];
  /** تبويبات مدد (3 / 6 / 12) — كل تبويب بطاقتان: يسبقها شريط التبويبات */
  tabs?: DeckTab[];
}

export default function ServerDeck({ label, currency, cards, tabs }: ServerDeckProps) {
  /* مع التبويبات: شريط مدد فوق المروحة، وبطاقتان كاملتان لكل مدة */
  if (tabs && tabs.length > 0) return <TabbedDeck label={label} tabs={tabs} />;
  return <FanDeck label={label} cards={cards} currency={currency} />;
}

/* ==========================================================================
   التقليب باللمس — الكروت تتحرّك مع الإصبع فعلياً، لا مجرد تبديل بعد الرفع
   --------------------------------------------------------------------------
   • قفل المحور بعد 8px: أفقي = تقليب، رأسي = تمرير الصفحة (touch-action: pan-y).
   • أثناء السحب تُكتب إزاحة الشريط على العنصر مباشرة (`--deck-drag`) بلا
     إعادة رسم React، فتتبع الكروت الإصبع بنسبة 1:1 (dragOffset) بلا تلعثم.
   • عند الرفع: إن تجاوزت المسافة 42px يُقلَّب الكارت، ثم يرتدّ الشريط بحركة
     مرنة؛ وإن كانت أقل يرتدّ وحده.
   • النقرة الناتجة عن السحب تُكتَم حتى لا يُفتح رابط السيرفر أو زر «تفعيل».
   الحساب نفسه في deck-swipe.mjs ليختبره scripts/test-deck-swipe.mjs.
   ========================================================================== */
function useDeckSwipe({
  onNext,
  onPrev,
  onDragStart,
  onDragEnd,
}: {
  onNext: () => void;
  onPrev: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  /* العنصر يُؤخذ من الحدث نفسه لا من ref: في وضع التبويبات هناك شريط لكل مدة،
     وref واحد كان يشير إلى آخر شريط مرسوم فيُكتب السحب على شريط مخفي. */
  const origin = useRef<{ x: number; y: number; id: number; el: HTMLDivElement } | null>(null);
  const axis = useRef<"x" | "y" | null>(null);
  const lastDx = useRef(0);
  const dragging = useRef<HTMLDivElement | null>(null);
  /* السحب فوق زر أو رابط لا يجب أن يُفعّله: نكتم النقرة التي تلي السحب */
  const swallowClick = useRef(false);

  const setDrag = (el: HTMLDivElement | null, px: number) => {
    el?.style.setProperty("--deck-drag", `${px}px`);
  };

  const startDragging = (el: HTMLDivElement) => {
    if (dragging.current === el) return;
    dragging.current = el;
    el.classList.add("is-dragging");
  };

  const endDragging = (el: HTMLDivElement | null) => {
    if (!el) return;
    if (dragging.current !== el) {
      setDrag(el, 0);
      return;
    }
    dragging.current = null;
    /* نرفع الصنف أولاً (فيعمل الانتقال) ثم نصفر الإزاحة في الإطار التالي،
       فيرتدّ الشريط بحركة مرنة مرئية بدل أن يقفز إلى مكانه */
    el.classList.remove("is-dragging");
    requestAnimationFrame(() => setDrag(el, 0));
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    origin.current = {
      x: event.clientX,
      y: event.clientY,
      id: event.pointerId,
      el: event.currentTarget,
    };
    axis.current = null;
    lastDx.current = 0;
    setDrag(event.currentTarget, 0);
    onDragStart();
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = origin.current;
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (!axis.current) {
      const picked = pickAxis(dx, dy);
      if (!picked) return;
      axis.current = picked;
      /* السحب الرأسي ليس لنا: نترك الصفحة تتمرّر ولا نلمس الشكل */
      if (picked === "y") return;
      event.currentTarget.setPointerCapture?.(event.pointerId);
      startDragging(start.el);
    }
    if (axis.current !== "x") return;
    lastDx.current = dx;
    /* الكروت تتبع الإصبع مباشرة — بلا setState لكل حركة */
    setDrag(start.el, Math.round(dragOffset(dx)));
  };

  const finish = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = origin.current;
    if (!start || start.id !== event.pointerId) return;
    const dx = lastDx.current;
    const horizontal = axis.current === "x";
    const el = start.el;
    origin.current = null;
    axis.current = null;
    lastDx.current = 0;
    endDragging(el);
    /* نقرة عابرة بلا سحب لا تُلغي إيقاف التبديل التلقائي عند المرور */
    if (horizontal) {
      onDragEnd();
      swallowClick.current = true;
      window.setTimeout(() => {
        swallowClick.current = false;
      }, 400);
    }
    const direction = horizontal ? swipeDirection(dx) : null;
    if (direction === "next") onNext();
    else if (direction === "prev") onPrev();
  };

  const cancel = () => {
    const horizontal = axis.current === "x";
    const el = origin.current?.el ?? null;
    origin.current = null;
    axis.current = null;
    lastDx.current = 0;
    endDragging(el);
    if (horizontal) onDragEnd();
  };

  /* يلتقط النقرة الناتجة عن نهاية السحب قبل أن تصل إلى الرابط/الزر */
  const onClickCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!swallowClick.current) return;
    swallowClick.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  return {
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finish,
      onPointerCancel: cancel,
      onPointerLeave: cancel,
      onClickCapture,
    },
  };
}

function FanDeck({
  label,
  cards,
  currency = "SAR",
}: {
  label?: string;
  cards?: DeckCard[];
  currency?: string;
}) {
  const duration = AVAILABLE_DURATIONS[0];
  const curr = CURRENCIES[currency] ?? CURRENCIES.SAR;

  /* المسار الافتراضي: باقة لكل سيرفر بسعر المتجر بالريال ومدة 12 شهراً */
  const items = useMemo<DeckCard[]>(() => {
    if (cards && cards.length > 0) return cards;
    return PRICING_PLANS.map((plan) => {
      const price = plan.prices[duration] ?? plan.prices["12"];
      return {
        key: plan.id,
        code: plan.serverCode,
        name: plan.serverName.split("(")[0].trim(),
        termLabel: "12 شهراً",
        amount: price[curr.code] ?? price.SAR,
        currency: curr.symbol,
        href: to(`${plan.serverCode}/`),
      };
    });
  }, [cards, duration, curr.code, curr.symbol]);

  const count = items.length;
  const isDefaultFan = count === 4;
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  /* بعد أول تفاعل يدوي (لمس/نقرة/سهم) يتوقف التدوير التلقائي نهائياً، فلا
     يتحرك الكارت من تحت عين المستخدم وهو يقرأ سعره */
  const [manual, setManual] = useState(false);
  const reduced = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduced.current = mq.matches;
    const onChange = () => {
      reduced.current = mq.matches;
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (paused || manual || count < 2) return;
    const id = window.setInterval(() => {
      if (reduced.current || document.hidden) return;
      setActive((a) => (a + 1) % count);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [paused, manual, count]);

  /* حماية من مؤشر قديم إن تغيّر عدد الكروت */
  const activeIndex = active % count;

  const goNext = () => {
    setManual(true);
    setActive((a) => (a + 1) % count);
  };
  const goPrev = () => {
    setManual(true);
    setActive((a) => (a - 1 + count) % count);
  };

  /* التقليب باللمس (وأيضاً بالسحب بالماوس) — يوقف التبديل التلقائي أثناءه */
  const { handlers } = useDeckSwipe({
    onNext: goNext,
    onPrev: goPrev,
    onDragStart: () => setPaused(true),
    onDragEnd: () => setPaused(false),
  });

  /* الأسهم تقلّب الكروت مثل اللمس تماماً */
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") goNext();
    else if (event.key === "ArrowRight") goPrev();
    else if (event.key === "Home") {
      setManual(true);
      setActive(0);
    }
    else return;
    event.preventDefault();
  };

  const front = items[activeIndex];

  return (
    <section aria-label={label ?? "السيرفرات في نظرة واحدة"} className="mt-8">
      <div
        className={`srv-deck-wrap${isDefaultFan ? "" : " srv-deck-wrap--fan"}`}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        <div
          className={`srv-deck${isDefaultFan ? " srv-deck--default" : ""}`}
          style={
            isDefaultFan
              ? undefined
              : { width: `${FAN_WIDTH}px`, height: `${FAN_HEIGHT}px` }
          }
          role="group"
          aria-roledescription="شريط كروت قابل للتقليب"
          aria-label="اسحب يميناً أو يساراً للتنقّل بين السيرفرات"
          tabIndex={0}
          onKeyDown={onKeyDown}
          {...handlers}
        >
          {items.map((card, i) => {
            const r = (i - activeIndex + count) % count;
            const isFront = r === 0;
            const base = isDefaultFan ? SLOTS[r] : fanSlot(r);
            const slot = isDefaultFan
              ? base
              : {
                  left: FAN_WIDTH / 2 - FAN_CARD / 2 + base.left,
                  top: base.top,
                  rot: base.rot,
                };
            return (
              <div
                key={card.key}
                className={`srv-deck-card${isFront ? " is-front" : ""}`}
                data-server={card.code}
                data-term={card.termLabel}
                aria-hidden={!isFront}
                style={{
                  left: `${slot.left}px`,
                  top: `${slot.top}px`,
                  zIndex: 10 - Math.ceil(r / 2),
                  transform: `rotate(${slot.rot}deg)`,
                }}
              >
                <div className="srv-deck-content">
                  <span className="srv-deck-glyph" aria-hidden="true">
                    {GLYPH[card.code]}
                  </span>
                  <CardBody card={card} focusable={isFront} showBadge={!isDefaultFan} />
                </div>
              </div>
            );
          })}

          {/* خطّا التوهّج أسفل الكارت */}
          <div className="srv-deck-lines" aria-hidden="true">
            <span className="srv-deck-line" />
            <span className="srv-deck-line" />
          </div>
        </div>
      </div>

      {/* نقاط التنقّل — تسمح للزائر بتثبيت الكارت الذي يريده */}
      <div className="srv-deck-dots">
        {items.map((card, i) => (
          <button
            key={card.key}
            type="button"
            className="srv-deck-dot"
            aria-pressed={i === activeIndex}
            aria-label={`اعرض ${card.name} — ${card.termLabel}`}
            onClick={() => {
              setManual(true);
              setActive(i);
            }}
          />
        ))}
      </div>

      {/* تلميح اللمس: يظهر على الشاشات الصغيرة فقط (CSS) */}
      <p className="srv-deck-hint" aria-hidden="true">
        <span>اسحب يميناً أو يساراً لتبديل السيرفر</span>
      </p>

      {/* إعلان قارئ الشاشة للكارت الأمامي */}
      <p className="sr-only" aria-live="polite">
        {`${front.name} — ${front.amount} ${front.currency} لكل ${front.termLabel}`}
      </p>
    </section>
  );
}

/* ==========================================================================
   وضع التبويبات — شريط مدد مستوحى من uiverse.io/dexter-st/pretty-dolphin-68
   --------------------------------------------------------------------------
   من التصميم الأصلي أُخذت لغته لا هندسته الدائرية: حبّة زجاجية بيضاء بسماكة
   داخلية ولمعة علوية، ومؤشّر أزرق لامع (btn) ينزلق بين الخيارات بحركة مرنة
   (cubic-bezier(.22,1,.36,1.15))، وداخله ضوء مخروطي (selector-light) يدور
   ببطء. والأهم: التبويب النشط هو الذي يتحرّك إليه الضوء، لا شريط سفلي رفيع.
   كل تبويب يعرض بطاقتين كاملتين (نوفا وX) بميل خفيف يحفظ لغة المروحة.
   ========================================================================== */
function TabbedDeck({ label, tabs }: { label?: string; tabs: DeckTab[] }) {
  const [active, setActive] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const count = tabs.length;
  const activeIndex = Math.min(active, count - 1);

  /* التقليب باللمس بين المدد أيضاً: السحب أفقيّاً ينقل إلى المدة التالية */
  const { handlers } = useDeckSwipe({
    onNext: () => setActive((a) => Math.min(count - 1, a + 1)),
    onPrev: () => setActive((a) => Math.max(0, a - 1)),
    onDragStart: () => undefined,
    onDragEnd: () => undefined,
  });

  /* تنقّل بلوحة المفاتيح كمعيار tablist: الأسهم في اتجاه RTL، وHome/End للأطراف */
  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step =
      event.key === "ArrowLeft" ? 1 : event.key === "ArrowRight" ? -1 : 0;
    let next = -1;
    if (step) next = (index + step + count) % count;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = count - 1;
    if (next < 0) return;
    event.preventDefault();
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <section aria-label={label ?? "السيرفرات في نظرة واحدة"} className="mt-8">
      <div
        className="srv-tabs"
        style={{ "--tab": activeIndex, "--srv-tabs-count": count } as CSSProperties}
      >
        <div className="srv-tabs-track" role="tablist" aria-label="اختر مدة الاشتراك">
          <span className="srv-tabs-light" aria-hidden="true" />
          {tabs.map((tab, index) => {
            const isActive = index === activeIndex;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                id={`srv-tab-${tab.key}`}
                data-term={tab.key}
                className={`srv-tab${isActive ? " is-active" : ""}`}
                aria-selected={isActive}
                aria-controls={`srv-panel-${tab.key}`}
                tabIndex={isActive ? 0 : -1}
                ref={(node) => {
                  tabRefs.current[index] = node;
                }}
                onClick={() => setActive(index)}
                onKeyDown={(event) => onKeyDown(event, index)}
              >
                <span className="srv-tab-label">{tab.label}</span>
                {tab.hint && <span className="srv-tab-hint">{tab.hint}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {tabs.map((tab, index) => (
        <div
          key={tab.key}
          id={`srv-panel-${tab.key}`}
          role="tabpanel"
          aria-labelledby={`srv-tab-${tab.key}`}
          className="srv-panel"
          data-term={tab.key}
          data-active={index === activeIndex}
          hidden={index !== activeIndex}
        >
          <div className="srv-deck-wrap srv-deck-wrap--pair">
            <div
              className="srv-deck srv-deck--pair"
              style={{ width: `${PAIR_WIDTH}px`, height: `${PAIR_HEIGHT}px` }}
              {...handlers}
            >
              {tab.cards.map((card, cardIndex) => {
                const slot = PAIR_SLOTS[cardIndex] ?? PAIR_SLOTS[PAIR_SLOTS.length - 1];
                return (
                  <div
                    key={card.key}
                    className="srv-deck-card is-front"
                    data-server={card.code}
                    data-term={card.termLabel}
                    style={{
                      left: `${slot.left}px`,
                      top: `${slot.top}px`,
                      zIndex: 2 - cardIndex,
                      transform: `rotate(${slot.rot}deg)`,
                    }}
                  >
                    <div className="srv-deck-content">
                      <span className="srv-deck-glyph" aria-hidden="true">
                        {GLYPH[card.code]}
                      </span>
                      <CardBody card={card} focusable showBadge />
                    </div>
                  </div>
                );
              })}

              {/* خطّا التوهّج أسفل البطاقتين */}
              <div className="srv-deck-lines" aria-hidden="true">
                <span className="srv-deck-line" />
                <span className="srv-deck-line" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}

function CardBody({
  card,
  focusable,
  showBadge,
}: {
  card: DeckCard;
  focusable: boolean;
  showBadge: boolean;
}) {
  const logo = SERVER_WATERMARKS[card.code];

  /* رسالة واتساب جاهزة: السيرفر + المدة + السعر — يفتحها الزر مباشرة */
  const waMessage = `مرحبًا ستريم ماستر، أريد تفعيل اشتراك ${card.name} — ${card.termLabel} — ${card.amount} ${card.currency}`;
  const waHref = getWhatsAppUrl(waMessage);

  return (
    <div className="srv-deck-body">
      {showBadge && <span className="srv-deck-term">{card.badge ?? card.termLabel}</span>}
      <a
        href={card.href}
        className="srv-deck-link"
        tabIndex={focusable ? 0 : -1}
        aria-label={`${card.name} — ${card.amount} ${card.currency} لكل ${card.termLabel}`}
      >
        <span className="srv-deck-logo">
          <img
            src={logo.src}
            alt=""
            width={logo.width}
            height={logo.height}
            loading="lazy"
            decoding="async"
            draggable={false}
          />
        </span>
        <span className="srv-deck-name">{card.name}</span>
        <span className="srv-deck-price">
          <b>{card.amount}</b> {card.currency}
          {/* في المروحة متعددة المدد تحمل الشارة المدة، فلا تُكرَّر هنا */}
          {!showBadge && <> / {card.termLabel}</>}
        </span>
      </a>

      {/* زر التفعيل — تصميم uiverse (Navarog21/ordinary-rat-19) */}
      <a
        href={waHref}
        target="_blank"
        rel="noopener noreferrer"
        className="srv-wa"
        tabIndex={focusable ? 0 : -1}
        aria-label={`تفعيل اشتراك ${card.name} — ${card.termLabel} عبر واتساب`}
      >
        <span className="srv-wa-label">تفعيل</span>
        <span className="srv-wa-clip" aria-hidden="true">
          <span className="srv-wa-corner srv-wa-corner--lt" />
          <span className="srv-wa-corner srv-wa-corner--rb" />
          <span className="srv-wa-corner srv-wa-corner--rt" />
          <span className="srv-wa-corner srv-wa-corner--lb" />
        </span>
        <span className="srv-wa-arrow srv-wa-arrow--right" aria-hidden="true" />
        <span className="srv-wa-arrow srv-wa-arrow--left" aria-hidden="true" />
      </a>
    </div>
  );
}
