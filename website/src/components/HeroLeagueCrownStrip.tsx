import { DayButtons, type Day } from "./CrownDayMatches";
import { orderCrownMatches } from "./crown-slide-order";
import CrownMatchFullscreen, { CrownFullscreen } from "./CrownMatchFullscreen";
import LeagueIconBadge from "./LeagueIconBadge";
import { CROWN_CUP_LOGOS, crownLeagueName } from "./crown-league-identity";
import { CrownClashSlide, clashSummary, useClashesWithStatus, type FeaturedClash } from "./LeagueTicketCard";
import { motionReduced } from "../lib/motion-preference";
import { LEAGUE_TICKET_PLAYERS } from "../content/league-ticket-players";
import { TicketImage } from "./TicketImage";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import { dayInZone, shiftDay } from "../lib/matches.mjs";
import { leagueLandingsInPageOrder } from "../content/competitions";
import { providerTeamLogo } from "../lib/leader-logo.mjs";
import { STANDINGS_LEAGUES } from "../lib/standings.mjs";
import {
  refreshLiveLeaguesStandings,
  useLiveStandingsMap,
  type LiveLeagueRecord,
} from "../lib/live-standings";
import { resolveApprovedTeamLogo, teamInitials } from "./StandingsRatesCard";
import { getLeagueTrophyTheme } from "./LeagueTrophySvg";
import CrownLeagueTrophy from "./CrownLeagueTrophy";
import {
  GoldenBootMedalIcon,
  GoalsNetBurstIcon,
  GradesIcon,
  GuardianShieldMedalIcon,
  MedalRibbonIcon,
  MiniDuelDiamond,
} from "./LeagueTopDrawerIcons";
import "./league-carousel.css";
import "./hero-league-strip.css";

const NO_EXTRA_LEAGUES: readonly { id: string; name: string }[] = [];
const STANDINGS_LEAGUE_IDS = STANDINGS_LEAGUES.map((entry) => entry.id);
const REFRESH_MS = 5 * 60 * 1000;
const STEP_INTERVAL_MS = 5000;

/* ── مخزن تزامن مشترك بين التاج المداري (أعلى التذكرة) وشريط الإحصائيات (أسفل التذكرة الرئيسية) ── */
let sharedActiveIndex = 0;
let sharedSlideLeagues: string[] = [];
let sharedLeagueId = "";
let sharedPauseCount = 0;
const crownListeners = new Set<() => void>();

function emitCrownChange() {
  crownListeners.forEach((fn) => fn());
}

function setSharedActiveIndex(next: number) {
  if (sharedActiveIndex === next) return;
  sharedActiveIndex = next;
  sharedLeagueId = sharedSlideLeagues[next] ?? "";
  emitCrownChange();
}

function stepSharedActiveIndex(delta: number, total: number) {
  if (total < 1) return;
  setSharedActiveIndex(((sharedActiveIndex + delta) % total + total) % total);
}

function adjustSharedPause(delta: number) {
  const prevPaused = sharedPauseCount > 0;
  sharedPauseCount = Math.max(0, sharedPauseCount + delta);
  if ((sharedPauseCount > 0) !== prevPaused) {
    emitCrownChange();
  }
}

/** Real mouse hover and keyboard focus pause rotation, never emulated touch hover. */
function useCrownInteractionPause() {
  const hover = useRef(false);
  const focus = useRef(false);
  const update = (ref: { current: boolean }, next: boolean) => {
    if (ref.current === next) return;
    ref.current = next;
    adjustSharedPause(next ? 1 : -1);
  };
  useEffect(() => () => {
    if (hover.current) { hover.current = false; adjustSharedPause(-1); }
    if (focus.current) { focus.current = false; adjustSharedPause(-1); }
  }, []);
  return {
    onPointerEnter: (e: React.PointerEvent<HTMLElement>) => {
      if (e.pointerType === "mouse") update(hover, true);
    },
    onPointerLeave: (e: React.PointerEvent<HTMLElement>) => {
      if (e.pointerType === "mouse") update(hover, false);
    },
    onPointerDownCapture: (e: React.PointerEvent<HTMLElement>) => {
      if (e.pointerType !== "mouse") update(focus, false);
    },
    onFocusCapture: (e: React.FocusEvent<HTMLElement>) => {
      update(focus, e.target.matches(":focus-visible"));
    },
    onBlurCapture: (e: React.FocusEvent<HTMLElement>) => {
      if (!e.currentTarget.contains(e.relatedTarget)) update(focus, false);
    },
  };
}

function useSharedCrownState() {
  const snapshot = useSyncExternalStore(
    (cb) => {
      crownListeners.add(cb);
      return () => crownListeners.delete(cb);
    },
    () => `${sharedActiveIndex}:${sharedPauseCount > 0 ? 1 : 0}:${sharedLeagueId}`,
    () => "0:0",
  );
  const [idxStr, pausedStr, leagueId] = snapshot.split(":");
  return {
    active: Number(idxStr) || 0,
    leagueId,
    paused: pausedStr === "1",
  };
}

interface ClubVisual {
  name: string;
  initials: string;
  logo: string | null;
  localFallback: string | null;
}

interface HeroLeagueData {
  href: string;
  shortName: string;
  leagueId: string;
  standingsKey: string;
  stageGlow: string;
  splitGradient: string;
  leader: (ClubVisual & { points: number; played: number; gd: number; ppm: number | null }) | null;
  bestAttack: (ClubVisual & { rate: number }) | null;
  bestDefence: (ClubVisual & { rate: number }) | null;
  totalGoals: number | null;
}

function cleanInitials(name: string): string {
  const words = name
    .split(/\s+/)
    .map((w) => w.replace(/^[^A-Za-z0-9\u0600-\u06FF]+/, ""))
    .filter(Boolean);
  const out = words
    .slice(0, 2)
    .map((w) => (w[0] ?? "").toUpperCase())
    .join("");
  return out || teamInitials(name);
}

function resolveClubVisual(
  team: { teamId?: string; name: string; logo?: string | null },
  provider: string,
): ClubVisual {
  const localFallback = resolveApprovedTeamLogo({ name: team.name });
  const providerLogo = providerTeamLogo({
    teamId: team.teamId,
    provider,
    logo: team.logo ?? null,
  });
  return {
    name: team.name,
    initials: cleanInitials(team.name),
    logo: providerLogo ?? localFallback,
    localFallback: providerLogo ? localFallback : null,
  };
}

function buildHeroLeagueData(
  landing: ReturnType<typeof leagueLandingsInPageOrder>[number],
  record: LiveLeagueRecord | undefined,
): HeroLeagueData {
  const sKey =
    landing.standings?.leagueId ??
    (landing.leagueId === "sau.1" ? "ksa.1" : landing.leagueId);
  const theme = getLeagueTrophyTheme(landing.leagueId);
  const provider = record?.table?.provider ?? (sKey === "egy.1" ? "Highlightly" : "ESPN");
  const entries = record?.table?.entries ?? [];

  const findLogo = (teamId?: string, name?: string) => {
    const match = entries.find(
      (entry) =>
        (teamId && String(entry.teamId) === String(teamId)) ||
        (name && entry.name === name),
    );
    return (match as { logo?: string | null } | undefined)?.logo ?? null;
  };

  const top = record?.leader ?? entries[0];
  const played = Number(top?.played ?? 0);
  const points = Number(top?.points ?? 0);
  const gd = Number(
    top?.goalDifference ?? Number(top?.goalsFor ?? 0) - Number(top?.goalsAgainst ?? 0),
  );

  const leader = top?.name
    ? {
        ...resolveClubVisual(
          {
            teamId: top.teamId,
            name: top.name,
            logo: (top as { logo?: string | null }).logo ?? null,
          },
          provider,
        ),
        points,
        played,
        gd,
        ppm: record?.leaderRates?.ppm ?? (played > 0 ? points / played : null),
      }
    : null;

  const rates = record?.rates ?? null;
  const att = rates?.bestAttack?.[0];
  const def = rates?.bestDefence?.[0];

  return {
    href: `/matches/${landing.slug}/`,
    shortName: landing.shortName,
    leagueId: landing.leagueId,
    standingsKey: sKey,
    stageGlow: theme.stageGlow,
    splitGradient: theme.splitGradient,
    leader,
    bestAttack:
      att && att.attack !== null
        ? {
            ...resolveClubVisual(
              { teamId: att.teamId, name: att.name, logo: findLogo(att.teamId, att.name) },
              provider,
            ),
            rate: att.attack,
          }
        : null,
    bestDefence:
      def && def.defence !== null
        ? {
            ...resolveClubVisual(
              { teamId: def.teamId, name: def.name, logo: findLogo(def.teamId, def.name) },
              provider,
            ),
            rate: def.defence,
          }
        : null,
    totalGoals: rates && rates.rows.length > 0 ? rates.league.totalGoals : null,
  };
}

function useHeroLeagueItems(): HeroLeagueData[] {
  const landings = useMemo(() => leagueLandingsInPageOrder(), []);
  const liveMap = useLiveStandingsMap();
  return useMemo(
    () =>
      landings.map((landing) => {
        const sKey =
          landing.standings?.leagueId ??
          (landing.leagueId === "sau.1" ? "ksa.1" : landing.leagueId);
        return buildHeroLeagueData(landing, liveMap[sKey]);
      }),
    [landings, liveMap],
  );
}

function HeroClubCrest({
  club,
  size = "sm",
}: {
  club: ClubVisual;
  size?: "sm" | "md";
}) {
  const px = size === "md" ? 28 : 20;
  return (
    <span
      className={`hs-club-crest${size === "md" ? " hs-club-crest--md" : ""}`}
      aria-hidden="true"
    >
      <span className="hs-club-initials">{club.initials}</span>
      {club.logo && (
        <img
          src={club.logo}
          alt=""
          width={px}
          height={px}
          loading="lazy"
          decoding="async"
          className="hs-club-logo"
          ref={(img) => {
            if (img && img.complete && img.naturalWidth > 0) {
              img.classList.add("is-loaded");
            }
          }}
          onLoad={(e) => {
            if (e.currentTarget.naturalWidth > 0) {
              e.currentTarget.classList.add("is-loaded");
            }
          }}
          onError={(e) => {
            const el = e.currentTarget;
            if (club.localFallback && !el.dataset.triedFallback) {
              el.dataset.triedFallback = "1";
              el.src = club.localFallback;
              return;
            }
            el.style.display = "none";
          }}
        />
      )}
    </span>
  );
}

function CrownLeagueDetails({ item }: { item: HeroLeagueData }) {
  return <article className="crown-league-details" dir="rtl" data-fullscreen-league={item.leagueId}>
    <div className="crown-league-art" aria-hidden="true">
      {CROWN_CUP_LOGOS[item.leagueId] ? <LeagueIconBadge leagueId={item.leagueId} iconSrc={CROWN_CUP_LOGOS[item.leagueId]} size={240} eager /> :
        (LEAGUE_TICKET_PLAYERS[item.leagueId] ?? []).map(src => <TicketImage key={src} src={src} alt="" loading="eager" />)}
    </div>
    <h2 className="crown-league-fullscreen-heading">{item.shortName}</h2>
    <CrownStatsPanels current={item} fullscreen />
  </article>;
}

const NO_CLASHES: FeaturedClash[] = [];
function withClashLeagues(items: HeroLeagueData[], clashes: FeaturedClash[], extraLeagues: readonly { id: string; name: string }[] = []): HeroLeagueData[] {
  const result = [...items];
  /* بطاقات البطولات = بطولات الشرائح + البطولات المثبَّتة يدوياً (تبقى حتى لو
     أُخفيت مواجهاتها بطلب المالك) — بدون تكرار لأي بطولة معروضة أصلاً */
  const wanted = [...extraLeagues.map(entry => ({ id: entry.id, fallback: entry.name })),
    ...clashes.map(clash => ({ id: clash.source, fallback: clash.eyebrow }))];
  for (const { id, fallback } of wanted) {
    if (!id || result.some(item => item.leagueId === id)) continue;
    const theme = getLeagueTrophyTheme(id);
    result.push({ leagueId: id, standingsKey: id, shortName: crownLeagueName(id, fallback), href: "/matches/", stageGlow: theme.stageGlow, splitGradient: theme.splitGradient, leader: null, bestAttack: null, bestDefence: null, totalGoals: null });
  }
  return result;
}

/* ==========================================================================
   1) شريط التاج المداري ثلاثي الأبعاد للبطولات الثماني — أعلى تذكرة الهيرو
========================================================================== */
export default function HeroLeagueCrownStrip({ clashes = NO_CLASHES, extraLeagues = NO_EXTRA_LEAGUES, newsOpen = false, onNewsOpenChange, newsTicket }: { clashes?: FeaturedClash[]; extraLeagues?: readonly { id: string; name: string }[]; newsOpen?: boolean; onNewsOpenChange?: (open: boolean) => void; newsTicket?: ReactNode } = {}) {
  const leagueItems = withClashLeagues(useHeroLeagueItems(), clashes, extraLeagues);
  const standingsMap = useLiveStandingsMap();
  const [dayView, setDayView] = useState<Day | null>(null);
  const [leagueOnly, setLeagueOnly] = useState(false);
  const [today, setToday] = useState(() => dayInZone(new Date(), "Africa/Cairo"));
  useEffect(() => {
    const check = () => setToday(dayInZone(new Date(), "Africa/Cairo"));
    const timer = window.setInterval(check, 30_000);
    document.addEventListener("visibilitychange", check);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", check); };
  }, []);
  const { matches, status: matchesStatus } = useClashesWithStatus("matches", clashes);
  const matchItems = orderCrownMatches(clashes.map((_, index) => matches[index])).flatMap(index => {
    const clash = clashes[index];
    const league = leagueItems.find(item => item.leagueId === clash.source);
    return league ? [{ ...league, key: `${league.leagueId}:${clash.home.name}:${clash.away.name}:${clash.date ?? ""}`, clashIndex: index }] : [];
  });
  // Global priority: live → scheduled → finished → unconfirmed → league cards.
  const selectedDate = dayView && dayView !== "live" ? shiftDay(today, dayView === "yesterday" ? -1 : dayView === "tomorrow" ? 1 : 0) : null;
  const filteredMatches = dayView ? matchItems.filter(item => {
    const match = matches[item.clashIndex];
    if (!match) return false;
    if (dayView === "live") return match.state === "live";
    return dayInZone(new Date(match.date), "Africa/Cairo") === selectedDate;
  }) : matchItems;
  const leagueCards = leagueItems.map(league => ({ ...league, key: league.leagueId, clashIndex: -1 }));
  const items = dayView ? filteredMatches : leagueOnly ? leagueCards : [...matchItems, ...leagueCards];
  const slideKey = items.map(item => item.key).join("|");
  const interactionPause = useCrownInteractionPause();
  const { active, paused } = useSharedCrownState();
  /* الخلفية تتبع البطولة النشطة: نفس لونَي الكارت (الهالة وتدرّج الشريط) */
  const shellItem = items[active] ?? items[0];
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [expandedTab, setExpandedTab] = useState<"match" | "standings" | "stats" | null>(null);
  const expandedItem = items.find(item => item.key === expandedKey);
  const [autoplayStopped, setAutoplayStopped] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dragX, setDragX] = useState(0);
  const rootRef = useRef<HTMLElement | null>(null);
  const dragStartRef = useRef<{ x: number; pointerId: number } | null>(null);
  const didDragRef = useRef(false);

  // Register slide → league identity; statistics follow the parent even on a match slide.
  useEffect(() => {
    sharedSlideLeagues = items.map(item => item.leagueId);
    sharedActiveIndex = 0;
    sharedLeagueId = sharedSlideLeagues[0] ?? "";
    emitCrownChange();
  }, [slideKey]);

  // تحديث بيانات الترتيب الحي (/standings.php) عند ظهور الشريط في نطاق الرؤية
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    const start = () => {
      if (cancelled) return;
      void refreshLiveLeaguesStandings(STANDINGS_LEAGUE_IDS);
      timer = setInterval(() => {
        if (typeof document !== "undefined" && document.hidden) return;
        void refreshLiveLeaguesStandings(STANDINGS_LEAGUE_IDS);
      }, REFRESH_MS);
    };

    if (typeof IntersectionObserver === "undefined") {
      start();
    } else {
      const io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            io.disconnect();
            start();
          }
        },
        { rootMargin: "200px" },
      );
      io.observe(el);
      return () => {
        cancelled = true;
        io.disconnect();
        if (timer) clearInterval(timer);
      };
    }

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (newsOpen || expandedKey || autoplayStopped || paused || dragging || items.length < 2) return;
    const id = window.setInterval(() => {
      if (document.hidden || motionReduced()) return;
      stepSharedActiveIndex(1, items.length);
    }, STEP_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [newsOpen, expandedKey, autoplayStopped, paused, dragging, items.length]);

  const step = (delta: number) => {
    stepSharedActiveIndex(delta, items.length);
  };

  const getOffset = (idx: number): string => {
    const n = items.length;
    let diff = idx - active;
    if (diff > n / 2) diff -= n;
    if (diff < -n / 2) diff += n;
    if (diff === 0) return "0";
    if (diff === 1) return "1";
    if (diff === -1) return "-1";
    if (diff === 2) return "2";
    if (diff === -2) return "-2";
    return "hidden";
  };

  const finishDrag = (clientX: number | null) => {
    const start = dragStartRef.current;
    dragStartRef.current = null;
    setDragging(false);
    setDragX(0);
    if (!start || clientX === null) return;
    const dx = clientX - start.x;
    if (Math.abs(dx) > 32) {
      step(dx > 0 ? 1 : -1);
    }
  };

  return (
    <section
      ref={rootRef}
      className="hero-crown-strip"
      aria-label="أبرز البطولات"
      data-hero-league-strip="crown3d"
      data-has-matches={clashes.length > 0}
    >
      <div
        className={`hs-crown-shell${dragging ? " is-dragging" : ""}${newsOpen ? " is-news-open" : ""}`}
        data-crown-league={shellItem?.leagueId ?? ""}
        style={{
          ...(dragX !== 0 ? { "--hs-drag-x": `${dragX}px` } : null),
          "--hs-shell-glow": shellItem?.stageGlow ?? "",
          "--hs-shell-split": shellItem?.splitGradient ?? "",
        } as CSSProperties}
        {...interactionPause}
        onKeyDown={(e) => {
          if (newsOpen || (e.target as HTMLElement).closest("button")) return;
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            step(1);
          } else if (e.key === "ArrowRight") {
            e.preventDefault();
            step(-1);
          }
        }}
      >
        {newsOpen ? <div className="hs-crown-news-panel" aria-label="أخبار الموقع">
          <button type="button" className="hs-crown-news-back" autoFocus onClick={() => {
            onNewsOpenChange?.(false);
            requestAnimationFrame(() => rootRef.current?.querySelector<HTMLButtonElement>('.hs-crown-news-tab')?.focus());
          }}>العودة إلى البطولات</button>
          {newsTicket}
        </div> : <>
        <div className="hs-crown-browser" aria-label="شريط المباريات والبطولات">
          <span className="hs-crown-browser-dots" aria-hidden="true"><i /><i /><i /></span>
          <span className="hs-crown-browser-title">المباريات والبطولات</span>
          <span className="hs-crown-browser-badge">الرياضة</span>
        </div>
        <div
          className="hs-crown-center"
          onPointerDown={(e) => {
            if (e.pointerType === "mouse" && e.button !== 0) return;
            dragStartRef.current = { x: e.clientX, pointerId: e.pointerId };
            didDragRef.current = false;
          }}
          onPointerMove={(e) => {
            const start = dragStartRef.current;
            if (!start || start.pointerId !== e.pointerId) return;
            const dx = e.clientX - start.x;
            if (Math.abs(dx) > 8) {
              didDragRef.current = true;
              if (!dragging) setDragging(true);
              setDragX(Math.max(-48, Math.min(48, dx)));
            }
          }}
          onPointerUp={(e) => {
            if (dragStartRef.current?.pointerId === e.pointerId) {
              finishDrag(e.clientX);
            }
          }}
          onPointerCancel={() => finishDrag(null)}
        >
          {dayView && !items.length && <p className="hs-day-empty" role="status">{matchesStatus === "loading" ? "جارٍ تحديث المباريات…" : matchesStatus === "error" ? "تعذّر تحديث مباريات الشريط من المصدر." : "لا توجد مباريات مؤكدة مطابقة في الشريط لهذا الاختيار."}</p>}
          {items.map((item, idx) => {
            const offset = getOffset(idx);
            const isFront = offset === "0";
            return (
              <a
                key={item.key}
                href={item.href}
                className={`hs-crown-card${item.clashIndex >= 0 ? " hs-crown-card--match" : ""}`}
                data-crown-card={item.key}
                data-crown-league={item.leagueId}
                data-crown-kind={item.clashIndex >= 0 ? "match" : "league"}
                data-crown-state={item.clashIndex >= 0 ? matches[item.clashIndex]?.state ?? "unconfirmed" : undefined}
                data-crown-offset={offset}
                draggable={false}
                role="button"
                aria-haspopup="dialog"
                onKeyDown={event => {
                  if (event.key === " ") { event.preventDefault(); event.currentTarget.click(); }
                }}
                tabIndex={isFront ? 0 : -1}
                aria-hidden={!isFront ? "true" : undefined}
                style={
                  {
                    "--hs-glow": item.stageGlow,
                    "--hs-split": item.splitGradient,
                  } as CSSProperties
                }
                onClick={(e) => {
                  if (didDragRef.current) {
                    e.preventDefault();
                    didDragRef.current = false;
                    return;
                  }
                  e.preventDefault();
                  e.currentTarget.focus({ preventScroll: true });
                  setSharedActiveIndex(idx);
                  setExpandedTab(null);
                  setExpandedKey(item.key);
                }}
              >
                {item.clashIndex >= 0 ? <>
                  <span className="sr-only">{clashSummary(matches[item.clashIndex] ?? null, clashes[item.clashIndex])}</span>
                  <CrownClashSlide parts active={isFront && !expandedKey} clash={clashes[item.clashIndex]} match={matches[item.clashIndex] ?? null} />
                </> : <span className="hs-crown-card-top">
                  <span className="hs-crown-match-art hs-crown-league-background" data-league-card-background={item.leagueId} aria-hidden="true">
                    <LeagueIconBadge leagueId={item.leagueId} iconSrc={CROWN_CUP_LOGOS[item.leagueId]} size={132} eager={isFront} />
                  </span>
                  <span className="hs-crown-card-meta">
                    <span className="hs-crown-league-name">{item.shortName}</span>
                    {item.leader && <span className="sr-only">متصدر البطولة: {item.leader.name}</span>}
                  </span>
                  <span className="hs-mini-trophy">
                    <CrownLeagueTrophy leagueId={item.leagueId} />
                  </span>
                </span>
                }
                {item.clashIndex < 0 && (
                  <>
                    <span className="hs-crown-slide-band hs-crown-slide-band--top" data-crown-part="rates" aria-hidden="true">
                      <span className="lc-top-twin">
                        <span className="lc-top-twin-duel">
                          {[
                            { key: "best-attack", label: "أقوى هجوم", club: item.bestAttack, Icon: GoldenBootMedalIcon, unit: "is-coral" },
                            { key: "best-defence", label: "أقوى دفاع", club: item.bestDefence, Icon: GuardianShieldMedalIcon, unit: "is-emerald" },
                          ].flatMap(({ key, label, club, Icon, unit }, sideIndex) => [
                            /* فاصل الماسة بين العمودين: عمود الشبكة الأوسط (14px)
                               له، ومن دونه تسقط البطاقة الثانية في 14px نفسها */
                            ...(sideIndex ? [<MiniDuelDiamond key={`${key}-sep`} />] : []),
                            <span key={key} className="lc-top-twin-side" data-stat-metric={key}>
                              <span className="lc-top-twin-head">
                                <Icon idSuffix={`crown-${key}-${item.leagueId}`} />
                                <span className="lc-top-metric-label">{label}</span>
                              </span>
                              <span className="lc-top-twin-val-row">
                                <strong className="lc-top-metric-val" data-stat-value="">
                                  <bdi dir="ltr">{club ? club.rate.toFixed(2) : "—"}</bdi>
                                </strong>
                                {club && <span className={`lc-top-metric-unit ${unit}`}>هدف/م</span>}
                              </span>
                              <span className="lc-top-club-row">
                                {club && <HeroClubCrest club={club} />}
                                <span className="lc-top-metric-team" data-stat-team="">
                                  <bdi dir="ltr">{club ? club.name : "—"}</bdi>
                                </span>
                              </span>
                            </span>,
                          ])}
                        </span>
                        <span className="lc-top-twin-goals" data-stat-metric="total-goals">
                          <GoalsNetBurstIcon className="lc-top-twin-net" />
                          <span className="lc-top-twin-goals-label">إجمالي الأهداف</span>
                          <strong className="lc-top-twin-goals-val" data-stat-value="">
                            <bdi dir="ltr">{item.totalGoals !== null ? item.totalGoals.toLocaleString("en-US") : "—"}</bdi>
                          </strong>
                          {item.totalGoals !== null && <span className="lc-top-twin-goals-unit">هدفاً</span>}
                        </span>
                      </span>
                    </span>
                    <span className="hs-crown-slide-band hs-crown-slide-band--bottom" data-crown-part="leader" aria-hidden="true">
                      <span className="lc-grades-box">
                        <GradesIcon />
                        <span className="lc-grades-copy">
                          {item.leader && <span className="hs-crown-leader-pill">
                            <HeroClubCrest club={item.leader} />
                            <span className="hs-crown-leader-name"><bdi dir="ltr">{item.leader.name}</bdi></span>
                          </span>}
                          <span className="lc-grades-label">نقاط المتصدّر</span>
                          <span className="lc-grades-num" data-leader-points="">
                            {item.leader ? (
                              <>
                                <bdi dir="ltr">{item.leader.points}</bdi>
                                <small>نقطة</small>
                              </>
                            ) : (
                              "—"
                            )}
                          </span>
                          {item.leader ? (
                            <span className="lc-grades-meta" data-leader-meta="">
                              لعب <bdi dir="ltr">{item.leader.played}</bdi> · فارق{" "}
                              <bdi dir="ltr">{item.leader.gd > 0 ? `+${item.leader.gd}` : item.leader.gd}</bdi>
                            </span>
                          ) : (
                            <span className="lc-grades-meta">جدول الترتيب قيد التحديث</span>
                          )}
                          {item.leader && item.leader.ppm !== null && (
                            <span className="lc-grades-rates" data-leader-rates="">
                              نقاط/م <bdi dir="ltr">{item.leader.ppm.toFixed(2)}</bdi> · هجوم/م{" "}
                              <bdi dir="ltr">{item.bestAttack ? item.bestAttack.rate.toFixed(2) : "—"}</bdi>
                            </span>
                          )}
                        </span>
                      </span>
                      <MedalRibbonIcon idSuffix={`crown-${item.leagueId}`} />
                    </span>
                  </>
                )}
                <span className="hs-crown-split" aria-hidden="true" />
              </a>
            );
          })}

        </div>

        <aside className="hs-crown-sidebar" aria-label="خيارات المباريات والبطولات">
          <div className="hs-crown-sidebar-heading"><strong>المباريات والبطولات</strong><span>استكشف</span></div>
          <div className="hs-crown-tabs" role="group" aria-label={shellItem ? `تفاصيل ${shellItem.shortName}` : 'اختيارات الشريط'}>
            <button type="button" aria-pressed={leagueOnly} onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); setSharedActiveIndex(0); setDayView(null); setLeagueOnly(true); }}><span className="hs-crown-tab-content"><svg className="hs-crown-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M8 4h8v5a4 4 0 0 1-8 0V4ZM8 6H4v2a4 4 0 0 0 4 4M16 6h4v2a4 4 0 0 1-4 4M12 13v4M8 20h8M9 17h6"/></svg><span>البطولات</span></span></button>
            {shellItem && ([['match', 'المباراة'], ['standings', 'جدول الترتيب'], ['stats', 'إحصائيات']] as const).map(([tab, label]) => (
              <button key={tab} type="button" aria-haspopup="dialog" onPointerDown={event => event.stopPropagation()} onClick={event => {
                event.stopPropagation();
                setExpandedTab(tab);
                setExpandedKey(shellItem.key);
              }}><span className="hs-crown-tab-content"><svg className="hs-crown-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                {tab === 'match' ? <><circle cx="12" cy="12" r="9" /><path d="m12 8 3 2.2-1.2 3.5h-3.6L9 10.2 12 8ZM12 3v3M3.5 9l3 1M5 17l2.5-1.5M19 17l-2.5-1.5M20.5 9l-3 1" /></> : tab === 'standings' ? <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M9 4v16M3 14.5h18" /></> : <><path d="M4 20h16M6 17v-5h3v5M11 17V7h3v10M16 17v-8h3v8" /></>}
              </svg><span>{label}</span></span></button>
            ))}
            {onNewsOpenChange && <button type="button" className="hs-crown-news-tab" onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); onNewsOpenChange(true); }}><span className="hs-crown-tab-content"><svg className="hs-crown-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h4v4H7zM14 8h4M14 12h4M7 16h11"/></svg><span>الأخبار</span></span></button>}
          </div>
          <div className="hs-crown-sidebar-label">اختر يوم المباريات</div>
        <DayButtons selected={dayView} onSelect={day => { setSharedActiveIndex(0); setLeagueOnly(false); setDayView(day); }} />
        {(dayView || leagueOnly) && <button type="button" className="hs-day-clear" onClick={() => { setSharedActiveIndex(0); setDayView(null); setLeagueOnly(false); }}>عرض جميع البطاقات</button>}
        {dayView && matchesStatus === "stale" && <p className="hs-day-warning" role="status">تعذّر تحديث بعض بيانات المباريات؛ المعروض من آخر بيانات متاحة وقد لا يكون محدثاً.</p>}
        </aside>
        <div className="hs-crown-controls">
          <button type="button" className="hs-crown-autoplay" aria-pressed={autoplayStopped} onClick={() => setAutoplayStopped(value => !value)}>
            {autoplayStopped ? "تشغيل الشريط" : "إيقاف الشريط"}
          </button>
          <button
            type="button"
            className="hs-crown-arrow"
            onClick={() => step(1)}
            aria-label="البطولة التالية في شريط الهيرو"
          >
            ›
          </button>
          <span className="hs-crown-counter" dir="ltr" role="status" aria-live="off" aria-label={`الشريحة ${items.length ? active + 1 : 0} من ${items.length}`}>
            {items.length ? (active % items.length) + 1 : 0}/{items.length}
          </span>
          <button
            type="button"
            className="hs-crown-arrow"
            onClick={() => step(-1)}
            aria-label="البطولة السابقة في شريط الهيرو"
          >
            ‹
          </button>
        </div>
        </>}
      </div>
      {expandedItem && expandedTab === 'standings' && (
        <CrownFullscreen label={`جدول ترتيب ${expandedItem.shortName}`} closeLabel="إغلاق جدول الترتيب" glow={expandedItem.stageGlow} onClose={() => setExpandedKey(null)}>
          <CrownStandings item={expandedItem} record={standingsMap[expandedItem.standingsKey]} />
        </CrownFullscreen>
      )}
      {expandedItem && (expandedTab === 'stats' || (expandedTab === null && expandedItem.clashIndex < 0)) && (
        <CrownFullscreen label={`إحصائيات بطولة ${expandedItem.shortName}`} closeLabel="إغلاق إحصائيات البطولة" glow={expandedItem.stageGlow} onClose={() => setExpandedKey(null)}>
          <CrownLeagueDetails item={expandedItem} />
        </CrownFullscreen>
      )}
      {expandedItem && expandedTab === 'match' && expandedItem.clashIndex < 0 && (
        <CrownFullscreen label={`المباراة - ${expandedItem.shortName}`} closeLabel="إغلاق المباراة" glow={expandedItem.stageGlow} onClose={() => setExpandedKey(null)}>
          <div className="crown-league-details"><h2>المباراة</h2><p>لا توجد مباراة محددة لهذه البطاقة.</p></div>
        </CrownFullscreen>
      )}
      {expandedItem && expandedItem.clashIndex >= 0 && (expandedTab === 'match' || expandedTab === null) && (
        <CrownMatchFullscreen glow={expandedItem.stageGlow} clash={clashes[expandedItem.clashIndex]} match={matches[expandedItem.clashIndex] ?? null} onClose={() => setExpandedKey(null)} />
      )}
    </section>
  );
}

function CrownStandings({ item, record }: { item: HeroLeagueData; record?: LiveLeagueRecord }) {
  const table = record?.table;
  const status = !table ? (record?.status === 'loading' ? 'جارٍ تحميل جدول الترتيب' : 'جدول الترتيب غير متاح لهذه البطولة حالياً')
    : record?.stale ? 'آخر بيانات متاحة — قد تكون غير محدثة' : record?.source === 'live' ? 'بيانات مباشرة من المصدر' : 'بيانات جدول محفوظة';
  return <div className="crown-league-details crown-standings" dir="rtl">
    <h2>جدول ترتيب {item.shortName}</h2>
    <p className="crown-standings-source" role="status">{status}{table ? ` · ${table.provider} · ${table.season}` : ''}</p>
    {table && <div className="crown-standings-scroll"><table>
      <thead><tr><th scope="col">الترتيب</th><th scope="col">الفريق</th><th scope="col">لعب</th><th scope="col">فاز</th><th scope="col">تعادل</th><th scope="col">خسر</th><th scope="col">الفارق</th><th scope="col">النقاط</th></tr></thead>
      <tbody>{table.entries.map(entry => <tr key={entry.teamId}><td>{entry.rank}</td><th scope="row">{entry.name}</th><td>{entry.played ?? '—'}</td><td>{entry.wins ?? '—'}</td><td>{entry.draws ?? '—'}</td><td>{entry.losses ?? '—'}</td><td>{entry.goalDifference ?? '—'}</td><td>{entry.points ?? '—'}</td></tr>)}</tbody>
    </table></div>}
  </div>;
}

/* ==========================================================================
   2) شريط إحصائيات البطولة الحية — أسفل التذكرة الرئيسية مباشرةً
      يتزامن لحظياً مع البطولة النشطة في التاج المداري ثلاثي الأبعاد أعلاه
========================================================================== */
export function HeroLeagueStatsBar({ clashes = NO_CLASHES }: { clashes?: FeaturedClash[] }) {
  const items = withClashLeagues(useHeroLeagueItems(), clashes);
  const interactionPause = useCrownInteractionPause();
  const { leagueId } = useSharedCrownState();
  const current = items.find(item => item.leagueId === leagueId) ?? items[0];

  if (!current) return null;
  return <CrownStatsPanels current={current} interactionPause={interactionPause} />;
}

/** The exact same panels serve the ticket row and the fullscreen league card. */
function CrownStatsPanels({ current, fullscreen = false, interactionPause }: {
  current: HeroLeagueData; fullscreen?: boolean; interactionPause?: ReturnType<typeof useCrownInteractionPause>;
}) {
  return (
    <section
      className="hero-crown-stats-bar"
      aria-label="إحصائيات وترتيب البطولة النشطة"
      data-hero-league-stats={fullscreen ? undefined : "crown3d"}
      data-fullscreen-stats={fullscreen ? current.leagueId : undefined}
      {...interactionPause}
    >
      <div className="hs-stats-bar-grid">
        {/* بطاقة تعريف البطولة النشطة (يميناً تحت تذكرة المواعيد، وعلى الجوال شريط علوي أنيق) */}
        <a
          key={`stats-id-${current.leagueId}`}
          href={fullscreen ? undefined : current.href}
          className="hs-stats-identity"
          data-crown-stats-league={fullscreen ? undefined : current.leagueId}
          style={
            {
              "--hs-glow": current.stageGlow,
              "--hs-split": current.splitGradient,
            } as CSSProperties
          }
        >
          <span className="hs-stats-identity-copy">
            <span className="hs-stats-identity-kicker">إحصائيات وترتيب</span>
            <span className="hs-stats-identity-title">{current.shortName}</span>
          </span>
          <span className="hs-stats-identity-trophy">
            <CrownLeagueTrophy leagueId={current.leagueId} />
          </span>
          <span className="hs-stats-identity-split" aria-hidden="true" />
        </a>

        {/* لوح الإحصائيات المزدوج أسفل التذكرة الرئيسية مباشرةً */}
        <div className="hs-stats-wings-pair">
          {/* اللوح الأيمن: متصدّر البطولة ونقاطه ومعدّله */}
          <a
            key={`wing-leader-${current.leagueId}`}
            href={fullscreen ? undefined : current.href}
            className="hs-crown-wing hs-crown-wing--leader"
            data-crown-wing="leader"
          >
            {current.leader ? (
              <>
                <span className="hs-leader-wing-main">
                  <HeroClubCrest club={current.leader} size="md" />
                  <span className="hs-leader-wing-copy">
                    <span className="hs-leader-wing-kicker">متصدّر البطولة</span>
                    <span className="hs-leader-wing-club" data-crown-leader-name="">
                      <bdi dir="ltr">{current.leader.name}</bdi>
                    </span>
                  </span>
                </span>
                <span className="hs-leader-wing-numbers">
                  <span className="hs-leader-wing-pts" data-crown-leader-points="">
                    <bdi dir="ltr">{current.leader.points}</bdi> <small>نقطة</small>
                  </span>
                  <span className="hs-leader-wing-meta">
                    لعب <bdi dir="ltr">{current.leader.played}</bdi> · فارق{" "}
                    <bdi dir="ltr">
                      {current.leader.gd > 0 ? `+${current.leader.gd}` : current.leader.gd}
                    </bdi>
                    {current.leader.ppm !== null ? (
                      <>
                        {" "}· <bdi dir="ltr">{current.leader.ppm.toFixed(2)}</bdi> ن/م
                      </>
                    ) : null}
                  </span>
                </span>
              </>
            ) : fullscreen ? <p>بيانات المتصدّر غير متاحة حاليًا لهذه البطولة.</p> : null}
          </a>

          {/* اللوح الأيسر: وساما أقوى هجوم وأقوى دفاع بأيقونات الأندية وإجمالي الأهداف */}
          <a
            key={`wing-stats-${current.leagueId}`}
            href={fullscreen ? undefined : current.href}
            className="hs-crown-wing hs-crown-wing--stats"
            data-crown-wing="stats"
          >
            {current.bestAttack && (
              <span className="hs-stat-wing" data-crown-metric="best-attack">
                <span className="hs-stat-wing-head">
                  <GoldenBootMedalIcon
                    className="hs-stat-medal"
                    idSuffix={`${fullscreen ? "fullscreen" : "hero"}-att-${current.leagueId}`}
                  />
                  <span className="hs-stat-kicker">أقوى هجوم</span>
                </span>
                <span className="hs-stat-club">
                  <HeroClubCrest club={current.bestAttack} />
                  <span className="hs-stat-club-name">
                    <bdi dir="ltr">{current.bestAttack.name}</bdi>
                  </span>
                </span>
                <span className="hs-stat-rate">
                  <bdi dir="ltr">{current.bestAttack.rate.toFixed(2)}</bdi>
                  <small>هدف/م</small>
                </span>
              </span>
            )}
            {fullscreen && !current.bestAttack && <p>إحصائيات الهجوم غير متاحة حاليًا.</p>}
            <span className="hs-stat-divider" aria-hidden="true" />
            {current.bestDefence && (
              <span className="hs-stat-wing" data-crown-metric="best-defence">
                <span className="hs-stat-wing-head">
                  <GuardianShieldMedalIcon
                    className="hs-stat-medal"
                    idSuffix={`${fullscreen ? "fullscreen" : "hero"}-def-${current.leagueId}`}
                  />
                  <span className="hs-stat-kicker">أقوى دفاع</span>
                </span>
                <span className="hs-stat-club">
                  <HeroClubCrest club={current.bestDefence} />
                  <span className="hs-stat-club-name">
                    <bdi dir="ltr">{current.bestDefence.name}</bdi>
                  </span>
                </span>
                <span className="hs-stat-rate">
                  <bdi dir="ltr">{current.bestDefence.rate.toFixed(2)}</bdi>
                  <small>هدف/م</small>
                </span>
              </span>
            )}
            {fullscreen && !current.bestDefence && <p>إحصائيات الدفاع غير متاحة حاليًا.</p>}
            {fullscreen && current.totalGoals === null && <p>إجمالي الأهداف غير متاح حاليًا.</p>}
            {current.totalGoals !== null && (
              <span className="hs-stat-goals-pill" data-crown-metric="total-goals">
                <span className="hs-stat-goals-num">
                  <bdi dir="ltr">{current.totalGoals}</bdi>
                </span>
                <span className="hs-stat-goals-lbl">هدف</span>
              </span>
            )}
          </a>
        </div>
      </div>
    </section>
  );
}
