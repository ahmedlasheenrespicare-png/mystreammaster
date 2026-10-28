import { useState } from "react";
import {
  CURRENCIES,
  getWhatsAppUrl,
  OUR_SERVICE_NOTE,
  PRICING_PLANS,
  PROVIDER_SPECS_NOTE,
  AVAILABLE_DURATIONS,
  type PlanDuration,
  type PricingPlan,
} from "../data";
import { to } from "../config";
import { ServerLink } from "../components/ServerIcon";
import { SERVER_WATERMARKS, SERVER_WATERMARK_CLASS } from "../lib/server-branding";
import { IconArrowUpRight, IconChat, IconCheck, IconShieldCheck, IconStar, IconZap } from "../components/Icons";
import FAQ from "../components/FAQ";
import { Reveal } from "../components/motion";

/* =========================================================================
   صفحة هبوط لكل باقة — /nova  /istar  /moka  /x
   • تُرسم مسبقاً وقت البناء بالكامل (عنوان ووصف وأسعار وميزات وباقة أسئلة)
   • تستهدف كلمة مفتاحية مستقلة لكل سيرفر بدل حشرها كلها في الصفحة الرئيسية
   • فصل الصفتين في كل عناوينها الفرعية:
       - المواصفات (القنوات/المكتبة/الجودة) = مواصفات سيرفر المزود الخارجي
       - ما يقدّمه الموقع = باقة التفعيل والربط التقني والدعم الفني
========================================================================== */

interface PlanPageProps {
  plan: PricingPlan;
  /** عملة الموقع (مصدر واحد في App) — لا نحتفظ بحالة محلية حتى لا يُضاف العنصر
      للسلة بسعر عملة مختلفة عن العملة المسجَّلة معه */
  currency: string;
  onCurrencyChange: (code: string) => void;
  onOpenTrial: () => void;
  onAddToCart: (plan: PricingPlan, months: "3" | "6" | "12" | "24", price: number) => void;
}

export default function PlanPage({
  plan,
  currency,
  onCurrencyChange,
  onOpenTrial,
  onAddToCart,
}: PlanPageProps) {
  const [duration, setDuration] = useState<PlanDuration>("12");
  const curr = CURRENCIES[currency] || CURRENCIES.SAR;
  const priceObj = plan.prices[duration] ?? plan.prices["12"];
  const price = priceObj[curr.code] || priceObj.SAR;
  const oldSar = priceObj.oldSar;
  const discount = oldSar ? Math.round((1 - priceObj.SAR / oldSar) * 100) : 0;
  const others = PRICING_PLANS.filter((p) => p.id !== plan.id);
  const nameOnly = plan.serverName.split("(")[0].trim();
  const availableDurations = AVAILABLE_DURATIONS.filter((d) => plan.prices[d] !== undefined);

  const durationLabels: Record<"3" | "6" | "12" | "24", string> = {
    "3": "3 شهور",
    "6": "6 شهور",
    "12": "12 شهر (سنة كاملة)",
    "24": "24 شهر (سنتان)",
  };

  return (
    <div className="bg-[#faf9f6] pt-[114px] md:pt-[132px] pb-20">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="text-[12.5px] font-bold text-black/40 mb-5" aria-label="مسار التصفح">
          <a href={to("")} className="hover:text-black transition">الرئيسية</a>
          <span className="mx-2">/</span>
          <a href={to("servers/")} className="hover:text-black transition">السيرفرات والباقات</a>
          <span className="mx-2">/</span>
          <span className="text-black/70">{nameOnly}</span>
        </nav>

        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* المحتوى */}
          <div className="lg:col-span-7">
            <span className="inline-flex items-center gap-2 text-[12px] font-black tracking-[0.2em] uppercase text-[#2b4eff]">
              <IconZap className="w-4 h-4" /> {plan.tag}
            </span>
            <h1 className="mt-4 font-display font-black tracking-tight leading-[1.15] text-[34px] md:text-[50px]">
              <ServerLink
                code={plan.serverCode}
                label={nameOnly}
                size={46}
                className="me-2 align-middle"
                ariaLabel={`${nameOnly} — صفحة السيرفر`}
              />
              <span className="font-serif italic font-normal">تفعيل وربط تقني</span>
            </h1>
            <p className="mt-4 text-[15.5px] md:text-[17px] text-black/60 font-medium leading-relaxed">
              {plan.description}
            </p>
            <p className="mt-3 text-[13.5px] md:text-[14.5px] text-black/50 font-medium leading-relaxed">
              {OUR_SERVICE_NOTE}
            </p>

            {/* المواصفات — لسيرفر المزود الخارجي لا للموقع */}
            <h2 className="mt-9 font-display font-black text-[18px] tracking-tight">
              مواصفات السيرفر لدى المزود الخارجي
            </h2>
            <p className="mt-2 text-[12.5px] text-black/45 font-medium leading-relaxed">
              {PROVIDER_SPECS_NOTE}
            </p>
            <dl className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2 text-[12px] font-bold">
              {[
                ["القنوات لدى المزود", plan.channelsCount],
                ["الأفلام والمسلسلات لدى المزود", plan.vodCount],
                ["الجودة المعلنة", plan.quality],
              ].map(([k, v]) => (
                <div key={k} className="rounded-2xl bg-white border border-black/10 p-3.5">
                  <dt className="text-black/40">{k}</dt>
                  <dd className="mt-1 text-[12.5px] font-black">{v}</dd>
                </div>
              ))}
            </dl>

            {/* ما نقدّمه نحن — باقة التفعيل والربط التقني والدعم */}
            <h2 className="mt-10 font-display font-black text-[22px] tracking-tight">
              ماذا تشمل باقة التفعيل والربط التقني من موقعنا؟
            </h2>
            <p className="mt-2 text-[13px] text-black/50 font-medium leading-relaxed">
              البنود التالية هي خدمتنا نحن، وليست مواصفات بث يملكها الموقع.
            </p>
            <ul className="mt-4 space-y-2.5">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-[14px]">
                  <span className="mt-0.5 w-5 h-5 rounded-full bg-[#0b0b0f] text-[#d8ff3e] grid place-items-center shrink-0">
                    <IconCheck className="w-3 h-3" />
                  </span>
                  <span className="font-medium text-black/75">{f}</span>
                </li>
              ))}
            </ul>

            {/* محتوى نصي للفهرسة وللزائر */}
            <h2 className="mt-10 font-display font-black text-[22px] tracking-tight">
              لمن تناسب هذه الباقة من سيرفر المزود؟
            </h2>
            <p className="mt-3 text-[14.5px] leading-[1.9] text-black/60">
              {plan.serverCode === "moka" &&
                "مناسبة لمن لديه سرعة إنترنت محدودة (من 4 ميجابت) أو يستخدم بيانات الهاتف، وللباحثين عن أفضل قيمة مقابل السعر مع مكتبة متنوعة وقنوات بديلة للمباريات."}
              {plan.serverCode === "nova" &&
                "مناسبة لعشّاق المباريات والدوريات الكبرى الذين يشاهدون في أوقات الذروة، ولمن يريد ثباتاً عالياً مع تنويع مصادر البث لكل قناة رياضية."}
              {plan.serverCode === "x" &&
                "مناسبة لعشّاق المباريات والدوريات الكبرى الذين يبحثون عن ثبات مرتفع وتعدد مصادر البث لكل قناة، وفق المواصفات المعلنة لباقة X."}
              {plan.serverCode === "istar" &&
                "مناسبة للعائلات ولمن يشاهد الأفلام والمسلسلات أكثر من الرياضة، مع توازن بين المكتبة والسعر واستهلاك بيانات متوسط."}
            </p>
            <p className="mt-3 text-[14.5px] leading-[1.9] text-black/60">
              إن لم تكن متأكداً من الأنسب لجهازك وسرعة اتصالك، استخدم{" "}
              <a href={to("#server-finder")} className="font-black text-[#2b4eff] underline underline-offset-4">
                مساعد اختيار السيرفر
              </a>{" "}
              أو{" "}
              <a href={to("blog/choose-iptv-server/")} className="font-black text-[#2b4eff] underline underline-offset-4">
                اقرأ دليل المقارنة
              </a>
              {" "}أو راجع{" "}
              <a href={to("blog/افضل-اشتراك-iptv-2026/")} className="font-black text-[#2b4eff] underline underline-offset-4">
                جدول مقارنة الباقات والأسعار
              </a>
              ، ويمكنك دائماً طلب كود تجريبي قبل الدفع.
            </p>
          </div>

          {/* بطاقة الشراء */}
          <Reveal variant="up" className="lg:col-span-5 lg:sticky lg:top-[92px]">
            <div className="rounded-[28px] bg-[#0b0b0f] text-white p-6 sm:p-7 grain overflow-hidden relative">
              <div className="absolute -top-24 -end-24 z-0 w-72 h-72 bg-[#2b4eff]/50 blur-[90px] rounded-full pointer-events-none" />
              <img
                src={SERVER_WATERMARKS[plan.serverCode].src}
                alt=""
                aria-hidden="true"
                width={SERVER_WATERMARKS[plan.serverCode].width}
                height={SERVER_WATERMARKS[plan.serverCode].height}
                loading="lazy"
                decoding="async"
                className={SERVER_WATERMARK_CLASS}
              />
              <div className="relative z-10">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[12.5px] font-black text-white/60">اختر المدة</span>
                  {discount > 0 && (
                    <span className="text-[11px] font-black bg-[#ff5c4d] px-2 py-0.5 rounded-full">
                      وفّر {discount}%
                    </span>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  {availableDurations.map((d) => (
                    <button
                      key={d}
                      onClick={() => setDuration(d)}
                      className={`py-2.5 rounded-xl text-[12.5px] font-black transition cursor-pointer ${
                        duration === d
                          ? "bg-[#d8ff3e] text-black"
                          : "bg-white/[0.07] text-white/70 hover:bg-white/15"
                      }`}
                    >
                      {durationLabels[d]}
                    </button>
                  ))}
                </div>

                <div className="mt-5 flex items-baseline gap-2 flex-wrap">
                  <span className="font-display font-black text-[44px] leading-none">{price}</span>
                  <span className="text-[18px] font-black text-[#d8ff3e]">{curr.symbol}</span>
                  <span className="text-[12px] font-bold text-white/45">/ {durationLabels[duration]}</span>
                </div>
                {oldSar && curr.code === "SAR" && (
                  <p className="mt-1.5 text-[13px] font-black text-white/35 line-through">{oldSar} ر.س</p>
                )}

                <select
                  aria-label="اختر العملة"
                  value={currency}
                  onChange={(e) => onCurrencyChange(e.target.value)}
                  className="mt-4 w-full rounded-full bg-white/[0.07] border border-white/15 px-4 py-2.5 text-[12.5px] font-black text-white focus:outline-none cursor-pointer"
                >
                  {Object.values(CURRENCIES).map((c) => (
                    <option key={c.code} value={c.code} className="text-black">
                      {c.symbol} {c.name}
                    </option>
                  ))}
                </select>

                <a
                  href={getWhatsAppUrl(
                    `مرحبًا ستريم ماستر، أود طلب كود تفعيل تقني لدى المزود لـ ${plan.serverName} لمدة ${durationLabels[duration]} بسعر ${price} ${curr.symbol}`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-slide slide-white mt-4 w-full py-3.5 rounded-full bg-[#d8ff3e] text-black font-black text-[14.5px] flex items-center justify-center gap-2"
                >
                  <IconChat className="w-4 h-4" /> اطلب كود التفعيل عبر واتساب
                </a>

                <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => onAddToCart(plan, duration, price)}
                    className="py-2.5 rounded-full border border-white/20 text-[12.5px] font-black hover:bg-white/10 transition cursor-pointer"
                  >
                    أضف إلى السلة
                  </button>
                  <button
                    onClick={onOpenTrial}
                    className="py-2.5 rounded-full border border-white/20 text-[12.5px] font-black hover:bg-white/10 transition cursor-pointer"
                  >
                    طلب كود تجريبي
                  </button>
                </div>
                <a
                  href={to("trial/")}
                  className="mt-3 block text-center text-[12px] font-bold text-white/50 underline underline-offset-4 hover:text-white transition"
                >
                  تفاصيل التجربة المجانية 6 ساعات وشروطها قبل الطلب
                </a>

                <ul className="mt-5 space-y-2 text-[12.5px] font-bold text-white/60">
                  <li className="flex items-center gap-2">
                    <IconShieldCheck className="w-4 h-4 text-[#3effe0]" /> تفعيل فوري خلال 5 دقائق
                  </li>
                  <li className="flex items-center gap-2">
                    <IconStar className="w-4 h-4 text-[#d8ff3e]" /> دعم فني 24/7 وضمان طوال المدة
                  </li>
                  <li className="flex items-center gap-2">
                    <IconZap className="w-4 h-4 text-[#ff5c4d]" /> تقنية المزود: {plan.antiFreeze}
                  </li>
                </ul>
              </div>
            </div>
          </Reveal>
        </div>

        {/* توضيح الصفة التقنية والقانونية للباقة */}
        <section className="mt-14 rounded-[24px] border border-black/10 bg-white p-6 sm:p-7">
          <h2 className="font-display font-black text-[19px] tracking-tight">
            ما الذي تشتريه من الموقع بالضبط؟
          </h2>
          <ul className="mt-4 space-y-2.5 text-[13.5px] leading-[1.9] text-black/65">
            <li className="flex items-start gap-2.5">
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#0b0b0f] shrink-0" />
              <span>
                <strong className="text-black/85">من الموقع:</strong> باقة التفعيل والربط التقني —
                إصدار/تسليم بيانات الاشتراك من المزود، وإعداد المشغّل على أجهزتك، والدعم الفني
                بالعربية طوال مدة الباقة.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#0b0b0f] shrink-0" />
              <span>
                <strong className="text-black/85">من المزود الخارجي:</strong> السيرفر نفسه وما عليه من
                قنوات ومكتبات وجودات وأجهزة مدعومة — وهي أرقام يعلنها المزود وقد تتغيّر بحسب التوفر.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#0b0b0f] shrink-0" />
              <span>
                <strong className="text-black/85">خارج نطاق الموقع:</strong> القنوات والمنصات المشفّرة
                (الرياضة الحصرية ومنصات الأفلام والمسلسلات المدفوعة) تُشاهد عبر اشتراكاتها الرسمية فقط،
                وروابطها مجمّعة في{" "}
                <a
                  href={to("watch-legal.html")}
                  className="font-black text-[#2b4eff] underline underline-offset-4"
                >
                  دليل المشاهدة الرسمية
                </a>
                .
              </span>
            </li>
          </ul>
          <p className="mt-4 text-[12.5px] leading-[1.9] text-black/45">
            الموقع لا يستضيف أي محتوى ولا يبثّه ولا يعيد بثّه، وجميع العلامات التجارية المذكورة
            مملوكة لأصحابها وتُذكر للتعريف والمقارنة فقط.
          </p>
        </section>

        {/* الباقات الأخرى */}
        <section className="mt-16">
          <h2 className="font-display font-black text-[24px] tracking-tight">قارن مع الباقات الأخرى</h2>
          <div className="mt-5 grid sm:grid-cols-3 gap-3">
            {others.map((p) => (
              <a
                key={p.id}
                href={to(`${p.serverCode}/`)}
                className="group rounded-2xl border border-black/10 bg-white p-5 hover:border-black transition"
              >
                <ServerLink
                  code={p.serverCode}
                  label={p.serverName.split("(")[0].trim()}
                  size={26}
                  textClassName="font-black text-[15px] group-hover:text-[#2b4eff] transition"
                />
                <span className="mt-1 block text-[12.5px] text-black/50 font-medium">{p.tag}</span>
                <span className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-black text-[#2b4eff]">
                  تفاصيل الباقة <IconArrowUpRight className="w-3.5 h-3.5" />
                </span>
              </a>
            ))}
          </div>
        </section>
      </div>

      {/* باقة أسئلة تُرسم مسبقاً — مفيدة للفهرسة */}
      <div className="mt-16">
        <FAQ hideDeviceCount />
      </div>

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 mt-4">
        <p className="text-center text-[12.5px] font-bold text-black/40">
          هل تفضّل مشاهدة كل الخيارات؟{" "}
          <a href={to("#pricing")} className="font-black text-[#2b4eff] underline underline-offset-4">
            اذهب إلى جدول الباقات الكامل
          </a>{" "}
          أو{" "}
          <a href={to("channels/")} className="font-black text-[#2b4eff] underline underline-offset-4">
            تصفّح دليل القنوات المفتوحة
          </a>
          .
        </p>
      </div>
    </div>
  );
}
