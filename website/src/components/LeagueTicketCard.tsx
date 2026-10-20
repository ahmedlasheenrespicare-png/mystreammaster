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
     التوضيحيان في المتن — كل المحتوى السابق محفوظ دون حذف.
   • دوري أبطال أوروبا: المنصّة منزلقتان — التذكرة الأصلية أولاً،
     ثم «بطاقة مواجهة الليلة» بنفس التصميم: باريس × برشلونة بأيقونتي
     الفريقين وخط الكرت المعتاد من لوحة المباريات، ومعهما لامين يامال
     وديمبلي بقاعدة اللاعبين نفسها. النتيجة من /scoreboard.php
     (ESPN عبر الوسيط، تحديث كل دقيقة) — لا نتائج مُحاكاة محلياً:
     إن بدأت مسجَّلة تُظهر نتيجتها الفعلية مقابل التفصيل، وإن لم تبدأ
     تُعرض ساعة عكسية تتحدّث كل ثانية لموعدها الحقيقي، وإن لم تكن على
     جدول اليوم أصلاً تُعرض صيغة الانتظار الصريحة بلا أرقام مخترعة.
     التبديل بين المنزلقتين تلقائي كل 5 ثوانٍ، يتوقف مع الخفاء/التحويم/
     التركيز/تقليل الحركة، وتبقى النقاط يدوية متاحة دائماً.
========================================================================== */

const REFRESH_MS = 60_000;
const ROTATE_MS = 5_000;
const MANUAL_PAUSE_MS = 15_000;
const CLASH_ZONE = "Africa/Cairo";
const UCL_ENTRY = { id: "uefa.champions", name: "دوري أبطال أوروبا" };

/* سداسية مطابقة اسمية لمواجهة باريس × برشلونة داخل جدول البطولة —
   الأسماء تصل كما يرسلها المصدر؛ تكفي الرموز العربية والإنجليزية معاً. */
const PARIS_TOKENS = ["paris", "psg", "باريس"];
const BARÇA_TOKENS = ["barcelona", "برشلونة", "بارسلونة"];

function isClash(match: Match | null | undefined): match is Match {
  if (!match) return false;
  const text = `${match.home.name} ${match.away.name}`.toLowerCase();
  const hasParis = PARIS_TOKENS.some(t => text.includes(t));
  const hasBarça = BARÇA_TOKENS.some(t => text.includes(t));
  return hasParis && hasBarça;
}

/* ── جلب مواجهة اليوم من لوحة البطولة عبر وسيط الموقع نفسه، وتحديث دقيق ── */
function useClash() {
  const [match, setMatch] = useState<Match | null>(null);
  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    const load = async () => {
      try {
        const day = dayInZone(new Date(), CLASH_ZONE);
        const response = await fetch(scoreboardUrl(UCL_ENTRY.id, day), {
          signal: controller.signal,
          cache: "no-store",
        });
        const result = await readScoreboardResponse(response, UCL_ENTRY);
        if (!alive) return;
        const clash = (result.matches as Match[]).find(isClash);
        setMatch(clash ?? null);
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
  }, []);
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

/* الإطار الزخرفي المشترك بين منزلقتَي الأبطال: خلفية نقطة قالب وخطوط */
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

/* منزلقة «مواجهة الليلة» — النصوص بنوعية كرت لوحة المباريات نفسها */
function ClashSlide({ match }: { match: Match | null }) {
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
      {/* الثنائي بقاعدة اللاعبين نفسها — يامال يساراً وديمبلي يميناً،
          أقصى الأطراف كما بالإسباني، خلف نص البطاقة وبتلاشيا سفلياً */}
      <img className="league-ticket-player league-ticket-player--left" src="/images/players/esp-yamal.png" alt="" aria-hidden="true" loading="eager" decoding="async" />
      <img className="league-ticket-player league-ticket-player--right" src="/images/players/fra-dembele.png" alt="" aria-hidden="true" loading="eager" decoding="async" />
      <div className="league-ticket-header">
        <LeagueIconBadge leagueId="uefa.champions" size={60} eager />
      </div>
      <div className="league-ticket-body league-ticket-body--clash">
        <span className="league-ticket-eyebrow">مواجهة الليلة</span>
        <div className="league-ticket-clash">
          <div className="league-ticket-clash-team">
            <TeamCrest src="/images/teams/paris-saint-germain-badge.webp" monogram="باريس" />
            <strong dir="auto">باريس سان جيرمان</strong>
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
            <TeamCrest src="/images/teams/barcelona-badge.webp" monogram="برم" />
            <strong dir="auto">برشلونة</strong>
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
function clashSummary(match: Match | null): string {
  if (!match) return "بطاقة مواجهة باريس سان جيرمان وبرشلونة: يُعرض الموعد والنتيجة بمجرد تثبّت الجدولة رسمياً.";
  if (match.state === "scheduled") return `مواجهة باريس سان جيرمان وبرشلونة لم تبدأ بعد، موعد البداية ${kickoff(match.date, CLASH_ZONE)} بتوقيت القاهرة.`;
  if (match.state === "finished") return `انتهت مواجهة باريس سان جيرمان وبرشلونة بالنتيجة ${match.home.score} إلى ${match.away.score}.`;
  if (match.state === "live") return `مواجهة باريس سان جيرمان وبرشلونة مباشرة الآن — ${match.detail}${hasCompleteScore(match.home.score, match.away.score) ? `، النتيجة ${match.home.score} إلى ${match.away.score}` : ""}.`;
  return `مواجهة باريس سان جيرمان وبرشلونة — ${match.detail}.`;
}

/* منصة الأبطال المنزلقة — تبديل تلقائي 5 ثوانٍ مع وقفة إنسانية كاملة */
function ChampionsTicketCarousel({ name }: { name: string }) {
  const match = useClash();
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(false);
  const pauseUntil = useRef(0);

  /* التبديل التلقائي — يُفعَّل فقط بعيداً عن تقليل الحركة، ويتراجع
     أيّ إيقاف مؤقت إذا مرّت 15 ثانية على آخر لمس من المستخدم */
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches) return;
    const onChange = () => setAuto(false);
    reduced.addEventListener("change", onChange);
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      if (Date.now() < pauseUntil.current) return;
      if (!auto) return;
      setActive(prev => (prev + 1) % 2);
    }, ROTATE_MS);
    return () => {
      reduced.removeEventListener("change", onChange);
      window.clearInterval(timer);
    };
  }, [auto]);

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
    { key: "base", label: "تذكرة دوري أبطال أوروبا" },
    { key: "clash", label: "بطاقة مواجهة الليلة — باريس × برشلونة" },
  ];

  return (
    <div
      className="league-ticket-carousel"
      onMouseEnter={() => { pauseUntil.current = Date.now() + MANUAL_PAUSE_MS; }}
      onFocusCapture={() => { pauseUntil.current = Date.now() + MANUAL_PAUSE_MS; }}
    >
      <p className="visually-hidden">{clashSummary(match)}</p>
      <div className="league-ticket-track" aria-hidden="true">
        <div className={`league-ticket-slide${active === 0 ? " is-active" : ""}`}>
          <div className="league-ticket league-ticket--in-track">
            <TicketShell />
            <img className="league-ticket-player league-ticket-player--back" src="/images/players/ucl-messi.png" alt="" aria-hidden="true" loading="eager" decoding="async" />
            <img className="league-ticket-player" src="/images/players/ucl-star.png" alt="" aria-hidden="true" loading="eager" decoding="async" />
            <div className="league-ticket-header">
              <LeagueIconBadge leagueId="uefa.champions" size={60} eager />
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
            <ClashSlide match={match} />
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
  "fra.1": <img className="league-ticket-player league-ticket-player--left" src="/images/players/fra-dembele.png" alt="" aria-hidden="true" loading="eager" decoding="async" />,
  "ger.1": <img className="league-ticket-player league-ticket-player--left" src="/images/players/ger-kane.png" alt="" aria-hidden="true" loading="eager" decoding="async" />,
  "ita.1": <img className="league-ticket-player league-ticket-player--left" src="/images/players/ita-lautaro.png" alt="" aria-hidden="true" loading="eager" decoding="async" />,
  "egy.1": <img className="league-ticket-player league-ticket-player--left" src="/images/players/egy-ashour.png" alt="" aria-hidden="true" loading="eager" decoding="async" />,
};

export default function LeagueTicketCard({ leagueId, name }: { leagueId: string; name: string }) {
  if (leagueId === "uefa.champions") {
    return <ChampionsTicketCarousel name={name} />;
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
