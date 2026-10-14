import { useState } from "react";
import {
  IconCart,
  IconChat,
  IconCheck,
  IconClock,
  IconShieldCheck,
  IconStar,
  IconZap,
} from "./Icons";
import { CURRENCIES, getWhatsAppUrl, PRICING_PLANS, AVAILABLE_DURATIONS, PricingPlan } from "../data";
import { Reveal } from "./motion";

interface PricingProps {
  currentCurrency: string;
  onCurrencyChange: (code: string) => void;
  onAddToCart: (plan: PricingPlan, months: "3" | "6" | "12" | "24", price: number) => void;
  highlightedPlanId?: string;
}

export default function Pricing({
  currentCurrency,
  onCurrencyChange,
  onAddToCart,
  highlightedPlanId,
}: PricingProps) {
  const [duration, setDuration] = useState<"3" | "6" | "12" | "24">("12");

  const curr = CURRENCIES[currentCurrency] || CURRENCIES.SAR;

  /* نصوص المدة فقط — نسبة الخصم تُحسب فعلياً من oldSar أدناه،
     وكان هنا حقل discount («خصم 50% VIP») لا يُعرض أبداً ويخالف النسبة الحقيقية */
  const durationLabels: Record<"3" | "6" | "12" | "24", string> = {
    "3": "3 شهور",
    "6": "6 شهور",
    "12": "12 شهر (سنة)",
    "24": "24 شهر (سنتين)",
  };

  return (
    <section id="pricing" className="py-20 md:py-28 bg-[#faf9f6] relative overflow-hidden">
      {/* توهج علوي ناعم */}
      <div className="absolute top-0 start-1/2 translate-x-1/2 w-[900px] h-[300px] bg-gradient-to-r from-[#e2dcff] to-[#ffe3c7] blur-[120px] opacity-70 pointer-events-none" />

      <div className="max-w-[1370px] mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* الترويسة */}
        <Reveal variant="up" className="text-center max-w-[760px] mx-auto mb-12">
          <p className="text-[12px] font-black tracking-[0.25em] uppercase text-[#2b4eff] mb-4">
            باقات وعروض 2026
          </p>
          <h2 className="font-display font-black tracking-tight leading-[1.15] text-[38px] md:text-[58px]">
            اختر باقتك و<span className="font-serif italic font-normal">سيرفرك</span> المفضل
          </h2>
          <p className="mt-4 text-[15px] md:text-[16.5px] text-black/60 font-medium leading-relaxed">
            باقات ربط تقني مع أبرز سيرفرات المزودين الخارجيين، مع تفعيل فوري ودعم فني لضبط الإعدادات
            طوال مدة الاشتراك.
          </p>

          {/* المدة + العملة */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <div className="inline-flex gap-1 p-1.5 rounded-full bg-white border border-black/10 shadow-sm">
              {AVAILABLE_DURATIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`relative px-4 sm:px-5 py-2.5 rounded-full text-[13px] font-black transition-all cursor-pointer ${
                    duration === d
                      ? "bg-[#0b0b0f] text-white shadow-md"
                      : "text-black/50 hover:text-black"
                  }`}
                >
                  {durationLabels[d]}
                  {d === "12" && (
                    <span className="hidden sm:inline-block mr-1 text-[10px] bg-[#d8ff3e] text-black px-1.5 py-0.5 rounded font-black">
                      الأوفر
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 bg-white border border-black/10 rounded-full px-4 py-2.5 shadow-sm">
              <span className="text-[12px] text-black/40 font-black">العملة:</span>
              <select
                aria-label="العملة"
                value={currentCurrency}
                onChange={(e) => onCurrencyChange(e.target.value)}
                className="bg-transparent text-black font-black text-[13px] focus:outline-none cursor-pointer"
              >
                {Object.values(CURRENCIES).map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.symbol} {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Reveal>

        {/* بطاقات الباقات */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
          {PRICING_PLANS.map((plan, i) => {
            const priceObj = plan.prices[duration];
            const currentPrice = priceObj[curr.code] || priceObj.SAR;
            const isHighlighted = highlightedPlanId === plan.id;
            const isPopular = plan.isPopular || isHighlighted;
            const isVip = plan.isVip;
            const dark = isPopular;

            /* نسبة الخصم من السعر القديم (بالريال) */
            const oldSar = priceObj.oldSar;
            const discountPct =
              oldSar && oldSar > 0
                ? Math.round((1 - plan.prices[duration].SAR / oldSar) * 100)
                : 0;

            return (
              <Reveal key={plan.id} variant="up" delay={i * 110} className="h-full">
              <div
                className={`relative h-full flex flex-col justify-between rounded-[28px] p-6 sm:p-7 transition-all duration-300 ${
                  dark
                    ? "bg-[#0b0b0f] text-white grain overflow-hidden scale-[1.02] ring-4 ring-[#d8ff3e]/60"
                    : isVip
                    ? "bg-[#ffe3c7] border-2 border-[#0b0b0f]/15 hover:border-[#0b0b0f]"
                    : "bg-white border border-black/10 hover:border-black/30 hover:shadow-[0_30px_60px_-20px_rgba(0,0,0,0.2)]"
                }`}
              >
                {dark && (
                  <div className="absolute -top-24 -end-24 w-72 h-72 bg-[#2b4eff]/50 blur-[90px] rounded-full pointer-events-none" />
                )}

                {/* الشارات */}
                {plan.isPopular && (
                  <div className="absolute -top-3.5 inset-x-0 flex justify-center">
                    <span className="bg-[#d8ff3e] text-black text-[11.5px] font-black px-4 py-1 rounded-full shadow-lg">
                      🔥 الأكثر طلباً
                    </span>
                  </div>
                )}
                {plan.isVip && (
                  <div className="absolute -top-3.5 inset-x-0 flex justify-center">
                    <span className="bg-[#0b0b0f] text-[#d8ff3e] text-[11.5px] font-black px-4 py-1 rounded-full shadow-lg">
                      👑 باقة VIP لشاشتين
                    </span>
                  </div>
                )}

                <div className="relative">
                  <span
                    className={`inline-block text-[12px] font-black mb-2 ${
                      dark ? "text-white/50" : "text-black/45"
                    }`}
                  >
                    {plan.tag}
                  </span>

                  <h3
                    className={`font-display font-black text-[19px] sm:text-[20px] leading-snug tracking-tight ${
                      dark ? "text-white" : "text-[#0b0b0f]"
                    }`}
                  >
                    {plan.serverName}
                  </h3>

                  <p
                    className={`mt-2 text-[12.5px] leading-[1.7] ${
                      dark ? "text-white/55" : "text-black/55"
                    }`}
                  >
                    {plan.description}
                  </p>

                  {/* السعر */}
                  <div
                    className={`mt-5 py-4 border-y ${
                      dark ? "border-white/10" : "border-black/10"
                    }`}
                  >
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span
                        className={`font-display font-black text-[38px] sm:text-[42px] leading-none tracking-tight ${
                          dark ? "text-white" : "text-[#0b0b0f]"
                        }`}
                      >
                        {currentPrice}
                      </span>
                      <span
                        className={`text-[17px] font-black ${
                          dark ? "text-[#d8ff3e]" : "text-[#2b4eff]"
                        }`}
                      >
                        {curr.symbol}
                      </span>
                      <span
                        className={`text-[11.5px] font-bold ${
                          dark ? "text-white/40" : "text-black/40"
                        }`}
                      >
                        / {durationLabels[duration]}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      {curr.code === "SAR" && oldSar && (
                        <span
                          className={`text-[13px] font-black line-through ${
                            dark ? "text-white/35" : "text-black/30"
                          }`}
                        >
                          {oldSar} ر.س
                        </span>
                      )}
                      {discountPct > 0 && (
                        <span className="text-[11px] font-black bg-[#ff5c4d] text-white px-2 py-0.5 rounded-full">
                          وفّر {discountPct}%
                        </span>
                      )}
                      <span
                        className={`text-[11px] font-black ${
                          dark ? "text-[#3effe0]" : "text-[#16a34a]"
                        }`}
                      >
                        ✓ تفعيل فوري بدون رسوم
                      </span>
                    </div>
                  </div>

                  {/* المواصفات */}
                  <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] font-bold">
                    {[
                      `📺 ${plan.channelsCount}`,
                      `🎬 ${plan.vodCount}`,
                      `⚡ ${plan.quality}`,
                      `🛡️ ${plan.devices}`,
                    ].map((spec) => (
                      <div
                        key={spec}
                        className={`p-2 rounded-xl text-center ${
                          dark ? "bg-white/[0.07] text-white/75" : "bg-black/[0.04] text-black/65"
                        }`}
                      >
                        {spec}
                      </div>
                    ))}
                  </div>

                  {/* الميزات */}
                  <ul className="mt-5 space-y-2.5 text-[12.5px]">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span
                          className={`w-5 h-5 rounded-full grid place-items-center shrink-0 mt-0.5 ${
                            dark ? "bg-[#d8ff3e] text-black" : "bg-[#0b0b0f] text-[#d8ff3e]"
                          }`}
                        >
                          <IconCheck className="w-3 h-3" />
                        </span>
                        <span className={dark ? "text-white/80" : "text-black/70"}>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* الأزرار */}
                <div className="relative mt-7 pt-5 space-y-2.5">
                  <a
                    href={getWhatsAppUrl(
                      `مرحبًا ستريم ماستر، أود الاشتراك في ${plan.serverName} لمدة ${durationLabels[duration]} بسعر ${currentPrice} ${curr.symbol}`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`btn-slide w-full py-3 px-4 rounded-full font-black text-[13.5px] flex items-center justify-center gap-2 ${
                      dark ? "slide-white bg-[#d8ff3e] text-black" : "slide-royal bg-[#0b0b0f] text-white"
                    }`}
                  >
                    <IconChat className="w-4 h-4" /> اشترك الآن عبر واتساب
                  </a>

                  <button
                    onClick={() => onAddToCart(plan, duration, currentPrice)}
                    className={`w-full py-2.5 px-3 rounded-full text-[12.5px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      dark
                        ? "border border-white/20 bg-white/5 hover:bg-white/15 text-white"
                        : "border border-black/15 bg-white hover:border-black hover:bg-black hover:text-white text-black"
                    }`}
                  >
                    <IconCart className="w-3.5 h-3.5" /> أضف إلى السلة
                  </button>
                </div>
              </div>
              </Reveal>
            );
          })}
        </div>

        {/* شريط الضمان — ثلاث بطاقات */}
        <div className="mt-8 grid sm:grid-cols-3 gap-3">
          {[
            {
              icon: <IconShieldCheck className="w-[22px] h-[22px]" />,
              t: "ضمان كامل واسترجاع",
              d: "نضمن ثبات السيرفر طوال مدة الاشتراك",
            },
            {
              icon: <IconZap className="w-[22px] h-[22px] text-[#ff5c4d]" />,
              t: "تفعيل خلال 5 دقائق",
              d: "آلي بالكامل عبر واتساب والبريد",
            },
            {
              icon: <IconClock className="w-[22px] h-[22px] text-[#2b4eff]" />,
              t: "دعم فني 24/7",
              d: "متوسط الرد أقل من 3 دقائق",
            },
          ].map((b, i) => (
            <Reveal key={b.t} variant="start" delay={i * 110}>
            <div className="flex items-center gap-3 bg-white border border-black/10 rounded-2xl px-5 py-4 hover:border-black transition">
              {b.icon}
              <div className="text-right">
                <p className="font-black text-[14px]">{b.t}</p>
                <p className="text-[12.5px] text-black/50 font-medium">{b.d}</p>
              </div>
            </div>
            </Reveal>
          ))}
        </div>

        {/* تقييم صغير أسفل الباقات */}
        <div className="mt-6 flex items-center justify-center gap-2 text-[13px] font-bold text-black/50">
          <div className="flex gap-0.5">
            {[...Array(5)].map((_, i) => (
              <IconStar key={i} className="w-3.5 h-3.5 fill-[#0b0b0f] text-[#0b0b0f]" />
            ))}
          </div>
          4.95 من 5 — 4,820+ تقييم موثق من مشتركين حقيقيين
        </div>
      </div>
    </section>
  );
}
