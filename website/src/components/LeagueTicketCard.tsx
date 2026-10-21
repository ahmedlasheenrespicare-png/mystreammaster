import { useEffect, useRef, useState, type ReactElement } from "react";
import LeagueIconBadge from "./LeagueIconBadge";
import {
  dayInZone,
  hasCompleteScore,
  kickoff,
  readScoreboardResponse,
  shiftDay,
  dayLabel,
  type Match,
} from "../lib/matches.mjs";
import "./league-ticket.css";

/* ==========================================================================
   كرت «تذكرة المباراة» — رأس صفحات هبوط البطولات
   --------------------------------------------------------------------------
   • التصميم مقتبس من https://uiverse.io/Spacious74/moody-owl-18
     (المؤلف Spacious74 — رخصة MIT من Uiverse.io) بكل تفاصيله: إطار مضيء
     بتدرّج شعاعي من الزاوية العلوية (خارج بحشو 1px)، لوح داكن بتوهّج
     علوي، نقطة ضوء متوهّجة على الحافة، شعاع ضوئي مموّه مائل 40deg،
     خطوط زخرفية متقاطعة عند 10%، ونص معدني بتدرّج مقصوص.
   • التكييف للبطولة: أيقونة البطولة (LeagueIconBadge — المصدر الواحد
     للشعار وبديله) في الرأس، واسم البطولة (النص المعدني) والسطران
     التوضيحيان في المتن.
   • المنصّات المنزلقة — تذكرتان بتصميم واحد بتبديل تلقائي 5 ثوانٍ:
     الشريحة الأساسية للبطولة، وشريحة «قمة الجولة» بأيقونتي فريقَي
     القمة واللاعبين بقاعدة التذكرة نفسها، بأرقامٍ لا تُحاكى محلياً
     أبداً: نتيجة ESPN الفعلية ودقيقة المباراة أثناء اللعب، والنهائية
     بعدها، وعداد ثانيةٍ ثانية لموعدها الحقيقي قبلها، وصيغة الانتظار
     الصريحة إن لم تكن مُدرجة على جدول اليوم. الإيقاف بتحويم المؤشر
     الحقيقي فطحف (ليف يخسر الجوال المكلمة أولمبيا من تأثير)، وبالتركيز،
     والنقاط، وخفاء الصفحة، وتقليل الحركة.
========================================================================== */

const REFRESH_MS = 60_000;
const ROTATE_MS = 5_000;
const MANUAL_PAUSE_MS = 15_000;
const CLASH_ZONE = "Africa/Cairo";

interface ClashTeamSide {
  name: string;
  crest: string;
  mono: string;
  tokens: string[];
}

interface FeaturedClash {
  eyebrow: string;
  home: ClashTeamSide;
  away: ClashTeamSide;
  homePlayer: string;
  awayPlayer: string;
}

/* ── المواجهات المميّزة — شرائح القمم لكل بطولة بترتيب عرضها بعد
     الشريحة الأساسية: مقاتلو الأبطال «قمة الجولة» (باريس × برشلونة)
     و«مباراة الليلة» (بايرن × أرسنال)، والكلاسيكو للإسباني، وقمتان
     للإنجليزي (تشيلسي × توتنهام ثم أرسنال × إيفرتون). شعارات
     بايرن/أرسنال/تشيلسي/توتنهام/إيفرتون من مصدر أيقونات الموقع نفسه
     (ESPN CDN كما في بطاقات المباريات) مع بديل الحرفين المحلي
     إن تعذّر التحميل */
const FEATURED_CLASHES: Record<string, FeaturedClash[]> = {
  "uefa.champions": [
    {
      eyebrow: "قمة الجولة",
      home: {
        name: "باريس سان جيرمان",
        crest: "/images/teams/paris-saint-germain-badge.webp",
        mono: "باريس",
        tokens: ["paris", "psg", "باريس"],
      },
      away: {
        name: "برشلونة",
        crest: "/images/teams/barcelona-badge.webp",
        mono: "برم",
        tokens: ["barcelona", "برشلونة", "بارسلونة"],
      },
      homePlayer: "/images/players/fra-dembele.png",
      awayPlayer: "/images/players/esp-yamal.png",
    },
    {
      eyebrow: "مباراة الليلة",
      home: {
        name: "بايرن ميونخ",
        crest: "https://a.espncdn.com/i/teamlogos/soccer/500/132.png",
        mono: "باي",
        tokens: ["bayern", "bayern munich", "bayern münchen", "munchen", "münchen", "بايرن", "ميونخ", "ميونيخ"],
      },
      away: {
        name: "أرسنال",
        crest: "https://a.espncdn.com/i/teamlogos/soccer/500/359.png",
        mono: "أرس",
        tokens: ["arsenal", "ارسنال", "أرسنال", "الأرسنال"],
      },
      homePlayer: "/images/players/ger-kane.png",
      awayPlayer: "/images/players/eng-saka.png",
    },
  ],
  "esp.1": [
    {
      eyebrow: "مواجهة الكلاسيكو",
      home: {
        name: "ريال مدريد",
        crest: "/images/teams/real-madrid-badge.webp",
        mono: "ريم",
        tokens: ["real madrid", "realmadrid", "r madrid", "ريال مدريد", "مادريد"],
      },
      away: {
        name: "برشلونة",
        crest: "/images/teams/barcelona-badge.webp",
        mono: "برم",
        tokens: ["barcelona", "برشلونة", "بارسلونة"],
      },
      homePlayer: "/images/players/esp-mbappe.png",
      awayPlayer: "/images/players/esp-yamal.png",
    },
  ],
  "eng.1": [
    {
      /* الشريحة الثانية لتذكرة الدوري الإنجليزي — بياناتها حيّة من النافذة
         نفسها (أسبوع للوراء + أسبوع للأمام): نهائية الأمس تبقى ظاهرة
         وموعد القادمة يَظهر له عدّاد ثم تتحول الحالة وحدها */
      eyebrow: "قمة الجولة",
      home: {
        name: "تشيلسي",
        crest: "https://a.espncdn.com/i/teamlogos/soccer/500/363.png",
        mono: "تشي",
        tokens: ["chelsea", "تشيلسي", "تشلسي"],
      },
      away: {
        name: "توتنهام هوتسبير",
        crest: "https://a.espncdn.com/i/teamlogos/soccer/500/367.png",
        mono: "توت",
        tokens: ["tottenham", "spurs", "توتنهام", "توتينهام"],
      },
      homePlayer: "/images/players/chelsea-palmer.png",
      awayPlayer: "/images/players/eng-marmoush.png",
    },
    {
      /* الشريحة الثالثة لتذكرة الدوري الإنجليزي — قمة الجولة الثانية:
         أرسنال × إيفرتون بصورتَي رايس وغريليش من مكتبة اللاعبين
         بقمصان 25-26؛ الشعاران من مصدر أيقونات بطاقات المباريات نفسه */
      eyebrow: "قمة الجولة",
      home: {
        name: "أرسنال",
        crest: "https://a.espncdn.com/i/teamlogos/soccer/500/359.png",
        mono: "أرس",
        tokens: ["arsenal", "ارسنال", "أرسنال", "الأرسنال"],
      },
      away: {
        name: "إيفرتون",
        crest: "https://a.espncdn.com/i/teamlogos/soccer/500/368.png",
        mono: "إيف",
        tokens: ["everton", "إيفرتون", "الإيفرتون"],
      },
      homePlayer: "/images/players/eng-rice.png",
      awayPlayer: "/images/players/eng-grealish.png",
    },
  ],
};

function isClash(match: Match | null | undefined, clash: FeaturedClash): match is Match {
  if (!match) return false;
  const text = `${match.home.name} ${match.away.name}`.toLowerCase();
  const hasHome = clash.home.tokens.some(t => text.includes(t));
  const hasAway = clash.away.tokens.some(t => text.includes(t));
  return hasHome && hasAway;
}

/* ── جلب المواجهة من لوحة البطولة عبر وسيط الموقع نفسه — نفس مسار
     صفحة «مواعيد المباريات» حرفاً (/scoreboard.php ← ESPN) وبنفس نطاقها
     الزمني: أسبوعٌ إلى الوراء وأسبوعٌ إلى الأمام (MAX_SPAN_DAYS=7 لكل
     طلب، فيُجمَع طلبان) — فتبقى نتيجة الأمس المنتهية ظاهرة، ويُثبَّت
     موعد القادمة ويُعَدُّ لها ثانيةً ثانية، ثم تتحوّل الحالة وحدها:
     عدّاد قبل البداية ← نتيجة ودقيقة مباشرة ← نهائية، بتحديث كل دقيقة ── */
const WINDOW_DAYS = 7;

function selectClash(list: Match[], clash: FeaturedClash): Match | null {
  const clashes = list
    .filter(m => isClash(m, clash))
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  /* مباشرة أولاً، فآخر منتهية داخل النطاق (نتيجة الأمس تبقى ظاهرة)،
     فأقرب قادمة مثبّتة */
  const live = clashes.find(m => m.state === "live");
  if (live) return live;
  const finished = [...clashes].reverse().find(m => m.state === "finished");
  if (finished) return finished;
  return clashes.find(m => m.state === "scheduled" || m.state === "other") ?? null;
}

/* جلب واحد بنطاق المواعيد نفسه يغذّي كل شرائح القمم — لكل مواجهة
   اختيارها الخاص من القائمة ذاتها */
function useClashes(leagueId: string, clashes: FeaturedClash[]) {
  const [matches, setMatches] = useState<(Match | null)[]>(() => clashes.map(() => null));
  const clashesKey = clashes.map(c => `${c.eyebrow}:${c.home.name}:${c.away.name}`).join("|");
  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    const load = async () => {
      try {
        const day = dayInZone(new Date(), CLASH_ZONE);
        const compact = (iso: string) => iso.replace(/-/g, "");
        /* نطاق صفحة المواعيد نفسه: [اليوم−7 … اليوم] و[اليوم … +7] —
           MAX_SPAN_DAYS=7 لكل طلب عبر الوسيط */
        const urls = [
          `/scoreboard.php?league=${encodeURIComponent(leagueId)}&dates=${compact(shiftDay(day, -WINDOW_DAYS))}-${compact(day)}`,
          `/scoreboard.php?league=${encodeURIComponent(leagueId)}&dates=${compact(day)}-${compact(shiftDay(day, WINDOW_DAYS))}`,
        ];
        const responses = await Promise.all(urls.map(url => fetch(url, { signal: controller.signal, cache: "no-store" })));
        const list: Match[] = [];
        for (const response of responses) {
          const result = await readScoreboardResponse(response, { id: leagueId, name: leagueId });
          list.push(...(result.matches as Match[]));
        }
        /* اليوم مشترك بين النافذتين — إزالة التكرار حسب تعريف المباراة */
        const seen = new Set<string>();
        const unique = list.filter(m => (seen.has(m.id) ? false : (seen.add(m.id), true)));
        if (!alive) return;
        setMatches(clashes.map(clash => selectClash(unique, clash)));
      } catch {
        /* الصمت مقصود: بطاقة الانتظار هي حالة الفشل المصمّمة */
      }
    };
    load();
    const timer = window.setInterval(load, REFRESH_MS);
    return () => {
      alive = false;
      controller.abort();
      window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueId, clashesKey]);
  return matches;
}

/* ── نبضة ثانية واحدة لعداد البداية فقط (لا تكلفة عند عدم الحاجة) ── */
function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [active]);
  return now;
}

function splitCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const two = (n: number) => String(n).padStart(2, "0");
  return { days, hours: two(hours), minutes: two(minutes), seconds: two(seconds) };
}

/* ── أيقونة فريق ثابتة من مكتبة الموقع مع بديل حرفين عند تعذّرها ── */
function TeamCrest({ src, monogram }: { src: string; monogram: string }) {
  const [failed, setFailed] = useState(false);
  if (!failed) {
    return (
      <img
        className="league-ticket-crest"
        src={src}
        alt=""
        width="42"
        height="42"
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
    );
  }
  return <span className="league-ticket-crest league-ticket-crest--mono" aria-hidden="true">{monogram}</span>;
}

/* الإطار الزخرفي المشترك بين منزلقتَي البطولة: خلفية نقطة قالب وخطوط */
function TicketShell() {
  return (
    <>
      <div className="league-ticket-bg league-ticket-holographic">
        <span className="league-ticket-ray" />
        <span className="league-ticket-line league-ticket-line--top" />
        <span className="league-ticket-line league-ticket-line--bottom" />
        <span className="league-ticket-line league-ticket-line--left" />
        <span className="league-ticket-line league-ticket-line--right" />
      </div>
      <span className="league-ticket-symbol" />
    </>
  );
}

/* منزلقة «قمة الجولة/الكلاسيكو/مباراة الليلة» — النصوص بنوعية كرت لوحة المباريات نفسها */
function ClashSlide({ match, clash, leagueId }: { match: Match | null; clash: FeaturedClash; leagueId: string }) {
  const pre = match ? match.state === "scheduled" : false;
  const live = match ? match.state === "live" : false;
  const finished = match ? match.state === "finished" : false;
  const now = useNow(pre);
  const kick = match ? kickoff(match.date, CLASH_ZONE) : null;
  /* موعد المواجهة كما يظهر في صفحة المواعيد: وقت القاهرة دائماً، ويُسبَق
     بتاريخ اليوم العربي حين تكون المثبَّتة في يومٍ قادم لا اليوم نفسه */
  const matchDay = match ? dayInZone(new Date(match.date), CLASH_ZONE) : null;
  const isToday = matchDay != null && matchDay === dayInZone(new Date(), CLASH_ZONE);
  const kickLabel = kick && !isToday ? `${dayLabel(matchDay!, { weekday: "long" })} · ${kick}` : kick;
  const countdown = match && pre ? splitCountdown(new Date(match.date).getTime() - now) : null;
  const withScore = match && match.home.score != null && match.away.score != null
    ? hasCompleteScore(match.home.score, match.away.score)
    : false;

  /* اتجاه عرض الفريقين/النتيجة يطابق كرت صفحة المواعيد حرفاً: المضيف
     الفعلي عند ESPN يميناً (RTL أولاً) والضيف يساراً، لا الترتيب الثابت
     للإعداد — فيلتصق رقم كل فريق بجانبه الصحيح مهما دار الضيافة */
  const homeIsConfigHome = !match || clash.home.tokens.some(t => match.home.name.toLowerCase().includes(t));
  const rightSide = homeIsConfigHome ? clash.home : clash.away;
  const leftSide = homeIsConfigHome ? clash.away : clash.home;
  const rightPlayer = homeIsConfigHome ? clash.homePlayer : clash.awayPlayer;
  const leftPlayer = homeIsConfigHome ? clash.awayPlayer : clash.homePlayer;

  return (
    <>
      <TicketShell />
      {/* اللاعبان بقاعدة التذكرة نفسها — كل لاعب يلتصق بجانب فريقه حين
          ينعكس ترتيب الضيافة عن الترتيب الافتراضي للإعداد */}
      <img className="league-ticket-player league-ticket-player--left" src={leftPlayer} alt="" aria-hidden="true" loading="eager" decoding="async" />
      <img className="league-ticket-player league-ticket-player--right" src={rightPlayer} alt="" aria-hidden="true" loading="eager" decoding="async" />
      <div className="league-ticket-header">
        <LeagueIconBadge leagueId={leagueId} size={60} eager />
      </div>
      <div className="league-ticket-body league-ticket-body--clash">
        <span className="league-ticket-eyebrow">{clash.eyebrow}</span>
        <div className="league-ticket-clash">
          <div className="league-ticket-clash-team">
            <TeamCrest src={rightSide.crest} monogram={rightSide.mono} />
            <strong dir="auto">{rightSide.name}</strong>
          </div>
          <div className="league-ticket-clash-score">
            {match && (live || finished) && withScore ? (
              <strong className="league-ticket-goals">
                {match.home.score} <span>:</span> {match.away.score}
              </strong>
            ) : match && pre ? (
              <strong className="league-ticket-kickoff">{kickLabel}</strong>
            ) : match ? (
              <strong className="league-ticket-kickoff">{isToday ? "اليوم" : dayLabel(matchDay!, { weekday: "long" })}</strong>
            ) : (
              <strong className="league-ticket-kickoff">قريباً</strong>
            )}
            <small className={`league-ticket-state${live ? " is-live" : ""}`}>
              {match
                ? finished && !isToday
                  ? `${match.detail} · ${dayLabel(matchDay!, { weekday: "long" })}`
                  : match.detail
                : "نتائج الأسبوع المنقضي ومواعيد الأسبوع القادم تظهر هنا من لوحة المواعيد فوراً"}
            </small>
          </div>
          <div className="league-ticket-clash-team">
            <TeamCrest src={leftSide.crest} monogram={leftSide.mono} />
            <strong dir="auto">{leftSide.name}</strong>
          </div>
        </div>
        {countdown ? (
          <div className="league-ticket-countdown" role="presentation">
            <span className="league-ticket-tick"><strong>{countdown.hours}</strong>ساعة</span>
            <span className="league-ticket-tick"><strong>{countdown.minutes}</strong>دقيقة</span>
            <span className="league-ticket-tick"><strong>{countdown.seconds}</strong>ثانية</span>
            {countdown.days > 0 ? <span className="league-ticket-tick league-ticket-tick--days"><strong>{countdown.days}</strong>يوم</span> : null}
          </div>
        ) : null}
      </div>
    </>
  );
}

/* نص مقروء لقارئ الشاشة يلخّص حالة المواجهة — التذكرة نفسها زخرفية */
function clashSummary(match: Match | null, clash: FeaturedClash): string {
  const pairing = `${clash.home.name} و${clash.away.name}`;
  if (!match) return `بطاقة ${clash.eyebrow} بين ${pairing}: تُعرض نتائج الأسبوع المنقضي ومواعيد الأسبوع القادم من لوحة المواعيد نفسها بمجرد توفّرها.`;
  if (match.state === "scheduled") {
    const day = dayInZone(new Date(match.date), CLASH_ZONE);
    const today = dayInZone(new Date(), CLASH_ZONE);
    const when = day === today ? `اليوم ${kickoff(match.date, CLASH_ZONE)}` : `${dayLabel(day, { weekday: "long" })} ${kickoff(match.date, CLASH_ZONE)}`;
    return `${clash.eyebrow} بين ${pairing} لم تبدأ بعد — موعد البداية ${when} بتوقيت القاهرة.`;
  }
  if (match.state === "finished") {
    const day = dayInZone(new Date(match.date), CLASH_ZONE);
    const today = dayInZone(new Date(), CLASH_ZONE);
    const when = day === today ? "اليوم" : `يوم ${dayLabel(day, { weekday: "long" })}`;
    return `انتهت ${clash.eyebrow} بين ${pairing} ${when} بالنتيجة ${match.home.score} إلى ${match.away.score}.`;
  }
  if (match.state === "live") return `${clash.eyebrow} بين ${pairing} مباشرة الآن — ${match.detail}${hasCompleteScore(match.home.score, match.away.score) ? `، النتيجة ${match.home.score} إلى ${match.away.score}` : ""}.`;
  return `${clash.eyebrow} بين ${pairing} — ${match.detail}.`;
}

/* منصة الشرائح — شريحة أساسية + شريحة لكل مواجهة مميّزة، تبديل تلقائي
   5 ثوانٍ مع وقفة إنسانية كاملة */
function LeagueTicketCarousel({ leagueId, name, clashes, basePlayers }: {
  leagueId: string;
  name: string;
  clashes: FeaturedClash[];
  basePlayers: ReactElement[];
}) {
  const matches = useClashes(leagueId, clashes);
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(false);
  const pauseUntil = useRef(0);
  const count = 1 + clashes.length;

  /* التبديل التلقائي كل 5 ثوانٍ — يعمل دائماً (جوالاً وسطح مكتب) ولا
     يُوقفه تفضيل تقليل الحركة: ذلك التفضيل يُسقط حركة الانزلاق وحدها
     عبر CSS (@media prefers-reduced-motion) فتصبح الشريحة فورية بلا
     انتقال، بينما تبقى المعلومة الحيّة تتناوب. إيقاف الدورة يدوياً
     متاح دوماً بالمؤشر والتركيز والنقاط، وأي إيقاف يتراجع بعد 15 ثانية */
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      if (Date.now() < pauseUntil.current) return;
      if (!auto) return;
      setActive(prev => (prev + 1) % count);
    }, ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [auto, count]);

  /* بدء الحركة بعد أول إطار كامل (تهيئة ضوء القالب والشريط) */
  useEffect(() => {
    const starter = window.setTimeout(() => setAuto(true), 1200);
    return () => window.clearTimeout(starter);
  }, []);

  const go = (index: number) => {
    pauseUntil.current = Date.now() + MANUAL_PAUSE_MS;
    setActive(index);
  };

  /* مفتاح الشريحة يجمع الحاجب بأسماء الفريقين — قد تتقاسم قمّتان
     الحاجب نفسه («قمة الجولة») في البطولة الواحدة */
  const clashKey = (clash: FeaturedClash) => `clash-${clash.eyebrow}-${clash.home.name}-${clash.away.name}`;
  const slides = [
    { key: "base", label: `تذكرة ${name}` },
    ...clashes.map(clash => ({
      key: clashKey(clash),
      label: `بطاقة ${clash.eyebrow} — ${clash.home.name} × ${clash.away.name}`,
    })),
  ];

  return (
    <div
      className="league-ticket-carousel"
      onPointerEnter={event => {
        /* الإيقاف بالتحويم للمؤشر فقط — لمسة الجوال لا توقف الدورة */
        if (event.pointerType === "mouse") pauseUntil.current = Date.now() + MANUAL_PAUSE_MS;
      }}
      onFocusCapture={() => { pauseUntil.current = Date.now() + MANUAL_PAUSE_MS; }}
    >
      {clashes.map((clash, i) => (
        <p key={clashKey(clash)} className="visually-hidden">{clashSummary(matches[i] ?? null, clash)}</p>
      ))}
      <div className="league-ticket-track" aria-hidden="true">
        <div className={`league-ticket-slide${active === 0 ? " is-active" : ""}`}>
          <div className="league-ticket league-ticket--in-track">
            <TicketShell />
            {basePlayers}
            <div className="league-ticket-header">
              <LeagueIconBadge leagueId={leagueId} size={60} eager />
            </div>
            <div className="league-ticket-body">
              <em>{name}</em>
              مواعيد · نتائج · ترتيب
              <br />
              يُحدَّث كل دقيقة
            </div>
          </div>
        </div>
        {clashes.map((clash, i) => (
          <div key={clashKey(clash)} className={`league-ticket-slide${active === i + 1 ? " is-active" : ""}`}>
            <div className="league-ticket league-ticket--match league-ticket--in-track">
              <ClashSlide match={matches[i] ?? null} clash={clash} leagueId={leagueId} />
            </div>
          </div>
        ))}
      </div>
      <div className="league-ticket-dots">
        {slides.map((slide, i) => (
          <button
            key={slide.key}
            type="button"
            className={`league-ticket-dot${active === i ? " is-active" : ""}`}
            aria-label={slide.label}
            aria-pressed={active === i}
            onClick={() => go(i)}
          />
        ))}
      </div>
    </div>
  );
}

/* اللاعبون لبقية البطولات — مواضعهم الفيزيائية كما وُثّقت أول مرة */
const PLAYER_MAP: Record<string, ReactElement | ReactElement[]> = {
  "eng.1": [
    <img key="a" className="league-ticket-player" src="/images/players/epl-star.png" alt="" aria-hidden="true" loading="eager" decoding="async" />,
    <img key="b" className="league-ticket-player league-ticket-player--right" src="/images/players/eng-szoboszlai.png" alt="" aria-hidden="true" loading="eager" decoding="async" />,
  ],
  "esp.1": [
    <img key="a" className="league-ticket-player league-ticket-player--right" src="/images/players/esp-mbappe.png" alt="" aria-hidden="true" loading="eager" decoding="async" />,
    <img key="b" className="league-ticket-player league-ticket-player--left" src="/images/players/esp-yamal.png" alt="" aria-hidden="true" loading="eager" decoding="async" />,
  ],
  "fra.1": [
    <img key="a" className="league-ticket-player league-ticket-player--left" src="/images/players/fra-dembele.png" alt="" aria-hidden="true" loading="eager" decoding="async" />,
    <img key="b" className="league-ticket-player league-ticket-player--right" src="/images/players/fra-gouiri.png" alt="" aria-hidden="true" loading="eager" decoding="async" />,
  ],
  "ger.1": [
    <img key="a" className="league-ticket-player league-ticket-player--left" src="/images/players/ger-kane.png" alt="" aria-hidden="true" loading="eager" decoding="async" />,
    <img key="b" className="league-ticket-player league-ticket-player--right" src="/images/players/ger-olise.png" alt="" aria-hidden="true" loading="eager" decoding="async" />,
  ],
  "ita.1": [
    <img key="a" className="league-ticket-player league-ticket-player--left" src="/images/players/ita-lautaro.png" alt="" aria-hidden="true" loading="eager" decoding="async" />,
    <img key="b" className="league-ticket-player league-ticket-player--right" src="/images/players/ita-dybala.png" alt="" aria-hidden="true" loading="eager" decoding="async" />,
  ],
  "egy.1": [
    <img key="a" className="league-ticket-player league-ticket-player--left" src="/images/players/egy-ashour.png" alt="" aria-hidden="true" loading="eager" decoding="async" />,
    <img key="b" className="league-ticket-player league-ticket-player--right" src="/images/players/egy-elsaid.png" alt="" aria-hidden="true" loading="eager" decoding="async" />,
  ],
  "sau.1": [
    /* فيليكس يساراً + الدوسري يميناً — الثنائي الثامن الذي يُكمل خريطة
       نجوم البطولات الثماني كاملة، بنفس الصفة الزخرفية والمواضع
       الفيزيائية الصريحة */
    <img key="a" className="league-ticket-player league-ticket-player--left" src="/images/players/sau-felix.png" alt="" aria-hidden="true" loading="eager" decoding="async" />,
    <img key="b" className="league-ticket-player league-ticket-player--right" src="/images/players/sau-dawsari.png" alt="" aria-hidden="true" loading="eager" decoding="async" />,
  ],
};

/* أبطال أوروبا: ميسي في خلفية التكوين خلف رونالدو أعلى يسار التذكرة — يُرسَم
   قبل رونالدو فيتراكب الثاني فوقه (نفس ز-index والأحدث ضمن DOM يعلو) */
const UCL_BASE_PLAYERS = [
  <img key="back" className="league-ticket-player league-ticket-player--back" src="/images/players/ucl-messi.png" alt="" aria-hidden="true" loading="eager" decoding="async" />,
  <img key="star" className="league-ticket-player" src="/images/players/ucl-star.png" alt="" aria-hidden="true" loading="eager" decoding="async" />,
];

export default function LeagueTicketCard({ leagueId, name }: { leagueId: string; name: string }) {
  const clashes = FEATURED_CLASHES[leagueId];
  if (clashes && clashes.length > 0) {
    const basePlayers = leagueId === "uefa.champions"
      ? UCL_BASE_PLAYERS
      : (PLAYER_MAP[leagueId] ?? []);
    return (
      <LeagueTicketCarousel
        leagueId={leagueId}
        name={name}
        clashes={clashes}
        basePlayers={Array.isArray(basePlayers) ? basePlayers : [basePlayers]}
      />
    );
  }
  return (
    <div className="league-ticket" aria-hidden="true">
      <div className="league-ticket-bg league-ticket-holographic">
        <span className="league-ticket-ray" />
        <span className="league-ticket-line league-ticket-line--top" />
        <span className="league-ticket-line league-ticket-line--bottom" />
        <span className="league-ticket-line league-ticket-line--left" />
        <span className="league-ticket-line league-ticket-line--right" />
      </div>
      {/* نقطة الضوء — عنصر «مقصّ القصّ» سابقاً؛ صارت نقطة القالب المتوهّجة */}
      <span className="league-ticket-symbol" />
      {PLAYER_MAP[leagueId]}
      <div className="league-ticket-header">
        <LeagueIconBadge leagueId={leagueId} size={60} eager />
      </div>
      <div className="league-ticket-body">
        <em>{name}</em>
        مواعيد · نتائج · ترتيب
        <br />
        يُحدَّث كل دقيقة
      </div>
    </div>
  );
}
