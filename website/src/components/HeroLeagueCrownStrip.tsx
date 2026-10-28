import { LEAGUE_TICKET_PLAYERS } from "../content/league-ticket-players";
import { TicketImage } from "./TicketImage";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import { leagueLandingsInPageOrder } from "../content/competitions";
import { providerTeamLogo } from "../lib/leader-logo.mjs";
import { STANDINGS_LEAGUES } from "../lib/standings.mjs";
import {
  refreshLiveLeaguesStandings,
  useLiveStandingsMap,
  type LiveLeagueRecord,
} from "../lib/live-standings";
import { resolveApprovedTeamLogo, teamInitials } from "./StandingsRatesCard";
import LeagueTrophyWithEmblem, { getLeagueTrophyTheme } from "./LeagueTrophySvg";
import {
  GoldenBootMedalIcon,
  GuardianShieldMedalIcon,
} from "./LeagueTopDrawerIcons";
import "./league-carousel.css";
import "./hero-league-strip.css";

const STANDINGS_LEAGUE_IDS = STANDINGS_LEAGUES.map((entry) => entry.id);
const REFRESH_MS = 5 * 60 * 1000;
const STEP_INTERVAL_MS = 5000;

/* ── مخزن تزامن مشترك بين التاج المداري (أعلى التذكرة) وشريط الإحصائيات (أسفل التذكرة الرئيسية) ── */
let sharedActiveIndex = 0;
let sharedPauseCount = 0;
const crownListeners = new Set<() => void>();

function emitCrownChange() {
  crownListeners.forEach((fn) => fn());
}

function setSharedActiveIndex(next: number) {
  if (sharedActiveIndex === next) return;
  sharedActiveIndex = next;
  emitCrownChange();
}

function stepSharedActiveIndex(delta: number, total: number) {
  if (total < 1) return;
  sharedActiveIndex = ((sharedActiveIndex + delta) % total + total) % total;
  emitCrownChange();
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
    () => `${sharedActiveIndex}:${sharedPauseCount > 0 ? 1 : 0}`,
    () => "0:0",
  );
  const [idxStr, pausedStr] = snapshot.split(":");
  return {
    active: Number(idxStr) || 0,
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

/* ==========================================================================
   1) شريط التاج المداري ثلاثي الأبعاد للبطولات الثماني — أعلى تذكرة الهيرو
========================================================================== */
export default function HeroLeagueCrownStrip() {
  const items = useHeroLeagueItems();
  const interactionPause = useCrownInteractionPause();
  const { active, paused } = useSharedCrownState();
  const [dragging, setDragging] = useState(false);
  const [dragX, setDragX] = useState(0);
  const rootRef = useRef<HTMLElement | null>(null);
  const dragStartRef = useRef<{ x: number; pointerId: number } | null>(null);
  const didDragRef = useRef(false);

  // إعادة التعيين إلى البطولة الأولى عند تركيب المكوّن
  useEffect(() => {
    sharedActiveIndex = 0;
    sharedPauseCount = 0;
  }, []);

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
    if (paused || dragging || items.length < 2) return;
    const id = window.setInterval(() => {
      if (document.hidden || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
      stepSharedActiveIndex(1, items.length);
    }, STEP_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [paused, dragging, items.length]);

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
    >
      <div
        className={`hs-crown-shell${dragging ? " is-dragging" : ""}`}
        style={dragX !== 0 ? ({ "--hs-drag-x": `${dragX}px` } as CSSProperties) : undefined}
        {...interactionPause}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            step(1);
          } else if (e.key === "ArrowRight") {
            e.preventDefault();
            step(-1);
          }
        }}
      >
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
          {items.map((item, idx) => {
            const offset = getOffset(idx);
            const isFront = offset === "0";
            return (
              <a
                key={item.leagueId}
                href={item.href}
                className="hs-crown-card"
                data-crown-card={item.leagueId}
                data-crown-offset={offset}
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
                  if (!isFront) {
                    e.preventDefault();
                    setSharedActiveIndex(idx);
                  }
                }}
              >
                <span className="hs-crown-card-top">
                  <span className="hs-crown-players" aria-hidden="true">
                    {(LEAGUE_TICKET_PLAYERS[item.leagueId] ?? []).map((src, index) => (
                      <TicketImage key={src} className={`hs-crown-player hs-crown-player--${index + 1}`} src={src} alt="" loading="lazy" decoding="async" />
                    ))}
                  </span>
                  <span className="hs-crown-card-meta">
                    <span className="hs-crown-league-name">{item.shortName}</span>
                    {item.leader && (
                      <span className="hs-crown-leader-pill">
                        <HeroClubCrest club={item.leader} />
                        <span className="hs-crown-leader-name">
                          <bdi dir="ltr">{item.leader.name}</bdi>
                        </span>
                      </span>
                    )}
                  </span>
                  <span className="hs-mini-trophy">
                    <LeagueTrophyWithEmblem leagueId={item.leagueId} variant="authentic" />
                  </span>
                </span>
                <span className="hs-crown-split" aria-hidden="true" />
              </a>
            );
          })}
        </div>

        <div className="hs-crown-controls">
          <button
            type="button"
            className="hs-crown-arrow"
            onClick={() => step(1)}
            aria-label="البطولة التالية في شريط الهيرو"
          >
            ›
          </button>
          <div className="hs-crown-dots">
            {items.map((item, idx) => (
              <button
                key={item.leagueId}
                type="button"
                className={`hs-crown-dot${idx === active ? " is-active" : ""}`}
                onClick={() => setSharedActiveIndex(idx)}
                aria-label={item.shortName}
                aria-current={idx === active ? "true" : undefined}
              />
            ))}
          </div>
          <button
            type="button"
            className="hs-crown-arrow"
            onClick={() => step(-1)}
            aria-label="البطولة السابقة في شريط الهيرو"
          >
            ‹
          </button>
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
   2) شريط إحصائيات البطولة الحية — أسفل التذكرة الرئيسية مباشرةً
      يتزامن لحظياً مع البطولة النشطة في التاج المداري ثلاثي الأبعاد أعلاه
========================================================================== */
export function HeroLeagueStatsBar() {
  const items = useHeroLeagueItems();
  const interactionPause = useCrownInteractionPause();
  const { active } = useSharedCrownState();
  const current = items[active] ?? items[0];

  if (!current) return null;

  return (
    <section
      className="hero-crown-stats-bar"
      aria-label="إحصائيات وترتيب البطولة النشطة"
      data-hero-league-stats="crown3d"
      {...interactionPause}
    >
      <div className="hs-stats-bar-grid">
        {/* بطاقة تعريف البطولة النشطة (يميناً تحت تذكرة المواعيد، وعلى الجوال شريط علوي أنيق) */}
        <a
          key={`stats-id-${current.leagueId}`}
          href={current.href}
          className="hs-stats-identity"
          data-crown-stats-league={current.leagueId}
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
            <LeagueTrophyWithEmblem leagueId={current.leagueId} variant="authentic" />
          </span>
          <span className="hs-stats-identity-split" aria-hidden="true" />
        </a>

        {/* لوح الإحصائيات المزدوج أسفل التذكرة الرئيسية مباشرةً */}
        <div className="hs-stats-wings-pair">
          {/* اللوح الأيمن: متصدّر البطولة ونقاطه ومعدّله */}
          <a
            key={`wing-leader-${current.leagueId}`}
            href={current.href}
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
            ) : null}
          </a>

          {/* اللوح الأيسر: وساما أقوى هجوم وأقوى دفاع بأيقونات الأندية وإجمالي الأهداف */}
          <a
            key={`wing-stats-${current.leagueId}`}
            href={current.href}
            className="hs-crown-wing hs-crown-wing--stats"
            data-crown-wing="stats"
          >
            {current.bestAttack && (
              <span className="hs-stat-wing" data-crown-metric="best-attack">
                <span className="hs-stat-wing-head">
                  <GoldenBootMedalIcon
                    className="hs-stat-medal"
                    idSuffix={`hero-att-${current.leagueId}`}
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
            <span className="hs-stat-divider" aria-hidden="true" />
            {current.bestDefence && (
              <span className="hs-stat-wing" data-crown-metric="best-defence">
                <span className="hs-stat-wing-head">
                  <GuardianShieldMedalIcon
                    className="hs-stat-medal"
                    idSuffix={`hero-def-${current.leagueId}`}
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
