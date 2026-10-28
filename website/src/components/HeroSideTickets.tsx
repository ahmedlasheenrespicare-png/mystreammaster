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
import { trackHomeEvent } from "../lib/analytics";
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

/* شعار النادي داخل قاعدة دائرية بيضاء مجسّمة فوق شطري البطاقة القطرية */
function DiagonalCrest({ team, small = false }: { team: MatchTeam; small?: boolean }) {
  const cls = `hms-diag-crest${small ? " hms-diag-crest--sm" : ""}`;
  if (!team.logo) {
    return (
      <span aria-hidden="true" className={`${cls} text-black/55`}>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          aria-hidden="true"
          className={small ? "h-3 w-3" : "h-3.5 w-3.5"}
        >
          <circle cx="12" cy="12" r="9" />
          <path d="m12 8 3.4 2.5-1.3 4h-4.2l-1.3-4L12 8Z" />
        </svg>
      </span>
    );
  }
  return (
    <span aria-hidden="true" className={cls}>
      <img
        data-club-logo=""
        src={team.logo}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        width={small ? 15 : 18}
        height={small ? 15 : 18}
        className={small ? "h-[14px] w-[14px] shrink-0 object-contain" : "h-[17px] w-[17px] shrink-0 object-contain"}
        onError={event => {
          event.currentTarget.style.visibility = "hidden";
        }}
      />
    </span>
  );
}

/* --------------------------------------------------------------------------
   تذكرة يمين التذكرة الرئيسية — مباريات أمس واليوم وغد
   التصميم المعتمد: الملصق القطري المزدوج + الشفرات المائلة (Diagonal Split Clash)
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
  const hasLiveToday = states.today.matches.some(match => match.state === "live");
  const { index, step, reset, hold } = useSlideRotation(count);
  const swipe = useTicketSwipe(step);
  const current = count > 0 ? slides[index] : null;
  /* شعار بطولة الشريحة من الخريطة الموثّقة نفسها التي تستخدمها أيقونات
     البطولات (LEAGUE_ICONS): البطولة بلا شعار موثّق (الدوري المصري
     والتصفيات والودّية) تبقى بلا شعار في الخلفية — لا يُخترع شعار */
  const leagueLogo = current ? leagueIcon(current.league) : undefined;
  const currentHref = current ? matchCenterLink(current) ?? to("matches/") : to("matches/");
  const kickoffLabel = current ? kickoff(current.date, HOME_ZONE) : "";
  const compTitle = current ? leagueName(current.league) : "";
  const matchCountLabel =
    day.status === "ready" && count > 0 ? `${count} ${count === 1 ? "مباراة" : "مباريات"}` : "";

  /* تبديل اليوم يبدأ من الشريحة الأولى ويؤجّل التقليب التلقائي */
  const selectDay = (key: DayKey) => {
    reset();
    setActiveDay(key);
  };

  return (
    <SideTicketShell ariaLabel="مباريات أمس واليوم وغد" side="matches" className={className} onPause={hold}>
      <div className="hdt-diag-bar" data-day-tabs-variant="diagonal">
        <div
          role="tablist"
          aria-label="يوم المباريات"
          className="hdt-diag-tablist"
          onKeyDown={event => {
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
            event.preventDefault();
            const at = DAY_TABS.findIndex(tab => tab.key === activeDay);
            const next = (at + (event.key === "ArrowLeft" ? 1 : DAY_TABS.length - 1)) % DAY_TABS.length;
            selectDay(DAY_TABS[next].key);
          }}
        >
          {DAY_TABS.map(tab => {
            const isActive = activeDay === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls="hero-matches-panel"
                tabIndex={isActive ? 0 : -1}
                onClick={() => selectDay(tab.key)}
                className={`hdt-diag-tab${isActive ? " is-active" : ""}`}
              >
                <span className="hdt-diag-tab-txt">
                  {tab.key === "today" && hasLiveToday && (
                    <span aria-hidden="true" className="hms-diag-live-dot" />
                  )}
                  <span>{tab.label}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="hdt-diag-meta">
          <span className="hdt-diag-date-pill">{dayLabel(days[activeDay])}</span>
          {matchCountLabel && (
            <span className="hdt-diag-count" aria-hidden="true">
              {matchCountLabel}
            </span>
          )}
        </div>
      </div>

      <div id="hero-matches-panel" role="tabpanel" aria-label={DAY_TABS.find(tab => tab.key === activeDay)?.label} className="hero-news-stage mt-1 flex min-h-0 flex-1 flex-col justify-center overflow-hidden">
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
            href={currentHref}
            data-match-card-variant="diagonal"
            onClick={() => trackHomeEvent("hero_match_open", {
              match_id: current.id,
              league_id: current.league,
              match_state: current.state,
              target_path: currentHref,
            })}
            className="hero-match-slide hms-diag-card"
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

            {/* الجوال (< 1024px): ملصق قطري أفقي يتّسع داخل ارتفاع 132px */}
            <span className="hms-diag-mobile">
              <span className="hms-diag-mob-head">
                <span className="min-w-0 truncate">{compTitle}</span>
                {current.state === "live" ? (
                  <span className="hms-diag-mob-status is-live">
                    <span aria-hidden="true" className="hms-diag-live-dot" />
                    مباشر
                    {current.detail && current.detail !== "مباشر" && (
                      <bdi className="tabular-nums">{current.detail}</bdi>
                    )}
                  </span>
                ) : current.state === "finished" ? (
                  <span className="hms-diag-mob-status">انتهت</span>
                ) : current.state === "other" ? (
                  <span className="hms-diag-mob-status">تغيّر الموعد</span>
                ) : (
                  <span dir="ltr" className="hms-diag-mob-status">
                    {kickoffLabel}
                  </span>
                )}
              </span>

              <span className="hms-diag-mob-duel">
                <span className="hms-diag-mob-side hms-diag-mob-side--home">
                  <DiagonalCrest team={current.home} small />
                  <span className="hms-diag-mob-name">{current.home.name}</span>
                </span>
                {current.home.score != null && current.away.score != null ? (
                  <span data-match-score="" dir="rtl" className="hms-diag-mob-score">
                    <bdi data-score-home="" dir="ltr">{current.home.score}</bdi>
                    <span aria-hidden="true">-</span>
                    <bdi data-score-away="" dir="ltr">{current.away.score}</bdi>
                  </span>
                ) : (
                  <span aria-hidden="true" className="hms-diag-mob-score">VS</span>
                )}
                <span className="hms-diag-mob-side hms-diag-mob-side--away">
                  <span className="hms-diag-mob-name">{current.away.name}</span>
                  <DiagonalCrest team={current.away} small />
                </span>
              </span>
            </span>

            {/* سطح المكتب (>= 1024px): ملصق قطري مزدوج بشطر علوي داكن وشقّ ليموني وشطر سفلي كريمي */}
            <span className="hms-diag-desktop">
              <span className="hms-diag-home-zone">
                <span className="hms-diag-team-info">
                  <DiagonalCrest team={current.home} />
                  <span className="hms-diag-team-name">{current.home.name}</span>
                </span>
                {current.home.score != null && (
                  <span dir="ltr" className="hms-diag-score-lime">
                    {current.home.score}
                  </span>
                )}
              </span>

              <span className="hms-diag-slash-wrap">
                <span className={`hms-diag-pivot-pill${current.state === "live" ? " is-live" : ""}`}>
                  {current.state === "live" && (
                    <span aria-hidden="true" className="hms-diag-live-dot" />
                  )}
                  <span className="hms-diag-pivot-txt">
                    {compTitle ? `${compTitle} · ` : ""}
                    {current.state === "live" ? (
                      <>
                        مباشر
                        {current.detail && current.detail !== "مباشر" ? (
                          <>
                            {" "}
                            <bdi className="tabular-nums">{current.detail}</bdi>
                          </>
                        ) : null}
                      </>
                    ) : current.state === "finished" ? (
                      "انتهت"
                    ) : current.state === "other" ? (
                      "تغيّر الموعد"
                    ) : (
                      <bdi dir="ltr">{kickoffLabel}</bdi>
                    )}
                  </span>
                </span>
              </span>

              <span className="hms-diag-away-zone">
                <span className="hms-diag-team-info">
                  <DiagonalCrest team={current.away} />
                  <span className="hms-diag-team-name">{current.away.name}</span>
                </span>
                {current.away.score != null ? (
                  <span dir="ltr" className="hms-diag-score-dark">
                    {current.away.score}
                  </span>
                ) : (
                  <span dir="ltr" className="hms-diag-score-dark">
                    {kickoffLabel}
                  </span>
                )}
              </span>

              <span className="hms-diag-venue">
                {current.venue || "\u00A0"}
              </span>
            </span>
          </a>
        )}
      </div>

      <div className="hms-diag-footer">
        <a
          className="shrink-0 font-black text-[#0b0b0f]"
          href={to("matches/")}
          onClick={() => trackHomeEvent("hero_schedule_open", { target_path: "/matches/" })}
        >
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
