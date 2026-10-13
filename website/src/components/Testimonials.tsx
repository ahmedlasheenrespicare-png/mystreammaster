import { useEffect, useState } from "react";
import { TESTIMONIALS } from "../data";
import { IconArrow, IconArrowBack, IconQuote, IconStar } from "./Icons";
import { Reveal } from "./motion";
import { Counter } from "./ChannelShowcase";

/* ألوان بطاقة التقييم المتناوبة */
const CARD_COLORS = [
  "bg-[#d8ff3e]",
  "bg-[#ffe3c7]",
  "bg-[#e2dcff]",
  "bg-[#d2f4ff]",
];

export default function Testimonials() {
  const [index, setIndex] = useState(0);

  /* تقدم تلقائي كل 5.5 ثانية */
  useEffect(() => {
    const t = window.setInterval(() => {
      setIndex((i) => (i + 1) % TESTIMONIALS.length);
    }, 5500);
    return () => window.clearInterval(t);
  }, []);

  const t = TESTIMONIALS[index];

  return (
    <section id="reviews" className="py-20 md:py-28 bg-[#faf9f6] relative overflow-hidden">
      <div className="max-w-[1100px] mx-auto px-5">
        {/* الترويسة */}
        <Reveal variant="up" className="text-center mb-12">
          <div className="inline-flex items-center gap-1.5 bg-white border border-black/10 rounded-full px-4 py-2 text-[13px] font-black mb-5 shadow-sm">
            <IconStar className="w-4 h-4 fill-[#0b0b0f] text-[#0b0b0f]" /> 4.95/5 — 4,820+
            تقييم موثق
          </div>
          <h2 className="font-display font-black tracking-tight leading-[1.15] text-[38px] md:text-[56px]">
            يحبنا <span className="font-serif italic font-normal">الآلاف</span> من المشتركين
          </h2>
          <p className="mt-4 text-black/55 text-[15px] md:text-[16px] font-medium">
            أكثر من 45,000 عميل يثقون في سيرفراتنا لتغطية أهم المباريات وأفلام السينما.
          </p>
        </Reveal>

        {/* بطاقة التقييم الكبيرة */}
        <div className="relative">
          <div
            key={index}
            className={`${CARD_COLORS[index % CARD_COLORS.length]} rounded-[32px] border border-black/10 p-8 md:p-14 text-center relative overflow-hidden animate-scale-in`}
          >
            <IconQuote className="w-12 h-12 mx-auto mb-6 opacity-15 fill-black" />

            <div className="flex justify-center gap-1 mb-6">
              {[...Array(t.rating)].map((_, i) => (
                <IconStar key={i} className="w-[18px] h-[18px] fill-black text-black" />
              ))}
            </div>

            <p className="font-display font-bold tracking-tight leading-[1.6] text-[19px] md:text-[27px] max-w-3xl mx-auto">
              "{t.review}"
            </p>

            <div className="mt-8 flex items-center justify-center gap-3">
              <span className="w-12 h-12 rounded-full bg-black text-white grid place-items-center text-xl">
                {t.avatar}
              </span>
              <div className="text-right">
                <p className="font-black text-[15px]">{t.name}</p>
                <p className="text-[13px] text-black/55 font-bold">
                  {t.city} — {t.server}
                </p>
              </div>
            </div>
          </div>

          {/* أدوات التنقل */}
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={() => setIndex((index + 1) % TESTIMONIALS.length)}
              className="w-12 h-12 rounded-full border border-black/15 grid place-items-center hover:bg-black hover:text-white transition cursor-pointer"
              aria-label="التقييم التالي"
            >
              <IconArrowBack className="w-[18px] h-[18px]" />
            </button>
            <div className="flex gap-1.5">
              {TESTIMONIALS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  aria-label={`التقييم ${i + 1}`}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    i === index ? "w-8 bg-black" : "w-2 bg-black/20 hover:bg-black/40"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={() =>
                setIndex((index - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)
              }
              className="w-12 h-12 rounded-full border border-black/15 grid place-items-center hover:bg-black hover:text-white transition cursor-pointer"
              aria-label="التقييم السابق"
            >
              <IconArrow className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>

        {/* شريط الثقة — عدّادات متحركة */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { v: 45000, s: "+", l: "مشترك نشط" },
            { v: 99.9, s: "%", d: 1, l: "نسبة الثبات" },
            { v: 3, p: "< ", s: " دقائق", l: "زمن التفعيل" },
            { v: 24, s: "/7", l: "دعم فني متواصل" },
          ].map((st, i) => (
            <Reveal key={st.l} variant="up" delay={i * 110}>
              <div className="bg-white border border-black/10 rounded-2xl p-5 text-center hover:border-black transition">
                <p className="font-display font-black text-[26px] leading-none">
                  <Counter to={st.v} suffix={st.s} prefix={st.p} decimals={st.d} />
                </p>
                <p className="text-[12.5px] font-bold text-black/45 mt-2">{st.l}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
