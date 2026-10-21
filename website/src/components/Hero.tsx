import { useEffect, useState } from "react";
import {
  IconArrow,
  IconArrowUpRight,
  IconChat,
  IconCheck,
  IconClock,
  IconPlay,
  IconShieldCheck,
  IconSparkles,
  IconStar,
  IconTrophy,
  IconTv,
  IconZap,
} from "./Icons";
import { getWhatsAppUrl, LOWEST_PLAN_PRICE_USD } from "../data";
import { ALL_BRANDS } from "./ContentTicker";
import { LineReveal, MouseParallax, Parallax, Reveal, RevealImage } from "./motion";
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

/* الكلمات المتناوبة في القسم الداكن */
const ENCHANT_WORDS = ["شاهِد", "عِش", "احتفِل"];

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
      <div className="flex items-center gap-2 px-5 h-12 border-b border-black/10 bg-[#f7f6f2]">
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

      <div className="grid grid-cols-[52px_1fr] md:grid-cols-[210px_1fr_230px] min-h-[420px] md:min-h-[480px]">
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

        {/* شريط أيقونات للموبايل */}
        <div className="border-s border-black/10 bg-[#faf9f6] p-2 flex md:hidden flex-col items-center gap-2 pt-4">
          {[IconTv, IconPlay, IconSparkles, IconStar, IconCheck, IconZap].map((Icon, i) => (
            <div
              key={i}
              className={`w-9 h-9 rounded-xl grid place-items-center ${
                i === 0 ? "bg-black text-[#d8ff3e]" : "bg-white border border-black/10"
              }`}
            >
              <Icon className="w-4 h-4" />
            </div>
          ))}
        </div>

        {/* لوحة العرض — موقع مصغّر بداخله شاشة بث حية تتناوب */}
        <div className="bg-[#efeee9] p-4 md:p-6 relative min-w-0">
          {/* شارة عائمة: تفعيل فوري */}
          <div data-hero-badge="activation" className="relative z-10 mb-4 ms-auto w-fit max-w-full bg-white rounded-2xl shadow-lg border border-black/10 px-3 py-2 flex items-center gap-2 motion-safe:animate-float">
            <span className="w-7 h-7 shrink-0 rounded-lg bg-[#d8ff3e] grid place-items-center">
              <IconCheck className="w-3.5 h-3.5" />
            </span>
            <div className="leading-none text-right">
              <p className="text-[11px] font-black">تفعيل فوري</p>
              <p className="text-[10px] text-black/50">خلال 5 دقائق</p>
            </div>
          </div>
          <div className="relative">
          <div className="rounded-2xl bg-white border border-black/10 overflow-hidden">
            {/* رأس الموقع المصغر */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-black/[0.07]">
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

              <div className="flex gap-2 mt-5">
                <div className="h-9 w-28 bg-[#0b0b0f] rounded-full" />
                <div className="h-9 w-28 bg-white border border-black/15 rounded-full" />
              </div>
            </div>
          </div>

          {/* إطار التحديد المتقطع — توقيع Salient البصري */}
          <div className="absolute top-[70px] -start-1 -end-1 h-[190px] md:h-[230px] border-[2px] border-dashed border-[#2b4eff]/70 rounded-2xl pointer-events-none">
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
  const [word, setWord] = useState(0);
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

  /* تدوير كلمات القسم الداكن */
  useEffect(() => {
    const t = window.setInterval(() => {
      setWord((w) => (w + 1) % ENCHANT_WORDS.length);
    }, 2200);
    return () => window.clearInterval(t);
  }, []);

  return (
    <div id="hero" className="relative pt-[150px] md:pt-[168px] overflow-hidden bg-[#faf9f6]">
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

        {/* تذكرة مواعيد المباريات الجامعة بعد الشارة مباشرةً — نفس مكوّن
            صفحة «مواعيد المباريات» بشرائحها الست (الأساسية + قمم
            الأبطال والكلاسيكو والإنجليزي) وكل وظائفها الحيّة */}
        <Reveal variant="up" delay={140} className="mt-7">
          <div className="home-matches-ticket mx-auto w-full max-w-[1120px]">
            <AllLeaguesTicket />
          </div>
        </Reveal>

        {/* العنوان الرئيسي — كشف سطر بسطر من خلف قناع */}
        <h1 className="mt-6 font-display font-black tracking-tight leading-[1.12] text-[11.5vw] sm:text-[56px] md:text-[76px] lg:text-[84px]">
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

        {/* الماكيت + الشارات العائمة ببارالاكس الماوس */}
        <Reveal variant="up" delay={560} duration={950} className="mt-12 md:mt-16 relative">
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

        {/* بطاقات القيمة الثلاث — تتابع صعود */}
        <div className="mt-14 grid md:grid-cols-3 gap-4 text-right">
          <Reveal variant="up" delay={0} className="h-full">
            <div className="h-full rounded-[28px] bg-[#ffe3c7] border border-black/10 p-7 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display font-black text-[20px] tracking-tight flex items-center gap-2">
                    <IconZap className="w-5 h-5" /> فحص تجريبي مجاني
                  </h3>
                  <span className="w-9 h-9 rounded-xl bg-[#0b0b0f] text-[#d8ff3e] grid place-items-center">
                    <IconTv className="w-4 h-4" />
                  </span>
                </div>
                <p className="text-[13.5px] leading-[1.8] text-black/70 font-medium">
                  اختبر توافق التطبيق على جهازك واستقرار اتصال سيرفر المزود لمدة 6 ساعات مجاناً
                  قبل الشراء — بدون أي التزام مسبق.
                </p>
              </div>
              <button
                onClick={onOpenTrial}
                className="btn-slide slide-royal mt-6 inline-flex items-center justify-center gap-2 bg-[#0b0b0f] text-white font-black text-[13.5px] px-5 py-3 rounded-full cursor-pointer"
              >
                طلب كود تجريبي <IconArrow className="w-4 h-4" />
              </button>
            </div>
          </Reveal>

          <Reveal variant="up" delay={130} className="h-full">
            <div className="h-full rounded-[28px] bg-gradient-to-br from-[#2b4eff] to-[#7c5cff] text-white p-7 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute -top-16 -end-16 w-48 h-48 bg-white/20 blur-[70px] rounded-full" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display font-black text-[20px] tracking-tight flex items-center gap-2">
                    <IconTrophy className="w-5 h-5 text-[#ffe3c7]" /> قنوات المباريات وسيرفر نوفا
                  </h3>
                  <span className="w-9 h-9 rounded-xl bg-white/15 grid place-items-center">
                    <IconPlay className="w-4 h-4" />
                  </span>
                </div>
                <p className="text-[13.5px] leading-[1.8] text-white/85 font-medium">
                  سيرفرات المزودين (نوفا وإيستار وموكا) بدعم تقني كامل وجودة بث تصل إلى 4K
                  وسيرفرات احتياطية لدى المزود وقت الذروة.
                </p>
              </div>
              <div className="relative mt-6 flex items-center justify-between gap-3">
                <span className="text-[13.5px] font-black text-[#ffe3c7]">
                  باقات تبدأ من {LOWEST_PLAN_PRICE_USD} دولار / سنة
                </span>
                <a
                  href="#pricing"
                  className="inline-flex items-center gap-1.5 bg-white/15 border border-white/25 px-4 py-2 text-[12.5px] font-black rounded-full hover:bg-white hover:text-[#2b4eff] transition"
                >
                  عرض الأسعار <IconArrow className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </Reveal>

          <Reveal variant="up" delay={260} className="h-full">
            <div className="h-full rounded-[28px] bg-[#0b0b0f] text-white p-7 flex flex-col justify-between relative overflow-hidden grain">
              <div className="absolute -top-16 -start-16 w-48 h-48 bg-[#2b4eff]/40 blur-[70px] rounded-full" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display font-black text-[20px] tracking-tight flex items-center gap-2">
                    <IconShieldCheck className="w-5 h-5 text-[#3effe0]" /> ضمان الثبات والدعم 24/7
                  </h3>
                  <span className="w-9 h-9 rounded-xl bg-white/15 grid place-items-center">
                    <IconClock className="w-4 h-4" />
                  </span>
                </div>
                <ul className="divide-y divide-white/10 text-[12.5px]">
                  <li className="flex items-center justify-between py-2">
                    <span className="text-white/70 font-medium">خدمة العملاء والواتساب</span>
                    <span className="font-black text-[#3effe0]">متاح 24 ساعة</span>
                  </li>
                  <li className="flex items-center justify-between py-2">
                    <span className="text-white/70 font-medium">سرعة الرد والتفعيل</span>
                    <span className="font-black text-white">أقل من 3 دقائق</span>
                  </li>
                  <li className="flex items-center justify-between py-2">
                    <span className="text-white/70 font-medium">ضمان الاسترجاع</span>
                    <span className="font-black text-[#d8ff3e]">ضمان كامل ومستمر</span>
                  </li>
                </ul>
              </div>
              <a
                href={getWhatsAppUrl("مرحبًا ستريم ماستر، أريد التحدث مع الدعم الفني لطلب التفعيل التقني لدى المزود")}
                target="_blank"
                rel="noopener noreferrer"
                className="relative mt-5 flex items-center justify-center gap-2 bg-[#16a34a] hover:bg-[#15803d] py-3 text-[13px] font-black rounded-full transition"
              >
                <IconChat className="w-4 h-4" /> محادثة مباشرة عبر واتساب
              </a>
            </div>
          </Reveal>
        </div>
      </div>

      {/* شريط الشعارات الموثوقة */}
      <Reveal variant="fade" duration={900} className="mt-16 md:mt-20 border-y border-black/10 bg-white/60 backdrop-blur py-5 overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-5 flex items-center gap-6">
          <p className="hidden md:block text-[12px] font-black tracking-[0.2em] uppercase text-black/40 whitespace-nowrap shrink-0 leading-relaxed">
            خيارات أكثر
            <br />
            — متعة كل يوم
          </p>
          <div className="flex-1 overflow-hidden mask-fade-x" dir="ltr">
            <div className="flex gap-4 w-max animate-marquee hover:[animation-play-state:paused] items-center">
              {[...ALL_BRANDS, ...ALL_BRANDS].map((b, i) => (
                <div
                  key={i}
                  className={`shrink-0 flex items-center justify-center rounded-2xl border px-5 h-[52px] ${
                    b.dark
                      ? "border-white/10 bg-[#0b0b0f]"
                      : "border-black/10 bg-white"
                  }`}
                  title={b.name}
                >
                  <img
                    src={b.file}
                    alt={b.name}
                    loading="lazy"
                    className="max-h-7 w-auto max-w-[96px] object-contain"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Reveal>

      {/* القسم الداكن — الكلمات المتناوبة + بارالاكس الصور */}
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
    </div>
  );
}
