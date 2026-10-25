import { useTicketSwipe } from "./useTicketSwipe";
import { matchCenterLink } from '../lib/match-center-link';
import { FeaturedNewsTicketSlide } from "./FeaturedNewsCards";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LEAGUES,
  dayInZone,
  dayLabel,
  kickoff,
  matchesForDay,
  readScoreboardResponse,
  scoreboardUrl,
  shiftDay,
  type Match,
  type MatchTeam,
} from "../lib/matches.mjs";
import { leagueIcon } from "../lib/league-icons.mjs";
import { to } from "../config";
import { FEATURED_NEWS } from "../content/featured-news";
import "./league-ticket.css";
import "./hero-side-tickets.css";

/* ==========================================================================
   تذكرتا جانبي الهيرو — يمين التذكرة الرئيسية: مباريات أمس واليوم وغد،
   يسارها: آخر الأخبار
   --------------------------------------------------------------------------
   • الشكل نفسه الذي تحمله تذكرة الهيرو الرئيسية (league-ticket.css): الإطار
     المضيء الشعاعي، اللوح الداكن، نقطة الضوء، الشعاع المموّه والخطوط
     المتقاطعة — بلا أي هوية بصرية جديدة.
   • المحتوى كلّه من مصادر الموقع نفسها ولا يُكتب يدوياً هنا:
       - المباريات: /scoreboard.php عبر lib/matches.mjs نفسه الذي تقرأ منه
         صفحة /matches/ وقسم «أخبار مميزة»، بتوقيت القاهرة. شعار كل نادٍ
         واسمه ونتيجته وموعده من المصدر (`MatchTeam.logo` كما في صفحة
         المواعيد) — لا فريق ولا رقم يُخترع، وعند تعذّر المصدر يُقال ذلك
         صريحاً بلا بديل وهمي.
       - الأخبار: content/featured-news.ts وحده (FEATURED_NEWS)، وكل بطاقة
         رابط إلى صفحة الخبر الداخلية نفسها.
   • مباريات أمس/اليوم/غد في ثلاثة تبويبات، وكل تبويب شرائح تُقلَّب بسهمين
     (تلقائياً كل 4.5 ثانية، ويتوقف التقليب عند التحويم أو التركيز أو
     الاختيار اليدوي 15 ثانية ثم يعود) — نفس سلوك منزلقة تذكرة البطولات.
   • الروابط والأزرار حقيقية: تعمل بالكيبورد ولها تسميات لقارئ الشاشة.
   ========================================================================== */

const HOME_ZONE = "Africa/Cairo";
/* أقصى عدد شرائح أخبار (كل الأخبار المعلنة الآن خبران، ويتّسع لما يُضاف) */
const MAX_NEWS_SLIDES = 8;
const ROTATE_MS = 4500;
const MANUAL_PAUSE_MS = 15_000;

type DayKey = "yesterday" | "today" | "tomorrow";

const DAY_TABS: ReadonlyArray<{ key: DayKey; label: string }> = [
  { key: "yesterday", label: "أمس" },
  { key: "today", label: "اليوم" },
  { key: "tomorrow", label: "غد" },
];

type DayState = { status: "loading" | "ready" | "error"; matches: Match[] };
type DayStates = Record<DayKey, DayState>;

const EMPTY_DAY: DayState = { status: "loading", matches: [] };

/* ترتيب العرض: المباشر أولاً، ثم لم تبدأ (بالتوقيت)، ثم المنتهية — المعلومة
   الأهمّ للمشاهد أولاً، ولا يتغيّر ترتيب الصفوف داخل المجموعة الواحدة */
function rank(match: Match): number {
  if (match.state === "live") return 0;
  if (match.state === "scheduled") return 1;
  return 2;
}

/* جلب يوم واحد بكل بطولات LEAGUES — نفس نمط قسم «أخبار مميزة»:
   scoreboard.php، Promise.allSettled، وإلغاء بعد 15 ثانية. كل يوم يُجلب
   مرّة واحدة فقط، والبقية تُجلب في الخلفية بعد أول رسم */
function useDayMatches(days: Record<DayKey, string>, active: DayKey): DayStates {
  const [states, setStates] = useState<DayStates>({ yesterday: EMPTY_DAY, today: EMPTY_DAY, tomorrow: EMPTY_DAY });
  const started = useRef(new Set<DayKey>());
  const controllers = useRef<AbortController[]>([]);
  /* رقم تشغيل لكل يوم: نتيجة تشغيل ملغى (إعادة تركيب StrictMode أو إلغاء
     عند التفكيك) لا تُكتب فوق نتيجة التشغيل الأحدث */
  const runs = useRef<Record<string, number>>({});
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      controllers.current.forEach(controller => controller.abort());
      controllers.current = [];
      /* إعادة التركيب (StrictMode في التطوير) يجب أن تعيد الجلب من جديد */
      started.current.clear();
    };
  }, []);

  const load = useCallback(
    (key: DayKey) => {
      if (started.current.has(key)) return;
      started.current.add(key);
      const controller = new AbortController();
      controllers.current.push(controller);
      const timeout = window.setTimeout(() => controller.abort(), 15_000);
      const day = days[key];
      const run = (runs.current[key] = (runs.current[key] ?? 0) + 1);

      setStates(prev => ({ ...prev, [key]: { status: "loading", matches: prev[key].matches } }));

      const jobs = LEAGUES.map(async entry => {
        const response = await fetch(scoreboardUrl(entry.id, day), { signal: controller.signal, cache: "no-store" });
        return readScoreboardResponse(response, entry);
      });

      Promise.allSettled(jobs).then(results => {
        window.clearTimeout(timeout);
        if (!alive.current || runs.current[key] !== run) return;
        const seen = new Set<string>();
        const matches: Match[] = [];
        let failed = 0;
        for (const result of results) {
          if (result.status !== "fulfilled") {
            failed += 1;
            continue;
          }
          for (const match of matchesForDay(result.value.matches as Match[], day, HOME_ZONE)) {
            if (seen.has(match.id)) continue;
            seen.add(match.id);
            matches.push(match);
          }
        }
        matches.sort((a, b) => rank(a) - rank(b) || Date.parse(a.date) - Date.parse(b.date) || a.id.localeCompare(b.id));
        setStates(prev => ({ ...prev, [key]: { status: failed === results.length ? "error" : "ready", matches } }));
      });
    },
    [days],
  );

  /* اليوم أولاً، ثم الأمس والغد في الخلفية */
  useEffect(() => {
    load("today");
    const timer = window.setTimeout(() => {
      load("yesterday");
      load("tomorrow");
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    load(active);
  }, [active, load]);

  return states;
}

function leagueName(id: string): string {
  return LEAGUES.find(league => league.id === id)?.name ?? "";
}

/* عدد الأخبار بصيغة عربية سليمة (خبر واحد / خبران / 3 أخبار) */
function newsCountCaption(count: number): string {
  if (count === 0) return "";
  if (count === 1) return "خبر واحد";
  if (count === 2) return "خبران";
  return `${count} أخبار`;
}

/* هيكل التذكرة المشترك — نفس طبقات league-ticket.css بالضبط */
function SideTicketShell({
  className = "",
  ariaLabel,
  side,
  onPause,
  children,
}: {
  className?: string;
  ariaLabel: string;
  side: "matches" | "news";
  /* إيقاف التقليب التلقائي مؤقتاً عند التحويم بالمؤشر أو دخول التركيز */
  onPause?: () => void;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-label={ariaLabel}
      data-hero-side={side}
      className={`hero-side-ticket hero-side-ticket--${side} ${className}`}
      onPointerEnter={event => {
        if (event.pointerType === "mouse") onPause?.();
      }}
      onFocusCapture={onPause}
    >
      {side === "news" && <>
      <div className="league-ticket-bg league-ticket-holographic" aria-hidden="true">
        <span className="league-ticket-ray" />
        <span className="league-ticket-line league-ticket-line--top" />
        <span className="league-ticket-line league-ticket-line--bottom" />
        <span className="league-ticket-line league-ticket-line--left" />
        <span className="league-ticket-line league-ticket-line--right" />
      </div>
      <span className="league-ticket-symbol" aria-hidden="true" />
      </>}
      <div className="hero-side-ticket-inner">{children}</div>
    </section>
  );
}

function SideTicketHead({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="inline-flex items-center gap-1 rounded-full bg-[#d8ff3e] px-2 py-0.5 text-[11px] font-black text-[#0b0b0f] lg:text-[10px]">
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#0b0b0f]" />
        {title}
      </span>
      <span className="min-w-0 truncate text-[10px] font-bold text-white/65 lg:text-[9.5px]">{meta}</span>
    </div>
  );
}

/* --------------------------------------------------------------------------
   تقليب الشرائح — سلوك واحد للتذكرتين (لا نسختان):
   تلقائي كل 4.5 ثانية، يتوقف عند التحويم أو التركيز أو أي اختيار يدوي
   15 ثانية ثم يعود، ولا يعمل في التبويب المخفي.
-------------------------------------------------------------------------- */
function useSlideRotation(count: number, startDelay = 1500) {
  const [index, setIndex] = useState(0);
  const [auto, setAuto] = useState(false);
  const pauseUntil = useRef(0);

  useEffect(() => {
    const starter = window.setTimeout(() => setAuto(true), startDelay);
    return () => window.clearTimeout(starter);
  }, [startDelay]);

  useEffect(() => {
    if (!auto || count < 2) return;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      if (Date.now() < pauseUntil.current) return;
      setIndex(prev => (prev + 1) % count);
    }, ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [auto, count]);

  const hold = () => {
    pauseUntil.current = Date.now() + MANUAL_PAUSE_MS;
  };
  const step = (delta: number) => {
    if (count < 2) return;
    hold();
    setIndex(prev => (prev + delta + count) % count);
  };
  const reset = () => {
    hold();
    setIndex(0);
  };

  return { index: count > 0 ? Math.min(index, count - 1) : 0, step, reset, hold };
}

/* سهمان + عدّاد الشريحة — نفس الشكل في تذكرة المباريات وتذكرة الأخبار */
function SlideArrows({
  label,
  index,
  count,
  onStep,
}: {
  label: string;
  index: number;
  count: number;
  onStep: (delta: number) => void;
}) {
  const button = "hero-slide-arrow grid h-5 w-5 place-items-center rounded-full border border-white/15 bg-white/[0.06] text-white/70 transition-colors hover:border-[#d8ff3e]/50 hover:text-[#d8ff3e] disabled:opacity-30 disabled:hover:border-white/15 disabled:hover:text-white/70";
  return (
    <div className="flex items-center gap-1">
      <button type="button" onClick={() => onStep(-1)} disabled={count < 2} aria-label={`${label} ${label === "المباراة" ? "السابقة" : "السابق"}`} className={button}>
        <Chevron dir="start" />
      </button>
      <span dir="ltr" className="hero-slide-count min-w-[26px] text-center text-[9.5px] tabular-nums text-white/55">
        {count ? `${index + 1}/${count}` : "0/0"}
      </span>
      <button type="button" onClick={() => onStep(1)} disabled={count < 2} aria-label={`${label} ${label === "المباراة" ? "التالية" : "التالي"}`} className={button}>
        <Chevron dir="end" />
      </button>
    </div>
  );
}

function Chevron({ dir }: { dir: "start" | "end" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-3 w-3">
      <path d={dir === "start" ? "m9 5 7 7-7 7" : "m15 5-7 7 7 7"} />
    </svg>
  );
}

/* شعار النادي من المصدر نفسه (MatchTeam.logo كما تعرضه صفحة المواعيد)،
   وبديل محايد (كرة) إن غاب الشعار أو تعذّر تحميله — بلا شعار مخترع */
function ClubMark({ team }: { team: MatchTeam }) {
  if (!team.logo) {
    return (
      <span aria-hidden="true" className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-black/5 text-black/50 lg:h-6 lg:w-6">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" className="h-3 w-3">
          <circle cx="12" cy="12" r="9" />
          <path d="m12 8 3.4 2.5-1.3 4h-4.2l-1.3-4L12 8Z" />
        </svg>
      </span>
    );
  }
  return (
    <img
      data-club-logo=""
      src={team.logo}
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      width={18}
      height={18}
      className="h-[18px] w-[18px] shrink-0 object-contain lg:h-6 lg:w-6"
      onError={event => {
        event.currentTarget.style.visibility = "hidden";
      }}
    />
  );
}

function TeamLine({ team }: { team: MatchTeam }) {
  return (
    <span className="flex items-center gap-1.5 text-[13px] font-black leading-tight lg:text-[13px]">
      <ClubMark team={team} />
      <span className="min-w-0 flex-1 truncate">{team.name}</span>
      {team.score != null && (
        <span dir="ltr" className="shrink-0 tabular-nums text-black/70">
          {team.score}
        </span>
      )}
    </span>
  );
}

/* --------------------------------------------------------------------------
   تذكرة يمين التذكرة الرئيسية — مباريات أمس واليوم وغد
   (تبويبات + شرائح بسهمين، تقليب تلقائي كل 4.5 ثانية ويدوي بالأزرار)
   -------------------------------------------------------------------------- */
export function HeroMatchesTicket({ className = "" }: { className?: string }) {
  const days = useMemo<Record<DayKey, string>>(() => {
    const today = dayInZone(new Date(), HOME_ZONE);
    return { yesterday: shiftDay(today, -1), today, tomorrow: shiftDay(today, 1) };
  }, []);

  const [activeDay, setActiveDay] = useState<DayKey>("today");
  const states = useDayMatches(days, activeDay);

  const day = states[activeDay];
  const slides = day.status === "ready" ? day.matches : [];
  const count = slides.length;
  const { index, step, reset, hold } = useSlideRotation(count);
  const swipe = useTicketSwipe(step);
  const current = count > 0 ? slides[index] : null;
  /* شعار بطولة الشريحة من الخريطة الموثّقة نفسها التي تستخدمها أيقونات
     البطولات (LEAGUE_ICONS): البطولة بلا شعار موثّق (الدوري المصري
     والتصفيات والودّية) تبقى بلا شعار في الخلفية — لا يُخترع شعار */
  const leagueLogo = current ? leagueIcon(current.league) : undefined;

  /* تبديل اليوم يبدأ من الشريحة الأولى ويؤجّل التقليب التلقائي */
  const selectDay = (key: DayKey) => {
    reset();
    setActiveDay(key);
  };

  return (
    <SideTicketShell ariaLabel="مباريات أمس واليوم وغد" side="matches" className={className} onPause={hold}>
      <div className="flex items-center gap-1.5">
        <div
          role="tablist"
          aria-label="يوم المباريات"
          className="flex min-w-0 flex-1 items-center gap-0.5 rounded-full border border-black/10 bg-[#f7f8f2] p-0.5"
          onKeyDown={event => {
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
            event.preventDefault();
            const at = DAY_TABS.findIndex(tab => tab.key === activeDay);
            const next = (at + (event.key === "ArrowLeft" ? 1 : DAY_TABS.length - 1)) % DAY_TABS.length;
            selectDay(DAY_TABS[next].key);
          }}
        >
          {DAY_TABS.map(tab => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeDay === tab.key}
              aria-controls="hero-matches-panel"
              tabIndex={activeDay === tab.key ? 0 : -1}
              onClick={() => selectDay(tab.key)}
              className={`flex-1 rounded-full px-1 py-0.5 text-[11px] font-black transition-colors lg:text-[10px] ${
                activeDay === tab.key ? "bg-[#d8ff3e] text-[#0b0b0f]" : "text-black/60 hover:text-black"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <span className="min-w-0 shrink-0 truncate text-[9.5px] font-bold text-black/60 lg:text-[9px]">{dayLabel(days[activeDay])}</span>
      </div>

      <div id="hero-matches-panel" role="tabpanel" aria-label={DAY_TABS.find(tab => tab.key === activeDay)?.label} className="hero-news-stage mt-1.5 flex min-h-0 flex-1 flex-col justify-center overflow-hidden">
        {day.status === "loading" && (
          <p className="text-[12px] font-bold leading-relaxed text-black/60 lg:text-[10px]">جارٍ تحديث المواعيد…</p>
        )}

        {day.status === "error" && (
          <div className="text-[12px] font-bold leading-relaxed text-black/60 lg:text-[10px]">
            <p>تعذّر تحديث مواعيد هذا اليوم.</p>
            <a className="mt-1 inline-block font-black text-[#0b0b0f]" href={to("matches/")}>
              افتح صفحة المواعيد
            </a>
          </div>
        )}

        {day.status === "ready" && !current && (
          <div className="text-[12px] font-bold leading-relaxed text-black/60 lg:text-[10px]">
            <p>لا مباريات في البطولات المتابَعة.</p>
            <a className="mt-1 inline-block font-black text-[#0b0b0f]" href={to("matches/")}>
              كل المواعيد القادمة
            </a>
          </div>
        )}

        {current && (
          <a
            key={current.id}
            {...swipe}
            style={{ touchAction: "pan-y pinch-zoom" }}
            href={matchCenterLink(current) ?? to("matches/")}
            className="hero-match-slide relative isolate overflow-hidden rounded-lg border border-black/10 bg-[#f7f8f2] px-2 py-1.5 text-start transition-colors hover:border-[#b3d21f] hover:bg-[#f5f9e6]"
          >
            {/* خلفية الشريحة: شعار بطولة المباراة نفسها (زخرفي، خافت، تحت
                النص) — يظهر فقط لبطولة لها شعار موثّق */}
            {leagueLogo && (
              <img
                data-league-logo=""
                src={leagueLogo}
                alt=""
                aria-hidden="true"
                loading="lazy"
                decoding="async"
                draggable={false}
                className="hero-match-slide-logo"
                onError={event => {
                  event.currentTarget.style.visibility = "hidden";
                }}
              />
            )}
            <span className="flex items-center justify-between gap-1 text-[10px] font-bold text-black/60 lg:text-[9.5px]">
              <span className="min-w-0 truncate">{leagueName(current.league)}</span>
              {current.state === "live" ? (
                <span className="inline-flex shrink-0 items-center gap-1 font-black text-[#bd291d]">
                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#ff6b5c]" />
                  مباشر
                  {current.detail && current.detail !== "مباشر" && (
                    <bdi className="tabular-nums">{current.detail}</bdi>
                  )}
                </span>
              ) : current.state === "finished" ? (
                <span className="shrink-0 font-black text-black/60">انتهت</span>
              ) : current.state === "other" ? (
                <span className="shrink-0 font-black text-black/60">تغيّر الموعد</span>
              ) : (
                <span dir="ltr" className="shrink-0 font-black tabular-nums text-black/70">
                  {kickoff(current.date, HOME_ZONE)}
                </span>
              )}
            </span>
            {/* الجوال (التذكرة بنصف الطول): صفّ واحد أفقي — شعار الفريقين
                على طرفَي السطر والنتيجة بينهما. سطح المكتب: صفّ لكل فريق. */}
            <span className="mt-1 flex items-center justify-between gap-1 text-[12.5px] font-black leading-tight lg:hidden">
              <span className="flex min-w-0 items-center gap-1">
                <ClubMark team={current.home} />
                <span className="min-w-0 truncate">{current.home.name}</span>
              </span>
              {current.home.score != null && current.away.score != null && (
                <span data-match-score="" dir="rtl" className="inline-flex shrink-0 items-center gap-1 tabular-nums text-black/75">
                  <bdi data-score-home="" dir="ltr">{current.home.score}</bdi>
                  <span aria-hidden="true">-</span>
                  <bdi data-score-away="" dir="ltr">{current.away.score}</bdi>
                </span>
              )}
              <span className="flex min-w-0 items-center gap-1">
                <span className="min-w-0 truncate">{current.away.name}</span>
                <ClubMark team={current.away} />
              </span>
            </span>
            <span className="mt-1 hidden space-y-1 lg:block">
              <TeamLine team={current.home} />
              <TeamLine team={current.away} />
            </span>
            {/* سطر الملعب: يُحجز دائماً (مسافة عند غيابه) فلا يتغيّر ارتفاع
                البطاقة بين شريحة وأخرى أثناء التقليب */}
            <span className="mt-2 hidden truncate text-[10px] font-bold text-black/50 lg:block">
              {current.venue || "\u00A0"}
            </span>
          </a>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between gap-1 border-t border-black/10 pt-1.5 text-[10.5px] font-bold lg:text-[9.5px]">
        <a className="shrink-0 font-black text-[#0b0b0f]" href={to("matches/")}>
          كل المواعيد
        </a>
        <SlideArrows label="المباراة" index={index} count={count} onStep={step} />
      </div>
    </SideTicketShell>
  );
}

/* --------------------------------------------------------------------------
   تذكرة يسار التذكرة الرئيسية — آخر الأخبار
   --------------------------------------------------------------------------
   كل خبر في شريحة مستقلة (لا شريحتان مكدّستان): التصنيف والتاريخ والعنوان
   والوصف والنتيجة وشعارا الفريقين من FEATURED_NEWS وحدها، والسهمان
   والعدّاد يقلّبان بين الأخبار تلقائياً كل 4.5 ثانية أو يدوياً — بنفس سلوك
   شرائح المباريات (useSlideRotation نفسه).
   الشريحة كلها رابط إلى صفحة الخبر الداخلية.
-------------------------------------------------------------------------- */
export function HeroNewsTicket({ className = "" }: { className?: string }) {
  /* كل الأخبار المميزة المعلنة — العدد يحدّده الملف لا هذه الواجهة */
  const items = FEATURED_NEWS.slice(0, MAX_NEWS_SLIDES);
  const { index, step, hold } = useSlideRotation(items.length);
  const item = items[index] ?? null;

  return (
    <SideTicketShell ariaLabel="آخر الأخبار" side="news" className={className} onPause={hold}>
      <SideTicketHead title="آخر الأخبار" meta={newsCountCaption(FEATURED_NEWS.length)} />

      <div className="hero-news-stage mt-1.5 flex min-h-0 flex-1 flex-col justify-center overflow-hidden">
        {item ? (
          <FeaturedNewsTicketSlide key={item.href} href={item.href} compact />
        ) : (
          <div className="text-[12px] font-bold leading-relaxed text-white/55 lg:text-[10px]">
            <p>لا أخبار منشورة بعد.</p>
            <a className="mt-1 inline-block font-black text-[#d8ff3e]" href={to("blog/")}>
              صفحة المقالات
            </a>
          </div>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between gap-1 border-t border-white/10 pt-1.5 text-[10.5px] font-bold lg:text-[9.5px]">
        <a className="shrink-0 font-black text-[#d8ff3e]" href={to("blog/")}>
          كل الأخبار
        </a>
        <SlideArrows label="الخبر" index={index} count={items.length} onStep={step} />
      </div>
    </SideTicketShell>
  );
}
