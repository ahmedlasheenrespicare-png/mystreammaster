import { useEffect, useRef, useState, type ReactElement } from "react";
import LeagueIconBadge from "./LeagueIconBadge";
import {
  dayInZone,
  hasCompleteScore,
  kickoff,
  readScoreboardResponse,
  scoreboardUrl,
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
     الشريحة الأساسية للبطولة، وشريحة «مواجهة الليلة» بأيقونتي فريقَي
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

/* ── المواجهات المميّزة — فريقا القمة بأيقونتيهما ولاعبيهما لكل بطولة ──
   باريس × برشلونة للأبطال (الليلة المعتادة)، والكلاسيكو للإسباني:
   أصلٌ واللاعب يطابق الوجه: مبابي مقاول ريال، ويامال مقاول برشلونة */
const FEATURED_CLASHES: Record<string, FeaturedClash> = {
  "uefa.champions": {
    eyebrow: "مواجهة الليلة",
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
  "esp.1": {
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
};

function isClash(match: Match | null | undefined, clash: FeaturedClash): match is Match {
  if (!match) return false;
  const text = `${match.home.name} ${match.away.name}`.toLowerCase();
  const hasHome = clash.home.tokens.some(t => text.includes(t));
  const hasAway = clash.away.tokens.some(t => text.includes(t));
  return hasHome && hasAway;
}

/* ── جلب مواجهة اليوم من لوحة البطولة عبر وسيط الموقع نفسه، وتحديث دقيق ── */
function useClash(leagueId: string, clash: FeaturedClash) {
  const [match, setMatch] = useState<Match | null>(null);
  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    const load = async () => {
      try {
        const day = dayInZone(new Date(), CLASH_ZONE);
        const response = await fetch(scoreboardUrl(leagueId, day), {
          signal: controller.signal,
          cache: "no-store",
        });
        const result = await readScoreboardResponse(response, { id: leagueId, name: leagueId });
        if (!alive) return;
        setMatch((result.matches as Match[]).find(m => isClash(m, clash)) ?? null);
      } catch {
        /* الصمت مقصود: بطاقة «في انتظار الجدولة» هي حالة الفشل المصمّمة */
      }
    };
    load();
    const timer = window.setInterval(load, REFRESH_MS);
    return () => {
      alive = false;
      controller.abort();
      window.clearInterval(timer);
    };
  }, [leagueId, clash]);
  return match;
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

/* منزلقة «مواجهة الليلة/الكلاسيكو» — النصوص بنوعية كرت لوحة المباريات نفسها */
function ClashSlide({ match, clash }: { match: Match | null; clash: FeaturedClash }) {
  const pre = match ? match.state === "scheduled" : false;
  const live = match ? match.state === "live" : false;
  const finished = match ? match.state === "finished" : false;
  const now = useNow(pre);
  const kick = match ? kickoff(match.date, CLASH_ZONE) : null;
  const countdown = match && pre ? splitCountdown(new Date(match.date).getTime() - now) : null;
  const withScore = match && match.home.score != null && match.away.score != null
    ? hasCompleteScore(match.home.score, match.away.score)
    : false;

  return (
    <>
      <TicketShell />
      {/* اللاعبان بقاعدة التذكرة نفسها — لاعب الضيف يساراً ولاعب المضيف
          يميناً، أقصى الأطراف خلف نص البطاقة وبتلاشيا سفلياً */}
      <img className="league-ticket-player league-ticket-player--left" src={clash.awayPlayer} alt="" aria-hidden="true" loading="eager" decoding="async" />
      <img className="league-ticket-player league-ticket-player--right" src={clash.homePlayer} alt="" aria-hidden="true" loading="eager" decoding="async" />
      <div className="league-ticket-header">
        <LeagueIconBadge leagueId="uefa.champions" size={60} eager />
      </div>
      <div className="league-ticket-body league-ticket-body--clash">
        <span className="league-ticket-eyebrow">{clash.eyebrow}</span>
        <div className="league-ticket-clash">
          <div className="league-ticket-clash-team">
            <TeamCrest src={clash.home.crest} monogram={clash.home.mono} />
            <strong dir="auto">{clash.home.name}</strong>
          </div>
          <div className="league-ticket-clash-score">
            {match && (live || finished) && withScore ? (
              <strong className="league-ticket-goals">
                {match.home.score} <span>:</span> {match.away.score}
              </strong>
            ) : match && pre ? (
              <strong className="league-ticket-kickoff">{kick}</strong>
            ) : (
              <strong className="league-ticket-kickoff">اليوم</strong>
            )}
            <small className={`league-ticket-state${live ? " is-live" : ""}`}>
              {match ? match.detail : "جدولها رسمياً عبر ESPN فور تثبّتها"}
            </small>
          </div>
          <div className="league-ticket-clash-team">
            <TeamCrest src={clash.away.crest} monogram={clash.away.mono} />
            <strong dir="auto">{clash.away.name}</strong>
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
  if (!match) return `بطاقة ${clash.eyebrow} بين ${pairing}: يُعرض الموعد والنتيجة بمجرد تثبّت الجدولة رسمياً.`;
  if (match.state === "scheduled") return `${clash.eyebrow} بين ${pairing} لم تبدأ بعد — موعد البداية ${kickoff(match.date, CLASH_ZONE)} بتوقيت القاهرة.`;
  if (match.state === "finished") return `انتهت ${clash.eyebrow} بين ${pairing} بالنتيجة ${match.home.score} إلى ${match.away.score}.`;
  if (match.state === "live") return `${clash.eyebrow} بين ${pairing} مباشرة الآن — ${match.detail}${hasCompleteScore(match.home.score, match.away.score) ? `، النتيجة ${match.home.score} إلى ${match.away.score}` : ""}.`;
  return `${clash.eyebrow} بين ${pairing} — ${match.detail}.`;
}

/* منصة المنزلقتين — تبديل تلقائي 5 ثوانٍ مع وقفة إنسانية كاملة */
function LeagueTicketCarousel({ leagueId, name, clash, basePlayers }: {
  leagueId: string;
  name: string;
  clash: FeaturedClash;
  basePlayers: ReactElement[];
}) {
  const match = useClash(leagueId, clash);
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(false);
  const [reduced, setReduced] = useState(false);
  const pauseUntil = useRef(0);

  /* توافق تقليل الحركة عبر الواجهتين: addEventListener حديثاً،
     وaddListener على سفاري iOS القديم */
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else if (mq.addListener) mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);
      else if (mq.removeListener) mq.removeListener(onChange);
    };
  }, []);

  /* التبديل التلقائي كل 5 ثوانٍ — يُعطَّل بتفضيل تقليل الحركة،
     ويتراجع أيّ إيقاف مؤقت إذا مرّت 15 ثانية على آخر لمس مؤشري */
  useEffect(() => {
    if (reduced) return;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      if (Date.now() < pauseUntil.current) return;
      if (!auto) return;
      setActive(prev => (prev + 1) % 2);
    }, ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [auto, reduced]);

  /* بدء الحركة بعد أول إطار كامل (تهيئة ضوء القالب والشريط) */
  useEffect(() => {
    const starter = window.setTimeout(() => setAuto(true), 1200);
    return () => window.clearTimeout(starter);
  }, []);

  const go = (index: number) => {
    pauseUntil.current = Date.now() + MANUAL_PAUSE_MS;
    setActive(index);
  };

  const slides = [
    { key: "base", label: `تذكرة ${name}` },
    { key: "clash", label: `بطاقة ${clash.eyebrow} — ${clash.home.name} × ${clash.away.name}` },
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
      <p className="visually-hidden">{clashSummary(match, clash)}</p>
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
        <div className={`league-ticket-slide${active === 1 ? " is-active" : ""}`}>
          <div className="league-ticket league-ticket--match league-ticket--in-track">
            <ClashSlide match={match} clash={clash} />
          </div>
        </div>
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
};

/* أبطال أوروبا: ميسي في خلفية التكوين خلف رونالدو أعلى يسار التذكرة — يُرسَم
   قبل رونالدو فيتراكب الثاني فوقه (نفس ز-index والأحدث ضمن DOM يعلو) */
const UCL_BASE_PLAYERS = [
  <img key="back" className="league-ticket-player league-ticket-player--back" src="/images/players/ucl-messi.png" alt="" aria-hidden="true" loading="eager" decoding="async" />,
  <img key="star" className="league-ticket-player" src="/images/players/ucl-star.png" alt="" aria-hidden="true" loading="eager" decoding="async" />,
];

export default function LeagueTicketCard({ leagueId, name }: { leagueId: string; name: string }) {
  const clash = FEATURED_CLASHES[leagueId];
  if (clash) {
    const basePlayers = leagueId === "uefa.champions"
      ? UCL_BASE_PLAYERS
      : (PLAYER_MAP[leagueId] ?? []);
    return (
      <LeagueTicketCarousel
        leagueId={leagueId}
        name={name}
        clash={clash}
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
