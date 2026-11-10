/** ============================================================================
   إحصائيات البطولات المتاحة — أعلاه بطاقات المواجهات مباشرة
   ----------------------------------------------------------------------------
   كل إحصائية تظهر منفردة (أقوى هجوم → أقوى دفاع → المتصدر → إجمالي الأهداف)
   مع شعار واسم البطولة وشعار النادي من المصدر في كل شريحة، والدوران التلقائي بينها.
   تصميم مطابق للدرج الأيمن (lc-top-twin-duel / lc-top-twin-goals / lc-grades-box).
   ============================================================================ */

import { useMemo, useState, useEffect } from "react";
import { leagueLandingsInPageOrder } from "../content/competitions";
import { useLiveStandingsMap } from "../lib/live-standings";
import { providerTeamLogo } from "../lib/leader-logo.mjs";
import { resolveApprovedTeamLogo } from "./StandingsRatesCard";
import { CROWN_CUP_LOGOS } from "./crown-league-identity";
import {
  GoldenBootMedalIcon,
  GuardianShieldMedalIcon,
  GradesIcon,
  GoalsNetBurstIcon,
} from "./LeagueTopDrawerIcons";
import "./hero-league-stats-ticker.css";

type StatKind =
  | "best-attack"
  | "best-defence"
  | "leader"
  | "total-goals";

interface LeagueStatItem {
  leagueId: string;
  name: string;
  logo: string | null;
  kind: StatKind;
  /* strongest attack / strongest defence */
  clubName: string | null;
  clubTeamId: string | null;
  clubRate: number | null;
  clubUnitColor: "is-coral" | "is-emerald" | null;
  /* leader */
  leaderName: string | null;
  leaderTeamId: string | null;
  leaderPoints: number | null;
  /* total goals */
  totalGoals: number | null;
  /* provider per league for team logo lookup */
  provider: string | null;
}

export function HeroLeagueStatsTicker() {
  const landings = leagueLandingsInPageOrder();
  const liveMap = useLiveStandingsMap();
  const [activeIndex, setActiveIndex] = useState(0);

  const items = useMemo<LeagueStatItem[]>(() => {
    const result: LeagueStatItem[] = [];

    for (const landing of landings) {
      const sKey =
        landing.standings?.leagueId ??
        (landing.leagueId === "sau.1" ? "ksa.1" : landing.leagueId);
      const record = liveMap[sKey];
      const entries = record?.table?.entries ?? [];
      const top = record?.leader ?? entries[0];
      const rates = record?.rates ?? null;
      const att = rates?.bestAttack?.[0];
      const def = rates?.bestDefence?.[0];
      const provider = record?.table?.provider ?? "ESPN";

      const logo = CROWN_CUP_LOGOS[landing.leagueId] ?? null;

      /* أقوى هجوم */
      if (att?.name && att.attack != null) {
        result.push({
          leagueId: landing.leagueId,
          name: landing.shortName,
          logo,
          kind: "best-attack",
          clubName: att.name,
          clubTeamId: att.teamId ?? null,
          clubRate: Number(att.attack),
          clubUnitColor: "is-coral",
          leaderName: null,
          leaderTeamId: null,
          leaderPoints: null,
          totalGoals: null,
          provider,
        });
      }

      /* أقوى دفاع */
      if (def?.name && def.defence != null) {
        result.push({
          leagueId: landing.leagueId,
          name: landing.shortName,
          logo,
          kind: "best-defence",
          clubName: def.name,
          clubTeamId: def.teamId ?? null,
          clubRate: Number(def.defence),
          clubUnitColor: "is-emerald",
          leaderName: null,
          leaderTeamId: null,
          leaderPoints: null,
          totalGoals: null,
          provider,
        });
      }

      /* المتصدر */
      if (top?.name && top.points != null) {
        result.push({
          leagueId: landing.leagueId,
          name: landing.shortName,
          logo,
          kind: "leader",
          clubName: null,
          clubTeamId: null,
          clubRate: null,
          clubUnitColor: null,
          leaderName: top.name,
          leaderTeamId: top.teamId ?? null,
          leaderPoints: Number(top.points),
          totalGoals: null,
          provider,
        });
      }

      /* إجمالي الأهداف */
      if (rates && rates.rows.length > 0 && rates.league.totalGoals != null) {
        result.push({
          leagueId: landing.leagueId,
          name: landing.shortName,
          logo,
          kind: "total-goals",
          clubName: null,
          clubTeamId: null,
          clubRate: null,
          clubUnitColor: null,
          leaderName: null,
          leaderTeamId: null,
          leaderPoints: null,
          totalGoals: rates.league.totalGoals,
          provider,
        });
      }
    }

    return result;
  }, [landings, liveMap]);

  /* دوران تلقائي كل 4 ثوانٍ بين الإحصائيات */
  useEffect(() => {
    if (items.length < 2) return;
    const timer = setInterval(() => {
      setActiveIndex((i) => (i + 1) % items.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [items.length]);

  const item = items[activeIndex];
  if (!item) return null;

  const kindLabels: Record<StatKind, string> = {
    "best-attack": "أقوى هجوم",
    "best-defence": "أقوى دفاع",
    leader: "المتصدر",
    "total-goals": "إجمالي الأهداف",
  };

  /* جلب شعار النادي من المصدر: أولًا الشعار المحلي المعتمد، ثم شعار المزود (ESPN/Highlightly)، وإلا undefined (يُعرض الحروف الأولى كبديل) */
  function clubLogo(name: string | null, teamId: string | null, provider: string | null): string | undefined {
    if (!name) return undefined;
    const local = resolveApprovedTeamLogo({ name, logo: null });
    if (local) return local;
    if (teamId && provider) {
      const fromProvider = providerTeamLogo({ teamId, provider, logo: null });
      if (fromProvider) return fromProvider;
    }
    return undefined;
  }

  return (
    <section className="hs-league-stats-ticker" aria-label="إحصائيات البطولات المتاحة">
      <div className="hs-stats-ticker-container">
        {items.map((it, idx) => (
          <div
            key={`${it.leagueId}-${it.kind}`}
            className={`hs-stats-ticker-slide${idx === activeIndex ? " active" : ""}`}
          >
            {/* شعار البطولة واسمها في الأعلى */}
            <div className="hs-stats-ticker-badge">
              {it.logo ? (
                <img
                  src={it.logo}
                  alt=""
                  className="hs-stats-ticker-logo"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <span className="hs-stats-ticker-logo-fallback">
                  {it.leagueId.slice(0, 2).toUpperCase()}
                </span>
              )}
              <span className="hs-stats-ticker-league-name">{it.name}</span>
            </div>

            {/* الإ statistiques الواحدة المنفردة */}
            {it.kind === "best-attack" && it.clubName && it.clubRate != null && (
              <div className="lc-top-twin-duel">
                <div className="lc-top-twin-side">
                  <div className="lc-top-twin-head">
                    <GoldenBootMedalIcon
                      className="lc-top-medal-icon"
                      idSuffix={`boot-${it.leagueId}-${activeIndex}`}
                    />
                    <span className="lc-top-metric-label">{kindLabels["best-attack"]}</span>
                  </div>
                  <div className="lc-top-twin-val-row">
                    <span className="lc-top-metric-val">{it.clubRate.toFixed(2)}</span>
                    <span className={`lc-top-metric-unit ${it.clubUnitColor}`}>هدف/م</span>
                  </div>
                  <div className="lc-top-club-row">
                    <span className="lc-top-club-crest" aria-hidden="true">
                      {(() => {
                        const src = clubLogo(it.clubName, it.clubTeamId, it.provider);
                        if (src) return <img src={src} alt="" className="lc-top-club-logo" loading="lazy" decoding="async" />;
                        return it.clubName.slice(0, 2).toUpperCase();
                      })()}
                    </span>
                    <span className="lc-top-metric-team">{it.clubName}</span>
                  </div>
                </div>
              </div>
            )}

            {it.kind === "best-defence" && it.clubName && it.clubRate != null && (
              <div className="lc-top-twin-duel">
                <div className="lc-top-twin-side">
                  <div className="lc-top-twin-head">
                    <GuardianShieldMedalIcon
                      className="lc-top-medal-icon"
                      idSuffix={`shield-${it.leagueId}-${activeIndex}`}
                    />
                    <span className="lc-top-metric-label">{kindLabels["best-defence"]}</span>
                  </div>
                  <div className="lc-top-twin-val-row">
                    <span className="lc-top-metric-val">{it.clubRate.toFixed(2)}</span>
                    <span className={`lc-top-metric-unit ${it.clubUnitColor}`}>هدف/م</span>
                  </div>
                  <div className="lc-top-club-row">
                    <span className="lc-top-club-crest" aria-hidden="true">
                      {(() => {
                        const src = clubLogo(it.clubName, it.clubTeamId, it.provider);
                        if (src) return <img src={src} alt="" className="lc-top-club-logo" loading="lazy" decoding="async" />;
                        return it.clubName.slice(0, 2).toUpperCase();
                      })()}
                    </span>
                    <span className="lc-top-metric-team">{it.clubName}</span>
                  </div>
                </div>
              </div>
            )}

            {it.kind === "leader" && it.leaderName && it.leaderPoints != null && (
              <div className="lc-grades-box">
                <GradesIcon />
                <div className="lc-grades-copy">
                  <span className="lc-grades-label">{kindLabels.leader}</span>
                  <div className="lc-grades-num">
                    <span>{it.leaderName}</span>
                    <span className="lc-grades-num-val">{it.leaderPoints}</span>
                    <small>نقطة</small>
                  </div>
                </div>
                <div className="lc-grades-club-crest">
                  {(() => {
                    const src = clubLogo(it.leaderName, it.leaderTeamId, it.provider);
                    if (src) return <img src={src} alt="" className="lc-top-club-logo" loading="lazy" decoding="async" />;
                    return it.leaderName.slice(0, 2).toUpperCase();
                  })()}
                </div>
              </div>
            )}

            {it.kind === "total-goals" && it.totalGoals != null && (
              <div className="lc-top-twin-goals">
                <GoalsNetBurstIcon className="lc-top-twin-net" />
                <span className="lc-top-twin-goals-label">{kindLabels["total-goals"]}</span>
                <span className="lc-top-twin-goals-val">
                  {it.totalGoals.toLocaleString("en-US")}
                </span>
                <span className="lc-top-twin-goals-unit">هدفاً</span>
              </div>
            )}

            {/* نقاط التنقل */}
            <div className="hs-stats-ticker-dots">
              {items.map((_, dIdx) => (
                <button
                  key={dIdx}
                  className={`hs-stats-ticker-dot${dIdx === activeIndex ? " active" : ""}`}
                  onClick={() => setActiveIndex(dIdx)}
                  aria-label={`الإحصائية ${dIdx + 1}`}
                  aria-pressed={dIdx === activeIndex}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
