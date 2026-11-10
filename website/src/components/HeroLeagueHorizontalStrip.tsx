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
import { CROWN_CUP_LOGOS } from "./crown-league-identity";
import { getLeagueTrophyTheme } from "./LeagueTrophySvg";
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
}: {
  clashes?: Array<{ source?: string; eyebrow: string }>;
  extraLeagues?: readonly { id: string; name: string }[];
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

  const containerRef = useRef<HTMLDivElement>(null);
  const CARD_WIDTH = 110;
  const GAP = 10;

  const scrollBy = (delta: number) => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollBy({ left: delta, behavior: "smooth" });
  };

  return (
    <section className="hs-horizontal-strip" aria-label="شريط البطولات الأفقي التجريبي">
      <div className="hs-horizontal-strip-header">
        <span className="hs-horizontal-strip-title">البطولات المتاحة</span>
        <span className="hs-horizontal-strip-count">{wanted.length} بطولة</span>
      </div>

      <div
        ref={containerRef}
        className="hs-horizontal-strip-container"
        onWheel={(e) => {
          e.preventDefault();
          containerRef.current?.scrollBy({ left: e.deltaY, behavior: "smooth" });
        }}
      >
        {wanted.map((item) => (
          <a
            key={item.leagueId}
            href={`/matches/${item.slug}/`}
            className="hs-horizontal-strip-card"
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
          </a>
        ))}
      </div>

      <div className="hs-horizontal-strip-nav">
        <button
          type="button"
          className="hs-horizontal-strip-arrow hs-horizontal-strip-arrow-prev"
          onClick={() => scrollBy(-(CARD_WIDTH + GAP))}
          aria-label="البطولة السابقة"
        >
          ‹
        </button>
        <button
          type="button"
          className="hs-horizontal-strip-arrow hs-horizontal-strip-arrow-next"
          onClick={() => scrollBy(CARD_WIDTH + GAP)}
          aria-label="البطولة التالية"
        >
          ›
        </button>
      </div>
    </section>
  );
}
