/** ============================================================================
   شريط بطولات أفقي تجريبي — أسفل شريط المتصفح العلوي مباشرة
   ----------------------------------------------------------------------------
   هذا المكون تجريبي (research/comparison) ويعرض كروت البطولات بجانب بعضها
   بحجم أصغر مع إمكانية التمرير بينها باستخدام السهمين.

   يُ_render في HeroLeagueCrownStrip.tsx، مباشرة أسفل hs-crown-browser
   (الذي يحتوي "المباريات والبطولات" و "الرياضة").
   -------------------------------------------------------------------------- */

import { useMemo, useRef, type CSSProperties } from "react";
import { leagueLandingsInPageOrder } from "../content/competitions";
import { FEATURED_NEWS } from "../content/featured-news";
import { to } from "../config";
import { CROWN_CUP_LOGOS } from "./crown-league-identity";
import { getLeagueTrophyTheme } from "./LeagueTrophySvg";
import { HeroLeagueStatsTicker, type LeagueTickerMatchInfo } from "./HeroLeagueStatsTicker";
import "./hero-horizontal-strip.css";

interface HorizontalLeagueItem {
  leagueId: string;
  name: string;
  slug: string;
  logo?: string;
  glow?: string;
  split?: string;
}

export function HeroLeagueHorizontalStrip({
  clashes = [],
  extraLeagues = [],
  selectedLeagueId,
  activeLeagueId,
  activeView,
  onViewChange,
  onLeagueInfoAction,
  onMatchInfoAction,
  matchInfo,
  onLeagueSelect,
}: {
  clashes?: Array<{ source?: string; eyebrow: string }>;
  extraLeagues?: readonly { id: string; name: string }[];
  selectedLeagueId?: string | null;
  activeLeagueId?: string | null;
  activeView: "leagues" | "news";
  onViewChange: (view: "leagues" | "news") => void;
  onLeagueInfoAction?: (tab: "standings" | "stats") => void;
  onMatchInfoAction?: (matchKey: string) => void;
  matchInfo?: LeagueTickerMatchInfo[];
  onLeagueSelect?: (leagueId: string) => void;
}) {
  const landings = leagueLandingsInPageOrder();

  const wanted = useMemo<HorizontalLeagueItem[]>(() => {
    const items: HorizontalLeagueItem[] = [];
    const seen = new Set<string>();

    const add = (leagueId: string, name: string, slug: string) => {
      if (seen.has(leagueId)) return;
      seen.add(leagueId);
      const theme = getLeagueTrophyTheme(leagueId);
      items.push({
        leagueId,
        name,
        slug,
        logo: CROWN_CUP_LOGOS[leagueId],
        glow: theme.stageGlow,
        split: theme.splitGradient,
      });
    };

    /* 1) صفحات البطولات الأساسية */
    for (const l of landings) {
      add(l.leagueId, l.shortName, l.slug);
    }

    /* 2) بطولات من مواجهات الشريط (مصدر كل مواجهة) */
    for (const c of clashes ?? []) {
      if (c.source) add(c.source, c.eyebrow, c.source);
    }

    /* 3) بطولات مثبّتة يدوياً (CROWN_LEAGUE_CARDS) */
    for (const e of extraLeagues ?? []) {
      add(e.id, e.name, e.id);
    }

    return items;
  }, [landings, clashes, extraLeagues]);

  const focusedLeague = wanted.find(item => item.leagueId === selectedLeagueId)
    ?? wanted.find(item => item.leagueId === activeLeagueId);
  const containerRef = useRef<HTMLDivElement>(null);
  const CARD_WIDTH = 148;
  const GAP = 8;

  const scrollBy = (delta: number) => {
    const el = containerRef.current;
    if (!el) return;
    // In RTL, the previous item is physically to the right; invert the signed step.
    el.scrollBy({ left: -delta, behavior: "smooth" });
  };

  return (
    <section className="hs-horizontal-strip" aria-label={activeView === "leagues" ? "استكشف البطولات وإحصاءاتها" : "آخر أخبار كرة القدم"}>
      <div className="hs-horizontal-strip-header">
        <span className="hs-horizontal-strip-title"><span className="hs-horizontal-strip-step" aria-hidden="true">01</span><span>{activeView === "leagues" ? "استكشف البطولات" : "أخبار الكرة"}</span></span>
        <div className="hs-horizontal-strip-header-tools">
          <div className="hs-horizontal-strip-view-toggle" role="group" aria-label="التبديل بين البطولات والأخبار">
            <button type="button" aria-pressed={activeView === "leagues"} onClick={() => onViewChange("leagues")}>البطولات</button>
            <button type="button" aria-pressed={activeView === "news"} onClick={() => onViewChange("news")}>الأخبار</button>
          </div>
          <span className="hs-horizontal-strip-count">{activeView === "leagues" ? `${wanted.length} بطولة` : `${FEATURED_NEWS.length} خبر`}</span>
        </div>
      </div>

      <div
        ref={containerRef}
        className={`hs-horizontal-strip-container${activeView === "news" ? " is-news-view" : ""}`}
        onWheel={(e) => {
          e.preventDefault();
          containerRef.current?.scrollBy({ left: e.deltaY, behavior: "smooth" });
        }}
      >
        {activeView === "leagues" ? wanted.map((item) => {
          const isSelected = item.leagueId === selectedLeagueId;
          const isCurrent = item.leagueId === activeLeagueId;
          const handleClick = (e: React.MouseEvent) => {
            e.preventDefault();
            onLeagueSelect?.(item.leagueId);
          };
          const handleKeyDown = (e: React.KeyboardEvent) => {
            if (e.key === " " || e.key === "Enter") {
              e.preventDefault();
              onLeagueSelect?.(item.leagueId);
            }
          };
          return (
            <button
              key={item.leagueId}
              type="button"
              className={`hs-horizontal-strip-card${isSelected ? " hs-horizontal-strip-card--selected" : ""}${isCurrent && !isSelected ? " hs-horizontal-strip-card--current" : ""}`}
              aria-pressed={isSelected}
              onClick={handleClick}
              onKeyDown={handleKeyDown}
              style={{
                "--hs-card-glow": item.glow ?? "",
                "--hs-card-split": item.split ?? "",
              } as CSSProperties}
            >
              <span className="hs-horizontal-strip-logo-wrap">
                {item.logo ? (
                  <img
                    src={item.logo}
                    alt=""
                    width={32}
                    height={32}
                    className="hs-horizontal-strip-logo"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <span className="hs-horizontal-strip-logo-fallback">
                    {item.leagueId.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </span>
              <span className="hs-horizontal-strip-name">{item.name}</span>
            </button>
          );
        }) : FEATURED_NEWS.map((news, index) => (
          <a key={news.href} className="hs-horizontal-strip-news-card" href={to(news.href)} aria-label={`خبر ${index + 1}: ${news.title}`}>
            {news.images?.[0] && <img src={to(news.images[0].src)} alt="" loading="lazy" decoding="async" />}
            <span className="hs-horizontal-strip-news-copy">
              <span className="hs-horizontal-strip-news-meta"><i>{String(index + 1).padStart(2, "0")}</i><small>{news.category} · {news.dateLabel}</small></span>
              <strong>{news.title}</strong>
            </span>
            <span className="hs-horizontal-strip-news-arrow" aria-hidden="true">↗</span>
          </a>
        ))}
      </div>

      {activeView === "leagues" && focusedLeague && (
        <div className="hs-horizontal-strip-league-actions">
          <span className="hs-horizontal-strip-league-context">
            <small>معلومات البطولة</small>
            <strong>{focusedLeague.name}</strong>
          </span>
          <div className="hs-horizontal-strip-league-action-buttons" role="group" aria-label={`معلومات ${focusedLeague.name}`}>
            <button type="button" onClick={() => onLeagueInfoAction?.("standings")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 4v16M3 14.5h18"/></svg>
              جدول الترتيب
            </button>
            <button type="button" onClick={() => onLeagueInfoAction?.("stats")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20h16M6 17v-5h3v5M11 17V7h3v10M16 17v-8h3v8"/></svg>
              الإحصائيات
            </button>
          </div>
        </div>
      )}

      {activeView === "leagues" && (
        <div className="hs-horizontal-strip-insights">
          <HeroLeagueStatsTicker
            selectedLeagueId={selectedLeagueId ?? activeLeagueId ?? null}
            matchInfo={matchInfo}
            onMatchInfoAction={onMatchInfoAction}
          />
        </div>
      )}

      <div className="hs-horizontal-strip-nav">
        <button
          type="button"
          className="hs-horizontal-strip-arrow hs-horizontal-strip-arrow-prev"
          onClick={() => scrollBy(-((activeView === "leagues" ? CARD_WIDTH : 236) + GAP))}
          aria-label={activeView === "leagues" ? "البطولة السابقة" : "الخبر السابق"}
        >
          ‹
        </button>
        <button
          type="button"
          className="hs-horizontal-strip-arrow hs-horizontal-strip-arrow-next"
          onClick={() => scrollBy((activeView === "leagues" ? CARD_WIDTH : 236) + GAP)}
          aria-label={activeView === "leagues" ? "البطولة التالية" : "الخبر التالي"}
        >
          ›
        </button>
      </div>
    </section>
  );
}
