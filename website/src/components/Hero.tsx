import { useEffect, useRef, useState, type ReactNode } from "react";
import { IconArrow, IconCheck, IconPlay, IconStar, IconTrophy, IconZap } from "./Icons";
import { LineReveal, MouseParallax, Parallax, Reveal } from "./motion";
import AllLeaguesTicket from "./AllLeaguesTicket";
import { ServerLink } from "./ServerIcon";
import { PRICING_PLANS } from "../data";
import { FEATURED_CLASHES } from "./LeagueTicketCard";

/* =========================================================================
   بيانات الماكيت — من مصادر الموقع نفسها لا من نصوص مختلقة
   -------------------------------------------------------------------------
   • المواصفات (الجودة، مانع التقطيع، الأجهزة، عدد القنوات وVOD) تُقرأ من
     باقة نوفا في `data.ts`: رقم واحد لا يتضارب بين الماكيت وبطاقات الأسعار.
   • «مباراة الليلة» هي المواجهة الأولى المميّزة في `FEATURED_CLASHES`
     (باريس سان جيرمان × برشلونة) بشعاراتها وأسمائها الحقيقية — نفس المصدر
     الذي يغذّي تذكرة المواعيد فوق الماكيت.
   • أسماء القنوات في اللوحة الجانبية أسماء عامة محايدة (قناة أفلام 1 …)
     بلا أي إيحاء بقنوات قد لا يملكها المزود.
========================================================================= */
const PLAN = PRICING_PLANS.find((p) => p.serverCode === "nova") ?? PRICING_PLANS[0];
const LIVE_CLASH = FEATURED_CLASHES["uefa.champions"][0];

/* صور الشاشة — WebP بعرضين مع srcset (بدل JPEG 1376×768 الثقيل) */
const slideImg = (base: string) => ({
  src: `images/hero/${base}-700.webp`,
  srcSet: `images/hero/${base}-700.webp 700w, images/hero/${base}-1320.webp 1320w`,
  sizes: "(min-width: 768px) 660px, calc(100vw - 40px)",
});

type Slide = {
  id: string;
  tab: string;
  chip: string;
  title: ReactNode;
  sub: string;
  overlayTitle: string;
  overlaySub: string;
  qualityTag: string;
  img: ReturnType<typeof slideImg>;
  alt: string;
};

const SLIDES: Slide[] = [
  {
    id: "live",
    tab: "البث المباشر",
    chip: "مباشر الآن",
    title: (
      <span className="inline-flex items-center justify-center gap-2 flex-wrap">
        <img
          src={LIVE_CLASH.home.crest}
          alt=""
          width={26}
          height={26}
          className="w-[22px] h-[22px] md:w-[26px] md:h-[26px] object-contain"
          loading="lazy"
        />
        {LIVE_CLASH.home.name}
        <span className="opacity-40">×</span>
        {LIVE_CLASH.away.name}
        <img
          src={LIVE_CLASH.away.crest}
          alt=""
          width={26}
          height={26}
          className="w-[22px] h-[22px] md:w-[26px] md:h-[26px] object-contain"
          loading="lazy"
        />
      </span>
    ),
    sub: `دوري أبطال أوروبا — ${LIVE_CLASH.eyebrow}`,
    overlayTitle: `${LIVE_CLASH.home.mono} × ${LIVE_CLASH.away.mono}`,
    overlaySub: "جودة تلقائية حتى 4K — بدون تقطيع",
    qualityTag: "H.265",
    img: slideImg("slide-sports"),
    alt: "شاشة بث مباشر لمباراة في دوري أبطال أوروبا",
  },
  {
    id: "vod",
    tab: "الأفلام والمسلسلات",
    chip: "مكتبة VOD",
    title: PLAN.vodCount,
    sub: "إصدارات تُضاف يومياً — ترجمة فورية",
    overlayTitle: "أفلام ومسلسلات بجودة عالية",
    overlaySub: "مكتبة تتجدد — تُشاهد متى شئت",
    qualityTag: PLAN.quality.split(" / ")[1] ?? "4K",
    img: slideImg("slide-cinema"),
    alt: "شاشة سينما منزلية تعرض فيلماً",
  },
  {
    id: "devices",
    tab: "الأجهزة",
    chip: "التشغيل",
    title: "كل شاشاتك في حساب واحد",
    sub: "Samsung · LG · Android TV · Apple TV",
    overlayTitle: "التطبيق على شاشتك",
    overlaySub: `حساب واحد — ${PLAN.devices}`,
    qualityTag: "FHD / 4K",
    img: slideImg("slide-devices"),
    alt: "تلفزيون ذكي في غرفة معيشة",
  },
];

/* قنوات اللوحة الجانبية — أسماء عامة محايدة (كما اختار المالك) */
const SIDE_CHANNELS = [
  { n: "قناة الرياضة 1", live: true },
  { n: "قناة الرياضة 2", live: true },
  { n: "قناة الأفلام 1", live: false },
  { n: "قناة المسلسلات 1", live: false },
  { n: "قناة الأخبار 1", live: false },
  { n: "قناة الأطفال 1", live: false },
  { n: "قناة الوثائقيات 1", live: false },
  { n: "قناة الموسيقى 1", live: false },
];

/* بطاقة مواصفات الخدمة — كل سطر من `data.ts` لا من وصف تصميمي */
const SPECS = [
  { label: "الجودة", value: PLAN.quality },
  { label: "مانع التقطيع", value: PLAN.antiFreeze },
  { label: "الأجهزة", value: PLAN.devices },
  { label: "الدعم", value: "24/7" },
];

const TAB_MS = 6500;

/* =========================================================================
   ماكيت المشاهدة — لوحة تشغيل فعلية بثلاثة تبويبات
   -------------------------------------------------------------------------
   • تبويبات تعمل بالفأرة/اللمس/لوحة المفاتيح (role=tablist/tab/tabpanel).
   • نقاط تحكّم أسفل الشاشة تُثبّت أي تبويب، وإيقاف تلقائي عند:
     مرور المؤشر، الخروج من الشاشة (IntersectionObserver)، إخفاء التبويب،
     أو تفضيل تقليل الحركة (حينها لا يوجد تدوير إطلاقاً).
   • واجهة المتصفح واللوحة الجانبية زخرفية: aria-hidden، فلا يقرأ قارئ
     الشاشة أسماء قنوات نموذجية ولا أرقاماً غير حقيقية.
   • «معاينة توضيحية» صريحة: الشاشة تعرض صورة معاينة لا بثاً فعلياً.
========================================================================= */
function TvMockup({ onOpenTrial }: { onOpenTrial: () => void }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const current = SLIDES[active];

  /* تدوير التبويبات — يتوقف كلياً مع تقليل الحركة، ويحترم الإيقاف والرؤية */
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let onScreen = true;
    const io = new IntersectionObserver(
      (entries) => {
        onScreen = entries.some((e) => e.isIntersecting);
      },
      { threshold: 0.25 }
    );
    if (hostRef.current) io.observe(hostRef.current);

    const t = window.setInterval(() => {
      if (paused || !onScreen || document.hidden) return;
      setActive((i) => (i + 1) % SLIDES.length);
    }, TAB_MS);

    return () => {
      io.disconnect();
      window.clearInterval(t);
    };
  }, [paused]);

  const tabId = (i: number) => `hero-tab-${SLIDES[i].id}`;

  return (
    <div
      ref={hostRef}
      role="group"
      aria-label="معاينة واجهة المشاهدة"
      className="relative rounded-[24px] overflow-hidden border border-black/10 bg-white shadow-[0_60px_120px_-30px_rgba(0,0,0,0.35)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {/* شريط المتصفح — زخرفي */}
      <div
        aria-hidden="true"
        className="hidden md:flex items-center gap-2 px-5 h-12 border-b border-black/10 bg-[#f7f6f2]"
      >
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
          <span className="w-3 h-3 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="bg-white border border-black/10 rounded-full px-4 py-1 text-[12px] font-bold text-black/60 flex items-center gap-2 w-full max-w-sm">
            <span className="w-2 h-2 rounded-full bg-[#ff5c4d] animate-pulse-soft" />
            stream-master.pro — معاينة واجهة المشاهدة
          </div>
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] font-black bg-[#0b0b0f] text-[#d8ff3e] px-3 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-[#d8ff3e]" /> {PLAN.channelsCount}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr_230px]">
        {/* لوحة القنوات (يمين في RTL) — زخرفية */}
        <div aria-hidden="true" className="border-s border-black/10 bg-[#faf9f6] p-3 hidden md:block">
          <p className="text-[10px] font-black tracking-[0.18em] uppercase text-black/40 mb-3 px-1">
            قنوات مباشرة — {PLAN.channelsCount}
          </p>
          <div className="space-y-1.5">
            {SIDE_CHANNELS.map((e, i) => (
              <div
                key={e.n}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-[12.5px] font-bold border ${
                  i === 0 ? "bg-[#0b0b0f] text-white border-[#0b0b0f]" : "bg-white border-black/10"
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
            <p className="text-[11px] opacity-80 leading-snug mt-1">{PLAN.vodCount} — تتجدد يومياً</p>
          </div>
        </div>

        {/* لوحة العرض */}
        <div className="bg-[#efeee9] p-3 md:p-6 relative min-w-0">
          {/* شارة عائمة: تفعيل فوري (اختبار storefront يشترط ظهور الشارات الثلاث) */}
          <div
            data-hero-badge="activation"
            className="relative z-10 mb-3 md:mb-4 ms-auto w-fit max-w-full bg-white rounded-2xl shadow-lg border border-black/10 px-2.5 py-1.5 md:px-3 md:py-2 flex items-center gap-2 motion-safe:animate-float"
          >
            <span className="w-6 h-6 md:w-7 md:h-7 shrink-0 rounded-lg bg-[#d8ff3e] grid place-items-center">
              <IconCheck className="w-3 h-3 md:w-3.5 md:h-3.5" />
            </span>
            <div className="leading-none text-right flex items-baseline gap-1.5">
              <p className="text-[10.5px] md:text-[11px] font-black">تفعيل فوري</p>
              <p className="text-[10px] text-black/50">خلال 5 دقائق</p>
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-black/10 overflow-hidden">
            {/* تبويبات تعمل */}
            <div
              role="tablist"
              aria-label="أقسام المعاينة"
              className="flex gap-1 p-2 border-b border-black/[0.07] bg-[#faf9f6] overflow-x-auto"
            >
              {SLIDES.map((s, i) => (
                <button
                  key={s.id}
                  id={tabId(i)}
                  role="tab"
                  type="button"
                  aria-selected={active === i}
                  aria-controls={`hero-panel-${s.id}`}
                  tabIndex={active === i ? 0 : -1}
                  onClick={() => setActive(i)}
                  onKeyDown={(e) => {
                    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
                    e.preventDefault();
                    setActive((prev) => (prev + (e.key === "ArrowLeft" ? 1 : SLIDES.length - 1)) % SLIDES.length);
                  }}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-black transition cursor-pointer ${
                    active === i
                      ? "bg-[#0b0b0f] text-white"
                      : "text-black/55 hover:text-black hover:bg-black/[0.06]"
                  }`}
                >
                  {s.tab}
                </button>
              ))}
            </div>

            <div
              key={current.id}
              id={`hero-panel-${current.id}`}
              role="tabpanel"
              aria-labelledby={tabId(active)}
              className="p-4 md:p-6"
            >
              <div className="flex items-center justify-between gap-3 mb-3">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black bg-[#d8ff3e] px-2.5 py-1 rounded-full">
                  {current.id === "live" && <span className="w-1.5 h-1.5 rounded-full bg-[#0b0b0f] animate-pulse-soft" />}
                  {current.chip}
                </span>
                <span className="text-[10.5px] font-bold text-black/40 truncate">{current.sub}</span>
              </div>

              <div className="font-display font-black text-lg md:text-[26px] leading-[1.2] tracking-tight">
                {current.title}
              </div>

              {/* شاشة العرض */}
              <div className="relative mt-4 rounded-xl overflow-hidden aspect-video bg-black">
                <img
                  src={current.img.src}
                  srcSet={current.img.srcSet}
                  sizes={current.img.sizes}
                  alt={current.alt}
                  loading={active === 0 ? "eager" : "lazy"}
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute top-2 start-2 bg-[#ff5c4d] text-white text-[10px] font-black px-2 py-0.5 rounded flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse-soft" />
                  {current.id === "live" ? "مباشر" : current.chip}
                </div>
                <div className="absolute top-2 end-2 glass-dark text-white text-[10px] font-bold px-2 py-0.5 rounded">
                  {current.qualityTag}
                </div>
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent px-3 pb-2 pt-6 text-right">
                  <div className="text-[12px] font-black text-white leading-tight">{current.overlayTitle}</div>
                  <div className="text-[10.5px] text-white/70 font-medium truncate">{current.overlaySub}</div>
                </div>
              </div>

              {/* التحكّم + زر التحويل */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {SLIDES.map((s, i) => (
                    <button
                      key={s.id}
                      type="button"
                      aria-pressed={active === i}
                      aria-label={`عرض ${s.tab}`}
                      onClick={() => setActive(i)}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${
                        active === i ? "w-5 bg-[#0b0b0f]" : "w-1.5 bg-black/20 hover:bg-black/40"
                      }`}
                    />
                  ))}
                  <span className="ms-1.5 text-[10px] font-bold text-black/35">معاينة توضيحية</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onOpenTrial}
                    className="inline-flex items-center gap-1.5 bg-[#0b0b0f] text-white text-[11.5px] font-black px-3.5 py-2 rounded-full cursor-pointer hover:bg-[#1c1c22] transition"
                  >
                    <IconZap className="w-3.5 h-3.5 text-[#d8ff3e]" /> جرّب 6 ساعات مجاناً
                  </button>
                  <a
                    href="#pricing"
                    className="inline-flex items-center gap-1 text-[11.5px] font-black text-black/60 hover:text-black transition"
                  >
                    كل الباقات <IconArrow className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* لوحة المواصفات (يسار في RTL) — من data.ts */}
        <div className="border-e border-black/10 bg-white p-4 hidden md:block">
          <p className="text-[10px] font-black tracking-[0.18em] uppercase text-black/40 mb-3">
            مواصفات الخدمة
          </p>
          <ul className="space-y-2.5">
            {SPECS.map((s) => (
              <li key={s.label}>
                <p className="text-[10.5px] font-bold text-black/40">{s.label}</p>
                <p className="text-[11.5px] font-black leading-snug">{s.value}</p>
              </li>
            ))}
          </ul>

          <p className="text-[10px] font-black tracking-[0.18em] uppercase text-black/40 mt-5 mb-2">
            سيرفرات المزود
          </p>
          <div className="grid grid-cols-2 gap-x-2 gap-y-2">
            {(["nova", "istar", "moka", "x"] as const).map((code) => (
              <ServerLink
                key={code}
                code={code}
                label={code === "x" ? "X" : code === "nova" ? "نوفا" : code === "istar" ? "إيستار" : "موكا"}
                size={18}
                className="text-[11px] font-black hover:opacity-70"
              />
            ))}
          </div>

          <div className="mt-4 rounded-xl bg-[#faf9f6] border border-black/10 p-3 text-[11px] font-medium text-black/60 leading-snug text-right">
            يعمل على Smart TV، أندرويد، آبل، وكمبيوتر.
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   الهيرو الرئيسي — على تخطيط Salient مع حركة السكرول الكاملة
========================================================================= */

/* الكلمة المتناوبة في العنوان الرئيسي (H1) — تُبدَّل قبل عبارة «كل ما تحب» */
const HERO_TITLE_WORDS = ["شاهِد", "تابِع", "اكتشِف"];
const HERO_TITLE_MS = 3000;

interface HeroProps {
  onOpenTrial: () => void;
}

export default function Hero({ onOpenTrial }: HeroProps) {
  const [heroWord, setHeroWord] = useState(0);

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
            حجم الجوال مخفّض إلى 9vw (كان 11.5vw) للسطرين معاً، ومن sm
            (640px) فصاعداً تبقى الأحجام كما هي تماماً. */}
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

        {/* تذكرة مواعيد المباريات الجامعة — بعد الأزرار: الوعد والتحويل أولاً،
            ثم الحيوية الحيّة تحتهما. نفس مكوّن صفحة «مواعيد المباريات». */}
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
                <p className="text-[13px] font-black">{PLAN.channelsCount}</p>
              </div>
            </MouseParallax>
          </div>

          <Parallax speed={0.05}>
            <TvMockup onOpenTrial={onOpenTrial} />
          </Parallax>

          <div className="absolute -bottom-10 start-1/2 translate-x-1/2 w-[80%] h-16 bg-black/20 blur-[60px] -z-10" />
        </Reveal>
      </div>
    </div>
  );
}
