/** ============================================================================
   إحصائيات البطولات المتاحة — أعلى بطاقات المواجهات مباشرة
   ----------------------------------------------------------------------------
   تصميم مطابق للدرج الأيمن (lc-top-twin-duel / lc-top-twin-goals / lc-grades-box)
   الموجود داخل بطاقة كل بطولة في التاج المداري.
   تُعرض إحصائيات كل بطولة واحدة تلو الأخرى مع دوران تلقائي.
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
            {/* شعار البطولة */}
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

            {/* الدرج العلوي: أقوى هجوم | أقوى دفاع (مثل lc-top-twin-duel) */}
            <div className="lc-top-twin">
              <div className="lc-top-twin-duel">
                {it.bestAttackName && it.bestAttackRate != null && (
                  <div className="lc-top-twin-side">
                    <div className="lc-top-twin-head">
                      <span className="lc-top-medal-icon" aria-hidden="true">⚽</span>
                      <span className="lc-top-metric-label">أقوى هجوم</span>
                    </div>
                    <div className="lc-top-twin-val-row">
                      <span className="lc-top-metric-val">
                        {it.bestAttackRate.toFixed(2)}
                      </span>
                      <span className="lc-top-metric-unit is-coral">هدف/م</span>
                    </div>
                    <div className="lc-top-club-row">
                      <span className="lc-top-club-crest" aria-hidden="true">
                        {it.bestAttackName.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="lc-top-metric-team">{it.bestAttackName}</span>
                    </div>
                  </div>
                )}
                <span className="lc-duel-diamond" aria-hidden="true">◆</span>
                {it.bestDefenceName && it.bestDefenceRate != null && (
                  <div className="lc-top-twin-side">
                    <div className="lc-top-twin-head">
                      <span className="lc-top-medal-icon" aria-hidden="true">🛡️</span>
                      <span className="lc-top-metric-label">أقوى دفاع</span>
                    </div>
                    <div className="lc-top-twin-val-row">
                      <span className="lc-top-metric-val">
                        {it.bestDefenceRate.toFixed(2)}
                      </span>
                      <span className="lc-top-metric-unit is-emerald">هدف/م</span>
                    </div>
                    <div className="lc-top-club-row">
                      <span className="lc-top-club-crest" aria-hidden="true">
                        {it.bestDefenceName.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="lc-top-metric-team">{it.bestDefenceName}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* إجمالي الأهداف (مثل lc-top-twin-goals) */}
              {it.totalGoals != null && (
                <div className="lc-top-twin-goals">
                  <span className="lc-top-twin-net" aria-hidden="true">🥅</span>
                  <span className="lc-top-twin-goals-label">إجمالي الأهداف</span>
                  <span className="lc-top-twin-goals-val">
                    {it.totalGoals.toLocaleString("en-US")}
                  </span>
                  <span className="lc-top-twin-goals-unit">هدفاً</span>
                </div>
              )}
            </div>

            {/* الدرج السفلي: المتصدر (مثل lc-grades-box) */}
            {it.leaderName && it.leaderPoints != null && (
              <div className="lc-grades-box">
                <span className="lc-grades-icon" aria-hidden="true">👑</span>
                <div className="lc-grades-copy">
                  <span className="lc-grades-label">المتصدر</span>
                  <div className="lc-grades-num">
                    <span>{it.leaderName}</span>
                    <span className="lc-grades-num-val">{it.leaderPoints}</span>
                    <small>نقطة</small>
                  </div>
                </div>
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
