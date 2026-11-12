import { useEffect, useMemo, useState } from "react";
import { leagueLandingsInPageOrder } from "../content/competitions";
import { useLiveStandingsMap } from "../lib/live-standings";
import { providerTeamLogo } from "../lib/leader-logo.mjs";
import { resolveApprovedTeamLogo } from "./StandingsRatesCard";
import { CROWN_CUP_LOGOS } from "./crown-league-identity";
import CrownLeagueTrophy from "./CrownLeagueTrophy";
import "./hero-league-stats-ticker.css";

export interface LeagueTickerMatchInfo {
  key: string;
  leagueId: string;
  homeName: string;
  awayName: string;
  homeLogo: string;
  awayLogo: string;
  stateLabel: string;
  scoreLabel: string | null;
}

interface LeagueStat {
  leagueId: string;
  name: string;
  logo: string | null;
  provider: string | null;
  attackName: string | null;
  attackTeamId: string | null;
  attackRate: number | null;
  defenceName: string | null;
  defenceTeamId: string | null;
  defenceRate: number | null;
  leaderName: string | null;
  leaderTeamId: string | null;
  leaderPoints: number | null;
  totalGoals: number | null;
}

/** Compact league metrics docked directly beneath the tournament selector. */
export function HeroLeagueStatsTicker({ selectedLeagueId, matchInfo = [], onMatchInfoAction }: { selectedLeagueId?: string | null; matchInfo?: LeagueTickerMatchInfo[]; onMatchInfoAction?: (matchKey: string) => void }) {
  const landings = useMemo(() => leagueLandingsInPageOrder(), []);
  const liveMap = useLiveStandingsMap();
  const items = useMemo<LeagueStat[]>(() => landings.map((landing) => {
    const standingsKey = landing.standings?.leagueId ?? (landing.leagueId === "sau.1" ? "ksa.1" : landing.leagueId);
    const record = liveMap[standingsKey];
    const entries = record?.table?.entries ?? [];
    const top = record?.leader ?? entries[0];
    const rates = record?.rates ?? null;
    const attack = rates?.bestAttack?.[0];
    const defence = rates?.bestDefence?.[0];
    return {
      leagueId: landing.leagueId,
      name: landing.shortName,
      logo: CROWN_CUP_LOGOS[landing.leagueId] ?? null,
      provider: record?.table?.provider ?? "ESPN",
      attackName: attack?.name ?? null,
      attackTeamId: attack?.teamId ?? null,
      attackRate: attack?.attack != null ? Number(attack.attack) : null,
      defenceName: defence?.name ?? null,
      defenceTeamId: defence?.teamId ?? null,
      defenceRate: defence?.defence != null ? Number(defence.defence) : null,
      leaderName: top?.name ?? null,
      leaderTeamId: top?.teamId ?? null,
      leaderPoints: top?.points != null ? Number(top.points) : null,
      totalGoals: rates && rates.rows.length > 0 && rates.league.totalGoals != null ? rates.league.totalGoals : null,
    };
  }), [landings, liveMap]);

  const selectedIndex = items.findIndex((entry) => entry.leagueId === selectedLeagueId);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [selectedIndex]);

  useEffect(() => {
    if (paused || items.length < 2) return;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      setActiveIndex((index) => (index + 1) % items.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [items.length, paused]);

  const item = items[activeIndex] ?? items[0];
  if (!item) return null;
  const match = matchInfo.find((entry) => entry.leagueId === item.leagueId);

  const teamLogo = (name: string | null, teamId: string | null) => {
    if (!name) return undefined;
    return resolveApprovedTeamLogo({ name, logo: null }) ?? (teamId && item.provider
      ? providerTeamLogo({ teamId, provider: item.provider, logo: null }) ?? undefined
      : undefined);
  };

  const hasAnyStats = item.leaderName || item.attackName || item.defenceName || item.totalGoals != null;
  return (
    <section
      className="hs-league-stats-ticker"
      aria-label={`مؤشرات البطولات — ${item.name} — تبديل تلقائي`}
      dir="rtl"
      onPointerEnter={(event) => { if (event.pointerType === "mouse") setPaused(true); }}
      onPointerLeave={(event) => { if (event.pointerType === "mouse") setPaused(false); }}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}
    >
      <div className="hs-league-stats-heading">
        <span className="hs-league-stats-pulse" aria-hidden="true" />
        <span className="hs-league-stats-kicker">إحصائيات البطولة</span>
        {(CROWN_CUP_LOGOS[item.leagueId] || item.logo) && (
          <img
            src={CROWN_CUP_LOGOS[item.leagueId] || item.logo || ""}
            alt=""
            aria-hidden="true"
            className="hs-league-stats-logo"
            width={24}
            height={24}
            loading="eager"
            decoding="async"
            data-league-logo={item.leagueId}
          />
        )}
        <strong className="hs-league-stats-name">{item.name}</strong>
        <span className="hs-stats-identity-trophy hs-league-stats-trophy">
          <CrownLeagueTrophy leagueId={item.leagueId} />
        </span>
      </div>
      {hasAnyStats ? (
        <div className="hs-league-stats-grid">
          {item.leaderName && item.leaderPoints != null && (
            <div className="hs-league-stat hs-league-stat--leader">
              <span className="hs-league-stat-label">المتصدر</span>
              <strong className="hs-league-stat-value">{item.leaderPoints.toLocaleString("en-US")}<small>نقطة</small></strong>
              <span className="hs-league-stat-team">{teamLogo(item.leaderName, item.leaderTeamId) && <img src={teamLogo(item.leaderName, item.leaderTeamId)} alt="" width={16} height={16} loading="lazy" decoding="async" />}{item.leaderName}</span>
            </div>
          )}
          {item.attackName && item.attackRate != null && (
            <div className="hs-league-stat">
              <span className="hs-league-stat-label">أقوى هجوم</span>
              <strong className="hs-league-stat-value">{item.attackRate.toFixed(2)}<small>هدف/م</small></strong>
              <span className="hs-league-stat-team">{teamLogo(item.attackName, item.attackTeamId) && <img src={teamLogo(item.attackName, item.attackTeamId)} alt="" width={16} height={16} loading="lazy" decoding="async" />}{item.attackName}</span>
            </div>
          )}
          {item.defenceName && item.defenceRate != null && (
            <div className="hs-league-stat">
              <span className="hs-league-stat-label">أقوى دفاع</span>
              <strong className="hs-league-stat-value">{item.defenceRate.toFixed(2)}<small>هدف/م</small></strong>
              <span className="hs-league-stat-team">{teamLogo(item.defenceName, item.defenceTeamId) && <img src={teamLogo(item.defenceName, item.defenceTeamId)} alt="" width={16} height={16} loading="lazy" decoding="async" />}{item.defenceName}</span>
            </div>
          )}
          {item.totalGoals != null && (
            <div className="hs-league-stat hs-league-stat--goals">
              <span className="hs-league-stat-label">أهداف البطولة</span>
              <strong className="hs-league-stat-value">{item.totalGoals.toLocaleString("en-US")}<small>هدفاً</small></strong>
              <span className="hs-league-stat-team">إجمالي الموسم</span>
            </div>
          )}
        </div>
      ) : (
        <p className="hs-league-stats-empty">إحصائيات هذه البطولة غير متاحة حالياً</p>
      )}
      {match ? (
        <div className="hs-league-stats-match">
          <span className="hs-league-stats-match-label">مباراة البطولة</span>
          <span className="hs-league-stats-match-teams">
            {match.homeLogo && <img src={match.homeLogo} alt="" width={20} height={20} loading="lazy" decoding="async" />}
            <strong>{match.homeName}</strong>
            <i>VS</i>
            {match.awayLogo && <img src={match.awayLogo} alt="" width={20} height={20} loading="lazy" decoding="async" />}
            <strong>{match.awayName}</strong>
          </span>
          <span className={`hs-league-stats-match-state${match.scoreLabel ? " has-score" : ""}`}>
            {match.scoreLabel ?? match.stateLabel}
          </span>
          <button type="button" onClick={() => onMatchInfoAction?.(match.key)}>معلومات المباراة</button>
        </div>
      ) : (
        <div className="hs-league-stats-match hs-league-stats-match--empty">
          <span className="hs-league-stats-match-label">مباراة البطولة</span>
          <span>لا توجد مواجهة بارزة مرتبطة بهذه البطولة حالياً</span>
        </div>
      )}
    </section>
  );
}
