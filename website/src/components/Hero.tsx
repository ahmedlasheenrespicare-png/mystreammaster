import { useEffect, useState } from "react";
import {
  IconArrow,
  IconCheck,
  IconPlay,
  IconStar,
  IconTrophy,
  IconTv,
  IconZap,
} from "./Icons";
import { LineReveal, MouseParallax, Parallax, Reveal } from "./motion";
import AllLeaguesTicket from "./AllLeaguesTicket";

/* =========================================================================
   شرائح البث — تُستخدم داخل شاشة الماكيت مع تدوير تلقائي
========================================================================= */
const STREAM_SLIDES = [
  {
    kicker: "تغطية كأس العالم 2026 والدوريات الكبرى",
    img: "images/hero/slide-sports.jpg",
    badge: "بث مباشر 4K @ 50fps",
    channelsTag: "القنوات الرياضية 4K • الدوريات العالمية",
    channel: {
      switchLabel: "⚽ رياضة 4K",
      name: "البث الرياضي المباشر 4K",
      event: "دوري أبطال أوروبا — ريال مدريد × مانشستر سيتي",
      liveTag: "مباشر 4K",
      quality: "4K @ 50fps HDR",
      bitrate: "18.5 Mbps",
      server: "سيرفر نوفا VIP",
    },
  },
  {
    kicker: "مكتبة سينمائية عملاقة VOD",
    img: "images/hero/slide-cinema.jpg",
    badge: "مكتبة ترفيهية متجددة يومياً",
    channelsTag: "الأفلام السينمائية • المسلسلات المترجمة • الوثائقيات",
    channel: {
      switchLabel: "🎬 سينما 4K",
      name: "مكتبة السينما والمسلسلات 4K",
      event: "أحدث الأفلام والمسلسلات الحصرية 2026",
      liveTag: "على الطلب 4K",
      quality: "True 4K UHD",
      bitrate: "22.0 Mbps",
      server: "سيرفر إيستار برو",
    },
  },
  {
    kicker: "تفعيل فوري ودعم فني 24/7",
    img: "images/hero/slide-devices.jpg",
    badge: "تفعيل آلي خلال دقائق",
    channelsTag: "Samsung TV • LG • Android Box • Apple TV",
    channel: {
      switchLabel: "🖥️ كل الشاشات",
      name: "تشغيل فوري على شاشتك",
      event: "Samsung • LG • Android • Apple TV — تفعيل خلال 5 دقائق",
      liveTag: "تفعيل فوري",
      quality: "FHD / 4K",
      bitrate: "بدون التزام",
      server: "جميع الأجهزة مدعومة",
    },
  },
];

const SLIDE_MS = 5000;

/* الكلمة المتناوبة في العنوان الرئيسي (H1) — تُبدَّل قبل عبارة «كل ما تحب» */
const HERO_TITLE_WORDS = ["شاهِد", "تابِع", "اكتشِف"];
const HERO_TITLE_MS = 3000;

interface HeroProps {
  onOpenTrial: () => void;
}

/* =========================================================================
   ماكيت مشغل التلفزيون — على هيئة محرر Salient البصري (3 لوحات)
========================================================================= */
function TvMockup({ index }: { index: number }) {
  const current = STREAM_SLIDES[index];
  return (
    <div className="relative rounded-[24px] overflow-hidden border border-black/10 bg-white shadow-[0_60px_120px_-30px_rgba(0,0,0,0.35)]">
      {/* شريط المتصفح */}
      <div className="hidden md:flex items-center gap-2 px-5 h-12 border-b border-black/10 bg-[#f7f6f2]">
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
          <span className="w-3 h-3 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="bg-white border border-black/10 rounded-full px-4 py-1 text-[12px] font-bold text-black/60 flex items-center gap-2 w-full max-w-sm">
            <span className="w-2 h-2 rounded-full bg-[#ff5c4d] animate-pulse-soft" />
            stream-master.pro — بث مباشر
          </div>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-black bg-[#0b0b0f] text-[#d8ff3e] px-3 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-[#d8ff3e]" /> مباشر
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[210px_1fr_230px] md:min-h-[480px]">
        {/* لوحة القنوات (يمين في RTL) */}
        <div className="border-s border-black/10 bg-[#faf9f6] p-3 hidden md:block">
          <p className="text-[10px] font-black tracking-[0.18em] uppercase text-black/40 mb-3 px-1">
            قنوات مباشرة — 15,000+
          </p>
          <div className="space-y-1.5">
            {[
              { n: "الرياضية المباشرة 1", live: true },
              { n: "الرياضية العربية 1 HD", live: true },
              { n: "القناة العامة 1 HD", live: false },
              { n: "قناة السينما 4K", live: false },
              { n: "قناة الدراما العربية", live: false },
              { n: "قناة الأفلام العالمية", live: false },
              { n: "الرياضية المباشرة 2 HD", live: true },
              { n: "قناة المسلسلات HD", live: false },
            ].map((e, i) => (
              <div
                key={e.n}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-[12.5px] font-bold border ${
                  i === 0
                    ? "bg-[#0b0b0f] text-white border-[#0b0b0f]"
                    : "bg-white border-black/10"
                }`}
              >
                {e.n}
                {e.live ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ff5c4d] animate-pulse-soft" />
                ) : (
                  <IconPlay className="w-3 h-3 opacity-30" />
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-2xl bg-gradient-to-br from-[#2b4eff] to-[#7c5cff] text-white p-4">
            <p className="text-[12px] font-black">مكتبة VOD</p>
            <p className="text-[11px] opacity-80 leading-snug mt-1">
              +50,000 فيلم ومسلسل — تتجدد يومياً
            </p>
          </div>
        </div>

        {/* لوحة العرض — موقع مصغّر بداخله شاشة بث حية تتناوب */}
        <div className="bg-[#efeee9] p-4 md:p-6 relative min-w-0">
          {/* شارة عائمة: تفعيل فوري */}
          <div data-hero-badge="activation" className="relative z-10 mb-3 md:mb-4 ms-auto w-fit max-w-full bg-white rounded-2xl shadow-lg border border-black/10 px-2.5 py-1.5 md:px-3 md:py-2 flex items-center gap-2 motion-safe:animate-float">
            <span className="w-6 h-6 md:w-7 md:h-7 shrink-0 rounded-lg bg-[#d8ff3e] grid place-items-center">
              <IconCheck className="w-3 h-3 md:w-3.5 md:h-3.5" />
            </span>
            {/* على الجوال سطر واحد مضغوط (كان سطرين + 54px ارتفاعاً)، ويبقى
                ظاهراً لأن اختبار storefront يشترط ظهور الشارات الثلاث لكل عرض */}
            <div className="leading-none text-right flex items-baseline gap-1.5">
              <p className="text-[10.5px] md:text-[11px] font-black">تفعيل فوري</p>
              <p className="text-[10px] text-black/50">خلال 5 دقائق</p>
            </div>
          </div>
          <div className="relative">
          <div className="rounded-2xl bg-white border border-black/10 overflow-hidden">
            {/* رأس الموقع المصغر */}
            <div className="hidden md:flex items-center justify-between px-5 py-3 border-b border-black/[0.07]">
              <div className="flex gap-1.5 items-center">
                <span className="w-6 h-6 rounded-lg bg-black text-[#d8ff3e] grid place-items-center">
                  <IconPlay className="w-2.5 h-2.5 mr-0.5" />
                </span>
                <div className="h-2 w-20 bg-black/10 rounded-full" />
              </div>
              <div className="flex gap-2">
                <div className="h-6 w-14 bg-black/10 rounded-full" />
                <div className="h-6 w-14 bg-[#0b0b0f] rounded-full" />
              </div>
            </div>

            <div className="p-5 md:p-8">
              <div className="inline-flex text-[10px] font-black tracking-widest uppercase bg-[#d8ff3e] px-3 py-1 rounded-full mb-4">
                مباشر الآن — كأس العالم 2026
              </div>
              <div className="font-display font-black text-2xl md:text-[34px] leading-[1.15] tracking-tight">
                الدوريات على شاشتك
                <br />
                <span className="font-serif italic font-normal">بث حي بدون تقطيع</span>
              </div>

              {/* شاشة البث المتناوبة — مع Ken Burns */}
              <div className="relative mt-5 rounded-xl overflow-hidden aspect-video bg-black">
                {STREAM_SLIDES.map((s, i) => (
                  <img
                    key={s.img}
                    src={s.img}
                    alt={s.channel.name}
                    loading={i === 0 ? "eager" : "lazy"}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 animate-kenburns ${
                      i === index ? "opacity-90" : "opacity-0"
                    }`}
                  />
                ))}
                <div className="absolute top-2 start-2 bg-[#ff5c4d] text-white text-[10px] font-black px-2 py-0.5 rounded flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse-soft" />
                  {current.channel.liveTag}
                </div>
                <div className="absolute top-2 end-2 glass-dark text-white text-[10px] font-bold px-2 py-0.5 rounded">
                  {current.channel.bitrate}
                </div>
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent px-3 pb-2 pt-6 text-right">
                  <div className="text-[12px] font-black text-white leading-tight">
                    {current.channel.name}
                  </div>
                  <div className="text-[10.5px] text-white/70 font-medium truncate">
                    {current.channel.event}
                  </div>
                </div>
              </div>

              <div className="hidden md:flex gap-2 mt-5">
                <div className="h-9 w-28 bg-[#0b0b0f] rounded-full" />
                <div className="h-9 w-28 bg-white border border-black/15 rounded-full" />
              </div>
            </div>
          </div>

          {/* إطار التحديد المتقطع — توقيع Salient البصري */}
          <div className="hidden md:block absolute top-[70px] -start-1 -end-1 h-[190px] md:h-[230px] border-[2px] border-dashed border-[#2b4eff]/70 rounded-2xl pointer-events-none">
            <span className="absolute -top-3 start-4 max-w-[calc(100%-2rem)] bg-[#2b4eff] text-white text-[10px] font-black px-2 py-0.5 rounded-md">
              شاشة البث — {current.channel.quality}
            </span>
            <span className="absolute top-1/2 -start-2 translate-y-1/2 w-8 h-8 bg-[#2b4eff] rounded-full grid place-items-center text-white shadow-lg">
              <IconTv className="w-4 h-4" />
            </span>
          </div>
          </div>
        </div>

        {/* لوحة الجودة (يسار في RTL) */}
        <div className="border-e border-black/10 bg-white p-4 hidden md:block">
          <p className="text-[10px] font-black tracking-[0.18em] uppercase text-black/40 mb-3">
            الجودة — البث
          </p>
          {[
            { l: "الدقة", v: "100%" },
            { l: "الثبات", v: "99%" },
            { l: "البافر", v: "85%" },
          ].map((s) => (
            <div key={s.l} className="mb-4">
              <div className="flex justify-between text-[11.5px] font-bold mb-1.5">
                <span>{s.l}</span>
                <span className="text-black/40">{s.v}</span>
              </div>
              <div className="h-1.5 bg-black/10 rounded-full relative">
                <div
                  className="absolute inset-y-0 start-0 bg-[#0b0b0f] rounded-full"
                  style={{ width: s.v }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white border-[3px] border-[#0b0b0f] rounded-full"
                  style={{ insetInlineStart: `calc(${s.v} - 8px)` }}
                />
              </div>
            </div>
          ))}
          <p className="text-[11.5px] font-bold mb-2">التدرج اللوني</p>
          <div className="h-10 rounded-xl bg-gradient-to-r from-[#2b4eff] via-[#7c5cff] to-[#ff5c4d] border border-black/10 mb-4" />
          <div className="grid grid-cols-4 gap-1.5 mb-4">
            {["#0b0b0f", "#2b4eff", "#d8ff3e", "#ff5c4d"].map((c) => (
              <div key={c} className="aspect-square rounded-lg border border-black/10" style={{ background: c }} />
            ))}
          </div>
          <div className="rounded-xl bg-[#faf9f6] border border-black/10 p-3 text-[11px] font-medium text-black/60 leading-snug text-right">
            يعمل على جميع الأجهزة — Smart TV، أندرويد، آبل، كمبيوتر.
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   الهيرو الرئيسي — على تخطيط Salient مع حركة السكرول الكاملة
========================================================================= */
export default function Hero({ onOpenTrial }: HeroProps) {
  const [index, setIndex] = useState(0);
  const [heroWord, setHeroWord] = useState(0);

  /* تدوير شاشة الماكيت */
  useEffect(() => {
    const t = window.setInterval(() => {
      setIndex((i) => (i + 1) % STREAM_SLIDES.length);
    }, SLIDE_MS);
    return () => window.clearInterval(t);
  }, []);

  /* تدوير كلمة العنوان الرئيسي */
  useEffect(() => {
    const t = window.setInterval(() => {
      setHeroWord((w) => (w + 1) % HERO_TITLE_WORDS.length);
    }, HERO_TITLE_MS);
    return () => window.clearInterval(t);
  }, []);

  return (
    <div id="hero" className="relative pt-[150px] md:pt-[168px] pb-16 md:pb-20 overflow-hidden bg-[#faf9f6]">
      {/* فقاعات الخلفية الملونة — ببارالاكس بطيء */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <Parallax speed={0.06} className="absolute inset-0">
          <div className="absolute -top-40 start-1/2 translate-x-1/2 w-[1100px] h-[600px] bg-gradient-to-r from-[#e2dcff] via-[#ffe3c7] to-[#d2f4ff] blur-[100px] opacity-80 rounded-full animate-blob" />
          <div className="absolute top-[420px] -start-40 w-[500px] h-[500px] bg-[#d8ff3e]/40 blur-[120px] rounded-full" />
          <div className="absolute top-[420px] -end-40 w-[500px] h-[500px] bg-[#2b4eff]/15 blur-[120px] rounded-full" />
        </Parallax>
      </div>

      <div className="max-w-[1200px] mx-auto px-5 text-center">
        {/* الشارة العلوية */}
        <Reveal variant="fade" duration={700}>
          <div className="inline-flex max-w-full flex-wrap justify-center items-center gap-x-2 gap-y-2 bg-white border border-black/10 rounded-3xl sm:rounded-full px-3 py-2 text-[12px] sm:text-[13px] font-bold shadow-sm">
            <span className="bg-[#0b0b0f] text-[#d8ff3e] text-[11px] font-black px-2.5 py-1 rounded-full">
              متعة المشاهدة تبدأ هنا
            </span>
            — رياضة وسينما على جميع شاشاتك
            <IconArrow className="w-3.5 h-3.5 shrink-0" />
          </div>
        </Reveal>

        {/* العنوان الرئيسي — كشف سطر بسطر من خلف قناع
            حجم الجوال مخفّض إلى 9vw (كان 11.5vw) للسطرين معاً: الكلمة المتناوبة
            و«كل ما تحب» في السطر الأول، و«بجودة 4K وبلا تقطيع» في الثاني.
            من sm (640px) فصاعداً تبقى الأحجام كما هي تماماً. */}
        <h1 className="mt-6 font-display font-black tracking-tight leading-[1.12] text-[9vw] sm:text-[56px] md:text-[76px] lg:text-[84px]">
          <LineReveal
            threshold={0.3}
            step={130}
            lines={[
              <>
                <span key={heroWord} className="inline-block animate-word-in">
                  {HERO_TITLE_WORDS[heroWord]}
                </span>
                {" كل ما تحب "}
              </>,
              <>
                بجودة 4K{" "}
                <span className="font-serif italic font-normal">وبلا تقطيع</span>
              </>,
            ]}
          />
        </h1>

        <Reveal variant="up" delay={260} className="mt-6">
          <p className="text-[15.5px] md:text-[18px] text-black/60 max-w-[640px] mx-auto leading-relaxed font-medium">
            استكشف خيارات المشاهدة، واطّلع على تفاصيل الخدمة ومتطلبات التشغيل قبل اختيار الباقة المناسبة لك.
          </p>
        </Reveal>

        {/* التقييم */}
        <Reveal variant="up" delay={380} className="mt-4">
          <div className="flex items-center justify-center gap-2">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <IconStar key={i} className="w-4 h-4 fill-[#0b0b0f] text-[#0b0b0f]" />
              ))}
            </div>
            <p className="text-[14px] font-bold">
              <span className="font-black">على شاشتك وجوالك</span>{" "}
              <span className="text-black/50 font-medium">— ترفيه أينما كنت</span>
            </p>
          </div>
        </Reveal>

        {/* الأزرار */}
        <Reveal variant="up" delay={480} className="mt-8">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onOpenTrial}
              className="btn-slide slide-royal group w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#0b0b0f] text-white font-black text-[15px] px-8 py-4 rounded-full cursor-pointer"
            >
              <IconZap className="w-4 h-4 text-[#d8ff3e]" /> اطلب تجربتك المجانية
            </button>
            <a
              href="#live-player"
              className="btn-slide slide-ink group w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white border border-black/15 font-black text-[15px] px-8 py-4 rounded-full cursor-pointer"
            >
              <span className="w-6 h-6 rounded-full bg-black text-white grid place-items-center group-hover:bg-[#d8ff3e] group-hover:text-black transition">
                <IconPlay className="w-2.5 h-2.5 mr-0.5" />
              </span>
              دليل المشاهدة الرسمية
            </a>
          </div>
        </Reveal>

        {/* تذكرة مواعيد المباريات الجامعة — نُقلت إلى ما بعد الأزرار (كانت فوق
            العنوان): الوعد الأساسي والتحويل أولاً، ثم الحيوية الحيّة تحتهما.
            نفس مكوّن صفحة «مواعيد المباريات» بشرائحه الست وكل وظائفه الحيّة. */}
        <Reveal variant="up" delay={540} className="mt-9 md:mt-10">
          <div className="home-matches-ticket mx-auto w-full max-w-[1120px]">
            <AllLeaguesTicket />
          </div>
        </Reveal>

        {/* الماكيت + الشارات العائمة ببارالاكس الماوس */}
        <Reveal variant="up" delay={620} duration={950} className="mt-12 md:mt-16 relative">
          <div className="relative z-10 flex flex-wrap items-center justify-center sm:justify-between gap-4 px-2 sm:px-8 py-5 mb-4 md:mb-6" data-hero-badges>
            <MouseParallax factor={0.008} className="max-w-full">
              <div data-hero-badge="stability" className="flex items-center gap-3 bg-white rounded-2xl border border-black/10 shadow-lg px-4 py-3 sm:rotate-[-3deg] motion-safe:animate-float">
                <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#2b4eff] to-[#7c5cff] grid place-items-center text-white">
                  <IconTrophy className="w-4 h-4" />
                </span>
                <div className="text-right leading-none">
                  <p className="text-[13px] font-black">ثبات 99.9%</p>
                  <p className="text-[11px] text-black/50 font-medium">في قمة المباريات</p>
                </div>
              </div>
            </MouseParallax>

            <MouseParallax factor={-0.008} className="max-w-full">
              <div data-hero-badge="channels" className="flex items-center gap-2 bg-[#0b0b0f] text-white rounded-2xl shadow-lg px-4 py-3 sm:rotate-[3deg] motion-safe:animate-float-delayed">
                <span className="w-2.5 h-2.5 rounded-full bg-[#3effe0] animate-pulse-soft" />
                <p className="text-[13px] font-black">+15,000 قناة حية</p>
              </div>
            </MouseParallax>
          </div>

          <Parallax speed={0.05}>
            <TvMockup index={index} />
          </Parallax>

          <div className="absolute -bottom-10 start-1/2 translate-x-1/2 w-[80%] h-16 bg-black/20 blur-[60px] -z-10" />
        </Reveal>
      </div>
    </div>
  );
}
