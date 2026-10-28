import { useEffect, useRef, useState, type CSSProperties } from "react";
import { leagueLandingsInPageOrder, type LeagueLanding } from "../content/competitions";
import { providerTeamLogo } from "../lib/leader-logo.mjs";
import { STANDINGS_LEAGUES } from "../lib/standings.mjs";
import {
  ensureLiveLeagueStandings,
  getLiveLeagueRecord,
  refreshLiveLeaguesStandings,
  useLiveStandingsMap,
  type LiveLeagueRecord,
} from "../lib/live-standings";
import { resolveApprovedTeamLogo, teamInitials } from "./StandingsRatesCard";
import CarouselControls from "./CarouselControls";
import LeagueTrophyWithEmblem, { getLeagueTrophyTheme } from "./LeagueTrophySvg";
import {
  GoalsNetBurstIcon,
  GoldenBootMedalIcon,
  GuardianShieldMedalIcon,
  MiniDuelDiamond,
} from "./LeagueTopDrawerIcons";
import { useRingCarousel } from "./useRingCarousel";
import "./league-carousel.css";

const REFRESH_MS = 300_000;
const STANDINGS_LEAGUE_IDS = STANDINGS_LEAGUES.map((entry) => entry.id);

type RingSlot = "front" | "near" | "side" | "back";

export interface LeagueCarouselItem {
  href: string;
  label: string;
  leagueId: string;
  standingsLeagueId?: string | null;
}

function standingsLeagueKey(landing: LeagueLanding): string {
  return landing.standings?.leagueId ?? landing.leagueId;
}

function computeRingSlot(index: number, activeIndex: number, count: number): RingSlot {
  if (count <= 0) return "front";
  const raw = Math.abs(index - activeIndex) % count;
  const dist = Math.min(raw, count - raw);
  if (dist === 0) return "front";
  if (dist === 1) return "near";
  if (dist === 2) return "side";
  return "back";
}

interface ClubCrestInfo {
  name: string;
  initials: string;
  logo: string | null;
  localFallback: string | null;
  source: "espn" | "highlightly" | "local";
}

interface LeaderInfo extends ClubCrestInfo {
  points: number;
  played: number;
  goalDifference: number;
  ppm: number | null;
  attackRate: number | null;
}

interface StatTeamMetric extends ClubCrestInfo {
  rate: number;
}

interface LeagueStatsSummary {
  bestAttack: StatTeamMetric | null;
  bestDefence: StatTeamMetric | null;
  totalGoals: number | null;
  season: number | string | null;
  status: "ready" | "empty" | "failed";
  stale: boolean;
}

function formatSignedDiff(diff: number): string {
  if (diff > 0) return `+${diff}`;
  return String(diff);
}

function clubMonogramLetters(name: string): string {
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

function resolveClubCrest(
  team: { teamId?: string; name: string; logo?: string | null },
  provider: string,
  sKey: string,
  useRawInitials = false,
): ClubCrestInfo {
  const localFallback = resolveApprovedTeamLogo({ name: team.name });
  const providerLogo = providerTeamLogo({
    teamId: team.teamId,
    provider,
    logo: team.logo ?? null,
  });
  return {
    name: team.name,
    initials: useRawInitials ? teamInitials(team.name) : clubMonogramLetters(team.name),
    logo: providerLogo ?? localFallback,
    localFallback: providerLogo ? localFallback : null,
    source: providerLogo ? (sKey === "egy.1" ? "highlightly" : "espn") : "local",
  };
}

/**
 * يستخرج بيانات المتصدّر ومعدّلات الجدول القابل للفرز (نقاط/مباراة وهجوم/مباراة)
 * مباشرة من سجل الترتيب الحي أو اللقطة الموثّقة — بلا أي اعتماد على الأرشيف.
 */
function resolveLeagueLeader(record: LiveLeagueRecord | undefined, sKey: string): LeaderInfo | null {
  const top = record?.leader ?? record?.table?.entries?.[0];
  if (!top?.name) return null;

  const provider = record?.table?.provider ?? (sKey === "egy.1" ? "Highlightly" : "ESPN");
  const crest = resolveClubCrest(
    {
      teamId: top.teamId,
      name: top.name,
      logo: (top as { logo?: string | null }).logo ?? null,
    },
    provider,
    sKey,
    true,
  );

  const played = Number(top.played ?? 0);
  const points = Number(top.points ?? 0);
  const goalsFor = Number(top.goalsFor ?? 0);
  const goalDifference = Number(top.goalDifference ?? goalsFor - Number(top.goalsAgainst ?? 0));

  const ppm = record?.leaderRates?.ppm ?? (played > 0 ? points / played : null);
  const attackRate = record?.leaderRates?.attack ?? (played > 0 ? goalsFor / played : null);

  return {
    ...crest,
    points,
    played,
    goalDifference,
    ppm,
    attackRate,
  };
}

/**
 * يستخرج مقاييس «إحصائيات البطولات» الثلاثة (أقوى هجوم · أقوى دفاع · إجمالي الأهداف)
 * مع شعارات الفرق من نفس سجل جدول الترتيب الحي / الجدول القابل للفرز.
 */
function resolveLeagueStats(record: LiveLeagueRecord | undefined, sKey: string): LeagueStatsSummary {
  const rates = record?.rates ?? null;
  const entries = record?.table?.entries ?? [];
  const provider = record?.table?.provider ?? (sKey === "egy.1" ? "Highlightly" : "ESPN");

  const bestAttackRow = rates?.bestAttack?.[0] ?? null;
  const bestDefenceRow = rates?.bestDefence?.[0] ?? null;
  const hasRates = Boolean(rates && rates.rows.length > 0);
  const status: LeagueStatsSummary["status"] = hasRates
    ? "ready"
    : record?.status === "failed"
      ? "failed"
      : "empty";

  const findEntryLogo = (teamId?: string, name?: string) => {
    const match = entries.find(
      (entry) =>
        (teamId && String(entry.teamId) === String(teamId)) ||
        (name && entry.name === name),
    );
    return (match as { logo?: string | null } | undefined)?.logo ?? null;
  };

  return {
    bestAttack:
      bestAttackRow && bestAttackRow.attack !== null
        ? {
            ...resolveClubCrest(
              {
                teamId: bestAttackRow.teamId,
                name: bestAttackRow.name,
                logo: findEntryLogo(bestAttackRow.teamId, bestAttackRow.name),
              },
              provider,
              sKey,
            ),
            rate: bestAttackRow.attack,
          }
        : null,
    bestDefence:
      bestDefenceRow && bestDefenceRow.defence !== null
        ? {
            ...resolveClubCrest(
              {
                teamId: bestDefenceRow.teamId,
                name: bestDefenceRow.name,
                logo: findEntryLogo(bestDefenceRow.teamId, bestDefenceRow.name),
              },
              provider,
              sKey,
            ),
            rate: bestDefenceRow.defence,
          }
        : null,
    totalGoals: hasRates && rates ? rates.league.totalGoals : null,
    season: record?.table?.season ?? null,
    status,
    stale: Boolean(record?.stale || record?.table?.stale),
  };
}

/** أيقونة شعار النادي داخل المنسدلة العلوية (مع بديل الشعار المحلي ثم الأحرف الأولى) */
function StatClubCrest({ club }: { club: ClubCrestInfo }) {
  const [src, setSrc] = useState<string | null>(club.logo);
  const [source, setSource] = useState<ClubCrestInfo["source"]>(club.source);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setSrc(club.logo);
    setSource(club.source);
    setBroken(false);
  }, [club.logo, club.source]);

  const handleError = () => {
    if (club.localFallback && src !== club.localFallback) {
      setSrc(club.localFallback);
      setSource("local");
    } else {
      setBroken(true);
    }
  };

  return (
    <span className="lc-top-club-crest" aria-hidden="true">
      <span className="lc-top-club-initials">{club.initials}</span>
      {src && (
        <img
          ref={(image) => {
            if (image && image.complete && image.naturalWidth === 0) handleError();
          }}
          className="lc-top-club-logo"
          src={src}
          data-stat-crest-source={source}
          alt=""
          width={22}
          height={22}
          loading="lazy"
          decoding="async"
          aria-hidden="true"
          draggable={false}
          style={broken ? { visibility: "hidden" } : undefined}
          onError={handleError}
        />
      )}
    </span>
  );
}

function LeaderRow({ leader }: { leader: LeaderInfo | null }) {
  const [src, setSrc] = useState<string | null>(leader?.logo ?? null);
  const [source, setSource] = useState<LeaderInfo["source"]>(leader?.source ?? "local");
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setSrc(leader?.logo ?? null);
    setSource(leader?.source ?? "local");
    setBroken(false);
  }, [leader?.logo, leader?.source]);

  if (!leader) {
    return (
      <span className="lc-leader-row">
        <span className="lc-leader-tag">جدول الترتيب قيد التحديث</span>
      </span>
    );
  }

  const handleError = () => {
    if (leader.localFallback && src !== leader.localFallback) {
      setSrc(leader.localFallback);
      setSource("local");
    } else {
      setBroken(true);
    }
  };

  return (
    <span className="lc-leader-row">
      <span className="league-carousel-banner">
        <span className="league-carousel-monogram" aria-hidden="true">
          <span>{leader.initials}</span>
          <small>#1</small>
        </span>
        {src && (
          <img
            ref={(image) => {
              if (image && image.complete && image.naturalWidth === 0) handleError();
            }}
            className="league-carousel-leader-logo"
            src={src}
            data-crest-source={source}
            alt=""
            width={32}
            height={32}
            loading="lazy"
            decoding="async"
            aria-hidden="true"
            draggable={false}
            style={broken ? { visibility: "hidden" } : undefined}
            onError={handleError}
          />
        )}
      </span>
      <span className="league-carousel-leader">
        <span className="lc-leader-tag">المتصدّر</span>
        <strong className="lc-leader-name">
          <bdi dir="ltr">{leader.name}</bdi>
        </strong>
      </span>
    </span>
  );
}

/** أيقونة المنصّة ذات الثلاثة أعمدة في المنسدلة السفلية */
function GradesIcon() {
  return (
    <svg className="lc-grades-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <path
        d="M10 3C9.44772 3 9 3.44772 9 4V20H15V4C15 3.44772 14.5523 3 14 3H10Z"
        fill="#2b4eff"
      />
      <path
        d="M4 10C3.44772 10 3 10.4477 3 11V20H7V10H4Z"
        fill="#f59e0b"
      />
      <path
        d="M17 14V20H21V15C21 14.4477 20.5523 14 20 14H17Z"
        fill="#38bdf8"
      />
    </svg>
  );
}

/** ميدالية بشريط في المنسدلة السفلية */
function MedalRibbonIcon({ idSuffix = "ring" }: { idSuffix?: string }) {
  const gradId = `lcMedalGold-${idSuffix}`;
  return (
    <svg className="lc-medals" viewBox="0 0 48 48" fill="none" aria-hidden="true" focusable="false">
      <path d="M16 4H23L26 17H19L16 4Z" fill="#2b4eff" />
      <path d="M32 4H25L22 17H29L32 4Z" fill="#60a5fa" />
      <circle cx="24" cy="28" r="14" fill={`url(#${gradId})`} stroke="#d97706" strokeWidth="1.5" />
      <circle cx="24" cy="28" r="10.2" stroke="#fef3c7" strokeWidth="1.1" strokeOpacity="0.85" />
      <path
        d="M24 20.6L26.08 24.82L30.74 25.5L27.37 28.78L28.17 33.42L24 31.23L19.83 33.42L20.63 28.78L17.26 25.5L21.92 24.82L24 20.6Z"
        fill="#b45309"
      />
      <defs>
        <linearGradient id={gradId} x1="14" y1="14" x2="34" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fcd34d" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** زخرفة الظهر المعدني للبطاقات الخلفية في الحلقة ثلاثية الأبعاد */
function CardBackOrnament() {
  return (
    <svg className="lc-back-ornament" viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <circle cx="20" cy="20" r="16" stroke="currentColor" strokeOpacity="0.32" strokeWidth="1.2" />
      <path
        d="M20 8L23.4 15.1L31.2 16.2L25.5 21.7L26.9 29.5L20 25.8L13.1 29.5L14.5 21.7L8.8 16.2L16.6 15.1L20 8Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * القائمة المنسدلة العلوية المعتمدة — المقترح (د): التوأم المتناظر بالأوسمة وأيقونات الفرق.
 * تعرض مواجهة «أقوى هجوم» (وسام الحذاء الذهبي + شعار النادي) و«أقوى دفاع»
 * (وسام الدرع الزمردي + شعار النادي) مع شريط حصيلة الأهداف الإجمالية.
 */
function TopStatsDrawer({
  stats,
  idSuffix = "0",
}: {
  stats: LeagueStatsSummary;
  idSuffix?: string;
}) {
  const placeholder = stats.status === "failed" ? "غير متاح" : "—";

  const attackVal = stats.bestAttack ? stats.bestAttack.rate.toFixed(2) : placeholder;
  const attackTeam = stats.bestAttack?.name ?? "—";
  const defenceVal = stats.bestDefence ? stats.bestDefence.rate.toFixed(2) : placeholder;
  const defenceTeam = stats.bestDefence?.name ?? "—";
  const goalsVal = stats.totalGoals !== null ? stats.totalGoals.toLocaleString("en-US") : placeholder;
  const goalsSeason = stats.season ? `موسم ${stats.season}` : "—";

  return (
    <span className="lc-top-drawer lc-top-drawer--twin">
      <span className="lc-top-drawer-crown" aria-hidden="true" />
      <span className="lc-top-twin">
        <span className="lc-top-twin-duel">
          <span className="lc-top-twin-side" data-stat-metric="best-attack">
            <span className="lc-top-twin-head">
              <GoldenBootMedalIcon idSuffix={idSuffix} />
              <span className="lc-top-metric-label">أقوى هجوم</span>
            </span>
            <span className="lc-top-twin-val-row">
              <strong className="lc-top-metric-val" data-stat-value="">
                <bdi dir="ltr">{attackVal}</bdi>
              </strong>
              {stats.bestAttack && <span className="lc-top-metric-unit is-coral">هدف/م</span>}
            </span>
            <span className="lc-top-club-row">
              {stats.bestAttack && <StatClubCrest club={stats.bestAttack} />}
              <span className="lc-top-metric-team" data-stat-team="">
                <bdi dir="ltr">{attackTeam}</bdi>
              </span>
            </span>
          </span>

          <MiniDuelDiamond />

          <span className="lc-top-twin-side" data-stat-metric="best-defence">
            <span className="lc-top-twin-head">
              <GuardianShieldMedalIcon idSuffix={idSuffix} />
              <span className="lc-top-metric-label">أقوى دفاع</span>
            </span>
            <span className="lc-top-twin-val-row">
              <strong className="lc-top-metric-val" data-stat-value="">
                <bdi dir="ltr">{defenceVal}</bdi>
              </strong>
              {stats.bestDefence && <span className="lc-top-metric-unit is-emerald">هدف/م</span>}
            </span>
            <span className="lc-top-club-row">
              {stats.bestDefence && <StatClubCrest club={stats.bestDefence} />}
              <span className="lc-top-metric-team" data-stat-team="">
                <bdi dir="ltr">{defenceTeam}</bdi>
              </span>
            </span>
          </span>
        </span>

        <span className="lc-top-twin-goals" data-stat-metric="total-goals">
          <GoalsNetBurstIcon className="lc-top-twin-net" />
          <span className="lc-top-twin-goals-label">إجمالي الأهداف</span>
          <strong className="lc-top-twin-goals-val" data-stat-value="">
            <bdi dir="ltr">{goalsVal}</bdi>
          </strong>
          {stats.totalGoals !== null && <span className="lc-top-twin-goals-unit">هدفاً</span>}
          <span className="lc-top-twin-goals-sep" aria-hidden="true">·</span>
          <span className="lc-top-twin-goals-season" data-stat-team="">
            {goalsSeason}
          </span>
        </span>
      </span>
    </span>
  );
}

/** المنسدلة السفلية للمتصدّر (.lc-detail) — بنفس بنيتها المعتمدة */
function BottomLeaderDrawer({
  leader,
  idSuffix = "ring",
}: {
  leader: LeaderInfo | null;
  idSuffix?: string;
}) {
  return (
    <span className="lc-detail">
      <span className="lc-grades-box">
        <GradesIcon />
        <span className="lc-grades-copy">
          <span className="lc-grades-label">نقاط المتصدّر</span>
          <span className="lc-grades-num" data-leader-points="">
            {leader ? (
              <>
                <bdi dir="ltr">{leader.points}</bdi>
                <small>نقطة</small>
              </>
            ) : (
              "—"
            )}
          </span>
          {leader && (
            <>
              <span className="lc-grades-meta" data-leader-meta="">
                لعب <bdi dir="ltr">{leader.played}</bdi> · فارق{" "}
                <bdi dir="ltr">{formatSignedDiff(leader.goalDifference)}</bdi>
              </span>
              {leader.ppm !== null && leader.attackRate !== null && (
                <span className="lc-grades-rates" data-leader-rates="">
                  نقاط/م <bdi dir="ltr">{leader.ppm.toFixed(2)}</bdi> · هجوم/م{" "}
                  <bdi dir="ltr">{leader.attackRate.toFixed(2)}</bdi>
                </span>
              )}
            </>
          )}
        </span>
      </span>
      <MedalRibbonIcon idSuffix={idSuffix} />
    </span>
  );
}

/**
 * شريط روابط البطولات بعرض دائري ثلاثي الأبعاد (3D Circular Ring) مستلهم من
 * ilkhoeri/swift-panda-38 (MIT) مع بطاقات الهجين المزدوج، وتنفتح فيه القائمتان
 * المنسدلتان العلوية (المقترح د مع أيقونات الفرق) والسفلية (بيانات المتصدّر)
 * بسلاسة تلقائياً عندما يأتي الدور على البطاقة في مقدمة الدوران.
 */
export default function LeagueLinksCarousel({
  items,
}: {
  items?: LeagueCarouselItem[];
} = {}) {
  const defaultLandings = leagueLandingsInPageOrder();
  const resolvedItems: LeagueCarouselItem[] =
    items ??
    defaultLandings.map((landing) => ({
      href: `/matches/${landing.slug}/`,
      label: landing.shortName,
      leagueId: landing.leagueId,
      standingsLeagueId: standingsLeagueKey(landing),
    }));
  const navRef = useRef<HTMLElement>(null);
  const [fetched, setFetched] = useState(false);

  const ring = useRingCarousel({
    count: resolvedItems.length,
  });
  const liveStandings = useLiveStandingsMap();

  /* بعد وصول القسم إلى الشاشة، نضمن عند دوران الحلقة إلى بطاقة جديدة تحديث ترتيبها الحي */
  useEffect(() => {
    if (!fetched || !ring.ready) return;
    const activeItem = resolvedItems[ring.activeIndex];
    if (!activeItem) return;
    const sKey =
      activeItem.standingsLeagueId ??
      (activeItem.leagueId === "sau.1" ? "ksa.1" : activeItem.leagueId);
    ensureLiveLeagueStandings(sKey);
  }, [fetched, ring.ready, ring.activeIndex, resolvedItems]);

  /* الجلب الكسول لجدول الترتيب الحي لكافة البطولات عند وصول القسم إلى الشاشة،
     مع تحديث دوري كل 5 دقائق دون أي اعتماد على الأرشيف. */
  useEffect(() => {
    const el = navRef.current;
    if (!el) return;

    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const loadAll = () => {
      if (cancelled) return;
      setFetched(true);
      void refreshLiveLeaguesStandings(STANDINGS_LEAGUE_IDS);
    };

    const start = () => {
      loadAll();
      timer = setInterval(() => {
        if (!document.hidden) loadAll();
      }, REFRESH_MS);
    };

    if (typeof IntersectionObserver === "undefined") {
      start();
    } else {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            observer.disconnect();
            start();
          }
        },
        { rootMargin: "200px 0px" },
      );
      observer.observe(el);
      return () => {
        cancelled = true;
        observer.disconnect();
        if (timer) clearInterval(timer);
      };
    }

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, []);

  const ringStyle = {
    "--quantity": resolvedItems.length,
    "--ring-angle": `${ring.ringAngleDeg}deg`,
  } as CSSProperties;

  return (
    <nav
      ref={navRef}
      className="matches-league-links league-carousel lc-ring-carousel"
      aria-label="صفحات البطولات"
      aria-roledescription="carousel"
      data-fetched={fetched ? "true" : "false"}
      {...ring.rootProps}
    >
      <div className="league-carousel-head">
        <div className="lc-ring-head-group">
          <h2 className="league-carousel-title">صفحات البطولات</h2>
          <span className="lc-ring-hint" aria-hidden="true">
            <span className="lc-ring-hint-dot" />
            تدور كل 5 ثوانٍ · اسحب باللمس للتدوير
          </span>
        </div>
        <span className="league-carousel-count">{resolvedItems.length} بطولة</span>
      </div>

      <div
        className="league-carousel-viewport lc-ring-scene"
        {...ring.stageProps}
      >
        {/* هالة المدار الأرضية لإبراز العمق الدائري ثلاثي الأبعاد */}
        <div className="lc-ring-orbit" aria-hidden="true" />

        <div className="league-carousel-track lc-ring-inner" style={ringStyle}>
          {resolvedItems.map((item, index) => {
            const sKey =
              item.standingsLeagueId ??
              (item.leagueId === "sau.1" ? "ksa.1" : item.leagueId);
            const record = liveStandings[sKey] ?? getLiveLeagueRecord(sKey);
            const leader = resolveLeagueLeader(record, sKey);
            const stats = resolveLeagueStats(record, sKey);
            const theme = getLeagueTrophyTheme(item.leagueId);
            const slot: RingSlot = ring.ready
              ? computeRingSlot(index, ring.activeIndex, resolvedItems.length)
              : "front";
            const itemStyle = {
              "--index": index,
              "--lc-stage-glow": theme.stageGlow,
              "--lc-split-gradient": theme.splitGradient,
              "--lc-ring-accent": theme.accentPrimary,
            } as CSSProperties;

            return (
              <a
                key={item.leagueId}
                className="league-carousel-item"
                href={item.href}
                style={itemStyle}
                data-league={sKey}
                data-stat-status={stats.status}
                data-stat-stale={stats.stale ? "true" : "false"}
                data-ring-pos={ring.ready ? slot : undefined}
                onPointerEnter={() => ensureLiveLeagueStandings(sKey)}
                onPointerDown={() => ensureLiveLeagueStandings(sKey)}
                onFocus={() => {
                  ensureLiveLeagueStandings(sKey);
                  if (ring.ready && slot !== "front") {
                    ring.goToIndex(index);
                  }
                }}
                onClick={(event) => {
                  /* نقرة على بطاقة جانبية في الحلقة تلفّ الحلقة إليها لتفتح منسدلتاها بسلاسة */
                  if (ring.ready && slot !== "front") {
                    event.preventDefault();
                    ring.goToIndex(index);
                  }
                }}
              >
                <span className="lc-card-front">
                  <TopStatsDrawer stats={stats} idSuffix={`ring-${index}`} />

                  <span className="lc-outline">
                    <span className="lc-stage">
                      <span className="lc-heading">
                        <span className="league-carousel-label">{item.label}</span>
                      </span>
                      <LeagueTrophyWithEmblem leagueId={item.leagueId} variant="authentic" />
                    </span>

                    <span className="lc-split-line" aria-hidden="true" />

                    <LeaderRow leader={leader} />
                  </span>

                  <BottomLeaderDrawer leader={leader} idSuffix={`ring-${index}`} />
                </span>

                <span className="lc-card-back" aria-hidden="true">
                  <span className="lc-card-back-sheen" />
                  <CardBackOrnament />
                  <span className="lc-back-label">{item.label}</span>
                  <span className="lc-back-sub">{theme.trophyName}</span>
                </span>
              </a>
            );
          })}
        </div>
      </div>

      <CarouselControls
        page={ring.activeIndex}
        pages={ring.ready ? resolvedItems.length : 1}
        onStep={(delta) => ring.stepBy(delta >= 0 ? 1 : -1)}
        onSelect={ring.goToIndex}
        loop={ring.ready}
        prevLabel="البطولات السابقة"
        nextLabel="البطولات التالية"
        dotsLabel="موضع شريط البطولات"
      />
    </nav>
  );
}
