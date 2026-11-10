/** ============================================================================
   إحصائيات البطولات المتاحة تحت التذكرة — تظهر بالتتابع
   ----------------------------------------------------------------------------
   هذا المكون يعرض إحصائيات كل بطولة متاحة واحدة تلو أخرى مع دوران تلقائي.
   تُعرض الإحصائيات المتاحة فقط (المتصدر، أقوى هجوم، أقوى دفاع، إجمالي الأهداف).
   يُrender في Hero.tsx أسفل صف التذكرة (hero-ticket-row).
   ============================================================================ */

import { useMemo, useState, useEffect } from "react";
import { leagueLandingsInPageOrder } from "../content/competitions";
import { useLiveStandingsMap } from "../lib/live-standings";
import { CROWN_CUP_LOGOS } from "./crown-league-identity";
import "./hero-league-stats-ticker.css";

interface LeagueStat {
  leagueId: string;
  name: string;
  logo: string | null;
  leaderName: string | null;
  leaderPoints: number | null;
  bestAttackName: string | null;
  bestAttackRate: number | null;
  bestDefenceName: string | null;
  bestDefenceRate: number | null;
  totalGoals: number | null;
}

export function HeroLeagueStatsTicker() {
  const landings = leagueLandingsInPageOrder();
  const liveMap = useLiveStandingsMap();
  const [activeIndex, setActiveIndex] = useState(0);

  const items = useMemo<LeagueStat[]>(() => {
    return landings.map((landing) => {
      const sKey =
        landing.standings?.leagueId ??
        (landing.leagueId === "sau.1" ? "ksa.1" : landing.leagueId);
      const record = liveMap[sKey];
      const entries = record?.table?.entries ?? [];
      const top = record?.leader ?? entries[0];

      const rates = record?.rates ?? null;
      const att = rates?.bestAttack?.[0];
      const def = rates?.bestDefence?.[0];

      return {
        leagueId: landing.leagueId,
        name: landing.shortName,
        logo: CROWN_CUP_LOGOS[landing.leagueId] ?? null,
        leaderName: top?.name ?? null,
        leaderPoints: top?.points ? Number(top.points) : null,
        bestAttackName: att?.name ?? null,
        bestAttackRate: att?.attack != null ? Number(att.attack) : null,
        bestDefenceName: def?.name ?? null,
        bestDefenceRate: def?.defence != null ? Number(def.defence) : null,
        totalGoals: rates && rates.rows.length > 0 ? rates.league.totalGoals : null,
      };
    });
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

  return (
    <section className="hs-league-stats-ticker" aria-label="إحصائيات البطولات المتاحة">
      <div className="hs-stats-ticker-container">
        {items.map((it, idx) => (
          <div
            key={it.leagueId}
            className={`hs-stats-ticker-slide${idx === activeIndex ? " active" : ""}`}
          >
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
            <h3 className="hs-stats-ticker-league-name">{it.name}</h3>

            <div className="hs-stats-ticker-grid">
              {it.leaderName && (
                <div className="hs-stats-ticker-stat">
                  <span className="hs-stats-ticker-stat-label">المتصدر</span>
                  <span className="hs-stats-ticker-stat-value">{it.leaderName}</span>
                  {it.leaderPoints !== null && (
                    <span className="hs-stats-ticker-stat-unit">
                      {it.leaderPoints} نقطة
                    </span>
                  )}
                </div>
              )}
              {it.bestAttackName && it.bestAttackRate !== null && (
                <div className="hs-stats-ticker-stat">
                  <span className="hs-stats-ticker-stat-label">أقوى هجوم</span>
                  <span className="hs-stats-ticker-stat-value">{it.bestAttackName}</span>
                  <span className="hs-stats-ticker-stat-unit">
                    {it.bestAttackRate.toFixed(2)} هدف/م
                  </span>
                </div>
              )}
              {it.bestDefenceName && it.bestDefenceRate !== null && (
                <div className="hs-stats-ticker-stat">
                  <span className="hs-stats-ticker-stat-label">أقوى دفاع</span>
                  <span className="hs-stats-ticker-stat-value">{it.bestDefenceName}</span>
                  <span className="hs-stats-ticker-stat-unit">
                    {it.bestDefenceRate.toFixed(2)} هدف/م
                  </span>
                </div>
              )}
              {it.totalGoals !== null && (
                <div className="hs-stats-ticker-stat">
                  <span className="hs-stats-ticker-stat-label">إجمالي الأهداف</span>
                  <span className="hs-stats-ticker-stat-value">
                    {it.totalGoals.toLocaleString("en-US")}
                  </span>
                  <span className="hs-stats-ticker-stat-unit">هدفاً</span>
                </div>
              )}
            </div>

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
