import { useState } from "react";
import { IconArrow, IconChevronDown, IconPlay, IconTrophy, IconZap } from "./Icons";
import { PRICING_PLANS } from "../data";
import { SERVER_MARK_SRC, SERVER_WATERMARKS } from "../lib/server-branding";
import { Reveal } from "./motion";

/* =========================================================================
   «اختر مسارك» — ثلاث بطاقات تقود القرار بدل تكرار الميزات
   -------------------------------------------------------------------------
   كانت البطاقات الثلاث تعيد ما يعرضه الماكيت فوقها (السيرفرات) وشريط الثقة
   داخل قسم الأسعار تحته، وكانت البطاقة الثالثة تُطلق وعد «ضمان كامل ومستمر»
   الذي يخالف سياسة الاسترجاع المنشورة (72 ساعة وحالات محددة فقط).
   هنا صارت كل بطاقة مساراً: لمن هذه الباقة، وبكم، وأين يذهب الزائر.
   • الأرقام كلها من `PRICING_PLANS` (السعر السنوي، القنوات، الجودة) فلا نص
     مكتوب يدوياً يتعارض مع بطاقات الأسعار أو صفحات السيرفرات.
   • على الجوال تُطوى التفاصيل (accordion) ويبقى العنوان والسعر ظاهرين؛
     على الديسكتوب تظهر مفتوحة دائماً.
========================================================================= */

/* أسماء السيرفرات كما تظهر في بقية الموقع */
const SERVER_AR: Record<string, string> = { nova: "نوفا", istar: "إيستار", moka: "موكا", x: "X" };

/* ألوان عرض لكل مسار — لا ادعاء بهوية المزود، فقط تمييز بصري بين البطاقات */
const LOOKS = {
  peach: {
    card: "bg-[#ffe3c7] border-black/10 text-[#0b0b0f]",
    kicker: "text-black/50",
    rule: "border-black/10 divide-black/10",
    muted: "text-black/60",
    cta: "bg-[#0b0b0f] text-white hover:bg-[#1c1c22]",
    ghost: "text-black/55 hover:text-black",
  },
  royal: {
    card: "bg-gradient-to-br from-[#2b4eff] to-[#7c5cff] border-white/15 text-white",
    kicker: "text-white/65",
    rule: "border-white/15 divide-white/15",
    muted: "text-white/75",
    cta: "bg-white text-[#2b4eff] hover:bg-[#ffe3c7]",
    ghost: "text-white/70 hover:text-white",
  },
  ink: {
    card: "bg-[#0b0b0f] border-white/10 text-white grain",
    kicker: "text-[#d8ff3e]",
    rule: "border-white/10 divide-white/10",
    muted: "text-white/70",
    cta: "bg-[#d8ff3e] text-[#0b0b0f] hover:bg-white",
    ghost: "text-white/60 hover:text-white",
  },
} as const;

const PATHS = [
  {
    code: "nova" as const,
    look: LOOKS.peach,
    icon: IconTrophy,
    audience: "لمن يتابع المباريات",
    title: "أشاهد المباريات",
    why: "الأكثر طلباً وقت القمم — سيرفرات احتياطية لدى المزود.",
  },
  {
    code: "istar" as const,
    look: LOOKS.royal,
    icon: IconPlay,
    audience: "لمن يريد أفلاماً ومسلسلات",
    title: "ترفيه وأفلام",
    why: "باقة الترفيه الشاملة — مكتبة VOD ضخمة تتجدد يومياً.",
  },
  {
    code: "x" as const,
    look: LOOKS.ink,
    icon: IconZap,
    audience: "لمن يريد أقل تكلفة",
    title: "أقل ميزانية",
    why: "نفس القنوات بجودة تصل 8K — أرخص باقة سنة كاملة.",
  },
]
  .map((p) => {
    const plan = PRICING_PLANS.find((item) => item.serverCode === p.code);
    if (!plan) return null;
    return { ...p, plan, price: plan.prices["12"].USD };
  })
  .filter((p): p is NonNullable<typeof p> => p !== null);

interface HeroValueCardsProps {
  onOpenTrial: () => void;
}

export default function HeroValueCards({ onOpenTrial }: HeroValueCardsProps) {
  /* فتح/طي بطاقة واحدة على الجوال — على الديسكتوب كل التفاصيل ظاهرة دائماً */
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="hero-values" className="relative bg-[#faf9f6] pb-14 md:pb-16">
      <div className="max-w-[1200px] mx-auto px-5">
        {/* عنوان القسم + طريق التجربة */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5 md:mb-6">
          <div className="text-right">
            <p className="text-[11px] font-black tracking-[0.2em] uppercase text-black/40">
              اختر مسارك
            </p>
            <h2 className="mt-1 font-display font-black tracking-tight text-[22px] md:text-[28px] leading-tight">
              ثلاث طرق للبدء — كلها بسنة كاملة
            </h2>
          </div>
          <button
            type="button"
            onClick={onOpenTrial}
            className="btn-slide slide-royal inline-flex items-center gap-2 bg-white border border-black/15 px-4 py-2.5 rounded-full cursor-pointer hover:border-black transition"
            aria-label="فحص تجريبي مجاني — 6 ساعات قبل الدفع"
          >
            <IconZap className="w-4 h-4 shrink-0" />
            <span className="text-start leading-tight">
              <span className="block text-[12.5px] font-black">فحص تجريبي مجاني</span>
              <span className="block text-[10.5px] font-bold text-black/50">6 ساعات — قبل الدفع</span>
            </span>
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-4 text-right">
          {PATHS.map((p, i) => {
            const isOpen = open === i;
            const Icon = p.icon;
            return (
              <Reveal key={p.code} variant="up" delay={i * 120} className="h-full">
                <div
                  className={`h-full rounded-[28px] border p-6 md:p-7 flex flex-col justify-between relative overflow-hidden ${p.look.card}`}
                >
                  <div>
                    {/* الرأس — يبقى ظاهراً دائماً، وهو زر الطي على الجوال */}
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? null : i)}
                      aria-expanded={isOpen}
                      aria-controls={`path-body-${p.code}`}
                      className="w-full flex items-start justify-between gap-3 text-start cursor-pointer md:cursor-default"
                    >
                      <div className="min-w-0">
                        <p className={`text-[10.5px] font-black tracking-wide ${p.look.kicker}`}>
                          {p.audience}
                        </p>
                        <h3 className="mt-1 font-display font-black text-[19px] md:text-[21px] leading-tight flex items-center gap-2">
                          <Icon className="w-5 h-5 shrink-0" /> {p.title}
                        </h3>
                      </div>
                      <span className="shrink-0 text-end leading-none">
                        <span className="block font-display font-black text-[24px] md:text-[26px]">
                          {p.price}$
                        </span>
                        <span className={`block mt-1 text-[10.5px] font-bold ${p.look.muted}`}>
                          / سنة
                        </span>
                      </span>
                      <IconChevronDown
                        className={`w-4 h-4 mt-1 shrink-0 transition-transform md:hidden ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {/* التفاصيل — مطويّة على الجوال، ظاهرة على الديسكتوب */}
                    <div
                      id={`path-body-${p.code}`}
                      className={`${isOpen ? "block" : "hidden"} md:block`}
                    >
                      <p className={`mt-3 text-[12.5px] leading-[1.8] font-medium ${p.look.muted}`}>
                        {p.why}
                      </p>

                      <ul className={`mt-3 border-t divide-y ${p.look.rule}`}>
                        {[
                          { k: "القنوات", v: p.plan.channelsCount },
                          { k: "الجودة", v: p.plan.quality },
                          { k: "مكتبة VOD", v: p.plan.vodCount },
                        ].map((row) => (
                          <li key={row.k} className="flex items-center justify-between gap-3 py-2">
                            <span className={`text-[11.5px] font-bold ${p.look.muted}`}>{row.k}</span>
                            <span className="text-[11.5px] font-black">{row.v}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className={`${isOpen ? "block" : "hidden"} md:block`}>
                    <a
                      href={`/${p.code}/`}
                      className={`mt-5 flex items-center justify-center gap-1.5 py-3 rounded-full text-[12.5px] font-black transition ${p.look.cta}`}
                    >
                      {/* شعار السيرفر — X يستخدم نسخته الشفافة (ملفه الأصلي معتم) */}
                      <img
                        src={SERVER_MARK_SRC[p.code] ?? SERVER_WATERMARKS[p.code].src}
                        alt=""
                        width={18}
                        height={18}
                        className="shrink-0 object-contain"
                        draggable={false}
                      />
                      اشترك في {SERVER_AR[p.plan.serverCode]} — {p.price}$
                      <IconArrow className="w-3.5 h-3.5" />
                    </a>
                    <a
                      href="#pricing"
                      className={`mt-2 flex items-center justify-center gap-1 text-[11.5px] font-black transition ${p.look.ghost}`}
                    >
                      مقارنة كل الباقات
                    </a>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>

        <p className="mt-4 text-center text-[11.5px] font-medium text-black/40">
          سيرفر موكا متاح أيضاً للمشاهدة الثقيلة —{" "}
          <a href="/moka/" className="font-black underline underline-offset-4 hover:text-black">
            تفاصيل باقة موكا
          </a>
        </p>
      </div>
    </section>
  );
}
