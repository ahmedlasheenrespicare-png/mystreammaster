import { ServerLink } from "./ServerIcon";
import { useState } from "react";
import { IconArrow, IconCheck, IconQuote, IconSparkles, IconZap } from "./Icons";
import { PRICING_PLANS, TESTIMONIALS } from "../data";
import { Reveal } from "./motion";

interface ServerFinderProps {
  onSelectPlan: (planId: string) => void;
  onOpenTrial: () => void;
}

export default function ServerFinder({ onSelectPlan, onOpenTrial }: ServerFinderProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({
    speed: "",
    content: "",
    device: "",
    screens: "",
  });

  const questions = [
    {
      key: "speed",
      title: "ما هي سرعة اتصال الإنترنت لديك تقريباً؟",
      subtitle: "نحدد ذلك لاقتراح السيرفر الأكثر استقراراً دون أي تقطيع",
      options: [
        { label: "سرعة عالية (أكثر من 30 ميجا)", value: "fast", icon: "⚡" },
        { label: "سرعة متوسطة (15 - 30 ميجا)", value: "medium", icon: "🚀" },
        { label: "سرعة عادية أو ضعيفة (4 - 15 ميجا)", value: "slow", icon: "📶" },
      ],
    },
    {
      key: "content",
      title: "ما هو المحتوى الأكثر أهمية بالنسبة لك؟",
      subtitle: "سنخصص لك السيرفر الذي يمتلك أعلى جودة في تخصصك",
      options: [
        { label: "مباريات كرة القدم والدوريات والبطولات الكبرى", value: "sports", icon: "⚽" },
        { label: "أفلام السينما والمسلسلات العربية والعالمية", value: "movies", icon: "🎬" },
        { label: "توازن شامل بين الرياضة والأفلام وقنوات العائلة", value: "all", icon: "🌟" },
      ],
    },
    {
      key: "device",
      title: "ما هو الجهاز الأساسي الذي ستشاهد عليه؟",
      subtitle: "لضمان توافق تطبيق التشغيل وإعدادات الـ 4K",
      options: [
        { label: "شاشة ذكية Smart TV (سامسونج أو LG)", value: "smarttv", icon: "📺" },
        { label: "جهاز Android TV Box أو Firestick أو Xiaomi", value: "android", icon: "🤖" },
        { label: "Apple TV أو iPhone / iPad أو كمبيوتر", value: "apple", icon: "🍏" },
      ],
    },
    {
      key: "screens",
      title: "كم عدد الأجهزة التي ترغب بتشغيلها معاً في نفس اللحظة؟",
      subtitle: "اختر لترشيح الباقة المفردة أو الباقة المزدوجة",
      options: [
        { label: "شاشة واحدة في نفس الوقت", value: "1", icon: "1️⃣" },
        { label: "شاشتان معاً في نفس اللحظة (Dual Screen)", value: "2", icon: "2️⃣" },
      ],
    },
  ];

  const handleSelectOption = (key: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    if (step < questions.length - 1) {
      setStep(step + 1);
    } else {
      setStep(questions.length); // Result screen
    }
  };

  const getRecommendation = () => {
    /* الاحتياطي بالفهرس الصحيح للباقات الثلاث: 0 = نوفا، 1 = إيستار برو، 2 = موكا */
    if (answers.screens === "2") {
      return PRICING_PLANS.find((p) => p.serverCode === "nova") || PRICING_PLANS[0];
    }
    if (answers.speed === "slow") {
      return PRICING_PLANS.find((p) => p.serverCode === "moka") || PRICING_PLANS[2];
    }
    if (answers.content === "sports" || answers.speed === "fast") {
      return PRICING_PLANS.find((p) => p.serverCode === "nova") || PRICING_PLANS[0];
    }
    return PRICING_PLANS.find((p) => p.serverCode === "istar") || PRICING_PLANS[1];
  };

  const recommendedPlan = getRecommendation();

  return (
    <section id="server-finder" className="py-20 md:py-28 bg-white border-y border-black/10 relative overflow-hidden">
      <div className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* الترويسة */}
        <Reveal variant="up" className="text-center max-w-[680px] mx-auto mb-10 md:mb-14">
          <p className="text-[12px] font-black tracking-[0.25em] uppercase text-[#ff5c4d] mb-4 flex items-center justify-center gap-2">
            <span className="w-8 h-[2px] bg-[#ff5c4d] inline-block" />
            <IconSparkles className="w-4 h-4" /> مساعد الاختيار الذكي
          </p>
          <h2 className="font-display font-black tracking-tight leading-[1.15] text-[34px] md:text-[52px]">
            أي سيرفر <span className="font-serif italic font-normal">يناسبك</span> تماماً؟
          </h2>
          <p className="mt-4 text-[15px] md:text-[16px] text-black/60 font-medium leading-relaxed">
            أجب عن 4 أسئلة سريعة لنرشح لك السيرفر المثالي لسرعة اتصالك وجهازك ومحتواك المفضل.
          </p>
        </Reveal>

        {/* صندوق المعالج */}
        <Reveal variant="up" delay={120} duration={800}>
        <div className="rounded-[28px] border border-black/10 bg-white shadow-[0_40px_90px_-40px_rgba(0,0,0,0.3)] p-6 sm:p-10">
          {step < questions.length ? (
            <div key={step} className="animate-scale-in">
              {/* شريط التقدم */}
              <div className="flex items-center justify-between text-[12px] font-black text-black/40 mb-4">
                <span>
                  السؤال <span className="font-latin">{step + 1}</span> من{" "}
                  <span className="font-latin">{questions.length}</span>
                </span>
                <span className="font-latin">
                  {Math.round(((step + 1) / questions.length) * 100)}%
                </span>
              </div>
              <div className="h-2 w-full bg-black/[0.07] rounded-full overflow-hidden mb-8">
                <div
                  className="h-full bg-gradient-to-l from-[#2b4eff] to-[#7c5cff] transition-all duration-500 rounded-full"
                  style={{ width: `${((step + 1) / questions.length) * 100}%` }}
                />
              </div>

              <h3 className="font-display font-black text-[20px] sm:text-[25px] tracking-tight mb-2">
                {questions[step].title}
              </h3>
              <p className="text-[14px] text-black/50 font-medium mb-8">
                {questions[step].subtitle}
              </p>

              {/* الخيارات */}
              <div className="grid gap-3.5">
                {questions[step].options.map((opt, oi) => (
                  <button
                    key={opt.value}
                    onClick={() => handleSelectOption(questions[step].key, opt.value)}
                    style={{ animationDelay: `${oi * 80}ms` }}
                    className="animate-fade-up flex items-center justify-between p-4 sm:p-5 rounded-2xl border border-black/10 bg-white hover:border-black hover:bg-black/[0.03] text-right transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5">
                      <span className="text-2xl">{opt.icon}</span>
                      <span className="text-[14.5px] sm:text-[16px] font-bold group-hover:font-black transition">
                        {opt.label}
                      </span>
                    </div>
                    <span className="h-8 w-8 rounded-full border border-black/15 flex items-center justify-center text-black/40 group-hover:border-black group-hover:bg-black group-hover:text-white transition-all">
                      ←
                    </span>
                  </button>
                ))}
              </div>

              {step > 0 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="mt-6 text-[13px] font-bold text-black/40 hover:text-black transition-colors cursor-pointer"
                >
                  → العودة للسؤال السابق
                </button>
              )}
            </div>
          ) : (
            /* شاشة النتيجة */
            <div className="text-center py-4 animate-scale-in">
              <span className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-[#d8ff3e] text-black shadow-xl mb-4">
                <IconCheck className="w-8 h-8" />
              </span>
              <span className="block text-[13px] font-black text-[#2b4eff] uppercase tracking-[0.2em]">
                الترشيح المثالي لك
              </span>
              <h3 className="font-display font-black text-[26px] sm:text-[34px] tracking-tight mt-1 flex items-center justify-center gap-2.5">
                <ServerLink
                  code={recommendedPlan.serverCode}
                  label={recommendedPlan.serverName}
                  size={38}
                  className="justify-center hover:underline underline-offset-4"
                />
              </h3>
              <p className="text-[15px] text-black/60 max-w-[560px] mx-auto mt-2.5 leading-relaxed">
                {recommendedPlan.description}
              </p>

              <div className="mt-6 inline-flex flex-wrap items-center justify-center gap-2 rounded-2xl p-4 text-[13px] font-black">
                <span className="bg-[#ff5c4d]/10 text-[#ff5c4d] px-3 py-1.5 rounded-full">
                  {recommendedPlan.channelsCount}
                </span>
                <span className="bg-[#7c5cff]/10 text-[#7c5cff] px-3 py-1.5 rounded-full">
                  {recommendedPlan.vodCount}
                </span>
                <span className="bg-[#16a34a]/10 text-[#16a34a] px-3 py-1.5 rounded-full">
                  {recommendedPlan.quality}
                </span>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <a
                  href="#pricing"
                  onClick={() => onSelectPlan(recommendedPlan.id)}
                  className="btn-slide slide-royal bg-[#0b0b0f] text-white font-black px-8 py-3.5 rounded-full text-[15px]"
                >
                  عرض باقات هذا السيرفر
                </a>
                <button
                  onClick={onOpenTrial}
                  className="border border-black/15 bg-white hover:border-black font-black text-black px-6 py-3.5 rounded-full text-[14.5px] transition-all cursor-pointer"
                >
                  <IconZap className="w-4 h-4 text-[#ff5c4d] inline ml-1.5" /> طلب كود تجريبي
                  للسيرفر
                </button>
                <button
                  onClick={() => setStep(0)}
                  className="w-full text-center text-[13px] text-black/40 hover:text-black mt-2 underline cursor-pointer"
                >
                  إعادة الاختبار من البداية
                </button>
              </div>
            </div>
          )}
        </div>
        </Reveal>

        {/* تلميح أسفل المعالج */}
        <p className="mt-6 text-center text-[12.5px] text-black/40 font-medium flex items-center justify-center gap-1.5">
          <IconArrow className="w-3.5 h-3.5 rotate-180" />
          مجرد ترشيح مبدئي — يمكنك دائماً طلب كود تجريبي قبل اتخاذ القرار
        </p>

        {/* اقتباس مدمج — كما يوزّعها الأصل داخل أقسامه */}
        <Reveal variant="up" delay={100} className="mt-8 max-w-[760px] mx-auto">
          <div className="flex items-start gap-4 bg-white border border-black/10 rounded-2xl p-5 text-right">
            <IconQuote className="w-8 h-8 opacity-15 fill-black shrink-0 mt-1" />
            <div>
              <p className="text-[14.5px] font-bold leading-[1.8] text-black/75">
                "{TESTIMONIALS[2].review}"
              </p>
              <p className="mt-3 text-[13px] font-black">
                {TESTIMONIALS[2].name}
                <span className="text-black/45 font-bold"> — {TESTIMONIALS[2].city}</span>
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
