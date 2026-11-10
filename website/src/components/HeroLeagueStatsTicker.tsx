/** ============================================================================
   إحصائيات البطولات المتاحة — أعلاه بطاقات المواجهات مباشرة
   ----------------------------------------------------------------------------
   كل شريحة تمثل بطولة واحدة: شعار واسم البطولة في الأعلى، ثم أقوى هجوم
   وأقوى دفاع في سطر واحد (جنباً إلى جنب مع فاصل ماسة)، ثم المتصدر،
   ثم إجمالي الأهداف، كل إحصائية في سطر منفصل أسفل بعضها.
   الدوران التلقائي بين البطولات كل 4 ثوانٍ.
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

interface LeagueStat {
  leagueId: string;
  name: string;
  logo: string | null;
  provider: string | null;
  /* strongest attack */
  attackName: string | null;
  attackTeamId: string | null;
  attackRate: number | null;
  /* strongest defence */
  defenceName: string | null;
  defenceTeamId: string | null;
  defenceRate: number | null;
  /* leader */
  leaderName: string | null;
  leaderTeamId: string | null;
  leaderPoints: number | null;
  /* total goals */
  totalGoals: number | null;
}

export function HeroLeagueStatsTicker() {
  const landings = leagueLandingsInPageOrder();
  const liveMap = useLiveStandingsMap();
  const [activeIndex, setActiveIndex] = useState(0);

  const items = useMemo<LeagueStat[]>(() => {
    const result: LeagueStat[] = [];

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

      result.push({
        leagueId: landing.leagueId,
        name: landing.shortName,
        logo,
        provider,
        attackName: att?.name ?? null,
        attackTeamId: att?.teamId ?? null,
        attackRate: att?.attack != null ? Number(att.attack) : null,
        defenceName: def?.name ?? null,
        defenceTeamId: def?.teamId ?? null,
        defenceRate: def?.defence != null ? Number(def.defence) : null,
        leaderName: top?.name ?? null,
        leaderTeamId: top?.teamId ?? null,
        leaderPoints: top?.points != null ? Number(top.points) : null,
        totalGoals:
          rates && rates.rows.length > 0 && rates.league.totalGoals != null
            ? rates.league.totalGoals
            : null,
      });
    }

    return result;
  }, [landings, liveMap]);

  /* دوران تلقائي كل 4 ثوانٍ بين البطولات */
  useEffect(() => {
    if (items.length < 2) return;
    const timer = setInterval(() => {
      setActiveIndex((i) => (i + 1) % items.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [items.length]);

  const item = items[activeIndex];
  if (!item) return null;

  /* جلب شعار النادي من المصدر: أولًا الشعار المحلي المعتمد، ثم شعار المزود (ESPN/Highlightly)، وإلا undefined (يُعرض الحروف الأولى كبديل) */
  function clubLogo(name: string | null, teamId: string | null): string | undefined {
    if (!name) return undefined;
    const local = resolveApprovedTeamLogo({ name, logo: null });
    if (local) return local;
    if (teamId && item.provider) {
      const fromProvider = providerTeamLogo({
        teamId,
        provider: item.provider,
        logo: null,
      });
      if (fromProvider) return fromProvider;
    }
    return undefined;
  }

  function renderClubCrest(name: string | null, teamId: string | null) {
    const src = clubLogo(name, teamId);
    if (src) return <img src={src} alt="" className="lc-top-club-logo" loading="lazy" decoding="async" />;
    return name ? name.slice(0, 2).toUpperCase() : null;
  }

  return (
    <section className="hs-league-stats-ticker" aria-label="إحصائيات البطولات المتاحة">
      <div className="hs-stats-ticker-container">
        {items.map((it, idx) => (
          <div
            key={it.leagueId}
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

            {/* أقوى هجوم | أقوى دفاع — في سطر واحد جنباً إلى جنب */}
            {(it.attackName && it.attackRate != null) ||
            (it.defenceName && it.defenceRate != null) ? (
              <div className="lc-top-twin-duel">
                {it.attackName && it.attackRate != null && (
                  <div className="lc-top-twin-side">
                    <div className="lc-top-twin-head">
                      <GoldenBootMedalIcon
                        className="lc-top-medal-icon"
                        idSuffix={`boot-${it.leagueId}-${activeIndex}`}
                      />
                      <span className="lc-top-metric-label">أقوى هجوم</span>
                    </div>
                    <div className="lc-top-twin-val-row">
                      <span className="lc-top-metric-val">{it.attackRate.toFixed(2)}</span>
                      <span className="lc-top-metric-unit is-coral">هدف/م</span>
                    </div>
                    <div className="lc-top-club-row">
                      <span className="lc-top-club-crest" aria-hidden="true">
                        {renderClubCrest(it.attackName, it.attackTeamId)}
                      </span>
                      <span className="lc-top-metric-team">{it.attackName}</span>
                    </div>
                  </div>
                )}
                {(it.attackName && it.attackRate != null) &&
                (it.defenceName && it.defenceRate != null) && (
                  <span className="lc-duel-diamond" aria-hidden="true">◆</span>
                )}
                {it.defenceName && it.defenceRate != null && (
                  <div className="lc-top-twin-side">
                    <div className="lc-top-twin-head">
                      <GuardianShieldMedalIcon
                        className="lc-top-medal-icon"
                        idSuffix={`shield-${it.leagueId}-${activeIndex}`}
                      />
                      <span className="lc-top-metric-label">أقوى دفاع</span>
                    </div>
                    <div className="lc-top-twin-val-row">
                      <span className="lc-top-metric-val">{it.defenceRate.toFixed(2)}</span>
                      <span className="lc-top-metric-unit is-emerald">هدف/م</span>
                    </div>
                    <div className="lc-top-club-row">
                      <span className="lc-top-club-crest" aria-hidden="true">
                        {renderClubCrest(it.defenceName, it.defenceTeamId)}
                      </span>
                      <span className="lc-top-metric-team">{it.defenceName}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {/* المتصدر — في سطر منفصل أسفل */}
            {it.leaderName && it.leaderPoints != null && (
              <div className="lc-grades-box">
                <GradesIcon />
                <div className="lc-grades-copy">
                  <span className="lc-grades-label">المتصدر</span>
                  <div className="lc-grades-num">
                    <span>{it.leaderName}</span>
                    <span className="lc-grades-num-val">{it.leaderPoints}</span>
                    <small>نقطة</small>
                  </div>
                </div>
                <div className="lc-grades-club-crest">
                  {renderClubCrest(it.leaderName, it.leaderTeamId)}
                </div>
              </div>
            )}

            {/* إجمالي الأهداف — في سطر منفصل أسفل */}
            {it.totalGoals != null && (
              <div className="lc-top-twin-goals">
                <GoalsNetBurstIcon className="lc-top-twin-net" />
                <span className="lc-top-twin-goals-label">إجمالي الأهداف</span>
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
                  aria-label={`البطولة ${dIdx + 1}`}
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
