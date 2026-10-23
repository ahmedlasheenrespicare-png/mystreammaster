import { useEffect, useState } from "react";
import {
  LEAGUES,
  dayInZone,
  kickoff,
  readScoreboardResponse,
  scoreboardUrl,
  shiftDay,
  type Match,
} from "../lib/matches.mjs";
import { to } from "../config";
import { FEATURED_NEWS } from "../content/featured-news";
import { IconArrowUpRight, IconClock } from "./Icons";
import { Reveal } from "./motion";
import "./league-ticket.css";

/* =========================================================================
   «أخبار مميزة» في الصفحة الرئيسية
   -------------------------------------------------------------------------
   • الأخبار اليدوية من content/featured-news.ts تظهر فوراً مع الصفحة.
   • بعدها تُضاف المباريات القادمة من مصدر صفحة المواعيد (scoreboard.php عبر
     نفس الأصل)، فلا يُكتب فريق أو موعد يدوياً. تظهر المباريات التي لم تبدأ
     بعد فقط، بتوقيت القاهرة.
   • إن تعذّر جلب المباريات تبقى الأخبار اليدوية ظاهرة، ولا تُعرض مباريات
     افتراضية.
========================================================================= */

const HOME_ZONE = "Africa/Cairo";
const MAX_CARDS = 4;
const DAYS_AHEAD = 3;

interface Card {
  key: string;
  category: string;
  meta: string;
  title: string;
  description: string;
  href: string;
  images?: { src: string; alt: string }[];
  background?: string;
  featured: boolean;
  matchup?: string;
  logo?: string;
}

function useUpcomingMatches(): Match[] {
  const [matches, setMatches] = useState<Match[]>([]);

  useEffect(() => {
    let disposed = false;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15_000);
    const today = dayInZone(new Date(), HOME_ZONE);
    const days = Array.from({ length: DAYS_AHEAD }, (_, i) => shiftDay(today, i));

    const jobs = days.flatMap(day =>
      LEAGUES.map(async entry => {
        const response = await fetch(scoreboardUrl(entry.id, day), { signal: controller.signal, cache: "no-store" });
        return readScoreboardResponse(response, entry);
      })
    );

    Promise.allSettled(jobs).then(results => {
      window.clearTimeout(timeout);
      if (disposed) return;
      const now = Date.now();
      const seen = new Set<string>();
      const upcoming: Match[] = [];
      for (const result of results) {
        if (result.status !== "fulfilled") continue;
        for (const match of result.value.matches as Match[]) {
          if (match.state !== "scheduled" || Date.parse(match.date) <= now || seen.has(match.id)) continue;
          seen.add(match.id);
          upcoming.push(match);
        }
      }
      upcoming.sort((a, b) => Date.parse(a.date) - Date.parse(b.date) || a.id.localeCompare(b.id));
      setMatches(upcoming);
    });

    return () => {
      disposed = true;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  return matches;
}

function leagueName(id: string): string {
  return LEAGUES.find(l => l.id === id)?.name ?? "مباراة قادمة";
}

export default function FeaturedNewsCards() {
  const upcoming = useUpcomingMatches();

  const news: Card[] = FEATURED_NEWS.map((item, i) => ({
    key: `news-${i}`,
    category: item.category,
    meta: item.dateLabel,
    title: item.title,
    description: item.description,
    href: to(item.href),
    images: item.images?.map(img => ({ ...img, src: to(img.src) })),
    background: item.backgroundImage ? to(item.backgroundImage) : undefined,
    featured: item.featured === true,
    logo: item.backgroundLogo,
    matchup: item.matchupImage ? to(item.matchupImage) : undefined,
  }));

  const matchCards: Card[] = upcoming.map(match => ({
    key: `match-${match.id}`,
    category: leagueName(match.league),
    meta: kickoff(match.date, HOME_ZONE),
    title: `${match.home.name} ضد ${match.away.name}`,
    description: match.venue ? `الملعب: ${match.venue}` : "تابع المباراة وقنوات النقل من صفحة المواعيد.",
    href: to("matches/"),
    featured: false,
  }));

  const cards = [...news, ...matchCards].slice(0, MAX_CARDS);

  return (
    <section
      id="featured-news"
      className="py-20 md:py-28 bg-[#faf9f6] border-b border-black/10"
      aria-labelledby="featured-news-title"
    >
      <div className="max-w-[1370px] mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal variant="up" className="mb-10 max-w-2xl">
          <p className="text-[12px] font-black tracking-[0.25em] uppercase text-[#2b4eff] mb-4 flex items-center gap-2">
            <span className="w-8 h-[2px] bg-[#2b4eff] inline-block" />
            أخبار مميزة
          </p>
          <h2
            id="featured-news-title"
            className="font-display font-black tracking-tight leading-[1.15] text-[32px] md:text-[46px]"
          >
            آخر الأخبار وأقرب المباريات
          </h2>
        </Reveal>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card, i) => {
            const featured = card.featured;
            return (
              <Reveal key={card.key} variant="up" delay={i * 90} className={featured ? "md:col-span-2 lg:col-span-2" : ""}>
                {featured ? (
                  <div className="p-px rounded-[24px] bg-[radial-gradient(circle_230px_at_0%_0%,#d8ff3e,#0b0b0f)] h-full shadow-[0_14px_34px_rgba(11,11,15,0.18)]">
                  <a
                    href={card.href}
                    className="group relative isolate flex h-full flex-col overflow-hidden rounded-[23px] p-6 text-[#f6f4ec] bg-[radial-gradient(circle_280px_at_0%_0%,#2c2c33,#0b0b0f)] border border-[#232327]"
                  >
                    {card.logo && (
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute -left-10 top-1/2 h-[135%] w-[60%] -translate-y-1/2 bg-contain bg-center bg-no-repeat opacity-[0.12] blur-[1px]"
                        style={{ backgroundImage: `url(${card.logo})` }}
                      />
                    )}
                    <span aria-hidden="true" className="league-ticket-ray" />
                    <span aria-hidden="true" className="league-ticket-line league-ticket-line--top" />
                    <span aria-hidden="true" className="league-ticket-line league-ticket-line--bottom" />
                    <span aria-hidden="true" className="league-ticket-line league-ticket-line--left" />
                    <span aria-hidden="true" className="league-ticket-line league-ticket-line--right" />
                    {card.images && card.images.length > 0 && (
                      <div className="relative mb-4 flex h-44 items-end justify-center md:h-56">
                        {card.images.map((img, idx) => (
                          <img
                            key={img.src}
                            src={img.src}
                            alt={img.alt}
                            loading="lazy"
                            decoding="async"
                            className={`h-full w-auto max-w-[34%] object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,0.5)] ${idx === 1 ? "z-10 -mx-3" : "-mx-1"}`}
                          />
                        ))}
                      </div>
                    )}
                    <div className="relative flex flex-wrap items-center gap-2.5 text-[11.5px] font-black text-white/70">
                      <span className="bg-[#d8ff3e] text-black px-2.5 py-1 rounded-full">{card.category}</span>
                      <span className="inline-flex items-center gap-1">
                        <IconClock className="w-3.5 h-3.5" /> {card.meta}
                      </span>
                    </div>
                    <h3 className="relative mt-4 font-display font-black leading-snug tracking-tight text-[26px] md:text-[32px]">
                      {card.title}
                    </h3>
                    <p className="relative mt-2.5 text-[13.5px] leading-relaxed font-medium text-white/75">
                      {card.description}
                    </p>
                    <span className="relative mt-auto pt-5 inline-flex items-center gap-1.5 text-[13px] font-black text-[#d8ff3e]">
                      {card.href.includes("/news/") ? "اقرأ الخبر" : "كل المواعيد"} <IconArrowUpRight className="w-3.5 h-3.5" />
                    </span>
                  </a>
                  </div>
                ) : (
                <a
                  href={card.href}
                  className="group flex h-full flex-col rounded-[24px] border border-black/10 p-6 transition-all duration-300 hover:border-black bg-white hover:bg-[#fffdf5]"
                >
                  <div className="flex flex-wrap items-center gap-2.5 text-[11.5px] font-black text-black/45">
                    <span className="bg-[#d8ff3e] text-black px-2.5 py-1 rounded-full">{card.category}</span>
                    <span className="inline-flex items-center gap-1">
                      <IconClock className="w-3.5 h-3.5" /> {card.meta}
                    </span>
                  </div>
                  <h3 className="mt-4 font-display font-black leading-snug tracking-tight text-[18px] group-hover:text-[#2b4eff]">
                    {card.title}
                  </h3>
                  <p className="mt-2.5 text-[13.5px] leading-relaxed font-medium text-black/55">
                    {card.description}
                  </p>
                  <span className="mt-auto pt-5 inline-flex items-center gap-1.5 text-[13px] font-black text-[#2b4eff]">
                    {card.href.includes("/news/") ? "اقرأ الخبر" : "كل المواعيد"} <IconArrowUpRight className="w-3.5 h-3.5" />
                  </span>
                </a>
                )}
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
