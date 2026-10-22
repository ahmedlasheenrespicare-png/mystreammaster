import { AVAILABLE_DURATIONS, PRICING_PLANS, type PricingPlan } from "../data";
import { to } from "../config";
import { ServerIcon } from "./ServerIcon";
import { IconArrowUpRight } from "./Icons";
import "./server-card.css";

/* ==========================================================================
   شريط بطاقات السيرفرات — نفس تصميم كارت uiverse المستخدم في بطاقات الباقات
   (إطار تدرّج دائري + محتوى داخلي مستدير + حرف ضخم مفرّغ + خط توهّج)
   --------------------------------------------------------------------------
   يُستخدم داخل مقالات المدوّنة بدل صورة الغلاف: أربع بطاقات مستقلّة، كل سيرفر
   في بطاقته، وكل بطاقة تفتح صفحة السيرفر. نسخة مختصرة (بلا أزرار شراء) حتى
   لا تنافس جدول الأسعار أسفل المقال.
   ========================================================================== */

const GLYPH: Record<PricingPlan["serverCode"], string> = {
  nova: "N",
  istar: "i",
  moka: "M",
  x: "X",
};

export default function ServerCardsStrip({ title }: { title?: string }) {
  const duration = AVAILABLE_DURATIONS[0];

  return (
    <section aria-labelledby="servers-strip-heading" className="mt-8">
      <h2
        id="servers-strip-heading"
        className="mb-4 font-display text-[19px] font-black tracking-tight md:text-[22px]"
      >
        {title ?? "السيرفرات الأربعة في نظرة واحدة"}
      </h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {PRICING_PLANS.map((plan) => {
          const price = plan.prices[duration] ?? plan.prices["12"];
          const dark = plan.isPopular;
          return (
            <article
              key={plan.id}
              className={`srv-card is-compact ${dark ? "is-dark is-popular" : ""}`}
              data-server={plan.serverCode}
            >
              <div className="srv-card-inner">
                <span className="srv-card-glyph" aria-hidden="true">
                  {GLYPH[plan.serverCode]}
                </span>

                <div className="relative z-10">
                  <h3 className="font-display text-[16px] font-black leading-snug tracking-tight">
                    <a
                      href={to(`${plan.serverCode}/`)}
                      className="inline-flex items-center gap-2 hover:underline underline-offset-4"
                      aria-label={`${plan.serverName} — صفحة السيرفر`}
                    >
                      <ServerIcon code={plan.serverCode} size={30} />
                      <span>{plan.serverName.split("(")[0].trim()}</span>
                    </a>
                  </h3>

                  <p className="mt-1.5 text-[11.5px] font-black opacity-60">{plan.tag}</p>

                  <ul className="mt-3 space-y-1 text-[11.5px] font-bold opacity-75">
                    <li>{plan.quality}</li>
                    <li>{plan.devices}</li>
                    <li>{plan.channelsCount}</li>
                  </ul>

                  <div className="mt-3.5 flex items-baseline gap-1.5 border-t border-current/10 pt-3">
                    <span className="font-display text-[22px] font-black leading-none">{price.SAR}</span>
                    <span className="text-[11.5px] font-black opacity-70">ر.س / 12 شهراً</span>
                  </div>
                  <p className="mt-1 text-[10.5px] font-bold opacity-45 font-latin">
                    ≈ {price.USD} USD
                  </p>
                </div>

                <div className="relative z-10 mt-3.5">
                  <a
                    href={to(`${plan.serverCode}/`)}
                    className={`inline-flex items-center gap-1.5 text-[12px] font-black ${
                      dark ? "text-[#d8ff3e]" : "text-[#2b4eff]"
                    }`}
                  >
                    تفاصيل السيرفر <IconArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                </div>

                <span className="srv-card-line" aria-hidden="true" />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
