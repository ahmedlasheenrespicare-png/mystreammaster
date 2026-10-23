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
import { IconArrowUpRight, IconClock } from "./Icons";
import { Reveal } from "./motion";

/* =========================================================================
   «أخبار مميزة» — المباريات القادمة في الصفحة الرئيسية
   -------------------------------------------------------------------------
   • البيانات من المصدر نفسه لصفحة المواعيد (scoreboard.php عبر نفس الأصل)،
     فلا يُكتب فريق أو موعد يدوياً.
   • تظهر المباريات التي لم تبدأ بعد فقط (state = scheduled)، مرتبةً بالوقت.
   • أوقات البداية بتوقيت القاهرة، ويمكن تغيير ذلك من صفحة المواعيد.
   • إن تعذّر جلب البيانات لا يظهر القسم، ولا تُعرض مباريات افتراضية.
========================================================================= */

const HOME_ZONE = "Africa/Cairo";
const MAX_CARDS = 4;
const DAYS_AHEAD = 3;

function useUpcomingMatches(): Match[] | null {
  const [matches, setMatches] = useState<Match[] | null>(null);

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
      setMatches(upcoming.slice(0, MAX_CARDS));
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
  const matches = useUpcomingMatches();

  /* لا قسم بلا بيانات حقيقية: قبل الجلب أو عند تعذره لا يظهر شيء */
  if (!matches || matches.length === 0) return null;

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
            مواعيد قادمة
          </p>
          <h2
            id="featured-news-title"
            className="font-display font-black tracking-tight leading-[1.15] text-[32px] md:text-[46px]"
          >
            أقرب المباريات القادمة
          </h2>
        </Reveal>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {matches.map((match, i) => {
            const featured = i === 0;
            return (
              <Reveal
                key={match.id}
                variant="up"
                delay={i * 90}
                className={featured ? "md:col-span-2 lg:col-span-2" : ""}
              >
                <a
                  href={to("matches/")}
                  className={`group flex h-full flex-col rounded-[24px] border border-black/10 p-6 transition-all duration-300 hover:border-black ${
                    featured
                      ? "bg-gradient-to-br from-[#2b4eff] to-[#7c5cff] text-white"
                      : "bg-white hover:bg-[#fffdf5]"
                  }`}
                >
                  <div className={`flex flex-wrap items-center gap-2.5 text-[11.5px] font-black ${featured ? "text-white/75" : "text-black/45"}`}>
                    <span className="bg-[#d8ff3e] text-black px-2.5 py-1 rounded-full">{leagueName(match.league)}</span>
                    <span className="inline-flex items-center gap-1">
                      <IconClock className="w-3.5 h-3.5" /> {kickoff(match.date, HOME_ZONE)}
                    </span>
                  </div>
                  <h3
                    className={`mt-4 font-display font-black leading-snug tracking-tight ${featured ? "text-[26px] md:text-[32px]" : "text-[18px]"} ${featured ? "" : "group-hover:text-[#2b4eff]"}`}
                  >
                    {match.home.name} <span className="font-normal opacity-70">ضد</span> {match.away.name}
                  </h3>
                  <p className={`mt-2.5 text-[13.5px] leading-relaxed font-medium ${featured ? "text-white/80" : "text-black/55"}`}>
                    {match.venue ? `الملعب: ${match.venue}` : "تابع المباراة وقنوات النقل من صفحة المواعيد."}
                  </p>
                  <span className={`mt-auto pt-5 inline-flex items-center gap-1.5 text-[13px] font-black ${featured ? "text-white" : "text-[#2b4eff]"}`}>
                    كل المواعيد <IconArrowUpRight className="w-3.5 h-3.5" />
                  </span>
                </a>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
