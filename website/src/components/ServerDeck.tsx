import { useEffect, useMemo, useRef, useState } from "react";
import { AVAILABLE_DURATIONS, PRICING_PLANS, type PricingPlan } from "../data";
import { to } from "../config";
import { SERVER_WATERMARKS } from "../lib/server-branding";
import "./server-deck.css";

/* ==========================================================================
   مجسّم السيرفرات — نسخة حرفية من كارت uiverse (blue-wombat-46)
   --------------------------------------------------------------------------
   البنية نفسها: كروت مطلية بتدرّج دائري مرتّبة في مروحة، فوقها لوح زجاجي
   بحرف ضخم مفرّغ، وأسفلها خطّا توهّج. الاختلاف: أربعة كروت — كل سيرفر في
   كارت — والكارت الأمامي يتبدّل كل 3 ثوانٍ كما في التصميم الأصلي (9s/3).
   التبديل يتوقّف عند المرور أو التركيز، ويُلغى تماماً مع prefers-reduced-motion.
   ========================================================================== */

type ServerCode = PricingPlan["serverCode"];

const GLYPH: Record<ServerCode, string> = { nova: "N", istar: "i", moka: "M", x: "X" };

/* مواضع المروحة — نفس ميل 15° وهوامش التصميم الأصلي، موزّعة على أربعة كروت */
const SLOTS = [
  { left: 75, top: 0, rot: 0, scale: 1 }, // الأمامي — وسط المروحة كما في الأصل
  { left: 8, top: 36, rot: -15, scale: 1 }, // يسار المروحة
  { left: 146, top: 36, rot: 15, scale: 1 }, // يمين المروحة
  { left: 84, top: 14, rot: 8, scale: 0.96 }, // طبقة خلفية تُطل من تحت الأمامي
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

  const plan = plans[active];
  const price = useMemo(() => plan.prices[duration] ?? plan.prices["12"], [plan, duration]);
  const nameOnly = plan.serverName.split("(")[0].trim();
  const logo = SERVER_WATERMARKS[plan.serverCode];

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
          {/* الكروت المروحية: كل سيرفر في كارت، والأمامي يتبدّل */}
          {plans.map((p, i) => {
            const slot = (i - active + count) % count;
            const s = SLOTS[slot % SLOTS.length];
            const isFront = slot === 0;
            return (
              <div
                key={p.id}
                className={`srv-deck-card${isFront ? " is-front" : ""}`}
                data-server={p.serverCode}
                aria-hidden="true"
                style={{
                  left: `${s.left}px`,
                  top: `${s.top}px`,
                  zIndex: isFront ? 3 : 2 - slot,
                  transform: `rotate(${s.rot}deg) scale(${s.scale})`,
                }}
              />
            );
          })}

          {/* اللوح الزجاجي — حرف ضخم + شعار واسم وسعر السيرفر الأمامي */}
          <div className="srv-deck-content">
            <span key={`glyph-${active}`} className="srv-deck-glyph" aria-hidden="true">
              {GLYPH[plan.serverCode]}
            </span>

            <a
              key={`link-${active}`}
              href={to(`${plan.serverCode}/`)}
              className="srv-deck-link"
              aria-label={`${nameOnly} — صفحة السيرفر`}
            >
              <span className="srv-deck-logo">
                {logo && (
                  <img
                    src={logo.src}
                    alt=""
                    width={logo.width}
                    height={logo.height}
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                  />
                )}
              </span>
              <span className="srv-deck-name">{nameOnly}</span>
              <span className="srv-deck-price">
                <b>{price.SAR}</b> ر.س / 12 شهراً
              </span>
              <span className="srv-deck-cta">تفاصيل السيرفر</span>
            </a>

            {/* نقاط التبديل — تسمح للزائر بتثبيت السيرفر الذي يريده */}
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
          </div>

          {/* خطّا التوهّج أسفل الكارت */}
          <div className="srv-deck-lines" aria-hidden="true">
            <span className="srv-deck-line" />
            <span className="srv-deck-line" />
          </div>
        </div>
      </div>
    </section>
  );
}
