import { useEffect, useRef, useState } from "react";
import { CHANNEL_CATEGORIES } from "../data";
import { IconTv } from "./Icons";
import { Reveal } from "./motion";

/* =========================================================================
   عدّاد أرقام متحرك — يبدأ عند ظهوره في الشاشة (يُستخدم في أقسام أخرى أيضاً)
========================================================================= */
export function Counter({
  to,
  suffix = "",
  prefix = "",
  decimals = 0,
}: {
  to: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [started, setStarted] = useState(false);
  const [val, setVal] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setStarted(true);
          io.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    const start = performance.now();
    const dur = 1600;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min((t - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(to * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started, to]);

  const formatted =
    decimals > 0
      ? val.toFixed(decimals)
      : Math.round(val).toLocaleString("en-US");

  return (
    <span ref={ref}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

export default function ChannelShowcase() {
  const [activeTab, setActiveTab] = useState("sports");

  const currentCategory =
    CHANNEL_CATEGORIES.find((c) => c.id === activeTab) || CHANNEL_CATEGORIES[0];

  return (
    <section
      id="channels"
      className="py-20 md:py-28 bg-[#0b0b0f] text-white relative overflow-hidden grain"
    >
      {/* توهج بنفسجي خلفي */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 start-1/2 translate-x-1/2 w-[800px] h-[400px] bg-[#2b4eff]/25 blur-[140px] rounded-full" />
      </div>

      <div className="max-w-[1370px] mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* الترويسة */}
        <Reveal variant="up" className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
          <div className="max-w-xl">
            <p className="text-[12px] font-black tracking-[0.25em] uppercase text-[#d8ff3e] mb-4 flex items-center gap-2">
              <span className="w-8 h-[2px] bg-[#d8ff3e] inline-block" />
              <IconTv className="w-4 h-4" /> تصنيفات قوائم المزودين
            </p>
            <h2 className="font-display font-black tracking-tight leading-[1.15] text-[36px] md:text-[56px]">
              تغطية شاملة.{" "}
              <span className="font-serif italic font-normal text-white/75">أداء فائق الثبات.</span>
            </h2>
            <p className="mt-5 text-white/55 text-[15.5px] leading-relaxed">
              استعرض أبرز التصنيفات الرياضية والترفيهية والعربية التي تدعمها سيرفرات المزودين
              الخارجيين — مع تحديثات دورية لقوائم التشغيل.
            </p>
          </div>

          {/* تبويبات الفئات — حبوب */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {CHANNEL_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`px-5 py-2.5 rounded-full text-[13.5px] font-black transition-all cursor-pointer ${
                  activeTab === cat.id
                    ? "bg-[#d8ff3e] text-black"
                    : "bg-white/[0.06] text-white/60 border border-white/10 hover:border-white/40 hover:text-white"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </Reveal>

        {/* شبكة القنوات — بطاقات تفاعلية على طريقة العناصر */}
        <div key={activeTab} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {currentCategory.channels.map((ch, idx) => (
            <div
              key={idx}
              style={{ animationDelay: `${(idx % 8) * 60}ms` }}
              className="animate-fade-up group bg-white/[0.05] border border-white/10 rounded-2xl p-5 hover:bg-[#d8ff3e] hover:text-black hover:border-[#d8ff3e] transition-all duration-300 cursor-pointer"
            >
              <div className="flex items-start justify-between mb-6">
                <span className="w-11 h-11 rounded-xl bg-white/10 grid place-items-center group-hover:bg-black group-hover:text-[#d8ff3e] transition font-display font-black">
                  {idx + 1}
                </span>
                {idx === 0 && (
                  <span className="text-[10px] font-black bg-[#ff5c4d] text-white px-2 py-1 rounded-md group-hover:bg-black group-hover:text-white">
                    الأبرز
                  </span>
                )}
              </div>
              <p className="font-bold text-[14.5px] tracking-tight leading-snug">{ch}</p>
              <p className="text-[12px] font-medium opacity-50 mt-1">{currentCategory.badge}</p>
            </div>
          ))}
        </div>

        {/* العدّادات */}
        <div className="mt-16 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { v: 16500, s: "+", l: "قناة حية مباشرة" },
            { v: 65000, s: "+", l: "فيلم ومسلسل VOD" },
            { v: 99.9, s: "%", d: 1, l: "نسبة الثبات" },
            { v: 4820, s: "+", l: "تقييم 5 نجوم" },
          ].map((s) => (
            <div
              key={s.l}
              className="bg-white/[0.05] border border-white/10 rounded-2xl p-6 text-center"
            >
              <p className="font-display font-black text-[34px] md:text-[46px] leading-none text-[#d8ff3e]">
                <Counter to={s.v} suffix={s.s} decimals={s.d} />
              </p>
              <p className="text-[12.5px] font-bold text-white/50 mt-2 uppercase tracking-wider">
                {s.l}
              </p>
            </div>
          ))}
        </div>

        {/* إخلاء مسؤولية */}
        <p className="mt-6 text-center text-[12.5px] text-white/40 font-medium leading-relaxed">
          تختلف القنوات والمكتبات المتاحة بحسب السيرفر المختار وتخضع لإدارة المزود الخارجي
          المستقل.
        </p>
      </div>
    </section>
  );
}
