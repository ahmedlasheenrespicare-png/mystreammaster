import { useEffect, useMemo, useRef, useState } from "react";
import {
  AVAILABLE_DURATIONS,
  getWhatsAppUrl,
  PRICING_PLANS,
  type PlanDuration,
  type PricingPlan,
} from "../data";
import { to } from "../config";
import { SERVER_WATERMARKS } from "../lib/server-branding";
import "./server-deck.css";

/* ==========================================================================
   مجسّم السيرفرات — نسخة من كارت uiverse (blue-wombat-46)
   --------------------------------------------------------------------------
   نفس الهندسة: مروحة كروت مائلة 15° داخل إطار 300×160 مخفي الفائض، وكل كارت
   فيه لوحه الزجاجي الخاص (‎--pd:4px) بحرف ضخم مفرّغ، وخطّا توهّج أسفل المروحة.
   الفرق: كارت لكل سيرفر — والكارت الأمامي (z-index أعلى) يتبدّل كل 3 ثوانٍ كما
   في التصميم الأصلي. يتوقّف التبديل عند المرور/التركيز، ويُلغى مع
   prefers-reduced-motion، وتسمح النقاط بتثبيت أي سيرفر.

   الافتراضي أربعة كروت (كل باقات المتجر). ويمكن تمرير `codes` لعرض جزء منها
   (مقال مصر يعرض نوفا وX فقط)، مع `prices` لعرض سعر بعملة أخرى من مصدر واحد،
   و`href` لتحويل الكروت إلى قسم داخل الصفحة نفسها بدل صفحة السيرفر.
   ========================================================================== */

type ServerCode = PricingPlan["serverCode"];

const GLYPH: Record<ServerCode, string> = { nova: "N", istar: "i", moka: "M", x: "X" };

/* مواضع المروحة: الثلاثة الأولى هي أرقام التصميم الأصلي حرفياً،
   والرابعة طبقة خلف الوسط حتى يظهر السيرفر الرابع دون كسر المروحة. */
const SLOTS = [
  { left: 75, top: 0, rot: 0 }, // الأمامي — الوسط
  { left: 122, top: 35, rot: 15 }, // يمين المروحة
  { left: 28, top: 35, rot: -15 }, // يسار المروحة
  { left: 58, top: 18, rot: -7 }, // خلف الوسط
];

/* كروت السيرفرين: بطاقتان مستقلّتان جنباً إلى جنب، كل واحدة ظاهرة كاملة
   بلا تغطية — ميل خفيف في اتجاهين متعاكسين فقط. (مواضع الأربعة أعلاه
   تُخفي إحداهما خلف الأخرى، وهذا يناسب التبديل لا العرض الثابت.)
   الترتيب يوافق القراءة العربية: السيرفر الأول على اليمين. */
const SLOTS_TWO = [
  { left: 208, top: 14, rot: 9 }, // يمين — السيرفر الأول
  { left: 22, top: 26, rot: -9 }, // يسار — السيرفر الثاني
];
const PAIR_WIDTH = 380;

/** سعر معروض على الكارت بعملة محددة (يأتي من مصدر الأسعار نفسه) */
export interface DeckPrice {
  amount: number;
  /** رمز العرض بجانب الرقم: "ج.م" أو "ر.س" */
  currency: string;
  /** وصف المدة كما يُعرض: "12 شهراً" */
  termLabel: string;
}

const ROTATE_MS = 3000;

export default function ServerDeck({
  label,
  codes,
  prices,
  href,
}: {
  label?: string;
  /** أكواد السيرفرات المعروضة بترتيبها — بلا تمرير تُعرض كل باقات المتجر */
  codes?: ServerCode[];
  /** أسعار بديلة لكل سيرفر (مقال مصر يعرض الجنيه المصري من ملف أسعاره) */
  prices?: Partial<Record<ServerCode, DeckPrice>>;
  /** رابط واحد لكل كروت الشريط (قسم داخل الصفحة) بدل صفحة السيرفر */
  href?: string;
}) {
  const plans = useMemo(
    () =>
      codes
        ? codes
            .map((code) => PRICING_PLANS.find((plan) => plan.serverCode === code))
            .filter((plan): plan is PricingPlan => Boolean(plan))
        : PRICING_PLANS,
    [codes]
  );
  const count = plans.length;
  const slots = count === 2 ? SLOTS_TWO : SLOTS;
  const isPair = count === 2;
  /* بطاقتان: عرض ثابت بلا تبديل — لا معنى لدوران «الأمامي» وكلتاهما مرئية */
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = useRef(false);
  const duration = AVAILABLE_DURATIONS[0];

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
    if (paused || count < 3) return;
    const id = window.setInterval(() => {
      if (reduced.current || document.hidden) return;
      setActive((a) => (a + 1) % count);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [paused, count]);

  return (
    <section aria-label={label ?? "السيرفرات الأربعة"} className="mt-8">
      <div
        className={`srv-deck-wrap${isPair ? " srv-deck-wrap--pair" : ""}`}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        <div
          className={`srv-deck${isPair ? " srv-deck--pair" : ""}`}
          style={isPair ? { width: `${PAIR_WIDTH}px` } : undefined}
        >
          {/* مروحة الكروت: كل سيرفر بكارت ولوح زجاجي وحرفه */}
          {plans.map((p, i) => {
            const slot = (i - active + count) % count;
            const s = slots[slot];
            const isFront = slot === 0;
            /* بطاقتان مستقلّتان: لا رفع ولا تغطية — متساويتان في الحضور */
            const lifted = false;
            return (
              <div
                key={p.id}
                className={`srv-deck-card${isFront ? " is-front" : ""}${isPair ? " srv-deck-card--pair" : ""}`}
                data-server={p.serverCode}
                aria-hidden={isPair ? undefined : !isFront}
                style={{
                  left: `${s.left}px`,
                  top: `${s.top}px`,
                  zIndex: isFront ? 4 : slot === 3 ? 3 : 2,
                  transform: `rotate(${s.rot}deg)${lifted ? " translateY(-8px)" : ""}`,
                }}
              >
                <div className="srv-deck-content">
                  <span className="srv-deck-glyph" aria-hidden="true">
                    {GLYPH[p.serverCode]}
                  </span>
                  <CardBody
                    plan={p}
                    duration={duration}
                    focusable={isFront || isPair}
                    priceView={prices?.[p.serverCode]}
                    href={href}
                  />
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

      {/* نقاط التنقّل — تسمح للزائر بتثبيت السيرفر الذي يريده (لا معنى لها مع بطاقتين) */}
      <div className="srv-deck-dots" hidden={isPair}>
        {plans.map((p, i) => (
          <button
            key={p.id}
            type="button"
            className="srv-deck-dot"
            aria-pressed={i === active}
            aria-label={`اعرض ${p.serverName.split("(")[0].trim()}`}
            onClick={() => setActive(i)}
          />
        ))}
      </div>
    </section>
  );
}

function CardBody({
  plan,
  duration,
  focusable,
  priceView,
  href,
}: {
  plan: PricingPlan;
  duration: PlanDuration;
  focusable: boolean;
  priceView?: DeckPrice;
  href?: string;
}) {
  const nameOnly = plan.serverName.split("(")[0].trim();
  const logo = SERVER_WATERMARKS[plan.serverCode];
  const price = useMemo(() => plan.prices[duration] ?? plan.prices["12"], [plan, duration]);

  /* السعر المعروض: من ملف الأسعار الممرَّر إن وُجد، وإلا سعر المتجر بالريال */
  const shown = priceView ?? { amount: price.SAR, currency: "ر.س", termLabel: "12 شهراً" };

  /* رسالة واتساب جاهزة: السيرفر + المدة + السعر — يفتحها الزر مباشرة */
  const waMessage = `مرحبًا ستريم ماستر، أريد تفعيل اشتراك ${nameOnly} — ${shown.termLabel} — ${shown.amount} ${shown.currency}`;
  const waHref = getWhatsAppUrl(waMessage);

  return (
    <div className="srv-deck-body">
      <a
        href={href ?? to(`${plan.serverCode}/`)}
        className="srv-deck-link"
        tabIndex={focusable ? 0 : -1}
        aria-label={`${nameOnly} — ${shown.amount} ${shown.currency} لكل ${shown.termLabel}`}
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
        <span className="srv-deck-name">{nameOnly}</span>
        <span className="srv-deck-price">
          <b>{shown.amount}</b> {shown.currency} / {shown.termLabel}
        </span>
      </a>

      {/* زر التفعيل — تصميم uiverse (Navarog21/ordinary-rat-19) */}
      <a
        href={waHref}
        target="_blank"
        rel="noopener noreferrer"
        className="srv-wa"
        tabIndex={focusable ? 0 : -1}
        aria-label={`تفعيل اشتراك ${nameOnly} عبر واتساب`}
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
