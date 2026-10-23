import { useEffect, useState } from "react";
import { IconArrow, IconArrowUpRight, IconClock, IconSparkles } from "./Icons";
import { LOWEST_PLAN_PRICE_USD } from "../data";
import { Parallax, RevealImage } from "./motion";

/* =========================================================================
   القسم الداكن «مكتبة المحتوى» — نُقل من نهاية Hero.tsx كما هو تمامًا:
   نفس العنوان بالكلمة المتناوبة، نفس شبكة الصور الأربع ببارالاكسها،
   ونفس الشيبس والروابط، ونفس موضعه مباشرة بعد البطاقات الثلاث.
========================================================================= */

/* الكلمة المتناوبة في عنوان القسم — نُقلت مع القسم من Hero.tsx */
const ENCHANT_WORDS = ["شاهِد", "عِش", "احتفِل"];

export default function LibrarySection() {
  const [word, setWord] = useState(0);

  /* تدوير كلمات العنوان */
  useEffect(() => {
    const t = window.setInterval(() => {
      setWord((w) => (w + 1) % ENCHANT_WORDS.length);
    }, 2200);
    return () => window.clearInterval(t);
  }, []);

  return (
    <section className="relative py-20 md:py-28 overflow-hidden bg-[#0b0b0f] text-white grain">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 start-1/4 w-[600px] h-[400px] bg-[#2b4eff]/40 blur-[140px] rounded-full" />
        <div className="absolute bottom-0 end-1/4 w-[600px] h-[400px] bg-[#ff5c4d]/25 blur-[140px] rounded-full" />
      </div>
      <div className="max-w-[1200px] mx-auto px-5 relative">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <p className="text-[12px] font-black tracking-[0.25em] uppercase text-[#d8ff3e] mb-4 flex items-center gap-2">
              <span className="w-8 h-[2px] bg-[#d8ff3e] inline-block" /> مكتبة المحتوى
            </p>
            <h2 className="font-display font-black leading-[1.15] tracking-tight text-[15vw] md:text-[96px]">
              <span className="block h-[1.3em] overflow-hidden">
                <span
                  key={word}
                  className="block animate-word-in bg-gradient-to-l from-[#d8ff3e] via-white to-[#7c5cff] bg-clip-text text-transparent"
                >
                  {ENCHANT_WORDS[word]}
                </span>
              </span>
              <span className="block text-stroke-white">بلا حدود</span>
              <span className="block">
                طوال العام<span className="text-[#ff5c4d]">.</span>
              </span>
            </h2>
          </div>
          <div className="max-w-sm md:text-left">
            <p className="text-white/60 text-[15px] leading-relaxed">
              ليست كل المكتبات متساوية.{" "}
              <span className="text-white font-bold">+50,000 فيلم ومسلسل</span> و15,000 قناة
              حية — تتجدد يومياً وتُعرض بأعلى معايير الجودة.
            </p>
            <a
              href="#channels"
              className="btn-slide slide-white mt-5 inline-flex items-center gap-2 text-[14px] font-black text-[#0b0b0f] bg-[#d8ff3e] px-6 py-3 rounded-full cursor-pointer"
            >
              تصفح مكتبة القنوات <IconArrow className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* شريط الصور — ستارة + بارالاكس بسرعات متفاوتة */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { src: "images/hero/slide-sports.jpg", speed: 0.05 },
            { src: "images/hero/slide-cinema.jpg", speed: 0.11 },
            { src: "images/articles/world-cup.webp", speed: 0.07 },
            { src: "images/articles/apple-tv.webp", speed: 0.13 },
          ].map((img, i) => (
            <Parallax
              key={img.src}
              speed={img.speed}
              className={`group ${i % 2 === 1 ? "md:translate-y-8" : ""}`}
            >
              <RevealImage
                src={img.src}
                delay={i * 120}
                className="rounded-3xl border border-white/10 aspect-[3/4]"
                imgClassName="group-hover:scale-110 transition-transform duration-700"
              />
            </Parallax>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <span className="inline-flex items-center gap-2 bg-white/[0.06] border border-white/10 rounded-full px-4 py-2 text-[12.5px] font-bold text-white/70">
            <IconSparkles className="w-4 h-4 text-[#d8ff3e]" /> ترجمة فورية للأفلام
          </span>
          <span className="inline-flex items-center gap-2 bg-white/[0.06] border border-white/10 rounded-full px-4 py-2 text-[12.5px] font-bold text-white/70">
            <IconClock className="w-4 h-4 text-[#3effe0]" /> TimeShift لكل القنوات
          </span>
          <a
            href="#pricing"
            className="inline-flex items-center gap-2 text-[12.5px] font-black text-[#d8ff3e] underline underline-offset-4 hover:text-white transition"
          >
            ابدأ من {LOWEST_PLAN_PRICE_USD} دولار / سنة <IconArrowUpRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
