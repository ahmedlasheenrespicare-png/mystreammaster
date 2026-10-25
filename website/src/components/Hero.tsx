import "./hero-title-holo.css";
import { HeroPhone } from "./HeroPhone";
import { HeroTelevision } from "./HeroTelevision";
import { useEffect, useState } from "react";
import { IconArrow, IconCheck, IconPlay, IconStar, IconTrophy, IconZap } from "./Icons";
import { LineReveal, MouseParallax, Parallax, Reveal } from "./motion";
import AllLeaguesTicket, { INDEX_CLASHES } from "./AllLeaguesTicket";
import { FeaturedNewsTicketSlide } from "./FeaturedNewsCards";
import { HeroMatchesTicket } from "./HeroSideTickets";
import { ServerIcon } from "./ServerIcon";
import { SERVER_MARK_SRC, SERVER_WATERMARKS } from "../lib/server-branding";
import { PRICING_PLANS } from "../data";

/* =========================================================================
   تبويبات الماكيت — السيرفرات الأربعة من `PRICING_PLANS`
   -------------------------------------------------------------------------
   كل تبويب = سيرفر حقيقي: اسمه وتاجه وعدد قنواته وجودته وأجهزته وسعره
   السنوي ورابط صفحته. لا نص مكتوب يدوياً هنا، فما يظهر في الماكيت هو نفسه
   ما يظهر في بطاقات الأسعار وفي صفحات /nova و/istar و/moka و/x.
   الألوان ألوان عرض (توهّج خلفي فقط) لا ادعاء بهوية بصرية للمزود.
========================================================================= */
const SERVER_AR: Record<string, string> = { nova: "نوفا", istar: "إيستار", moka: "موكا", x: "X" };

/* توهّج كل سيرفر (تدرّج خلفي زخرفي فقط) */
const SERVER_GLOW: Record<string, string> = {
  nova: "radial-gradient(circle at 70% 0%, rgba(43,78,255,0.55), transparent 65%)",
  istar: "radial-gradient(circle at 70% 0%, rgba(255,92,77,0.5), transparent 65%)",
  moka: "radial-gradient(circle at 70% 0%, rgba(22,163,74,0.45), transparent 65%)",
  x: "radial-gradient(circle at 70% 0%, rgba(216,255,62,0.35), transparent 65%)",
};

const SERVER_TABS = (["nova", "istar", "moka", "x"] as const)
  .map((code) => {
    const plan = PRICING_PLANS.find((p) => p.serverCode === code);
    if (!plan) return null;
    return {
      code,
      name: SERVER_AR[code],
      tag: plan.tag,
      quality: plan.quality,
      channelsCount: plan.channelsCount,
      vodCount: plan.vodCount,
      antiFreeze: plan.antiFreeze,
      /* السنة هي المدة الوحيدة المعروضة للبيع (AVAILABLE_DURATIONS) */
      price: plan.prices["12"].USD,
      glow: SERVER_GLOW[code],
    };
  })
  .filter((t): t is NonNullable<typeof t> => t !== null);

/* شارة «عدد القنوات» العائمة — أعلى رقم بين السيرفرات المعروضة، مقروء من
   الباقات نفسها فلا يتضارب الرقم العائم مع ما تعرضه التبويبات */
const channelNum = (v: string) => Number(v.replace(/[^\d]/g, ""));
const MEDIA_BADGE = SERVER_TABS.reduce(
  (best, t) => (channelNum(t.channelsCount) > channelNum(best) ? t.channelsCount : best),
  SERVER_TABS[0]?.channelsCount ?? ""
);

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

/* =========================================================================
   ماكيت المشاهدة — لوحة مقارنة السيرفرات داخل شاشة
   -------------------------------------------------------------------------
   • أربعة تبويبات تعمل بالفأرة/اللمس/لوحة المفاتيح (role=tablist/tab/tabpanel).
   • اختيار يدوي بالكامل: مقارنة أسعار لا تُدار بمؤقّت، فلا يتبدّل السعر
     تحت يد الزائر أثناء القراءة.
   • كل ما يظهر — القنوات، الجودة، مانع التقطيع، السعر، صفحة
     السيرفر — يأتي من نفس التبويب المختار (لوحة جانبية + زر متزامنان).
   • الشاشة تصميم بلا صور: توهّج لوني + شعار المزود + شرائح مواصفات.
   • واجهة المتصفح واللوحة الجانبية والقائمة زخرفية (aria-hidden).
========================================================================= */
function TvMockup({ onOpenTrial }: { onOpenTrial: () => void }) {
  const [active, setActive] = useState(0);
  const tab = SERVER_TABS[active];
  const tabId = (i: number) => `hero-tab-${SERVER_TABS[i].code}`;

  return (
    <div
      role="group"
      aria-label="مقارنة سيرفرات المشاهدة"
      className="relative rounded-[24px] overflow-hidden border border-black/10 bg-white shadow-[0_60px_120px_-30px_rgba(0,0,0,0.35)]"
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
            stream-master.pro — مقارنة السيرفرات
          </div>
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] font-black bg-[#0b0b0f] text-[#d8ff3e] px-3 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-[#d8ff3e]" /> 4 سيرفرات
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[190px_1fr_230px]">
        {/* لوحة القنوات (يمين في RTL) — زخرفية */}
        <div aria-hidden="true" className="border-s border-black/10 bg-[#faf9f6] p-3 hidden md:block">
          <p className="text-[10px] font-black tracking-[0.18em] uppercase text-black/40 mb-3 px-1">
            قنوات مباشرة
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
            <p className="text-[11px] opacity-80 leading-snug mt-1">{tab.vodCount} — تتجدد يومياً</p>
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
            {/* تبويبات السيرفرات */}
            <div
              role="tablist"
              aria-label="اختر السيرفر"
              className="flex gap-1 p-2 border-b border-black/[0.07] bg-[#faf9f6] overflow-x-auto"
            >
              {SERVER_TABS.map((t, i) => (
                <button
                  key={t.code}
                  id={tabId(i)}
                  role="tab"
                  type="button"
                  aria-selected={active === i}
                  aria-controls={`hero-panel-${t.code}`}
                  tabIndex={active === i ? 0 : -1}
                  onClick={() => setActive(i)}
                  onKeyDown={(e) => {
                    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
                    e.preventDefault();
                    setActive((prev) => (prev + (e.key === "ArrowLeft" ? 1 : SERVER_TABS.length - 1)) % SERVER_TABS.length);
                  }}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-black transition cursor-pointer ${
                    active === i ? "bg-[#0b0b0f] text-white" : "text-black/55 hover:text-black hover:bg-black/[0.06]"
                  }`}
                >
                  <ServerIcon code={t.code} size={16} />
                  {t.name}
                </button>
              ))}
            </div>

            <div
              key={tab.code}
              id={`hero-panel-${tab.code}`}
              role="tabpanel"
              aria-labelledby={tabId(active)}
              className="p-4 md:p-6"
            >
              <div className="flex items-center justify-between gap-3 mb-3">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black bg-[#d8ff3e] px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0b0b0f] animate-pulse-soft" />
                  {tab.tag}
                </span>
                <span className="text-[10.5px] font-bold text-black/40 truncate">سيرفر {tab.name}</span>
              </div>

              {/* الشاشة — تصميم بلا صور: توهّج + شعار المزود + شرائح مواصفات */}
              <div className="relative mt-1 rounded-xl overflow-hidden aspect-video bg-[#0b0b0f] text-white">
                <div className="absolute inset-0" style={{ backgroundImage: tab.glow }} />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 opacity-[0.07]"
                  style={{
                    backgroundImage:
                      "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
                    backgroundSize: "34px 34px",
                  }}
                />
                <div className="relative h-full p-4 md:p-6 flex flex-col justify-between">
                  <div className="flex items-start justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-black bg-white/10 border border-white/15 px-2.5 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#3effe0] animate-pulse-soft" />
                      جاهز للتفعيل
                    </span>
                    <span className="text-[10px] font-black bg-[#d8ff3e] text-[#0b0b0f] px-2 py-1 rounded-full">
                      سنة كاملة
                    </span>
                  </div>

                  <div className="flex items-center justify-center gap-3 md:gap-4">
                    {/* شعار المزود بلا صندوق أبيض، فوق خلفية البطاقة مباشرة.
                        X وحده نسخته الشفافة SERVER_MARK_SRC (ملفّه الأصلي معتم). */}
                    <span className="w-10 h-10 md:w-14 md:h-14 grid place-items-center shrink-0 drop-shadow-[0_4px_14px_rgba(0,0,0,0.55)]">
                      <img
                        src={SERVER_MARK_SRC[tab.code] ?? SERVER_WATERMARKS[tab.code].src}
                        alt=""
                        width={40}
                        height={40}
                        className="max-h-full max-w-full object-contain select-none"
                        draggable={false}
                      />
                    </span>
                    <div className="min-w-0 text-start">
                      <p className="font-display font-black text-lg md:text-2xl leading-tight">
                        سيرفر {tab.name}
                      </p>
                      <p className="text-[10px] md:text-[11.5px] text-white/60 font-medium">
                        تفعيل خلال دقائق — على كل أجهزتك
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {[tab.channelsCount, tab.quality].map((chip) => (
                      <span
                        key={chip}
                        className="text-[10px] font-bold bg-white/10 border border-white/15 rounded-full px-2 py-1"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* السعر + التحويل — متزامنان مع التبويب */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 sm:gap-3">
                <p className="text-[13px] font-black">
                  <span className="text-[19px]">{tab.price}$</span>
                  <span className="text-black/45 font-bold"> / سنة</span>
                </p>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={onOpenTrial}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 bg-[#0b0b0f] text-white text-[11.5px] font-black px-3.5 py-2 rounded-full cursor-pointer hover:bg-[#1c1c22] transition whitespace-nowrap"
                  >
                    <IconZap className="w-3.5 h-3.5 text-[#d8ff3e]" /> جرّب 6 ساعات مجاناً
                  </button>
                  <a
                    href={`/${tab.code}/`}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 text-[11.5px] font-black text-black/60 hover:text-black transition whitespace-nowrap"
                  >
                    صفحة {tab.name} <IconArrow className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* لوحة المواصفات (يسار في RTL) — تتزامن مع التبويب المختار */}
        <div className="border-e border-black/10 bg-white p-4 hidden md:block">
          <p className="text-[10px] font-black tracking-[0.18em] uppercase text-black/40 mb-3">
            مواصفات سيرفر {tab.name}
          </p>
          <ul className="space-y-2.5">
            {[
              { label: "القنوات", value: tab.channelsCount },
              { label: "مكتبة VOD", value: tab.vodCount },
              { label: "الجودة", value: tab.quality },
              { label: "مانع التقطيع", value: tab.antiFreeze },
              { label: "الدعم", value: "24/7" },
            ].map((s) => (
              <li key={s.label}>
                <p className="text-[10.5px] font-bold text-black/40">{s.label}</p>
                <p className="text-[11.5px] font-black leading-snug">{s.value}</p>
              </li>
            ))}
          </ul>

          <a
            href={`/${tab.code}/`}
            className="mt-4 flex items-center justify-center gap-1.5 bg-[#0b0b0f] text-white text-[12px] font-black py-2.5 rounded-full hover:bg-[#1c1c22] transition"
          >
            اشترك في {tab.name} — {tab.price}$ <IconArrow className="w-3.5 h-3.5" />
          </a>
          <a
            href="#pricing"
            className="mt-2 flex items-center justify-center gap-1 text-[11.5px] font-black text-black/55 hover:text-black transition"
          >
            مقارنة كل الباقات
          </a>

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
  const [frontDevice, setFrontDevice] = useState<"phone" | "tv">("phone");

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
        {/* الشارة العلوية مخفية بناءً على طلب المالك. */}

        {/* صف التذاكر في بداية الهيرو:
            على الكمبيوتر: المباريات يميناً بعرض 190px، والرئيسية تشغل
            بقية الصف بما فيه مساحة الأخبار المخفية مؤقتاً.
            يبقى ترتيب الجوال وأبعاد تذكرة المباريات كما هما. */}
        <Reveal variant="up" delay={140} className="w-full">
          <div className="hero-ticket-row grid w-full grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-[190px_minmax(0,1fr)] lg:gap-0">
            <HeroMatchesTicket className="order-1 md:order-2 md:col-span-2 lg:order-1 lg:col-span-1 lg:pe-2.5" />
            <div className="home-matches-ticket order-2 min-w-0 md:order-1 md:col-span-2 lg:order-2 lg:col-span-1">
              {/* الصفحة الرئيسية فقط: شريحة الكلاسيكو تُضاف سابعةً في آخر التذكرة كما هي */}
              <AllLeaguesTicket
                clashes={[...INDEX_CLASHES, INDEX_CLASHES[2], INDEX_CLASHES[2]]}
                slideOverrides={{
                  0: <FeaturedNewsTicketSlide href="news/psg-barcelona-4-2/" />,
                  1: <FeaturedNewsTicketSlide href="news/bayern-arsenal-2-2/" />,
                  2: <FeaturedNewsTicketSlide href="news/man-city-aston-villa/" />,
                  5: <FeaturedNewsTicketSlide href="news/tottenham-chelsea-2-0/" />,
                }}
              />
            </div>
            {/* تذكرة الأخبار الجانبية مخفية مؤقتاً؛ المكوّن محفوظ في HeroSideTickets.
                الرئيسية تشغل مساحتها على سطح المكتب حتى إعادتها. */}
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
                <span key={heroWord} className="hero-title-holo inline-block animate-word-in">
                  <span className="hero-title-holo__stack">
                    <span aria-hidden="true" className="hero-title-holo__layer hero-title-holo__layer--back">{HERO_TITLE_WORDS[heroWord]}</span>
                    <span aria-hidden="true" className="hero-title-holo__layer hero-title-holo__layer--mid">{HERO_TITLE_WORDS[heroWord]}</span>
                    <span className="hero-title-holo__layer hero-title-holo__layer--front">{HERO_TITLE_WORDS[heroWord]}</span>
                  </span>
                </span>
                {" كل ما تحب "}
              </>,
              <>
                بجودة{" "}
                <span className="hero-title-holo hero-title-holo--quality inline-block" dir="ltr">
                  <span className="hero-title-holo__stack">
                    <span aria-hidden="true" className="hero-title-holo__layer hero-title-holo__layer--back">4K</span>
                    <span aria-hidden="true" className="hero-title-holo__layer hero-title-holo__layer--mid">4K</span>
                    <span className="hero-title-holo__layer hero-title-holo__layer--front">4K</span>
                  </span>
                </span>{" "}
                <span className="font-serif italic font-normal">وبلا تقطيع</span>
              </>,
            ]}
          />
        </h1>

        <Reveal variant="up" delay={320} className="mt-6">
          <div className="hero-phone-stage" data-front-device={frontDevice}>
            <HeroTelevision onActivate={() => setFrontDevice("tv")} />
            <HeroPhone onActivate={() => setFrontDevice("phone")} />
            <span className="sr-only" role="status">{frontDevice === "tv" ? "التلفاز في المقدمة" : "الجوال في المقدمة"}</span>
          </div>
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
                <p className="text-[13px] font-black">{MEDIA_BADGE}</p>
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
