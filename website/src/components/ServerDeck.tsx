import { useEffect, useMemo, useRef, useState } from "react";
import { AVAILABLE_DURATIONS, PRICING_PLANS, type PlanDuration, type PricingPlan } from "../data";
import { to } from "../config";
import { SERVER_WATERMARKS } from "../lib/server-branding";
import "./server-deck.css";

/* ==========================================================================
   مجسّم السيرفرات — نسخة من كارت uiverse (blue-wombat-46)
   --------------------------------------------------------------------------
   نفس الهندسة: مروحة كروت مائلة 15° داخل إطار 300×160 مخفي الفائض، وكل كارت
   فيه لوحه الزجاجي الخاص (‎--pd:4px) بحرف ضخم مفرّغ، وخطّا توهّج أسفل المروحة.
   الفرق: أربعة كروت — كل سيرفر في كارت — والكارت الأمامي (z-index أعلى) يتبدّل
   كل 3 ثوانٍ كما في التصميم الأصلي. يتوقّف التبديل عند المرور/التركيز،
   ويُلغى مع prefers-reduced-motion، وتسمح النقاط بتثبيت أي سيرفر.
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

const ROTATE_MS = 3000;

export default function ServerDeck({ label }: { label?: string }) {
  const plans = PRICING_PLANS;
  const count = plans.length;
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
    if (paused) return;
    const id = window.setInterval(() => {
      if (reduced.current || document.hidden) return;
      setActive((a) => (a + 1) % count);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [paused, count]);

  return (
    <section aria-label={label ?? "السيرفرات الأربعة"} className="mt-8">
      <div
        className="srv-deck-wrap"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        <div className="srv-deck">
          {/* مروحة الكروت: كل سيرفر بكارت ولوح زجاجي وحرفه */}
          {plans.map((p, i) => {
            const slot = (i - active + count) % count;
            const s = SLOTS[slot];
            const isFront = slot === 0;
            return (
              <div
                key={p.id}
                className={`srv-deck-card${isFront ? " is-front" : ""}`}
                data-server={p.serverCode}
                aria-hidden={!isFront}
                style={{
                  left: `${s.left}px`,
                  top: `${s.top}px`,
                  zIndex: isFront ? 4 : slot === 3 ? 3 : 2,
                  transform: `rotate(${s.rot}deg)`,
                }}
              >
                <div className="srv-deck-content">
                  <span className="srv-deck-glyph" aria-hidden="true">
                    {GLYPH[p.serverCode]}
                  </span>
                  <CardBody plan={p} duration={duration} focusable={isFront} />
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

      {/* نقاط التنقّل — تسمح للزائر بتثبيت السيرفر الذي يريده */}
      <div className="srv-deck-dots">
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
}: {
  plan: PricingPlan;
  duration: PlanDuration;
  focusable: boolean;
}) {
  const nameOnly = plan.serverName.split("(")[0].trim();
  const logo = SERVER_WATERMARKS[plan.serverCode];
  const price = useMemo(() => plan.prices[duration] ?? plan.prices["12"], [plan, duration]);

  return (
    <a
      href={to(`${plan.serverCode}/`)}
      className="srv-deck-link"
      tabIndex={focusable ? 0 : -1}
      aria-label={`${nameOnly} — صفحة السيرفر، ${price.SAR} ر.س لكل 12 شهراً`}
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
        <b>{price.SAR}</b> ر.س / 12 شهراً
      </span>
      <span className="srv-deck-cta">تفاصيل السيرفر</span>
    </a>
  );
}
